# DEF-119: UPS 스냅샷 캐시 — 중량 변경 시 자동 재계산 메커니즘 누락

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-23 |
| **보고자** | B_Kai (TASK-205 재작업 중 아키텍처 분석) |
| **긴급도** | High |
| **우선순위** | P1 |
| **연결 이슈** | [#747](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/747) |

## 현상

입고 시 중량 수정(gross_weight 변경)이 최종 정산 원가/운임에 반영되지 않음.
화주에게 청구되는 금액이 오더 등록 시점의 예상운임(스냅샷) 기준으로 고정됨.

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

- 화주에게 청구되는 정산 금액이 실제 중량과 다를 수 있음
- 특히 소액 화물(10kg 미만)에서 중량 차이에 따른 운임 차이가 클 수 있음
- registerUpsOrder가 SHXK에는 정확한 중량을 전송하므로, UPS사 실제 청구와 플랫폼 화주 청구가 불일치 가능

## 조치 방향 (설계 결정 필요)

| 안 | 설명 | 장단점 |
|:---|:-----|:-------|
| A. 스냅샷 재생성 트리거 추가 | `confirmInbound` 또는 별도 "운임 재계산" 버튼에서 `saveOrderRateSnapshot` 재호출 | 명시적, 기존 구조 유지 |
| B. 정산 시 라이브 재계산 | `SettlementEngine`이 스냅샷 대신 `estimateUpsFreight`를 직접 호출 | 항상 최신값, 성능 고려 필요 |
| C. 중량 변경 감지 → 자동 갱신 | `zen_order_packages` UPDATE 트리거로 스냅샷 재생성 | 자동화, 복잡도 증가 |

**현재 상태**: 발견만 되어 있으며, 수정은 별도 Task에서 설계 결정 후 진행해야 함.

## 검증

- E29 TC-WF-01: `computeUpsFreight` 직접 호출로 2.0kg vs 5.0kg 차이 증명 (189,142 vs 249,577 KRW)
- E29 TC-WF-02: 스냅샷 수동 갱신 후 정산 비용이 정확히 반영되는지 검증
