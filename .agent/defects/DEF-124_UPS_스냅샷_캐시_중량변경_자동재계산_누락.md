# DEF-124: UPS 스냅샷 캐시 — 중량/부피 변경 시 자동 재계산 메커니즘 누락

> **2026-07-24 Aiden 범위 확대**: 최초 보고는 중량(gross_weight)만 다뤘으나, Edward 지적으로 **부피(치수 L×W×H)도 동일하게 영향받음**을 코드로 확인 — 아래 "부피 영향 확인" 섹션 참조. 제목·조치 방향 모두 중량+부피로 범위 확대.

> **2026-07-24 재채번**: 원래 DEF-120으로 등록됐다가 Team B TASK-B-192/Issue #728과 충돌해 DEF-121로 정정했으나(아래 두 번째 알림 참조), 이후 Team B가 그보다 먼저(2026-07-23 19:11) 별도로 DEF-121(TrackingDashboard Detail 링크 404, Issue #741/TASK-B-193)을 등록해둔 것이 TeamB_Dev→develop 병합 시점에 재발견됨. 이번엔 Team A가 더 늦게 등록한 쪽이라 DEF-124로 재차 정정(Edward 결정, 2026-07-24).

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-23 |
| **보고자** | B_Kai (TASK-205 재작업 중 아키텍처 분석) |
| **긴급도** | High |
| **우선순위** | P1 |
| **연결 이슈** | [#747](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/747) |

## 현상

입고 시 중량·부피(치수) 수정이 최종 정산 원가/운임에 반영되지 않음.
화주에게 청구되는 금액이 오더 등록 시점의 예상운임(스냅샷) 기준으로 고정됨.

## 부피 영향 확인 (2026-07-24 추가)

`calcChargeableWeight()`(`src/lib/ups/pricing-engine.ts:97-105`)는 **실중량과 부피중량(`l×w×h÷divisor`, 기본 divisor=5000) 중 더 큰 값**을 청구중량으로 사용합니다:
```ts
const volumetricKg = (dims.l * dims.w * dims.h) / divisor;
return { chargeableKg: Math.max(actualKg, volumetricKg), volumetricKg };
```
추가로 `isOversizePackage(dims)`(같은 파일 `calcMultiPackageChargeableWeight` 내부)로 치수 기준 OVERSIZE 할증도 별도 트리거됩니다. 즉 **부피(치수)만 바뀌어도 중량과 완전히 동일한 경로로 요금이 달라지며, 이 값도 `computeUpsFreight()` 결과 전체와 함께 스냅샷에 한 번만 고정됩니다** — 중량 변경과 별개 문제가 아니라 같은 버그의 또 다른 입력값입니다. 입고 시 재측정 대상은 중량뿐 아니라 치수(L×W×H)도 포함되므로, 조치 방향(아래) 결정 시 두 필드를 함께 다뤄야 합니다.

## 근본 원인

### 데이터 흐름 분석

```
오더 등록 (createOrder)
  └── saveOrderRateSnapshot() ──> INSERT zen_order_rate_snapshots (1회만)
        └── estimateUpsFreight() ──> 전체 요율 계산

입고 (confirmInbound) ──> status만 WAREHOUSED로 변경, 중량/비용 로직 없음

UPS 등록 (confirmUpsRegistration → registerUpsOrder)
  └── SHXK API에 최신 gross_weight 전송 ──> label 발급용
        └── zen_order_rate_snapshots 갱신 안 함

정산 (SettlementEngine.calculateOrderCosts)
  └── READS zen_order_rate_snapshots.metadata ──> 스냅샷 그대로 사용
        └── estimateUpsFreight 재호출 안 함
```

### 핵심缺陷

| 시점 | 동작 | 문제 |
|:-----|:-----|:-----|
| 오더 생성 | `saveOrderRateSnapshot` 호출 → 스냅샷 INSERT | 정상 (1회) |
| 입고 (중량 실측) | `confirmInbound` → `updateOrderStatus`만 호출 | **중량 변경 시 스냅샷 재생성 없음** |
| UPS 등록 | `registerUpsOrder` → SHXK에 최신 중량 전송 | 라벨용이지 정산용 아님 |
| 정산 | `SettlementEngine` → 스냅샷 metadata에서 비용 추출 | **재계산 없음, 스냅샷 기준 고정** |

### 증명 (E29 TC-WF-01)

```
2.0kg 견적: 189,142 KRW (스냅샷에 저장됨)
5.0kg 견적: 249,577 KRW (computeUpsFreight 직접 계산)
→ 스냅샷은 2.0kg 기준으로 고정, 5.0kg 변경분 미반영
```

## 영향 범위

| 함수/컴포넌트 | 파일 | 증상 |
|:-------------|:-----|:-----|
| `saveOrderRateSnapshot` | orders.ts:28 | 오더 생성 시 1회만 호출, 이후 재호출 없음 |
| `confirmInbound` | orders.ts:647 | 중량 변경 무시, status만 변경 |
| `SettlementEngine.calculateOrderCosts` | settlement/settlement.ts:26 | 스냅샷에서 비용 추출, 재계산 없음 |
| `registerUpsOrder` | ups-labels.ts:294 | SHXK에 최신 중량 전송하지만 정산 스냅샷 갱신 안 함 |

## 영향

- 화주에게 청구되는 정산 금액이 실제 중량·부피와 다를 수 있음
- 특히 소액 화물(10kg 미만)에서 중량/부피 차이에 따른 운임 차이가 클 수 있음
- 부피가 커서 OVERSIZE 할증 대상이 됐는데도 스냅샷에는 반영 안 될 수 있음
- registerUpsOrder가 SHXK에는 정확한 중량을 전송하므로, UPS사 실제 청구와 플랫폼 화주 청구가 불일치 가능

## 조치 방향 (설계 결정 필요)

| 안 | 설명 | 장단점 |
|:---|:-----|:-------|
| A. 스냅샷 재생성 트리거 추가 | `confirmInbound` 또는 별도 "운임 재계산" 버튼에서 중량+치수 갱신 후 `saveOrderRateSnapshot` 재호출 | 명시적, 기존 구조 유지 |
| B. 정산 시 라이브 재계산 | `SettlementEngine`이 스냅샷 대신 `estimateUpsFreight`를 직접 호출 | 항상 최신값, 성능 고려 필요 |
| C. 중량/치수 변경 감지 → 자동 갱신 | `zen_order_packages`(gross_weight·length·width·height) UPDATE 트리거로 스냅샷 재생성 | 자동화, 복잡도 증가 |

**현재 상태**: 발견만 되어 있으며, 수정은 별도 Task에서 설계 결정 후 진행해야 함.

## 검증

- E29 TC-WF-01: `computeUpsFreight` 직접 호출로 2.0kg vs 5.0kg 차이 증명 (189,142 vs 249,577 KRW)
- E29 TC-WF-02: 스냅샷 수동 갱신 후 정산 비용이 정확히 반영되는지 검증
