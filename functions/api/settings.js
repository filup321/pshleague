import { requireAuth, unauthorized } from "../_lib/auth.js";
import { getSettings, putSettings } from "../_lib/store.js";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Public: the site reads settings from here (marquee text, standings, etc).
export async function onRequestGet({ env }) {
  const settings = await getSettings(env);
  return json(settings);
}

// Saving settings requires the admin session cookie.
export async function onRequestPut({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Bad request" }, 400);
  }

  await putSettings(env, body);
  return json(body);
}
