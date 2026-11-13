# TASK-B-350 — Issue #1292: 오류 로케일 인프라 + 파일럿 1건 (PR ①-a, 부모 #1280)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1292](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1292) (부모 #1280 / PR #1289 설계 확정) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-13 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔧 진행 중 (`status:in-progress`) |
| **브랜치** | `feature/teamb-task-b350-iss1292-error-locale-infra` (base `origin/TeamB_Dev` @ `92025f86c`) |
| **채번 확인** | 착수 직전 `find .agent/tasks -name "TASK-B-350*"` → **0건** 확인. Jaison 지정 `TASK-B-350` 사용 |
| **범위** | 인프라(`Errors` 네임스페이스·헬퍼·키 동기화 테스트) + **파일럿 1건**(`wallet.ts`)**만**. UPS/SHXK/창고 액션 일괄 적용(①-b)·클라이언트 수정은 **범위 외** |

## 1. 목표

#1280 확정안 **안 ②**(서버 액션이 로케일 문장을 반환, `{error: string}` 계약 유지)의 **1단계 구현**.

1. 로케일 해석을 **실행으로 실증**(소스 읽기·추정 금지)
2. `Errors` 네임스페이스(ko/en/zh/ja 동일 키 세트) + `src/lib/i18n/action-error.ts` + 중앙 테스트 mock + 키 동기화 테스트
3. 파일럿: `payInvoiceFromWallet()`의 `INSUFFICIENT_BALANCE` **코드 문자열 노출 제거**
4. throw 531건 처리 방침은 **설계 의견만**(구현 금지)

## 2. 1단계 — 로케일 해석 실행 실증 ✅

### 방법 (커밋하지 않은 임시 확인용 코드)
- 임시 서버 액션 `src/app/actions/locale-probe.ts`(`'use server'`): `getLocale()` + `getTranslations({ namespace: 'Auth' })`(**locale 명시 주입 없이**)로 결과를 `os.tmpdir()` JSON에 기록.
- 임시 페이지 `src/app/[locale]/(auth)/login/probe/page.tsx`: `<form action={probeLocale}>` — Progressive Enhancement 경로로 **실제 Server Action POST**를 발생시킴(`/login`은 인증 화이트리스트라 미들웨어 통과).
- 로컬 dev 서버: `npm run dev -- -p 3100` (Next.js **16.2.4**, Turbopack). 로컬 Supabase 기동 상태(`localhost:54322 up`).
- 호출: `GET /{locale}/login/probe` → HTML의 `$ACTION_ID_*` 추출 → `POST /{locale}/login/probe` (`multipart/form-data`, Next 16 기본값).
- **검증 후 임시 파일 삭제 + `git status --short` 비어 있음 확인**(아래 2-4).

### 실제 출력 (원문 그대로)

`POST /ko/login/probe` → HTTP 200
```json
{
  "locale": "ko",
  "authMsg": "요청 횟수가 너무 많습니다. 3초 후에 다시 시도해 주세요.",
  "at": "2026-11-13T03:58:39.143Z"
}
```

`POST /en/login/probe` → HTTP 200
```json
{
  "locale": "en",
  "authMsg": "Too many requests. Please try again after 3 seconds.",
  "at": "2026-11-13T03:58:39.248Z"
}
```

추가 확인(4개 로케일 전부):

| 요청 | HTTP | `locale` | `authMsg` |
|:--|:--|:--|:--|
| `POST /ko/login/probe` | 200 | `ko` | 요청 횟수가 너무 많습니다. 3초 후에 다시 시도해 주세요. |
| `POST /en/login/probe` | 200 | `en` | Too many requests. Please try again after 3 seconds. |
| `POST /zh/login/probe` | 200 | `zh` | 请求过于频繁，请在 3 秒后重试。 |
| `POST /ja/login/probe` | 200 | `ja` | リクエストの回数が多すぎます。3秒後に再試行してください。 |

