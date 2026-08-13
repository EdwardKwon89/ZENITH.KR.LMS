# TASK-B-293: Issue #1091 — HS Code 조회 캐싱 + 영문 전용 입력 강제

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1091](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1091) |
| **배경** | JSJung — HS Code 조회 시 품명 입력란 영문 전용 강제 + AI API 호출 절감(캐시 우선 조회) 요청. Jaison이 현재 구조 분석 후 설계 확정 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-08-13 |
| **우선순위** | P3 |
| **상태** | 🔔 보고 완료 |

## 현재 상태 (분석 완료 — Issue #1091 참조)

1. `orderItemSchema`([src/lib/validation/order.ts:8-10](../../src/lib/validation/order.ts#L8-L10))에 영문 전용 정규식이 이미 있으나 **폼 제출 시점에만** 적용(react-hook-form 기본 `mode: 'onSubmit'`). HS 조회를 트리거하는 `handleItemNameBlur()`([src/components/orders/OrderRegistrationForm.tsx:304-328](../../src/components/orders/OrderRegistrationForm.tsx#L304-L328))는 이 검증과 무관하게 2글자 이상이면 언어 상관없이 무조건 AI 호출 — 한글 입력도 매번 AI 비용 발생.
2. HS Code 조회 결과를 저장하는 테이블이 전혀 없음(마이그레이션 전체 확인 완료) — 동일 품목명도 매번 Claude Haiku 재호출.
3. `/api/hs-lookup`([src/app/api/hs-lookup/route.ts](../../src/app/api/hs-lookup/route.ts))이 항상 AI부터 호출.

## 수정 방향 (설계 확정 — 착수 승인)

### ① `handleItemNameBlur()`에 영문 사전 체크 추가 (코드만)
`OrderRegistrationForm.tsx`의 `handleItemNameBlur()` 맨 앞에 기존과 동일한 정규식으로 사전 필터링 — 영문이 아니면 fetch 자체를 호출하지 않음:
```ts
const ENGLISH_ONLY_REGEX = /^[A-Za-z0-9\s.,\-()&'"/#%+:]*$/;
// handleItemNameBlur 시작부에 추가
if (!ENGLISH_ONLY_REGEX.test(itemName.trim())) return;
```
기존 `orderItemSchema`의 제출 시점 검증은 그대로 유지(이중 방어, 손대지 않음).

### ② 신규 캐시 테이블 (마이그레이션 1건)
```sql
CREATE TABLE public.zen_hs_code_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name_normalized TEXT UNIQUE NOT NULL, -- lower(trim(item_name))
  hs_code TEXT NOT NULL,
  confidence TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.zen_hs_code_lookups TO authenticated;
GRANT ALL ON public.zen_hs_code_lookups TO service_role;

ALTER TABLE public.zen_hs_code_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read hs code cache"
ON public.zen_hs_code_lookups FOR SELECT TO authenticated USING (true);
```
- 캐시 키는 **품목명 단독**(목적지 국가 제외) — HS Code 6자리는 국제 공통표준이라 목적지 무관, 키에 넣으면 재사용률만 떨어짐.
- 조회 결과는 조직/화주 무관 전역 공유 캐시(같은 영문 품목명이면 어느 화주가 조회했든 재사용) — 개인정보 아님(품목명+HS코드일 뿐).
- READ는 모든 `authenticated`에게 허용(전역 캐시 조회 목적), INSERT도 `authenticated`(조회 API가 사용자 세션으로 실행되므로).

### ③ `/api/hs-lookup` 조회 순서 변경 (코드만)
```
1. 인증 체크 (기존 유지)
2. item_name 정규화(trim + lowercase)
3. zen_hs_code_lookups에서 item_name_normalized로 조회
4. 캐시 히트 → AI 호출 없이 즉시 { hs_code, confidence } 반환
5. 캐시 미스 → 기존처럼 Claude Haiku 호출
6. hs_code가 null이 아닌 성공 결과만 캐시에 INSERT(실패/저신뢰 null 결과는 캐싱하지 않음 — 표현이 다른 재조회 기회를 막지 않기 위함)
7. 응답 반환
```

과설계 금지 — 캐시 만료(TTL)·수동 캐시 무효화 UI·목적지별 캐시 분리 등은 이번 범위 밖. 위 3가지만 정확히 구현.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-293-hscode-cache` 브랜치 생성(전용 워크트리, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-293 확인
- [ ] 마이그레이션 1건(캐시 테이블 + GRANT + RLS 정책) — 최신 TeamB_Dev 기준 타임스탬프 충돌 없는지 확인
- [ ] `handleItemNameBlur()` 영문 사전 체크 추가
- [ ] `/api/hs-lookup` 캐시 우선 조회 로직 추가
- [ ] **회귀 테스트 신설 (필수, R-09, 실제 동작 기반 — 그림자/toContain 금지)**:
  - `/api/hs-lookup` 캐시 히트 시 Anthropic API가 호출되지 않는지(mock 호출 횟수 검증)
  - 캐시 미스 시 AI 호출 후 결과가 캐시 테이블에 실제로 저장되는지(DB 직접 조회 또는 mock insert 호출 검증)
  - 실패(hs_code null) 결과는 캐시에 저장되지 않는지
  - `handleItemNameBlur()`: 한글 등 비영문 입력 시 fetch가 호출되지 않는지(실제 컴포넌트 렌더링 또는 함수 단위 실제 호출 기반)
  - 영문 입력 시 기존대로 fetch 호출되는지(회귀 방지)
- [ ] **독립 되돌리기 검증**: 각 수정 부분을 실제로 되돌려서 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 브라우저에서 동일 영문 품목명을 두 번 입력해(다른 오더) 두 번째부터 AI 호출 없이 즉시 결과가 뜨는지 확인(네트워크 탭 또는 서버 로그로 Anthropic 호출 안 됐음을 확인), 한글 입력 시 조회 자체가 안 일어나는지 확인 — 스크린샷/로그 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-293 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1091 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1091`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — task file/ACTIVE_TASK.md 미반영 유형·마이그레이션 타임스탬프 충돌 이력 다수. JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지). 이번 Task는 신규 마이그레이션 1건 포함 — **최신 TeamB_Dev 기준 브랜치 동기화 및 타임스탬프 충돌 여부 특히 재확인**(과거 PR#1074 v1 반려 사례 재발 방지). 회귀 테스트는 실제 API 호출 횟수/DB 저장 여부를 검증하는 방식으로 작성할 것 — 정적 문자열 검사나 로직 재구현 금지.

## [작업 결과]

**커밋**: `22b84242` — `[Baker] feat: TASK-B-293 HS Code 조회 캐싱 + 영문 전용 입력 강제 (Issue #1091)`

| 검증 항목 | 결과 |
|:----------|:-----|
| 마이그레이션 | `supabase/migrations/20260813010000_iss1091_hs_code_lookups.sql` — `zen_hs_code_lookups` + GRANT(SELECT·INSERT authenticated / ALL service_role) + RLS + SELECT/INSERT 정책 2건. 최신 TeamB_Dev(`7284b9f8`) 기준 타임스탬프 충돌 없음 |
| 회귀 테스트 신설 | `tests/unit/hs-lookup/hs-lookup-cache.test.ts`(5건) + `tests/unit/orders/hs-lookup-blur-english-only.test.tsx`(2건) — **7/7 PASS** (RTL 실제 컴포넌트 렌더 기반) |
| 독립 되돌리기 검증 | ①route 캐시히트 guard 제거→히트 테스트 FAIL ②route insert guard 제거→저장 테스트 FAIL ③컴포넌트 regex 제거→한글 blur 테스트 FAIL — 3건 모두 확인 후 복원 |
| 전체 회귀 | `npm run test:regression` — **1281/1281 PASS** |
| 빌드 | `npm run build` — **SUCCESS**(`/api/hs-lookup` 라우트 포함) |
| R-10 브라우저 검증 | ①캐시 미스: `Laptop Battery Pack` blur → AI 호출 → HS Code `850760` 표시 ②DB 캐시 행 확인: `laptop battery pack <ts>`(lowercase) `hs_code=850760` 저장됨 ③캐시 히트: 동일 품명 두 번째 입력 → 동일 `850760` 즉시 표시(무지연) ④한글 `노트북 배터리` blur → 로딩·결과 배너 모두 미출현(차단 확인). 스크린샷 `scratch/hs-lookup-r10/` |

**R-10 진행 중 발견·해결**: playwright `webServer.reuseExistingServer`가 **메인 체크아웃의 dev 서버(포트 3000, 캐시 로직 미반영 코드)**를 재사용해 초기 검증이 실패함(캐시 INSERT 안 됨). baker 워크트리 전용 dev 서버(포트 3010)로 baseURL 전환 후 전체 검증 통과. 또한 로컬 supabase DB가 다른 세션에 의해 리셋되어 시드 재적용 필요 — `scripts/seed-local.ts`(멱등) 재실행으로 해소.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
