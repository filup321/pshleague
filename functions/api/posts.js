import { requireAuth, unauthorized } from "../_lib/auth.js";
import { getPosts, putPosts } from "../_lib/store.js";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Public: the site itself reads posts from here (no login needed to view).
export async function onRequestGet({ env }) {
  const posts = await getPosts(env);
  return json({ posts });
}

// Everything below requires the admin session cookie.
export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();

  let post;
  try {
    post = await request.json();
  } catch (e) {
    return json({ error: "Bad request" }, 400);
  }
  if (!post || typeof post !== "object" || !post.title) {
    return json({ error: "A title is required." }, 400);
  }

  post.id = crypto.randomUUID();
  const posts = await getPosts(env);
  posts.unshift(post); // new posts default to the top; admins can reorder from there
  await putPosts(env, posts);
  return json({ post });
}

export async function onRequestPut({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();

  let updated;
  try {
    updated = await request.json();
  } catch (e) {
    return json({ error: "Bad request" }, 400);
  }
  if (!updated || !updated.id) return json({ error: "Missing id" }, 400);

  const posts = await getPosts(env);
  const idx = posts.findIndex((p) => p.id === updated.id);
  if (idx === -1) return json({ error: "Post not found" }, 404);

  posts[idx] = updated;
  await putPosts(env, posts);
  return json({ post: updated });
}

// Reorders posts: body is { ids: [...] }, the full post list in the new
// desired order (as sent by the admin's ↑ / ↓ buttons). The array's order
// in KV *is* the display order — the public site no longer re-sorts it.
export async function onRequestPatch({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Bad request" }, 400);
  }
  if (!body || !Array.isArray(body.ids)) return json({ error: "Missing ids" }, 400);

  const posts = await getPosts(env);
  const byId = new Map(posts.map((p) => [p.id, p]));

  const reordered = [];
  for (const id of body.ids) {
    const p = byId.get(id);
    if (p) {
      reordered.push(p);
      byId.delete(id);
    }
  }
  // Anything not mentioned (shouldn't normally happen) keeps its relative order at the end.
  for (const p of posts) {
    if (byId.has(p.id)) reordered.push(p);
  }

  await putPosts(env, reordered);
  return json({ posts: reordered });
}

export async function onRequestDelete({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, 400);

  const posts = await getPosts(env);
  const next = posts.filter((p) => p.id !== id);
  await putPosts(env, next);
  return json({ ok: true });
}
