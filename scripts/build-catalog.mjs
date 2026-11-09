import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const contentsPath = new URL("source-data/CONTENTS.md", root);
const overviewPath = new URL("source-data/overview.tex", root);
const commitPath = new URL("source-data/UPSTREAM_COMMIT", root);
const defaultOutputPath = new URL("data/catalog.json", root);
const sourceUrl = "https://github.com/openai/math";
const sourceFileUrl = `${sourceUrl}/blob/main/`;

const reasoningByFamily = new Map([
  ["007", "ordinary-two-point-correlations.pdf"],
  ["017", "irrationality-exponent-of-pi.pdf"],
  ["087", "symmetric-and-general-mahler-conjectures.pdf"],
  ["102", "basic-semidefinite-threshold-np-hardness.pdf"],
  ["159", "quasipolynomial-arithmetic-progressions.pdf"],
  ["197", "kaplansky-direct-finiteness-characteristic-two.pdf"],
  ["221", "mezard-parisi-formula.pdf"],
  ["271", "spontaneous-magnetization-quantum-heisenberg-ferromagnet.pdf"],
  ["287", "free-group-factor-isomorphism.pdf"],
  ["362", "relativistic-vlasov-maxwell.pdf"]
]);

const decodeHtml = (value) => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&(amp|lt|gt|quot|apos|nbsp|emsp);/g, (_, name) => ({
    amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", emsp: " "
  })[name]);

const displayText = (value) => decodeHtml(value
  .replace(/\$`([\s\S]*?)`\$/g, (_, math) => `$${math}$`)
  .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
  .replace(/<sub>([\s\S]*?)<\/sub>/g, "_$1")
  .replace(/<sup>([\s\S]*?)<\/sup>/g, "^$1")
  .replace(/<[^>]+>/g, "")
  .replace(/\s+/g, " ")
  .trim());

const subjectByFamily = (overview) => {
  const subjects = new Map();
  let subject = null;
  for (const line of overview.split(/\r?\n/)) {
    const section = line.match(/^\\cataloguesection\{(.+)}\{\d+}/);
    if (section) subject = section[1];
    const result = line.match(/^\\resultentry\{(\d{3})}/);
    if (result && subject) subjects.set(result[1], subject);
  }
  return subjects;
};

const parseCatalogue = (contents, subjects) => {
  const families = [];
  const blocks = [...contents.matchAll(/<tbody><tr>\s*<td>\s*([\s\S]*?)\s*<\/td>\s*<\/tr><\/tbody>/g)]
    .map((match) => match[1].trim());
  let family = null;

  for (const block of blocks) {
    const result = block.match(/^\*\*(\d{3})\.\s+([\s\S]+?)\*\*\s*([\s\S]*)$/);
    if (result) {
      const [, id, rawTitle, rawDescription] = result;
      const leanMatch = rawDescription.match(/\s*\(\[Lean]\(([^)]+)\)\)\s*$/);
      family = {
        id,
        title: displayText(rawTitle),
        description: displayText(leanMatch ? rawDescription.slice(0, leanMatch.index) : rawDescription),
        subject: subjects.get(id),
        lean: leanMatch ? `${sourceFileUrl}${leanMatch[1]}` : null,
        reasoning: reasoningByFamily.has(id) ? `source-data/reasoning_traces/${reasoningByFamily.get(id)}` : null,
        manuscripts: []
      };
      assert.ok(family.subject, `Missing subject for family ${id}`);
      families.push(family);
      continue;
    }

    const manuscript = block.match(/^&emsp;\[([^\n]+)]\((.+)\)[^\n]*\n+([\s\S]*)$/);
    assert.ok(manuscript && family, `Unexpected catalogue block: ${block.slice(0, 80)}`);
    family.manuscripts.push({
      title: displayText(manuscript[1]),
      abstract: displayText(manuscript[3]),
      pdf: `${sourceFileUrl}${manuscript[2]}`
    });
  }
  return families;
};

const buildCatalogue = (contents, overview, upstreamCommit, generatedAt) => {
  const families = parseCatalogue(contents, subjectByFamily(overview));
  const manuscripts = families.reduce((sum, family) => sum + family.manuscripts.length, 0);
  assert.equal(new Set(families.map((family) => family.id)).size, families.length, "Duplicate family ID");
  assert.ok(families.every((family) => family.manuscripts.length > 0), "Family without manuscripts");
  return {
    source: sourceUrl,
    upstreamCommit: upstreamCommit.trim(),
    generatedAt,
    stats: {
      families: families.length,
      manuscripts,
      formalizedFamilies: families.filter((family) => family.lean).length,
      reasoningSummaries: families.filter((family) => family.reasoning).length,
      subjects: new Set(families.map((family) => family.subject)).size
    },
    families
  };
};

const selfCheck = () => {
  const contents = [
    '<tbody><tr><td>',
    '**001. A $`x`$ result.** Uses <i>x</i>. ([Lean](lean/docs/001.md))',
    '</td></tr></tbody>',
    '<tbody><tr><td>',
    '&emsp;[Proof&#8211;of $`x`$](preprints/x/paper.pdf)',
    '',
    'Shows $`x\\gt0`$.',
    '</td></tr></tbody>'
  ].join("\n");
  const overview = "\\cataloguesection{Number theory}{1}\n\\resultentry{001}{x}{y}{z}";
  const catalogue = buildCatalogue(contents, overview, "abc", "2026-01-02");
  assert.equal(catalogue.families[0].title, "A $x$ result.");
  assert.equal(catalogue.families[0].manuscripts[0].title, "Proof–of $x$");
  assert.equal(catalogue.families[0].manuscripts[0].abstract, "Shows $x\\gt0$.");
  assert.equal(catalogue.families[0].lean, `${sourceFileUrl}lean/docs/001.md`);
  assert.deepEqual(catalogue.stats, { families: 1, manuscripts: 1, formalizedFamilies: 1, reasoningSummaries: 0, subjects: 1 });
  console.log("self-check passed");
};

const main = async () => {
  if (process.argv.includes("--self-check")) return selfCheck();
  const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
  const dateArgument = process.argv.find((argument) => argument.startsWith("--generated-at="));
  const outputPath = outputArgument ? new URL(outputArgument.slice(9), root) : defaultOutputPath;
  const generatedAt = dateArgument?.slice(15) ?? new Date().toISOString().slice(0, 10);
  assert.match(generatedAt, /^\d{4}-\d{2}-\d{2}$/, "generatedAt must use YYYY-MM-DD");
  const [contents, overview, upstreamCommit] = await Promise.all([
    readFile(contentsPath, "utf8"), readFile(overviewPath, "utf8"), readFile(commitPath, "utf8")
  ]);
  const catalogue = buildCatalogue(contents, overview, upstreamCommit, generatedAt);
  await writeFile(outputPath, `${JSON.stringify(catalogue)}\n`);
  console.log(`Wrote ${catalogue.stats.families} families and ${catalogue.stats.manuscripts} manuscripts to ${outputPath.pathname}`);
};

await main();
