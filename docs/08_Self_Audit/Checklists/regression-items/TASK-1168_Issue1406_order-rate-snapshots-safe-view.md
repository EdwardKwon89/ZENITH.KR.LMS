# TASK-1168 (Issue #1406) — `zen_order_rate_snapshots_safe` 화이트리스트 안전 뷰 및 `tisa.ts` 전환

- **출처**: Issue #1406 (`DEF-157`), `GHSA-hx46-6xqh-88fc` 후속
- **마이그레이션**: `supabase/migrations/20261122100000_task1168_def157_order_rate_snapshots_safe_view.sql` (1/2 Additive)
- **앱 전환 (Team A)**: `src/app/actions/operations/tisa.ts`, `src/types/supabase.ts`
- **회귀 테스트**:
  - `tests/unit/migrations/task1168-def157-order-rate-snapshots-safe-view.test.ts` (정적 5건 + 실DB 5건)
  - `tests/unit/operations/tisa.test.ts` (`TC-TISA-05` 비관리자 안전 뷰 분기 추가)
- **검증 내용**:
  - `zen_order_rate_snapshots_safe` 화이트리스트 12개 컬럼만 노출 (원가·수수료·내부계산·요율구간 10개 컬럼 제외)
  - `metadata` 내 `platform` 판매·중량·breakdown 키 9개만 투영 (`*Cost*` 키 및 `agency`/`shipper` 키 제외)
  - `anon`/쓰기 권한 차단, 화주/대리점/관리자 역할별 행 범위 검증
  - `tisa.ts` 비관리자 경로 `zen_order_rate_snapshots_safe` 조회 및 관리자 경로 불변 확인
