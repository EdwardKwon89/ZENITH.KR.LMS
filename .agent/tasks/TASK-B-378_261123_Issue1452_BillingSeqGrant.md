# TASK-B-378 — 청구서 번호 채번 함수(`next_billing_statement_seq`) 실행 권한·역할 검사 정렬 (#1452, #1449 B)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1452](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1452) (Aiden #1449 **B** · Jaison 배정 Mike) |
| 담당 | **Mike (Worker)** / Auditor: **Jaison** · **PR은 `Refs #1452` `Refs #1449`** (Close는 Jaison) |
| 브랜치 | `feature/teamb-task-b378-iss1452-billing-seq-grant` (base: `origin/TeamB_Dev` `ebd2afa3d`) |
| 상태 | 🔔 완료 (PR 검토 대기) |
| 긴급도 | p2 · 통합(#1448) 병합 조건 |
| 환경 | 로컬 Supabase 한정 (R-14) |

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "TASK-B-378"   # → 없음 (신규 생성)
# next-task-number.sh는 379를 출력하지만 이슈 확정번호 TASK-B-378 사용 (#1449 지시: 직접 확인)
```

## [목표]

`next_billing_statement_seq`의 **실행 권한(GRANT)과 함수 내부 역할 검사를 청구서 생성 권한**(ADMIN 계열 + 대리점 규칙 = `('ADMIN','ZENITH_SUPER_ADMIN','AGENCY')`)과 **일치**시킨다. b359 마이그레이션은 수정하지 않고 **신규 파일 + 롤백 SQL**로 작성한다.

## [범위]

**수정**: `supabase/migrations/20261123120000_task_b378_billing_seq_role_check.sql` (신규) — 함수 본문에 역할 검사 추가 + GRANT를 두 RPC와 동일하게 명시 + 롤백 SQL 주석 블록.
**정정(Aiden 코멘트)**: `tests/unit/migrations/taskb359-billing-statement-db.test.ts` — 234행 권한 단언 보강, TC-359-Q1b 양성/음성 대조 확장, TC-359-Q1c(상한 소진) 신규.

**하지 않는 것**: b359 마이그레이션 수정 금지 · 청구서 생성 로직/번호 형식(`ST-YYYYMM-NN-SSSS`) 변경 금지 · `scratch/`(R-15).

## [지켜야 할 것]

- **R-09**: 양성(허용 역할 성공) + 음성(비허용 거부)을 **같은 테스트**에, 되돌리기 실측으로 민감성 증명 (mock·소스 문자열 검사·테스트 생략 금지)
- **Public 저장소**: 노출 경위·재현 세부 금지 → 변경 전/후는 **거부/허용 결과표**만
- **호출처 전수**(R-20): 이 함수를 부르는 곳이 생성 RPC뿐인지 grep 실측 기재
- **R-12**: 해당 시 Ds-11 갱신 · **R-10**: `/admin/error-logs` 신규 ERROR 無

## [R-20 영향도] — GitNexus 미연결 → `grep` 전수 (실측)

- `grep -rn "next_billing_statement_seq" supabase/migrations/*.sql` → 정의/GRANT/COMMENT는 b359(L20·127·148·149·151) + 본 신규 파일, **실행(호출)부는 b359 L251 딱 1곳 = `create_billing_statement` RPC 내부뿐** (b360 `create_billing_statement_with_items`는 이 RPC를 호출하는 구조로 seq 직접 호출 0)
- `grep -rn "next_billing_statement_seq" src tests --include=*.ts` → **src 0건**, tests 16건 전부 `taskb359-billing-statement-db.test.ts` (PG catalog 문자열·Q1b/Q1c 호출)
- 결론: **청구서 생성 RPC 경로 외 실행처 없음** → 내부 역할 검사 추가가 정상 생성 경로에 미치는 영향 없음 (TC-378-04로 실측)

## [DoD] (이슈 [요청 사항]·요구 조건 기준)

- [x] GRANT·역할 검사를 청구서 생성 권한과 일치 (두 RPC와 동일 역할 목록·오류 코드·GRANT)
- [x] 월 seq 상한(4자리) 소진 동작 한 줄 기재 (아래 [작업 결과] — 실측)
- [x] 신규 마이그레이션 파일 + 롤백 SQL (b359 수정 0)
- [x] 비허용 역할 거부 + 허용 역할 무회귀 **양성 대조**, 실제 로그인 세션·실DB
- [x] 되돌리기 실측으로 테스트 민감성 증명 + 측정 후 정책·GRANT 원상 복구
- [x] 호출처 전수 grep (명령·결과 task file 기재)
- [x] R-09 회귀 항목 파일 · R-12 Ds-11 반영 · error-logs 신규 無

## [작업 결과]

### 착수 절차 실측 (R-17)

```bash
① pwd                                  → <로컬 워크트리>
② git branch --show-current            → feature/teamb-task-b378-iss1452-billing-seq-grant
   (origin/TeamB_Dev `ebd2afa3d` = PR #1469 병합본에서 생성)
③ ls .agent/tasks | grep -i TASK-B-378 → 없음 (신규 생성 · TASK-B-378 확정)
④ ./scripts/check-db-freshness.sh      → OK (pending 0)
⑤ 라벨 status:open → status:in-progress → (완료 시) status:review
⑥ supabase db push --local             → 본 마이그레이션 적용 후 재확인 OK
```

### 구현 (신규 마이그레이션 1개 — b359 수정 0)

| 항목 | 변경 전 (b359) | 변경 후 (본 파일) |
|:--|:--|:--|
| **내부 역할 검사** | 없음 (SECURITY DEFINER 원자 증분만) | `zen_profiles via auth.uid()` → `NOT IN ('ADMIN','ZENITH_SUPER_ADMIN','AGENCY')`이면 **`create_not_allowed: role=%`**, 프로필 없으면 **`profile_not_found`** — 두 RPC(b359 L189 / b360 L128)와 **동일** |
| **GRANT** | `REVOKE FROM PUBLIC, anon` / `GRANT authenticated, service_role` | `REVOKE FROM PUBLIC, anon, dashboard_user`(방어적 명시) / `GRANT authenticated, service_role` — **두 RPC와 동일**, 관측 가능 privilege 값 변화 없음(anon·dashboard_user 모두 원래 false) |
| **롤백 SQL** | — | 파일 하단 주석 블록에 **b359 원본 본문·원본 GRANT·원본 COMMENT** 전체 수록 |

- **허용/거부 결과표(요구 상태 대비, 실측)**: 허용 AGENCY·ADMIN·ZENITH_SUPER_ADMIN → **허용**(증분 계속) / 비허용 INDIVIDUAL·MANAGER·OPERATOR → **거부**(`create_not_allowed`) / `auth.uid()` 없는 슈퍼유저 직접 호출 → **거부**(`profile_not_found`) / `anon`·`dashboard_user` EXECUTE → **거부(false)** · `authenticated`·`service_role` → **허용(true)**
- **MANAGER 불일치 보고(정직 기재)**: 이슈 본문은 MANAGER를 "허용 역할"로 적었으나 **두 RPC(b359·b360) 모두 실제로는 MANAGER 거부**(`NOT IN ('ADMIN','ZENITH_SUPER_ADMIN','AGENCY')`) → 본 Task는 **코드 정합(두 RPC와 동일)을 우선**해 MANAGER 거부로 구현했고, 이슈 본문 표기가 실제 정책과 다르면 Jaison/Aiden 확인 후 본문을 정정해 주세요.
- **월 seq 상한(4자리) 소진 동작(한 줄, 실측)**: `lpad('10000',4,'0')='1000'`로 10,000번째부터 번호가 잘려 기존 `...-01-1000`과 `statement_no` UNIQUE가 충돌해 **청구서 생성이 실패한다(트랜잭션 롤백, 카운터도 9999로 복귀 → 재시도도 동일 실패)**.

### 테스트 (실제 세션·실DB — mock은 가드/이메일 한정, 소스 문자열 검사 0건)

`tests/unit/migrations/taskb359-billing-statement-db.test.ts` **36/36 PASS** (기존 35건 + Q1c 신규, Q1b는 같은 테스트 내 양성/음성 대조로 확장)

| TC | 내용 |
|:--|:--|
| **234행(S4) 보강** | seq GRANT 4종 단언: `authenticated`·`service_role` = **t**, `anon`·`dashboard_user` = **f** + 근거 주석(두 RPC와 동일) |
| **TC-359-Q1b (양성+음성 같은 테스트)** | **양성**: AGENCY(2회, 원자 증분 1→2)·ADMIN(→3)·ZENITH_SUPER_ADMIN(→4) 전부 성공 / **음성**: INDIVIDUAL·MANAGER·OPERATOR → `create_not_allowed: role=%` / 거부가 증분 만들지 않음(카운터=마지막 허용값) / `auth.uid()` 없는 슈퍼유저 직접 호출 → `profile_not_found` |
| **TC-359-Q1c (신규, 상한 소진)** | `lpad('10000',4,'0')='1000'` 실측 → 카운터 999에서 생성 = `ST-202606-01-1000` → 9999로 소진 후 Admin 발행 시도 → **`zen_billing_statements_statement_no_key` UNIQUE 충돌로 실패** + 카운터 9999 롤백 복귀 + 테스트 내 자체 정리 |
| **무회귀(양성 대조의 연장)** | 이 파일 내 모든 `create_billing_statement` 경로(대리점·Admin 발행, 병렬 4중복, RLS 블록) 전부 정상 통과 |

- **위반 패턴 grep 0건**: `readFileSync`·소스 `toContain`·함수 타입 단언·테스트 생략 (재실행 결과 0건)
- **fixture 확장**: `U_OPERATOR`(OPERATOR)·`U_SUPER`(ZENITH_SUPER_ADMIN) 아이덴티티 추가 — `b359-%` email prefix로 자기완결 정리

### 되돌리기 검증 (로컬 DB에서만 · 측정 후 원상 복구)

| 조건 | 되돌리기 | 결과 (failed / passed) |
|:--|:--|:--|
| **R1** | **함수 본문 원본 복원**(b359 원본 = 역할 검사 없음) | **1 failed / 35 passed** — Q1b 음성 대조만 FAIL (`expected '5' to contain 'create_not_allowed: role=INDIVIDUAL'` = 비허용 호출이 통과) → **테스트가 변경에 민감함을 실측** |
| **R2** | **GRANT 원본 복원**(b359 원본 = `dashboard_user` REVOKE 제거) | **36 passed(전부 PASS)** — GRANT 두 줄은 **관측 가능한 privilege 값 변화가 없음을 실측**(dashboard_user는 원래 false) → 민감성 실측은 R1로 확보, GRANT 부분은 방어적 명시임을 정직하게 기재 |
| (기준선) | 원본 함수·GRANT 재적용 후 재실행 | **36/36 PASS** · `create_not_allowed` 존재=true · `dashboard_user=false, anon=false, service_role=true` |

> R1·R2 모두 측정 후 마이그레이션 본문·GRANT를 재적용해 **원상 복구**했고 최종 기준선 **36/36 PASS**를 재확인했다.

### R-10 (error-logs 無 + UI 무회귀)

- 청구서 관리 전 구간 E2E `tests/e2e/e2e-31-billing-flow-verification.spec.ts` 재실행 → **14/14 PASS (4.9m)** (대리점 청구서 생성 UI 경로 포함 = seq 함수 실제 호출)
- `zen_error_logs` before=**0** → after=**0** (**delta 0**), 최근 15분 행 **없음** → `/admin/error-logs` 신규 ERROR **無**
- (E2E 재실행으로 재생성된 `docs/99_Manual/E2E_B371_Result/` 증적은 #1439 원본으로 복원 — 본 Task는 측정만 수행하고 증적 churn 없음)

### C. 검증 (전부 재실행)

- `npm run test:regression` → **296 files / 2,268 tests 전부 PASS**
- `npm run build` → **exit 0** (`✓ Compiled successfully in 7.6s`)
- `check:ds11` OK (Ds_11_07 seq·create RPC 항목 갱신) · `check:lrtm` OK (회귀 항목 등재) · `check:doc-links` OK · `check:audit` OK · `tsc` 관련 **0건**
- `git diff origin/TeamB_Dev...HEAD -- scratch` → **출력 없음** (R-15)

### 발견 이슈

- **MANAGER 표기 불일치**(이슈 본문 "허용" vs 두 RPC 실코드 "거부") — 상세는 위 [작업 결과]에 기재. 코드 정합 우선으로 구현했으며 정책 확인은 Jaison/Aiden에 요청.
- 그 밖의 범위 밖 결함 **없음**.