dev 서버 로그(요청별 실행 시간 포함):
```
 POST /ko/login/probe 200 in 141ms (next.js: 17ms, proxy.ts: 11ms, application-code: 112ms)
 POST /en/login/probe 200 in 84ms (next.js: 12ms, proxy.ts: 8ms, application-code: 64ms)
 POST /zh/login/probe 200 in 144ms (next.js: 54ms, proxy.ts: 10ms, application-code: 79ms)
 POST /ja/login/probe 200 in 83ms (next.js: 15ms, proxy.ts: 8ms, application-code: 59ms)
```

### 결론
- **미들웨어 헤더 방식(`x-next-intl-locale`)이 Server Action POST에서 실제로 동작**한다. `getLocale()`·`getTranslations({namespace})`(locale 미지정) 모두 현재 로케일을 정확히 반환.
- 따라서 **2단계 진행 조건 충족**. 단, 테스트 환경(요청 컨텍스트 없음)에서는 헤더가 없으므로 `action-error.ts`는 `getLocale()` 실패 시 `routing.defaultLocale`('ko')로 폴백하고, `getTranslations({ locale })`로 **명시 주입**한다(결정적 동작).
- 증빙 파일(임시): `scratch/b350-evidence/b350-probe-{ko,en,zh,ja}.json`, `scratch/b350-evidence/dev.log` — **R-13에 따라 커밋하지 않음**.

### 2-4. 임시 코드 정리 확인
```
$ rm -f src/app/actions/locale-probe.ts
$ rm -rf "src/app/[locale]/(auth)/login/probe"
$ git status --short
(출력 없음)
```

## 3. 2단계 — 인프라 구현 결과

### 3-1. `Errors` 네임스페이스 (ko/en/zh/ja 동일 15키)
- `messages/{ko,en,zh,ja}.json` 최상단에 `Errors` 추가(각 17줄, 파일 전체 재포맷 없음 — diff는 추가만).
- 키(ko 기준): `generic`(`{code}`), `order_not_found`, `packages_not_found`, `order_has_no_packages`, `shipping_method_not_found`, `shxk_required_missing`(`{fields}`), `shxk_generic`(`{code}`), `label_issue_failed`, `label_void_failed`, `document_fetch_failed`, `permission_denied`, `insufficient_balance`, `not_found`, `network_error`, `unknown_action`.
- ⚠️ **zh/ja 번역은 초안** — PR 본문에 "zh/ja 검수 필요" 명시(지시대로).

### 3-2. `src/lib/i18n/action-error.ts` (34줄, 50줄 이하)
- `actionLocale()`: `getLocale()` → `LOCALES` 포함 검증 → 실패/미지원 시 `DEFAULT_LOCALE`('ko').
- `trError(key, params?)`: `getTranslations({ locale: await actionLocale(), namespace: 'Errors' })` → `t(key, params)`.
- `ErrorKey` 타입: `typeof import('messages/ko.json')['Errors']`의 키 유니온(오타 컴파일 차단).
- **설계 변경 1건(근거)**: `@/i18n/routing`을 직접 import하면 `createNavigation()`(클라이언트 번들) 때문에 vitest에서 `next/navigation` 해석 실패(`Cannot find module 'next/navigation'`)로 **기존 테스트가 깨진다**(wallet.test 실측). 이를 피하기 위해 로케일 상수를 `src/i18n/locales.ts`(10줄, 의존성 0)로 분리하고 `routing.ts`도 이를 참조하도록 정리(단일 출처 유지).

### 3-3. 테스트 중앙 mock (`tests/setup.ts`, +48줄)
- `vi.mock('next-intl/server')`: `getLocale()` → `'ko'`, `getTranslations(namespace)` → `messages/ko.json`의 **실제 값**을 namespace 경로로 조회해 반환.
- ICU 플레이스홀더(`{code}`·`{fields}`) 치환 포함. **키 문자열을 그대로 반환하지 않음**(문구 단언이 의미를 유지하도록).
- 키가 없으면 `MISSING_MESSAGE: …` 예외 → 문구 누락이 테스트에서 즉시 드러난다.
- 파일 단위 `vi.mock('next-intl/server')`가 있으면 그 mock이 우선(기존 31개 파일 영향 없음).
- **기존 테스트 무수정 통과 확인**: 전체 회귀 240파일/1,741테스트 PASS(§6).

