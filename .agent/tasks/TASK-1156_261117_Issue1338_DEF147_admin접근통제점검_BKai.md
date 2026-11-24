# TASK-1156: Issue #1338 — DEF-147 admin 접근통제 점검 (점검·보고)

| 항목 | 내용 |
|:-----|:------|
| **Task** | TASK-1156 |
| **관련 Issue** | [#1338](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1338) |
| **근거 결함** | `DEF-147_admin페이지_역할게이트_미들웨어단독.md` |
| **수행(Worker)** | B_Kai (Team A) · **검증(Auditor)**: Aiden (R-01) |
| **성격** | **점검·보고 전용 — 소스 수정 금지** (수정은 Aiden이 별도 Task로 발령, R-18) |
| **브랜치** | `feature/teama-task-1156-def147-admin-access-audit` (base `origin/develop` `d4629151`) |
| **작성일** | 2026-11-17 (점검 실시 2026-11-17~18) |
| **산출물** | `docs/08_Self_Audit/Reviews/TASK-1156_DEF-147_admin_접근통제_점검.md` |

---

## 1. 목표

미들웨어(`src/lib/auth/proxy.ts`)가 **비플랫폼 조직(화주·대리점 등)에게 의도적으로 개방**한 8개 경로에 대해,
경로별 × 역할별로 **① 렌더되는 데이터 ② 쓰기 UI 존재 ③ 서버 액션 역할 검사 ④ 비관리자 세션에서 쓰기 거부 실증**을 확인하고,
`admin/layout.tsx` 서버측 게이트(P4 ①) 도입 시 **개방 경로를 깨지 않는 경로별 허용 역할 표**를 제안한다.

## 2. 전제조건 / 범위

- 점검 대상 8경로: `/admin/rates`, `/admin/transport-costs`, `/admin/customs-rates`, `/admin/delivery-rates`,
  `/admin/ups-rates`, `/admin/exchange-rates`, `/admin/ups-actual-charges`, `/finance/daily-billing`
- 역할 4구분: 화주(`CORPORATE`/`AGENCY_SHIPPER`) · 대리점(`AGENCY`) · 플랫폼 직원(`MANAGER`/`OPERATOR`) · 관리자(`ADMIN`)
- **소스 변경 0건**. 로컬 Supabase만 사용(R-14), 원격/Pilot 접근 금지.
- 점검 스크립트는 `scratch/`(비커밋, R-13). 실증 산출물(스크린샷·JSON)은 `docs/` 하부.

## 3. DoD 체크

- [x] 8개 경로 전부 결과표 기재(미점검 0) — 리뷰 문서 §3
- [x] `ups-actual-charges` RLS 정책 범위를 migration 파일:행 인용으로 기재 — §4.1
- [x] 각 판정에 근거(실증 로그·스크린샷) — §5 + `assets/TASK-1156/`, 부록 A
- [x] P4 게이트 설계 제안(경로별 허용 역할 표) — §7.2
- [x] DEF-149 연계 실증(대리점 5함수·`org_id` 변조) — §5.5, 부록 A.4
- [x] 소스 변경 0건 (`git diff --stat` = 문서만)
- [x] R-17 완료 보고(커밋 → task file → `status:review` → PR) — 완료(PR #1383)

## 4. 작업 계획

| 단계 | 내용 | 상태 |
|:--|:--|:--|
| 1 | Git 동기화 + 격리 워크트리 확인 + Issue `status:in-progress` | ✅ |
| 2 | 정적 분석: 미들웨어 화이트리스트 / 레이아웃 / 페이지 가드 / 서버 액션 가드 | ✅ |
| 3 | DB 계층: 8경로 관련 테이블 RLS 정책 추출(migration 인용 + `pg_policies` 실측) | ✅ |
| 4 | 실측: 역할별 실제 로그인 → 8경로 `page.goto()` (Playwright, 프로덕션 빌드 3101) | ✅ (261118 재실행 완료) |
| 5 | 쓰기 거부 실증: 비관리자 세션 PostgREST INSERT 시도 | ✅ |
| 6 | 판정·결함/개선 후보 정리 + P4 게이트 설계 제안 + DEF-149 연계 | ✅ |
| 7 | 리뷰 문서 작성 + R-17 완료 보고 | ✅ (커밋·label·PR #1383 완료) |

## 5. 점검 결과

상세는 `docs/08_Self_Audit/Reviews/TASK-1156_DEF-147_admin_접근통제_점검.md` 참조.

- 8개 경로 × 8역할 = **64셀 전부 실측**(미측정 0). 미들웨어는 조직 유형만 보고 전 경로를 통과시키나, 페이지 서버 역할 게이트는 4개 경로에만 존재 → 4개(`rates`·`customs-rates`·`delivery-rates`·`ups-rates`)는 구조적 공백.
- 🔴 High (`DEF-153` 연계): 비관리자 세션의 요율 카드 데이터 계층 접근 이슈 보고 → **해소됨 (`TASK-1166` PR #1399)**.
- ⚠️ Medium: 대리점 실비 저장 코드 가드·UI vs RLS 불일치.
- ⛔ Low(신규): 운송사(`CARRIER`) `/admin/transport-costs` 진입 시 HTTP 500 3회 반복 재현(가용성 결함).
- ✅ 쓰기 상승 실증은 전부 차단.
- `DEF-149` 연계(§5.5): `agency/shippers.ts` 소유권 검증 보완 대상 보고 → **해소됨 (PR #1473)**.
- 리뷰 문서 §7.2에 경로별 허용 역할 표(P4 ① 설계안) 제시. 🔶 4건은 Aiden 확정 대기.

## 6. 발견 사항 (R-18/R-15)

- R-18(R-15 v3.8 준수): High 1건(`zen_rate_cards` RLS), Medium 1건(대리점 UPS 실비 쓰기 불일치), Low 1건(운송사 transport-costs 500)을 Aiden에 보고. **본 Task는 점검 전용이라 DEF 파일 생성·소스 수정 없음.**
- R-15: IMP 후보 4건을 리뷰 문서 §8.3에 기재. IMP 번호 부여·`scratch/post_launch_improvements.md` 수정은 하지 않음(Aiden 전속).
- DEF-149는 Riley가 #1349로 Team B에 수정 요청한 기 등록 결함이므로 중복 등록하지 않고 실증 근거만 공유.
- Aiden 회신 4건 모두 반영: ① IMP Issue 템플릿 방식 ② #1344 기대값 TASK-1162(#1344는 Riley 이관) ③ SQL을 부록에 커밋 ④ #1347 설계 게이트는 후속 Task.
- 부수 발견(로그인 폼 JS 미동작 시 GET 폴백 → 비밀번호 URL 노출)은 리뷰 문서 §8.3-4에 IMP 후보로 기록.
- R-06: 이 세션에는 Context7 MCP가 노출되지 않아(사용 가능 도구 목록에 `context7` 없음) 외부 문서 참조 없이 저장소 코드·로컬 DB 실측만 근거로 사용했다. Aiden에게 보고함.

## 7. Aiden 확인 요청

1. §8.1 결함 3건의 별도 Task 발령 여부(특히 #1 High 우선, #3 Low는 병합 가능).
2. §7.2 경로별 허용 역할 표의 🔶 4건 확정 → P4 ① `admin/layout.tsx` 게이트 구현 Task 발령.
3. DEF-149 §1.3(조회 액션 4건 역할 가드) 별도 Task 발령 여부.
4. #1346 파트2 입력으로 부록 A.1·A.4 재사용 승인.

## 8. 세션 재개 기록 (2026-11-18)

- 261117 `_RESUME_BKai_261117.md` 지시대로 정식 워크트리(`~/workspace/ZENITH_LMS-worktrees/b_kai`)만 사용. 중첩 detached 워크트리(`…/ZENITH_LMS-worktrees/ZENITH_LMS-worktrees/b_kai`)는 `git worktree remove --force`로 정리 완료.
- `agent-worktree-init.sh`는 실행하지 않음(미커밋 WIP stash 위험). 기존 브랜치·미커밋 산출물 유지.
- `tests/poc-231/`(coverage/mutation 리포트)는 TASK-1152 PoC 기준선 산출물로 본 Task 범위 외 → 본 PR에 커밋하지 않고 워크트리에 보존. PR #1318(Draft·do-not-merge)는 변경 없음.
- 프로덕션 빌드 서버 `next start -p 3101`을 재기동해 실측 재실행. 로컬 Supabase는 기 가동 중인 인스턴스 사용(R-14).

## [작업 결과]

**수행자**: B_Kai (Team A) · **완료일**: 2026-11-18 · **검증자**: Aiden (R-01)

- 코드 커밋: `bc095f3eeada1ff1c45a0ade640ed0b38fcff178`
  - 커밋 메시지: `[B_Kai] docs: TASK-1156 DEF-147 관리자 접근통제 점검 완료 (#1338)`
  - 성격: **점검·보고 전용** — `src/`·`supabase/` 소스 변경 0건(문서·task file·스크린샷만 커밋)
- 산출물 커밋 파일: 리뷰 문서 1 · task file 1 · 실측 스크린샷 64개 = 66 files changed, 660 insertions
- GitHub: Issue #1338 `status:review` · PR #1383 (`Closes #1338`, base `develop`) · CI 6/6 통과
- R-17 순서: 코드(문서) 커밋 → task file `[작업 결과]` → `status:review` → `check-R17-DoD` → 문서 커밋 → PR 생성 ✅

## [Aiden 검토] — 2026-11-18 10:35 KST

**판정**: 내용 승인(우수) / R-17 보완 2건 지시 → 라벨 `status:review` → `status:rework` 전환.

| # | Aiden 지적 | 조치 | 상태 |
|:-:|:--|:--|:-:|
| 1 | DoD 마지막 항목 `R-17 완료 보고 … 진행 중` 미체크(`[ ]`), §4 단계 7도 `진행(커밋·label·PR 대기)` | DoD 7/7 전부 `[x]`, §4 단계 7 → ✅ (PR #1383 완료)로 정정 | ✅ |
| 2 | task file에 커밋 해시 부재(`[작업 결과]` 형식 미준수) | `scripts/insert-commit-hash.sh`로 HEAD 40자 해시 자동 삽입(수동 타이핑 금지) → `bc095f3eeada1ff1c45a0ade640ed0b38fcff178` | ✅ |

- §8.1 High 결함(`zen_rate_cards` 화주 세션 전량 조회·원가/마진 노출)은 Aiden이 별도 DEF로 분리 등록·Edward 보고 → 본 PR 추가 조치 없음.

## [자가검증 — check-R17-DoD]

`opencode.json`의 `check-R17-DoD` 템플릿 = GOV_COMMON.md R-17 v3.0(208~215행) 전 단계 자가 점검.

| # | R-17 단계 | 증거 | 판정 |
|:-:|:--|:--|:-:|
| 1 | 코드(문서) 커밋 | `bc095f3eeada1ff1c45a0ade640ed0b38fcff178` (`[B_Kai] docs: TASK-1156 … (#1338)`) | ✅ |
| 2 | `[작업 결과]` 섹션 + 40자 해시 | 위 섹션. 스크립트 자동 삽입, `TBD`·`<PLACEHOLDER>` 0건 | ✅ |
| 3 | Issue 라벨 `status:review` | `status:rework` → `status:review` 재전환 + PR 코멘트 보고 | ✅ |
| 4 | 자가검증 전항목 통과 | 본 표 전부 ✅, 미해결 ❌ 없음 | ✅ |
| 5 | 문서 커밋(task file만) | `52f928cf` (`[B_Kai] docs: TASK-1156 R-17 보완 …`) push | ✅ |
| 6-보완 | CI 재통과 | PR #1383 checks 6/6 Passed, 0 Failed (보완 push 후 재확인) | ✅ |
| 6 | PR 생성 + `Closes #NNN` + DoD 체크리스트 | PR #1383 (`Closes #1338`), 본문 DoD 체크리스트 보완 반영 | ✅ |
| 7 | ✅ 전환은 Aiden 단독 | 본 Agent는 머지하지 않음 | ✅ |

- DoD 체크: 7/7 `[x]`, 미체크 `[ ]` 0건.
- 폐지 파일(`.agent/ACTIVE_TASK.md`·`scratch/IMP_PROGRESS.md`) 갱신 대상 아님(R-17 v3.0).
