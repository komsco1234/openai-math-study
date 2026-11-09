"use strict";

// Explainer articles from Binary Verse AI, matched to families by scripts/fetch-explainers.mjs.
const renderExplainerSection = (family, record, generatedAt, status) => {
  const section = element("section", { className: "explainer-section" });
  section.append(element("h3", { text: "쉬운 해설 글" }));
  if (status === "idle" || status === "loading") return loadingSection(section, "해설 글을 불러오는 중입니다.");
  if (status === "error") {
    section.append(paperMessage("해설 글 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요."));
    return section;
  }
  const articles = record ?? [];
  if (!articles.length) {
    section.hidden = true; // most families have no explainer; an empty heading would only add noise
    return section;
  }
  const collected = generatedAt ? new Date(generatedAt).toLocaleDateString("ko-KR") : "수집일 미상";
  section.append(element("p", { className: "video-note", text: `Binary Verse AI의 영문 해설 · 계열별로 검수해 연결 · ${collected} 수집` }));
  const list = element("ul", { className: "paper-list" });
  articles.forEach((article) => {
    const item = element("li", { className: "paper-item explainer-item" });
    const body = element("div");
    body.append(element("a", { className: "paper-link", text: article.title, attrs: { href: article.url, target: "_blank", rel: "noreferrer" } }));
    body.append(element("span", { className: "paper-meta", text: ["binaryverseai.com", article.published].filter(Boolean).join(" · ") }));
    item.append(body); list.append(item);
  });
  section.append(list);
  return section;
};
