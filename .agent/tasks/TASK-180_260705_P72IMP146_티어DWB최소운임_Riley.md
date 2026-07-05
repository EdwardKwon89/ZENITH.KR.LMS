# TASK-180 — Phase 7.2 IMP-146 SPR-02: 20kg 초과 티어 + DWB + Freight 최소운임

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-180 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | Riley |
| **우선순위** | P3 (Go-Live 비차단 백로그) |
| **전제조건** | TASK-179 ✅ (Zone-서비스-방향 매핑 안정화 후 착수 — `resolveZoneByCountry()` 시그니처 변경 반영 필요) |
| **관련 IMP** | IMP-146 |
| **브랜치** | 신규 생성 — `feature/teama-task-180-tier-dwb-riley` |
| **커밋 태그** | `[Riley]` |
| **상태** | 🚫 |

---

## [배경]

An-14 §9(요율표 구조 정확도 리스크) 중 3건을 해소한다. `docs/02_Analysis/An_14_Phase7_UPS요금관리_설계보완.md` §12 필독. TASK-179(B_Kai)가 먼저 완료되어야 `resolveZoneByCountry()` 시그니처가 안정화된다.

## [작업 범위]

### 1. 20kg 초과 티어 요금 (An-14 §12-1 #1)

- 신규 `zen_ups_weight_tier_rates`(product_id, zone_id, tier_min_kg, tier_max_kg NULL 허용 최상위 구간, price_per_kg_selling, price_per_kg_cost, currency, valid_from/until, is_active) 마이그레이션
- 시드: 공식 Rate Guide(`docs/80_RawData/20260609 UPS 특송 부가서비스.pdf` p.14~27 "20kg 초과 화물 (kg당 가격)" 표) 기준
- `src/lib/ups/pricing-engine.ts` `computeUpsFreight()` 수정: 청구중량이 20kg(product별 point 테이블 상한) 초과 시 `zen_ups_base_rates` 대신 `zen_ups_weight_tier_rates`에서 구간 매칭 후 `단가 × 청구중량`으로 계산하는 분기 추가

### 2. DWB — Deficit Weight Billing (An-14 §12-1 #4)

- `applyDeficitWeightBilling()` 순수 함수 신규 — 청구중량 기준 금액 vs 다음 상위 구간(예: 20kg 도달 시 21kg 구간 최소가) 금액을 비교해 더 낮은 쪽 채택
- 공식 UPS Rate Guide 각주(`docs/80_RawData/20260609 UPS 특송 부가서비스.pdf` — "Deficit Weight Billing" 각주 참고) 기준 정확한 비교 로직 구현
- `computeUpsFreight()` 결과에 `dwbApplied: boolean` 필드 추가(breakdown 투명성)

### 3. Freight 최소운임 (An-14 §12-1 #5)

- 신규 `zen_ups_freight_minimums`(zone_id, product_id, min_charge_selling, min_charge_cost) 마이그레이션 + 시드(Rate Guide "최소 운임" 행 기준)
- `computeUpsFreight()`에서 Freight 계열 상품일 경우 계산 결과가 최소운임 미만이면 최소운임으로 상향하는 로직 추가

## [설계 의견 — 필수]

착수 전 아래 항목에 대한 방안을 상세 파일 `[설계 의견]` 섹션에 제출하고 Aiden 확정을 받는다(⬜→📝→🔍→🔄):

1. DWB 비교 대상 "다음 상위 구간"을 구체적으로 어떻게 정의할지(단순 다음 0.5kg/1kg 구간인지, 명시된 브레이크포인트 목록 기준인지) — 공식 문서 각주 재확인 필요
2. `zen_ups_weight_tier_rates`와 기존 `zen_ups_base_rates`(20kg 이하) 사이 조회 분기 기준(20kg을 하드코딩할지, product별 point 테이블 실제 최대 weight_kg를 동적 조회할지)

## [DoD]

- [ ] `zen_ups_weight_tier_rates`·`zen_ups_freight_minimums` 마이그레이션 + 시드
- [ ] `computeUpsFreight()` 20kg 초과 분기 정확히 동작
- [ ] `applyDeficitWeightBilling()` 정확한 비교 로직 + breakdown 투명성
- [ ] Freight 최소운임 적용 로직
- [ ] 신규 단위테스트(TC-UPS-TIER-*, TC-UPS-DWB-*, TC-UPS-FREIGHTMIN-*) — 경계값(20.0kg/20.5kg 등) 케이스 포함
- [ ] `npm run test:regression` 전체 PASS
- [ ] `npx tsc --noEmit` 신규 오류 0건
- [ ] `LIVE_REGRESSION_TEST_MAP.md`·`scratch/IMP_PROGRESS.md` 갱신
- [ ] `check-R17-DoD` 실행 완료

## [R-17 완료 보고 절차]

표준 절차 준수. TASK-179 ✅ 확인 후 착수(Aiden이 전제조건 해제 시 ⬜ 전환 통보).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

## [설계 의견]

_(Riley 작성)_

## [설계 확정]

_(Aiden 전속)_

## [작업 결과]

_(Riley 작성)_
