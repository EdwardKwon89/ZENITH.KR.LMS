# TASK-B-390 — Issue #1532: B-381 데이터 작업(M4·M4-b·M5) 롤백 로컬 리허설 (EPIC #1364, TASK-B-389 후속)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1532](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1532) · 담당 Baker(Team B) · 검증 Jaison · p2 · 단순 Task |
| 브랜치 | `feature/teamb-task-b390-iss1532-m4-m5-rehearsal` (base `origin/TeamB_Dev` `3ea1726de`) |
| 상태 | 🔔 검토 대기 (`status:review`) |
| 기준 문서 | 병합본 `.agent/tasks/TASK-B-389_261125_Issue1529_RollbackPlan.md` (PR #1530 병합 커밋 `0b9ae42fb96f9ec2edd54d4cdf72fb76043792e0`) |
| 범위 | **로컬 리허설만** — 운영 DB 접속 0(R-14), 코드·마이그레이션·테스트 변경 0, 계획서 SQL은 그대로 사용(수정 금지) |
| 공개 저장소 | 건수·true/false·통과/실패·명령 형태만 기재(R-21) — 계정·값·절대경로·운영 식별자 0 |

## 채번·선행 확인

- `ls .agent/tasks | grep "TASK-B-390"` → **없음**. `./scripts/next-task-number.sh B` → `TASK-B-391`(미사용). 이슈 #1532 제목이 `TASK-B-390`을 점유 → **이슈 지정 번호 사용**.
- PR #1530 병합 확인(병합 커밋 위 표) + 병합본 계획서에 보완 3건 반영 확인.
- Jaison 착수 가능 코멘트 `7165007890` 확인 후 착수.
- 라벨 `status:open` → `status:in-progress` 전환 완료(완료 보고 시 `status:review`까지만).

## 준비·명령 형태

- `./scripts/agent-worktree-init.sh baker` → 격리 worktree 재사용; 최신 `origin/TeamB_Dev`에서 분기, PR 전 `git log origin/TeamB_Dev..HEAD` **0건**.
- `./scripts/check-db-freshness.sh` → **OK(pending 마이그레이션 0)**.
- `supabase db reset --local --yes` → exit 0; `npx tsx scripts/seed-local.ts` → exit 0. 기준선 건수: 오더 **15** · 인보이스 **16** · 조직 **22** · 프로필 **14**.
- 임시 SQL은 전부 `scratch/b390/`(gitignore, 커밋 0). 저장소 파일 이동·리다이렉트 덮어쓰기 **0건**.
- 다중문장 실행 형태: `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scratch/b390/<file>.sql` (`supabase db query -f`는 단일 Prepared statement만 허용해 다중문장 거부). 단건 조회는 `supabase db query --local -o csv "<SQL>"`.

## [작업 결과]

### 실측 1 — 대상 상태 만들기 — PASS

`scratch/b390/00_setup.sql` 1회 실행(exit 0, 픽스처 3종). 계획서 대상별 건수:

| 대상/중단 조건 | 건수 |
|:--|--:|
| M4 대상(UPS 연결 비취소 인보이스) | 15 |
| M4 중단1(PAID 존재) | 1 |
| M4-b 대상(출처 오더 없는 비취소 인보이스) | 2 |
| M4-b 자식 참조 위반(이력) | 1 |
| M5 대상(SETTLED·run 없음·항목 없음, 대체 구조) | 2 |
| M5 중단(SETTLED + 청구항목 포함) | 1 |
| 청구항목 포함 오더의 M5 대상 유입 | 0 |
| PARTIAL + paid_at 보유 인보이스 | 1 |

### 실측 2 — M4 — PASS(중단 조건 검출 포함)

| 단계 | 명령(형태) | 결과 |
|:--|:--|:--|
| §1-1 사전 조회·중단 | `psql -f - < scratch/b390/01_precheck.sql` | PAID **1건 검출** → 계획서 중단 조건에 따라 **실행 보류**하고 보고(위반 픽스처 제거 후 진행) |
| §1-2 백업 | `CREATE TABLE rollback_bak.b381_m4_*` | target **15** / invoice_bak **15** |
| §1-3 실행 | `psql -f - < scratch/b390/03_execute.sql` | `UPDATE 15` + 이력 `INSERT 0 15`, exit 0 |
| §1-5 검증 | 계획서 §1-5 그대로 | CANCELED **15** · 이력 `B381_M4` **15** · PARTIAL+paid_at **0** |
| 이력 식별자 | `notes`/`changed_by` 조회 | `B381_M4` **15행**, `changed_by`는 로컬 프로필 1건(값 미기재) — 실행 시 `:approved_admin_id` 자리에 주입한 동일 식별자 |

### 실측 3 — M4-b — PASS(자식 참조 위반 중단 확인)

| 단계 | 명령(형태) | 결과 |
|:--|:--|:--|
| §2-1 사전 조회 | `psql -f - < scratch/b390/01_precheck.sql` | 대상 **2건**, 자식 참조 위반 **history=1건 검출** → 계획서 중단 조건에 따라 **§2-3 실행 안 함** 후 보고 |
| §2-1 스키마 오류 | 동일 질의 | `zen_claims.invoice_id` 부재 · `zen_finance_pdf_history` 부재로 **질의 실패** → 로컬 유효 컬럼만으로 재조회(§수정 필요 목록 1·2) |
| §2-2 백업 | `CREATE TABLE rollback_bak.b381_m4b_*` | target **2** / invoice_bak **2** |
| §2-3 실행 | `psql -f - < scratch/b390/03_execute.sql` | `DELETE 2`, exit 0 |
| §2-5 검증 | 계획서 §2-5 그대로 | 실행 직후 restored **0** · `content_matches` **true** · dup_invoice_no **0** |

### 실측 4 — M5 — **부분 실측** (B-381 M1 대체 구조 사용 — B-381 구현 후 재실측 필요)

- B-381 M1 `zen_ups_settlement_runs` **미구현** → `scratch/`에서만 `order_id` 컬럼 최소 테이블 생성, **커밋 0건**. 아래 결과는 대체 구조 기반 **부분 실측**이며, B-381 구현 후 재실측 필요.

| 단계 | 명령(형태) | 결과 |
|:--|:--|:--|
| §3-1 사전 조회 | `psql -f - < scratch/b390/01b_precheck_rest.sql` | 대상 **2** · SETTLED+항목 포함 **1** · 대상 유입 leakage **0** |
| §3-2 백업 | `CREATE TABLE rollback_bak.b381_m5_*` | target **3** / order_bak **3** (충돌용 1건 추가) |
| §3-3 실행 | `psql -f - < scratch/b390/03_execute.sql` | `UPDATE 3`, exit 0 · reset_targets **3** · `settled_without_required_fields` **0** |
| 청구항목 제외 확인 | §3-1 교차 질의 | 포함 오더 1건의 M5 대상 유입 **0** |
| 신규 run 충돌 | `INSERT INTO zen_ups_settlement_runs` | 대상 1건에 충돌 생성 → 복원 시 **건너뜀** |
| 신규 청구항목 충돌 | `INSERT INTO zen_billing_statement_items` | 대상 1건에 충돌 생성 → 복원 시 **건너뜀** |
| 재현 제약 | 충돌 픽스처 생성 시 | `trg_billing_statement_items_guard`가 NOT_SETTLED 오더 항목 삽입을 거부(`item_order_not_eligible`) → **로컬 리허설에서만 트리거 비활성화 후 즉시 복원**. 운영 경로 문제 아님 |

### 실측 5 — 역순 복원(M5 → M4-b → M4) — PASS(부분 복원 포함)

| 단계 | 명령(형태) | 결과 |
|:--|:--|:--|
| M5 §3-4 복원 | `psql -f - < scratch/b390/05a_restore_m5.sql` | `UPDATE 1`(충돌 2건 건너뜀), exit 0 |
| M5 §3-5 검증 | 계획서 §3-5 그대로 | `restored` **3** · `content_matches` **false** · `settled_without_required_fields` **0** |
| M5 실복원 건수 | 상태 일치 건수 | **1/3** (차단 2건은 NOT_SETTLED 유지) |
| M4-b 1차 복원 | `psql -f - < scratch/b390/05b_restore_m4b_conflict.sql` | `invoice_no` UNIQUE 충돌 → `ROLLBACK`, 복원 **0건**(예상 충돌 케이스) |
| M4-b 2차 복원 | 충돌 픽스처 제거 후 `psql -f - < scratch/b390/05c_restore_m4b_after_conflict.sql` | `INSERT 0 2` · `restored` **2** · `content_matches` **true** · dup **0** |
| M4 복원 | `psql -f - < scratch/b390/05d_restore_m4.sql` | `UPDATE 14` + 이력 `DELETE 15`, exit 0 (`:approved_admin_id` → 로컬 프로필 1건 주입) |
| M4 §1-5 검증 | 계획서 §1-5 그대로 | `restored` **15** · `same_status` **14** · 이력 `B381_M4` **0** · `status_matches` **false** → **부분 복원 확인** |
| 최종 대조 | `psql -f - < scratch/b390/06_final_compare.sql` | M4 백업 15 / 현행 15 / 상태일치 14 · M4-b 2/2/2 · M5 3/1/1(updated_at 일치 **0**) |

### 실측 6 — 복원 불가·부분 복원(계획서 §4) 항목별 확인

| §4 항목 | 실측 결과 |
|:--|:--|
| M4: M4 이후 상태 변경 인보이스 | 1건 제외 → `same_status` **14/15**, `status_matches` **false** — **부분 복원 동작 확인** |
| M4: `B381_M4` 이력 소실 | 복원 전 **15** → 후 **0** — **감사 이력 소실 확인** |
| M4: `paid_at` 미복원 | 백업 보유 **1** → 현행 보유 **0** · 불일치 **1** — **보완 문구와 일치** |
| M4-b: `invoice_no` 중복 | 전체 트랜잭션 `ROLLBACK`, 복원 **0** — 계획서 주석("부분 복원만 가능")과 **불일치**(수정 필요 목록 4) |
| M5: 신규 run·청구항목 충돌 | 2건 건너뜀, 실복원 **1/3**, `content_matches` **false** — **건너뜀 동작 확인** |
| M5: `updated_at` 덮어쓰기 | 복원 1건의 `updated_at` 일치 **0** — **보완 문구와 일치** |
| M5: 실행 후 신규 데이터 잔존 | 복원 후 run **1** · 청구항목 **2** 잔존(백업 밖 신규 데이터는 삭제되지 않음) |

### 실측 7 — 원상 복구 — PASS

- `supabase db reset --local --yes` → exit 0; `./scripts/check-db-freshness.sh` → **OK(pending 0)**.
- `git status -sb` → **변경 0건**(`scratch/`는 gitignore).
- 코드·마이그레이션·테스트·계획서 변경 **0건** — 본 PR은 task file **1개**뿐.

### 계획서 수정 필요 SQL/문구 목록 (계획서는 수정하지 않고 Jaison에게 보고)

1. **§2-1** `zen_claims.invoice_id` 컬럼 부재 — 질의 전체 실패. 로컬 스키마는 `order_id`만 보유.
2. **§2-1** `zen_finance_pdf_history` 테이블 부재(마이그레이션에도 미존재) — 질의 전체 실패.
3. **§3-1 중단 질의** — 대상은 `NOT EXISTS(청구항목)`인데 중단 질의는 `EXISTS(청구항목)` 건수를 셈 → 대상 누출이 아니라 **정상 비대상 건을 카운트**. 리허설에서 1건 검출되어 문구대로면 실행 중단. 누출 확인은 별도 교차 질의 필요(리허설 누출 **0**).
4. **§2-4 주석** — `invoice_no` 충돌 시 "부분 복원만 가능"이라 서술하나 실측은 `ROLLBACK`으로 **복원 0건**. 문구 정정 필요.
5. **§3-5 `restored`** — 백업 id join 건수라 차단 2건을 포함해 **3**으로 집계(실복원 **1**). 실제 복원 건수 조건 명시 필요.
6. **보완 3건(M5 `updated_at`·M4 이력 PAID 필터·`paid_at`)** — 실측이 문구와 일치, 수정 불필요(실측값만 보고).

### 사고·복구 (사실 기재)

1. 최초 M4 충돌 픽스처의 변경 상태를 백업 상태와 같은 값으로 만들어 `status_matches=true`가 나옴 → 픽스처를 백업과 다른 상태(`PARTIAL`)로 정정하고 **DB reset부터 전 단계 재실행**. 최종 결과는 재실행분.
2. M5 청구항목 충돌 픽스처가 DB 가드 트리거에 막힘 → 로컬 한정 트리거 비활성화/즉시 복원으로 우회(저장소 변경 0).
3. M4-b 중복 `invoice_no` 충돌은 예상 케이스이나 계획서 문구와 다른 동작 → 수정 목록 4에 보고.
4. `supabase db query -f`의 다중문장 제한 → `docker exec ... psql -f -` 형태로 전환(명령 형태만 기재).

## [DoD]

- [x] Jaison "착수 가능" 코멘트(`7165007890`) 확인 후 착수(PR #1530 병합 선행 확인)
- [x] 실측 1~7 각각 결과 기재(미실행 없음 — M5는 대체 구조로 부분 실측 명시)
- [x] M5 대체 구조 사용 사실 + "부분 실측, B-381 구현 후 재실측 필요" 명시, 대체 구조 커밋 0건
- [x] 계획서 §4(복원 불가·부분 복원) 항목별 실제 동작 확인 결과 기재
- [x] 계획서 수정 필요 SQL/문구 목록 기재(5건 + 보완 3건 확인)
- [x] `db reset` 원상 복구 + `git status` 0건 확인
- [x] 추가된 줄에 절대경로·계정·운영 식별자·운영 값 없음(임시 파일 `scratch/` 커밋 제외)
- [x] 완료 절차 R-17 준수(문서 PR만 · `gh pr checks` 출력 인용 · ✅ 전환/병합은 Jaison)
- [x] `check-R17-DoD`는 저장소에서 OpenCode 커맨드 템플릿(`opencode.json`)으로 정의되어 셸 실행 불가 → R-17 v3.0 7단계를 위 순서대로 수동 자가 점검(코드 커밋 없음: 코드 변경 0건이므로 해시 삽입 대상 없음)
