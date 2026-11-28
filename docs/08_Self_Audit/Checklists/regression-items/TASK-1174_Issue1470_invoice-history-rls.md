# TASK-1174 (Issue #1470) — `zen_invoice_history` 접근 제어 정렬 (DEF-161)

- **출처**: Issue #1470 (`DEF-161`), TASK-B-382 설계 §5 관찰 후속
- **마이그레이션**: `supabase/migrations/20261122100200_task1174_def161_invoice_history_rls.sql` (RLS 활성화·권한 정리·정책 2개, 롤백 SQL 포함)
- **회귀 테스트**: `tests/unit/migrations/task1174-def161-invoice-history-rls.test.ts` (정적 4건 + 실DB 8건, CI 실행)
- **검증 내용**:
  - TC-1174-01~04: RLS 활성화, 권한 회수·부여, 정책 2개(UPDATE·DELETE 정책 없음, `changed_by = auth.uid()`), 롤백 SQL
  - TC-1174-05: 테이블 ACL — anon 권한 없음, authenticated는 SELECT·INSERT만, RLS 활성
  - TC-1174-06: 비로그인 조회·삽입·수정·삭제 거부
  - TC-1174-07·10: 화주·대리점은 볼 수 있는 인보이스의 이력만 조회·삽입, 타 화주 인보이스는 거부
  - TC-1174-08: `changed_by` 위조 삽입 거부(모든 역할)
  - TC-1174-09: 수정·삭제·TRUNCATE 전 역할 거부(감사 이력 불변)
  - TC-1174-11·12: MANAGER·ADMIN 전체 접근, OPERATOR 거부
- **되돌리기 실측**: 롤백 SQL 적용 시 7 failed / 5 passed
