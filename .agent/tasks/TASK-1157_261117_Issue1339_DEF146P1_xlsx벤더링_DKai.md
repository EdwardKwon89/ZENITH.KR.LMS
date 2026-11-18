# TASK-1157 — DEF-146 P1: xlsx 0.20.3 벤더링 전환

> **Issue:** #1339 · **브랜치:** `feature/teama-1157-def146-p1-xlsx-vendor_d_kai`
> **수행:** D_Kai · **검증:** Aiden (R-01) · **착수:** 2026-11-17 (KST)
> **워크트리:** `~/WorkSpace/ZENITH_LMS-worktrees/d_kai`

## 1. 목표

`xlsx@0.18.5` 는 high 2건(프로토타입 오염 CVE-2023-30533 <0.19.3, ReDoS CVE-2024-22363 <0.20.2)이며 **npm 레지스트리에 수정판이 없다**(SheetJS npm 배포 중단). SheetJS 공식 CDN 의 **0.20.3 tarball 을 `vendor/` 에 커밋**하고 `file:` 의존성으로 고정해 취약 버전을 제거한다.

## 2. 전제조건

- `[설계 확정]` (Aiden, 2026-11-17) — 아래 §3 에 원문 복사
- Team B 동의: #1319 (jungjs, 2026-11-16 14:12 KST, A안 동의)
- 로컬 검증만 수행(원격 Supabase·Vercel 쓰기·배포 금지)

## 3. [설계 확정] (Aiden, 2026-11-17 — Issue #1339 원문)

**방안: A안 — SheetJS 공식 CDN 0.20.3 tarball을 repo에 벤더링한다.** (B `exceljs`·C 유지·D CSV 전용은 채택하지 않음 — 사유는 분석 보고서 §5.2.)

