# RBAC 관련 데이터 추가/수정 내역 (Team B, ~2026-07-28)

> **작성자**: Jaison | **작성일**: 2026-07-28
> **범위**: 이 세션(2026-07-27~28) 동안 Team B가 처리한 AGENCY/MANAGER 권한 관련 DB 데이터·정책·미들웨어 변경 전체 정리. "AGENCY 역할 RLS 커버리지 누락" 반복 패턴(`SAR_2026-07-27_001`)에 대응하며 누적된 변경들입니다.

## 1. `zen_role_permissions` 테이블 — 실제 데이터 행 추가

| role_code | menu_id | path | is_allowed | 출처 |
|:----------|:--------|:-----|:----------:|:-----|
| `MANAGER` | `ups_actual_charges` | `/admin/ups-actual-charges` | true | DEF-B-017 (`20260727120000_defb017_ups_actual_charges_rbac.sql`) |
| `AGENCY` | `ups_actual_charges` | `/admin/ups-actual-charges` | true | DEF-B-017 (위와 동일 마이그레이션) |

이 테이블은 `src/lib/auth/rbac.ts`의 `checkPermission()`이 사이드바 메뉴 노출 여부 등에 사용하는 DB 기반 권한 테이블입니다. **주의**: 이 테이블에 행이 있어도 아래 4번(미들웨어 화이트리스트)에 경로가 없으면 실제 접근은 막힙니다 — 두 게이트는 서로 독립적입니다(DEF-B-017/이번 세션 daily-billing 건에서 반복 확인됨).

## 2. RLS 정책 신규/변경 (테이블별)

모두 공통 패턴: `agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())` 또는 `billed_org_id = (SELECT org_id ...)` 형태로 AGENCY가 자기 소속 화주(또는 자기 자신에게 청구된) 데이터만 보도록 제한. 기존 ADMIN/화주 본인 정책은 전부 유지(RLS는 OR 결합이라 충돌 없음).

