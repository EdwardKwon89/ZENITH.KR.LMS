# TASK-203 — DEF-119: agency-settlement.ts 전체 파손 (zen_agency_rate_overrides DROP)

## Status
✅ **완료** — PR#735 검토 요청 (2026-07-22)

## Issue
#733 — `src/lib/actions/agency-settlement.ts`가 Issue #310에서 DROP된 `zen_agency_rate_overrides` 참조 → 전체 함수 런타임 에러

## 변경 파일
| 파일 | 변경 | 설명 |
|:-----|:-----|:------|
| `src/lib/actions/agency-settlement.ts` | 재작성 | `_fetchBaseData()`: `zen_agency_pricing_policies` + `zen_ups_zone_countries` 기반으로 전환. `_calculateOrderSettle()`: zone 기반 할인율 모델 적용. 모든 SELECT에 `dest_country_code` 추가 |
| `tests/integration/p7-agency-settlement.test.ts` | 갱신 | Mock 데이터 old override 모델 → zone 기반 할인율 모델로 전환. 기대값 및 테스트 설명 갱신 |

## 수정 상세

### 이전 모델 (BROKEN)
- `_fetchBaseData`: `zen_ups_base_rates` + `zen_agency_rate_overrides` (DROP됨)
- `_calculateOrderSettle`: override → baseRate → snapshot fallback

### 새 모델
- `_fetchBaseData`: `zen_agency_pricing_policies`(agency_org_id, zone_id, discount_rate) + `zen_ups_zone_countries`(country_code, zone_id)
- `_calculateOrderSettle`:
  1. `revenue` = `snapshot.applied_unit_price` (최종 청구액)
  2. `platformSellingTotal` = breakdown 합계 (`baseSellingPrice` + `fuelSurchargeSellingAmount` + `otherChargesSellingTotal` + `surgeFeeSellingAmount`)
  3. zone 해석: `order.dest_country_code` → `zoneMap[country_code]`
  4. `discountRate` = `policies[zone_id]`
  5. `cost` = `platformSellingTotal × (1 - discountRate)`
  6. Fallback: metadata/zone 없으면 `carrier_cost_amount`

## 검증
- ✅ TC-P7-SETTLE-01~04 : 15개 통합 테스트 PASS
- ✅ TC-B-BREAKDOWN-01/02 : metadata parsing PASS
- ✅ TC-B-EXCEL-01~03 : 엑셀 다운로드 PASS
- ✅ TC-B-SEARCH-01~03 / TC-B-SCHEMA-01~03 : 검색/스키마 PASS
- ✅ `tests/unit/finance/agency-settlement-permission.test.ts` : 18개 권한 테스트 PASS
- ✅ `npx next build` : Errors 0
