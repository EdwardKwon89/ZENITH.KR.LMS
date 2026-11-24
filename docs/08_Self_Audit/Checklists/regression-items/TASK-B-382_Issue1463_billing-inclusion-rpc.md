# [TASK-B-382] 청구서 포함 확인 RPC·정산 해제 fail-closed (Issue #1463 / TASK-B-382)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-382 / [#1463](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1463) |
| **팀 / 작성일** | Team B / 2026-11-24 |
| **대상 모듈** | `supabase/migrations/20261124100000_task_b382_billing_inclusion_rpc.sql`, `src/app/actions/finance/ups-actual-cost.ts` |
| **설계 기준** | v5.2 확정(B안 = 정책 0개) — M2 함수 + `unmarkOrderCostSettled` RPC 호출 교체, 산출물 2개 |

정책 신설 없이 `public.zen_billing_statement_order_included(p_order_id uuid)`(SECURITY DEFINER, boolean 전용)로 포함 여부만 제공하고, 앱은 RPC 오류·비정상 반환 시 정산 해제를 차단합니다. ADMIN·SUPER_ADMIN의 기존 동작은 불변입니다. #1475 병합 전/후 양쪽에서 MANAGER의 포함 오더 해제가 거부되어야 합니다.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-382-01 | 포함/미포함 오더 RPC 호출 | `true` / `false` | `tests/unit/db/taskb382-billing-inclusion-rpc.test.ts` |
| TC-382-02 | 허용 역할 3종(ADMIN·MANAGER·ZENITH_SUPER_ADMIN) | 포함 `true`, 미포함 `false` | 동일 |
| TC-382-03 | DRAFT·ISSUED 헤더 포함 오더 | 상태 무관 `true` | 동일 |
| TC-382-04 | 비허용 역할(AGENCY·SHIPPER) 직접 호출 | 예외 거부(`false` 반환 금지) | 동일 |
| TC-382-05 | anon 직접 호출 | 실행 권한 없음으로 거부 | 동일 |
| TC-382-06 | 함수 시그니처·보안 속성 | `boolean` 하나만 반환, `SECURITY DEFINER`, `search_path = public` | 동일 |
| TC-382-07 | EXECUTE 권한 | `authenticated`만 보유, `anon` 미보유 | 동일 |
| TC-382-08 | 롤백 SQL | `DROP FUNCTION IF EXISTS` 유효, 트랜잭션 롤백으로 원복 | 동일 |
| TC-382-09 | 앱: RPC 오류 / boolean 아님 반환 | `generic{STATEMENT_ITEM_LOOKUP}`, UPDATE 미실행(fail-closed) | `tests/unit/finance/task-b367-unmark-cost-settled.test.ts` |
| TC-382-10 | 앱: 포함 `true` / 미포함 `false` | `statement_includes_order` / 해제 성공(세션 클라이언트 RPC 호출) | 동일 |
| TC-382-11 | 앱: ADMIN·MANAGER·ZENITH_SUPER_ADMIN | 포함 오더 거부 / 미포함 오더 허용(동작 불변) | 동일 |
| TC-382-12 | 앱: 청구서 항목 테이블 직접 조회 없음 | 직접 SELECT 0건 — RPC만 사용 | 동일(mock이 직접 조회 시 예외) |
| TC-382-13 | 실DB 앱 경로: 포함 오더 / DRAFT 헤더 삭제 후 | 거부 / 해제 성공 | `tests/integration/task-b367-unmark-cost-settled.test.ts` |
| TC-382-14 | #1475 적용 전/후 MANAGER 포함 오더 해제 | 양쪽 모두 거부 | #1475 병합 후 재확인 |

**되돌리기 기준**: 앱 RPC 호출 제거 → M2 함수 제거(`DROP FUNCTION IF EXISTS public.zen_billing_statement_order_included(uuid);`) 순서. 정책 롤백은 해당 없음(정책 신설 0개).
**배포 순서**: M2(DB) → 스키마 reload → M3(앱). #1475는 M2 함수 적용 후 병합합니다.
**Ds-11(R-12)**: `Ds_11_04_Finance_Settlement.md` §4.2 RPC 항목, `Ds_11_11B_UPS_Agency_Actuals.md` `unmarkOrderCostSettled` 항목에 반영했습니다.
