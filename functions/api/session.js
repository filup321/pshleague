// Lets the admin page ask "am I already logged in?" on load, so a returning
// admin with a valid session cookie skips straight past the password screen.
import { requireAuth, unauthorized } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
