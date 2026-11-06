"use strict";

const PAGE_SIZE = 36;
const STORAGE = { bookmarks: "openai-math-bookmarks", studied: "openai-math-studied" };
const state = { catalogue: null, videos: {}, videosGeneratedAt: null, videosStatus: "loading", query: "", subject: "", lean: false, reasoning: false, bookmarked: false, studiedOnly: false, selected: null, visible: PAGE_SIZE };

const nodes = {
  search: document.querySelector("#search"), subject: document.querySelector("#subject"), lean: document.querySelector("#lean-only"),
  reasoning: document.querySelector("#reasoning-only"), bookmarked: document.querySelector("#bookmarked-only"), studiedOnly: document.querySelector("#studied-only"),
  results: document.querySelector("#result-list"), resultCount: document.querySelector("#result-count"), loadMore: document.querySelector("#load-more"),
  detail: document.querySelector("#detail"), detailEmpty: document.querySelector("#detail-empty"), detailContent: document.querySelector("#detail-content"),
  closeDetail: document.querySelector("#close-detail"), detailScrim: document.querySelector("#detail-scrim"), progress: document.querySelector("#progress-count"),
  familyStat: document.querySelector("#family-stat"), manuscriptStat: document.querySelector("#manuscript-stat")
};

const loadSet = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
};

const bookmarks = loadSet(STORAGE.bookmarks);
const studied = loadSet(STORAGE.studied);
const saveSet = (key, value) => localStorage.setItem(key, JSON.stringify([...value]));
const overlayQuery = matchMedia("(max-width: 1199px)");
const backgroundRegions = [document.querySelector(".site-header"), document.querySelector(".filter-panel"), document.querySelector(".catalogue-panel"), document.querySelector(".site-footer")];
let returnFocusId = null;

const element = (tag, options = {}) => {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) node.setAttribute(name, value);
  return node;
};

const badge = (text, variant = "") => element("span", { className: `badge ${variant}`.trim(), text });

const searchableText = (family) => [family.id, family.title, family.description, family.subject, ...family.manuscripts.flatMap((paper) => [paper.title, paper.abstract])].join(" ").toLocaleLowerCase();

const filteredFamilies = () => state.catalogue.families.filter((family) => {
  const matchesQuery = !state.query || searchableText(family).includes(state.query);
  return matchesQuery && (!state.subject || family.subject === state.subject) && (!state.lean || family.lean) &&
    (!state.reasoning || family.reasoning) && (!state.bookmarked || bookmarks.has(family.id)) && (!state.studiedOnly || studied.has(family.id));
});

const familyRow = (family) => {
  const button = element("button", { className: "family-row", attrs: { type: "button", "aria-current": String(state.selected === family.id), "data-family-id": family.id } });
  button.append(element("span", { className: "family-id", text: family.id }));
  const body = element("span");
  body.append(element("strong", { className: "family-title", text: family.title }));
  body.append(element("span", { className: "family-description", text: family.description }));
  const meta = element("span", { className: "family-meta" });
  meta.append(element("span", { text: family.subject }), badge(`${family.manuscripts.length} 원고`));
  if (family.lean) meta.append(badge("Lean", "badge-lean"));
  if (family.reasoning) meta.append(badge("Reasoning", "badge-reasoning"));
  if (bookmarks.has(family.id)) meta.append(badge("북마크"));
  if (studied.has(family.id)) meta.append(badge("공부 완료", "badge-lean"));
  body.append(meta); button.append(body);
  button.addEventListener("click", () => selectFamily(family.id));
  return button;
};

const renderResults = () => {
  const families = filteredFamilies();
  const visible = families.slice(0, state.visible);
  nodes.results.replaceChildren();
  nodes.results.setAttribute("aria-busy", "false");
  if (!visible.length) nodes.results.append(element("div", { className: "empty-state", text: "조건에 맞는 결과가 없습니다. 검색어나 필터를 바꿔 보세요." }));
  else visible.forEach((family) => nodes.results.append(familyRow(family)));
  nodes.resultCount.textContent = `${families.length.toLocaleString("ko-KR")}개 계열 중 ${visible.length.toLocaleString("ko-KR")}개 표시`;
  nodes.loadMore.hidden = visible.length >= families.length;
  nodes.progress.textContent = `${studied.size.toLocaleString("ko-KR")} / ${state.catalogue.stats.families.toLocaleString("ko-KR")}`;
};

const actionButton = (text, active, onClick) => {
  const button = element("button", { className: active ? "button button-primary" : "button", text, attrs: { type: "button", "aria-pressed": String(active) } });
  button.addEventListener("click", onClick);
  return button;
};

