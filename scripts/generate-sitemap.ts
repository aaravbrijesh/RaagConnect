// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://raagconnect.com";
const API = "https://sjwtmymfdtirwrycneup.supabase.co/rest/v1";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd3RteW1mZHRpcndyeWNuZXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzA5MTAsImV4cCI6MjA3NzAwNjkxMH0.smEYz2-ob2qQ57JTGR2cFzKoNV-VpjXYPh7gobkELXg";

interface Entry { path: string; changefreq?: string; priority?: string }

const entries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/events", changefreq: "daily", priority: "0.9" },
  { path: "/classes", changefreq: "weekly", priority: "0.8" },
  { path: "/knowledge", changefreq: "weekly", priority: "0.7" },
  { path: "/raag-detector", changefreq: "monthly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
];

async function rows(table: string): Promise<{ id: string; slug: string | null }[]> {
  try {
    const r = await fetch(`${API}/${table}?select=id,slug`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

const [events, artists, classes] = await Promise.all([rows("events"), rows("artists"), rows("classes")]);
for (const e of events) entries.push({ path: `/events/${e.slug || e.id}`, changefreq: "weekly", priority: "0.7" });
for (const a of artists) entries.push({ path: `/artists/${a.slug || a.id}`, changefreq: "monthly", priority: "0.6" });
for (const c of classes) entries.push({ path: `/classes/${c.slug || c.id}`, changefreq: "monthly", priority: "0.6" });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...entries.map((e) => [`  <url>`, `    <loc>${esc(BASE_URL + e.path)}</loc>`, e.changefreq && `    <changefreq>${e.changefreq}</changefreq>`, e.priority && `    <priority>${e.priority}</priority>`, `  </url>`].filter(Boolean).join("\n")),
  `</urlset>`,
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} entries)`);
