# TASK-B-404 (Issue #1582) — develop→TeamB_Dev 동기화·충돌 해소 + 마이그레이션 적용 계획서 갱신

| 항목 | 내용 |
|:--|:--|
| **Issue / Task** | [#1582](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1582) / `TASK-B-404` |
| **Worker / 검증 / R-01** | Baker / Jaison / Aiden |
| **우선순위 / 복잡도** | p1 / 단순 Task(설계 생략) |
| **상태** | 착수 — `2026-11-28 12:51:40 KST` (Issue 라벨 `status:in-progress` 확인) |
| **브랜치** | `feature/teamb-task-b404-sync-develop` (base `origin/TeamB_Dev` `eb29ffd2f137c314d330a0b366558c69b35de43d`, 최종 head `90ca25b85f45b7352480efb34763066d020b8601`) |
| **병합 대상** | 1차 `origin/develop` `a5a1e45a14cce4c6302cceebd211522997236647` → 재병합 `origin/develop` `7a773e984911964a1a1ebf32d8373288eee0e7d3`(PR #1583 병합분) |
| **채번 근거** | `git fetch origin` 후 `./scripts/next-task-number.sh B` → `TASK-B-405` (Issue 제목 자체를 카운트하는 스크립트 결함 — B-399 선례와 동일). Issue #1582 제목은 `TASK-B-404`, `TASK-B-405` 이슈·원격 브랜치·task file은 각각 0건, `task-b404` 원격 브랜치 0건 → **`TASK-B-404` 확정**. |
| **연관** | EPIC #1364, Aiden 12/2 시연 통합 준비 지시(issue #1364 코멘트), 통합 PR #1448 |

## 목표 (Issue 원문 기준)

1. **develop → TeamB_Dev 동기화·충돌 해소** (기한 11/30(월) 12:00)
   - 일반 병합만 허용 — **force-push·rebase 금지**. 통합 PR #1448 충돌 상태 해소가 목적.
   - develop에만 있는 마이그레이션 2건(`20261122100100`, `20261122100200`) 반영.
   - `Ds_11_04`의 R-21 정리 문구(PR #1574 병합분)는 **develop 쪽 문구 채택**.
   - 최신 `origin/TeamB_Dev`에서 작업 브랜치 생성 → `origin/develop` 병합 → PR(base `TeamB_Dev`). 충돌 파일별 방침은 PR 본문에 **파일명 + `develop 채택`/`TeamB_Dev 채택`/`양쪽 반영`** 으로만 기재.
2. **동기화 직후 통합 PR CI 확인** — `gh pr checks 1448` **원문**과 `Regression Tests` 통과 여부 보고(로컬/CI 구분).
3. **마이그레이션 적용 계획서 갱신** (기한 12/1(화) 12:00) — `git diff --name-only origin/develop...origin/TeamB_Dev -- supabase/migrations`의 **전 파일**(IS #1579 핫픽스 포함)에 대해 적용 순서·롤백 SQL·검증 질의·백업 확인 지점 정리. 기존 `TASK-B-389`·정정 `TASK-B-391` 계획서 기준 + 병합 최신본 확인. **정책 제거(b375)는 앱 배포 뒤 마지막**.
   - 결과물은 **로컬 `scratch/`에만 두고 커밋 금지**. Jaison에게 파일 경로 없이 **요지(건수·순서)만** 보고 → Jaison→Edward 비공개 경로.

## 범위 밖 / 공개 저장소 수칙

- M4·M4-b·M5 재리허설, 별도 데이터 작업 계획.
- **PR #1575(B-399 PR1)는 통합 이후로 병합 보류**(Aiden 권고) — 본 Task에서 머지하지 않음.
- R-21: **운영 반영 여부 확인표·적용 결과를 저장소·Issue에 쓰지 않음**. Jaison→Edward 비공개 경로만 사용. R-14: 운영 DB 접속·호출 없음. 실제 계정·식별자·요청/응답 원문·절대경로 미기재.

## 사전 경고 대응 (Issue 명시)

- 확인 결과는 **실제 명령 출력**(건수·exit·true/false)으로만 기재. 미실행 항목은 "미실행(사유)"로 명시.
- PR 전 `git log origin/TeamB_Dev..HEAD`로 **병합 커밋과 충돌 해소 커밋만** 있는지 확인(공유 브랜치 오염 방지).
- 모든 시각은 `date` 출력 그대로 사용.

## DoD (Issue 원문 체크리스트)

- [ ] develop 병합 완료(force-push 없음), 충돌 파일별 해소 방침 기재
- [ ] `Ds_11_04`는 develop 문구 채택 확인
- [ ] `gh pr checks` 원문 인용(통합 PR #1448 포함), 로컬/CI 구분
- [ ] 적용 계획서 갱신 요지 보고(저장소 커밋 없음), 추가 줄에 절대경로·계정·운영 식별자 없음

## 작업 결과 — `2026-11-28 12:57:42 KST` (`date` 출력)

### 1. develop 병합 (기본 병합 / force-push·rebase 없음)

| 항목 | 실측 |
|:--|:--|
| 병합 커밋 | `1f3067ad50a493c6cc6dc614a2e6ec5a6c2539c9` |
| 부모 2개 | `eb29ffd2f137c314d330a0b366558c69b35de43d`(TeamB_Dev) + `a5a1e45a14cce4c6302cceebd211522997236647`(develop) |
| 충돌 | **14건** — 전건 해소, 미해소 경로 **0**, 해소 파일 내 충돌 마커 **0** |
| 해소 방침 | develop 채택 **2건** / TeamB_Dev 채택 **10건** / 양쪽 반영 **2건** (파일별 표는 PR 본문) |
| LRTM 재생성 | `npm run build:lrtm` exit 0 — `Vitest 316파일 / 2330케이스 | 아카이브 2파트 | 신규 항목 38건` |
| 브랜치 오염 | `git log --first-parent origin/TeamB_Dev..HEAD` = 병합 커밋 **1건**. `origin/TeamB_Dev..HEAD` = 45건(develop 44 + 병합 1). `origin/develop`에 없는 유일 커밋 = 위 병합 커밋 **1건** |
| PR diff | `git diff --stat origin/TeamB_Dev...HEAD` = **171 files changed, 3397 insertions(+), 1411 deletions(-)** |

- develop 전용 마이그레이션 2건(`20261122100100`, `20261122100200`)은 양쪽 모두 `origin/develop` 대비 diff **0줄**.
- `Ds_11_04` — develop R-21 문구(`목표: 인보이스 접근 권한 정렬 대상`, `목표: 조회 권한 역할 정렬 대상`) **3줄 유지**, 기존 표현 **0건**, develop 대비 해당 문구 차이 **0건**.

#### Aiden R-01 필수 2건 반영 — 재병합 (`2026-11-28 14:32:02 KST` 푸시)

| 항목 | 실측 |
|:--|:--|
| 병합 커밋 | `ef0189f4fd3b336947d5a497517687b2a68a47ee` |
| 부모 2개 | `f7f4d59d258accef3aca36895f267f905421d8ef`(1차 작업 HEAD) + `7a773e984911964a1a1ebf32d8373288eee0e7d3`(최신 develop = PR #1583 병합분) |
| 조상 확인 | `git merge-base --is-ancestor origin/develop HEAD` 통과(재병합 전에는 미통과) |
| 충돌 | `Ds_11_11B_UPS_Agency_Actuals.md` **1건** → 충돌 구간마다 develop R-21 목표 상태 문구 채택, TeamB_Dev 구조(§11.19·§11.20 등) 유지. 파일 통째 채택 안 함 |
| `DEF-150` | 제목·긴급도·권장 조치 6줄 develop 문구로 자동 병합 반영 |
| 현재 가드 여부 서술 | `Ds_11_11B` **0건**, `DEF-150` **0건** (건수만 기재, 문구 미인용) |
| 미해소·충돌 마커 | **0건 / 0건** |
| 방식 | 일반 병합 — force-push·rebase **없음** |

### 2. 정적 검증 (로컬)

| 명령 | 결과 | exit |
|:--|:--|:--:|
| `./scripts/check-db-freshness.sh` | **오탐** — `exit 0`이지만 실제로는 develop 유입 2건 미적용(아래 발견 이슈 참조) | 0 |
| `supabase db reset --yes` + `scripts/seed-local.ts` | 로컬 DB 재생성 · 1173/1174 적용 확인(이력 RLS `t`, 정책 2건) · 시드 무결성 PASS | 0 / 0 |
| `npm run check:ds11` | 액션 305 / 언급 184 / 미반영 121(허용 목록 121) | 0 |
| `npm run check:lrtm` | Vitest 316 / 등재 218 / 미등재 98(허용 98) / 유령 0 / E2E 미표기 0 | 0 |
| `npm run check:doc-links` | 깨진 링크 84(허용 목록 84) | 0 |
| `npm run check:evidence` | 증적 신규·변경 0건 | 0 |

재병합 후 위 4종을 **다시 실행**해 모두 exit 0을 확인했습니다(`check:ds11` 305/184/121, `check:lrtm` 316/218/98·유령 0, `check:doc-links` 84/84, `check:evidence` 변경 0건).

### 3. 회귀 / CI (로컬과 CI를 구분)

- 로컬 전체 회귀 1차(`12:54:55 KST` 시작, `773.61s`): **실패** — `Test Files 5 failed | 310 passed | 1 skipped (316)`, `Tests 39 failed | 2329 passed | 1 expected fail | 41 skipped (2410)`. 원인은 병합 코드가 아니라 **로컬 DB 정합성**이었습니다(아래 발견 이슈).
- 로컬 DB 재생성 후 실패 5개 파일 재실행(`13:10:59 ~ 13:12:32 KST`): **5 files / 106 tests 전부 PASS**, exit 0.
- 로컬 전체 회귀 2차(`13:12:40 ~ 13:26:10 KST`, `808.39s`, exit 0): **PASS** — `Test Files 315 passed | 1 skipped (316)`, `Tests 2393 passed | 1 expected fail | 16 skipped (2410)`. (1차 실패분 포함 전 파일 재실행 결과이며, CI 결과가 아님.)
- CI — 통합 PR #1448, `2026-11-28 12:57:42 KST` 및 동기화 PR 생성 후 `13:28:24 KST` **두 차례 동일 원문**:

```
$ gh pr checks 1448 --repo EdwardKwon89/ZENITH.KR.LMS
no checks reported on the 'TeamB_Dev' branch
```

두 차례 모두 `exit 1`. **CI 통과를 주장하지 않습니다.** PR #1448은 base `develop` ← head `TeamB_Dev`, state `OPEN`, `mergeable=CONFLICTING`, `mergeStateStatus=DIRTY` (동기화 PR 병합 전 시점). 로컬 회귀 PASS는 CI 결과가 아닙니다.
- 동기화 PR #1584의 CI — 재병합 푸시 후 `2026-11-28 14:40:22 KST`(head `ef0189f4`) 및 task file 반영 커밋 푸시 후 `2026-11-28 14:53:10 KST`(head `90ca25b85`) **두 차례 모두 8/8 pass**, `exit 0`. 최종 회귀 `Regression Tests` **pass(11m14s)**. 나머지 7건도 전부 pass(Dependency Audit / Docs Sync / Evidence Escape / LRTM Sync / Task File Check / Type Check / Vendor Integrity). 원문은 PR 본문에 기재. 이는 **본 동기화 PR(head 브랜치)의 CI**이며, 통합 PR #1448의 CI가 아님(#1448은 `14:40:22 KST`에도 `no checks reported`, `exit 1`). 병합 후 #1448 재확인은 Jaison·Aiden.
- 재병합은 문서 2개 파일만 변경(코드·마이그레이션 변경 0건)했으므로 위 로컬 회귀 2차 결과(2393 passed)는 그대로 유효합니다. Aiden이 재실행하지 않은 로컬 결과이며 CI 결과와 별개입니다.
- `gh pr checks 1584`는 푸시 직후 `14:32:02 KST`에 `no checks reported on the 'feature/teamb-task-b404-sync-develop' branch`(`exit 1`)를 반환했고, 약 50초 뒤 8건이 등록돼 `14:40:22 KST`에 8/8 pass를 확인했습니다(CI 등록 지연).

### 4. 마이그레이션 적용 계획서 갱신 요지 (로컬 scratch에만 보관 / 커밋 없음 / 경로 미기재)

- 대상 **13건** = `git diff --name-only origin/develop...origin/TeamB_Dev -- supabase/migrations` **10건** + IS #1579 핫픽스 **1건(미작성·OPEN)** + develop 유입 **2건**.
- 적용 순서: `b365 → b359 → b360 → b378 → b382 → M1 → M2 → M3 → PR-4a(주석) → develop 유입 2건 → #1579 핫픽스 → [데이터 M4 → M4-b → M5] → 앱 배포 → b375(정책 제거, 마지막 1건)`.
- 롤백 순서: 앱 롤백 → b375 조건부 재생성 → 데이터 `M5 → M4-b → M4` → `M3 → M2 → M1` → 핫픽스 → develop 유입 역순 → `b382 → b378 → b360 → b359 → b365` (B-389 §7 준수).
- 백업 확인 지점 **13개**: 스냅샷 BK-0·1a~1c·2a~2c·3·4·5(10개) + 데이터 `rollback_bak` 3종(B-389 §1-2·2-2·3-2). 검증 질의 **13세트** + 공통 불변식.
- B-387 실측 반영: 왕복 후 **b378 수정본 소실** → 재적용 체크리스트에 b378 명시. B-391 정정 7건·B-393 컬럼 매핑 반영.
- IS #1579: 세부 대상 함수·현재 권한 상태는 비공개 전달 사항 → 계획서에는 **목표 상태만** 기재. 로그인 전 흐름·트리거는 범위 밖.

### 5. 발견 이슈 (본 Task 범위 밖 — Jaison 보고)

- `scripts/check-db-freshness.sh`가 **오탐**을 냈습니다. Supabase CLI `2.122.1`의 `supabase migration list --local` 출력이 `|` 구분 표가 아닌 **JSON**이어서, 스크립트의 `awk -F'|'` 파싱이 pending을 0건으로 계산했습니다(`exit 0`).
- 실제 출력에는 `{"local":"20261122100100","remote":""}`, `{"local":"20261122100200","remote":""}` **2건**이 pending이었고, 로컬 DB에는 해당 뷰 화이트리스트·감사 이력 RLS가 반영되지 않았습니다(이력 테이블 `relrowsecurity=f`, 정책 0건). 여기에 이전 회귀 실행의 픽스처 잔존(청구서 헤더 행)이 겹쳐 1차 회귀 39건이 실패했습니다.
- 조치: `supabase db reset --yes` + `scripts/seed-local.ts`로 로컬만 재생성(R-14 준수, 운영 접속 0건) → 실패 5개 파일 106/106 PASS. **저장소 스크립트는 수정하지 않았습니다**(본 Task 범위 밖 — DEF 등록·배정은 Jaison 판단).
- 1차 실패를 "회귀 실패"로 보고하지 않고, 재현·원인·재검증 결과를 함께 기록합니다.

### 6. 범위 밖 / 수칙 준수

- PR #1575(B-399) 병합 **안 함** — #1582 지시로 통합 이후 보류.
- 운영 반영 여부 확인표·적용 결과는 저장소·Issue에 **미기재**(R-21), 운영 DB 접속·호출 **0건**(R-14). 절대경로·계정·운영 식별자 미기재.
- PR: [#1584](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1584) — base `TeamB_Dev`, head `feature/teamb-task-b404-sync-develop`(`90ca25b85`), state `OPEN`, `mergeable=true`, `Refs #1582`, `Closes` 없음(이슈 지시). 병합은 Jaison·Aiden 권한.
- Aiden R-01 필수 2건 반영 완료 → Jaison에게 건수만 보고(문구 미인용) 후 증분 재검토 요청. 권고 2건은 비차단 후속(IMP 제안 Issue, PR 본문 CI 원문 갱신 — 본문 반영 완료).

## DoD

- [x] develop 병합 완료(force-push 없음), 충돌 14건 파일별 방침 기재(PR 본문)
- [x] `Ds_11_04` develop 문구 채택 확인(3줄 유지 / 기존 0건)
- [x] `gh pr checks` 원문 인용(통합 PR #1448 포함), 로컬/CI 구분
- [x] 로컬 회귀 결과 기재(2차 315/316 파일·2393 테스트 PASS, exit 0 / 1차 실패 원인 명시)
- [x] 적용 계획서 갱신 요지 보고(저장소 커밋 없음), 절대경로·계정·운영 식별자 없음
- [x] Aiden R-01 필수 1 — `Ds_11_11B` 충돌 구간별 develop 문구 채택 + TeamB_Dev 구조 유지, 현재 가드 여부 서술 0건
- [x] Aiden R-01 필수 2 — 최신 develop(`7a773e98`) 일반 재병합, `DEF-150`·`Ds_11_11B` develop 문구 채택, 현재 가드 여부 서술 0건
- [x] 재병합 후 CI 8/8 pass(Regression Tests 7m43s), `gh pr checks` 원문 로컬/CI 구분 기재, PR 본문·task file 갱신
