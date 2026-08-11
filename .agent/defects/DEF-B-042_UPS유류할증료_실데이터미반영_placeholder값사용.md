# DEF-B-042 — UPS 유류할증료(Fuel Surcharge)가 실제 UPS 공지값이 아닌 placeholder로 고정됨

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 UPS 공식 "90일 유류 할증료 이력" 캡처(`ups_유류할증_260810.png`)를 제공, Jaison이 구현(DB)과 대조 |
| **긴급도** | High — 견적/원가 계산에 직접 반영되는 실데이터가 실제 UPS 공지값과 약 3배 괴리, 정산·마진 산정 왜곡 |
| **현재 상태** | 미수정 |

## 원본 자료 vs 구현 대조

### UPS 공식 발표 (이미지, 매주 월요일 갱신)

| 효력 발생일 | 할증료 |
|:---|:---:|
| 2026/08/10 | 46.75% |
| 2026/08/03 | 46.25% |
| 2026/07/27 | 44.75% |
| 2026/07/20 | 40.50% |
| 2026/07/13 | 39.25% |
| 2026/07/06 | 39.00% |
| 2026/06/29 | 39.25% |
| 2026/06/22 | 42.25% |
| 2026/06/15 | 43.75% |
| 2026/06/08 | 43.25% |
| 2026/06/01 | 50.25% |
| 2026/05/25 | 50.25% |
| 2026/05/18 | 49.50% |

### 구현 (`zen_ups_fuel_surcharges`, 로컬 DB 실측)

```
product_code(전체 포함) | effective_week | selling_rate | cost_rate
------------------------+----------------+--------------+-----------
전 상품 동일             | 2026-08-10     |    18.50%    |   15.50%
```
→ **2026-08-10 한 주차만 존재**, 나머지 12주 이력 전무.

## 근본 원인 (확정)

`supabase/migrations/20260628000000_ups_seed_data.sql:79-92`:
```sql
INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
SELECT p.id, DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day')::DATE, 0.185, 0.155
FROM public.zen_ups_products p
ON CONFLICT (product_id, effective_week) DO NOTHING;

INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
VALUES (NULL, DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day')::DATE, 0.185, 0.155)
ON CONFLICT (product_id, effective_week) DO NOTHING;
```
`0.185`/`0.155`는 테스트용 placeholder 하드코딩값. `DATE_TRUNC('week', CURRENT_DATE...)`로 "DB 리셋 시점의 이번 주"에 대해서만 매번 재생성되는 구조라 과거 이력이 절대 쌓이지 않고, 실제 UPS 공지값이 반영된 적이 없음.

관리자가 수기로 입력하는 화면(`admin/ups-rates` → 유류할증 탭, `upsertUpsFuelSurcharge` in `src/app/actions/ups/rates-mutation.ts:160`)은 존재하나, 매주 UPS 공지값을 입력하는 실제 운영 프로세스가 없어 이 화면이 활용되지 않고 있음.

## 영향 범위 (실데이터·재무 영향 — 표시 전용 아님)

`src/lib/ups/pricing-engine.ts:190-206, 325-344`에서 `fuelSurcharge.selling_rate`/`cost_rate`를 견적·원가 계산에 직접 사용:
```ts
fuelSurchargeSellingAmount: baseSellingPrice * fuelRate,
fuelSurchargeCostAmount: baseCostPrice * fuelCostRate,
```
이 값이 아래로 이어짐:
- 오더 견적(`UpsFreightEstimatePanel`)
- 실제 청구/정산(`ups-actual-charges.ts`, `ups-actual-cost.ts`, `daily-billing.ts`, `invoice-generator.ts`)

현재 원가율(15.50%)이 실제(46.75%)의 1/3 수준이라, **오더가 발생하면 실제보다 원가가 대폭 낮게 계산되어 마진이 과대 산정**됨 — DEF-B-041(조회 화면 표시 잘림, 청구 영향 없음)과 달리 이번 건은 **실제 금액 계산에 직접 영향**을 미치는 결함.

## 수정 방향 (제안)

1. **즉시 조치**: 이미지의 13주 실데이터를 `zen_ups_fuel_surcharges`에 반영하는 마이그레이션/시드 추가(전 상품 공통 적용 — 이미지에 상품별 구분 없음. `product_id IS NULL` 전역 행 + 기존 상품별 개별 행도 동일값으로 갱신, 기존 `fuel_surcharge_applicable` 참조 로직과의 정합성 유지).
   - **[JSJung 확인 완료, 2026-08-10]**: "판매할증은 의미가 없다, UPS 공지값 그대로 사용" — `selling_rate = cost_rate` = 이미지 값 그대로 적용(마진 없음). 기존 18.5%/15.5% 차등은 폐기.
2. **재발 방지**: `20260628000000_ups_seed_data.sql`의 "CURRENT_DATE 기준 이번 주 placeholder 자동 생성" 로직이 매 DB reset마다 실제 최신 UPS 공지값을 덮어쓰지 않도록 — 최신 실측 이력을 시드에 직접 박아넣거나(권장), 최소한 placeholder라는 사실이 코드 주석/admin 화면에 명확히 드러나도록 함.
3. **운영 프로세스 공백**은 이번 Task 범위를 벗어나는 조직적 이슈(주간 수기 입력 담당자 지정 등)이므로 별도로 `scratch/post_launch_improvements.md`에 IMP로 기록 권장 — 코드 수정만으로 해결되지 않음.

## 회귀 테스트 (필수)

- 시드/마이그레이션 반영 후 `zen_ups_fuel_surcharges`에 13주 이력이 정확한 날짜·값으로 존재하는지 검증
- `pricing-engine.ts`가 특정 조회일 기준 해당 주차(effective_week ≤ 조회일 중 최신)를 정확히 선택하는지 기존 테스트(`pricing-engine.test.ts`) 통과 확인 — 로직 자체는 변경 없음(데이터만 교체)이므로 회귀 위주
- 되돌리기 검증: 신규 시드 제거 시 기존 18.5%/15.5% placeholder로 복귀하는지 확인
