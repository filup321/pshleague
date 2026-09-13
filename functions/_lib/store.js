/**
 * Reads/writes posts + settings in the CONTENT KV namespace.
 *
 * The constants below mirror the original content/posts.json and
 * content/settings.json — they're only used to seed KV the very first time
 * this runs, so the site isn't empty before anyone has posted anything.
 * Once KV has data, these are never looked at again; content/*.json in the
 * repo are just historical/reference copies at that point.
 */

const POSTS_KEY = "posts";
const SETTINGS_KEY = "settings";

const SEED_POSTS = [
  {
    type: "video",
    title: "PSH OFFICIAL ANNOUNCEMENT 2026",
    date: "2026-09-08",
    author: "Commissioner Connor",
    author_image: "/media/uploads/commissioner-connor.jpg",
    body: "",
    image: "",
    video_url: "https://www.youtube.com/watch?v=-lb2uRN_T3c",
    gallery: [],
  },
  {
    type: "blog",
    title: "Welcome to the PSH League site",
    date: "2026-09-07",
    author: "Commissioner Connor",
    author_image: "/media/uploads/commissioner-connor.jpg",
    body: "The purpose of this site was came about as a way to easily look up funny videos & pictures shared with league. As well as any updates so you don't have to scroll through texts and in case Zack's imessage doesn't update in real time",
    image: "",
    video_url: "",
    gallery: [],
  },
  {
    type: "video",
    title: "Roy's Combine",
    date: "2026-09-07",
    author: "PSH League",
    author_image: "",
    body: "",
    image: "",
    video_url: "https://drive.google.com/file/d/15NvKl96wXpuK4js8ooyqGEGgHHXrv2XE/view?usp=sharing",
    gallery: [],
  },
  {
    type: "picture",
    title: "Doug Sign",
    date: "2026-09-07",
    author: "PSH League",
    author_image: "",
    body: "",
    image: "",
    video_url: "",
    gallery: [
      { src: "/media/uploads/doug-sign-1.jpg" },
      { src: "/media/uploads/doug-sign-2.jpg" },
      { src: "/media/uploads/doug-sign-3.jpg" },
      { src: "/media/uploads/doug-sign-4.jpg" },
    ],
  },
];

const SEED_SETTINGS = {
  marquee_text: "Great draft Doug! Good luck in week 1 everyone",
  contact_number: "add your number here",
  visitor_count: "000420",
  stats_pdf: "/media/uploads/PSH-STATS-2019-2025.pdf",
  standings: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function getPosts(env) {
  const raw = await env.CONTENT.get(POSTS_KEY);
  let posts = null;
  if (raw) {
    try {
      posts = JSON.parse(raw);
    } catch (e) {
      posts = null;
    }
  }
  const wasEmpty = !posts;
  if (!posts) posts = clone(SEED_POSTS);

  // Backfill ids for any post that doesn't have one (seed data, or older
  // entries saved before ids existed) and persist so they stay stable.
  let changed = wasEmpty;
  for (const p of posts) {
    if (!p.id) {
      p.id = crypto.randomUUID();
      changed = true;
    }
  }
  if (changed) await putPosts(env, posts);
  return posts;
}

export async function putPosts(env, posts) {
  await env.CONTENT.put(POSTS_KEY, JSON.stringify(posts));
}

export async function getSettings(env) {
  const raw = await env.CONTENT.get(SETTINGS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      // fall through to seed below
    }
  }
  const seeded = clone(SEED_SETTINGS);
  await putSettings(env, seeded);
  return seeded;
}

export async function putSettings(env, settings) {
  await env.CONTENT.put(SETTINGS_KEY, JSON.stringify(settings));
}
