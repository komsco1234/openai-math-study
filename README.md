# OpenAI Math Study

OpenAI의 [`openai/math`](https://github.com/openai/math) 연구 카탈로그를 검색하고 공부하는 정적 웹사이트입니다.

## 포함 데이터

- 373개 결과 계열, 721개 원고의 제목·설명·초록·원문 링크
- 17개 수학 분야 분류
- Lean 형식화 링크 245개
- reasoning summary PDF 10개
- 373개 난제별 YouTube 검색 결과: 관련 영상 675개, 250개 계열에 최대 10개씩 제공
- 373개 난제별 Crossref 검색 결과: 관련 DOI 논문 3,508개, 368개 계열에 최대 10개씩 제공
- 전체 개요 PDF, 원본 카탈로그, 변경 이력, Apache-2.0 라이선스
- 업스트림 커밋: `4eaee87548250b2682affda7d05d947c05554bae`

원본 저장소 전체는 약 940MB이며 Lean 증명 파일이 5만 개 이상입니다. 이 저장소에는 브라우저 학습에 필요한 카탈로그와 요약 자료만 포함하고, 전체 논문과 Lean 증명은 원본 GitHub 링크로 연결합니다.

## 실행

```bash
python -m http.server 4173
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다. 외부 프레임워크나 빌드 과정은 필요하지 않습니다.

## 기능

- 계열·원고 제목·초록 통합 검색
- 분야, Lean 형식화, reasoning 자료 필터
- 북마크와 공부 완료 상태를 브라우저 `localStorage`에 저장
- 375px부터 데스크톱까지 반응형 목록·상세 보기
- 키보드 탐색, 명확한 포커스, reduced-motion 지원
- 난제별 YouTube 학습 영상 조회수순 목록과 영상이 없는 계열의 직접 검색 링크
- 난제별 관련 논문의 DOI 링크, 저자·연도·학술지·인용 수 메타데이터

YouTube 자료는 2026-11-06에 난제 제목과 분야로 검색한 후보 15개에서 관련 핵심어를 확인한 뒤, 수집 당시 조회수 내림차순으로 최대 10개를 선정했습니다. 조회수와 검색 결과는 시간이 지나면 달라질 수 있으며 `scripts/fetch-youtube.mjs`로 갱신할 수 있습니다.

논문 자료는 2026-11-06에 Crossref 제목 검색 후보 20개에서 관련 핵심어를 확인한 뒤, 수집 당시 인용 수 내림차순으로 최대 10개를 선정했습니다. Crossref 메타데이터는 `scripts/fetch-papers.mjs`로 갱신할 수 있습니다.

## 데이터 갱신

필요한 도구: Node.js 18 이상(모든 스크립트), [`yt-dlp`](https://github.com/yt-dlp/yt-dlp)(YouTube 자료만). 논문 자료는 Crossref API를 쓰므로 인터넷 연결이 필요합니다.

1. 원본 카탈로그 갱신: `source-data/CONTENTS.md`, `source-data/overview.tex`, `source-data/UPSTREAM_COMMIT`을 새 업스트림 자료로 교체한 뒤 실행합니다.

   ```bash
   node scripts/build-catalog.mjs
   ```

   스크립트는 `data/catalog.json`을 생성합니다. 원문의 ``$`x`$`` 표기는 `$x$`로 보존하고, 상세 패널에서 `vendor/katex/`의 로컬 KaTeX로 렌더링합니다. 사이트 검색은 수식 구분자 `$`를 제거한 텍스트를 사용합니다. 원고 PDF·Lean 링크는 `UPSTREAM_COMMIT`에 고정됩니다. 재현 가능한 날짜가 필요하면 `--generated-at=YYYY-MM-DD`를, 점검만 하려면 `--self-check`를 지정합니다.

2. 논문 자료 갱신(Crossref)
   - 점검: `node scripts/fetch-papers.mjs --self-check`
   - 이어서 수집: `node scripts/fetch-papers.mjs`
   - 처음부터 다시 수집: `node scripts/fetch-papers.mjs --refresh`

3. YouTube 자료 갱신(yt-dlp 실행 파일 경로를 첫 인자로 지정)
   - 점검: `node scripts/fetch-youtube.mjs --self-check`
   - 이어서 수집: `node scripts/fetch-youtube.mjs <yt-dlp 경로>`
   - 처음부터 다시 수집: `node scripts/fetch-youtube.mjs <yt-dlp 경로> --refresh`

## 출처와 라이선스

데이터 출처는 [`openai/math`](https://github.com/openai/math)이며 Apache-2.0 라이선스를 따릅니다. 사이트 코드도 같은 라이선스로 배포합니다. 이 프로젝트는 OpenAI의 공식 웹사이트가 아닌 비공식 학습 도구입니다.
