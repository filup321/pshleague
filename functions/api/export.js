// The admin page's "Download backup" button. Since content lives in KV
// instead of the git repo, this is how you get a point-in-time JSON copy.
import { requireAuth, unauthorized } from "../_lib/auth.js";
import { getPosts, getSettings } from "../_lib/store.js";

export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();

  const [posts, settings] = await Promise.all([getPosts(env), getSettings(env)]);
  const body = JSON.stringify({ posts, settings }, null, 2);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="psh-backup-${date}.json"`,
    },
  });
}
