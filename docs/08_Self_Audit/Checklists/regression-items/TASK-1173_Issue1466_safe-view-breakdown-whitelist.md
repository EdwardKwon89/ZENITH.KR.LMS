# TASK-1173 (Issue #1466) — `zen_order_rate_snapshots_safe` breakdown 화이트리스트화 (DEF-160)

- **출처**: Issue #1466 (`DEF-160`), DEF-157 / TASK-1168 후속
- **마이그레이션**: `supabase/migrations/20261122100100_task1173_def157_safe_view_breakdown_whitelist.sql` (뷰 정의 교체, 롤백 SQL 포함)
- **회귀 테스트**: `tests/unit/migrations/task1173-def157-safe-view-breakdown-whitelist.test.ts` (정적 3건 + 실DB 8건, CI 실행)
- **검증 내용**:
  - TC-1173-01~03: breakdown 통째 복사 제거, 허용 키만 나열, 권한 재부여·롤백 SQL 수록
  - TC-1173-04: 화주·대리점·관리자 세션에서 metadata 어디에도 원가 계열 키 없음(운영 형태 시료)
  - TC-1173-05·06: breakdown 및 중첩 객체(product·zone·otherChargeItems) 하위 키가 허용 목록과 정확히 일치
  - TC-1173-07·08: 판매·중량·레거시 판매 키 값 보존, breakdown 없는 스냅샷은 키 미생성
  - TC-1173-09: 뷰 컬럼 목록·권한 불변
- **되돌리기 실측**: TASK-1168 뷰 정의로 복원 시 5 failed / 6 passed
