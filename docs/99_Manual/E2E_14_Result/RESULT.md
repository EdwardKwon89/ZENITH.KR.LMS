# E2E-14 실행 결과

| 항목 | 상태 | 비고 |
|:-----|:----:|:-----|
| 로그인 (admin@zenith.kr) | ✅ PASS | "use server" fix(c24c8e5) 적용 후 정상 |
| 오더 목록 페이지 로드 | ✅ PASS | `/ko/orders` 접속 정상 |
| 케이스 A (RETURNED→WAREHOUSED) | ❌ SKIP | 시드 데이터 부재 — `tbody tr` 없음 |
| 케이스 B (RETURNED→DISPOSED) | ❌ SKIP | 시드 데이터 부재 |

## 원인

Playwright가 `/ko/orders`에 접속했으나 **DB에 오더 데이터가 없어** 테이블 row가 0건.
E2E 테스트 수행을 위해 `zen_orders` 테이블에 각 상태(PENDING·WAREHOUSED·IN_TRANSIT·DELIVERED)의
테스트용 오더가 사전 시딩되어야 함.

## 선행 조건

- TASK-056 (D_Kai — 오더 시드 데이터 추가) 완료 후 재시도 필요
- 필요한 오더 상태: WAREHOUSED 또는 IN_TRANSIT (→RETURNED 전이 가능한 상태)
