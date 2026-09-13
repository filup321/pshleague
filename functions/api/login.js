import { constantTimeEqual, createSessionToken, sessionCookieHeader } from "../_lib/auth.js";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: "Admin isn't configured yet (missing ADMIN_PASSWORD / SESSION_SECRET)." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Bad request" }, 400);
  }

  const password = body && body.password;
  if (!password || !constantTimeEqual(password, env.ADMIN_PASSWORD)) {
    // Small fixed delay so a wrong guess can't be timed against a right one.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return json({ error: "Wrong password." }, 401);
  }

  const token = await createSessionToken(env.SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookieHeader(token),
    },
  });
}
