# TASK-1174: Issue #1470 — zen_invoice_history 접근 제어(RLS·테이블 권한) 정렬 (DEF-161)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1470](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1470) |
| **수행(Worker)** | Aiden (Team A, ZEN_CEO) — 보안 사안의 세부 비공개 유지와 Team A 에이전트 2명 Holding으로 직접 수행(Edward 지시) |
| **검증(Auditor)** | CI + Edward (운영 적용 승인) |
| **발령일** | 2026-11-23 19:55 KST (Edward 지시) |
| **우선순위** | P1 (`priority:p1`, `team:a`, `type:fix`) |
| **상태** | 🔄 구현·로컬 검증 완료 — PR 검토·운영 적용 승인 대기 |
| **브랜치** | `fix/teama-task-1174-invoice-history-rls` (`origin/develop` `2dceb720` 기준) |

> 보안 세부는 저장소에 기재하지 않는다(비공개 Advisory `GHSA-hx46-6xqh-88fc`, Edward에게 직접 보고). 범위·DoD는 Issue #1470 본문이 기준이다.

## [설계 의견]
- 앱은 `zen_invoice_history`에 **INSERT만** 한다(6개 지점, 조회 코드 없음). 모두 로그인 세션 클라이언트이며 `changed_by`는 행위자 본인(`finalizeInvoice`→`user.id`, `createPostFinalizationAdjustment` 호출처→`user.id`).
- 정책: SELECT = 관리자 계열 또는 해당 인보이스를 볼 수 있는 사용자(`zen_invoices` RLS 위임). INSERT = `changed_by = auth.uid()` 이고 관리자 계열 또는 해당 인보이스를 볼 수 있는 사용자. UPDATE·DELETE 정책 없음 + 권한 회수(감사 이력 불변).
- 테이블 권한: PUBLIC·anon 전부 회수, authenticated는 SELECT·INSERT만. service_role 불변. FK `ON DELETE CASCADE`는 영향 없음(RI 액션).
- B-382(MANAGER 정책)와 독립: 관리자 계열 조건을 명시. 컬럼·데이터·앱 코드 변경 없음.

## [작업 결과]
- 마이그레이션: `supabase/migrations/20261122100200_task1174_def161_invoice_history_rls.sql` (롤백 SQL 포함)
- 테스트: `tests/unit/migrations/task1174-def161-invoice-history-rls.test.ts` (정적 4 + 실DB 8 = 12건) — 비로그인·화주·타 화주·대리점·MANAGER·ADMIN·OPERATOR × 조회·삽입·수정·삭제·TRUNCATE
- 로컬 실측(로컬 Supabase):
  | 조건 | 결과 |
  |:--|:--|
  | 신규 정책 + 신규 테스트 | 12 passed |
  | **되돌리기**: 롤백 SQL(RLS 비활성·전체 권한) 후 신규 테스트 | **7 failed / 5 passed** (실패: TC-05·06·07·08·09·10·12, 통과: 정적 4건 + TC-11 — MANAGER·ADMIN 전체 접근은 전후 동일) |
  | 신규 정책 복원 | RLS 활성, ACL `authenticated=ar`, 잔여 픽스처 0건 |
- 참고: 되돌린 상태의 첫 실행이 멈춰 프로세스를 종료하고 재실행했다(원인 미확인, 재실행은 3초에 완료). 복원 후 DB 상태를 직접 확인했다.
- 전체 회귀·CI 결과는 PR에 기재. 운영 적용은 Edward 승인 후 파일 1개 선적용.

## [발견 이슈]
| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-161 | zen_invoice_history 접근 제어 미흡 | High | `.agent/defects/DEF-161_인보이스이력_접근제어_미흡.md` (세부 비공개) |
