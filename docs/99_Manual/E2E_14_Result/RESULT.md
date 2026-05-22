# E2E-14 실행 결과 (재작업 — 2026-05-22)

| 항목 | 상태 | 비고 |
|:-----|:----:|:-----|
| 로그인 (admin@zenith.kr) | ✅ PASS | "use server" fix(c24c8e5) 적용 후 정상 |
| 오더 목록 페이지 로드 | ✅ PASS | `/ko/orders` 접속 정상 |
| 케이스 A (RETURNED→WAREHOUSED) | ✅ PASS | RETURNED 선택 → WAREHOUSED 확인 (11.5s) |
| 케이스 B (RETURNED→DISPOSED) | ✅ PASS | RETURNED 선택 → DISPOSED 확인 (7.8s) |

## 스크린샷

| 케이스 | 단계 | 파일 |
|:------|:-----|:-----|
| Case A | RETURNED 배지 확인 | `e2e_14_a_01_returned_badge.png` |
| Case A | RETURNED 전이 옵션 (WAREHOUSED/CANCELED/DISPOSED) | `e2e_14_a_02_transition_options.png` |
| Case A | WAREHOUSED 최종 확인 | `e2e_14_a_03_warehoused_final.png` |
| Case B | RETURNED 배지 확인 | `e2e_14_b_01_returned_badge.png` |
| Case B | DISPOSED 최종 확인 | `e2e_14_b_02_disposed_final.png` |

## 버그 수정 내역

| # | 버그 | 수정 |
|:-:|:-----|:-----|
| 1 | `zen_orders`에 `updated_at` 컬럼 누락 → 상태 변경 500 에러 | `20260522000100` migration 추가 |
| 2 | E2E spec 한글 i18n 레이블 불일치 (`반송됨`→`반송`, `입고됨`→`입고완료` 등) | hasText 패턴 전면 수정 |
| 3 | "상태 업데이트" 버튼 viewport 밖 위치 | `scrollIntoViewIfNeeded()` 추가 |
| 4 | 첫 번째 오더가 REGISTERED일 경우 RETURNED 전이 불가 | `findWarehousedRow()` 동적 탐색 |
| 5 | `waitForTimeout(3000)` 블라인드 대기 | `expect().not.toBeVisible()` 타이밍 최적화 |
| 6 | `button.filter()` strict mode violation (취소 버튼 중복) | `.first()` 적용 |
