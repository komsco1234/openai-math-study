# OpenAI Math Study

OpenAI의 [`openai/math`](https://github.com/openai/math) 연구 카탈로그를 검색하고 공부하는 정적 웹사이트입니다.

## 포함 데이터

- 373개 결과 계열, 721개 원고의 제목·설명·초록·원문 링크
- 17개 수학 분야 분류
- Lean 형식화 링크 245개
- reasoning summary PDF 10개
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

## 출처와 라이선스

데이터 출처는 [`openai/math`](https://github.com/openai/math)이며 Apache-2.0 라이선스를 따릅니다. 사이트 코드도 같은 라이선스로 배포합니다. 이 프로젝트는 OpenAI의 공식 웹사이트가 아닌 비공식 학습 도구입니다.
