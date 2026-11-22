# TASK-B-375 — Issue #1356: RLS `shipper_agency_select` 제거 설계 의견 (DEF-150 후속)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1356](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1356) (DEF-150 후속, PR #1440 Jaison 지시) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **상태** | 🔔 리뷰 대기 (`status:review`) — Jaison 설계 승인 반영 |
| **브랜치** | `feature/teamb-task-b375-iss1356-rls-shipper-agency-select` (base `origin/TeamB_Dev` 4d01f7327) |
| **채번** | 로컬 `.agent/tasks`·`origin/TeamB_Dev`에 B-373(설계 대기)·B-374(Mike #1349)·B-375 없음 → **TASK-B-375** |

## 1. 배경

JSJung 확정(2026-11-22): **UPS 실비(`zen_ups_actual_charges`)는 `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 추가·수정·조회 가능**하며 AGENCY·화주는 어떤 경로로도 불가합니다.
PR #1440에서 앱 가드(4개 함수)와 폼 렌더를 관리자 전용으로 전환했지만, **DB RLS `shipper_agency_select`(SELECT)** 가 화주·대리점에게 직접 세션 조회를 허용하고 있어 규칙과 불일치합니다. 이 정책 제거는 DB 변경이므로 별도 PR(설계 의견 → 확정 → 구현)로 분리합니다.

## 2. 현행 실측 (로컬 DB, 2026-11-23)

```sql
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename='zen_ups_actual_charges';
```

| 정책 | cmd | 내용 |
|:--|:--|:--|
| `admin_manager_all` | ALL | `zen_profiles.role IN ('ADMIN','MANAGER')` |
| `shipper_agency_select` | SELECT | `zen_orders.shipper_id = p.org_id OR zen_orders.agency_org_id = p.org_id` (화주·대리점 직접 조회 허용) |

- `ZENITH_SUPER_ADMIN`은 어느 정책에도 없음 → PR #1440에서 관리자 가드 후 `createAdminClient()`로 보완.
- `zen_ups_actual_charges`를 참조하는 **뷰·함수는 0건**(`pg_depend` 전수 조회 결과).
- 마이그레이션 참조: `20260720000000_iss589_ups_actual_charges.sql`(테이블·정책), `20260809080000_ups_actual_cost.sql`(FK)뿐.
- 앱에서 이 테이블을 직접 읽는 곳은 `ups-actual-charges.ts`(`getUpsActualCharges`·`getUpsChargeReconciliation`)이며 PR #1440에서 관리자 가드 + admin client로 전환됨.

## 3. 제안

### 3-1. 마이그레이션 (안)

```sql
-- TASK-B-375: JSJung 확정 — UPS 실비는 관리자 전용
DROP POLICY IF EXISTS shipper_agency_select ON public.zen_ups_actual_charges;
```

- 대체 정책 없음. 관리자 정책(`admin_manager_all`)은 유지.
- `ZENITH_SUPER_ADMIN`을 `admin_manager_all`에 포함할지는 **별도 결정**으로 분리(이번 PR은 화주·대리점 SELECT 제거만). 필요 시 `admin_manager_all` 정책 교체를 같은 마이그레이션에 포함할 수 있으나, Jaison 지시 범위(정책 제거)를 넘으므로 설계 의견으로만 남긴다.

### 3-2. 영향

| 대상 | 영향 |
|:--|:--|
| `getUpsActualCharges`/`getUpsChargeReconciliation` | 관리자 가드 + admin client → 영향 없음 |
| `UpsActualAdjustmentForm` | 관리자에게만 렌더(PR #1440) → 영향 없음 |
| 화주·대리점 직접 세션 SELECT | **0건** (의도) |
| `zen_order_costs` 관리자 읽기 | `Admins can manage order costs` 정책에 `ZENITH_SUPER_ADMIN` 포함 확인 — 정책 제거와 무관 |
| 뷰·함수 | 없음 |
| 기존 데이터 | 변경 없음(정책만 제거) |

## 4. 검증 계획 (구현 시)

1. `supabase db reset --yes` 후 마이그레이션 적용·멱등 재실행.
2. **실제 로그인 세션 실DB**:
   - 관리자(SUPER_ADMIN·ADMIN·MANAGER): `zen_ups_actual_charges` SELECT 가능(admin client 경로 4함수 정상)
   - 화주·대리점: `select * from zen_ups_actual_charges` → **0건**, INSERT/UPDATE도 0건(기존에도 정책 없음)
   - `zen_order_costs` 관리자 세션 읽기 유지, 화주·대리점 세션은 기존 정책 범위 그대로(이번 변경과 무관)
3. 되돌리기: 정책 재생성 시 화주·대리점 SELECT가 다시 1건 이상 → 테스트 FAIL 실측.
4. 전체 회귀·빌드 PASS, `zen_error_logs` 신규 ERROR 0건.

## 5. 확정 요청 사항

1. `shipper_agency_select` **제거만** 하는 안(위 3-1) 승인 여부.
2. `admin_manager_all`에 `ZENITH_SUPER_ADMIN` 추가 여부(같은 PR 포함 vs 별도).
3. 화주·대리점이 실비를 **조회**해야 하는 업무 요구가 없는지 최종 확인(PR #1440에서 폼·4함수 차단 완료).

## 6. 구현 (설계 승인 반영)

Jaison 승인(2026-11-23): `shipper_agency_select` 제거만, `admin_manager_all`에 SUPER_ADMIN 추가는 하지 않음.

| # | 파일 | 변경 |
|:--|:--|:--|
| 1 | `supabase/migrations/20261123100000_task_b375_drop_shipper_agency_select_rls.sql` (신규) | `DROP POLICY IF EXISTS shipper_agency_select ON zen_ups_actual_charges` (멱등) + `NOTIFY pgrst` |
| 2 | `tests/integration/task-b375-rls-shipper-agency-select.test.ts` (신규) | 실제 세션·실DB — 화주/대리점/OPERATOR/anon 0건, 정책 재생성 시 복구(되돌리기), ADMIN `zen_order_costs` 읽기, 관리자 3역할 4함수 |
| 3 | `docs/08_Self_Audit/Checklists/regression-items/TASK-B-375_Issue1356_rls-shipper-agency-select.md` (신규) | R-09 회귀 항목 |

### 구현 후 실측 (로컬 DB)

```sql
-- 정책: admin_manager_all만 남음
SELECT policyname, cmd FROM pg_policies WHERE tablename='zen_ups_actual_charges';
-- admin_manager_all | ALL

-- 참조 전수: 함수 본문(prosrc) 0건
SELECT n.nspname||'.'||p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prosrc ILIKE '%zen_ups_actual_charges%';
-- (0 rows)

-- 뷰 의존 0건 / 트리거 0건
```

## 7. [작업 결과]

- 검증: 실DB 세션 6/6 PASS, 되돌리기(정책 재생성) 실측, 전체 회귀 **295 files / 2,261 tests PASS**, build **EXIT=0**, 오류 로그 0건
- 코드(마이그레이션)·테스트 커밋: `44fffd116`
- 문서 커밋: 본 task file
- `git diff --numstat origin/TeamB_Dev...HEAD`:
```text
75	0	.agent/tasks/TASK-B-375_261123_Issue1356_RLS_ShipperAgencySelect_제거_설계.md
11	0	docs/08_Self_Audit/Checklists/regression-items/TASK-B-375_Issue1356_rls-shipper-agency-select.md
11	0	supabase/migrations/20261123100000_task_b375_drop_shipper_agency_select_rls.sql
206	0	tests/integration/task-b375-rls-shipper-agency-select.test.ts
```
- PR: #1441 (draft → ready), **`Refs #1356`**
