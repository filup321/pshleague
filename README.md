# PSH League site

A plain static site (no build step) with a browser-based CMS for posting
blogs, videos, and pictures, plus a simple password gate.

```
index.html                  the site (password gate + renders posts)
content/posts.json          every post lives here (the CMS edits this file)
content/settings.json       banner text, standings, contact number
admin/                      the CMS admin page, served at /admin/
cloudflare-oauth-worker/    tiny GitHub-login helper for the CMS
media/uploads/              images you upload from the CMS land here
```

## How posting works

You open `https://your-site/admin/`, log in with GitHub, fill out a form,
and hit **Publish**. The CMS commits the change to this repo; Cloudflare
Pages redeploys automatically in ~30 seconds and the post is live.

- **Blog** = title + body (markdown).
- **Video** = paste a YouTube or Vimeo URL; it embeds automatically. Never
  upload raw video files — put them on YouTube (unlisted) or Vimeo.
- **Picture(s)** = use the Main image field and/or the Photo gallery list.

---

## One-time setup

### 1. Put this folder on GitHub

Create a repo (e.g. `pshleague`) and push these files to the `main` branch.

### 2. Deploy to Cloudflare Pages

1. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages** ->
   **Connect to Git** -> pick the repo.
2. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
3. Save and deploy. You get a URL like `https://pshleague.pages.dev`.

### 3. Create a GitHub OAuth App (so the CMS can log in)

GitHub -> **Settings** -> **Developer settings** -> **OAuth Apps** ->
**New OAuth App**:

- **Application name:** PSH League CMS
- **Homepage URL:** your Pages URL
- **Authorization callback URL:** `https://YOUR-OAUTH-WORKER.workers.dev/callback`
  (you'll get this exact URL in the next step — you can edit it here after)

Save. Copy the **Client ID**, then **Generate a new client secret** and copy that too.

### 4. Deploy the OAuth worker

From the `cloudflare-oauth-worker/` folder:

```bash
cd cloudflare-oauth-worker
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID       # paste the Client ID
npx wrangler secret put GITHUB_CLIENT_SECRET   # paste the Client secret
npx wrangler deploy
```

`wrangler deploy` prints the worker URL, e.g.
`https://pshleague-cms-auth.YOURNAME.workers.dev`.

- Go back to the GitHub OAuth App and set the callback URL to
  `https://pshleague-cms-auth.YOURNAME.workers.dev/callback`.

### 5. Point the CMS at your repo + worker

Edit **`admin/config.yml`**:

```yaml
backend:
  name: github
  repo: YOURNAME/pshleague          # <-- your repo
  branch: main
  base_url: https://pshleague-cms-auth.YOURNAME.workers.dev   # <-- your worker URL
  auth_endpoint: /auth
```

Commit and push. Cloudflare redeploys.

### 6. Post something

Open `https://your-site/admin/`, click **Login with GitHub**, and add a post.

---

## The password gate

`index.html` shows a password box before the site. The password is set at the
top of the `<script>` block:

```js
var GATE_PASSWORD = "bosh420";
```

To change it, edit that line and redeploy. Once someone enters it correctly,
their browser remembers it (localStorage), so they only type it once.

**This is a speed bump, not real security.** The password is visible in the
page source, and `content/posts.json` can be fetched directly. Fine for a
friends' league; if you ever need real protection, put **Cloudflare Access**
(free for up to 50 users) in front of the site instead.

---

## Alternative: skip the OAuth worker with Pages CMS

If deploying the worker is a hassle, you can use the hosted
[Pages CMS](https://pagescms.org) instead: authorize its GitHub App, and it
gives you the same kind of admin UI with no worker to run. You'd recreate the
`admin/config.yml` fields as a `.pages.yml` file at the repo root. The site
(`index.html`) doesn't change — it just reads `content/posts.json` either way.

## Local preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. (The CMS admin needs the deployed worker to
log in, but the main site renders fine locally.)
