import { requireAuth, unauthorized } from "../_lib/auth.js";

// Extension chosen from the file's MIME type, not its filename, so a
// mislabeled extension can't sneak past the allowlist.
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return unauthorized();

  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return json({ error: "Expected multipart/form-data" }, 400);
  }

  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "Missing file" }, 400);

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return json({ error: "Unsupported file type: " + file.type }, 400);
  if (file.size > MAX_BYTES) return json({ error: "File is too large (max 20MB)." }, 400);

  const safeBase =
    (file.name || "upload")
      .replace(/\.[^./]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "upload";
  const key = `${Date.now()}-${safeBase}.${ext}`;

  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  return json({ url: `/files/${key}` });
}
