# TASK-B-121: Issue #457 (P1) — Shipper 운임 계산 로직 수정 (할인율 기본운임 적용)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#457](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/457) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-13 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. 수정: `src/lib/ups/shipper-pricing.ts`
- `computeShipperFreight` 시그니처 변경: `(baseSellingPrice, fuelSurchargeSellingAmount, otherChargesSellingTotal, shipperZoneDiscountRate)`
- 할인율은 기본운임에만 적용: `discountedBase = baseSellingPrice * (1 - shipperZoneDiscountRate)`
- 부가운임(유류할증+기타)은 정가 그대로 합산
- `finalFreight = discountedBase + fuelSurchargeSellingAmount + otherChargesSellingTotal`

#### 2. 수정: `src/types/ups.ts`
- `UpsShipperFreightResult` 필드 변경: `baseSellingPrice`, `fuelSurchargeSellingAmount`, `otherChargesSellingTotal`, `shipperDiscountRate`, `finalFreight`

#### 3. 수정: `src/app/actions/ups/freight.ts` (225행)
- 호출부 변경: `platform.baseSellingPrice`, `platform.fuelSurchargeSellingAmount`, `platform.otherChargesSellingTotal` 개별 전달

#### 4. 수정: `src/components/orders/UpsFreightEstimatePanel.tsx`
- 부피중량 표시 추가
- 기본운임/유류할증료/기타부가요금/합계 세부내역 표출
- 할인율 표시 (화주 적용 시)

#### 5. 수정: 테스트 2건
- `pricing-engine.test.ts`: computeShipperFreight 호출 인자 변경 + 기대값 재계산
- `ups-estimate-panel.test.tsx`: shipper mock 구조 변경

### 검증
- **Build PASS** ✅
- **Regression**: 81/81 ALL PASS (485 tests)

### 커밋
- (커밋 예정) — `[Mike] fix: TASK-B-121 Issue #457 Shipper 운임 계산 로직 수정 (할인율 기본운임 적용)`
