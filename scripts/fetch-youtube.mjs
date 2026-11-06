import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);
const cataloguePath = new URL("../data/catalog.json", import.meta.url);
const outputPath = new URL("../data/youtube.json", import.meta.url);
const candidateLimit = 15;
const videoLimit = 10;
const concurrency = Number(process.env.YOUTUBE_CONCURRENCY ?? 4);
const ytDlp = process.argv[2];

const stopwords = new Set([
  "about", "after", "algebraic", "before", "being", "between", "conjecture", "formula", "from", "general",
  "mathematics", "number", "problem", "proof", "result", "shows", "study", "theorem", "their", "there", "these",
  "this", "through", "under", "using", "with", "without"
]);

const tokens = (value) => [...new Set(value.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? [])]
  .filter((token) => token.length >= 4 && !stopwords.has(token));

const relevant = (family, video) => {
  const keywords = tokens(`${family.title} ${family.manuscripts.map((paper) => paper.title).join(" ")}`);
  const titleTokens = new Set(tokens(video.title ?? ""));
  const allTokens = new Set(tokens(`${video.title ?? ""} ${video.description ?? ""}`));
  const titleMatches = keywords.filter((keyword) => titleTokens.has(keyword));
  const allMatches = keywords.filter((keyword) => allTokens.has(keyword));
  return keywords.length === 0 || titleMatches.length >= 2 || titleMatches.some((keyword) => keyword.length >= 10) ||
    allMatches.length >= 3 || allMatches.some((keyword) => keyword.length >= 12);
};

const normalize = (entry) => ({
  id: entry.id,
  title: entry.title,
  url: `https://www.youtube.com/watch?v=${entry.id}`,
  channel: entry.channel ?? entry.uploader ?? "YouTube",
  viewCount: Number.isFinite(entry.view_count) ? entry.view_count : 0,
  duration: Number.isFinite(entry.duration) ? entry.duration : null
});

const rank = (family, entries) => [...new Map(entries
  .filter((entry) => entry?.id && entry?.title && relevant(family, entry))
  .map((entry) => [entry.id, normalize(entry)])).values()]
  .sort((left, right) => right.viewCount - left.viewCount)
  .slice(0, videoLimit);

const queryFor = (family) => `${family.title.replace(/[.]+$/, "")} ${family.subject} mathematics`;

const search = async (family) => {
  const query = queryFor(family);
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { stdout } = await exec(ytDlp, ["--flat-playlist", "--dump-single-json", "--no-warnings", `ytsearch${candidateLimit}:${query}`], { maxBuffer: 8 * 1024 * 1024 });
      const payload = JSON.parse(stdout);
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      return { query, candidatesScanned: entries.length, videos: rank(family, entries) };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const save = async (families) => writeFile(outputPath, `${JSON.stringify({
  source: "YouTube search via yt-dlp",
  generatedAt: new Date().toISOString(),
  selection: `Top ${videoLimit} relevant videos by view count from ${candidateLimit} search candidates`,
  families
}, null, 2)}\n`);

const selfCheck = () => {
  const family = { title: "The irrationality exponent of pi is 2.", manuscripts: [{ title: "Irrationality exponent of pi" }] };
  const videos = rank(family, [
    { id: "a", title: "Pi irrationality explained", description: "", view_count: 10 },
    { id: "b", title: "Unrelated cooking", description: "", view_count: 1000 },
    { id: "c", title: "Irrationality exponent of pi", description: "", view_count: 20 }
  ]);
  assert.deepEqual(videos.map((video) => video.id), ["c", "a"]);
  const games = { title: "Perfect completeness for 2-to-1 games.", manuscripts: [{ title: "Perfect completeness for 2-to-1 games" }] };
  assert.deepEqual(rank(games, [
    { id: "generic", title: "Subgame perfection for extensive form games", description: "Perfect strategies in games", view_count: 1000 },
    { id: "specific", title: "Perfect completeness for 2-to-1 games", description: "Khot hardness", view_count: 10 }
  ]).map((video) => video.id), ["specific"]);
  console.log("self-check passed");
};

const main = async () => {
  if (process.argv.includes("--self-check")) return selfCheck();
  if (!ytDlp) throw new Error("Usage: node scripts/fetch-youtube.mjs <path-to-yt-dlp>");
  const catalogue = JSON.parse(await readFile(cataloguePath, "utf8"));
  let families = {};
  if (!process.argv.includes("--refresh")) {
    try {
      families = JSON.parse(await readFile(outputPath, "utf8")).families ?? {};
    } catch {}
  }
  const pending = catalogue.families.filter((family) => !families[family.id] || families[family.id].error);
  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const family = pending[cursor];
      cursor += 1;
      try {
        families[family.id] = await search(family);
      } catch (error) {
        families[family.id] = { query: queryFor(family), candidatesScanned: 0, videos: [], error: String(error.message ?? error) };
      }
      await save(families);
      console.log(`${Object.keys(families).length}/${catalogue.families.length} ${family.id} ${families[family.id].videos.length} videos`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length || 1) }, worker));
  await save(Object.fromEntries(Object.entries(families).sort(([left], [right]) => left.localeCompare(right))));
};

await main();
