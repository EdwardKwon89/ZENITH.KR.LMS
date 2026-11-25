# TASK-B-388 — 롤백 통합본 미실측 항목 로컬 실측 (EPIC #1364, TASK-B-387 후속) (#1528)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1528](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1528) · Jaison 배정 Mike · 검증 Jaison · p2 · 단순 Task(착수 직행) |
| 브랜치 | `feature/teamb-task-b388-iss1528-rollback-measure` (base: `origin/TeamB_Dev` `577ac38d7`) |
| 상태 | 🔄 진행 중 |
| 기준 문서 | EPIC #1364 **롤백 통합본 갱신판**(§3-0·§4 보충 포함) + #1528 실측 범위 6건 |
| 원칙 | 로컬 실측만(R-14) · 코드 변경 없음(scratch/ 임시·커밋 금지) · 결과는 **건수·true/false·통과/실패·명령 형태만**(R-21) · 통합본은 수정하지 않고 보고 |

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "B-388"   # → 없음 (신규)
./scripts/next-task-number.sh B     # → TASK-B-389 (이슈 확정번호 B-388 사용)
```

## [선행] #1524 추가 확인 회신 — 완료

회신 코멘트 게시(객체명·건수·브랜치명만): ① "b383 통합 7/7"은 **보고 오류 → 미실행 정정**(TeamB_Dev에서 해당 경로 `No test files found`, 당시 7/7은 b382 런 결과) — PR #1510 브랜치 head `b0fd50858` 기준 `it` **4개** ② b382 파일명 = `tests/unit/db/taskb382-billing-inclusion-rpc.test.ts`(`it` 7개, 재실행 7/7) ③ 소실 객체 = **b378**(수정본) · 리허설 최종 DB의 b383 = **미포함**

## [실측 결과 요약]

| 실측 | 결과 |
|:--|:--|
| 1. §3 + §4 | **PASS** — §3 exit 0(오류 0) · **§4 8/8** (불리언 6 전부 true + §3-0 정책 보충 1 + 행 수 변동 true) |
| 2. b382 DROP 후 오류 경로 | **PASS(확인 완료)** — DB 호출 = **함수 부재 오류** · 코드 932~937행 fail-closed + `logger.error`(Aiden 927~941과 일치) · 통합테스트는 fixture가 §3 상태와 비정합으로 실패 → **코드 확인으로 명시** |
| 3. §5 재적용 | **PASS** — 5/5 오류 0 · 객체 집계 대조 전부 기대 충합 · **b383 미포함** |
| 4. 파일별 ROLLBACK (b383→b382→b378) | **PASS 3/3** — 대상 객체 원복 3/3 · 상호 파괴 없음 (b382는 내 추출 스크립트 결함→재추출 후 exit 0) |
| 5. 원상 복구 | **PASS** — `db reset` exit 0 · 이력 316 · 미적용 0 · 상태 동일 · `git status` 0 |
| 6. §3-0 b375 정책 재생성 (추가 실측) | **PASS** — §3-0 exit 0 · 정책 1 · 세션 소속 1/비소속 0(화주·대리점) · b375 재적용 → 정책 0 |

## [작업 결과]

- 문서 커밋: `cc4d6a212b8b3b62603376b4e5ce45d72cd08838`

### 착수 절차 실측 (R-17)
```bash
① agent-worktree-init · fetch origin (TeamB_Dev 577ac38d7)
② next-task-number → TASK-B-389 (이슈 확정번호 B-388)
③ 브랜치 feature/teamb-task-b388-iss1528-rollback-measure · check-db-freshness OK
④ 라벨 status:open → status:in-progress · assignee 정리
⑤ 선행: #1524 추가 확인 회신 게시 (객체명·건수·브랜치명만)
```

### 준비 (B-387 사고 재발 방지 준수)
- **저장소 파일 이동·리다이렉트 0건** — 임시 SQL은 전부 `scratch/`(커밋 안 함)에 추출 (`git show`로 PR #1510 브랜치에서 b383 ROLLBACK만 취득 — 명시적 파일 복사 없음)
- DB 준비: `supabase db reset`(전체 316 파일, 파일 이동 없음) → **상태 A**(6개 적용) · 이력 316·미적용 0
- 기준선(상태 A): §1 5지표 **0/0/0/0/0** · 함수 **8** · b378 rolecheck **1** · shipper_agency_select 정책 **0** · b365 컬럼 5+3 · b383 정책 조건 **미포함(0)**

### 실측 6 — §3-0 b375 정책 재생성 (추가 지시) — **PASS**
| 단계 | 명령(형태) | 결과 |
|:--|:--|:--|
| §3-0 실행 | `psql -v ON_ERROR_STOP=1 -f` (갱신판 §3-0 원문) | **exit 0** |
| 정책 존재 | `pg_policies` 카운트 | **1** |
| 화주 세션 SELECT | 실세션(인증 클레임) 카운트 | 소속 **1** · 비소속 **0** |
| 대리점 세션 SELECT | 동일 | 소속 **1** · 비소속 **0** |
| b375 재적용 | `DROP POLICY IF EXISTS shipper_agency_select ...` | **exit 0 · 정책 0** (재확인 세션 0건) |

### 실측 1 — §3 + §4 (8개) — **PASS**
- §3(갱신판 원문 54줄, b382 DROP 포함) `psql -v ON_ERROR_STOP=1 -f` → **exit 0, 오류 0건**
- §4 **8/8**: ① statements_gone **t** ② items_gone **t** ③ seq_gone **t** ④ orders 3컬럼 **t** ⑤ actual_cost 5컬럼 **t** ⑥ 함수 8개 잔존 **0(=t)** ⑦ §3-0 정책 보충 **1** ⑧ 행 수 변동 없음 **true** (orders 2→2 · charges 2→2 · actual 0→0 · statements/items 0→테이블 부재≡0, DO 블록 동적 확인)

### 실측 2 — b382 DROP 후 앱 호출 오류 경로 — **PASS(확인 방법 명시)**
- **(a) DB 호출(실세션)**: `SELECT zen_billing_statement_order_included(...)` → **오류: 함수 부재(does not exist)** 실측
- **(b) 코드 확인**: `src/app/actions/finance/ups-actual-cost.ts` **932~937행** — RPC 오류 → `logger.error('...statement inclusion RPC failed')` + **fail-closed 반환**, 비불리언 반환도 동일(`...unexpected statement inclusion result`) → **Aiden 확인(927~941행 fail-closed + logger.error)과 일치**
- **(c) 통합테스트**: `tests/integration/task-b367-unmark-cost-settled.test.ts` 실행 → **실패(fixture가 §3 후 상태와 비정합)·5 skipped** → **앱 경로의 실제 실행 확인은 불가** → (a)+(b) 확인으로 대체 (이슈의 "불가 시 코드 확인만" 조항 적용)

### 실측 3 — §5 재적용 — **PASS**
- 순서: **b375 재적용(§3-0으로 열린 정책→0) → b365 → b359 → b360 → b378 → b382** (b383은 미포함)
- 결과: **5/5 exit 0, 오류 0건**
- 객체 집계 대조(기준선 상태 A 대비): 함수 **8/8** · b378 rolecheck **1** · shipper_agency_select 정책 **0** · 청구서 테이블 **3** · b365 컬럼 **5+3** · b383 정책 조건 **0(원본 = 미포함 유지)** → **전부 일치**

### 실측 4 — 파일별 ROLLBACK 블록 (b383 → b382 → b378) — **PASS 3/3**
| 순서 | 블록 | exit | 대상 객체 원복 |
|:-:|:--|:-:|:--|
| 1 | b383 ROLLBACK (PR #1510 브랜치 `git show` 추출) | **0** | 정책 원본(PLATFORM 조건 **0**) ✅ |
| 2 | b382 ROLLBACK (파일 내 `--` 블록 주석 해제) | **0** (1회차는 내 추출 스크립트 파싱 오류 exit 3 → 재추출 후 0) | `order_included` **0(부재)** ✅ |
| 3 | b378 ROLLBACK (파일 내 `/* */` 블록) | **0** | seq 원본(rolecheck **0**, 함수 존재 1) ✅ |
- 상호 파괴 없음: 3블록의 대상 객체가 서로 달라 순서상 간섭 **0건**

### 실측 5 — 원상 복구 — **PASS**
- `supabase db reset` → **exit 0** · 이력 **316** · 미적용 **0**
- 상태 스냅샷: 함수 8 · b378 rolecheck 1 · b383 정책조건 0 · shipper 정책 0 · 청구서 테이블 3 · §1 5지표 **0/0/0/0/0** (상태 A와 동일)
- `git status` **0건** (scratch/ 무시)

### 통합본 수정 필요 SQL 목록
**없음** — 갱신판 §3-0·§3·§4·§5의 SQL이 전부 오류 없이 실행됐고 기대값( true/1/0 )에 부합. (b382 블록 1회 실패는 통합본이 아닌 **내 추출 스크립트의 파싱 결함**으로 재추출 후 해결 — 통합본 원문은 이상 없음.)

### 사고·복구 (사실 기재)
1. 준비 단계의 파일 이동·리다이렉트는 **사용하지 않음**(지시 준수) — B-387의 0바이트 사고 재발 없음.
2. b382 ROLLBACK 1회차 실패(exit 3): 추출 스크립트가 `--` 주석 헤더를 SQL로 잘라냄 → 파일 원문에서 주석 해제 방식으로 재추출 → exit 0 (통합본 결함 아님).

### 발견 이슈
없음 (통합본 SQL 결함 미발견). 미실측 항목이었던 **b382 DROP·b382 재적용·파일별 ROLLBACK 순서·§3-0**이 본 실측으로 해소됨.

## [DoD]

- [x] #1524 추가 확인 요청 회신 완료 (객체명·건수·브랜치명)
- [x] 실측 1: §3 exit 0 + §4 8개 전부 true(함수 잔존 0 포함)
- [x] 실측 2: 오류 경로 확인 — DB 오류 종류 + 코드 확인(932~937) + 통합테스트 불가 사유 명시
- [x] 실측 3: 재적용 5/5 오류 0 · 롤백 전후 집계 대조 일치 · b383 미포함 명기
- [x] 실측 4: 파일별 ROLLBACK 3/3 exit 0 · 대상 객체 원복 3/3 · 순서 간섭 0
- [x] 실측 5: `db reset` 원상 복구(이력 316·미적용 0) + `git status` 0건
- [x] 실측 6(추가): §3-0 정책 1 → 세션 소속 1/비소속 0 → b375 재적용 후 0
- [x] 통합본 수정 필요 SQL 목록: **없음**
- [x] 추가된 줄에 절대경로·계정·운영 식별자 없음 (임시 파일은 scratch/ 커밋 제외)
- [x] 완료 절차 R-17 준수 (task file 문서 PR만 · 병합하지 않음)
