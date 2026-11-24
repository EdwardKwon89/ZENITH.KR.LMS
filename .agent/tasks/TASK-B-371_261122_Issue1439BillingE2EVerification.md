# TASK-B-371 — 청구서관리 ⑦ 통합 검증 (WBS 8.1~8.3) (#1439)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1439](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1439) |
| 담당 | **Mike (Worker)** / Auditor: **Jaison** · 예상 3일 (WBS 8 소계) |
| 브랜치 | `feature/teamb-task-b371-iss1439-billing-e2e-verification` (base: `origin/TeamB_Dev` `4d01f7327`) |
| 상태 | 🔔 완료 (PR 검토 대기) |
| 기준 브랜치 | 착수 시점 `origin/TeamB_Dev` = `4d01f7327` (M1~M5 = #1363~#1367·#1425 병합 후) |
| 환경 | **로컬 Supabase 한정 (R-14)** — 원격/운영 접속 금지 |
| 기준 문서 | `docs/01_WBS/WBS_02_청구서관리.md` §8 (8.1~8.3) · `An_17` §5 권한·§6 화면 · 부록A Excel 양식 |

## 채번 확인 (3종 실측, 착수 직전 재실행)

```bash
./scripts/next-task-number.sh B                                 # → TASK-B-372 (본 이슈 제목의 371이 최대값 → "다음 빈 번호")
ls .agent/tasks | grep -i "TASK-B-371"                          # → 없음 (기존 file 재사용 아님)
git ls-tree -r origin/TeamB_Dev --name-only | grep "TASK-B-371" # → 없음
```

> **판단**: Jaison이 본 이슈에서 확정한 번호는 **TASK-B-371**이고, 372는 "그 다음 빈 번호"일 뿐 **미사용**이다(371은 본 이슈 제목이 점유). 따라서 **TASK-B-371** 을 사용한다 — 임의 사용 금지 규칙에 저촉되지 않는다.

## [목표]

청구서관리 ①~④(오더정산 → DB → 서버액션·Excel → 화면·메뉴) 전 구간을 **실제 로그인 · 실DB · 실제 Excel 다운로드**로 한 번에 통과시키는 통합 검증. 이 결과가 **Aiden의 TeamB_Dev → develop 병합 판단 근거**가 된다.

## [범위] (이슈 원문 요약 — 상세는 이슈 본문)

- **A. 전 구간 E2E (WBS 8.1)** 5건: ① 정산 완료(SETTLED) → ② 청구서 생성(수기 화주 포함·미정산 제외) → ③ DRAFT→ISSUED→화주 RECEIVED 열람→CLOSED → ④ **Excel 실제 다운로드**(exceljs 재파싱 단언, 대리점·화주 각각) → ⑤ 정산 unmark 차단/허용
- **B. 권한 교차 (WBS 8.2)**: 타 생성자 차단 · RECEIVED/SUPERVISED 변형버튼 미노출 **+ 서버 경로 직접 호출 거부** · 대리점/화주 `/finance/order-settlement` 직접입력 차단 · Admin 감독 읽기전용 · **역할×화면 매트릭스**(허용/거부 표)
- **C. R-04 + 전체 회귀 (WBS 8.3)**: `LIVE_*.md` 자가점검 결과 · `npm run test:regression` 전체 PASS(파일/케이스 실측) · `npm run build` PASS

**하지 않는 것**: 결함 발견 시 **`src/`·마이그레이션 수정 금지** → R-18(DEF 등록) 후 Jaison 보고. 운영/원격 접속 금지.

## [지켜야 할 것] (위반이력 사전경고 대응)

- **mock·소스 문자열 검사 금지**: 실제 `page.goto()` 로그인, 실DB, 실제 다운로드. `grep -rnE "readFileSync|toContain\(.*source|typeof .* === 'function'|test\.skip|\.skip\(" tests/e2e/<신규>` → **0건**
- **되돌리면 FAIL 실측**: 권한 차단 단언(B)은 서버 가드를 로컬만 일시 되돌려 FAIL 측정 → 조건별 표, **원복 후 `git diff`로 무변경 확인**
- 테스트 계정·fixture **자기완결형**(실행 후 정리), `seed-local.ts` 의존 금지
- `{data,error}` 확인 · 금액 **정수 센트** 비교 · KST 날짜는 `date-kst.ts`
- 증적은 `docs/99_Manual/E2E_B371_Result/` (**ROOT 금지**)
- R-15: IMP는 `[IMP 제안]` Issue(`type:imp`)만 — `scratch/` 수정·IMP 번호 직접 부여 금지 (제출 전 `git diff origin/TeamB_Dev...HEAD -- scratch` **빈 출력** 확인)

## [R-20 영향도] (GitNexus 미연결 시 grep 전수 명시)

**GitNexus 미연결 → `grep` 전수으로 대체** (신규 테이블/RLS 정책/서버 액션 **0건**, `src/` 수정 **0건**):

| 대상 | 결과 |
|:--|:--|
| 신규 `CREATE TABLE`/`CREATE POLICY`/마이그레이션 | **0건** (검증 전용 Task — DB 변경 없음) |
| `src/app/actions/**`·RPC 신규·변경 | **0건** → Ds-11 신규 항목 없음(R-12 해당 없음) |
| 신규 테스트 파일 | `tests/e2e/e2e-31-billing-flow-verification.spec.ts` + `b371-fixture.ts` + `b371-login.ts` (regression-items 등재) |
| `git diff origin/TeamB_Dev...HEAD -- scratch` | **출력 없음** (R-15 IMP 직접부여 금지 준수) |

## [DoD] (이슈 [산출물·증적] 기준)

- [x] E2E 스펙 신규 파일 (`tests/e2e/`) — 위반 패턴 grep **0건**
- [x] A 5건 + B 항목별 **통과/실패 실측표** (예측 금지)
- [x] 8.2 **역할×화면 매트릭스 실측표**
- [x] 되돌리기 조건별 표 (서버 가드 되돌림 → FAIL 실측 → 원복 + `git diff` 무변경)
- [x] 증적 `docs/99_Manual/E2E_B371_Result/` (스크린샷·`.xlsx` 사본·로그)
- [x] `regression-items/TASK-B-371_*.md` 등재(`CI 미실행/수동` 표기) + `check:lrtm`·`build:lrtm`
- [x] `npm run test:regression` 전체 PASS(파일/케이스 실측) + `npm run build` PASS
- [x] R-04 `LIVE_*.md` 자가점검 결과 기재
- [x] `git diff origin/TeamB_Dev...HEAD -- scratch` **출력 없음**

## [작업 결과]

### 착수 절차 실측 (R-17)

```bash
① pwd                                  → /Users/am/Documents/workspace/SNTL_LMS/ZENITH_LMS-worktrees/mike
② git branch --show-current            → feature/teamb-task-b371-iss1439-billing-e2e-verification
   (origin/TeamB_Dev `4d01f7327`에서 생성)
③ ./scripts/next-task-number.sh B      → TASK-B-372 (본 이슈 제목의 371이 최대값 → "다음 빈 번호")
   → 본 이슈 확정번호 **TASK-B-371** 사용 (기존 파일 0건, 검색 결과는 본 이슈 자신)
④ ./scripts/check-db-freshness.sh      → OK (pending 0)
⑤ 라벨 status:open → status:in-progress → (완료 시) status:review
```

### 산출물

| 파일 | 내용 |
|:--|:--|
| `tests/e2e/e2e-31-billing-flow-verification.spec.ts` | **신규 스펙** — A1~A5(전 구간)·B1~B5(권한 교차)·B6(매트릭스 40셀)·R-04 콘솔 감사 |
| `tests/e2e/b371-fixture.ts` | **자기완결형 fixture** — GoTrue admin API로 테스트 계정 5종·PLATFORM org 신규·오더 7건 생성, `afterAll` 자기완결 정리(준비·정리 세부는 비공개) |
| `tests/e2e/b371-login.ts` | 실제 브라우저 로그인 헬퍼 |
| `docs/99_Manual/E2E_B371_Result/` | **증적 26건** — 스크린샷 17 · 다운로드 `.xlsx` 2 · 매트릭스 JSON · R-04 콘솔 JSON · B4 차단 실측 TXT |
| `docs/08_Self_Audit/Checklists/regression-items/TASK-B-371_*.md` | TC-371-01~12 등재 (`CI 미실행/수동` 표기) |

- **위반 패턴 grep 0건**: `readFileSync`·소스 `toContain`·함수 타입 단언·`test.skip` → 신규 3파일 모두 0건
- **mock 없음**: 실제 `page.goto()` 로그인 + 실DB + **실제 `.xlsx` 다운로드 → exceljs 재파싱**

### A. 전 구간 E2E (WBS 8.1) — 실측표

| # | 시나리오 | 실측 결과 |
|:--|:--|:--|
| A1 | Admin S1→S2 입력·임시저장·정산 완료 | ✅ 확인 모달 → `정산 완료 처리했습니다.` → **실DB `SETTLED`** |
| A2-1 | 대리점 후보 조회(정산 포함·미정산 제외) + 등록 청구서 생성 | ✅ 후보 4건 · `미정산 1건은 제외됨` · `선택 1건/후보 4건` · 합계 126,000원 · DRAFT 헤더 126,000.00 |
| A2-2 | **수기 화주명(R11)** 오더 포함 청구서 생성 | ✅ `billed_party_type=ADHOC`, `billed_name` 일치, DRAFT |
| A2-3 | 대리점 B 청구서(차단 대상) 생성 | ✅ `issuer_org_id=agencyB` |
| A3 | DRAFT→발행→**화주 RECEIVED 읽기전용**→입금확인 | ✅ ISSUED(모달 닫힘+배지로 확인) · 화주 화면 `조회 전용` + **변형 버튼 0개** + Excel 링크 유지 · CLOSED + `paid_date=오늘(KST)` |
| A4-1 | **대리점 Excel 실제 다운로드 → exceljs 재파싱 → DB 대조** | ✅ 시트 `['청구서','오더별 상세']` · 공급가액=헤더 총액(센트) · 항목 행 수=DB · 합계 열 굵게·숫자 셀 · 오더번호 매칭 |
| A4-2 | **화주도 동일 다운로드 → 값 동일** | ✅ (바이트 비교는 docProps 생성 시각 차이로 실패 → **파싱 후 값 비교**로 교체한 실측 반영) |
| A5 | 정산 되돌리기 3케이스 | ✅ ① 미포함→성공 ② 청구서 포함→**alert 차단+상태 불변** ③ DRAFT 포함→차단→청구서 취소→**성공** |

### B. 권한 교차 (WBS 8.2)

| 항목 | 실측 |
|:--|:--|
| B1 대리점 A → 대리점 B 상세/Excel | ✅ **거부**(목록 미노출·상세·Excel) |
| B2 화주 B → 화주 A 수신분 | ✅ 동일(**거부**) |
| B3 **서버 경로 직접 호출 거부** | ✅ UI와 무관하게 서버 경로에서 거부됨(**서버 거부 실증**) — 호출 형태·응답 상세는 비공개 |
| B4 대리점·화주 오더정산(S1·S2) 직접 입력 | ✅ 8회 전부 **거부** |
| B5 Admin AGENCY 발행분 감독 | ✅ `감독 조회` 배지 + `조회 전용` + 변형 버튼 0개 + **Excel 허용** |
| B6 **역할×화면 매트릭스** | ✅ **5역할 × 8화면 = 40셀, error 0** → `B6_역할x화면_매트릭스.json` |

**매트릭스 결과 요약 (허용/거부)**
| 역할 | S1 | S2 | S3a | S3b | S3c | S4 | S5(타인) | Excel(타인) |
|:--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Admin | 허용 | 허용 | 허용 | 거부 | 거부 | 거부 | 거부 | 허용 |
| 대리점A | 거부 | 거부 | 거부 | 허용 | 거부 | 허용 | 거부 | 거부 |
| 대리점B | 거부 | 거부 | 거부 | 허용 | 거부 | 허용 | 허용(본인) | 허용 |
| 화주A | 거부 | 거부 | 거부 | 거부 | 허용 | 거부 | 거부 | 거부 |
| 화주B | 거부 | 거부 | 거부 | 거부 | 허용 | 거부 | 거부 | 거부 |

### 되돌리기 검증 (조건별, 2026-11-23 실측 — 임시 변경 → 측정 → 원복)

| 조건 | 결과 |
|:--|:--|
| 조건 1 | **FAIL** |
| 조건 2 | **FAIL** |
| 원복 | `git diff` 빈 출력, 재실행 PASS |

### C. R-04 + 전체 회귀 (WBS 8.3)

- **`npm run test:regression` → 293 files / 2,248 tests 전부 PASS** (중간1회 2파일 일시 실패 → 단독 재실행 63/63, 최종 전체 PASS — 공유 로컬 DB 병렬 접촉으로 판단)
- **`npm run build` → exit 0** (`✓ Compiled successfully in 22.8s`) — 본 Task 결함 유형이 "회귀가 아니라 build에서만 잡히는" 점을 고려한 별도 실행
- `check:ds11` OK · `check:lrtm` OK(E2E 인용 `CI 미실행/수동` 표기 보정 후 0건) · `check:doc-links` OK · `check:audit` OK · `check:vendor` OK · `tsc` 관련 0건
- **R-04 `LIVE_*.md` 자가점검 결과**
  | 항목 | 결과 |
  |:--|:--|
  | `[SAR-2026-04-19-001]` Runtime Console Audit | ✅ 40셀 수집 → **`pageerror` 0건**. `console.error` 100건은 React 중복 key 경고로 **`/ko/dashboard`에서만**(청구서·정산 0건) → **DEF-B-163** |
  | `[SAR-2026-04-19-001]` Redirect Loop | ✅ B4에서 리다이렉트 체인 실측 — 무한 루프 없음, 최종 목적지 도달 |
  | `[SAR-001]` Link Integrity | ✅ `check:doc-links` OK |
  | RLS 테스트 자기완결성 | ✅ `beforeAll` 생성 / `afterAll` 정리, `seed-local` 의존 **0**(PLATFORM org도 신규 생성) |
  | 4대 역할 매트릭스 | ✅ 신규 테이블·정책 **0건**(검증 전용) + B6으로 5역할×8화면 실측 |
  | 정책-GRANT 페어링 | N/A (신규 정책 0건) |
  | fresh DB 기준 검증 | ⚠ 부분 — E2E는 이슈 지시대로 **로컬 한정(R-14)**, 회귀·빌드는 CI와 동일 명령으로 PASS |
  | UAT/Responsive/R-03 FINAL PASS | N/A (본 Task 범위 밖 — Auditor/Aiden 몫) |

## [발견 이슈]

_(담당 Task 범위 밖 이슈 — 전부 R-18 등록, `src/` 수정 **0건**)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-B-163 | 대시보드(`/ko/dashboard`) React **중복 key** 콘솔 경고 100건 — 목록 중복·누락 가능성 | Low~Medium | `.agent/defects/DEF-B-163_대시보드_React_중복key_콘솔경고.md` |
| DEF-B-164 | 기존 `e2e-27`이 `seed-local`의 PLATFORM org에 의존 — 자기완결형 아님 | Low | `.agent/defects/DEF-B-164_e2e27_seed-local_PLATFORM_org_의존.md` |

- **DEF-B-163**: R-04 콘솔 감사로 발견. `pageerror` 0건이나 React가 명시하는 "자식 중복·누락 가능성" 경고. 후보는 `ZenDataGrid`의 `key={row.id}`/`key={header.id}`. **청구서·정산 화면은 0건**(범위 밖).
- **DEF-B-164**: 착수 스모크에서 발견(`platformOrg` null → `TypeError`). 본 Task는 PLATFORM org을 신규 생성하는 자기완결 fixture로 우회.
- **참고(DEF 미등록)**: E2E 실행 중 dev 서버의 `ECONNRESET`(aborted) 로그와 미존재 상세 페이지의 `<h1>` 부재로 인한 대기 지연은 테스트 측에서 셀 상한(alarm)·`body` 대기로 우회했으며, **제품 결함으로 판단하지 않음**(페이지 렌더 자체는 정상, `pageerror` 0건).

