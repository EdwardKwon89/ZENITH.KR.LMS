# An_15: UPS 오더 등록 후 처리 프로세스 현황 분석

> **작성자**: Jaison | **작성일**: 2026-07-18 | **요청**: JSJung

## 배경
JSJung 요청: "UPS 오더 등록 후 처리 프로세스에 대한 정리가 필요함".

**중요**: 최초 조사 시 "UPS 라벨 발급이 정식 업무 플로우와 분리되어 테스트 버튼에만 의존한다"고 판단했으나, `OutboundProcessForm.tsx`(창고 출고 처리 화면)를 추가 확인한 결과 **이는 사실이 아님** — 정식 프로덕션 경로가 이미 존재하고 정상적으로 연결되어 있습니다. 아래는 정정된 현황입니다.

## 현재 구조

### 1. 오더 일반 상태 머신 (`src/lib/logistics/status-machine.ts`)
```
REGISTERED → SCHEDULED → WAREHOUSED → PACKED/RELEASED → IN_TRANSIT → DELIVERED → (RETURNED/CLAIMED)
```

### 2. UPS 라벨 발급의 정식 경로 — 창고 출고 확정 시 자동 트리거
`OutboundProcessForm.tsx`(`src/components/warehouse/OutboundProcessForm.tsx`)의 `executeConfirmOutbound()`:
```
issueLabelsForPackages(주문들)  // intl_ref_locked=false인 패키지가 있으면 issueUpsLabel() 자동 호출
  ↓
confirmOutbound(orderId)  // WAREHOUSED 상태만 허용, 출고 확정 처리
```
`confirmOutbound()`(`src/app/actions/operations/warehouse.ts:122`)는 `order.status !== WAREHOUSED`면 즉시 에러를 던지는 가드가 있어, **WAREHOUSED 상태의 오더가 출고 확정되는 시점에 UPS 라벨이 아직 없으면 자동으로 발급한 뒤 출고를 진행**합니다. 즉 "국제 운송 번호 발부"(라벨 발급)와 "창고 출고"가 이미 하나의 흐름으로 정상 연결되어 있습니다. 재발급(`handleReissue`)·라벨 취소(`handleVoidLabel`, `voidUpsLabel`)도 같은 화면에 구현되어 있습니다.

### 2-1. "무역서류 관리" 테스트 버튼과의 관계
오더 상세 페이지의 `UpsTradeDocumentActions.tsx`(Issue #565에서 "테스트 후 삭제 예정"으로 명시된 컴포넌트)는 위 정식 경로와 **별개의 임시 테스트 진입점**입니다. 어제(2026-07-17)~오늘 DEF-102~108 재현 테스트에 사용된 오더 ZEN-2026-000001의 createorder는 전부 이 테스트 버튼을 통해 실행된 것으로, 정식 창고 출고 플로우를 거치지 않았습니다.

## 남은 확인 필요 사항 (완전한 공백은 아니나, 명확화 필요)
1. **`RELEASED` 전이와 UPS 실제 운임의 연결**: `updateOrderStatus()`가 `RELEASED` 전이 시 자동 실행하는 `generateInvoicesForOrder()`가 UPS 라벨 발급 시점의 확정 요금을 반영하는지, 아니면 등록 시점 예상운임(`estimated_cost`)만 쓰는지는 이번 조사 범위에서 확정하지 못함 — An_16(예상운임/UPS 사후청구)에서 이어서 다룸.
2. **테스트 버튼의 향후 처리**: `UpsTradeDocumentActions.tsx`는 애초 "테스트 후 삭제 예정"으로 설계되었으나(Issue #565), 아직 남아있고 DEF-102~108 재현 테스트에 계속 쓰이고 있습니다. 정식 창고 출고 플로우 검증이 끝나면 이 컴포넌트를 실제로 제거할지, 아니면 QA/디버깅용으로 남겨둘지 JSJung 판단 필요.

## 원 요구사항과의 비교 (고객 Review, `docs/80_RawData/고객 Review 20260609.md`)
> 요금 정보 등록 → 화주 운송 의뢰 → 배송 배정 → 창고 입고 → **국제 운송 번호 발부** → 창고 출고 → **UPS 발송/관련 송장 출력** → [UPS] 부가 요금 결정/통보 → 부가 요금 적용 → 최종 요금 결정,청구,수금 확인

이 흐름은 **이미 대체로 구현되어 있습니다** — "국제 운송 번호 발부"~"창고 출고"까지는 `OutboundProcessForm`에서 확인됨. "UPS 부가 요금 결정/통보~적용" 이후 단계는 An_16 참조(신규 기능, 미구현 확인됨).

## 결론
UPS 오더 처리 프로세스의 핵심 골격(라벨 발급 ↔ 창고 출고)은 **이미 정상적으로 구현·연결되어 있음**을 확인했습니다. 추가 구현이 필요한 부분은 프로세스 연결 자체가 아니라 (a) UPS 사후 청구 반영(An_16), (b) 테스트 버튼의 정리 여부 결정입니다.