### 3-4. 키 동기화 테스트 (`tests/unit/i18n/errors-key-sync.test.ts`, 86줄, 7 테스트)
- ko 기준 15키 집합을 `toEqual`로 고정(키 추가·삭제 시 갱신 강제), en/zh/ja 키 집합 `toEqual`, 값 truthy/string, ICU 플레이스홀더 이름 집합 일치.
- 범위는 **`Errors` 한정**(DEF-B-156 전역 FAIL과 분리).
- 되돌리기 검증: `en.Errors.insufficient_balance` 삭제 → **2 failed / 5 passed (7)** → 복구 후 **7 passed**.

### 3-5. 파일럿 — `payInvoiceFromWallet()` (`src/app/actions/misc/wallet.ts:172~180`)
```ts
if (rpcError.message.includes('INSUFFICIENT_BALANCE')) {
  logger.warn(`[WALLET] pay_invoice_from_wallet_atomic failed: ${rpcError.message}`);
  const insufficientBalance = await trError('insufficient_balance');
  return { success: false, error: insufficientBalance, message: insufficientBalance };
}
```
- **`src/components/**` 무수정** — `PaymentModal.tsx:44`는 `result.error`를 그대로 출력하므로 안 ②의 전제(클라이언트 수정 불요)가 실증됨.
- 원문(`rpcError.message`)은 `logger.warn`으로만 보존(R-18).
- `tests/unit/finance/wallet.test.ts:115` 기대값을 `'INSUFFICIENT_BALANCE'` → `'잔액이 부족합니다.'`로 **의도적 갱신**(사유: 코드 문자열 노출 제거가 목적).
- 되돌리기 검증: `error: 'INSUFFICIENT_BALANCE'` 원복 → **1 failed / 3 passed (4)** (`expected 'INSUFFICIENT_BALANCE' to be '잔액이 부족합니다.'`) → 복구 후 **4 passed**.

### 3-6. 변경 파일 (범위 준수)
| 파일 | 구분 |
|:--|:--|
| `messages/{ko,en,zh,ja}.json` | `Errors` 15키 추가 |
| `src/lib/i18n/action-error.ts` | 신규 헬퍼 |
| `src/i18n/locales.ts` | 신규 상수(의존성 0) |
| `src/i18n/routing.ts` | 상수 참조로 정리(3줄) |
| `tests/setup.ts` | 중앙 mock 추가 |
| `tests/unit/i18n/errors-key-sync.test.ts` | 신규 |
| `src/app/actions/misc/wallet.ts` | **파일럿 1건** |
| `tests/unit/finance/wallet.test.ts` | 파일럿 기대값 갱신 |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | §81 신규 |
- `ups-labels.ts`·`ups-actual-cost.ts`·`ups-actual-charges.ts`·`tracking.ts`·`warehouse.ts`·`src/components/**` 변경 **0건**.

### 3-7. R-20 영향도 (GitNexus 불가)
- GitNexus: 바이너리·인덱스 모두 없음(`which gitnexus` 없음, `.gitnexus/` 없음, `npx gitnexus` 미설치) → **불가**. grep 대체 수행:
  - `payInvoiceFromWallet` 호출처: `src/components/finance/PaymentModal.tsx:38`(표시만), `src/app/actions/misc/index.ts:65`(재export), `tests/unit/finance/wallet.test.ts`. 반환 계약 `{success,error,message}` 불변 → **blast radius는 문구 값 1곳**. Risk Low.

## 4. 3단계 — throw 처리 방침 [설계 의견] (구현 금지)

### (a) 실측 — throw 지점

