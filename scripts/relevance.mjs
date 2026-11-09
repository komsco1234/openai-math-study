// Shared relevance helpers for fetch-papers.mjs and fetch-youtube.mjs.

// Words common across unrelated fields. A match made only of these words is not evidence of relevance.
export const genericWords = new Set([
  "above", "analysis", "approach", "area", "below", "bound", "bounds", "case", "cases", "complete", "complex",
  "condition", "conditions", "conjecture", "conjectures", "dimensional", "equation", "equations", "every", "exact",
  "finite", "first", "form", "forms", "free", "function", "functions", "global", "graph", "graphs", "group", "groups",
  "half", "high", "higher", "large", "limit", "limits", "line", "lines", "linear", "local", "lower", "main", "method",
  "methods", "model", "models", "near", "optimal", "order", "point", "points", "positive", "problems", "properties",
  "property", "question", "random", "rate", "rates", "real", "results", "second", "sets", "sharp", "small",
  "solution", "solutions", "space", "spaces", "structure", "sums", "system", "systems", "theorems", "theory", "three",
  "time", "type", "upper", "value", "values", "zero"
]);

export const hasSpecificMatch = (matches) => matches.some((keyword) => !genericWords.has(keyword));

// Crossref titles may carry JATS/MathML markup such as <i>q</i> or <mml:math ...>.
export const stripTags = (value) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
