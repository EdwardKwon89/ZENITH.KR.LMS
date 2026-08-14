# DEF-B-065 — UPS 오더 상세 "운임 및 화물 구성" 카드: Zone 하드코딩 폴백 노출 + 통화 3자리 쉼표 미표시

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 ZEN-2026-000073 오더 상세(`ups-detail`) 화면에서 Zone이 "Zone 5"로 표출되는 것을 발견, Jaison이 원인 분석. 추가로 같은 화면 운임 금액 표기에 3자리 쉼표가 없는 점을 JSJung이 함께 지적 |
| **긴급도** | Medium — 실제 계산/청구 금액 자체는 정확(DB `zen_order_rate_snapshots` 원본 일치), 화면 표시 레이어만의 문제. 다만 Zone 값이 항상 고정 오표시되어 운영자가 요율 검증 시 혼란 유발 |
| **현재 상태** | 미수정 — TASK-B-299 배정 |

## 원인 ①: Zone 하드코딩 폴백 노출

[UpsOrderBreakdownCard.tsx:26](../../src/components/ups/UpsOrderBreakdownCard.tsx#L26):
```js
const zoneId = snapshotMeta?.zoneId || snapshotMeta?.zoneCode || snapshotMeta?.zone_id || 'Zone 5';
```

`snapshotMeta`(= `zen_order_rate_snapshots.metadata`) 실제 구조에는 최상위 `zoneId`/`zoneCode`/`zone_id` 필드가 존재하지 않는다. Zone 정보는 실제로 `snapshotMeta.platform.breakdown.zone.zone_name`(및 `zone_code`) 경로에 중첩되어 있다(직접 DB 조회로 확인 — ZEN-2026-000073은 `zone_code: "Z7"`, `zone_name: "Zone 7"`). 3개 fallback이 모두 실패 → 마지막 하드코딩 기본값 `'Zone 5'`가 그대로 노출됨. **Zone 값과 무관하게 이 카드는 항상 "Zone 5"로 고정 표시되는 구조적 결함**이며, 같은 파일 L40(`baseFreight`)은 정확히 `breakdown.baseSellingPrice`를 참조하고 있어 금액은 맞고 Zone 뱃지만 틀리게 보인다.

## 원인 ②: 통화 금액 3자리 쉼표 미표시

같은 파일 L107/111/116/122/127 — `baseFreight`/`fuelSurcharge`/`surgeFee`/`extraCharges`/`totalFreight` 전부 `.toFixed(2)`만 사용해 천 단위 구분자 없이 표시됨(예: "₩355100.00"). 프로젝트 내 다른 금액 표시 화면([OrderFinanceSummary.tsx:147](../../src/components/finance/OrderFinanceSummary.tsx#L147), [ShipperDailyBillingClient.tsx](../../src/components/finance/ShipperDailyBillingClient.tsx) 등)은 모두 `.toLocaleString(undefined, { minimumFractionDigits: 2 })` 패턴으로 3자리 쉼표를 표시하고 있어, 이 파일만 기존 컨벤션에서 벗어난 예외 상태.

## 수정 방향 (TASK-B-299에 배정)

1. **Zone 표시 수정**: `zoneId` 산출 경로를 실제 스냅샷 구조에 맞게 수정.
   ```js
   const zoneId =
     snapshotMeta?.platform?.breakdown?.zone?.zone_name
     ?? snapshotMeta?.platform?.breakdown?.zone?.zone_code
     ?? snapshotMeta?.zoneId ?? snapshotMeta?.zoneCode ?? snapshotMeta?.zone_id
     ?? '-';
   ```
   - 하드코딩된 `'Zone 5'` 기본값 제거 — 어떤 경로로도 Zone을 못 찾으면 `'-'`(또는 "확인 필요" 등 명확히 "데이터 없음"을 나타내는 값)로 대체. 절대 특정 Zone 번호를 기본값으로 두지 않는다(이번 결함의 핵심 원인이 바로 이 패턴).
   - 기존 최상위 `zoneId`/`zoneCode`/`zone_id` fallback도 혹시 다른 오더/경로에서 쓰일 가능성을 대비해 그대로 유지(과설계 방지, 회귀 없음).

2. **통화 쉼표 표시 수정**: L107/111/116/122/127 5개 지점 모두 `.toFixed(2)` → `.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })`로 교체(프로젝트 기존 컨벤션과 동일하게 통일).

과설계 금지 — 이 카드 컴포넌트 외 다른 화면의 통화 표기는 이번 범위 밖(이미 대부분 `.toLocaleString()` 사용 중이라 해당 없음).

## 회귀 테스트 방향

- `snapshotMeta.platform.breakdown.zone.zone_name = "Zone 7"`일 때 카드에 "Zone 7"이 표시되는지(이번 결함 핵심 재현 케이스 — ZEN-2026-000073 실제 데이터 기준)
- `snapshotMeta`에 zone 정보가 전혀 없을 때 `'Zone 5'`가 아니라 `'-'`(또는 동등한 명시적 미확인 값)로 표시되는지 — 하드코딩 회귀 방지
- 금액이 1,000 이상인 케이스(예: baseFreight 355100)에서 "355,100.00" 형식으로 3자리 쉼표가 표시되는지(5개 항목 모두)
- 되돌리기 검증: Zone 수정 되돌리면 "Zone 7" 케이스가 다시 "Zone 5"로 오표시되는지, 쉼표 포맷 되돌리면 "355100.00"으로 되돌아가는지
