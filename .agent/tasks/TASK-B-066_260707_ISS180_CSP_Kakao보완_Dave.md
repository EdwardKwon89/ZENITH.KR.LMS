# TASK-B-066 — Issue #180 next.config.ts CSP Kakao 도메인 보완

> **발령일**: 2026-07-07
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Dave (D_Kai)
> **우선순위**: P1
> **상태**: 🔔 검토 요청
> **선행 Task**: 없음
> **연관 이슈**: [Issue #180](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/180)

---

## 배경

TASK-B-062/063에서 CSP에 `script-src`/`img-src`/`frame-src`를 추가했으나,
DaumPostcodeEmbed iframe이 `http://` 프로토콜로 로드될 경우 차단 가능성과
Kakao API 통신을 위한 `connect-src`가 미설정되어 있음.

---

## 작업 범위

### §1 — `frame-src`에 `http://postcode.map.daum.net` 추가

```ts
// Before
"frame-src https://postcode.map.daum.net",
// After
"frame-src https://postcode.map.daum.net http://postcode.map.daum.net",
```

### §2 — `connect-src`에 `https://t1.kakaocdn.net`, `https://t1.daumcdn.net` 추가

```ts
// Before
"connect-src 'self' https://*.supabase.co https://*.sentry.io https://cdn.jsdelivr.net ..."
// After
"connect-src 'self' https://*.supabase.co https://*.sentry.io https://cdn.jsdelivr.net https://t1.kakaocdn.net https://t1.daumcdn.net ..."
```

---

## DoD (완료 기준)

- [x] `frame-src`에 `http://postcode.map.daum.net` 추가
- [x] `connect-src`에 `https://t1.kakaocdn.net`, `https://t1.daumcdn.net` 추가
- [x] 전체 회귀 PASS (485/485, 80 files)
- [x] R-17 커밋 분리: 코드 커밋 / 문서 커밋
- [x] PR 생성 (`References #180`, develop 대상)

---

## [작업 결과]

### 처리 완료

| 수정 | 내용 |
|:----|:-----|
| `frame-src` | `https://postcode.map.daum.net http://postcode.map.daum.net` — HTTP 프로토콜 병기 |
| `connect-src` | `https://t1.kakaocdn.net https://t1.daumcdn.net` 추가 — Kakao 스크립트/API 통신 허용 |

### 검증
- **커밋**: `64ad5d4`
- **회귀**: 485/485 PASS (80 files)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Jaison | TASK-B-066 발령 — next.config.ts CSP kakao 도메인(connect-src+frame-src http://) 보완 |
| 2026-07-07 | Dave | TASK-B-066 🔔 구현 완료 — 코드 `64ad5d4` · 회귀 485/485 PASS |
