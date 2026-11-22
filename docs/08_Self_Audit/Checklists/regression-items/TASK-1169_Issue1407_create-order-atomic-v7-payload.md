# [TASK-1169] `create_order_atomic` v7 구버전 payload 호환 검증 (Issue #1407)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-1169 / [#1407](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1407) |
| **팀 / 작성일** | Team A / 2026-11-21 |
| **대상 모듈 (231 연동)** | `supabase/migrations/20261113090100_task_b346_create_order_atomic_v7.sql`, `src/lib/repositories/order.repository.ts` |
| **검증 차원 (231 D1~D9)** | `D2 (계약·호환성), D5 (데이터 정합성)` |

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-1169-01 | v7 마이그레이션의 `recipient_company` payload→컬럼 매핑 | INSERT 컬럼 목록·VALUES 목록 양쪽에 `recipient_company` / `p_payload->>'recipient_company'` 존재 | `tests/integration/task-1169-create-order-atomic-v7-payload.test.ts` | CI (vitest) |
| TC-1169-02 | 함수 시그니처·DEFINER·컬럼 nullable 불변 | `create_order_atomic(jsonb,uuid,uuid)`, `prosecdef=true`, `zen_orders.recipient_company` nullable | 동일 | CI (vitest, DB) |
| TC-1169-03 | (a) 구버전 payload(키 없음) | 주문 생성 성공 + `recipient_company IS NULL` + 패키지·아이템·트래킹·상태이력 각 1행 | 동일 | CI (vitest, DB) |
| TC-1169-04 | (b) 신버전 payload(값) | `recipient_company` 값 그대로 저장 | 동일 | CI (vitest, DB) |
| TC-1169-05 | (c) null / 빈 문자열 | JSON null → NULL, 빈 문자열 → `''` 로 구분 저장 | 동일 | CI (vitest, DB) |
