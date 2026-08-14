# TASK-B-300 — UPS 오더 상세 화면 4건 개선 (DEF-B-066 + 배송기본정보 확장 + Settlement Preview 제거 + 청구중량 표시)

| 항목 | 내용 |
|:-----|:------|
| **생성일** | 2026-08-14 |
| **담당** | Baker (구현) · Jaison (검토) |
| **우선순위** | P2 |
| **GitHub Issue** | [#1119](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1119) |
| **관련 결함** | [DEF-B-066](../defects/DEF-B-066_UpsOrderBreakdownCard_productCode_하드코딩폴백.md) |
| **상태** | 🔔 보고 완료 |

## [작업 결과]

**커밋**: `c9c5b47b` — `[Baker] fix: TASK-B-300 UPS 오더 상세 화면 4건 개선 — productCode 폴백/배송정보 확장/Settlement 제거/청구중량 (Issue #1119 / DEF-B-066)`

| # | 변경 | 검증 |
|:--|:-----|:-----|
| ① | `UpsOrderBreakdownCard.tsx` — productCode 하드코딩 `'UPS Express'` 폴백 제거. `cargoDetails.product_code` → `platform.breakdown.product.product_name` → `product_code` → `snapshotMeta.productCode` → `'-'` 순으로 참조 (DEF-B-066) | 단위 테스트 4건(상품명 표시/`-` 폴백/cargoDetails 우선/되돌리기) PASS + 되돌리기 검증 2건 FAIL 재현 |
| ② | `ups-detail/page.tsx` — 배송 기본 정보 카드 확장. 화주 연락처(`shipper_contact_phone`)·이메일(`shipper_contact_email`)·주소(`shipper_address`+`_detail` 이어붙임), 수하인 연락처(`recipient_contact ?? recipient_phone`)·이메일(`recipient_email`) 추가. 값 없으면 항목 자체 숨김 | `ups-detail-b300.test.tsx` 3건(값 표시/phone 폴백/값 없음 숨김) PASS + 되돌리기 2건 FAIL 재현 |
| ③ | `ups-detail/page.tsx` — Settlement Preview(`OrderFinanceSummary`) JSX·import 제거, 죽은 쿼리 `incidentFees` 제거. `costs`/`linkedInvoiceId`/`invoice`는 유지(`ciData.invoice_no` 사용). 일반 오더 상세 화면은 미변경 | `ups-detail-b300.test.tsx` 미출현 검증 + `order-detail-settlement-b300.test.tsx` 일반 화면 유지 검증 PASS + 되돌리기 4건 FAIL 재현 |
| ④ | `UpsOrderBreakdownCard.tsx` — Weight Grid 3→4칸. "청구중량 (Billing Weight)"=`platform.breakdown.billingWeightKg`(폴백 `billableWeight`) 추가. 기존 3번째 칸 라벨 "과금 기준 중량 (Chargeable)"로 재명명(계산 유지) | 단위 테스트 2건(ZEN-2026-000073 5vs4.8 구분/폴백) PASS + 되돌리기 2건 FAIL 재현 |
| 회귀 | — | `npm run test:regression` **1330/1330 PASS** (193 files) · `npm run build` SUCCESS |
| R-10 | ZEN-2026-000073 실UI — ①상품명 뱃지 "UPS WorldWide Express Saver (비서류)" 표시+`UPS Express` 부재 ②"연락처: 010-1234-5678"·"+8639383020288"·이메일x2·주소 2건 표시 ③"Settlement Preview" 부재 ④"청구중량 5.00 kg" vs "과금 기준 4.80 kg" 구분 ⑤일반 오더 상세 화면 "Settlement Preview" 유지 — 스크린샷 `scratch/task-b-300-r10/01_ups-detail_b300.png`·`02_order_detail_settlement_kept.png` | **1 passed** |
| 회귀 맵 | `LIVE_REGRESSION_TEST_MAP.md` 섹션 9 — `TC-DEF-B066-01`·`TC-B300-04-01`·`TC-B300-02-01`·`TC-B300-03-01` 4행 등재 (R-09 DoD) | — |

## [Jaison 최종 검토]

_(PR 제출 후 작성 예정)_

## 배경

TASK-B-299(PR#1114) 검토 중 발견한 DEF-B-066에 더해, JSJung이 `ups-detail` 화면에 대한 UI 개선 3건을 추가 요청. 4건 모두 같은 화면(`ups-detail`) 관련이라 하나의 Task로 묶어 배정.

## 작업 범위 (4건)

### ① DEF-B-066 — `productCode` 하드코딩 폴백 수정

파일: `src/components/ups/UpsOrderBreakdownCard.tsx` L25

**현재**:
```js
const productCode = cargoDetails?.product_code || snapshotMeta?.productCode || 'UPS Express';
```

**수정**:
```js
const productCode =
  cargoDetails?.product_code
  ?? snapshotMeta?.platform?.breakdown?.product?.product_name
  ?? snapshotMeta?.platform?.breakdown?.product?.product_code
  ?? snapshotMeta?.productCode
  ?? '-';
```
상세 원인·검증 방향은 [DEF-B-066](../defects/DEF-B-066_UpsOrderBreakdownCard_productCode_하드코딩폴백.md) 문서 참조. DEF-B-065와 동일 패턴(존재하지 않는 필드 → 하드코딩 폴백) — 하드코딩된 특정 상품명을 최종 기본값으로 두지 않는다(못 찾으면 `'-'`).

### ② 배송 기본 정보 카드 — 화주/수하인 연락처·이메일·주소 확장 표출

파일: `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx` L330-339 (`배송 기본 정보 (Shipper / Consignee)` 카드)

**현재**: 화주는 이름만, 수하인은 이름+주소만 표시.

**변경**:
- **화주 (Shipper)**: 이름(기존 유지) + **연락처**(`order.shipper_contact_phone`) + **이메일**(`order.shipper_contact_email`) + **주소**(`order.shipper_address`, 있으면 뒤에 `order.shipper_address_detail` 이어붙임) 추가 표출
- **수하인 (Consignee)**: 이름(기존 유지) + **연락처**(`order.recipient_contact ?? order.recipient_phone` — 같은 파일 L192 `upsInvoiceData`에 이미 쓰인 우선순위 패턴과 동일하게) + **이메일**(`order.recipient_email`) 추가 표출, 주소는 기존 그대로 유지
- 값이 없는 필드(빈 문자열/undefined)는 항목 자체를 숨기거나 `-`로 표시 — 빈 줄이 그대로 노출되지 않게 처리
- 기존 "주문 상태" 뱃지 블록은 그대로 유지

과설계 금지 — 레이아웃 전면 재설계 없이 기존 `<div>` 블록 안에 라벨-값 줄만 추가하는 최소 변경.

### ③ Settlement Preview 섹션 삭제 (이 화면에서만)

파일: `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx` L347-355

- `<OrderFinanceSummary ... />` JSX 블록과 그 import(L18)를 `ups-detail/page.tsx`에서만 제거
- **`src/components/finance/OrderFinanceSummary.tsx` 컴포넌트 자체는 삭제하지 않는다** — 일반 오더 상세 화면(`orders/[orderId]/page.tsx`)에서 계속 사용 중이므로 그쪽은 절대 건드리지 않는다(R-20 영향도 분석 시 확인 필요 — 수정 전 `gitnexus_impact({target: "OrderFinanceSummary", direction: "downstream"})` 또는 최소 grep으로 타 페이지 사용처 재확인)
- 제거 후 정리:
  - `costs`(L83-87)·`linkedInvoiceId`(L88)·`invoice`(L89-91) 쿼리는 **그대로 유지** — `invoice?.invoice_no`가 L140 `ciData.invoice_no`(상업송장 PDF)에 계속 쓰이므로 삭제하면 안 됨
  - `incidentFees`(L93-95) 쿼리는 `OrderFinanceSummary` 제거 후 이 파일 내에서 완전히 미사용 상태가 됨 — 죽은 쿼리이므로 함께 제거
  - `canManageFinance`/`isAdmin`은 `UpsActualAdjustmentForm`(L279) 등 다른 곳에 여전히 쓰이므로 그대로 유지

### ④ 운임 및 화물 구성 — 청구중량(Billing Weight) 표시 추가

파일: `src/components/ups/UpsOrderBreakdownCard.tsx` — Weight Grid 부분 (`grid-cols-3` 3칸: 실측/부피/청구 대상)

**배경**: 현재 3번째 칸 "청구 대상 중량 (Billable)"은 `Math.max(actualWeight, totalVolumetricWeight, ...)`로 클라이언트에서 재계산한 값 — 이는 실제 운임 산정에 쓰인 최종 중량이 **아니다**. 실제 요율 조회에 쓰인 최종 중량은 가격엔진(`pricing-engine.ts`)이 0.5kg 단위 올림까지 적용한 뒤 스냅샷에 저장한 `billingWeightKg`이며(예: ZEN-2026-000073은 chargeable 4.8kg → billing **5kg**로 올림된 값이 실제 요율 조회에 사용됨), 현재 카드에는 이 값이 전혀 노출되지 않는다. JSJung 요청: "청구중량 = 운임산정을 위한 최종 중량"을 추가 표시.

**변경**:
```js
const billingWeightKg = Number(snapshotMeta?.platform?.breakdown?.billingWeightKg ?? billableWeight);
```
- Weight Grid를 `grid-cols-3` → `grid-cols-4`(또는 2x2)로 확장, 4번째 칸에 **"청구중량 (Billing Weight)"** = `billingWeightKg` 추가
- 기존 3번째 칸("청구 대상 중량 (Billable)")은 실제로는 반올림 전 chargeable 값이라 명칭이 새 항목과 혼동될 수 있음 — **"과금 기준 중량 (Chargeable)"** 등으로 라벨만 재명명 권장(계산 로직 자체는 그대로 유지, 라벨 텍스트만 변경). 값 자체를 지우거나 로직을 바꾸지 않는다.
- `billingWeightKg` 스냅샷이 없는 오더(요율 미산정 상태 등)는 `billableWeight`로 폴백 — 빈 값/NaN 노출 금지

## 회귀 테스트 방향

- ① productCode: `snapshotMeta.platform.breakdown.product = {product_code, product_name}` mock 시 정확히 표시되는지, 정보 없을 때 `'-'`(하드코딩 "UPS Express" 미노출) 확인 + 되돌리기 검증
- ② 배송기본정보: `order` mock에 shipper/recipient 연락처·이메일 값이 있을 때 화면에 표시되는지, 값이 없을 때 빈 줄 노출 없이 처리되는지 (page.tsx 렌더링 — 기존 `ups-detail` 관련 테스트 파일 패턴 확인 후 적절한 위치에 신규/보강)
- ③ Settlement Preview: `ups-detail` 페이지 렌더링 시 "Settlement Preview" 텍스트가 더 이상 나타나지 않는지, 반대로 일반 오더 상세 화면(`orders/[orderId]/page.tsx`)에는 여전히 정상 표시되는지(회귀 방지 — 반드시 두 화면 다 확인)
- ④ 청구중량: `billingWeightKg=5`, chargeable(max)=4.8 mock 시 두 값이 서로 다르게(4.80kg vs 5.00kg) 각자 정확히 표시되는지 — ZEN-2026-000073 실데이터(chargeable 4.8 / billing 5) 기준 재현 테스트 포함
- 전체 회귀 PASS + `LIVE_REGRESSION_TEST_MAP.md` 갱신(R-09)
- **독립 되돌리기 검증 필수** — 4건 각각

## R-10 (실 UI 검증)

4건 모두 시각적 확인이 핵심이므로 생략 불가. ZEN-2026-000073 등 실제 오더로 `ups-detail` 화면 스크린샷 확보:
- 상품 뱃지가 실제 상품명으로 표시(더 이상 "UPS Express" 고정 아님)
- 배송 기본 정보 카드에 화주/수하인 연락처·이메일 표시
- Settlement Preview 섹션이 화면에서 사라짐
- 청구중량 항목이 새로 표시되고 기존 항목과 값이 다름(반올림 차이가 있는 오더 기준)
- **추가로 일반 오더 상세 화면**(`orders/[orderId]`)에서 Settlement Preview(구 OrderFinanceSummary)가 여전히 정상 표시되는지도 스크린샷으로 확인(③ 회귀 방지 증적)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
