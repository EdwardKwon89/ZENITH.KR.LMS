# DEF-B-037: zen_ups_base_rates에 상품별 비즈니스 규칙 범위를 벗어난 레거시 잔재 데이터

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-10 |
| **발견자** | JSJung 지적("express/saver 30kg 표출, expedited 0.5단위 표출, flight 정의 안 된 값 표출") → Jaison DB 직접 확인 |
| **긴급도** | Medium — 실제 요금 계산(청구 금액)에는 영향 없음. "UPS 요금표 조회" 화면의 표시 데이터가 부정확 |
| **관련 테이블** | `zen_ups_base_rates` |
| **관련 파일** | `src/app/actions/ups/rates-public.ts:getPublicBaseRates()`(조회 화면이 읽는 지점) |

## 현상

`zen_ups_base_rates`에 각 상품의 실제 비즈니스 규칙 범위를 벗어난 행이 남아 있음:

| 상품 | 정상 범위(비즈니스 규칙) | 잔존하는 이상 weight_kg | 건수 |
|---|---|---|---|
| WW_EXPRESS_NONDOC | 0.5~20kg(0.5 단위), 20kg 초과는 weight_tier_rates 구간요율 사용 | `{25.0, 30.0}` | 20건(10 Zone × 2) |
| WW_SAVER_NONDOC | 0.5~20kg(0.5 단위), 20kg 초과는 weight_tier_rates | `{25.0, 30.0}` | 20건(10 Zone × 2) |
| WW_EXPEDITED | 1~20kg(정수 단위만, `resolveBillingWeight` 확인), 20kg 초과는 weight_tier_rates | `{0.5,1.5,2.5,3.5,4.5,25.0,30.0}` | 70건(10 Zone × 7) |
| WW_FLIGHT | base_rates 자체를 사용하지 않음(`computeUpsFreight` FREIGHT 분기는 freight_minimums+weight_tier_rates만 참조, `freight.ts`도 `productFamily!=='FREIGHT'`일 때만 base_rates 조회) | 전체(0.5~30kg, 16개 지점) | 160건(10 Zone × 16) — **전량** |

**합계 270건.**

## 근본 원인 분석

`src/lib/ups/pricing-engine.ts`(`computeUpsFreight`)와 `src/app/actions/ups/freight.ts`(`estimateUpsFreight`)의 실제 계산 로직은 이 잔재 행들을 **전혀 조회하지 않음**:
- EXPRESS/SAVER/EXPEDITED: `freight.ts:127` `const queryWeight = billingKg <= 20.0 ? billingKg : 20;` — 20kg 초과 시 base_rates 조회 자체를 20kg 고정값으로만 하므로 25/30kg 행은 애초에 쿼리 대상이 아님. EXPEDITED는 `resolveBillingWeight()`가 항상 정수로 올림하므로 0.5kg 단위 행도 매칭될 일이 없음.
- FLIGHT: `freight.ts:126` `if (productFamily !== 'FREIGHT') { ...base_rates 조회... }` — FREIGHT 상품군은 base_rates 조회 자체를 건너뜀.

즉 **실제 청구 금액 계산에는 영향이 없는 순수 표시(display) 데이터 오염**. 다만 `src/app/actions/ups/rates-public.ts:getPublicBaseRates()`가 `is_active`·유효기간 외 별도 weight 필터 없이 테이블 전체를 그대로 반환해, 이 잔재 데이터가 상품별 요금표 조회 화면(shipper/agency/admin UPS 요율 조회)에 그대로 노출됨. Zone1 Express 30kg 예시로 실제 구간요율 공식 계산값(591,300원)과 잔재 데이터값(591,000원)이 300원 차이 — 구간요율(tier) 방식 도입 이전의 구버전 더미 데이터가 청소되지 않고 남은 것으로 추정.

## 권장 조치

1. **데이터 정리(필수)**: 위 표의 이상 weight_kg 행 270건 DELETE.
2. **재발 방지(권장)**: `zen_ups_products.max_weight_kg`가 EXPRESS_NONDOC/SAVER_NONDOC/EXPEDITED에는 현재 NULL — DOC 상품처럼 20으로 설정해두면 향후 관리자 UI에서 상한 검증에 활용 가능(선택 사항, 이번 결함의 필수 수정 범위는 아님).
3. **조회 쿼리 방어(권장)**: `getPublicBaseRates()`에 상품별 `max_weight_kg` 또는 하드코딩된 범위 필터를 추가해, 향후 유사한 잔재 데이터가 다시 생기더라도 조회 화면에 노출되지 않도록 방어선을 두는 것을 검토(선택 사항).

## 참고

TASK-B-261로 배정. 상세 지시사항은 해당 task file 참조.
