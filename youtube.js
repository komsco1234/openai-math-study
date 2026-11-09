"use strict";

const compactNumber = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return "길이 미제공";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = Math.floor(seconds % 60);
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const renderVideoSection = (family, record, generatedAt, status) => {
  const section = element("section", { className: "video-section" });
  section.append(element("h3", { text: "YouTube 학습 영상" }));
  if (status === "idle" || status === "loading") return loadingSection(section, "YouTube 학습 영상을 불러오는 중입니다.");
  if (status === "error") {
    section.append(element("p", { className: "video-empty", text: "동영상 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요." }));
    return section;
  }
  if (record?.error) {
    section.append(element("p", { className: "video-empty", text: "이 난제의 동영상 검색을 갱신하지 못했습니다. 다음 데이터 갱신 때 다시 시도합니다." }));
    return section;
  }
  const collected = generatedAt ? new Date(generatedAt).toLocaleDateString("ko-KR") : "수집일 미상";
  section.append(element("p", { className: "video-note", text: `관련 검색 후보 중 조회수순 최대 10개 · ${collected} 수집` }));
  const videos = record?.videos ?? [];
  if (!videos.length) {
    const empty = element("p", { className: "video-empty" });
    empty.append("관련성이 확인된 영상이 없습니다. ", element("a", {
      text: "YouTube에서 직접 검색",
      attrs: { href: `https://www.youtube.com/results?search_query=${encodeURIComponent(record?.query ?? family.title)}`, target: "_blank", rel: "noreferrer" }
    }));
    section.append(empty);
    return section;
  }
  const list = element("ol", { className: "video-list" });
  videos.forEach((video, index) => {
    const item = element("li", { className: "video-item" });
    item.append(element("span", { className: "video-rank", text: String(index + 1).padStart(2, "0") }));
    const body = element("div");
    body.append(element("a", { className: "video-link", text: video.title, attrs: { href: video.url, target: "_blank", rel: "noreferrer" } }));
    const views = video.viewCount > 0 ? `조회수 ${compactNumber.format(video.viewCount)}회` : "조회수 미제공";
    body.append(element("span", { className: "video-meta", text: `${video.channel} · ${views} · ${formatDuration(video.duration)}` }));
    item.append(body); list.append(item);
  });
  section.append(list);
  return section;
};
