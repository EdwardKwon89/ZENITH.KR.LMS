# TASK-B-392 — Issue #1539: M4·M4-b·M5 롤백 재리허설 — 정정 SQL 왕복·M5 실제 run 테이블 실측 (EPIC #1364, B-390·B-391 후속)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1539](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1539) · 담당 Baker(Team B) · 검증 Jaison · p2 · 단순 Task |
| 브랜치 | `feature/teamb-task-b392-iss1539-m4-m5-rerehearsal` (base `origin/TeamB_Dev` `8888e88c2` — 착수 후 WBS 문서 커밋을 fast-forward 반영) |
| 상태 | 🔔 검토 대기 (`status:review`) |
| 기준 문서 | 병합본 `.agent/tasks/TASK-B-389_261125_Issue1529_RollbackPlan.md` (정정 7건 반영, PR #1538 병합 `fb25684ef`) · 정정 근거 `.agent/tasks/TASK-B-391_261126_Issue1537_PlanFix.md` |
| 범위 | **로컬 리허설만** — 운영 DB 접속 0(R-14), 코드·마이그레이션·테스트·계획서 변경 0, 계획서 SQL은 그대로 사용(수정 금지) |
| 공개 저장소 | 건수·true/false·통과/실패·명령 형태만 기재(R-21) — 계정·값·절대경로·운영 식별자 0 |

## 채번·선행 확인

- `./scripts/next-task-number.sh B` → `TASK-B-393`. 이슈 #1539가 **TASK-B-392**를 점유하고 `TASK-B-392*` 파일이 없으므로 이슈 지정 번호 사용.
- `git fetch origin` → `origin/TeamB_Dev`에 B-381 M1~M3(#1536 `6944a55a8`), 계획서 정정 7건(#1538 `fb25684ef`) 병합 확인. 착수 후 WBS v0.8(`8888e88c2`) 커밋이 추가되어 **fast-forward 반영** 후 `git status` 분기점 일치.
- 라벨 `status:open` → `status:in-progress` 전환(완료 보고 시 `status:review`까지만). 전용 Baker 워크트리 재사용, `agent-worktree-init.sh` 재실행 0(중첩 경로 결함 회피).
- Aiden 검토 의견(재리허설은 T3 최종 확정 선행 조건)·Jaison 배정 확인 후 착수.

## 준비·명령 형태

- `./scripts/check-db-freshness.sh` → **OK(pending 마이그레이션 0)** (reset 전·후 2회).
- `supabase db reset --local --yes` exit 0 → `npx tsx scripts/seed-local.ts` exit 0 → 기준선 오더 **15** · 인보이스 **16**.
- 실제 `zen_ups_settlement_runs`·`zen_ups_settlement_run_amounts`·`zen_ups_settlement_run_charges`·`zen_billing_statement_items`가 마이그레이션으로 존재함을 확인 — **대체 구조 미사용**.
- 다중문장 SQL 실행 형태: `docker exec -i <local-db-container> psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scratch/b392/<file>.sql`. 단건 조회는 `supabase db query --local -o csv "<SQL>"`.
- 임시 SQL·픽스처 전부 `scratch/b392/`(gitignore, 커밋 0). 저장소 파일 이동·리다이렉트 덮어쓰기 **0건**.
- `:approved_admin_id`는 계획서대로 실행 시 로컬 승인 프로필 1건으로만 주입(문서·저장소에 값 미기재).

## [작업 결과]

### 실측 1 — §2-1 자식 참조 위반 중단·잔존 (Aiden 참고 2) — PASS

계획서 §2-1 SQL을 **그대로** 실행. 기본 상태는 대상 **2건**·6개 자식 참조 **전부 0**.

| 케이스(순차 실행) | §2-1 검출 | 중단 후 잔존(건수) | 정리 |
|:--|:--|:--|:--|
| A. `zen_incident_fees` 자식 생성 | 대상 **2** · `incident_fees` **1** · 나머지 5개 **0** | M4-b 대상 **2** 잔존 · 자식 **1** 잔존 · M4-b 백업 테이블 **0** · CANCELED 인보이스 **0** → **§2-3 미실행** | 픽스처 삭제 후 재조회: 6개 전부 **0** |
| B. `zen_invoice_pdf_history` 자식 생성 | 대상 **2** · `pdf_history` **1** · 나머지 5개 **0** | M4-b 대상 **2** 잔존 · 자식 **1** 잔존 · M4-b 백업 테이블 **0** · CANCELED 인보이스 **0** → **§2-3 미실행** | 픽스처 삭제 후 재조회: 6개 전부 **0** |

- **정확한 중단 위치**: §2-1 사전 읽기 전용 조회의 자식 참조 6개 질의에서 검출 → 계획서 중단 규칙에 따라 **백업(§2-2)·실행(§2-3) 진입 전 중단**. 신규 데이터·상태 변경 0.
- B-390에서 질의 자체가 실패했던 `zen_claims.invoice_id`·`zen_finance_pdf_history`는 정정본에서 **오류 0**으로 실행됨(정정 1·2 확인).

### 실측 2 — M4 사전 조회·백업·실행 — PASS(중단 검출 포함)

| 단계 | 결과 |
|:--|:--|
| §1-1 사전 조회 | 대상 **15** · 중단1(PAID) **1건 검출** → 계획서대로 **실행 보류** 후 보고. 로컬 픽스처만 원복(계획서 SQL 수정 0), 재조회 PAID **0** · 대상 **15** · 중단2 **2**(= M4-b 대상 2와 일치) |
| §1-2 백업 | `b381_m4_target` **15** · `b381_m4_invoice_bak` **15** — 행 수 대조 **true** |
| §1-3 실행 | `UPDATE 15` + 이력 `INSERT 0 15`, exit 0. 이력 식별자 `B381_M4` **15행**, 변경자 로컬 승인 프로필 **1건**(값 미기재) |
| 실행 직후 §1-5 | `restored` **0** · `same_status` **0** · `B381_M4` 이력 **15** · `status_matches` **false** |

### 실측 3 — M4-b 사전 조회·백업·실행 — PASS

| 단계 | 결과 |
|:--|:--|
| §2-1 사전 조회 | 대상 **2** · order_costs **0** · incident_fees **0** · tax_invoices **0** · pdf_history **0** · files **0** · history **0** → 실행 가능 |
| §2-2 백업 | `b381_m4b_target` **2** · `b381_m4b_invoice_bak` **2** — 행 수 대조 **true** |
| §2-3 실행 | `DELETE 2`, exit 0 |
| 실행 직후 §2-5 | `restored` **0** · `content_matches` **true(공허 — 조인 0건)** · `dup_invoice_no` **0** — PASS 근거로 사용하지 않음 |

### 실측 4 — M5 사전 조회·백업·실행(실제 run 테이블) — PASS

| 단계 | 결과 |
|:--|:--|
| §3-1 대상 | SETTLED + run 없음 + 청구항목 없음 UPS 오더 **3** |
| §3-1 제외 건 | SETTLED + run 없음 + 청구항목 보유 **1** → 대상에서 제외·보고 |
| 정상 비대상 | SETTLED + run 있음 + 청구항목 보유 **1** → 집계 **안 됨**(구 질의는 **2**로 오인) |
| 실행 테이블 | `zen_ups_settlement_runs`·`zen_billing_statement_items` **실제 테이블 사용**(대체 구조 0) |
| §3-2 백업 | `b381_m5_target` **3** · `b381_m5_order_bak` **3** — 행 수 대조 **true** |
| §3-3 실행 | `UPDATE 3`, exit 0 |
| 실행 직후 §3-5 | `restored` **0** · `content_matches` **false** · `settled_without_required_fields` **0** |

### 실측 5 — 실행 후 충돌 픽스처 — PASS(로컬 한정)

| 충돌 | 결과 |
|:--|:--|
| M5 신규 run | 실제 `zen_ups_settlement_runs`에 대상 1건 삽입 → 복원 시 건너뜀 |
| M5 신규 청구항목 | 대상 1건에 항목 삽입. 가드 트리거가 NOT_SETTLED 오더를 거부하므로 **로컬 리허설에서만** 트리거 비활성화 즉시 삽입 후 재활성화 — 사후 `tgenabled=O` 확인(운영 경로 변경 0) |
| M4 상태 변경 | 대상 1건을 백업과 다른 상태로 변경 → 복원 제외 대상 |
| M4-b `invoice_no` 재사용 | 삭제 인보이스와 동일 번호를 새 id로 삽입 → 복원 시 UNIQUE 충돌 예약 |

### 실측 6 — 역순 복원(M5 → M4-b → M4) — PASS(부분 복원 포함)

| 단계 | 결과 |
|:--|:--|
| M5 §3-4 | `UPDATE 1` — 충돌 2건 건너뜀, exit 0 |
| M5 §3-5(정정본) | `restored` **1** · `content_matches` **false** · `settled_without_required_fields` **0** — 구 join 집계는 **3**(과다 집계 재현) |
| M4-b §2-4 1차 | `invoice_no` UNIQUE 충돌 → **전체 ROLLBACK**, `restored` **0** · `content_matches` **true(공허 — 조인 0건)** · `dup_invoice_no` **0** — PASS 근거로 사용하지 않음 |
| M4-b §2-4 2차 | 충돌 행 제거 후 `INSERT 0 2` → `restored` **2** · `content_matches` **true** · `dup_invoice_no` **0** — PASS 근거는 `restored` **2**(=백업 2) / 실측 7 내용 일치 **2** |
| M4 §1-4 | `UPDATE 14` + 이력 `DELETE 14`, exit 0 — `:approved_admin_id`는 로컬 승인 프로필 주입 |
| M4 §1-5(정정본) | `restored` **14** · `same_status` **14** · `B381_M4` 이력 **1잔존** · `status_matches` **false** — 구 join 집계는 **15**(과다 집계 재현) |

### 실측 7 — 최종 대조(건수만) — PASS

| 항목 | 백업 | 현행 | 일치 |
|:--|--:|--:|--:|
| M4 인보이스 | 15 | 15 | 상태 **14** · `updated_at` **14** |
| M4 `paid_at` 보유 | 1 | 0 | 불일치 **1** (보완 문구와 일치) |
| M4 `B381_M4` 이력 | 실행 15 | 복원 후 **1** | 삭제 **14**, 변경 건 이력 잔존 |
| M4-b 인보이스 | 2 | 2 | 내용 일치 **2** · dup **0** |
| M5 오더 | 3 | 상태 복원 **1** | `updated_at` 일치 **0** · 건너뜀 **2** |
| 잔존 신규 데이터 | — | run **2** · 청구항목 **3** | 백업 밖 신규 데이터는 삭제되지 않음 |
| `settled_without_required_fields` | — | **0** | — |

### 실측 8 — 정정 7건 왕복 검증 — 전건 PASS

| # | 정정 내용 | 실측(정정 / 구 질의 대조) | 판정 |
|:-:|:--|:--|:--|
| 1 | §2-1 `zen_finance_pdf_history` → `zen_invoice_pdf_history` | 자식 검출 **1**, 질의 오류 **0** | PASS |
| 2 | §2-1 `zen_claims` → `zen_incident_fees` + FK 6개 근거 | incident_fees **1** · pdf_history **1** 검출, 6개 열 전부 정상 집계 | PASS |
| 3 | §3-1 대상 누출 질의로 교체 | 제외 **1**, 정상 비대상 **1 미집계** / 구 질의 **2** | PASS |
| 4 | §2-4 UNIQUE 충돌 시 전체 ROLLBACK·복원 0 | 충돌 시 `restored` **0**, 해소 후 **2** | PASS(단, §4 잔여 문구는 아래 추가 수정 1건) |
| 5 | §3-5 `restored` 일치 건수만 | **1** / 구 join **3** | PASS |
| 6 | §1-4 실제 복원 행의 이력만 삭제 | 삭제 **14** · 잔존 **1** | PASS |
| 7 | §1-5 상태·값 일치 집계 | **14**(same_status **14**) / 구 join **15** | PASS |

### 실측 9 — B-381 M1~M3 역순 롤백 왕복 — PASS

M4·M4-b·M5 왕복과 복원을 모두 마친 뒤 수행. ROLLBACK 블록은 3개 마이그레이션의 주석을 `scratch/b392/`에 복사해 해제했고, 저장소 마이그레이션은 수정하지 않음.

| 단계 | 결과 |
|:--|:--|
| 실행 전 | run 테이블 **3** · `finalize_ups_settlement_run` **1** · `billing_items_amounts` 반환 컬럼 **10** · M2 추가 컬럼 **2** |
| M3 ROLLBACK | exit **0** (`REVOKE` · `DROP FUNCTION` · `NOTIFY`) |
| M2 ROLLBACK | exit **0** (`BEGIN` · `DROP FUNCTION` · `CREATE FUNCTION` · `ALTER TABLE` · `CREATE FUNCTION` · `REVOKE` · `GRANT` · `REVOKE` · `GRANT` · `COMMIT`) |
| M1 ROLLBACK | exit **0** (`DROP TABLE` 3 · `DROP FUNCTION` · `COMMIT` · `NOTIFY`) |
| 롤백 후 | run 테이블 **0** · `finalize_ups_settlement_run` **0** · `billing_items_amounts` 반환 컬럼 **7** · M2 추가 컬럼 **0** |
| b360 정의 대조 | `billing_items_amounts(uuid[],text)` 본문 일치 **true** · `create_billing_statement_with_items(uuid,text,text,integer,integer,date,date,uuid[])` 본문 일치 **true** (공백 정규화 후; 정규화 전 전체 정의 일치는 false — 카노니컬 헤더 차이) |
| M1 재적용 | exit **0** |
| M2 재적용 | exit **0** |
| M3 재적용 | exit **0** |
| 재적용 후 | run 테이블 **3** · `finalize_ups_settlement_run` **1** · 반환 컬럼 **10** · M2 추가 컬럼 **2** |
| `db reset` 후 | run 테이블 **3** · `finalize_ups_settlement_run` **1** · 반환 컬럼 **10** · M2 추가 컬럼 **2** — `check-db-freshness` **OK(pending 0)** |

### 계획서 §4 대조·추가 수정 목록

- §4의 M4 상태변경·이력 소실·`paid_at` 미복원, M4-b CASCADE 사전 0건, M5 충돌 건너뜀·`updated_at` 덮어쓰기는 실측과 일치.
- 외부 저장소 파일·알림 발송 이력·DB 밖 감사 로그는 로컬 범위 밖 **미확인**(계획서와 동일).
- **추가 수정 1건(Jaison 보고)**: §4 표의 M4-b `삭제 후 재사용된 invoice_no` 행이 여전히 `UNIQUE 충돌 → 부분 복원·보고`로 서술되어 있으나, 정정된 §2-4는 단일 트랜잭션 `ROLLBACK`·**복원 0건**이다. 실측도 ROLLBACK·복원 0으로 확인됨. 계획서는 수정하지 않고 보고함.

### B-390(1차) ↔ B-392(재리허설) 비교

| 항목 | B-390(1차) | B-392(정정 SQL 왕복) |
|:--|:--|:--|
| M5 실행 테이블 | 대체 구조(부분 실측) | **실제 `zen_ups_settlement_runs`** |
| §2-1 질의 | 스키마 오류 2건 + history 위반 1건 | 오류 **0**, incident_fees **1** / pdf_history **1** 각각 검출·중단 |
| M4 대상 / 실행 | 15 / UPDATE 15·이력 15 | 15 / UPDATE 15·이력 15 |
| M4 §1-5 `restored` | **15**(=과다) | **14**(=실제 복원) |
| M4 `same_status` | 14 | 14 |
| M4 이력 삭제 / 잔존 | 15 / 0 | **14 / 1** |
| M4-b 1차 / 2차 복원 | ROLLBACK 0 / 2 | ROLLBACK 0 / 2 |
| M5 대상 / 제외 | 2 / 1(대체) | **3 / 1(실제)** |
| M5 §3-5 `restored` | **3**(=과다) / 실복원 1 | **1**(=실복원) / 실복원 1 |
| M5 `updated_at` 일치 | 0 | 0 |
| `paid_at` 백업/현행/불일치 | 1 / 0 / 1 | 1 / 0 / 1 |

### 실측 10 — 원상 복구 — PASS

- `supabase db reset --local --yes` exit 0 · `./scripts/check-db-freshness.sh` → **OK(pending 0)**.
- `git status -sb` → 분기점 일치, 변경 **0건**(`scratch/b392/`는 gitignore).
- 코드·마이그레이션·테스트·계획서 변경 **0건** — 본 PR은 task file **1개**뿐.

## [DoD]

- [x] 최신 `origin/TeamB_Dev` 반영 + `check-db-freshness` OK(착수·완료 2회)
- [x] 실측 1~10(대상/중단/백업/실행/검증/충돌/역순 복원/최종 대조/M1~M3 역순 롤백 왕복/원상 복구) 건수·true/false 기재
- [x] M5를 **실제 run 테이블**로 실측(대체 구조 0)
- [x] 정정 7건 전건 왕복 검증 + 구 질의 대조값 기재
- [x] B-390 비교 표 기재
- [x] 추가 수정 목록 기재(§4 M4-b 문구 **1건**, 계획서는 미수정)
- [x] M1~M3 역순 롤백 왕복 결과(9번) 기재 — 건수·본문 일치 true/false·exit 코드
- [x] reset + `git status` 0건, scratch 커밋 0
- [x] R-21 준수 — 추가된 줄에 계정·값·절대경로·운영 식별자 0
- [x] 완료 절차 R-17 준수(문서 PR만 · `gh pr checks` 출력 인용 · ✅ 전환/병합은 Jaison)
- [x] `check-R17-DoD`는 저장소의 OpenCode 커맨드 템플릿(`opencode.json`)으로 정의되어 셸 실행 불가 → R-17 v3.0 7단계 수동 자가 점검(코드 변경 0건이므로 코드 커밋 해시 삽입 대상 없음)
- [x] R-17 수동 점검 1줄: issue 배정/plan·task file/코드·테스트 0/reset+freshness OK/PR 본문+`gh pr checks` 인용/`status:review` 유지/병합·승인은 Jaison·Aiden

## [후속]

- EPIC #1364 요약 코멘트 게시.
- Jaison 검토 후 `status:review` → ✅/병합. 운영 실행은 Aiden·Edward 승인 범위(본 Task는 로컬만).
