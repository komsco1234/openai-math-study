import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { hasSpecificMatch, stripTags } from "./relevance.mjs";

const cataloguePath = new URL("../data/catalog.json", import.meta.url);
const outputPath = new URL("../data/papers.json", import.meta.url);
const candidateLimit = 20;
const paperLimit = 10;
const concurrency = Number(process.env.PAPER_CONCURRENCY ?? 3);
const userAgent = "OpenAI-Math-Study/1.0 (https://github.com/komsco1234/openai-math-study)";
const stopwords = new Set([
  "about", "after", "algebraic", "before", "being", "between", "formula", "from", "general", "mathematics",
  "number", "problem", "proof", "result", "shows", "study", "theorem", "their", "there", "these", "this", "through",
  "under", "using", "with", "without"
]);

const tokens = (value) => [...new Set(value.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? [])]
  .filter((token) => token.length >= 4 && !stopwords.has(token));

const excludedTypes = new Set(["component", "dataset", "peer-review"]);

const relevantTitle = (family, title) => {
  const keywords = tokens(`${family.title} ${family.manuscripts.map((paper) => paper.title).join(" ")}`);
  const titleTokens = new Set(tokens(stripTags(title ?? "")));
  const matches = keywords.filter((keyword) => titleTokens.has(keyword));
  return keywords.length === 0 || (matches.length >= 2 && hasSpecificMatch(matches));
};

const relevant = (family, item) => !excludedTypes.has(item.type) && relevantTitle(family, item.title?.[0]);

const authors = (item) => (item.author ?? []).slice(0, 4).map((author) =>
  author.name || [author.given, author.family].filter(Boolean).join(" ")
).filter(Boolean);

const normalize = (item) => {
  const doi = item.DOI?.toLocaleLowerCase() ?? null;
  return {
    doi,
    title: stripTags(item.title[0]),
    url: doi ? `https://doi.org/${doi}` : item.URL,
    authors: authors(item),
    year: item.published?.["date-parts"]?.[0]?.[0] ?? null,
    venue: item["container-title"]?.[0] ?? "",
    citationCount: Number.isFinite(item["is-referenced-by-count"]) ? item["is-referenced-by-count"] : 0,
    type: item.type ?? "work"
  };
};

const rank = (family, items) => [...new Map(items
  .filter((item) => item?.title?.[0] && item?.URL && relevant(family, item))
  .map((item) => [item.DOI?.toLocaleLowerCase() ?? item.URL, normalize(item)])).values()]
  .sort((left, right) => right.citationCount - left.citationCount)
  .slice(0, paperLimit);

const queryFor = (family) => family.title.replace(/[.]+$/, "");

const search = async (family) => {
  const query = queryFor(family);
  const parameters = new URLSearchParams({
    rows: String(candidateLimit),
    "query.title": query,
    select: "DOI,title,author,published,is-referenced-by-count,URL,type,container-title,score"
  });
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`https://api.crossref.org/works?${parameters}`, { headers: { "User-Agent": userAgent } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload.message?.items) ? payload.message.items : [];
      return { query, candidatesScanned: items.length, papers: rank(family, items) };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastError;
};

const save = async (families, generatedAt = new Date().toISOString()) => writeFile(outputPath, `${JSON.stringify({
  source: "Crossref REST API",
  generatedAt,
  selection: `Top ${paperLimit} relevant works by citation count from ${candidateLimit} title-search candidates`,
  families
}, null, 2)}\n`);

const selfCheck = () => {
  const family = { title: "Milne rationality conjecture and algebraic specialization.", manuscripts: [{ title: "Milne rationality conjecture" }] };
  const papers = rank(family, [
    { DOI: "10.1/a", URL: "https://doi.org/10.1/a", title: ["A motivic conjecture of Milne"], "is-referenced-by-count": 3 },
    { DOI: "10.1/b", URL: "https://doi.org/10.1/b", title: ["Unrelated algebraic survey"], "is-referenced-by-count": 100 },
    { DOI: "10.1/c", URL: "https://doi.org/10.1/c", title: ["Rationality and specialization"], "is-referenced-by-count": 8 }
  ]);
  assert.deepEqual(papers.map((paper) => paper.doi), ["10.1/c", "10.1/a"]);
  const cylinder = { title: "Cylinder coverings below the half-area bound.", manuscripts: [{ title: "Covering a cylinder below half area" }] };
  assert.deepEqual(rank(cylinder, [
    { DOI: "10.1/d", URL: "u", title: ["Below the Zero Lower Bound: a shadow-rate model"], "is-referenced-by-count": 50 },
    { DOI: "10.1/e", URL: "u", title: ["Cylinder coverings"], type: "dataset", "is-referenced-by-count": 40 },
    { DOI: "10.1/f", URL: "u", title: ["Covering a <i>cylinder</i> by strips"], "is-referenced-by-count": 1 }
  ]).map((paper) => [paper.doi, paper.title]), [["10.1/f", "Covering a cylinder by strips"]]);
  console.log("self-check passed");
};

// Re-apply the current relevance rules to data/papers.json without calling Crossref.
const refilter = async (catalogue) => {
  const stored = JSON.parse(await readFile(outputPath, "utf8"));
  const byId = new Map(catalogue.families.map((family) => [family.id, family]));
  let removed = 0;
  for (const [id, record] of Object.entries(stored.families)) {
    const kept = record.papers.map((paper) => ({ ...paper, title: stripTags(paper.title) }))
      .filter((paper) => !excludedTypes.has(paper.type) && relevantTitle(byId.get(id), paper.title));
    removed += record.papers.length - kept.length;
    record.papers = kept;
  }
  await save(stored.families, stored.generatedAt);
  console.log(`Removed ${removed} papers`);
};

const main = async () => {
  if (process.argv.includes("--self-check")) return selfCheck();
  const catalogue = JSON.parse(await readFile(cataloguePath, "utf8"));
  if (process.argv.includes("--refilter")) return refilter(catalogue);
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
        families[family.id] = { query: queryFor(family), candidatesScanned: 0, papers: [], error: String(error.message ?? error) };
      }
      await save(families);
      console.log(`${Object.keys(families).length}/${catalogue.families.length} ${family.id} ${families[family.id].papers.length} papers`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length || 1) }, worker));
  await save(Object.fromEntries(Object.entries(families).sort(([left], [right]) => left.localeCompare(right))));
};

await main();