| 항목 | 확정 내용 |
|:--|:--|
| 소스 | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` 를 내려받아 `vendor/xlsx-0.20.3.tgz` 로 커밋 |
| `package.json` | `"xlsx": "file:vendor/xlsx-0.20.3.tgz"` (캐럿 없이 고정) |
| 무결성 | `vendor/xlsx-0.20.3.tgz.sha256`(파일 해시) + `vendor/README.md`(출처 URL·버전·SHA-256·내려받은 날짜·"버전 상향 시 수동 점검 필요" 문구). lockfile의 `integrity`도 함께 커밋 |
| 소스 코드 | 변경 없음 목표(`import * as XLSX from 'xlsx'`·기본 코어 API만 사용). 타입은 패키지 동봉 |
| **빌드 경로(필수)** | **`Dockerfile`은 `npm ci` 전에 `package.json package-lock.json`만 복사**하므로 그대로면 `file:` 의존성 때문에 **Docker 빌드가 실패**한다 → deps 단계에 `COPY vendor ./vendor` 추가. `.dockerignore`·`.vercelignore`가 `vendor/`를 제외하지 않음을 확인(현재 미제외 — 변경 시 재확인). CI(`pr-checks.yml`)의 `npm ci`도 확인 |
| **`npm audit` 한계** | `file:` 의존성은 레지스트리 권고 매칭이 안 되어 `xlsx:high` 항목이 audit 결과에서 **사라진다**(= 해소가 아니라 "관측 불가"). 이 사각지대를 인정하고 다음으로 보완한다: ① `scripts/check-vendor.mjs`(`npm run check:vendor`, advisory) — tarball SHA-256이 `.sha256`과 일치하는지, `package.json` 참조 파일명 버전이 최소 안전 버전(**0.20.2**) 이상인지 점검 ② `pr-checks.yml`에 advisory 단계로 추가 ③ `scripts/audit-baseline.json`에서 `xlsx:high`를 **제거(축소)** 하고 사유를 `vendor/README.md`에 기록 |
| 롤백 | `package.json`·lockfile·`vendor/`·Dockerfile 변경 되돌리기(커밋 단위 분리) |

## 4. DoD 체크리스트 (Issue 원문)

- [x] R-06 대조 + 0.18.5↔0.20.3 fixture 비교표(판정 포함) task file 기재
- [x] `vendor/` tarball·`.sha256`·`README.md`, `package.json` `file:` 참조, lockfile `integrity`
- [x] Dockerfile `COPY vendor` 반영 + 컨테이너 빌드 실증(또는 대체 증빙)
- [x] `check-vendor.mjs` + `check:vendor` 스크립트 + advisory CI 단계 + baseline `xlsx:high` 제거(축소만)
- [x] build·회귀 전체 PASS 수치, 수동 4경로 증적, 에러 로그 확인 문구
- [x] **R-09**: `sheet_to_json` 기본 동작 회귀 테스트(fixture 파싱, 날짜·숫자·빈 셀) 신규 추가 + `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] R-12 해당 없음(액션 시그니처 불변), R-17 완료 보고 절차 준수, **실배포 미수행**
- [ ] 병합 후 Team B에 develop→TeamB_Dev 동기화 고지 — **Aiden 담당(#1319 공지)**, 구현 Agent 범위 밖

## 5. [작업 결과] (D_Kai)

> **코드 커밋:** `356ac423429722b8c27a3adf83fd4e4f725624c2` — `[D_Kai] feat: TASK-1157 xlsx 0.20.3 벤더링 전환 (DEF-146 P1, Issue #1339)`

### 5.1 R-06 — 공식 변경 이력 대조 (0.18.5 → 0.20.3)

대조 자료: **벤더링한 tarball 에 동봉된 공식 `CHANGELOG.md`**(`package/CHANGELOG.md`) 원문. 웹 문서는 `docs.sheetjs.com/docs/miscellany/changelog` 가 404 이고 저장소 위키는 로그인 요구라, **배포처 원본에 들어 있는 CHANGELOG 를 1차 자료로 사용**했다(추측 없이 바이트 단위로 고정된 근거).

| 버전 | 공식 CHANGELOG 원문 중 우리 경로에 관련된 항목 |
|:--|:--|
| v0.19.3 | `Fixed "Prototype Pollution" vulnerability (CVE-2023-30533)` · `Enforce Excel worksheet name restrictions` |
| v0.20.0 | **`Use UTC interpretation of Date objects for date cells (potentially breaking)`** · `API functions support UTC and local time value interpretations` · `Export NaN values to #NUM! and infinite values to #DIV/0!` |
| v0.20.1 | `SSF date code rounding to 15 decimal digits` · **`sheet_to_json force UTC interpretation for formatted strings`** · `dense option added to types` |
| v0.20.2 | **`Reworked parsing methods to avoid slow regexes (CVE-2024-22363)`** |
| v0.20.3 | `Correct parsing of NUMBERS and ODS merge cells` · `More precise treatment of infinite and NaN values` · `XLML Streaming Write` · `Parse Int8Array objects` · `CSV Export only quote leading ID` |

**대조 결론**

| API/옵션 | 0.18.5 ↔ 0.20.3 | 우리 코드 영향 |
|:--|:--|:--|
| `read()` 기본값(`cellDates:false`) | 날짜 셀은 **여전히 serial number** | 없음 |
| `sheet_to_json()` 기본값(`raw:true`) | 숫자·날짜 모두 **원시 number 유지**, 미존재 셀은 키 생략 | 없음 — 대량등록 파서가 쓰는 경로 |
| `sheet_to_json(..., {raw:false})` | 0.20.1 에서 **포맷 문자열의 UTC 해석** 변경. 실측(§5.2) 결과 **정수 serial·소수(날짜+시간) serial 모두 0.18.5 와 동일 문자열** | 없음(우리 코드는 `raw:false` 미사용) |
| `read(..., {cellDates:true})` | **0.20.0 UTC 해석으로 값이 달라짐**(실측 §5.2: `2026-01-14T14:59:08Z` → `2026-01-15T00:00:00Z`) | 없음 — `src/` 전체에서 `cellDates` **0건** |
| `write()` | NaN/Infinity export 표기, XLML streaming 등 — 우리는 `bookType:'xlsx'` + 정상 숫자만 사용 | 없음 |
| 타입(`.d.ts`) | 패키지 동봉 유지, `dense` 옵션 타입 추가 | 없음(타입 오류 0 — §5.5 build) |

`src/` 실사용 4파일 5지점 확인: `BulkOrderUploadModal.tsx:63,76-78`(`read({type:'array'})` + `sheet_to_json` 기본), `lib/excel/bulk-order-template.ts:59-70`(`write` base64), `lib/actions/agency-settlement.ts:275-284`(`json_to_sheet`+`write`), `app/api/finance/export/route.ts:161-175`(동일). **모두 기본 옵션만 사용**하며 `cellDates`·`raw:false`·`cellFormula` 등 영향 옵션은 쓰지 않는다.

### 5.2 0.18.5 ↔ 0.20.3 실증 비교 (동일 입력 바이트)

픽스처: 0.20.3 으로 `write` 한 **같은 xlsx 바이트**를 양쪽 버전이 `read` → 날짜 serial+서식(B2/B3), 명시적 빈 문자열(E2), 미존재 셀(F2/F3), 수식+캐시값(G2/G3), 다중 시트(오더/패키지/아이템) 포함.

| 케이스 | 0.18.5 | 0.20.3 | 판정 |
|:--|:--|:--|:--|
| `sheet_to_json` 기본 — 날짜 셀 | `46037` (number) | `46037` (number) | **동일** |
| `sheet_to_json` 기본 — 숫자 | `10` / `1234.56` / `0` | `10` / `1234.56` / `0` | **동일** |
| `sheet_to_json` 기본 — 수식 셀(캐시값) | `20` (number) | `20` (number) | **동일** |
| `sheet_to_json` 기본 — 명시적 빈 셀 | `""` (키 존재) | `""` (키 존재) | **동일** |
| `sheet_to_json` 기본 — 미존재 셀 | 키 **생략** | 키 **생략** | **동일** |
| `sheet_to_json {raw:false}` — 날짜 서식 | `"1/15/26"` / `"3/1/26"` | `"1/15/26"` / `"3/1/26"` | **동일** |
| `sheet_to_json {raw:false}` — 숫자 | `"10"` / `"1234.56"` | `"10"` / `"1234.56"` | **동일** |
| `raw:false` 날짜+시간(serial `46037.5`, `m/d/yy h:mm`) | `"1/15/26 12:00"` | `"1/15/26 12:00"` | **동일** |
| 시트명·순서 | `['오더','패키지','아이템']` | `['오더','패키지','아이템']` | **동일** |
| `read {cellDates:true}` — B2 Date | `2026-01-14T14:59:08.000Z` | `2026-01-15T00:00:00.000Z` | **차이(UTC 해석)** — 우리 코드 미사용 |

**판정: 대량등록 파서(`read` + `sheet_to_json` 기본 옵션)에 영향 없음.** 차이는 `cellDates:true` 경로에만 존재하며 `src/` 사용처 0건이다. 이 결론을 회귀 테스트 `TC-1157-03~05` 로 고정했다.

### 5.3 구현 내용

| 파일 | 변경 |
|:--|:--|
| `vendor/xlsx-0.20.3.tgz` | 공식 CDN 원본 **2,409,319 bytes**, SHA-256 `8dc73fc3…bb99fe8` (재압축·수정 없음) |
| `vendor/xlsx-0.20.3.tgz.sha256` | 파일 해시 고정 |
| `vendor/README.md` | 출처 URL·버전·다운로드 날짜·SHA-256·"버전 상향 시 수동 점검 필요"·Docker 경로 주의 |
| `package.json` | `"xlsx": "file:vendor/xlsx-0.20.3.tgz"` + `"check:vendor"` 스크립트 |
| `package-lock.json` | `file:` 참조 + `integrity`(SRI) 반영, 구 의존성(`adler-32`·`cfb`·`codepage` 등 0.18.5 계열) 제거 — **P0 5종·vitest 4.1.4 버전 변동 0건** |
| `Dockerfile` | deps 스테이지 `COPY package.json package-lock.json` **직후·`RUN npm ci` 직전**에 `COPY vendor ./vendor` |
| `scripts/check-vendor.mjs` (신규) | ① 참조 파일 존재 ② SHA-256 일치 ③ tarball 내부 name/version·안전 하한(0.20.2) ④ Dockerfile `COPY vendor` 위치 ⑤ README 필수 문구 — advisory(exit 0), `--strict` 지원 |
| `.github/workflows/pr-checks.yml` | `vendor-advisory` job 추가(advisory, `continue-on-error`) — npm audit 사각지대 보완 |
| `scripts/audit-baseline.json` | `xlsx:high` 제거(13→12건, **축소만**) · `generatedAt` 2026-11-17 |
| `tests/unit/excel/xlsx-vendor.test.ts` (신규) | TC-1157-01~05 (버전 하한·tarball/lockfile 무결성·`sheet_to_json` 기본/`raw:false`/다중 시트) |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | §91 신규 등재(R-09) |

`.dockerignore`·`.vercelignore` 는 `vendor/` 를 제외하지 않음을 확인(변경 없음).

### 5.4 R-09 회귀 테스트

`tests/unit/excel/xlsx-vendor.test.ts` — TC-1157-01~05. 상세는 `LIVE_REGRESSION_TEST_MAP.md` §91.

### 5.5 검증 수치

| 항목 | 결과 |
|:--|:--|
| `npm ci` (클린 설치) | PASS — `node_modules/xlsx` = **0.20.3** (`file:vendor/…` 해석) |
| `npm run build` | **EXIT=0** |
| `npm run test:regression` | **262 test files / 1,928 tests 전부 PASS** (Duration 314.91s, EXIT=0) |
| `npm run check:vendor` | PASS — SHA-256 일치 / 하한 0.20.2 이상 / Dockerfile COPY 위치 / README 문구 |
| `npm run check:audit` | PASS — 12건(critical 0·high 4·moderate 7·low 1), 허용 목록 밖 신규 **0건** |
| `npm audit --omit=dev` 전/후 | 전(develop): 13건 · `xlsx:high` 포함 → 후: 12건 · `xlsx` 항목 없음(`file:` 의존성은 audit 관측 대상 아님) |
| `npm run check:ds11` | PASS — 액션 298개 / 미반영 206개(허용 206) · **신규 0건** |
| `npm run check:doc-links` | PASS — 깨진 링크 84건(허용 84) · **신규 0건** |
| lockfile 무결성 | 버전 변경 **1건(`xlsx` 0.18.5→0.20.3)**, 구 의존성 8개(`adler-32`·`cfb`·`codepage`·`crc-32`·`frac`·`ssf`·`wmf`·`word`) 제거, 추가 0건. `vitest` 4.1.4·`next` 16.4.6·`react`/`react-dom` 19.2.4·`@supabase/supabase-js` 2.103.3 **불변**(P0 고정 유지) |
| **Dockerfile deps 스테이지 실증** | `docker build --target deps` → **EXIT=0**. 로그: `[deps 4/5] COPY vendor ./vendor` → `[deps 5/5] RUN npm ci` → `added 765 packages, and audited 766 packages in 1m`. 컨테이너 안에서 `file:` 의존성이 풀리지 않으면 `npm ci` 가 실패하므로, **빌드 성공 자체가 증명**이다 |

### 5.6 R-10 수동 4경로 (실브라우저 — 로컬 dev 서버 + Playwright)

증적: `docs/99_Manual/E2E_1157_Result/` (스크린샷 10장 + 내려받은 XLSX 4개). 다운로드 파일은 내려받은 뒤 0.20.3 으로 다시 `read` 해 시트·행수를 검증했다.

| # | 경로 | 결과 | 증적 |
|:--|:--|:--|:--|
| ① | 대량등록 3시트 파싱 (`BulkOrderUploadModal` — `read`+`sheet_to_json` 기본) | **PASS** — 템플릿에 2번째 오더/패키지/아이템 행을 추가해 업로드 → 미리보기 `오더 2건 · 패키지 2건`. 등록 실행 결과 **성공 2 / 실패 0** | `01_orders-list.png`, `02_bulk-modal.png`, `04_bulk-preview.png`, `05_bulk-result.png` |
| ② | 결과 XLSX 다운로드 (`json_to_sheet`+`write`) | **PASS** — `06_bulk_order_result.xlsx` (16,425 bytes, 시트 `결과`, **3행** = 헤더+2건) | `06_bulk_order_result.xlsx` |
| ③-A | 정산 export — `/api/finance/export` (관리자 `/ko/finance` Export Excel) | **PASS** — `08_finance_export.xlsx` (21,540 bytes, 시트 `정산데이터`, **17행**) | `07_finance-page.png`, `08_finance_export.xlsx`, `09_finance-exported.png` |
| ③-B | 정산 export — `agency-settlement` (`AGENCY` 계정 `/ko/agency/settlements` 엑셀 다운로드) | **PASS** — `11_agency_settlement_export.xlsx` (20,553 bytes, 시트 `정산내역`, **14행**) | `10_agency-settlements.png`, `11_agency_settlement_export.xlsx`, `12_agency-exported.png` |
| ④ | 양식(템플릿) 다운로드 (`generateBulkOrderTemplate`) | **PASS** — `03_bulk_order_template.xlsx` (21,529 bytes, 시트 3개 `오더(Order)`·`패키지(Package)`·`아이템(Item)`) | `03_bulk_order_template.xlsx` |

### 5.7 에러 로그 확인

**에러 로그 확인 — 無** (`/ko/admin/error-logs` 화면 확인, 증적 `13_admin-error-logs.png`). 화면 내 `xlsx`·`bulk`·`엑셀`·`finance/export`·`agency-settlement` 키워드 매칭 0건이며, `zen_error_logs` 를 최근 2시간·severity=ERROR 로 직접 조회한 결과도 **0건**이다.

### 5.8 특이사항 / 범위 밖 발견

- `npm audit` 은 `file:` 의존성을 검사하지 않으므로 **`xlsx:high` 소멸은 "해소"가 아니라 "관측 불가"** 다. 이 사각지대는 `check:vendor`(고정 바이트 무결성) + `vendor/README.md`(수동 점검 절차) + 회귀 테스트(버전 하한) 3중으로 보완했다.
- Team B 소유 파일(`BulkOrderUploadModal.tsx` 등)은 **소스 수정 없음** — `read`/`sheet_to_json` 기본 옵션 그대로 호환됨을 실증으로 확인.
