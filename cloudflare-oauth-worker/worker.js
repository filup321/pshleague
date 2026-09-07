/**
 * GitHub OAuth broker for Decap / Sveltia CMS, running on Cloudflare Workers.
 *
 * Deploy this as its own Worker (see wrangler.toml + README.md). It lets the
 * CMS admin page log in with GitHub without exposing your client secret.
 *
 * Required secrets (set with `npx wrangler secret put ...`):
 *   GITHUB_CLIENT_ID       - from your GitHub OAuth App
 *   GITHUB_CLIENT_SECRET   - from your GitHub OAuth App
 */

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Step 1: CMS opens <worker>/auth -> bounce to GitHub's consent screen.
    if (url.pathname === "/auth" || url.pathname === "/") {
      const redirectTo = new URL(AUTHORIZE_URL);
      redirectTo.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      redirectTo.searchParams.set("redirect_uri", `${url.origin}/callback`);
      redirectTo.searchParams.set("scope", "repo,user");
      redirectTo.searchParams.set("state", crypto.randomUUID());
      return Response.redirect(redirectTo.toString(), 302);
    }

    // Step 2: GitHub redirects back here with ?code=... -> swap for a token.
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing ?code", { status: 400 });

      const tokenResp = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const data = await tokenResp.json();
      const state = data.access_token ? "success" : "error";
      const result = data.access_token
        ? { token: data.access_token, provider: "github" }
        : { error: data.error_description || data.error || "OAuth failed" };

      // The CMS popup listens for these postMessage events.
      const page = `<!doctype html><html><body><script>
        (function () {
          function receiveMessage(e) {
            window.opener.postMessage(
              'authorization:github:${state}:${JSON.stringify(result)}',
              e.origin
            );
            window.removeEventListener('message', receiveMessage, false);
          }
          window.addEventListener('message', receiveMessage, false);
          window.opener.postMessage('authorizing:github', '*');
        })();
      </script></body></html>`;

      return new Response(page, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    return new Response("Not found", { status: 404 });
  },
};