| 테이블 | 신규/변경 정책 | 동작 | 마이그레이션 |
|:-------|:--------------|:-----|:-------------|
| `zen_orders` | "Agency can update shipper orders" | UPDATE | `20260722000000_def114_agency_warehouse_rls.sql` |
| `zen_inventory_history` | "Allow inventory history inserts" | INSERT | 〃 |
| `zen_shxk_api_logs` | "authenticated_select_zen_shxk_api_logs", "agency_insert_zen_shxk_api_logs" | SELECT(전체 인증사용자, JSJung 명시 지시)/INSERT | `20260722000002_iss664_shxk_logs_rls_expand.sql` |
| `zen_invoices` (버킷) | "Allow agency to upload/view ups labels" | INSERT/SELECT | `20260722000004_iss684_invoices_bucket_agency_rls.sql` |
| `zen_order_packages` | "Agency can view shipper order packages" | SELECT | `20260722130000_def117_order_packages_agency_rls_v2.sql` (DEF-117, 6번째 재발 사례) |
| `zen_tracking_configs` | "Agency can view tracking configs for shipper orders" | SELECT | `20260723060000_def120_tracking_configs_agency_rls.sql` (DEF-120) |
| `zen_tracking_configs` | "Agency can update tracking configs for shipper orders" | UPDATE | `20260726140000_defb010_tracking_configs_agency_update_rls.sql` (DEF-B-010, 6번째 재발) |
| `zen_invoices` | "Agency can view invoices for shipper orders" | SELECT | `20260726000000_defb002_invoices_agency_rls.sql` (DEF-B-002) |
| `zen_order_rate_snapshots` | "Agency can view shipper order rate snapshots" | SELECT | `20260727004025_defb014_rate_snapshots_agency_select_rls.sql` (DEF-B-014, 7번째 재발) |
| `zen_order_rate_snapshots` | "Agency can update/insert shipper order rate snapshots" | UPDATE/INSERT | `20260727100000_defb015_rate_snapshots_agency_update_insert_rls.sql` (DEF-B-015/016) |
| `zen_order_costs` | "Agency can view shipper order costs" | SELECT | `20260727110000_defb019_order_costs_agency_select_rls.sql` (DEF-B-019) |
| `zen_invoices` | "Agency can view billed invoices" (`billed_org_id` 기준 — 2단계 인보이스 "매입" 뷰의 기반) | SELECT | `20260728100000_iss917_invoices_billed_org_id_tier.sql` (Issue #917) |

## 3. GRANT 권한 부여 (authenticated 롤)

RLS 정책이 있어도 base table GRANT가 없으면 fresh DB(CI `supabase db reset`)에서 조용히 필터링되어 실패합니다. 이번 세션에서 이 페어링 누락이 반복 원인으로 확인되어 이후 마이그레이션마다 방어적으로 포함:

| 테이블 | 부여 권한 | 마이그레이션 |
|:-------|:---------|:-------------|
| `zen_orders`, `zen_profiles`, `zen_order_packages`, `zen_ups_labels`, `zen_ups_label_errors` | SELECT(+`zen_ups_labels`/`zen_ups_label_errors`는 INSERT/UPDATE도) | `20260722130000_def117...` |
| `zen_tracking_configs` | SELECT | `20260723060000_def120...` |
| `zen_invoices` | SELECT | `20260726000000_defb002...` |
| `zen_agency_shippers` | SELECT | `20260726100000_defb003...` (DEF-B-003) |
| `zen_tracking_configs` | UPDATE | `20260726140000_defb010...` |
| `zen_order_rate_snapshots` | SELECT, INSERT, UPDATE | `20260727004025_defb014...` |
| `zen_order_costs` | SELECT(조건부, `information_schema.role_table_grants` 확인 후 없으면 부여) | `20260727110000_defb019...` |
| `zen_invoices` | SELECT(조건부, 동일 방어 패턴) | `20260728100000_iss917...` |

## 4. 미들웨어 화이트리스트(`src/lib/auth/proxy.ts` `authGuard()`) 변경

`orgType !== 'PLATFORM'`인 사용자(AGENCY/SHIPPER 등)에게 적용되는 `isAllowedPath` 경로 목록 — `zen_role_permissions`(1번)나 페이지 컴포넌트의 `allowedRoles`와는 **완전히 별개의 독립 게이트**입니다. 이 목록에 없으면 컴포넌트가 렌더링되기도 전에 `ORG_ROUTE_MAP` 기본 경로로 리다이렉트됩니다.

| 추가 경로 | 커밋 | 비고 |
|:----------|:-----|:-----|
| `/admin/ups-actual-charges` | `de603e60` (D_Kai, TASK-B-223, DEF-B-017) | 메뉴는 보이는데 실제 진입이 막혀있던 문제 |
| `/finance/daily-billing` | `e3546e04` (Baker, TASK-B-237) | Issue #920 — 3차 반려 후 발견. AGENCY/SHIPPER 스크린샷이 실제로는 다른 페이지(`/agency`, `/orders`)로 리다이렉트된 화면이었음을 Jaison이 직접 확인해 발견 |

**페이지 컴포넌트 `allowedRoles` 변경**(2차 게이트, 위 미들웨어 통과 후 추가로 확인됨):
- `/finance/daily-billing`: `['ZENITH_SUPER_ADMIN','ADMIN','MANAGER','AGENCY']` → `[..., 'AGENCY_SHIPPER', 'SHIPPER']` (TASK-B-237) — 실제 테스트 계정(`agency_shipper@zenith.kr`)의 role 값이 `AGENCY_SHIPPER`임을 확인 후 추가

## 5. 데이터 접근범위 관련 스키마 변경 (RBAC 직접은 아니나 조직 간 데이터 격리의 기반)

`zen_invoices`에 컬럼 추가(`20260728100000_iss917...`):
- `billed_org_id UUID REFERENCES zen_organizations(id)` — 실제 청구 대상 조직(기존엔 `shipper_id` 하나로 고정되어 있었음)
- `invoice_tier TEXT CHECK (IN ('ADMIN_TO_AGENCY','AGENCY_TO_SHIPPER','ADMIN_TO_SHIPPER'))` — admin↔agency↔shipper 2단계 인보이스 구분

위 3번 RLS 정책(4행)이 이 `billed_org_id` 컬럼을 기준으로 AGENCY 조회 범위를 정의합니다.

## 반복 패턴 요약 (참고)

같은 유형("AGENCY용 SELECT/UPDATE RLS 누락")이 이 세션 동안만 **DEF-114/117/120/B-002/B-003/B-010/B-014/B-015/B-016/B-019** 등 최소 10회 이상 반복 발생했습니다. 근본 원인은 신규 테이블 설계 시 ADMIN·화주(직접 소유자) 시나리오만 고려하고 AGENCY(대리 소유자) 시나리오를 빠뜨리는 것 — `docs/08_Self_Audit/Checklists/LIVE_PHASE_2_EXECUTE.md`의 "🔐 다중 역할 RLS 커버리지" 체크리스트(4대 역할 매트릭스 확인 의무화)로 재발 방지 절차가 이미 반영되어 있습니다.