const renderDetail = (family, focusHeading = false) => {
  nodes.detailEmpty.hidden = true; nodes.detailContent.hidden = false; nodes.detailContent.replaceChildren();
  nodes.detailContent.append(element("p", { className: "detail-kicker", text: `결과 계열 ${family.id} · ${family.subject}` }));
  const title = element("h2", { className: "detail-title", text: family.title, attrs: { id: "detail-title", tabindex: "-1" } });
  nodes.detailContent.append(title, element("p", { className: "detail-description", text: family.description }));
  const status = element("div", { className: "detail-status" });
  status.append(badge(`${family.manuscripts.length}개 원고`));
  if (family.lean) status.append(badge("Lean 형식화", "badge-lean"));
  if (family.reasoning) status.append(badge("Reasoning 요약", "badge-reasoning"));
  nodes.detailContent.append(status);
  const actions = element("div", { className: "button-row" });
  actions.append(actionButton(bookmarks.has(family.id) ? "북마크 해제" : "북마크", bookmarks.has(family.id), () => toggleStored(bookmarks, STORAGE.bookmarks, family)));
  actions.append(actionButton(studied.has(family.id) ? "공부 완료 취소" : "공부 완료", studied.has(family.id), () => toggleStored(studied, STORAGE.studied, family)));
  if (family.lean) actions.append(element("a", { className: "button", text: "Lean 자료", attrs: { href: family.lean, target: "_blank", rel: "noreferrer" } }));
  if (family.reasoning) actions.append(element("a", { className: "button", text: "Reasoning PDF", attrs: { href: family.reasoning } }));
  nodes.detailContent.append(actions);
  nodes.detailContent.append(renderVideoSection(family, state.videos[family.id], state.videosGeneratedAt, state.videosStatus));
  const papers = element("section", { className: "manuscript-list" });
  papers.append(element("h3", { text: "원고와 초록" }));
  family.manuscripts.forEach((paper, index) => {
    const details = element("details", { className: "manuscript" });
    if (index === 0) details.open = true;
    details.append(element("summary", { text: paper.title }), element("p", { text: paper.abstract }));
    details.append(element("a", { text: "GitHub에서 PDF 열기", attrs: { href: paper.pdf, target: "_blank", rel: "noreferrer" } }));
    papers.append(details);
  });
  nodes.detailContent.append(papers);
  if (focusHeading) title.focus({ preventScroll: true });
};

function selectFamily(id, focusHeading = true) {
  const family = state.catalogue.families.find((item) => item.id === id);
  if (!family) return;
  returnFocusId = id;
  state.selected = id; history.replaceState(null, "", `#family-${id}`); renderResults(); renderDetail(family, focusHeading);
  document.body.dataset.detailOpen = "true";
  updateModalState(true);
}

function toggleStored(collection, key, family) {
  if (collection.has(family.id)) collection.delete(family.id); else collection.add(family.id);
  saveSet(key, collection); renderResults(); renderDetail(family);
}

const updateFilters = () => {
  state.query = nodes.search.value.trim().toLocaleLowerCase(); state.subject = nodes.subject.value;
  state.lean = nodes.lean.checked; state.reasoning = nodes.reasoning.checked; state.bookmarked = nodes.bookmarked.checked; state.studiedOnly = nodes.studiedOnly.checked;
  state.visible = PAGE_SIZE; renderResults();
};

const updateModalState = (open) => {
  const modal = open && overlayQuery.matches;
  document.documentElement.classList.toggle("modal-open", modal);
  backgroundRegions.forEach((region) => { region.inert = modal; region.toggleAttribute("inert", modal); });
  if (modal) {
    nodes.detail.setAttribute("role", "dialog");
    nodes.detail.setAttribute("aria-modal", "true");
  } else {
    nodes.detail.removeAttribute("role");
    nodes.detail.removeAttribute("aria-modal");
  }
};

const closeDetail = () => {
  document.body.dataset.detailOpen = "false";
  updateModalState(false);
  if (returnFocusId) document.querySelector(`.family-row[data-family-id="${returnFocusId}"]`)?.focus();
};

const trapModalFocus = (event) => {
  if (event.key !== "Tab" || nodes.detail.getAttribute("aria-modal") !== "true") return;
  const focusable = [...nodes.detail.querySelectorAll("a[href], button, summary, input, select")].filter((node) => !node.hidden && !node.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
};

const loadCatalogue = async () => {
  try {
    const [response, videoData] = await Promise.all([
      fetch("data/catalog.json"),
      fetch("data/youtube.json").then((result) => {
        if (!result.ok) throw new Error(`HTTP ${result.status}`);
        return result.json();
      }).then((data) => ({ status: "ready", data })).catch(() => ({ status: "error", data: null }))
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.families) || typeof data.stats?.families !== "number") throw new Error("Invalid catalogue");
    state.catalogue = data; state.videos = videoData.data?.families ?? {}; state.videosGeneratedAt = videoData.data?.generatedAt ?? null; state.videosStatus = videoData.status;
    nodes.familyStat.textContent = data.stats.families.toLocaleString("ko-KR"); nodes.manuscriptStat.textContent = data.stats.manuscripts.toLocaleString("ko-KR");
    [...new Set(data.families.map((family) => family.subject))].sort().forEach((subject) => nodes.subject.append(element("option", { text: subject, attrs: { value: subject } })));
    renderResults();
    const requested = location.hash.match(/^#family-(\d{3})$/)?.[1];
    if (requested) selectFamily(requested, false);
  } catch {
    nodes.results.setAttribute("aria-busy", "false"); nodes.results.replaceChildren(element("div", { className: "error-state", text: "카탈로그를 불러오지 못했습니다. 로컬 HTTP 서버 또는 GitHub Pages에서 다시 열어 주세요." }));
    nodes.resultCount.textContent = "데이터 로드 실패";
  }
};

[nodes.subject, nodes.lean, nodes.reasoning, nodes.bookmarked, nodes.studiedOnly].forEach((node) => node.addEventListener("change", updateFilters));
nodes.search.addEventListener("input", updateFilters);
nodes.loadMore.addEventListener("click", () => { state.visible += PAGE_SIZE; renderResults(); });
nodes.closeDetail.addEventListener("click", closeDetail); nodes.detailScrim.addEventListener("click", closeDetail);
nodes.detail.addEventListener("keydown", trapModalFocus);
overlayQuery.addEventListener("change", () => updateModalState(document.body.dataset.detailOpen === "true"));
document.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") { event.preventDefault(); nodes.search.focus(); } if (event.key === "Escape") closeDetail(); });

loadCatalogue();