| 범위 | 건수 | 비고 |
|:--|--:|:--|
| `src/app/actions` 전체 | **531** | `grep -rc "throw new Error" src/app/actions --include='*.ts'` 합계 |
| 핵심 경로 합계 | **71** | 아래 5개 파일 |
| `operations/warehouse.ts` | **55** | `"User profile not found"`/`"권한이 없습니다."`/`"Failed to fetch …"` 반복 |
| `operations/tracking.ts` | 5 | `"Failed to add tracking event: …"` 등 영문 |
| `finance/ups-actual-charges.ts` | 5 | `"부가요금 등록 권한이 없습니다."` 등 |
| `finance/ups-actual-cost.ts` | 3 | `"UPS 실제 원가 확정 권한이 없습니다 …"`, `"User profile not found"` |
| `operations/ups-labels.ts` | 3 | `PDF 다운로드 실패`, `PDF 업로드 실패`, `문서 메타데이터 저장 실패` |
| (참고) `misc/wallet.ts` | 20 | 파일럿 대상 파일 — `"인보이스를 찾을 수 없습니다."`, `"이미 결제된 인보이스입니다."` 등 |

대표 위치: `ups-actual-cost.ts:44`, `ups-actual-charges.ts:21,273,289,308,363`, `tracking.ts:97,127,145,179,211`, `warehouse.ts:39,42,69,77,80,107,128,131`, `ups-labels.ts:95,138,157`, `wallet.ts`(20건).

### (b) 대안 비교

| 방안 | 내용 | 장점 | 단점·리스크 |
|:--|:--|:--|:--|
| **A. `withAction()` 래핑** | `withAction(async () => {...})`가 try/catch로 예외를 `{ success:false, error: trError('generic',{code}) }`로 변환 + `logger.error` | 531건을 **호출부 수정 없이** 일괄 커버(래퍼 적용만), 프로덕션 메시지 마스킹 문제 해소, 원문은 로그 보존 | 반환 타입이 유니온으로 넓어져 호출부 타입 추론 약화 가능, 액션별 `{success:true,…}` 형태 차이 흡수 필요, throw를 **의도적 제어흐름**으로 쓰는 곳(권한 거부 등)은 여전히 generic 문구로 뭉개짐 |
| **B. `{success:false,error}` 반환 전환** | 각 throw를 명시적 반환으로 치환 | 실패 사유를 **정확한 키**로 전달(권한/미존재 구분), 타입 안전 | 531건 수동 치환 → ①-b 이후 별도 대형 Task, 누락 시 동작 불변(조용한 미전환), 리팩터링 리스크 큼 |
| **C. 혼합(권장)** | 핵심 경로 71건은 **B**(정확한 키), 나머지는 **A**로 안전망 | 사용자 메시지 정확도 + 누락 방지 이중화 | 래퍼·직접반환이 공존 → 규약 문서화 필요 |

**추천: C(혼합)** — ①-b에서 UPS/SHXK/창고 71건은 키 기반 반환(B), 그 외 460건은 `withAction()` 안전망(A). 근거: 핵심 경로는 "권한 없음/미존재/외부 API 실패"를 사용자가 구분해야 재시도·문의 판단이 가능하고, 나머지는 generic으로도 충분하며 531건 전면 수동 치환은 회귀 위험이 크다.

### (c) 관측성(R-18) 영향

- `withAction()`은 catch에서 **반드시** `logger.error('[ACTION] …', err)`를 호출한 뒤 사용자용 문구를 반환해야 한다(원문·스택은 로그에만).
- B로 전환하는 지점도 `return {success:false,...}` 직전에 `logger.error`/`warn`을 남긴다(현재 `warehouse.ts` 다수는 로그 없이 throw → 실패 원인 추적 불가).
- SHXK 원문은 기존 경로(`logger.error` + `zen_ups_label_errors` insert, `ups-labels.ts:403`)를 그대로 유지한다.
- 권장 로그 필드: `errorCode`(키), `action`, `requestId`(기존 `runWithRequestContext`), 외부 응답 원문(SHXK).

