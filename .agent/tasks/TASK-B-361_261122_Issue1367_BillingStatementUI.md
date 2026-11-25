# TASK-B-361 — Issue #1367: 청구서관리 ④ 화면 — S3 목록·S4 생성·S5 상세·3경로 (⒜/⒝ 2 PR)

| 항목 | 내용 |
|:--|:--|
| **Issue** | [#1367](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1367) (에픽 #1364) |
| **담당(Worker)** | Baker (Team B) — Jaison 2026-11-21 13:37 코멘트로 정식 배정·blocked 해제 |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-22 |
| **우선순위** | P2 (`team:b`, `priority:p2`, `type:feat`) |
| **상태** | 🔔 [PR #1413](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1413)(`Closes`) 검토 대기 (`status:review`) — [PR #1412](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1412)(`Refs`) 병합 완료(2026-11-22T04:02:37Z, merge `5dc7fe379`), ⒝ `origin/TeamB_Dev` @ `5dc7fe379` 재base 완료. S1·S2 화면은 범위 외(후속 Task) |
| **브랜치** | ⒜ `feature/teamb-task-b361-iss1367-billing-statement-ui` (PR #1412, **MERGED** @ `5dc7fe379`) / ⒝ `feature/teamb-task-b361b-iss1367-billing-statement-ui` (PR #1413, 재base onto `origin/TeamB_Dev` @ `5dc7fe379`) |
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
- `./scripts/agent-worktree-init.sh baker` → 전용 워크트리 `<로컬 워크트리>` 재사용, `.env.local` 복사.
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

### 2-4. "오더정산으로 이동" 링크 경로 실측 (Jaison 리뷰 반영)

- 설계 §6-5c는 `/finance/order-settlement`을 명시하나 **현행 코드에 해당 라우트 없음**(`src/app`에 `settlement`·`agency/settlements`만 존재).
- `/${locale}/settlement`은 **정산 관리(인보이스 개요 `InvoiceTable`) 화면**이며 원가 정산(`SETTLED`) 화면이 아님. 최초 대체 링크는 잘못된 목적지였음(Jaison 지적).
- `markOrderCostSettled`는 `src/app/actions/finance/ups-actual-cost.ts`에 정의되고 `finance/index.ts`에서 re-export되지만, **이를 호출하는 페이지/컴포넌트는 저장소에 없음**(전수 grep 결과 테스트·문서에만 등장). `BillingConfirmModal`은 `recordActualCostAndFinalize`를 호출하는 별개 흐름.
- → Jaison 지시 (c)에 따라 **링크를 제거**하고 역할별 문구만 렌더: Admin=`excludedUnsettledAdmin`(화면 미구현), 대리점=`excludedUnsettledAgency`(관리자에게 요청). 구분은 서버가 `STATEMENT_ROUTES[*].canSettleOrders`로 계산해 prop 전달.
- **S1·S2 화면 미구현 사실은 이슈 #1367에 질문으로 게시** — 설계 정정/후속 Task 여부는 Jaison 판단.

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
| `Statements` i18n | 신규 컴포넌트 6종 + 3 테스트 | 신규 네임스페이스 78키(⒜) + ⒝ `excel` 1키 + 취소 확인 3키 → **82키 × 4로케일** | 기존 키 참조 0, `Errors` 키 변경 0 |
| `NaviSidebar.tsx` | `(dashboard)/layout.tsx` | **⒝ 메뉴 3종 추가** | "정산/재무" children에 `/finance/statements`, "대리점 관리" children 마지막에 `/agency/statements`, 화주 메뉴 끝에 `/shipper/statements`. 노출은 기존 `checkPermission(role, href, allowedPaths)` 경로(부모 접두 `/finance`·`/agency`·`/shipper` 매칭)가 그대로 적용 → 별도 권한 코드 추가 없음 |
| `rbac.ts` `ALL_RESOURCE_PATHS` | 권한 관리 화면 | **변경 없음 (⒝ 실측 판정)** | `/finance`·`/agency`·`/shipper` 상위 경로가 이미 등록되어 있고 `checkPermission`은 접두 매칭 — 세부 경로 등록 불필요. 로컬 `zen_role_permissions` 실측: ADMIN=`/finance`, AGENCY=`/agency`, SHIPPER·AGENCY_SHIPPER=`/shipper` 상위 경로 보유 |
| `proxy.ts` 비플랫폼 허용 목록 | 미들웨어 라우팅 | **변경 없음 (⒝ 실측 판정)** | 비플랫폼(`orgType !== 'PLATFORM'`)은 `purePath.startsWith(allowedRoot)`로 `/agency`·`/shipper` 하위 전체 허용 → 신규 경로 자동 허용. `/finance/statements`는 ADMIN·ZENITH_SUPER_ADMIN(PLATFORM) 전용이라 이 분기 대상 아님 |

→ 변경 심볼은 기대 범위(신규 컴포넌트·라우트·i18n·메뉴·회귀 항목) 안, 범위 밖 기존 파일 수정 0(`rbac.ts`·`proxy.ts`는 검토만). `detect_changes` 상당 확인을 grep 전수로 대체.

### 2-8. i18n 실측

- ⒜: `Statements` 네임스페이스 **78키 × ko/en/zh/ja 동일 키셋**(key set 비교 PASS). 신규 `Errors` 키 없음 — `errors-key-sync` 기대 110키 유지.
- ⒝: `Statements.excel` 1키 + 취소 확인 3키(`cancelConfirmTitle`·`cancelWarning`·`cancelConfirm`) 추가 → **82키 × 4로케일 동일**. `Navigation`에 `statements_nav`·`shipper_statements_nav` 신규 2키, 기존 `shipper_invoices_nav`에 `(기존)`/`(Legacy)` 접미 부여(설계 §6-5c). 4로케일 모두 동일 키 반영, `Errors` 110키 유지. `npm run check:i18n` 전역 FAIL은 기존 DEF-B-156(ja 519키 누락)이며 신규 키 누락은 0.

## 3. [발견 이슈]

_담당 Task 범위 밖 이슈 / 설계·DTO 간극_

| DEF# | 제목 | 긴급도 | 상세 |
|:--|:--|:--|:--|
| DEF-B-156(기존) | `npm run check:i18n` 감사 FAIL — ja 로케일이 en 대비 519키 누락(기존 523 → 신규 키 일부 반영으로 감소) | Low | `.agent/defects/DEF-B-156_i18n_ja로케일_523키누락_감사FAIL.md`. 본 Task의 `Statements` 82키(⒝ `excel`·취소 확인 3키 포함)는 4로케일 모두 존재(실패 목록에 `Statements.*` 없음). stash 비교 없이도 base `ja.json`이 25 top-level key뿐임을 확인 → 기존 결함. 범위 밖이라 미수정. |
| DEF-B-162 | `'use server'` 액션 파일의 비동기 아닌 export `normalizeShipperName`로 `npm run build` 전역 실패 | High → **해소됨** | `.agent/defects/DEF-B-162_청구서액션_비동기아닌_export_빌드실패.md`. B-360 ⒜(PR #1404) 산출물. **Mike/TASK-B-368(PR #1416, 2026-11-22 병합)**이 순수 유틸 `src/lib/finance/billing/normalize-shipper-name.ts`로 분리해 해소. 본 ⒜는 rebase 후 `StatementCreate.tsx`의 로컬 `normalize()`를 해당 공용 유틸 import로 교체(Jaison 2026-11-22 지시) — 규칙 단일 출처. |

| 구분 | 내용 | 조치 |
|:--|:--|:--|
| 설계-코드 불일치 | 설계 §6-5c의 오더정산 경로 `/finance/order-settlement` 미존재 + `markOrderCostSettled` 호출 화면 없음 | 링크 제거, 역할별 안내 문구로 대체. 이슈 #1367에 S1·S2 구현 여부 질문 게시 → **Jaison 판단: 본 Task 범위 외, JSJung 확인 후 후속 Task 발령** |
| Jaison 리뷰(비차단) | `formatKrw` 원 단위 반올림 → 소수 `numeric(14,2)` 값이 Excel(2자리)과 1원 차이 가능 | 설계 §3-1b "반올림은 현행 `Math.round` 유지"에 따라 의도적. 2자리 표시/정책 변경은 IMP 제안으로 이관 |
| Jaison 리뷰(비차단) | 연/월 입력과 `dateFrom`/`dateTo`가 독립 | 서버 액션은 4값을 그대로 RPC에 전달, RPC는 연/월 범위만 검증하고 기간과의 일관성 검증 없음(메타 기록). 현 동작 유지·기재 |
| Jaison 리뷰(비차단) | Admin 대상 목록 `getOrganizations(1,500)` 500건에서 조용히 잘림 | IMP 제안(검색/초과 경고)으로 이관. 본 PR 범위 밖 |
| DTO 간극 | §2-5 표 — S3 오더수, S5 입금일/확인자/발행일, 항목별 기준일·화주명, S4 출고확정일 별도 열 | 값을 임의 생성하지 않고 생략. 필요 시 별도 Task 제안(R-15) |
| ADHOC 복수 표기 | 서버가 정규화된 단일 이름만 수용 → "함께 조회"를 복수 동시 조회로 구현 불가 | 칩 선택 재조회로 해석(§2-6), 사람이 오더별 화주명 열로 최종 확인 |
| 환경 | 워크트리 `node_modules`가 stale하여 병합된 `exceljs@4.4.0` 미설치 → `task-b360-excel-export.test.ts` 로드 실패 | `npm install exceljs@4.4.0 --no-save --no-package-lock`로 해소(추적 파일 변경 없음), 전체 회귀 재실행 |
| `check:i18n` | 위 DEF-B-156과 동일 — 본 Task 신규 키는 누락 0 | 미수정, DEF 참조 |

## 4. [작업 결과]

- 코드 커밋: ⒜ `85ade9850`(rebase) + 공용 유틸 `d08b83c5b` + Jaison 리뷰 수정 `aaeb5f7f0` / ⒝ `142b5a16b` → 재base 후 `081d945a9` + 최종 취소 확인 `d3ff3a9c7`(문서 커밋은 직후 별도 커밋 — R-17 순서 준수)

### ⒜ PR (WBS 5.1~5.4, `Refs #1367`)
- **공용 컴포넌트** `src/components/finance/statements/` 8파일 — `types.ts`(DTO·`formatKrw`·`isIssuerScope`), `Badges.tsx`(상태 3색/범위 배지), `StatementModals.tsx`(발행 경고·입금 전액 사전검증), `StatementsList.tsx`(S3 필터 5종+range 버튼 매트릭스), `StatementCreate.tsx`(S4 2단계·ADHOC·truncated/미정산 안내), `StatementDetail.tsx`(S5 상태별 작업영역), `index.ts`, `page-helpers.ts`(서버 가드).
- **3경로 8페이지** — finance/agency: 목록·생성·상세, shipper: 목록·상세(조회 전용, `/new` 없음).
- **i18n** — `Statements` 78키 × 4로케일 추가(리뷰 반영으로 `excludedUnsettled`·`goOrderSettlement` 2키 제거, `conditionsChanged`·`excludedUnsettledAdmin`·`excludedUnsettledAgency` 3키 추가). `Errors` 키 변경 0.
- **회귀** — `tests/unit/components/statements/` 3파일 30케이스(모두 렌더 결과 단언). TC-361-09/26(역할별 링크 유무), TC-361-27/28(조회 조건 변경 무효화), TC-361-32~34(취소 확인) 추가. R-09 항목 1건 신규 + `build:lrtm`/`check:lrtm` PASS.
- **되돌리기 검증** — 아래 8건 모두 실제로 되돌려 FAIL 확인 후 복구(복구 후 30/30 재PASS, 잔존 마커 0). 7·8건째는 Jaison 리뷰 수정분:

| 되돌린 구현 | 실패 테스트 | 실측 결과 |
|:--|:--|:--|
| `mine = row.scope === 'MINE'` → `true` | TC-361-03·04 | 2 failed / 5 passed |
| `truncated &&` → `false &&` | TC-361-08 | 1 failed / 5 passed |
| S5 작업영역 `mine &&` → `true &&` | TC-361-16·17 | 2 failed / 6 passed |
| 발행 모달 `issueWarning` 제거 | TC-361-18 | 1 failed / 7 passed |
| 입금 전액 사전검증 → `false &&` | TC-361-19 | 1 failed / 7 passed |
| `normalizeShipperName(shipperName)` → `shipperName` (공용 유틸 미적용) | TC-361-11 값 단언 (`'  ABC   주식회사  '` → 칩 1건) | 1 failed / 5 passed |
| `isStale` → `false` (조건 변경 무효화 제거) | TC-361-27·28 | **FAIL** — 2 failed / 7 passed (27·28) |
| 잘못된 `/${locale}/settlement` 링크 재삽입 | TC-361-09·26 | **FAIL** — 2 failed / 7 passed (09·26) |

- **vacuous 패턴 0건** — 신규 테스트·컴포넌트 `grep -rnE 'test\.skip|readFileSync|toContain\(.*source|typeof .* === .function'` 결과 0.
- **전체 회귀** — rebase 기준 `npm run test:regression` **287파일/2194케이스 전부 PASS(537초)**. stale `exceljs@4.4.0`을 `--no-save --no-package-lock`으로 재설치해 `task-b360-excel-export.test.ts`(19/19)까지 통과, 추적 파일 변경 없음. 취소 확인 반영 후 최종 스위트 재실행 완료(아래 ⒝ 결과).

### Jaison 리뷰 수정 (2026-11-22, 🔴 2건 + 🟡 권고 접수)
| # | 지적 | 조치 |
|:--|:--|:--|
| 🔴1 | 조회 후 대상·기간 변경 시 이전 후보/선택이 남아 저장됨 | 조회 조건 10종 스냅샷(`LookupConditions`) 비교로 `isStale` 산출 → 후보 표·미정산/상한 안내 숨김 + 저장 버튼 미렌더, `save()`도 방어. TC-361-27·28 + 되돌리기 7건째 |
| 🔴2 | `/${locale}/settlement`은 인보이스 개요이며 `markOrderCostSettled` 호출 화면 부재 | 링크 제거, `canSettleOrders`(서버 역할 유래)로 Admin/대리점 문구 분기(4로케일). TC-361-09·26 + 되돌리기 8건째. S1·S2 미구현은 이슈에 질문 게시 |
| 🟡 | 초안 취소 확인 없음 | ⒝ 반영 완료 — S3·S5 취소 클릭은 `CancelConfirmModal` 오픈만, '취소 확정' 클릭 시에만 서버 호출. TC-361-07·32·33·34 + 되돌리기 3건 |
| 🟡 | 금액 반올림 | 설계 §3-1b 근거 기재(의도적 `Math.round`), 변경 시 IMP |
| 🟡 | `getOrganizations(1,500)` 잘림 | IMP 제안 이관 |
| 🟡 | 연/월 vs 기간 독립 | 실측 기재(서버는 4값 그대로 전달, RPC는 연/월 범위만 검증) |

### ⒝ PR (WBS 5.5~5.7, `Closes #1367`) — ⒜ 최종 head `28ef7c150`에서 분기
- **메뉴 3종** `src/components/layout/NaviSidebar.tsx` — Admin "정산/재무" 그룹의 수입·비용 현황 다음에 `/finance/statements`, 대리점 "대리점 관리" 그룹 마지막에 `/agency/statements`, 화주는 기존 `청구서 조회` 아래에 `/shipper/statements`. 모두 기존 `checkPermission(role, href, allowedPaths)` 필터를 타므로 새 권한 분기 없음(§2-7).
- **경로 허용 검토** — `rbac.ts`·`proxy.ts` **무변경**. 부모 접두 경로(`/finance`·`/agency`·`/shipper`)가 이미 등록·허용되어 세부 경로 추가가 불필요함을 로컬 `zen_role_permissions` 실측 + 코드 grep으로 확인.
- **nav i18n** — `Navigation.statements_nav`·`shipper_statements_nav` 신규, `shipper_invoices_nav`에 `(기존)` 접미(4로케일 동시). `Statements.excel` 신규 → 78키.
- **Excel 링크** — S3 각 행(`TC-361-29·30`)과 S5 상세(`TC-361-31`)에서 `/api/finance/statements/{id}/export` 링크 렌더. **조회 전용(RECEIVED·SUPERVISED)에서도 노출**, 변형 버튼은 계속 미렌더. 실제 Route Handler는 #1366 ⒝-2(PR #1411) 병합본 사용.
- **회귀** — statements 테스트 27→30케이스(취소 확인 3건 추가), R-09 항목 Continued(TC-361-29~31 + 취소 확인 TC-361-32~34), `build:lrtm` 재실행 + `check:lrtm` PASS(유령 0·허용목록 밖 미등재 0).
- **되돌리기 검증 추가 2건** — 목록 Excel 링크 제거 시 TC-361-29·30 FAIL(2 failed/7 passed), 상세 Excel 링크 제거 시 TC-361-31 FAIL(1 failed/8 passed). ⒜ 8건 + ⒝ Excel 2건 = 10건. 취소 확인 우회(`useEffect` 즉시 confirm) 추가 3건 — TC-361-07·32·33 FAIL(3 failed/27 passed) → 복구 후 30/30 재PASS, 잔존 마커 0. **총 13건**.
- **vacuous 패턴 0건** — ⒝ 신규 테스트도 렌더 결과(`getByRole('link')` + href/download 속성)만 단언.
- **전체 회귀(최종)** — 취소 확인·R-10 증적 반영 후 `npm run test:regression` **287파일/2203케이스 PASS(533.13초)**. `exceljs@4.4.0`은 ⒜에서 `--no-save --no-package-lock`으로 재설치한 상태 유지(추적 파일 변경 없음). `npm run build:lrtm`(2162건 인덱스) + `check:lrtm`(유령 0·허용목록 밖 미등재 0) + `check:ds11`(미반영 125건 모두 허용 목록) PASS.

## 5. 검증 (DoD)

### ⒜ PR DoD (5.1~5.4)
- [x] 설계 일치: S3·S4·S5를 `An_17` §6-4~§6-6·§6-5b·§6-5d 기준으로 구현. 시안은 비공개여서 열람 불가 → 설계서 기준. DTO 미보유 항목은 §2-5에 간극 기재(임의 값 미생성)
- [x] 역할별 노출 테스트: `scope`=MINE/RECEIVED/SUPERVISED × `status`별 버튼·배지 렌더 단언 21케이스. **메뉴 노출은 ⒝ 범위**(Jaison 2-PR 분할)
- [x] 조회 전용 모드 작업 영역 미렌더(TC-361-03·04·16·17). 서버 액션 자체 거부는 B-360 병합 테스트가 이미 검증
- [x] `truncated === true` 경고(TC-361-08) + `excludedUnsettled` 안내·`/settlement` 링크(TC-361-09)
- [x] 수기 화주: 자동완성·유사명 칩(TC-361-11)·오더별 화주명 열(TC-361-10)·`allowAdhoc=false` 옵션 미렌더(TC-361-12). `/shipper/statements`는 조회 전용 라우트만 존재
- [x] 4로케일 `Statements` 78키 동일, `Errors` 키 110개 유지. (`npm run check:i18n` 전역 FAIL은 기존 DEF-B-156 — 본 Task 신규 키 누락 0)
- [x] 영향도 분석 §2-7 기재(GitNexus 미연결 → grep 전수 명시), 변경 심볼 기대 범위 안
- [x] 되돌리면 테스트 FAIL — §4 조건별 표(8건 실측)
- [x] 컴포넌트 테스트 렌더 결과 단언, vacuous 패턴 0건
- [x] Ds-11: 신규 액션/RPC 없음 → 갱신 불필요. `npm run check:ds11` PASS(미반영 125개 모두 허용 목록)
- [x] R-09 v3.10: `regression-items/TASK-B-361_*.md` 신규, `npm run build:lrtm` + `npm run check:lrtm` PASS(유령 0·허용목록 밖 미등재 0)
- [x] `npm run test:regression` 전체 PASS(**287파일/2194케이스, 537초**, stale `exceljs` 재설치 후). `npm run build`는 **rebase 후 PASS** — DEF-B-162는 Mike/TASK-B-368(PR #1416)이 순수 유틸로 분리해 해소, 본 ⒜는 `StatementCreate.tsx`의 로컬 `normalize()`를 공용 유틸 import로 교체해 규칙 단일 출처 확보(Jaison 지시). 리뷰 수정 후 최종 CI 재확인 예정.
- [x] Jaison 지시(2026-11-22) 반영 — `origin/TeamB_Dev` @ `c89a5d2d9` rebase, 공용 유틸 import 전환, `normalize()` 값 단언 유지 + 되돌리기 표 반영(총 6건). 로컬 `npm run build` PASS.
- [x] Jaison 검토 수정요청 2건(조건 변경 무효화·오더정산 링크 제거) 반영 + 되돌리기 8건 실측. `npx eslint` 0 error, statements 관련 `tsc` 에러 0, 스위트 24/24 PASS. 최종 CI 재확인 필요.
- [x] 에러 로그 확인 — 無(로컬 Supabase `zen_error_logs` severity=ERROR 0건, 전체 0행). 라이브 최종 확인은 병합 후 JSJung
- [x] 스타일/타입: 신규 파일 `npx eslint` 0 warning, `npx tsc --noEmit`에서 statements 관련 에러 0(기존 `exceljs`·E2E·`.next` 에러는 범위 밖)
- [x] `check-R17-DoD` 자가 검증 통과 — 코드 커밋 → 해시 자동삽입 → 🔄→🔔 실제 diff 확인 → 문서 커밋 → PR 순서. (opentemplate 명령이므로 수동 동치 점검)

### ⒝ PR DoD (5.5~5.7)
- [x] `NaviSidebar.tsx` 메뉴 3종(Admin 정산/재무·대리점 관리·화주) + nav i18n 4로케일 — 설계 §6-5c 위치 준수
- [x] `rbac.ts`·`proxy.ts` 경로 허용 검토(§2-7 실측 결과 반영) — 부모 접두 경로로 이미 허용되어 **무변경 판정**, 근거 task file에 기재
- [x] Excel 링크 → `/api/finance/statements/[id]/export`(S3 행·S5 상세, 조회 전용 포함) — 렌더 단언 3케이스(TC-361-29~31) + 되돌리기 2건
- [x] Jaison 권고 반영 — 초안 취소 확인 모달(`CancelConfirmModal`) S3·S5 적용. 클릭 시 서버 호출 0, '취소 확정' 시에만 호출. TC-361-07·32~34 + 되돌리기 3건
- [x] 4로케일 `Statements` 82키 동일, `Navigation` 신규 2키 4로케일 반영, `Errors` 110키 유지 (`check:i18n` 전역 FAIL은 DEF-B-156)
- [x] R-09 v3.10: TC-361-29~31 추가, `npm run build:lrtm` + `npm run check:lrtm` PASS(유령 0·허용목록 밖 미등재 0)
- [x] 되돌리면 테스트 FAIL — §4 ⒝ Excel 2건 + 취소 확인 3건 실측(⒜ 8건 + ⒝ 5건 = 총 13건)
- [x] 컴포넌트 테스트 렌더 결과 단언, vacuous 패턴 0건
- [x] R-10 역할별(Admin·대리점·화주) 스크린샷 증적 + 실제 로그인·`page.goto()` 네비게이션 검증 — SETTLED/NOT_SETTLED 오더 시드 후 S4 조회로 역할별 무링크 안내 문구까지 확인(§6). 3/3 PASS, 스크린샷 8종
- [x] `check-R17-DoD` 자가 검증 — ⒜ 동일 절차(코드 커밋 → 해시 삽입 → 문서 커밋 → PR) 준수
- [x] S1·S2 화면은 Jaison 판단으로 범위 외 — 본 PR에서 착수하지 않고 링크 제거·역할별 안내로 대체. JSJung 확인 후 후속 Task 발령 예정(본 PR에서는 미구현을 명시)

## 6. R-10 실구동 증적 (⒝) — SETTLED 시드 반영 재실행 완료

_실제 IP 주소·계정·경로를 프로덕션 빌드 브라우저에서 확인한 기록. 스크린샷 저장: `docs/99_Manual/E2E_361_Result/`(R-13)._

### 6-1. SETTLED 오더 시드 방법 (Jaison 지시 — task file에 방법 기재)

`zen_orders`가 0건이므로 아래 SQL을 **로컬 Supabase에만** 적용했다(`npx supabase db query --local`은 다중 명령을 지원하지 않아 문장별 실행). 프로덕션/원격 DB에는 적용하지 않음.

| 단계 | SQL(요약) | 목적 |
|:--|:--|:--|
| 0 | `DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM zen_orders WHERE order_no LIKE 'B361-R10-%');` / `DELETE FROM zen_orders WHERE order_no LIKE 'B361-R10-%';` / `DELETE FROM zen_agency_shippers WHERE agency_org_id='80e10b0c-…' AND shipper_org_id='e7ee09d9-…';` | 멱등성(재실행 시 잔여 제거) |
| 1 | `UPDATE zen_organizations SET status='ACTIVE' WHERE id='80e10b0c-a417-437c-ad58-a689c05e5af6';` | Admin 생성 화면 대상 드롭다운은 `getOrganizations(1,500)`이 `status='ACTIVE'`만 반환 → R-10 대리점을 ACTIVE로 변경 |
| 2 | `INSERT INTO zen_agency_shippers (agency_org_id, shipper_org_id, shipper_type, is_active) VALUES ('80e10b0c-…', 'e7ee09d9-…', 'CORPORATE', true);` | AGENCY 생성 화면 ORG 대상 자격 검증(`zen_agency_shippers.is_active`) 통과용. `shipper_type` CHECK 제약은 `INDIVIDUAL`/`CORPORATE`만 허용 |
| 3 | `INSERT INTO zen_orders (order_no, cargo_details, status, transport_mode, agency_org_id, shipper_id, shipper_name, shipper_biz_no, cost_settlement_status, cost_settled_at, cost_settled_by, order_date, created_at, updated_at) VALUES ('B361-R10-SETTLED-001', …, 'DELIVERED', 'UPS', '80e10b0c-…', 'e7ee09d9-…', …, 'SETTLED', '2026-10-16 09:00+09', '827dd41a-…', …), ('B361-R10-NOTSETTLED-001', …, 'NOT_SETTLED', NULL, NULL, …);` | SETTLED 1건=후보 행, NOT_SETTLED 1건=「미정산 1건 제외」안내 문구 생성. `cost_settlement_status='SETTLED'`는 CHECK 제약상 `cost_settled_at`·`cost_settled_by` 필수 |
| 4 | `INSERT INTO order_status_history (order_id, prev_status, next_status, reason, created_at) SELECT id, 'IN_TRANSIT', 'DELIVERED', 'TASK-B-361 R10 seed', '2026-10-15 10:00+09' FROM zen_orders WHERE order_no LIKE 'B361-R10-%';` | 기준일(`dateBasis='DELIVERED'`) — 조회 기간 2026-10-01~10-31 KST 안에 들어오도록 2026-10-15 10:00 KST로 설정 |

> 시드 원문: `<로컬 임시 경로>/b361-r10-seed.sql`(로컬 임시 파일, 저장소 미포함). 위 표와 동일한 SQL을 문장별로 실행하면 재현 가능.

### 6-2. 실구동 결과

실행: `npm run build` → `npx next start -p 3008`(프로덕션) + Playwright 3케이스, **3/3 PASS(14.5초)**. 각 케이스에서 (1) 실제 로그인 성공 후 리다이렉트, (2) 역할별 사이드바 메뉴 노출(`청구서 관리` / `청구서 (월 차수)`), (3) `page.goto()`로 목록 경로 직접 진입 — HTTP < 400 + `청구서 관리` 헤딩, (4) Admin·AGENCY는 생성 경로에도 `page.goto()` 진입 → 대상 선택·기간 입력 후 「후보 오더 조회」로 SETTLED 후보 1건 + 역할별 무링크 안내 문구 렌더 확인, `a[href*="order-settlement"]` 0건, (5) pageerror·console error 0건을 확인했다. 단위 테스트(서버 액션 mock)가 아닌 **실제 미들웨어(`proxy.ts`) 라우팅까지 검증** — R-10·AGENTS.md 필수 검증 항목(2026-07-22) 준수.

| 역할 | 계정(RBAC role) | 실제 네비게이션 | 확인 결과 | 증적 |
|:--|:--|:--|:--|:--|
| ADMIN | `r10b361admin@zenith.kr` (ADMIN / PLATFORM) | 로그인 → 메뉴 `청구서 관리` → `page.goto('/ko/finance/statements')` → `page.goto('/ko/finance/statements/new')` | **PASS** — HTTP < 400, 헤딩·후보 `B361-R10-SETTLED-001`·안내 문구(화면 없음) 렌더, errors 0 | `admin_01_login.png`·`admin_02_statements.png`·`admin_03_create_notice.png` |
| AGENCY | `r10b361agency@zenith.kr` (AGENCY / AGENCY) | 로그인 → 메뉴 `청구서 관리` → `page.goto('/ko/agency/statements')` → `page.goto('/ko/agency/statements/new')` | **PASS** — HTTP < 400, 헤딩·후보 1건·안내 문구(관리자 요청) 렌더, errors 0 | `agency_01_login.png`·`agency_02_statements.png`·`agency_03_create_notice.png` |
| 화주 | `r10b361shipper@zenith.kr` (AGENCY_SHIPPER / SHIPPER) | 로그인 → 메뉴 `청구서 (월 차수)` → `page.goto('/ko/shipper/statements')` | **PASS** — HTTP < 400, 헤딩 렌더, 생성 버튼·`/new` 링크 0건, errors 0 | `shipper_01_login.png`·`shipper_02_statements.png` |

> 화주 계정은 초기에 `CORPORATE`로 만들었으나 `checkPermission`이 `/shipper` 경로를 `SHIPPER`·`AGENCY_SHIPPER`에만 허용(`rbac.ts` §rolePaths)하므로 사이드바에 화주 메뉴가 노출되지 않았다. roles spec §5 기준의 `AGENCY_SHIPPER`로 재설정한 뒤 3/3 PASS. 이 실측으로 rbac/proxy 무변경 판정(상위 경로 접두 허용)이 실제 브라우저에서도 확인됨.
>
> **Admin 안내 문구는 임시** — 오더정산(S1·S2) 화면이 미구현이어서「오더정산 화면이 없어 정산 처리가 불가합니다」로 표시한다. S1·S2가 후속 Task로 발령되면 해당 링크/화면으로 교체한다(Jaison 2026-11-22T04:02:42Z). AGENCY는「관리자에게 정산 처리를 요청하세요」를 유지.
>
> 에러 로그 확인 — 無 (R-10 v3.6): ⒝는 신규 서버 액션/API 라우트를 추가하지 않고 기존 병합본(#1366 PR #1411) Excel Route Handler를 링크만 했으므로 ⒝ 기인 신규 ERROR 없음. 배포 후 `/admin/error-logs` 최종 확인은 JSJung 담당(병합 후).
>
> ⚠️ 기존 ⒝ 검증 당시에는 DEF-B-162로 `npm run build`가 실패해 로컬 검증용으로만 해당 export를 일시 비공개화해 프로덕션 빌드 후 `next start`로 실구동 확인했고 **임시 수정은 커밋하지 않고 원복**함. 재base 후에는 Mike/TASK-B-368(PR #1416) 병합으로 DEF-B-162가 해소되어 **임시 수정 없이 `npm run build` PASS** 확인.
>
> ⚠️ 로컬 Supabase `db query` 실행 시 5개 테이블(`_profiles_grade_backup_20260521`, `zen_customs_history`, `zen_invoice_history`, `zen_master_order_history`, `zen_ups_shxk_country_map`)의 RLS 비활성 경고가 매 번 출력됨 — 기존 환경 경고이며 본 Task 범위 밖이므로 자동 remediation 하지 않음(정책 결정은 소유자). 최종 조치 여부는 JSJung에게 보고.
