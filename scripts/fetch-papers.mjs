import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

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

const relevant = (family, item) => {
  const keywords = tokens(`${family.title} ${family.manuscripts.map((paper) => paper.title).join(" ")}`);
  const titleTokens = new Set(tokens(item.title?.[0] ?? ""));
  const matches = keywords.filter((keyword) => titleTokens.has(keyword));
  return keywords.length === 0 || matches.length >= 2;
};

const authors = (item) => (item.author ?? []).slice(0, 4).map((author) =>
  author.name || [author.given, author.family].filter(Boolean).join(" ")
).filter(Boolean);

const normalize = (item) => {
  const doi = item.DOI?.toLocaleLowerCase() ?? null;
  return {
    doi,
    title: item.title[0],
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

const save = async (families) => writeFile(outputPath, `${JSON.stringify({
  source: "Crossref REST API",
  generatedAt: new Date().toISOString(),
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
  console.log("self-check passed");
};

const main = async () => {
  if (process.argv.includes("--self-check")) return selfCheck();
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