## 5. 검증 (DoD)

- [x] 1단계 실증 증거(ko/en 실제 응답) 기재 — §2 완료
- [x] `messages/*.json` `Errors` 4개 로케일 동일 키 세트 + 파일럿 키 포함 — §3-1
- [x] `src/lib/i18n/action-error.ts` (`actionLocale()`·`trError()`, 50줄 이하) — 34줄
- [x] `tests/setup.ts` 중앙 mock — `messages/ko.json` 실제 값 반환, 기존 테스트 무수정 통과
- [x] `tests/unit/i18n/errors-key-sync.test.ts` (키 집합 `toEqual`·빈 값 없음·ICU 파라미터 일치)
- [x] 파일럿 `wallet.ts` 코드 문자열 제거 + `wallet.test.ts` 의도적 갱신
- [x] 키 동기화 되돌리기 검증(en 키 1개 삭제 → 2 failed/5 passed → 복구 7 passed)
- [x] 전체 회귀 PASS — `Test Files 240 passed (240)` / `Tests 1741 passed (1741)`
- [x] 회귀맵 새 섹션 §81 등재(R-09)
- [x] `git diff origin/TeamB_Dev --stat` 에 파일럿 외 액션·`src/components/` 변경 없음
- [x] R-20: GitNexus 불가 명시 + grep 호출처 확인(§3-7)
- [x] `npm run build` → `BUILD_EXIT=0` (`✓ Compiled successfully in 27.3s`)

## 6. [작업 결과]

- 코드 커밋: **`d199724c6`** `[Dave] feat: TASK-B-350 오류 로케일 인프라(Errors 네임스페이스·trError) + 파일럿 wallet` (rebase 후 재작성된 해시)
- 문서 커밋: 본 task file (`.agent/tasks/TASK-B-350_261113_Issue1292_ErrorLocaleInfra.md`)
- PR: base `TeamB_Dev` / `Closes #1292`
- 라벨: `status:open` → `status:in-progress` → `status:review`

### 6-1. 검증 결과 (실측 인용)

| 검증 | 명령 | 결과 |
|:--|:--|:--|
| 1단계 로케일 실증 | `npm run dev -p 3100` + `POST /{ko,en,zh,ja}/login/probe` | 4개 로케일 모두 HTTP 200 + 해당 로케일 문구 반환(§2 원문) |
| 신규/영향 테스트 | `npx vitest run tests/unit/i18n/errors-key-sync.test.ts tests/unit/finance/wallet.test.ts` | `Test Files 2 passed (2)` / `Tests 11 passed (11)` |
| 키 동기화 되돌리기 | en 키 삭제 → 실행 → 복구 | **2 failed / 5 passed (7)** → 복구 후 **7 passed** |
| 파일럿 되돌리기 | `error:'INSUFFICIENT_BALANCE'` 원복 → 실행 → 복구 | **1 failed / 3 passed (4)** → 복구 후 **4 passed** |
| 전체 회귀(R-08) | `npm run test:regression` | **`Test Files 240 passed (240)` / `Tests 1741 passed (1741)`** (exit 0) |
| 빌드 | `npm run build` | `BUILD_EXIT=0`, `✓ Compiled successfully in 27.3s` |
| 타입체크(advisory) | `npx tsc --noEmit` | 오류 174건(전부 기존·무관 파일), **본 Task 변경 파일 0건** |
| DB 신선도 | `npx supabase migration list --local` | pending **0건** |

### 6-2. 산출물 요약
- `Errors` 15키 × 4 로케일 / `trError()`·`actionLocale()` 34줄 / `src/i18n/locales.ts` 10줄 / 키 동기화 테스트 7건 / 중앙 mock 48줄 / 회귀맵 §81.
- 파일럿: `wallet.ts`에서 `INSUFFICIENT_BALANCE` **사용자 노출 제거**, 클라이언트 수정 0건.

