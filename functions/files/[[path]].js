// Serves files uploaded through the admin (stored in the MEDIA R2 bucket) at
// /files/<key>. This is separate from /media/uploads/... in the repo, which
// Cloudflare Pages still serves directly as static files — nothing already
// on the site needs to move.
export async function onRequestGet({ params, env }) {
  const key = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);

  return new Response(object.body, { headers });
}
