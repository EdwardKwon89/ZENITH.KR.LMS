# TASK-B-393 — 롤백 계획서 검증 질의의 공허한 참 정정·§4 M4-b 문구 모순 (EPIC #1364, B-392 후속) (#1546)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1546](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1546) · 담당 Mike · 검증 Jaison · p2 · 단순 Task(문서 정정 + 로컬 SQL 동작 확인) |
| 연관 | EPIC [#1364](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1364) · 계획서 [#1529](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1529)(B-389) · [#1537](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1537)(B-391 정정 7건, PR #1538 병합) · [#1539](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1539)(B-392 재리허설, PR #1541 병합) · [Aiden 범위 정정](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1541#issuecomment-7181624883) · [Aiden 재검토](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1541#issuecomment-7181782401) |
| 브랜치 | `feature/teamb-task-b393-iss1546-plan-verify-fix` (base `origin/TeamB_Dev` `8c5648fc6`) |
| 상태 | 🔔 검토 대기 (`status:review`) |
| 대상 문서 | `.agent/tasks/TASK-B-389_261125_Issue1529_RollbackPlan.md` (Dave 소유 — **정정 4곳 + §8 매핑표 한정 Jaison 승인**, 범위 밖 미변경) |
| 원칙 | R-14 로컬 한정 · R-21(건수·true/false·exit만) · 임시 SQL은 scratch/ 커밋 0 · 저장소 파일 이동·리다이렉트 0(B-387 재발 방지) · B-392 task file(Baker) 수정 0 |

## 채번 확인 (실측)

```bash
./scripts/next-task-number.sh B   # → TASK-B-394 출력 (스크립트 기준값)
# TASK-B-393 파일 부재 확인: git ls-tree 전 브랜치(TeamB_Dev/develop/main) 0건 · 로컬 B-39x = 390/391/392만 존재
# → 이슈 확정번호 TASK-B-393 사용 (이미 쓰인 번호 아님 — 중단 사유 없음)
date                              # Thu Nov 26 13:52:06 KST 2026
```

## 착수 절차 실측

```bash
① 전용 워크트리 확인 (git rev-parse --show-toplevel = mike 워크트리, init 미실행)
② git fetch origin · TeamB_Dev 최근5: #1541 재리허설(8c5648fc6)·WBS v0.8·B-381 PR-1(6944a55a8)·B-391(fb25684ef)·B-390(2857de77f)
③ next-task-number → TASK-B-394 (위 채번 확인 참조) · 브랜치 신규 분기 · 라벨 → status:in-progress
④ check-db-freshness → OK (pending 0) · PR #1541 MERGED(2026-11-26T03:49:22Z) · PR #1538 MERGED(2026-11-26T01:47:15Z)
⑤ PR 전 git log origin/TeamB_Dev..HEAD → 내 커밋만 확인
```

## 정정 4곳 + §8 (번호별 — diff에서 확인 가능한 절·줄)

**커밋 `ae9e9a778` · 대상 1파일 +67/−33 · hunk 수는 `git diff -U0`(문맥 0) 기준 **10개** = 정정 4곳(§1-5 4·§2-5 2·§3-5 2·§4 1) + §8 매핑표 1, 기본 문맥(`git diff` 기본) 기준은 **5개**(Jaison 검토에서 본 5개와 동일) — 범위 밖 hunk 0**

| # | 위치(정정 후 줄) | 반영 내용 | 확인 결과 |
|:-:|:--|:--|:--|
| 1 | **§4 표 M4-b `invoice_no` 행 (377행)** | 대응: "부분 복원·보고" → **"단일 트랜잭션 전체 ROLLBACK·복원 0건(§2-4와 동일), 충돌 해소 후 재실행"** — §2-4 문구와 일치 | diff로 문구 교체 확인 · §2-4(232행)과 대조 일치 |
| 2 | **§2-5 (245~262행)** | `restored`(join count)·`content_matches`(`NOT EXISTS`) 2질의 → **병합 질의 1개**: `backup_rows`·`joined_rows`·`restored`(백업과 일치)·`content_matches`(`joined_rows > 0 AND` 불일치 0건) + SQL 아래 **판독 규칙 1줄**(262행) · `dup_invoice_no` 불변 | 3상태 실측 아래 표 · exit 0 |
| 3 | **§3-5 (339~364행)** | `restored`(WHERE) → FILTER 형태 + `backup_rows`·`joined_rows`·**`skipped` 신설**(`= backup_rows − restored`, 건너뜀/미복원 구분) · `content_matches` 가드 + **판독 규칙 1줄**(364행) · `settled_without_required_fields` 불변 | 건너뜀 상태 실측: restored 1·skipped 2(기대 3−1=2 일치) · exit 0 |
| 4 | **§1-5 (135~158행)** | query1에 `backup_rows`·`joined_rows`·**`skipped` 신설**(`restored`/`same_status` 의미 불변) · query3 `status_matches` `NOT EXISTS` → **`joined_rows > 0 AND` 불일치 0건** + **판독 규칙 1줄**(158행) | 3상태 실측 아래 표 · exit 0 |
| + | **§8 [작업 결과] (426~437행)** | 이슈 지시에 따른 **구→신 출력 컬럼 매핑표** 신설 | 아래 매핑표와 동일 |

- **범위 밖 미변경 검증**: hunk 10개(`-U0` 기준 · 기본 문맥 기준 5개) 전부 위 5 위치. **Dave 보완 3건**(§4 M5 `updated_at` 행·§4 M4 `paid_at` 행·§1-4 이력 DELETE `PAID` 제외) 위치 hunk **0건**. **B-391 정정 7건** 중 §0·§2-1·§2-4·§3-1 4곳 hunk **0건**; §3-5·§1-5의 `restored`는 본 정정 범위(#1546)에 따라 분모/FILTER 형태로 확장되었으나 **의미(백업과 일치 = 실제 복원) 불변**(§2-5·§3-5·§1-5 판독 규칙에 명시).
- **B-392 task file(Baker) diff 0건** (`git diff origin/TeamB_Dev -- <파일>` → 0줄).

## 구 → 신 출력 컬럼 매핑 (DoD 2)

| 위치 | 구 컬럼 | 신 컬럼 | 의미 |
|:--|:--|:--|:--|
| §1-5 | (분모 없음 집계) | `backup_rows`·`joined_rows` 신설 | 백업 건수(분모)·조인 건수 |
| §1-5 | — | `skipped` 신설 | 백업과 다름 = M4 이후 변경(복원 제외) |
| §1-5 | `status_matches`(`NOT EXISTS`) | `status_matches`(`joined_rows > 0 AND` 불일치 0건) | 공허한 참 방지 |
| §2-5 | `restored`(join count) | `restored`(백업과 일치) + `backup_rows`·`joined_rows` 신설 | 실제 복원과 분모 |
| §2-5 | `content_matches`(`NOT EXISTS`) | `content_matches`(`joined_rows > 0 AND` 불일치 0건) | 공허한 참 방지 |
| §3-5 | `restored`(WHERE 일치) | `restored`(FILTER 일치) + `backup_rows`·`joined_rows` 신설 | 의미 동일, 분모 신설 |
| §3-5 | — | `skipped` 신설 | `backup_rows − restored`(건너뜀/미복원 구분) |
| §3-5 | `content_matches`(`NOT EXISTS`) | `content_matches`(`joined_rows > 0 AND` 불일치 0건) | 공허한 참 방지 |
| §1-5 `same_status` · §2-5 `dup_invoice_no` · §3-5 `settled_without_required_fields` | — | 변경 없음 | 의미 불변(공허하지 않음) |

## B-392 병합 결과와의 값 비교 (DoD 2 — 모순 여부)

| B-392 실측 (구 질의) | 구 값 | 신 질의 적용 시 | 신 값 출처 | 모순 |
|:--|:--|:--|:--|:--|
| 실측3 M4-b 실행 직후 §2-5 (삭제 직후) | `restored 0` · `content true(공허)` | `backup 2 / joined 0 / restored 0 / content **false**` | **본 Task 실측**(state_a, 분모 2 동일) | **아니오** — 정정 목적(true→false), `restored 0` 동일 |
| 실측6 M4-b 1차 (ROLLBACK 후) | `restored 0` · `content true(공허)` | `joined 0 → content **false**` | **본 Task 실측**(state_a 동일 구조: 조인 0 → false) | **아니오** — 같은 공허 상태 |
| 실측6 M4-b 2차 (충돌 해소 후) | `restored 2` · `content true` | `backup 2 / joined 2 / restored 2 / content **true**` | **본 Task 실측**(state_b, 분모 2 동일) | **아니오** — 전부 동일 |
| 실측4 M5 실행 직후 §3-5 | `restored 0` · `content false` | `backup 3 / joined 3 / restored 0 / skipped 3 / content **false**` | **논리 도출**(B-392 픽스처 미재실행 — 본 Task에는 "전 행 mismatch·조인 3" 상태 없음) | **아니오** — false 동일, `skipped 3` 신설 |
| 실측6 M5 §3-5(정정본) | `restored 1` · `content false` · 구 join 3 | `backup 3 / joined 3 / restored **1** / skipped **2** / content **false**` | **본 Task 실측**(state_c 건너뜀, 분모 3 동일) | **아니오** — `restored 1` 동일, `false` 동일, `skipped 2 = 3−1` |
| 실측2 M4 실행 직후 §1-5 | `restored 0` · `same 0` · `status false` · 이력 15 | `backup 15 / joined 15 / restored 0 / same 0 / skipped 15 / status **false**` | **논리 도출**(B-392 분모 15 · 본 Task 픽스처는 3) | **아니오** — false 동일 |
| 실측6 M4 §1-5(정정본) | `restored 14` · `same 14` · `status false` · 구 join 15 | `backup 15 / joined 15 / restored **14** / same **14** / skipped **1** / status **false**` | **논리 도출**(B-392 분모 15 · 본 Task 픽스처는 3, 구조는 state_c 실측과 동일) | **아니오** — `restored/same/false` 동일, `skipped 1 = 15−14` |

- 정정 전 공허 상태의 `true`는 신 질의에서 전부 **false**로 바뀜(의도된 정정) — 나머지 값은 전부 동일하므로 **B-392 결과와 모순 없음**.

## 로컬 동작 확인 (scratch/ 임시 · 결과는 건수·true/false·exit만)

**세 질의 × 3상태 결과표 (분모 = 백업 건수, 실제 질의 결과)**

| 질의 | 상태 | backup | joined | restored | 그 외 | 판정 (신) | 정정 전 |
|:--|:--|--:|--:|--:|:--|:--|:--|
| §2-5 (M4-b, 백업 2) | (a) 공허(조인 0) | 2 | 0 | 0 | — | `content_matches` **false** | `content` **true**(공허 재현) |
| | (b) 전부 일치 | 2 | 2 | 2 | — | **true** | — |
| | (c) 1건 불일치 | 2 | 2 | 1 | — | **false** | — |
| | `dup_invoice_no` (불변) | — | — | — | **0** | — | — |
| §1-5 (M4, 백업 3) | (a) 공허(조인 0) | 3 | 0 | 0 | same 0 · skipped 3 · 이력 0 | `status_matches` **false** | **true**(공허 재현) |
| | (b) 전부 일치 | 3 | 3 | 3 | same 3 · skipped 0 | **true** | — |
| | (c) 1건 변경(M4 이후 변경=복원 제외) | 3 | 3 | 2 | same 2 · **skipped 1** | **false** | — |
| §3-5 (M5, 백업 3) | (b) 전부 일치 | 3 | 3 | 3 | skipped 0 · settled_without 0 | `content_matches` **true** | — |
| | 건너뜀 2건(X2=신규 run, X3=청구항목) | 3 | 3 | **1** | **skipped 2** · settled_without 0 | **false** | — |
| | (a) 공허(조인 0) | 3 | 0 | 0 | skipped 3 · settled_without 0 | **false** | **true**(공허 재현) |

- **exit 코드**: §2-5 파일 **exit 0** · §1-5 파일 **exit 0** · §3-5 파일 **exit 0** (`-v ON_ERROR_STOP=1`, 오류 0건).
- **§3-5 `restored`/`skipped` 기대 일치**: 건너뜀 상태의 `restored 1`·`skipped 2`가 **실행 전 기대(복원 1 · 건너뜀 2 = 픽스처 2건)**와 일치 ✓ (지시 예시 "백업 3 중 1 복원·2 건너뜀"과 일치). `restored + skipped = backup 3`은 여집합에 따른 **항등식이라 근거가 아니고**(Aiden 지적 1), `skipped` 2건은 신규 run·청구항목 보유(정상 건너뜀)를 사후 대조로 확인.
- **§3-5 건너뜀 시 `content false`는 정상**: PASS 근거는 ① `joined_rows = backup_rows`(행 누락 없음) ② `restored`·`skipped`를 **실행 전 기대 건수와의 대조**(`skipped 2` ↔ 예정 건너뜀 2)이며, `skipped` 사유(신규 run·청구항목)를 대조한다. `content_matches`는 전부 복원(불일치 0)일 때만 true.
- **정정 전 공허 `true` 대조**: 세 질의 모두 (a) 상태에서 구 `NOT EXISTS` 질의 = **true**, 신 가드 질의 = **false** (위 표).
- **§1-5 state_b 교정 이력(정직 기재)**: 1회차는 재삽입 시각 차이로 `updated_at` 불일치 → `restored 0`(기대 3). 타임스탬프 고정 후 재실행하여 기대값 일치 — **1회차 결과는 무효(픽스처 오류), 2회차가 유효 결과**.

**[보완 반영] 필수 1 — 커밋된 계획서 SQL 추출 후 재실행 (Jaison)**

- **추출**: `git show HEAD:<계획서>` → `awk`(§·검증 절 머리 → 첫 sql 코드 블록)로 `scratch/b393_extract_{m4,m4b,m5}.sql` 신규 생성(21·15·23줄, 저장소 파일 이동·덮어쓰기 0). 대상 커밋 = 판독 규칙 보완 커밋 `0cab95d7f`의 계획서.
- **① 이전 임시 SQL과의 diff(차이 줄 수)**: 원시 `diff` = **m4 83줄 · m4b 66줄 · m5 102줄** — 임시 SQL이 픽스처·상태 전이·`\echo` 라벨·구질의(`NOT EXISTS`)를 포함하기 때문(구조 차이). 주석·공백·메타명령 제거 후 **질의 본문 대조**: m4b **2/2 일치**, m5 **3/3 일치**, m4 **2/3 일치**. **유일한 실질 차이 1건 = §1-5 query2의 라벨용 별칭**(`임시: AS m4_history` ↔ `계획서: 별칭 없음`) — 결과값 동일(둘 다 이력 건수), **계획서 변경 불필요(계획서 쪽이 기준)**.
- **② 추출 SQL로 3상태 재실행(값·분모 포함, 전부 exit 0, 오류 0)**:

| 질의 | 상태 | backup | joined | restored | 그 외 | 판정 |
|:--|:--|--:|--:|--:|:--|:--|
| §1-5 | (b) 전부 일치 | 3 | 3 | 3 | same 3 · skipped 0 · 이력 0 | `status_matches` **t** |
| | (c) 1건 변경 | 3 | 3 | 2 | same 2 · skipped 1 · 이력 0 | **f** |
| | (a) 공허 | 3 | 0 | 0 | same 0 · skipped 3 · 이력 0 | **f** |
| §2-5 | (b) 전부 일치 | 2 | 2 | 2 | dup 0 | `content_matches` **t** |
| | (c) 1건 불일치 | 2 | 2 | 1 | dup 0 | **f** |
| | (a) 공허 | 2 | 0 | 0 | dup 0 | **f** |
| §3-5 | (b) 전부 일치 | 3 | 3 | 3 | skipped 0 · settled 0 | `content_matches` **t** |
| | 건너뜀 2 | 3 | 3 | 1 | skipped 2 · settled 0 | **f** |
| | (a) 공허 | 3 | 0 | 0 | skipped 3 · settled 0 | **f** |

- 재실행 값은 **기존 3상태 결과표와 전항 동일** → "테스트한 SQL = 문서화한 SQL" 충족(추출본 기준). 픽스처 잔류 0(재확인).

**[보완 반영] 비차단·Aiden 지적**

1. **판독 규칙 3곳 보강**(계획서 커밋 `0cab95d7f`, +3/−3 — SQL 블록 md5 불변 확인): `restored + skipped = backup_rows`는 **항등식이라 근거 아님**을 명시하고 PASS 근거를 ① `joined_rows = backup_rows`(행 누락 없음) ② `restored`·`skipped`를 **실행 전 기대 건수와의 대조**로 교체 · **행이 없는 백업 건도 불일치로 센다**(LEFT JOIN 엄격 동작) 한 구절 추가 · **`false`가 곧 실패는 아니며 `skipped` 사유 대조로 판정**(§1-5·§3-5) 한 줄 추가.
2. **B-392 값 비교 표에 `신 값 출처` 열 신설** — 실측 4행(state_a/b/c, 분모 동일)과 논리 도출 3행(분모 15 또는 상태 미실행)을 구분.
3. **hunk 기준 명시**: `-U0` 기준 10개 / 기본 문맥 기준 5개(위 정정 표 갱신).

**원상 복구 (DoD 4)**

- `supabase db reset` **exit 0** → 마이그레이션 이력 **319**(시작 상태 동일) · `check-db-freshness` **OK**(pending 0)
- 픽스처 잔류: 인보이스 **0** · 오더 **0** · 조직 **0** · `rollback_bak` 테이블 **0** · `B381_M4` 이력 **0** · statement **0** · run **0**
- `git status`: 커밋 전 = 계획서 정정 **1건만**(임시파일 0) → 계획서 커밋 후 **0건** (실측)

**범위·금지 준수**

- 임시 SQL 3파일은 `scratch/`에만 생성, **커밋 0** · 저장소 파일 이동·리다이렉트 **0** · `db reset` 외 운영 접속 **0**(R-14)
- 재리허설(M4·M4-b·M5 왕복 전체)·§4 문구의 UNIQUE 충돌 시나리오 직접 실행: **미실행(이 Task 범위 밖 — 이슈에서 명시)**. §4 정정의 근거는 B-392 실측6 1차(전체 ROLLBACK·복원 0)·2차(해소 후 2)와 §2-4 문구 대조.

## [DoD]

- [x] 정정 4곳(§4 M4-b 행 377행, §2-5 245~262행, §3-5 339~364행, §1-5 135~158행) 각각 반영 + §8 매핑표(426~437행) · 범위 밖 미변경 diff로 확인(hunk 10개 = 해당 위치만, +67/−33)
- [x] 구 → 신 매핑 표 + B-392 결과와의 값 비교 표 (위 2개 표)
- [x] 세 질의 3상태 결과표(공허·전부 일치·1건 불일치) · 정정 전 공허 `true` 대조 · §3-5 `restored 1`/`skipped 2` 확인
- [x] 세 질의 exit 0 · `db reset` 원상복구(이력 319·잔류 0·freshness OK) · `git status` 0건(계획서 커밋 후)
- [x] 추가된 줄에 절대경로·계정·운영 식별자·운영 값 없음 (정정 커밋 추가줄 grep 0건 · scratch/ 커밋 0)
- [x] B-392 task file(Baker) 미수정 (diff 0줄)
- [x] 완료 절차 R-17 준수 (문서 PR만 · `gh pr checks` 출력 그대로 인용 코멘트 · 병합은 Jaison)

## [작업 결과]

- 계획서 정정 커밋: `ae9e9a778`
- PR: [#1547](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1547) (`Refs #1529` · `Refs #1539` · `Refs #1546`, base `TeamB_Dev`, 병합은 Jaison) · head `3c19103ec`