### 6-3. `check-R17-DoD`
본 환경에 `check-R17-DoD` 실행 파일/슬래시 커맨드가 **없음**(`which` 미검출, TASK-B-345/348 동일) → §5 DoD를 수동 대조했다(미체크 0건, placeholder 0건, 커밋 해시·회귀 카운트 기재 완료).

### 6-4. 🔁 재작업 이력 (Jaison 리뷰 2026-11-13 — 머지 충돌 해소)

**차단 사유**: `LIVE_REGRESSION_TEST_MAP.md` 충돌 — #1293(Mike, TASK-B-344)이 먼저 머지되어 **§80을 사용**했고 본 PR도 §80이었다. 통과 CI도 충돌 이전 base 기준이라 최종 머지 상태 증거가 아니었음.

| 단계 | 실행 | 결과 |
|:--|:--|:--|
| 1 | `git fetch origin TeamB_Dev` → `git rebase origin/TeamB_Dev` | base `92025f86c` → **`0fd7528ff`**(#1293 병합분 포함) |
| 2 | 충돌 해소 | **타 Task(§80 Mike/TASK-B-344) 섹션 무수정 유지**, 본인 섹션만 **§81로 재번호**. 충돌 마커 0건 확인 |
| 3 | 회귀맵 헤더 재계산 | `1,734 Cases / 239 files` → **`1,741 Cases / 240 files`**(#1293 값 위에 본 PR 신규 7테스트·1파일 합산, 덮어쓰기 없음). 최종 검증일 문구를 TASK-B-350 §81로 갱신, §81에 회귀 검증 줄 추가 |
| 4 | 회귀 재실행 | `npm run test:regression` → **`Test Files 240 passed (240)` / `Tests 1741 passed (1741)`** (exit 0, §6-1 표 갱신) |
| 5 | push | `git push --force-with-lease` |

- 재작업 커밋: 회귀맵·task file 커밋 2건(코드 로직 변경 0건 — rebase로 인한 해시 재작성만).
- **코드/테스트 내용은 리뷰 승인 상태 그대로**이며, 충돌 해소·카운트 갱신 외 변경 없음.

## 7. [발견 이슈]

1. **[구조] `@/i18n/routing`을 서버 액션에서 import하면 테스트가 깨진다** — `routing.ts`가 `createNavigation()`(클라이언트 번들)을 함께 export하므로 vitest에서 `next-intl → next/navigation` 해석 실패(`Cannot find module 'next/navigation'`). → 로케일 상수를 `src/i18n/locales.ts`로 분리해 해결(§3-2). **①-b에서 다른 서버 코드가 `routing`을 import할 때 동일 문제가 재발**할 수 있어 팀 공유 필요.
2. **[i18n] zh/ja 번역은 초안** — `Errors` 15키의 zh/ja 문구는 Dave가 작성한 초안이며 원어민/담당 검수가 필요하다(PR 본문에 명시).
3. **[테스트 기반] `tests/setup.ts`가 `next-intl/server`를 전역 mock** — 서버 컴포넌트/액션이 실제 locale 헤더를 쓰는 경로는 테스트에서 검증되지 않는다(1단계처럼 실제 dev 서버 실증이 유일한 증거). 향후 통합 테스트 후보.
4. **[환경] dev 서버 최초 기동 시 404** — 이전 `npm run build` 산출 `.next`가 남아 있으면 새 라우트(`/login/probe`)가 404였다. `.next` 삭제 후 정상. 코드 문제 아님(로컬 실증 절차에 기록).
5. **[타입] `npx tsc --noEmit` 기존 오류 174건** — 본 Task 변경 파일에는 0건. CI는 advisory(비차단)이며 기존 부채로 별도 정리 대상.
6. **[범위] UPS/SHXK/창고 81건·클라이언트 93건은 미적용(의도)** — ①-b 배정 시 본 인프라(`trError`·중앙 mock·`Errors` 키)를 그대로 사용하면 된다. throw 71건 처리 방침은 §4 설계 의견 참조.
