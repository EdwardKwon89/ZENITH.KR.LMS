# TASK-B-361 — Issue #1367: 청구서관리 ④ 화면 — S3 목록·S4 생성·S5 상세·3경로 (⒜/⒝ 2 PR)

| 항목 | 내용 |
|:--|:--|
| **Issue** | [#1367](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1367) (에픽 #1364) |
| **담당(Worker)** | Baker (Team B) — Jaison 2026-11-21 13:37 코멘트로 정식 배정·blocked 해제 |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-22 |
| **우선순위** | P2 (`team:b`, `priority:p2`, `type:feat`) |
| **상태** | 🔔 제출 완료 — ⒜ PR 검토 대기 (`status:review`), ⒝ 후속 예정 |
| **브랜치** | `feature/teamb-task-b361-iss1367-billing-statement-ui` (base `origin/TeamB_Dev` @ `19403fdec`) |
| **선행 조건** | ✅ #1366 ⒜(PR #1404, 2026-11-20 병합) / ✅ PR #1405(2026-11-21 병합) / ✅ Excel Route Handler PR #1411(2026-11-21 병합) / ✅ DB 마이그레이션 최신(pending 0) |
| **범위** | WBS 5.1~5.7 — **⒜ PR `Refs #1367`**: S3 목록·S4 생성(수기 화주 포함)·S5 상세·3경로 공용 컴포넌트 / **⒝ PR `Closes #1367`**: 메뉴·경로 허용·i18n 정리·증적 |
| **설계 기준** | `docs/02_Analysis/An_17_청구서관리_오더정산_청구서_설계.md` §6-4~§6-6·§6-5b·§6-5c + 이슈 본문·Jaison 2026-11-21 코멘트(충돌 시 코멘트 우선) |

## 0. 채번 확인 (착수 직전 실행 — 원문 그대로 기재)

```bash
$ git fetch origin TeamB_Dev develop
$ find .agent/tasks -name "TASK-B-361*"                                  → (출력 없음 — 신규)
$ git ls-tree -r origin/TeamB_Dev --name-only | grep "TASK-B-361"          → (출력 없음, rc=1)
$ gh issue list --state all --search "TASK-B-361 in:title"
1367	OPEN	[Team B] TASK-B-361: 청구서관리 ④ 화면 — S3 목록·S4 생성·S5 상세·역할별 메뉴 3경로	team:b, priority:p2, type:feat, status:open	2026-11-21T13:37:45Z
```
→ TASK-B-361은 본 이슈(#1367)에만 사용. 중복 없음. 이슈의 못박힌 번호를 그대로 사용.

## 1. 선행 조건·착수 환경 확인
- #1366 CLOSED, PR #1404/#1405/#1411 모두 MERGED. `origin/TeamB_Dev` @ `19403fdec`에서 분기.
- `./scripts/agent-worktree-init.sh baker` → 전용 워크트리 `/Users/am/Documents/workspace/SNTL_LMS/ZENITH_LMS-worktrees/baker` 재사용, `.env.local` 복사.
- `export PATH="$PWD/node_modules/.bin:$PATH" && ./scripts/check-db-freshness.sh` → **pending 마이그레이션 0건, OK**.

## 2. 실측·설계 분석

### 2-1. 서버 액션 계약 실측 (B-360 병합본 — 이번 Task에 신규 액션/RPC 없음)

| 액션 (실측 시그니처) | 반환 | 화면 사용 |
|:--|:--|:--|
| `getBillingStatements(filter?)` | `{success, statements?: StatementListRow[], total?, error?}` | 3경로 S3 목록. `scope`는 서버 `scopeOf()` 계산값 |
| `getBillingStatementDetail(id)` | `{success, detail?: StatementDetail, error?}` | 3경로 S5 상세. RLS 미노출·미존재 모두 `statement_not_found` 동일 응답 |
| `listBillableOrders({billedTarget, dateBasis, dateFrom, dateTo})` | `{success, orders?, total?, totalAmount?, excludedUnsettled?, truncated?, error?}` | S4 후보 조회. `total`은 필터 후 후보 건수(`mapped.rows.length`) |
| `listAdhocShipperNames(q?)` | `{success, names?: {name,normalized,count,billableCount}[], truncated?, error?}` | S4 수기 화주 자동완성. 대리점 org 아님이면 서버 거부 |
| `createBillingStatement({billedTarget, year, month, orderIds, periodFrom?, periodTo?})` | `{success, statementId?, statementNo?, roundNo?, error?}` | S4 초안 저장 후 상세로 이동 |
| `cancelBillingStatement(id)` / `issueBillingStatement(id)` | `{success, error?}` | S3 취소 / S5 발행 |
| `confirmStatementPayment(id, {paidAt?, amount})` | `{success, error?}` | S5 입금확인 — **전액만** 서버 검증 |

- `error`는 이미 번역된 사용자 문구이므로 **그대로 표시**(키 파싱·DB 원문 가공 금지).
- 금액은 서버 DTO를 그대로 포맷만 해서 표시(클라이언트 재계산 없음). `billing_items_amounts`가 단일 원천.
- `billedTarget`은 `{type:'ORG', orgId}` / `{type:'ADHOC', shipperName, bizNo?}` 두 형태뿐.

### 2-2. scope → 버튼 매트릭스 (서버 응답 `scope`만 사용, 클라이언트 `role` 미참조)

| `scope` | 서버 의미 (`scopeOf`) | S3 목록 | S5 상세 |
|:--|:--|:--|:--|
| `MINE` | `issuer_org_id === myOrgId` | DRAFT: 보기/취소 · ISSUED: 보기/입금확인 · CLOSED: 보기 | DRAFT: 발행/취소(삭제) · ISSUED: 입금확인 · CLOSED: 작업 없음 |
| `RECEIVED` | 타 발행자, 비-Admin | 보기만 (생성 버튼 숨김) | 작업 영역 **미렌더** + `조회 전용` 배지 |
| `SUPERVISED` | 타 발행자, Admin·ZENITH_SUPER_ADMIN | 보기만 (**DRAFT 포함**) | 작업 영역 **미렌더** + `조회 전용` 배지 |

- `isIssuerScope(scope)` = `scope === 'MINE'`만 true. UI 분기는 이 값과 `status`로만 결정.
- 서버 변형 액션은 `ISSUER_ROLES`(ADMIN·ZENITH_SUPER_ADMIN·AGENCY) + `issuer_org_id` 소유권으로 별도 강제 → UI 숨김은 부가 방어.

### 2-3. 3경로 컴포넌트 재사용·가드 실측

| 경로 | 대상 역할 | `guardStatementRoute` | 생성 | 수기 화주 |
|:--|:--|:--|:--:|:--:|
| `/finance/statements`(+`/new`,`/[id]`) | ADMIN·ZENITH_SUPER_ADMIN | `/finance` + 역할 | ✅ | ❌ (설계 §6-5d Admin 제외) |
| `/agency/statements`(+`/new`,`/[id]`) | AGENCY | `/agency` + 역할 | ✅ | ✅ |
| `/shipper/statements`(+`/[id]`) | SHIPPER·AGENCY_SHIPPER | `/shipper` + 역할 | ❌ | ❌ — `/new` 라우트 없음 |

- S4 대상 목록: Admin = `getOrganizations(1,500)`에서 `type ∈ {AGENCY,SHIPPER}` / 대리점 = `getAgencyShippers(profile.org_id)` 중 `is_active !== false`(서버 링크 검증과 일치).
- 실패 시 `/dashboard` redirect. 조회 전용 경로도 `getBillingStatementDetail`의 RLS가 최종 방어.

### 2-4. "오더정산으로 이동" 링크 경로 실측

- 설계 §6-5c는 `/finance/order-settlement`을 명시하나 **현행 코드에 해당 라우트 없음**(`src/app`에 `settlement`·`agency/settlements`만 존재).
- `NaviSidebar.tsx`의 `settlement` 항목은 `/settlement`을 사용 → `excludedUnsettled` 안내 링크를 `/${locale}/settlement`로 구현(⒝ 메뉴 경로와 동일).

### 2-5. DTO에 없어 표시하지 않은 설계 요소 (임의 값 생성 금지)

| 설계 요소 | 실측 DTO | 처리 |
|:--|:--|:--|
| S3 `오더수` 열(§6-4) | `StatementListRow`에 오더수 필드 없음 | 열 생략 (0으로 채우지 않음) |
| S4 `출고확정일` 열 추가(§6-5b-3) | `BillableOrderRow.basisDate` **단일 값**(선택 기준에 따라 배송완료일 또는 출고확정일) | 기준 선택에 따라 단일 날짜 열 헤더 전환 |
| S5 입금일·확인자·발행일(§6-6) | `StatementDetail`에 `paidAt`/`paidBy`/`issuedAt` 없음 | 표시 생략 |
| S5 항목별 기준일·화주명 | `StatementItemRow`에 없음 | 생략 |

### 2-6. ADHOC "유사 화주명 N건 — 함께 조회" 칩 해석

- 서버 `listAdhocShipperNames(q)`는 **정규화된 이름 하나**만 받음(복수 이름 동시 조회 불가). 칩 클릭은 그 표기를 현재 입력값으로 바꿔 재조회하는 방식으로 구현.
- 최종 확인은 후보 표의 **오더별 화주명 열**이 담당(설계 §6-5d). 발행 시 스냅샷 이름은 사용자가 선택한 단일 표기를 서버로 전달.

### 2-7. R-20 영향도 분석 — GitNexus 미연결 → grep 전수

`tools.opencode.list_mcp_resources()` 결과 **resources 0 / templates 0 / servers 0** (GitNexus MCP 미연결). 인덱스 최신성 판단 불가 → 저장소 전체 grep로 재검증하고 그 사실을 여기에 기재함.

| 심볼 | grep 참조처 | ⒜ 변경 | 비고 |
|:--|:--|:--|:--|
| 서버 액션 8종 | B-360 테스트, `api/finance/statements/[id]/export/route.ts`, 신규 8페이지·6컴포넌트 | **소비자만 추가**, 액션 본체 미수정 | 액션의 `revalidatePath('/finance/statements')`·`('/agency/statements')`가 신규 라우트와 정합 |
| `Statements` i18n | 신규 컴포넌트 6종 + 3 테스트 | 신규 네임스페이스 77키 × 4로케일 | 기존 키 참조 0, `Errors` 키 변경 0 |
| `NaviSidebar.tsx` | `(dashboard)/layout.tsx` | 없음 (⒝ 범위) | "정산/재무" children·"대리점 관리" children·화주 메뉴 삽입 예정 |
| `rbac.ts` `ALL_RESOURCE_PATHS` | 권한 관리 화면 | 없음 (⒝ 범위) | `/finance`·`/agency`·`/shipper` 상위 경로는 이미 등록 — 세부 경로 추가 여부 ⒝에서 결정 |
| `proxy.ts` 비플랫폼 허용 목록 | 미들웨어 라우팅 | 없음 (⒝ 범위) | `/agency`·`/shipper`는 이미 `startsWith` 허용. `/finance/statements`는 Admin(PLATFORM) 전용이라 제약 없음 |

→ 변경 심볼은 기대 범위(신규 컴포넌트·라우트·i18n·회귀 항목) 안, 범위 밖 기존 파일 수정 0. `detect_changes` 상당 확인을 grep 전수로 대체.

### 2-8. i18n 실측

`Statements` 네임스페이스 **77키 × ko/en/zh/ja 동일 키셋**(key set 비교 PASS). 신규 `Errors` 키 없음 — `errors-key-sync` 기대 110키 유지.

## 3. [발견 이슈]

_담당 Task 범위 밖 이슈 / 설계·DTO 간극_

| DEF# | 제목 | 긴급도 | 상세 |
|:--|:--|:--|:--|
| DEF-B-156(기존) | `npm run check:i18n` 감사 FAIL — ja 로케일이 en 대비 519키 누락(기존 523 → 신규 키 일부 반영으로 감소) | Low | `.agent/defects/DEF-B-156_i18n_ja로케일_523키누락_감사FAIL.md`. 본 Task의 `Statements` 77키는 4로케일 모두 존재(실패 목록에 `Statements.*` 없음). stash 비교 없이도 base `ja.json`이 25 top-level key뿐임을 확인 → 기존 결함. 범위 밖이라 미수정. |
| **DEF-B-162(신규)** | `'use server'` 액션 파일의 비동기 아닌 export `normalizeShipperName`로 **`npm run build` 전역 실패** | **High** | `.agent/defects/DEF-B-162_청구서액션_비동기아닌_export_빌드실패.md`. `billing-statements.ts:135`(`export function`) — 병합된 B-360 ⒜(PR #1404) 산출물로 `origin/TeamB_Dev`에 동일 존재, **본 커밋은 해당 파일 미수정**. 근본 조치는 헬퍼를 순수 유틸 모듈로 분리 → 별도 TASK 발령 필요. 범위 밖이라 미수정. |

| 구분 | 내용 | 조치 |
|:--|:--|:--|
| 설계-코드 불일치 | 설계 §6-5c의 오더정산 경로 `/finance/order-settlement` 미존재 | 현행 `/settlement` 사용. ⒝ 메뉴에서도 동일 경로 사용 예정 |
| DTO 간극 | §2-5 표 — S3 오더수, S5 입금일/확인자/발행일, 항목별 기준일·화주명, S4 출고확정일 별도 열 | 값을 임의 생성하지 않고 생략. 필요 시 별도 Task 제안(R-15) |
| ADHOC 복수 표기 | 서버가 정규화된 단일 이름만 수용 → "함께 조회"를 복수 동시 조회로 구현 불가 | 칩 선택 재조회로 해석(§2-6), 사람이 오더별 화주명 열로 최종 확인 |
| 환경 | 워크트리 `node_modules`가 stale하여 병합된 `exceljs@4.4.0` 미설치 → `task-b360-excel-export.test.ts` 로드 실패 | `npm install exceljs@4.4.0 --no-save --no-package-lock`로 해소(추적 파일 변경 없음), 전체 회귀 재실행 |
| `check:i18n` | 위 DEF-B-156과 동일 — 본 Task 신규 키는 누락 0 | 미수정, DEF 참조 |

## 4. [작업 결과]

- 코드 커밋: `d9c8003132c95cc2a0ed7407e3d1eab926dda3e6`

### ⒜ PR (WBS 5.1~5.4, `Refs #1367`)
- **공용 컴포넌트** `src/components/finance/statements/` 8파일 — `types.ts`(DTO·`formatKrw`·`isIssuerScope`), `Badges.tsx`(상태 3색/범위 배지), `StatementModals.tsx`(발행 경고·입금 전액 사전검증), `StatementsList.tsx`(S3 필터 5종+range 버튼 매트릭스), `StatementCreate.tsx`(S4 2단계·ADHOC·truncated/미정산 안내), `StatementDetail.tsx`(S5 상태별 작업영역), `index.ts`, `page-helpers.ts`(서버 가드).
- **3경로 8페이지** — finance/agency: 목록·생성·상세, shipper: 목록·상세(조회 전용, `/new` 없음).
- **i18n** — `Statements` 77키 × 4로케일 추가. `Errors` 키 변경 0.
- **회귀** — `tests/unit/components/statements/` 3파일 21케이스(모두 렌더 결과 단언). R-09 항목 1건 신규 + `build:lrtm`/`check:lrtm` PASS.
- **되돌리기 검증** — 아래 5건 모두 실제로 되돌려 FAIL 확인 후 복구(복구 후 21/21 재PASS, 잔존 마커 0):

| 되돌린 구현 | 실패 테스트 | 실측 결과 |
|:--|:--|:--|
| `mine = row.scope === 'MINE'` → `true` | TC-361-03·04 | 2 failed / 5 passed |
| `truncated &&` → `false &&` | TC-361-08 | 1 failed / 5 passed |
| S5 작업영역 `mine &&` → `true &&` | TC-361-16·17 | 2 failed / 6 passed |
| 발행 모달 `issueWarning` 제거 | TC-361-18 | 1 failed / 7 passed |
| 입금 전액 사전검증 → `false &&` | TC-361-19 | 1 failed / 7 passed |

- **vacuous 패턴 0건** — 신규 테스트·컴포넌트 `grep -rnE 'test\.skip|readFileSync|toContain\(.*source|typeof .* === .function'` 결과 0.
- **전체 회귀** — `npm run test:regression` 286파일/2186케이스 전부 PASS(709.34초). stale `exceljs@4.4.0`을 `--no-save --no-package-lock`으로 재설치해 `task-b360-excel-export.test.ts`(19/19)까지 통과, 추적 파일 변경 없음.

### ⒝ PR (WBS 5.5~5.7) — 별도 커밋/PR 예정
- 미구현(⒝ 예정): `NaviSidebar.tsx` 메뉴 3종, `rbac.ts`·`proxy.ts` 경로 허용 검토, nav i18n, Excel 링크(`/api/finance/statements/[id]/export`), R-10 역할별 스크린샷. 이 PR에서는 만들지 않음(Jaison 지시 — Excel 버튼 선제 생성 시 404).

## 5. 검증 (DoD)

### ⒜ PR DoD (5.1~5.4)
- [x] 설계 일치: S3·S4·S5를 `An_17` §6-4~§6-6·§6-5b·§6-5d 기준으로 구현. 시안은 비공개여서 열람 불가 → 설계서 기준. DTO 미보유 항목은 §2-5에 간극 기재(임의 값 미생성)
- [x] 역할별 노출 테스트: `scope`=MINE/RECEIVED/SUPERVISED × `status`별 버튼·배지 렌더 단언 21케이스. **메뉴 노출은 ⒝ 범위**(Jaison 2-PR 분할)
- [x] 조회 전용 모드 작업 영역 미렌더(TC-361-03·04·16·17). 서버 액션 자체 거부는 B-360 병합 테스트가 이미 검증
- [x] `truncated === true` 경고(TC-361-08) + `excludedUnsettled` 안내·`/settlement` 링크(TC-361-09)
- [x] 수기 화주: 자동완성·유사명 칩(TC-361-11)·오더별 화주명 열(TC-361-10)·`allowAdhoc=false` 옵션 미렌더(TC-361-12). `/shipper/statements`는 조회 전용 라우트만 존재
- [x] 4로케일 `Statements` 77키 동일, `Errors` 키 110개 유지. (`npm run check:i18n` 전역 FAIL은 기존 DEF-B-156 — 본 Task 신규 키 누락 0)
- [x] 영향도 분석 §2-7 기재(GitNexus 미연결 → grep 전수 명시), 변경 심볼 기대 범위 안
- [x] 되돌리면 테스트 FAIL — §4 조건별 표(5건 실측)
- [x] 컴포넌트 테스트 렌더 결과 단언, vacuous 패턴 0건
- [x] Ds-11: 신규 액션/RPC 없음 → 갱신 불필요. `npm run check:ds11` PASS(미반영 125개 모두 허용 목록)
- [x] R-09 v3.10: `regression-items/TASK-B-361_*.md` 신규, `npm run build:lrtm` + `npm run check:lrtm` PASS(유령 0·허용목록 밖 미등재 0)
- [x] `npm run test:regression` 전체 PASS(286파일/2186케이스, 709초, stale `exceljs` 재설치 후). **`npm run build`는 실패** — 원인은 병합된 B-360 ⒜의 비동기 아닌 export(`billing-statements.ts:135`), 본 Task 범위 밖 → **DEF-B-162(High) 등록**, 별도 TASK 조치 필요. 본 Task 신규 파일로 인한 빌드 에러 0(에러 import trace는 기존 액션 파일)
- [x] 에러 로그 확인 — 無(로컬 Supabase `zen_error_logs` severity=ERROR 0건, 전체 0행). 라이브 최종 확인은 병합 후 JSJung
- [x] 스타일/타입: 신규 파일 `npx eslint` 0 warning, `npx tsc --noEmit`에서 statements 관련 에러 0(기존 `exceljs`·E2E·`.next` 에러는 범위 밖)
- [x] `check-R17-DoD` 자가 검증 통과 — 코드 커밋 → 해시 자동삽입 → 🔄→🔔 실제 diff 확인 → 문서 커밋 → PR 순서. (opentemplate 명령이므로 수동 동치 점검)

### ⒝ PR 이관 항목 (5.5~5.7 — 본 ⒜ PR에서는 의도적으로 미포함)
- [ ] `NaviSidebar.tsx` 메뉴 3종(Admin 정산/재무·대리점 관리·화주) + nav i18n 4로케일
- [ ] `rbac.ts`·`proxy.ts` 경로 허용 검토(§2-7 실측 결과 반영)
- [ ] Excel 링크 → `/api/finance/statements/[id]/export`(S3 행·S5 상세, 조회 전용 포함)
- [ ] R-10 역할별(Admin·대리점·화주) 스크린샷 증적 + 실제 `page.goto()` 네비게이션 검증
