# TASK-1173: Issue #1466 — DEF-157 마무리: 안전 뷰 breakdown 화이트리스트화 (DEF-160)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1466](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1466) |
| **수행(Worker)** | Aiden (Team A, ZEN_CEO) — 보안 사안의 세부 비공개 유지와 Team A 에이전트 2명 Holding으로 직접 수행(Edward 지시) |
| **검증(Auditor)** | Edward (운영 적용 승인) · CI |
| **발령일** | 2026-11-23 19:14 KST (Edward 지시) |
| **우선순위** | P1 (`priority:p1`, `team:a`, `type:fix`) |
| **상태** | ✅ 완료 — PR #1468 병합(develop `2dceb720`), 운영 DB 적용·검증 완료(2026-11-23 19:26 KST) |
| **브랜치** | `fix/teama-task-1173-safe-view-breakdown` (`origin/develop` `ba204c52` 기준) |

> 보안 세부는 저장소에 기재하지 않는다(비공개 Advisory `GHSA-hx46-6xqh-88fc`, Edward에게 직접 보고). 범위·DoD는 Issue #1466 본문이 기준이다.

## [설계 의견]
- `zen_order_rate_snapshots_safe`(TASK-1168)가 `metadata.platform.breakdown`을 하위 키 필터 없이 복사 → **허용 키 목록으로만 구성**하도록 뷰 정의를 교체(`CREATE OR REPLACE VIEW`, 컬럼·타입·권한 불변).
- 허용 키: 판매 키 4종, 중량 키 4종, 레거시 판매 키 4종, `product`·`zone`·`otherChargeItems`의 허용 하위 키. 소비 경로(`UpsOrderBreakdownCard` 등)가 읽는 키를 전수 확인해 보존.
- 앱 코드·기반 테이블 정책 변경 없음(DEF-157 잔여는 별도). 운영 적용은 **파일 단위 선적용**, Edward 승인 후.

## [작업 결과]
- 마이그레이션: `supabase/migrations/20261122100100_task1173_def157_safe_view_breakdown_whitelist.sql` (롤백 SQL 포함)
- 테스트: `tests/unit/migrations/task1173-def157-safe-view-breakdown-whitelist.test.ts` (정적 3 + 실DB 8 = 11건), 시료는 **운영 형태**(원가 계열 키·내부 ID·중첩 객체 내부 필드 포함)
- 로컬 실측(로컬 Supabase, 19:13 KST):
  | 조건 | 결과 |
  |:--|:--|
  | 신규 뷰 + 신규 테스트 | 11 passed |
  | **되돌리기**: TASK-1168 뷰 정의로 복원 후 신규 테스트 | **5 failed / 6 passed** (TC-1173-04 화주·대리점·관리자, 05, 06) |
  | 신규 뷰 복원 + 신규·TASK-1168 테스트 | 21 passed (11 + 10) |
- 전체 회귀·CI 결과는 PR에 기재.

## [발견 이슈]
| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-160 | 안전 뷰 breakdown 필드 필터 누락 | High | `.agent/defects/DEF-160_안전뷰_breakdown_필드_필터누락.md` (세부 비공개) |
