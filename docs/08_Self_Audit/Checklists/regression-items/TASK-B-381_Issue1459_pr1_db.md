# [TASK-B-381 PR-1] UPS 정산 run DB — M1·M2·M3 (Issue #1459)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-381 PR-1 / [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) |
| **팀 / 작성일** | Team B / 2026-11-26 |
| **대상 모듈 (231 연동)** | `supabase/migrations/20261126090000_task_b381_ups_settlement_run.sql`, `…091000…billing_items_amounts.sql`, `…092000…finalize_ups_settlement_run.sql` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-26, Dave** — UPS 정산 run 저장소(3테이블·tier RLS·불변 트리거), `billing_items_amounts` run 전용 전환, 정산마감 RPC를 추가했습니다. **앱 코드·운영 데이터 변경 없음.** 운영 적용은 Aiden(Edward 승인, R-14).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-381-01 | RPC 성공 — run 양 tier·charges·오더 SETTLED | version 1, amounts 2행, charges 3행 | `tests/integration/task-b381-settlement-run-db.test.ts` |
| TC-381-02 | 멱등 — 같은 입력 2회 | run 1행(version 증가 없음) | 동일 |
| TC-381-03 | 불변 트리거 — UPDATE/DELETE | 예외(`ups_settlement_run_immutable`) | 동일 |
| TC-381-04 | RLS — 관리자/대리점(2 tier)/화주(SHIPPER만)/anon | tier 가시성 표 일치 | 동일 |
| TC-381-05 | MANAGER 양성 | 정산 성공 | 동일 |
| TC-381-06 | 비관리자 RPC 거부 | `permission_denied` | 동일 |
| TC-381-07 | 비취소 인보이스 방어 | `ups_invoice_exists` | 동일 |
| TC-381-08 | run 전용 금액 — 항목 상세·조정 분리, run 없음 | line 126·조정 -2·항목 2 / `settlement_run_missing` | 동일 |
| TC-381-09 | RPC 원자성 — 잘못된 payload | `invalid_run_payload`, run 0·상태 불변 | 동일 |
| TC-381-10 | 기존 청구서 회귀 — run 기반 금액·통화 가드 제거·Excel | 기존 단언 유지·통화 가드 제거 후 성공 | `tests/integration/task-b360-billing-statements.test.ts`, `task-b360-excel-export.test.ts` |
| TC-381-11 | 항목 테이블 컬럼 증가 | 13컬럼 | `tests/unit/migrations/taskb359-billing-statement-db.test.ts` |
| TC-381-12 | 재마감 멱등 — unmark 후 같은 입력 | SETTLED 복구, run/version 유지 / 다른 입력 version 2 | `task-b381-settlement-run-db.test.ts` |
| TC-381-13 | RLS 음성 — 비소속 대리점·타 조직 화주 | 0건 | 동일 |
| TC-381-14 | 오류 코드 — not_ups_order·already_settled·paid_invoice_exists | 각 오류 반환 | 동일 |
| TC-381-15 | RPC 보안 카탈로그 — anon·DEFINER·search_path | anon/PUBLIC f, authenticated t, prosecdef t | 동일 |
| TC-381-16 | GRANT 회수 되돌리기 | 호출 실패 후 원복 | 동일 |

**되돌리기 검증**

| RST | 되돌린 구현 | 결과 | 복구 |
| :-- | :-- | :-- | :-- |
| RST-1 | 불변 트리거 비활성화 | TC-381-03 **1 failed** | 트리거 재활성 후 9/9 PASS |
| RST-2 | M1~M3 롤백 블록 실행 | 객체 0 확인 · M2 복원: amounts 7·items 11·두 함수 존재 | 재적용 후 10·13, 14/14 PASS |
| RST-3 | authenticated EXECUTE 회수 | RPC 호출 실패 | GRANT 재적용 후 PASS |

**영향 테스트 갱신 (M2 run 전용 전환)**
- `task-b360-billing-statements.test.ts` — fixture에 run을 추가, 금액 원천을 run으로 전환(28/28 PASS)
- `task-b360-excel-export.test.ts` — fixture에 run 추가(19/19 PASS)
- `taskb359-billing-statement-db.test.ts` — 항목 컬럼 수 11→13
- 위 3파일 외 폴백 의존 테스트 없음(전체 회귀 PASS)

**회귀**: `npm run test:regression` — 306 passed · 2 skipped / 2,345 passed · 30 skipped. `npm run build` SUCCESS. `check:ds11`·`check:lrtm`·`check:doc-links` 통과.
