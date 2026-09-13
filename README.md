# PSH League site

A plain static site (no build step) with a self-serve admin page for posting
blogs, videos, and pictures, plus a simple password gate for visitors.

```
index.html                  the site (password gate + renders posts)
admin/index.html             the admin page, served at /admin/ — password login,
                              post editor, site settings, backup download
functions/                   Cloudflare Pages Functions — the admin's backend
  api/login.js, logout.js, session.js    password login / session cookie
  api/posts.js, settings.js              read + write content (in KV)
  api/upload.js                          handles photo / PDF uploads (to R2)
  api/export.js                          "Download backup" JSON
  files/[[path]].js                      serves uploaded files back out
  _lib/auth.js, store.js                 shared helpers
content/posts.json, settings.json       reference copies only — used to seed
                                          KV the very first time; not read after that
media/uploads/               original launch photos/PDF, still served as static files
```

## How posting works

Go to `https://pshleague.com/admin`, enter the shared admin password, fill out
the form, and hit **Publish**. The change is live within a second or two — no
GitHub account, no Cloudflare login, nothing to redeploy.

- **Blog** = title + body (markdown).
- **Video** = paste a YouTube, Vimeo, or Google Drive link; it embeds
  automatically. Videos are links only — don't upload video files.
- **Picture(s)** = use the Main image field and/or the Photo gallery (pick
  multiple files at once).
- **Site settings** tab = marquee banner text, footer contact number, the
  stats PDF, and the standings table.
- **Download backup** grabs a JSON snapshot of everything (posts + settings)
  any time you want a copy.

Content lives in Cloudflare KV, not in this repo — the repo just holds the
site's code. That's what makes posting instant and GitHub-free.

---

## One-time setup (owner only, ~5 minutes in the Cloudflare dashboard)

### 1. Push this repo to GitHub and connect it to Cloudflare Pages

(Already done if you're reading this on a deployed site.) Build settings:
**Framework preset:** None · **Build command:** *(blank)* · **Build output
directory:** `/`.

### 2. Create an R2 bucket for uploads

Cloudflare dashboard → **R2** → **Create bucket** → name it e.g. `psh-media`.

Then: your Pages project → **Settings** → **Functions** → **R2 bucket
bindings** → **Add binding** → variable name `MEDIA` → bucket `psh-media`.

### 3. Create a KV namespace for posts/settings

Cloudflare dashboard → **Workers & Pages** → **KV** → **Create namespace** →
name it e.g. `psh-content`.

Then: your Pages project → **Settings** → **Functions** → **KV namespace
bindings** → **Add binding** → variable name `CONTENT` → namespace
`psh-content`.

### 4. Set the admin password and session secret

Your Pages project → **Settings** → **Environment variables** → add these to
**both** Production and Preview, as **secrets**:

- `ADMIN_PASSWORD` — the password admins will type in at `/admin`
- `SESSION_SECRET` — any long random string (this signs the login session;
  it isn't typed in anywhere, just needs to be unpredictable)

### 5. Redeploy

Trigger a new deployment (push a commit, or **Retry deployment** in the
dashboard) so the bindings and env vars take effect.

### 6. Post something

Open `https://pshleague.com/admin`, enter the password, and add a post.

---

## The password gate (for visitors)

`index.html` shows a password box before the site. The password is set at the
top of the `<script>` block:

```js
var GATE_PASSWORD = "bosh420";
```

To change it, edit that line and redeploy. This is separate from the admin
password above — this one just gates who can *view* the site.

**This is a speed bump, not real security.** The password is visible in the
page source. Fine for a friends' league; if you ever need real protection,
put **Cloudflare Access** (free for up to 50 users) in front of the site
instead.

---

## Notes on media

- **Photos:** upload `.jpg` / `.png` / `.gif` / `.webp` (20MB max). Phone
  photos in `.heic` / `.HEIC` do **not** display in browsers — convert first.
  On a Mac: open in Preview → File → Export → JPEG, or
  `sips -s format jpeg in.heic --out out.jpg`. If a converted photo shows up
  sideways, its EXIF "orientation" tag is fighting the pixels; re-export from
  Preview (which bakes the rotation in) and it'll be fine.
- **Videos:** paste a link, don't upload the file.
  - YouTube / Vimeo: any normal share URL works.
  - Google Drive: the file must be shared **"Anyone with the link"**, then
    paste the `https://drive.google.com/file/d/.../view` URL. It embeds as a
    player.
- **Stats PDF:** upload it from the admin's Site settings tab. It renders on
  the page (all pages, no download) with an "open in new tab" link as a
  fallback.

## Local preview

The public site alone (no admin, no API):

```bash
python3 -m http.server 8000
```

To test the admin page and its API locally, use Wrangler instead (it
simulates KV, R2, and Functions):

```bash
cp .dev.vars.example .dev.vars   # then edit in a real password/secret
npx wrangler pages dev . --kv CONTENT --r2 MEDIA
```

Then open the printed `http://localhost:8788` URL.
