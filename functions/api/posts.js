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
  posts.push(post);
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

export async function onRequestDelete({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, 400);

  const posts = await getPosts(env);
  const next = posts.filter((p) => p.id !== id);
  await putPosts(env, next);
  return json({ ok: true });
}
