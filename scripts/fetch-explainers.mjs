// Link families to explainer articles on Binary Verse AI (https://binaryverseai.com).
// The family for each post comes from the reviewed map in scripts/explainer-map.json
// (slug -> family id, or null for posts reviewed and deliberately not linked).
// Only titles, dates and URLs are stored; article text is not copied.
//
// Usage:
//   node scripts/fetch-explainers.mjs              fetch titles for mapped posts, write data/explainers.json,
//                                                  and list new research posts that still need review
//   node scripts/fetch-explainers.mjs --self-check
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { genericWords, stripTags } from "./relevance.mjs";

const cataloguePath = new URL("../data/catalog.json", import.meta.url);
const mapPath = new URL("./explainer-map.json", import.meta.url);
const outputPath = new URL("../data/explainers.json", import.meta.url);
const site = "https://binaryverseai.com";
const userAgent = "OpenAI-Math-Study/1.0 (https://github.com/komsco1234/openai-math-study)";

// Posts that look like research explainers; the site also publishes AI news and product reviews.
const researchSlug = (slug) => /conjecture|theorem|hypothesis|problem|proof|counterexample|formula|inequalit/.test(slug);

const tokens = (value) => [...new Set((value.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]+/g) ?? [])
  .map((token) => token.length > 4 ? token.replace(/s$/, "") : token))]
  .filter((token) => token.length >= 3 && !genericWords.has(token) && !["openai", "proof", "conjecture", "problem", "theorem", "counterexample", "the", "and", "for"].includes(token));

// Suggest a family for an unreviewed slug: rarest shared words (title + abstracts) win. Review before adding to the map.
const suggest = (catalogue, slug) => {
  const families = catalogue.families.map((family) => ({ id: family.id, title: family.title, words: tokens(`${family.title} ${family.manuscripts.map((paper) => `${paper.title} ${paper.abstract}`).join(" ")}`) }));
  const df = new Map();
  for (const family of families) for (const word of family.words) df.set(word, (df.get(word) ?? 0) + 1);
  const slugWords = new Set(tokens(slug.replaceAll("-", " ")));
  return families.map((family) => ({ ...family, score: family.words.filter((word) => slugWords.has(word)).reduce((sum, word) => sum + 1 / df.get(word), 0) }))
    .sort((a, b) => b.score - a.score)[0];
};

const decode = (value) => value.replace(/&#8217;|&rsquo;/g, "’").replace(/&#8211;|&ndash;/g, "–").replace(/&#8212;/g, "—")
  .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'");

const pageTitle = (html, slug) => decode(stripTags(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? html.match(/<title>([^<]+)<\/title>/)?.[1] ?? slug))
  .replace(/\s*[|–-]\s*Binary\s*Verse\s*AI\s*$/i, "").trim();

const get = async (url) => {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
};

const selfCheck = () => {
  assert.equal(researchSlug("kaplansky-zero-divisor-conjecture"), true);
  assert.equal(researchSlug("latest-ai-technology-news-may-17-2025"), false);
  assert.equal(pageTitle('<meta property="og:title" content="Mahler&#8217;s Conjecture | Binary Verse AI">', "x"), "Mahler’s Conjecture");
  const catalogue = { families: [
    { id: "001", title: "Hilbert’s tenth problem over ℚ.", manuscripts: [{ title: "Undecidability over the rationals", abstract: "" }] },
    { id: "002", title: "Kakeya in three and four dimensions.", manuscripts: [{ title: "Kakeya sets", abstract: "" }] }
  ] };
  assert.equal(suggest(catalogue, "hilberts-10th-problem-openai-rationals").id, "001");
  console.log("self-check passed");
};

const main = async () => {
  if (process.argv.includes("--self-check")) return selfCheck();
  const catalogue = JSON.parse(await readFile(cataloguePath, "utf8"));
  const map = JSON.parse(await readFile(mapPath, "utf8"));
  const ids = new Set(catalogue.families.map((family) => family.id));
  const unknown = Object.entries(map).filter(([, id]) => id !== null && !ids.has(id));
  assert.equal(unknown.length, 0, `Unknown family ids in explainer-map.json: ${unknown.map(([slug, id]) => `${slug}=${id}`).join(", ")}`);

  const sitemap = await get(`${site}/post-sitemap.xml`);
  const slugs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(`${site}/`, "").replace(/\/$/, "")).filter(Boolean));

  const families = {};
  const missing = [];
  for (const [slug, id] of Object.entries(map)) {
    if (id === null) continue;
    if (!slugs.has(slug)) { missing.push(slug); continue; }
    const url = `${site}/${slug}/`;
    const html = await get(url);
    const published = html.match(/<meta property="article:published_time" content="([^"]+)"/)?.[1]?.slice(0, 10) ?? null;
    (families[id] ??= []).push({ title: pageTitle(html, slug), url, published });
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  for (const list of Object.values(families)) list.sort((a, b) => String(b.published).localeCompare(String(a.published)));

  await writeFile(outputPath, `${JSON.stringify({
    source: site,
    generatedAt: new Date().toISOString(),
    selection: "Reviewed Binary Verse AI explainer posts per family (scripts/explainer-map.json); titles and links only",
    families: Object.fromEntries(Object.entries(families).sort(([a], [b]) => a.localeCompare(b)))
  }, null, 2)}\n`);
  console.log(`Linked ${Object.values(families).flat().length} posts to ${Object.keys(families).length} families`);
  if (missing.length) console.log(`Mapped posts no longer in the sitemap: ${missing.join(", ")}`);

  const unreviewed = [...slugs].filter((slug) => researchSlug(slug) && !(slug in map));
  if (unreviewed.length) {
    console.log(`\n${unreviewed.length} research posts need review. Add each to scripts/explainer-map.json (family id or null):`);
    for (const slug of unreviewed) {
      const best = suggest(catalogue, slug);
      console.log(`  "${slug}": ${best.score > 0 ? `"${best.id}"` : "null"},   // ${best.score > 0 ? best.title.slice(0, 70) : "no candidate"}`);
    }
  }
};

await main();
