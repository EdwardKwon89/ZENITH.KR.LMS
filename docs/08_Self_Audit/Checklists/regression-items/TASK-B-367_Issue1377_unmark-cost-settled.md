# [TASK-B-367] 오더정산 되돌리기·정산 후 화물 수정 잠금 (Issue #1377 / TASK-B-367, 에픽 #1364)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-367 / [#1377](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1377) |
| **팀 / 작성일** | Team B / 2026-11-20 |
| **대상 모듈 (231 연동)** | `src/app/actions/finance/ups-actual-cost.ts`, `src/app/actions/operations/orders.ts`, `src/lib/orders/settled-cargo-guard.ts` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-20, Baker** — 청구서관리 ①-4(설계 기준 TASK-B-358 / PR #1373). `unmarkOrderCostSettled`(Admin, user-session client, 청구서 포함 오더 거부 + 조건부 UPDATE)를 추가하고, `updateOrder`에 SETTLED 오더의 중량·치수 수정 차단 가드(`cost_settled_locked`)를 추가했습니다. 상태 전이표 전수 결과 DELIVERED 도달 12개 상태 중 6개가 `editable=true`(RETURNED·CLAIMED·WAREHOUSED(UPS)·HELD·REGISTERED·SCHEDULED)여서 상태 가드만으로는 정산 후 화물 수정이 가능하므로, 소형 헬퍼 + 호출 3줄로 대응했습니다. **DB 마이그레이션 없음**. 신규 `Errors.statement_includes_order` 4로케일(94→95키).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-367-01 | Admin 아님 → 권한 거부 | `permission_denied`, DB 조회 0건 | `tests/unit/finance/task-b367-unmark-cost-settled.test.ts` |
| TC-367-02 | 오더 조회 오류 | `order_not_found` + 원본 error `logger.error` 전달 | 동일 |
| TC-367-03 | `NOT_SETTLED` 오더 | `not_found`, UPDATE 미실행 | 동일 |
| TC-367-04 | 청구서 항목 조회 실패 | `generic{STATEMENT_ITEM_LOOKUP}` — "청구서 없음"으로 오인 금지, UPDATE 미실행 | 동일 |
| TC-367-05 | 청구서 항목 존재(어떤 tier든 `order_id` 기준) | `statement_includes_order`, UPDATE 미실행 | 동일 |
| TC-367-06 | 조건부 UPDATE 오류 | `generic{UNMARK_UPDATE}` | 동일 |
| TC-367-07 | 조건부 UPDATE 영향 행 0건(동시 되돌리기) | `not_found` + `logger.warn` | 동일 |
| TC-367-08 | 예외 발생 | `generic{UNEXPECTED}` + 원본 에러 로깅 | 동일 |
| TC-367-09 | 정상 되돌리기 | `NOT_SETTLED` + `cost_settled_at/by=NULL`, `.eq('cost_settlement_status','SETTLED')` 술어 확인 | 동일 |
| TC-367-10 | 가드 헬퍼: 비SETTLED / 화물 동일 | 중량 변경도 통과 / 통과 | `tests/unit/orders/task-b367-settled-cargo-guard.test.ts` |
| TC-367-11 | 가드 헬퍼: SETTLED + 중량·치수·패키지 수 변경 | `cost_settled_locked` | 동일 |
| TC-367-12 | 실제 `updateOrder` 호출: SETTLED & editable 상태에서 중량/치수 수정 | `cost_settled_locked`, 헤더·패키지 쓰기 전 차단 | 동일 |
| TC-367-13 | 실제 `updateOrder` 호출: 비중량 필드만 수정 / 비SETTLED 중량 수정 | 통과(헤더 업데이트 1회) | 동일 |
| TC-367-14 | 실제 `updateOrder` 호출: DELIVERED SETTLED | 기존 상태 가드 `order_edit_status_invalid` 선차단 | 동일 |
| TC-367-15 | 실DB: 청구서 포함 SETTLED 오더 | `statement_includes_order`, DB 상태 `SETTLED` 유지 | `tests/integration/task-b367-unmark-cost-settled.test.ts` |
| TC-367-16 | 실DB: 다른 tier(`ADMIN_TO_AGENCY`) 항목도 차단 | `statement_includes_order` — `order_id` 기준 전수 | 동일 |
| TC-367-17 | 실DB: `NOT_SETTLED` / 청구서 없는 SETTLED 오더 | `not_found` / 성공 + at/by NULL | 동일 |
| TC-367-18 | 실DB: DRAFT 헤더 삭제 → 항목 CASCADE → unmark | 항목 1→0, 되돌리기 성공 | 동일 |
| TC-367-19 | 4로케일 `Errors` 키 동기화 | 95키 전 로케일 동일·비어있지 않음 | `tests/unit/i18n/errors-key-sync.test.ts` |

**되돌리기 검증 (구현 유효성 — 테스트가 실제로 실패함을 증명)**:

| RST | 되돌린 구현 | 결과 | 복구 |
| :-- | :-- | :-- | :-- |
| RST-1 | `statement_includes_order` 차단 비활성화 | **3 failed / 11 passed** (통합 2 + 단위 1) | 14/14 PASS |
| RST-2 | 조건부 UPDATE 술어 `.eq('cost_settlement_status','SETTLED')` 제거 | **1 failed / 8 passed** | 9/9 PASS |
| RST-3 | unmark 조건부 UPDATE 영향 행 0건 체크 비활성화 | **1 failed / 8 passed** | 9/9 PASS |
| RST-4 | 청구서 항목 조회 오류 체크 비활성화 | **1 failed / 8 passed** | 9/9 PASS |
| RST-5 | `updateOrder` 가드 호출 제거 | **2 failed / 8 passed** | 10/10 PASS |

**회귀 검증**: `npm run test:regression` → **279파일 / 2100케이스 전부 PASS (exit 0)**. `npm run build` → **성공 (exit 0)**. 신규 테스트 31건(단위 19 + 실DB 통합 5 + i18n 7) PASS.
**Ds-11**: `npm run check:ds11` → 허용 목록 밖 신규 미반영 0건, `updateOrder` 문서화로 baseline 126→125축소.
**발견 이슈**: `unmarkOrderCostSettled`의 "청구서 포함 확인 → 조건부 UPDATE" 사이 TOCTOU 경합 → **IMP-200 신규 등록**(IMP-198에 덧붙이지 않음 — Jaison 지시). DB 마이그레이션은 본 Task 범위 밖.
**환경 메모(코드 무관)**: 로컬 Supabase는 여러 워크트리가 공유하므로 다른 작업(예: Mike의 TASK-B-360)이 남긴 `zen_billing_statements` 잔여 행이 B-359 채번 동시성 테스트와 충돌할 수 있음. 본 최종 회귀는 잔여 행 정리 후 깨끗한 DB에서 PASS.
