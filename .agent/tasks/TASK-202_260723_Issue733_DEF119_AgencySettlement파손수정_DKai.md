# TASK-202 — DEF-119: agency-settlement.ts 전체 파손 수정 (SNTL 회의 W1)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-202 |
| **GitHub Issue** | [#733](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/733) |
| **생성일** | 2026-07-23 |
| **할당 Agent** | D_Kai |
| **우선순위** | P0(라벨상 p1 최고단계) |
| **전제조건** | 없음 |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ⬜ |

---

## [배경]

Issue #718(SNTL 회의록) 검토 중 Aiden이 코드로 직접 확인. `src/lib/actions/agency-settlement.ts`가 Issue #310에서 이미 DROP된 테이블 `zen_agency_rate_overrides`를 여전히 참조하고 있어, 이 파일의 모든 export 함수가 **오늘 당장 런타임 에러**를 발생시킵니다.

## [근본 원인]

- `_fetchBaseData()`(`agency-settlement.ts:21-29`)가 `supabase.from('zen_agency_rate_overrides')...`를 직접 조회
- `supabase/migrations/20260710000000_iss310_zone_discounts.sql:90-94`에서 `DROP TABLE IF EXISTS public.zen_agency_rate_overrides;` 확인 — 테이블 자체가 존재하지 않음
- PostgREST relation-not-exist 에러 → `if (overridesRes.error) throw overridesRes.error;`로 즉시 throw

## [영향 범위] (파일 내 전체 export 함수)

- `getAgencySettlementSummary` (65행~)
- `getAgencyShipperSettlements` (115행~)
- `getAgencyOrderSettlements`
- `getAgencyUnpricedOrders`
- `exportAgencySettlementExcel`

전부 `_fetchBaseData()`/`_calculateOrderSettle()`를 경유하므로 **Agency 정산 화면 전체가 현재 작동 불가** 상태로 추정됨.

## [수정 방향] — 현재 아키텍처(Issue #310 이후)에 맞춰 재작성 필요

기존 로직(`_calculateOrderSettle`, 31-59행)은 `base_rate_id` 단위로 대리점별 절대금액(override selling_price/cost_price)을 조회하는 **폐기된 모델**입니다. 현재는 다음 구조로 전환되어 있습니다(Aiden이 별도 조사로 확인, Issue #717 참고):

- `zen_agency_pricing_policies`(agency_org_id + zone_id별 `discount_rate`) — 대리점 원가는 **판매가 × (1-discount_rate)** 로 계산(절대값 override 아님)
- 오더의 zone 정보는 `zen_order_rate_snapshots` 또는 관련 조인으로 확인 필요
- 참고: `src/lib/ups/agency-pricing.ts`의 `computeAgencyFreight` 계산 방식과 동일한 원리를 여기에도 적용해야 함

`_fetchBaseData()`와 `_calculateOrderSettle()`를 이 구조(zone_id + discount_rate 조회 → 판매가에 곱)로 재작성 필요. 단순 테이블명 치환이 아니라 계산 로직 자체를 새 모델에 맞게 다시 짜야 함.

## [요구사항]

- `_fetchBaseData`/`_calculateOrderSettle` 재작성(zen_agency_pricing_policies 기반)
- 기존 회귀 테스트(`tests/unit/finance/agency-settlement-permission.test.ts` 등) 확인 및 필요시 갱신
- 신규 회귀 테스트 추가(정상 케이스 + zone별 할인율 상이한 케이스)
- 실제 Agency 계정으로 로그인 후 정산 화면 실제 접속 검증(R-10) — 수정 전(에러 재현)/수정 후(정상) 스크린샷
- 절차: `agent-worktree-init.sh d_kai` 세션 시작 시 실행, feature 브랜치 생성, 코드/문서 커밋 분리

## [발견 이슈]

없음

---

## DoD

- [ ] `_fetchBaseData()` — `zen_agency_pricing_policies` 기반으로 재작성
- [ ] `_calculateOrderSettle()` — zone_id + discount_rate 기반 계산 로직으로 재작성
- [ ] `getAgencySettlementSummary`/`getAgencyShipperSettlements`/`getAgencyOrderSettlements`/`getAgencyUnpricedOrders`/`exportAgencySettlementExcel` 전체 정상 동작 확인
- [ ] 기존 회귀 테스트 확인·갱신
- [ ] 신규 회귀 테스트 추가(zone별 할인율 상이 케이스 포함) + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09)
- [ ] R-10 스크린샷(수정 전 에러 재현 + 수정 후 정상 화면)
- [ ] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(D_Kai 작성 예정)_
