"use strict";

const loadPaperData = () => fetch("data/papers.json").then((response) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then((data) => ({ status: "ready", data })).catch(() => ({ status: "error", data: null }));

const paperMessage = (text) => element("p", { className: "video-empty", text });

const renderPaperSection = (family, record, generatedAt, status) => {
  const section = element("section", { className: "paper-section" });
  section.append(element("h3", { text: "관련 논문" }));
  if (status === "idle" || status === "loading") {
    section.append(paperMessage("관련 논문을 불러오는 중입니다."));
    return section;
  }
  if (status === "error") {
    section.append(paperMessage("논문 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요."));
    return section;
  }
  if (record?.error) {
    section.append(paperMessage("이 난제의 논문 검색을 갱신하지 못했습니다. 다음 데이터 갱신 때 다시 시도합니다."));
    return section;
  }
  const collected = generatedAt ? new Date(generatedAt).toLocaleDateString("ko-KR") : "수집일 미상";
  section.append(element("p", { className: "video-note", text: `Crossref 제목 검색 · 인용 수순 최대 10개 · ${collected} 수집` }));
  const papers = record?.papers ?? [];
  if (!papers.length) {
    const empty = element("p", { className: "video-empty" });
    empty.append("관련성이 확인된 DOI 논문이 없습니다. ", element("a", {
      text: "Crossref에서 직접 검색",
      attrs: { href: `https://search.crossref.org/?q=${encodeURIComponent(record?.query ?? family.title)}`, target: "_blank", rel: "noreferrer" }
    }));
    section.append(empty);
    return section;
  }
  const list = element("ol", { className: "paper-list" });
  papers.forEach((paper, index) => {
    const item = element("li", { className: "paper-item" });
    item.append(element("span", { className: "video-rank", text: String(index + 1).padStart(2, "0") }));
    const body = element("div");
    body.append(element("a", { className: "paper-link", text: paper.title, attrs: { href: paper.url, target: "_blank", rel: "noreferrer" } }));
    const byline = paper.authors.length ? paper.authors.join(", ") : "저자 미상";
    const details = [byline, paper.year, paper.venue, `인용 ${paper.citationCount.toLocaleString("ko-KR")}회`].filter(Boolean).join(" · ");
    body.append(element("span", { className: "paper-meta", text: details }));
    item.append(body); list.append(item);
  });
  section.append(list);
  return section;
};
