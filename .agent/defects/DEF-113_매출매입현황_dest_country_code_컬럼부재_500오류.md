# DEF-113 — 매출/매입 현황 화면 `dest_country_code` 컬럼 부재로 500 오류

| 항목 | 내용 |
|:----|:----|
| **발견일** | 2026-07-22 |
| **GitHub Issue** | [#693](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/693) |
| **발견 경위** | TASK-199(Issue #685, ZenUI 디자인시스템 정정) 재검토 중 R-10 스크린샷 검증을 위해 Aiden이 직접 `/finance/order-revenue-cost` 화면에 실제 로그인 후 접속 — 렌더링 도중 500 오류 발생 확인 |
| **긴급도** | Medium |
| **관련 Task(원인)** | TASK-187 (`order-revenue-cost-client.tsx` / `order-revenue-cost.ts` 최초 도입) |
| **영향 범위** | TASK-199 PR#690과 무관 — 해당 PR diff에 `order-revenue-cost.ts` 미포함 확인(`git diff origin/develop <브랜치> --stat` 결과 공백) |

## [현상]

`admin@zenith.kr`로 로그인 후 "매출/매입 현황"(`/finance/order-revenue-cost`) 메뉴 접속 시 화면이 500 오류로 실패한다.

## [근본 원인]

`src/app/actions/finance/order-revenue-cost.ts`의 `getOrderRevenueCostList()`(및 상세 조회 함수, 총 2개소: L47, L153)가 `zen_orders` 테이블에서 존재하지 않는 컬럼 `dest_country_code`를 `select()`한다.

```ts
// L42-48
.from('zen_orders')
.select(`
  id,
  order_no,
  status,
  dest_country_code,   // ← 존재하지 않는 컬럼
  created_at,
  ...
```

`supabase/migrations/`를 전수 검색(`grep -rn "dest_country_code"`)한 결과 이 컬럼명을 정의한 마이그레이션이 전무하다. 반면 `20260715000001_iss489_ups_order_schema_v5.sql`에서 `zen_orders`에 실제 추가된 컬럼은 `recipient_country_code`이다 — TASK-187 구현 시 컬럼명을 잘못 참조한 것으로 추정된다(오타/설계 문서 불일치).

Supabase는 존재하지 않는 컬럼 select 시 쿼리 에러를 반환하며, 이 에러가 `if (error) throw new Error(...)`로 그대로 전파되어 화면 500으로 표출된다.

## [영향받는 코드 위치]

- `src/app/actions/finance/order-revenue-cost.ts:47` — `getOrderRevenueCostList()` select절
- `src/app/actions/finance/order-revenue-cost.ts:116` — `destCountryCode: order.dest_country_code` 매핑
- `src/app/actions/finance/order-revenue-cost.ts:153` — 상세 조회 함수 select절
- `src/app/actions/finance/order-revenue-cost.ts:272` — 동일 매핑

## [권장 조치]

`dest_country_code` → `recipient_country_code`로 정정 (컬럼 select절 2곳 + 매핑 2곳, 총 4개소). 정정 후 화면 정상 렌더링 여부 Playwright로 재검증 필요.

## [발견 시 증적]

- `grep -rn "dest_country_code" supabase/migrations/` → 0 matches (컬럼 미존재 확인)
- D_Kai 워크트리(`ZENITH_LMS-worktrees/d_kai`, develop 기준)에서 Aiden이 직접 `npm run dev` 기동 후 Playwright로 `admin@zenith.kr` 로그인 → `/finance/order-revenue-cost` 접속 → 500 오류 화면 스크린샷 확보
- 동일 코드가 `origin/develop`에도 존재 — TASK-199 PR과 무관한 선재 결함임을 확인

## [권장 우선순위]

Medium — 화면 진입 자체가 불가능한 기능 결함이나, 긴급 트리거(데이터 유실·과금 오류 등)는 아님. 신규 Task 발령 필요.
