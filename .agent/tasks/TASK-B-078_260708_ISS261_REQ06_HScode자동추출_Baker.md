# TASK-B-078 — REQ-06 아이템명 → HScode 자동 추출 (Claude Haiku 4.5)

> **발령일**: 2026-07-08
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (GLM-5.2 / OpenCode)
> **우선순위**: P1
> **상태**: 🔔 검토 요청
> **연관 이슈**: [Issue #261](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/261)
> **설계 원본**: [Issue #254](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/254) · `.agent/tasks/TASK-B-074_260707_ISS254_오더폼보완_설계.md`
> **브랜치**: `feature/teamb-task-b078-iss261`

---

## 배경

오더 등록 폼의 패키지 아이템(`item_name`) 입력 시 Claude Haiku 4.5 API를 통해 6자리 HS Code를 자동 추출합니다. API 실패 시 조용히 무시하여 사용자 입력 흐름을 방해하지 않습니다.

> **비용 사전 검토 (Aiden 확정)**: HScode 추출 1회 ~$0.000225 (약 0.03원), 월 1,000 오더 기준 ~$0.90/월 — 비용 부담 없음, 채택 확정. 초기 구현은 캐시 테이블 없이 직접 API 호출로 시작.

---

## 작업 범위

### REQ-06 | HScode 자동 추출

#### ① Next.js API Route 신규

파일: `src/app/api/hs-lookup/route.ts`

- `POST /api/hs-lookup`
- Body: `{ item_name: string, dest_country_code?: string }`
- Response: `{ hs_code: string | null, confidence: 'high' | 'medium' | 'low' }`
- 모델: `claude-haiku-4-5-20251001`
- `item_name` 2자 미만 시 `{ hs_code: null }` 반환
- 시스템 프롬프트로 JSON-only 응답 유도
- `@anthropic-ai/sdk` 패키지 설치 필요

#### ② `OrderRegistrationForm.tsx` — `NestedItems` UI 연동

- `item_name` `onBlur` 핸들러 추가
- 이미 `hs_code`가 입력되어 있으면 호출 생략
- 로딩 상태 관리 (`hsLookupLoadingMap`)
- `hs_code` 입력 필드 옆에 `"AI 추출 중..."` 인디케이터 표시
- API 실패 시 조용히 무시

#### ③ 환경변수

- `.env.local`의 `ANTHROPIC_API_KEY` 존재 여부 확인
- 없을 경우 구현은 진행하며 실행 시 API 호출 실패로 조용히 무시됨

---

## DoD

- [x] `src/app/api/hs-lookup/route.ts` 신규 생성
- [x] Haiku 4.5 API 호출 — 6자리 HS Code 추출
- [x] `item_name` onBlur 시 자동 호출 (이미 입력된 경우 스킵)
- [x] 로딩 인디케이터 표시
- [x] API 실패 시 조용히 무시
- [x] `ANTHROPIC_API_KEY` 환경변수 확인 (미설치 — 실행 시 조용히 무시)
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (489/489)
- [x] R-17 커밋 순서 엄수 + PR 생성 (`Closes #261`) — PR #277

---

## 착수 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b078-iss261
```

---

## [작업 결과]

### 구현 내역

#### ① `src/app/api/hs-lookup/route.ts` 신규 생성
- `POST /api/hs-lookup` — Claude Haiku 4.5 API 호출
- Body: `{ item_name: string, dest_country_code?: string }`
- Response: `{ hs_code: string | null, confidence: 'high' | 'medium' | 'low' }`
- 모델: `claude-haiku-4-5-20251001`, max_tokens: 64
- `item_name` 2자 미만 시 `{ hs_code: null, confidence: 'low' }` 반환
- 시스템 프롬프트로 JSON-only 응답 유도
- JSON 파싱 실패 시 `{ hs_code: null, confidence: 'low' }` 폴백
- API 호출 실패 시 catch 블록에서 조용히 무시 (UX 방해 없음)
- `@anthropic-ai/sdk` 패키지 사용 (develop에 이미 설치됨)

#### ② `OrderRegistrationForm.tsx` — NestedItems UI 연동
- `NestedItems` 컴포넌트 props에 `hsLookupLoadingMap`, `onItemNameBlur` 추가
- `item_name` 입력 필드 `onBlur` 핸들러 추가 (register onBlur + onItemNameBlur 호출)
- `hs_code` 입력 필드 옆에 `"AI 추출 중..."` 인디케이터 표시 (`animate-pulse`)
- `OrderRegistrationForm`에 `hsLookupLoadingMap` state + `setHsLookupLoading` helper 추가
- `handleItemNameBlur` 함수 추가:
  - `item_name` 2자 미만 시 스킵
  - 이미 `hs_code`가 입력된 경우 스킵
  - `/api/hs-lookup` POST 호출 (dest_country_code 포함)
  - 성공 시 `hs_code` 자동 채움
  - 실패 시 조용히 무시
- `NestedItems` 호출에 `hsLookupLoadingMap`, `onItemNameBlur` prop 전달
- `useCallback` import 추가
- 의존성 배열에 `destPort?.country_code` 추가

#### ③ 환경변수
- `.env.local`에 `ANTHROPIC_API_KEY` 없음 — 실행 시 API 호출 실패로 조용히 무시됨 (route.ts catch 블록)
- 키 설정 시 정상 동작, 미설치 시 사용자 수동 입력 fallback

### 검증 결과

| 항목 | 결과 |
|:-----|:-----|
| `npm run build` | ✅ PASS (Next.js 16.2.4 Turbopack) |
| `npm run test:regression` | ✅ PASS (81 files, 489/489 tests) |
| `/api/hs-lookup` route | ✅ 빌드 결과에 표시 확인 |

### 코드 커밋

- 코드: `0256484` — `[Baker] feat: TASK-B-078 REQ-06 HScode 자동 추출 (Claude Haiku 4.5 API)`
  - `src/app/api/hs-lookup/route.ts` (신규, 81줄)
  - `src/components/orders/OrderRegistrationForm.tsx` (+47줄)
- 문서: `429271a` — `[Baker] docs: TASK-B-078 완료 보고 — task file 🔔 + ACTIVE_TASK.md 상태 갱신`

### PR

- **[PR #277](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/277)** — `Closes #261`
- base: `develop` ← head: `feature/teamb-task-b078-iss261`

### Jaison 1차 반려 수정 (2026-07-08)

- 반려 사유 ①: Task file DoD 미체크 (R-17 위반) → DoD 전 항목 `[x]` 처리
- 반려 사유 ②: `[작업 결과]`에 PR#277 링크 미기재 → 본 섹션에 PR 링크 추가
- 코드 재작성 불필요 (task file 수정만으로 재제출)

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| — | — | — | — |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-08 | Jaison | TASK-B-078 발령 — Issue #261 생성, Dave → Baker 재배정 |
| 2026-07-08 | Baker | TASK-B-078 재착수 — 신규 브랜치 `feature/teamb-task-b078-iss261` (이전 작업 무시, 처음부터) |
| 2026-07-08 | Jaison | TASK-B-078 1차 반려 — DoD 미체크 + PR 링크 미기재 (코드 재작성 불필요) |
| 2026-07-08 | Baker | TASK-B-078 반려 수정 — DoD `[x]` 처리 + PR#277 링크 추가 |
