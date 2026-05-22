# E2E-13: HELD 상태 원상복구 시나리오 검증 결과

- **Task-ID**: TASK-052
- **검증 대상**: IMP-050 (`getHeldPreviousStatus` API + 원상복구 UI 흐름)
- **수행일**: 2026-05-22
- **수행 Agent**: Riley (Gemini)
- **결과**: **PASS**

---

## 검증 시나리오 개요

보류(`HELD`) 상태의 오더에 대해 `StatusChangeModal`을 열었을 때, 이전 상태 정보를 정확하게 표시하고 "원상복구" 버튼을 통해 이전 상태로 성공적으로 복귀할 수 있는지 검증합니다.

1. **로그인**: 어드민 계정으로 로그인 성공 확인.
2. **오더 검색**: 대상 오더(`Z-FIN-E2E05-01`) 검색 및 목록 노출 확인.
3. **중간 상태 전이**: 오더의 상태를 `WAREHOUSED` (입고완료)로 전이.
4. **보류 전이**: 오더의 상태를 `HELD` (보류)로 전이.
5. **원상복구 버튼 확인**: 보류 상태 오더의 모달을 열었을 때 '원상복구' 버튼 및 이전 상태('입고완료') 레이블이 정상적으로 노출되는지 확인.
6. **복구 실행**: '원상복구' 버튼 클릭 후 이전 상태(`WAREHOUSED`)로 복귀하고 성공 토스트 메시지가 표시되는지 확인.

---

## 단계별 검증 스크린샷

| 단계 | 검증 내용 | 스크린샷 파일 |
|:---:|:---|:---|
| 1 | 어드민 로그인 완료 | [01_login_success.png](01_login_success.png) |
| 2 | 검증 대상 오더(`Z-FIN-E2E05-01`) 검색 | [02_search_order.png](02_search_order.png) |
| 3 | `WAREHOUSED` 상태로 변경 완료 | [03_changed_to_warehoused.png](03_changed_to_warehoused.png) |
| 4 | `HELD` 상태로 변경 완료 | [04_changed_to_held.png](04_changed_to_held.png) |
| 5 | 원상복구 버튼 노출 확인 (이전 상태: 입고완료) | [05_held_modal_restore_button.png](05_held_modal_restore_button.png) |
| 6 | 이전 상태(`WAREHOUSED`)로 원상복구 완료 | [06_restored_to_warehoused.png](06_restored_to_warehoused.png) |

---

## 특이사항 및 결론

- **타이밍 최적화 적용**: `networkidle` 및 고정 `waitForTimeout` 대기를 제거하고 Playwright의 지능적 `expect().toBeVisible()` 및 `domcontentloaded` 대기 방식으로 대체하여, 테스트 실행 시간을 약 10.2초 수준으로 크게 단축하였습니다.
- **Portaling 적용**: `StatusChangeModal`을 React Portal(`document.body`)로 마운트하여 sibling 요소와의 z-index 및 stacking context 충돌 없이 Playwright가 정상적으로 요소를 클릭할 수 있음을 검증하였습니다.
- **기능 정합성**: RPC `update_order_status_atomic` 및 `getHeldPreviousStatus`가 정상 작동하여 상태를 이전 상태로 완벽히 복원하였습니다.
