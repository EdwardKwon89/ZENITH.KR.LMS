# DEF-B-066 — UPS 오더 상세 운임 카드: productCode도 Zone과 동일 패턴 하드코딩 폴백("UPS Express") 노출

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Jaison이 TASK-B-299(DEF-B-065, PR#1114) 검토 중 R-10 스크린샷(ZEN-2026-000073)을 확인하다가, "UPS EXPRESS" 뱃지가 실제 상품(WW_SAVER_NONDOC / UPS WorldWide Express Saver)과 다르게 표시되는 것을 발견 |
| **긴급도** | Medium — 실제 계산/청구에는 영향 없음(표시 전용). 다만 DEF-B-065와 동일한 원인 패턴이 같은 파일에 남아있어 운영자가 상품 종류를 혼동할 수 있음 |
| **현재 상태** | 미수정 — TASK-B-300 배정 |

## 원인 (DEF-B-065와 동일 패턴)

[UpsOrderBreakdownCard.tsx:25](../../src/components/ups/UpsOrderBreakdownCard.tsx#L25):
```js
const productCode = cargoDetails?.product_code || snapshotMeta?.productCode || 'UPS Express';
```

- `cargoDetails`(=`order.cargo_details`)는 다수 오더에서 빈 객체 `{}`로 저장되어 있어(ZEN-2026-000073 확인) `cargoDetails?.product_code`는 항상 `undefined`
- `snapshotMeta?.productCode`도 최상위에 존재하지 않는 필드 — 실제 데이터는 `snapshotMeta.platform.breakdown.product.product_code`(예: `"WW_SAVER_NONDOC"`) 및 `product_name`(예: `"UPS WorldWide Express Saver (비서류)"`)에 중첩되어 있음(DEF-B-065 조사 시 `zen_order_rate_snapshots.metadata` 직접 조회로 확인된 구조와 동일)
- 두 fallback이 모두 실패 → 하드코딩 기본값 `'UPS Express'`가 그대로 노출됨. **실제 상품 코드와 무관하게 이 카드는 항상 "UPS Express"로 고정 표시되는 구조적 결함**(DEF-B-065의 `zoneId`와 완전히 동일한 버그 패턴)

## 영향 범위

`ups-detail` 페이지를 쓰는 모든 UPS 오더 상세 화면의 상품 뱃지. 실제로는 WorldWide Saver/Expedited 등 여러 UPS 상품군이 존재하는데 전부 "UPS Express"로 오표시.

## 수정 방향 (배정 시 확정)

```js
const productCode =
  cargoDetails?.product_code
  ?? snapshotMeta?.platform?.breakdown?.product?.product_name
  ?? snapshotMeta?.platform?.breakdown?.product?.product_code
  ?? snapshotMeta?.productCode
  ?? '-';
```
- DEF-B-065와 동일하게 하드코딩된 특정 상품명을 최종 기본값으로 두지 않는다 — 못 찾으면 `'-'`
- `product_name`(사람이 읽기 좋은 한글 병기 명칭)을 `product_code`보다 우선 표시할지, 혹은 코드값 그대로 표시할지는 배정 시 UI 컨벤션(다른 화면의 상품명 표시 방식)과 통일 검토 필요

과설계 금지 — 이 카드 컴포넌트 외 범위 밖.

## 회귀 테스트 방향

- `snapshotMeta.platform.breakdown.product = { product_code: "WW_SAVER_NONDOC", product_name: "UPS WorldWide Express Saver (비서류)" }`일 때 카드에 올바른 값이 표시되는지(ZEN-2026-000073 실데이터 재현)
- `snapshotMeta`에 product 정보가 전혀 없을 때 하드코딩 `'UPS Express'`가 아니라 `'-'`(또는 동등한 명시적 미확인 값)로 표시되는지
- 되돌리기 검증: 수정 로직 제거 시 재현 케이스가 정확히 FAIL하는지
