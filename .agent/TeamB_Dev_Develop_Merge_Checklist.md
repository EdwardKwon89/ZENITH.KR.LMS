# TeamB_Dev → develop 머지 시 반영 확인 사항

> **작성자**: Jaison | **작성일**: 2026-07-28
> **용도**: Aiden이 `TeamB_Dev → develop` 머지를 진행할 때 참고할 체크리스트. JSJung 지시로 작성.

## 1. 테스트 사용자 계정 (Seed 정보)

**확인 결과: 조치 불필요.** `scripts/seed-local.ts`는 `origin/develop`과 `origin/TeamB_Dev` 사이에 **byte-identical**(`diff` 결과 없음, 2026-07-28 확인)입니다. Team B가 이번 세션 내내 사용한 테스트 계정(`agency@zenith.kr`, `admin@zenith.kr`, `manager@zenith.kr`, `sntl_sub1@zenith.kr`, `test_shipper@zenith.kr` 등)과 그 조직(org)·`zen_agency_shippers` 연결 관계는 이미 두 브랜치에 동일하게 존재합니다. 별도 병합·반영 작업 없이 일반 머지로 자연히 유지됩니다.

## 2. AGENCY/MANAGER RBAC·RLS 관련 마이그레이션 (DEF-B-010~020 계열)

이번 세션(및 직전 세션 포함)에서 반복적으로 발견·수정된 **"AGENCY 역할 RLS 커버리지 누락"** 패턴(`SAR_2026-07-27_001` 참고, 누적 11회+ 발생) 관련 마이그레이션 목록입니다. `TeamB_Dev`에 이미 커밋되어 있어 머지 시 파일 자체는 자동으로 따라오지만, **아래 사항을 반드시 확인**해야 합니다.

### 마이그레이션 목록 (시간순)

| 파일 | 결함/이슈 | 내용 |
|:-----|:---------|:-----|
| `20260722000000_def114_agency_warehouse_rls.sql` | DEF-114 | 창고관리 AGENCY RLS |
| `20260722000002_iss664_shxk_logs_rls_expand.sql` | Issue #664 | shxk_api_logs 조회 권한 확대 |
| `20260722000004_iss684_invoices_bucket_agency_rls.sql` | Issue #684 | 인보이스 스토리지 버킷 AGENCY RLS |
| `20260722130000_def117_order_packages_agency_rls_v2.sql` | DEF-117 | zen_order_packages AGENCY SELECT RLS |
| `20260723060000_def120_tracking_configs_agency_rls.sql` | DEF-120 | zen_tracking_configs AGENCY SELECT RLS |
| `20260726000000_defb002_invoices_agency_rls.sql` | DEF-B-002 | zen_invoices AGENCY SELECT RLS |
| `20260726100000_defb003_agency_shippers_grant.sql` | DEF-B-003 | zen_agency_shippers GRANT 보강 |
| `20260726140000_defb010_tracking_configs_agency_update_rls.sql` | DEF-B-010 | zen_tracking_configs AGENCY UPDATE RLS (6번째 재발) |
| `20260727004025_defb014_rate_snapshots_agency_select_rls.sql` | DEF-B-014 | zen_order_rate_snapshots AGENCY SELECT RLS (7번째 재발) |
| `20260727100000_defb015_rate_snapshots_agency_update_insert_rls.sql` | DEF-B-015/016 | zen_order_rate_snapshots AGENCY UPDATE/INSERT RLS |
| `20260727110000_defb019_order_costs_agency_select_rls.sql` | DEF-B-019 | zen_order_costs AGENCY SELECT RLS |
| `20260727120000_defb017_ups_actual_charges_rbac.sql` | DEF-B-017 | `zen_role_permissions`에 MANAGER/AGENCY `/admin/ups-actual-charges` 권한 INSERT |

### 머지 시 필수 확인 사항

1. **로컬 장기 실행 DB로 검증하지 말 것** — 이번 세션에서 반복 확인된 사실: 로컬 공유 Supabase 인스턴스는 여러 세션에 걸쳐 수동 GRANT·드리프트가 누적되어 있어, 실제로는 GRANT/정책이 누락된 상태에서도 로컬 검증만으로는 통과된 것처럼 보이는 사례가 다수 있었음(DEF-B-010/014/019 등). **반드시 `supabase db reset --yes`로 완전히 새로 생성한 DB 기준으로 재검증**할 것.
2. **GRANT-정책 페어링 확인** — RLS 정책만 있고 `GRANT ... TO authenticated`가 없으면 fresh DB에서 조용히 실패함(정책 자체는 정상이라도 base table 권한 자체가 없어 필터링됨). 위 표의 각 마이그레이션이 정책+GRANT를 모두 포함하는지 재확인.
3. **`src/lib/auth/proxy.ts`의 `authGuard()` 화이트리스트**와 **`zen_role_permissions` DB 테이블**은 서로 별개의 게이트(DEF-B-017에서 확인)이므로, 신규 경로(`/admin/ups-actual-charges` 등) 추가 시 양쪽 모두 반영됐는지 확인.
4. 관련 회귀 테스트(`tests/unit/migrations/defb*.test.ts`)가 **자기완결형 fixture**(`beforeAll`/`afterAll`) 기반인지, 하드코딩된 로컬 전용 UUID를 사용하지 않는지 최종 확인 — 이 부분은 이미 Jaison 리뷰 과정에서 대부분 정정 완료됨.

## 참고 문서
- `docs/08_Self_Audit/SAR_reports/SAR_2026-07-27_001_Security_AGENCY_RLS_커버리지_반복누락.md`
- `docs/08_Self_Audit/Checklists/LIVE_PHASE_2_EXECUTE.md` — "🔐 다중 역할 RLS 커버리지" 섹션
