# TASK-B-391 — TASK-B-389 계획서 정정 7건 (M4·M4-b·M5 롤백, B-390 리허설 후속) (#1537)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1537](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1537) · Jaison 배정 Mike(원 담당 Dave → JSJung 지시 재배정) · 검증 Jaison · p2 · 단순 Task(문서 정정 + 로컬 SQL 구문 확인) |
| 브랜치 | `feature/teamb-task-b391-iss1537-plan-fix` (base: `origin/TeamB_Dev` `2857de77f`) |
| 상태 | 🔔 검토 대기 (`status:review`) |
| 대상 문서 | `.agent/tasks/TASK-B-389_261125_Issue1529_RollbackPlan.md` (Dave 소유 — **정정 7건 범위 한정 Jaison 승인**, 7건 밖 미변경) |
| 원칙 | R-14 로컬 한정 · R-21(건수·true/false·exit만) · 임시 SQL은 scratch/(커밋 금지) · 저장소 파일 이동·리다이렉트 금지(B-387 사고 재발 방지) |

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "B-391"        # → 없음 (모든 원격 브랜치 0건 — git ls-tree로 확인)
./scripts/next-task-number.sh B          # → TASK-B-392 출력 (스크립트 기준값) — 이슈 확정번호 B-389는 이미 존재, B-391은 파일 부재 → 이슈 확정번호 TASK-B-391 사용
date                                     # Thu Nov 26 01:32:52 KST 2026
```

## [사전 확인] 정정 1·2·6번 — 마이그레이션 파일 직접 재확인 (지시 준수)

| # | 확인 파일 (실측) | 결과 |
|:-:|:--|:--|
| 1 | `supabase/migrations/20260424130000_zen_finance_pdf_history.sql` L2 | `CREATE TABLE IF NOT EXISTS public.zen_invoice_pdf_history` — **파일명(zen_finance_pdf_history) ≠ 테이블명(zen_invoice_pdf_history)** 확인 → §0·§2-1 표기 정정 근거 |
| 2 | `supabase/migrations/20260428100000_zen_claims.sql` L23~24, L104 | `zen_incident_fees.claim_id`(CASCADE), **`zen_incident_fees.invoice_id` REFERENCES zen_invoices(id) — ON DELETE 없음(NO ACTION)**, `idx_zen_incident_fees_invoice_id` 존재 → §2-1 `zen_claims` 항목은 오류(정정 근거) |
| 2b | `git grep "REFERENCES.*zen_invoices" origin/TeamB_Dev -- supabase/migrations` | **6건**: `zen_order_costs`(finance_core)·`zen_invoice_pdf_history`(CASCADE)·`zen_tax_invoices`(CASCADE)·`zen_incident_fees`(NO ACTION)·`zen_invoice_history`(CASCADE)·`zen_invoice_files`(CASCADE) — §2-1 질의 6개와 **일치** |
| 6 | `20260521000100_imp051_invoice_history.sql` + `20260721010000_add_invoice_history_notes.sql` + `20260426040000_add_invoice_paid_at_trigger.sql` + `20260422020000_zen_finance_core.sql` | history: `invoice_id` CASCADE·`changed_by → auth.users`·`notes` 컬럼 존재 / `fn_set_invoice_paid_at` BEFORE UPDATE 트리거 존재 / `updated_at`는 인보이스에 자동 덮어쓰기 트리거 없음(기본값만) → §1-4 이력 DELETE 조건·§1-5 집계 조건 설계 근거 |

## [정정 7건] (번호별 — 위치는 계획서의 §·줄, diff로 확인 가능)

| # | 위치 | 정정 내용 | 로컬 확인 |
|:-:|:--|:--|:--|
| 1 | §0 근거 목록 · §2-1 자식 참조 | `zen_finance_pdf_history` → **`zen_invoice_pdf_history`** (파일명↔테이블명 표기 병기) | Check1 exit 0 |
| 2 | §2-1 자식 참조 + 근거 | `zen_claims` → **`zen_incident_fees`** + **FK 6개 전수 확인 근거줄 신설** | Check1: 자식 검출 **1** |
| 3 | §3-1 중단 질의 | 대상 조건(run 없음) 내 **누출 확인 질의**로 교체 + 의도 설명 정정(정상 건 오인 제거) | Check2: 정정 **1** / 구 질의 **2** |
| 4 | §2-4 주석 | UNIQUE 충돌 시 **전체 ROLLBACK·복원 0건**(단일 트랜잭션)으로 정정 + 충돌 해소 후 재실행 절차 | Check3와 동일 트랜잭션 구조에서 실행 exit 0 (충돌 시나리오 자체는 미실행 — 구문상 단일 BEGIN/COMMIT 확인) |
| 5 | §3-5 `restored` | 백업과 **일치하는 건수**(status·at·by) 조건 부여 → 과다 집계 제거 | Check4-b: 정정 **1** / 구 join **3** |
| 6 | §1-4 이력 DELETE | **실제 복원된 행**(현재 상태=백업 상태)의 이력에 한정하는 EXISTS 조건 추가 | Check3: 이력 삭제 **14** · 잔존 **1**(변경 건) |
| 7 | §1-5 `restored` | 상태·값(paid_amount·updated_at) 일치 조건 부여 | Check4-a: 정정 **14** / same_status **14** / 구 join **15** |

- **Dave 보완 3건(M5 updated_at·M4 이력 PAID 제외·paid_at 한계) 미변경**, 7건 밖 문장·SQL 미변경 — diff는 **1파일 +21/−11**로 정정 범위만 포함.

## [로컬 구문·동작 확인] (scratch/ 임시 SQL · 값은 저장소에 기재하지 않음)

| Check | 내용 | 결과 |
|:-:|:--|:--|
| 1 | 정정 §2-1 자식 참조 질의 실행 + `zen_incident_fees` FK 행 생성 | **exit 0(오류 0)** · 질의 결과 order_costs 0·**incident_fees 1**·tax 0·pdf 0·files 0·history 0 · 대상 인보이스의 자식 **검출 1** |
| 2 | 정정 §3-1 누출 질의(**실제 `zen_ups_settlement_runs` 사용** — 아래 M5 참고) + 구 질의 대조 | **exit 0** · 정정 **leak=1**(정상 비대상 건 미포함) · 구 질의 **2**(정상 건까지 오인 — 결함 재현) |
| 3 | §1-4 복원(백업 15건·1건 상태변경) | **exit 0** · 복원 상태 일치 **14** · 이력 잔존 **1**(변경 건) · 이력 삭제 **14**(15−1) |
| 4 | §1-5·§3-5 정정 집계 | §1-5 정정 **14** · same_status **14** · 구 join **15** / §3-5 정정 **1** · 구 join **3** |
| 5 | `supabase db reset` 원상복구 + 시작 상태 복원 | reset **exit 0** → 이력 **316** → Dave PR-1(M1~M3) 3파일 `git show` 재적용 **3/3 exit 0** → 이력 **319**(시작 상태 동일) · 미적용 **0** · runs 테이블 **3** · `git status` **1건(계획서 정정분만)** |

- **M5 참고(지시 준수)**: 이슈 기재의 "M1 미구현"과 달리 로컬에는 B-381 PR-1(#1536, OPEN)의 M1~M3이 적용돼 있어 **대체 구조가 아닌 실제 `zen_ups_settlement_runs` 테이블로 확인**했다. 다만 B-381 전체 구현은 미병합이므로 **"M5는 부분 확인, B-381 구현 후 재실측 필요"**로 기재한다(재리허설 전체 왕복은 이 Task 범위 밖 — 후속은 Baker).
- **repair 한계(기록)**: `supabase migration repair`는 `supabase/migrations/<version>_*.sql` 파일 존재가 필요 → PR-1 파일이 제 브랜치에 없어 glob 실패. 임시 파일 생성 대신 `schema_migrations`에 **직접 INSERT(version·statements·name)**로 동일 결과 구현(이력 3행, ON CONFLICT DO NOTHING) — 저장소 파일 생성·이동 **0건**.

## [DoD]

- [x] 1·2·6번 스키마를 마이그레이션 파일에서 직접 재확인하고 확인한 파일명 기재 (위 사전 확인 표)
- [x] 정정 7건 각각 반영(번호별 소제목) · Dave 보완 3건·7건 밖 문장 미변경 확인(diff 1파일 +21/−11)
- [x] 로컬 구문·동작 확인 1~4 결과(건수·exit) 기재 · M5 "부분 확인" 명시
- [x] `db reset` 원상복구(이력 319·미적용 0·시작 상태 동일) + `git status` 1건(정정분만)
- [x] 추가된 줄에 절대경로·계정·운영 식별자·운영 값 없음 (scratch/ 커밋 제외)
- [x] 완료 절차 R-17 준수(문서 PR만 · `gh pr checks` 출력 인용 · 병합은 Jaison)

## [작업 결과]

- 코드(문서 정정) 커밋: `acc528907f1406b159a1be42c7037a4e0d7ecdc3`

### PR·보완 기록
- **PR #1538** (`Refs #1529` · `Refs #1537`, base `TeamB_Dev`, 병합은 Jaison)
- 보완 반영 커밋(상태 행·PR/해시 기재 + §3-1 설명 정정): `<PLACEHOLDER>`

### 착수 절차 실측 (R-17)
```bash
① 전용 워크트리 확인 (git rev-parse --show-toplevel = mike 워크트리) · init 스크립트 미재실행(중첩 방지)
② git fetch origin · TeamB_Dev 최근3 = #1534(Baker 리허설)·#1535·#1519 → #1531·#1530 병합도 확인
③ next-task-number → TASK-B-392 (391 파일 부재를 git ls-tree로 전 브랜치 확인 → 이슈 확정번호 391 사용)
④ 브랜치 feature/teamb-task-b391-iss1537-plan-fix (origin/TeamB_Dev 분기) · 라벨 status:in-progress
```
