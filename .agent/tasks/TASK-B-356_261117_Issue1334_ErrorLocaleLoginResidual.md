# TASK-B-356 — Issue #1334: 로그인/가입 + 잔여 액션 + `alert`/`showToast` 화면 오류 로케일 전환

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1334](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1334) (부모 #1280 / 선행 B-350~B-355 머지) |
| **담당(Worker)** | Dave (Team B — Baker에서 변경 배정) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-17 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔧 진행 중 (`status:in-progress`) |
| **브랜치** | `feature/teamb-task-b356-iss1334-error-locale-login-residual` (base `origin/TeamB_Dev` @ `beb7bd125`, develop 동기화 `rev-list --count = 0`) |
| **채번 확인** | 착수 직전 `find .agent/tasks -name "TASK-B-356*"` → **0건** 확인 |
| **범위** | `login/actions.ts` + 액션 5파일(`daily-billing`·`inventory`·`notifications`·`invoice`·`organization`) + `alert`/`showToast` 11파일 + `messages/`·테스트·회귀맵·IMP. **`api/cron/**`·zod·`lib/shxk/*`·`wrapper.ts` 미수정** |

## 1. 착수 시 재측정 (지시 명령 출력 그대로)

```bash
$ grep -nE "error: *['\"\`]|error\.message" "src/app/[locale]/(auth)/login/actions.ts"
90: logger.error(... error.message); 91: return { error: error.message };
112: return { error: 'An unexpected error occurred during login.' };
172: return { error: error.message };
213: return { error: 'Profile creation failed. Please try again.' };

$ grep -rnE "error: *(err|e|error)(or)?\.message" src/app --include='*.ts' | grep -v api/cron
login/actions.ts:91,172 / misc/notifications.ts:219 / admin/organization.ts:67 /
operations/inventory.ts:139 / finance/invoice.ts:265 / finance/daily-billing.ts:300,414   (8)

$ grep -rnE "(alert|showToast)\(.*(\.message|\.error|err)" src --include='*.tsx' --include='*.ts' | wc -l
22   # 11개 파일
```
- `Errors` 기준 키 수: **80**(B-355 머지 반영) → **90**(+10).
- 소스 길이: `login/actions.ts` 226→265 / `invoice.ts` 342→350 (1,500 이내), 신규 함수 `resolveAuthError` 15줄.

## 2. 작업 1 — 서버 리터럴/throw

- `login/actions.ts`: `resolveAuthError(message, locale, context)` 헬퍼로 Supabase 오류를 `Errors` 키로 매핑. `getTranslations({ locale, namespace: 'Errors' })` 사용(요청 컨텍스트 비의존, 이미 locale 인자를 받는 구조).
- 잔여 액션 5파일: 기존 키(`profile_not_found`·`permission_denied`·`order_not_found`·`invoice_not_found`) 재사용 + **신규 10키**:
  - 인증: `auth_invalid_credentials`·`auth_email_not_confirmed`·`auth_account_exists`·`auth_password_invalid`·`auth_rate_limited`·`auth_unexpected`·`auth_signup_failed`·`auth_signup_profile_failed`
  - 재고: `inventory_not_found`·`inventory_below_zero`
- DB/시스템 실패는 `generic` + 코드(`NOTIFICATION_CREATE`·`DOCUMENT_URL`·`INVENTORY_LOOKUP`·`INVENTORY_HISTORY_LOOKUP`·`INVENTORY_UPDATE`·`ORGANIZATION_APPROVE/REJECT/SUPPLEMENT/LIST_LOOKUP/CREATE/UPDATE`·`INVOICE_LOOKUP`·`ORDER_DETAIL_LOOKUP`·`INVOICE_PDF_UPLOAD`·`INVOICE_HISTORY_SAVE/LOOKUP`·`TAX_INVOICE_CREATE`·`EMAIL_NOT_CONFIGURED`·`EMAIL_SEND`·`ORDER_LOOKUP`·`PACKAGE_LOOKUP`·`ITEM_LOOKUP`·`SUMMARY_LOOKUP`·`ORDERS_DETAIL_LOOKUP`). `invoice.ts`의 `metadata.error`(DB 내부 진단용)만 원문 유지(사용자 미도달).

## 3. 작업 2 — 호출자 판단표

| 함수 | 호출처:줄 | catch/반환 | 조치 |
|:--|:--|:--|:--|
| `login` | 로그인 폼(`LoginForm` → `useActionState`/action) | 반환 `{error}` 표시 | **반환 유지** + 로케일 문구 |
| `signup` | `register/page.tsx:7` | 반환 `{error}` 표시 | 반환 유지 + 로케일 문구 |
| `adjustInventory` | `InventoryAdjustmentModal.tsx:43` | `result.success` 확인 + catch | **throw→반환 전환**(같은 PR에서 호출자 이미 반환 처리) — 검증/조회/갱신 실패를 반환으로 |
| `getDocumentSignedUrl` | `organizations-client.tsx:103` | 반환 `result.error` | 반환 유지 + 로케일(문구는 호출부에서 `te('fetch_failed')` fallback) |
| `sendTaxInvoiceEmail` | `TaxInvoiceSheet.tsx:81` | try/catch → toast | throw 유지 + 로케일 |
| `issueTaxInvoice`/`identify...`(invoice 내부) | `TaxInvoiceSheet`/`OrderFinanceSummary`/`TradeDocumentClient` | try/catch → toast | throw 유지 + 로케일 |
| `getShipperDailyBillingSummary`·`getShipperDailyOrdersDetails` | `ShipperDailyBillingClient.tsx` | 반환 `result.error` | 반환 유지 + 로케일 |
| `sendInAppNotification` | 내부(알림 트리거) | 반환 무시 | 반환 유지 + 로케일 |
| `approve/reject/requestSupplement/getOrganizations/create/updateOrganization` | `organizations-client.tsx` 등 | try/catch | throw 유지 + 로케일 |
| `getInventoryList`/`getInventoryHistory` | 서버/클라이언트 조회 | 페이지/반환 | throw 유지 + 로케일 |

> **결론**: 반환 전환은 `adjustInventory` **1건**(호출부가 이미 `result.success/error` 처리). 나머지는 호출자가 catch만/반환을 처리하지 않아 throw 유지.

## 4. 작업 3 — `alert`/`showToast` 화면 (11파일 / 22지점)

`alert()`는 **toast로 교체하지 않고 문구만 로케일화**했다(지시). 각 파일에 `useTranslations('Errors')`(`te`) 추가, catch는 `console.error` + `te('generic', {code})`.

| 파일 | 지점 | 이전 | 이후 |
|:--|:--:|:--|:--|
| `admin/organizations/organizations-client.tsx` | 4 | `alert(\`SYSTEM_ERROR: … ${error.message}\`)` 외 2건, `'문서를 불러오는 중…' + result.error` | `ORGANIZATION_APPROVE/SUPPLEMENT/REJECT`, 문서는 `result.error \|\| te('fetch_failed')` |
| `admin/ups-rates/ups-rates-client.tsx` | 3 | `alert(e.message : '처리 중 오류가 발생했습니다.')` | `RATE_SAVE` |
| `components/address-book/AddressBookClient.tsx` | 2 | `'Failed to save'` / `'Failed to delete'` | `ADDRESS_SAVE` / `ADDRESS_DELETE` |
| `agency/other-charges/agency-other-charges-client.tsx` | 2 | 동일 패턴 | `ACTION_FAILED` |
| `admin/settings/settings-client.tsx` | 2 | `showToast('설정을 불러오는 중 오류…')`, `` `저장 실패: ${error.message}` `` | `te('fetch_failed')` / `SETTINGS_SAVE` |
| `admin/rates/useRates.ts` | 2 | `` `저장 중 오류 발생: ${err.message}` ``, `err.message` | `RATE_SAVE` / `RATE_ACTION` |
| `admin/delivery-rates/delivery-rates-client.tsx` | 2 | 동일 패턴 | `RATE_SAVE` |
| `admin/customs-rates/customs-rates-client.tsx` | 2 | 동일 패턴 | `RATE_SAVE` |
| `components/wallet/WalletDashboard.tsx` | 1 | `alert(error.message)` | `WALLET_ACTION` |
| `admin/settings/transport-policies/transport-policies-client.tsx` | 1 | `alert((e as Error).message)` | `POLICY_SAVE` |
| `admin/schedules/schedule-client.tsx` | 1 | `alert(error.message : "저장 중 오류…")` | `SCHEDULE_SAVE` |

- 잔존 grep 결과는 모두 `res.error || te(...)` 또는 `te(...)` 형태(서버 로케일 문장 우선) — §8-1.

## 5. 작업 4 — 관측성

- `login`/`signup`: 인증 실패 원문은 기존 `logger.error` 유지(사용자 문구와 분리). 프로필 생성 실패는 `logger.error(…, profileError)`로 객체 보존.
- 잔여 액션: 실패 반환/throw 직전 `logger.error(…, error객체)` 또는 `logger.warn` 보강(재고·조직·인보이스·일별청구 전 지점).
- 알림 판정표(4기준, 신규 구성 없음):
  | 지점 | 금전 | 고객접점 | 침묵성 | 사고이력 | 해당 수 | 판정 |
  |:--|:--:|:--:|:--:|:--:|:--:|:--|
  | `invoice`/`daily-billing`(금액·청구) | O | O | O | X | 3 | 알림 필요(기존 IMP-193 범위와 중복 — 신규 IMP 없음) |
  | `organizations` 승인/반려 | △ | O | O | X | 2 | 로그만 |
  | `inventory`/`settings`/rates | X | O | O | X | 2 | 로그만 |

## 6. 작업 5 — 로그인 보안 전/후 문구 표

| Supabase 원문(전) | 전달 문구(후) | 정보 노출 변화 |
|:--|:--|:--|
| `Invalid login credentials` | `auth_invalid_credentials` (이메일/비밀번호 단일 문구) | **동일 이하** — 계정 존재 여부 비구분 유지 |
| `Email not confirmed` | `auth_email_not_confirmed` | 동일(기존 구분 유지) |
| `User already registered` | `auth_account_exists` | 동일(기존 구분 유지) |
| `Password should be at least …` | `auth_password_invalid` | **감소**(구체 정책 미노출) |
| `Email rate limit exceeded`/`too many` | `auth_rate_limited` | 동일 |
| 그 외/`An unexpected error…` | `auth_unexpected` (로그인) / `auth_signup_failed` (가입) | **감소**(원문 미노출) |
| `Profile creation failed. Please try again.` | `auth_signup_profile_failed` | 동일 |

> 민감정보(계정 존재 여부) 추가 노출 없음. 구체 정책 안내 약화는 IMP-195로 등록.

## 7. 작업 6 — IMP 2건 + IMP-185

- **IMP-194**: 상태 전이 거부 사유(`validation.message`/`availability.message`) 사용자 미표시 → 사유 파라미터화 후속(B-354 리뷰).
- **IMP-195**: `changePassword`·회원가입 비밀번호 정책 사유 약화 → Supabase 오류 코드별 세분화 후속(B-355 리뷰).
- **IMP-185**에 이번 신규 10키 목록 추가(zh/ja 초안 검수 대상).

## 8. 테스트

| 구분 | 파일 | 내용 |
|:--|:--|:--|
| 신규 | `tests/unit/auth/task-b356-login-locale.test.ts` | (a) 로그인 4경로 ko 문구·원문 미포함, (en 단언) en 문구, (b) 반환 계약(`{error}`) 고정, (d) `logger.error(원문)` 인자 |
| 갱신 | `tests/unit/logistics/inventory.test.ts` | 반환 문구 `inventory_below_zero` ko(`toBe`) 유지 확인 |
| 갱신 | `tests/unit/documents/document-actions.test.ts` | 오더 없음 / DB 오류 throw 문구 |
| 갱신 | `tests/unit/i18n/errors-key-sync.test.ts` | 80 → **90키** |
| 갱신 | `tests/unit/ups/ups-rates-client-pivot.test.tsx` | `next-intl` mock 추가(훅 도입 대응) |

### 8-1. 되돌리기 검증 (실측)
로그인 `resolveAuthError` 적용을 되돌려 `error.message` 직반환으로 원복 → **4 failed / 2 passed** (`expected 'Invalid login credentials' to be '이메일 또는 비밀번호가 올바르지 않습니다.'` 등) → 복구 후 **6 passed**, `diff` 동일.

## 9. 검증 (DoD)

- [x] 작업 1~6 근거 — §2~§7
- [x] 범위 내 파일 사용자 노출 영문/원문 리터럴 0건 — §10-1 실제 출력
- [x] 전체 회귀 PASS — `Test Files 261 passed (261)` / `Tests 1923 passed (1923)`
- [x] `npm run build` 성공 — `BUILD_EXIT=0`, `✓ Compiled successfully in 12.0s`
- [x] diff 범위: `api/cron`·zod·`lib/shxk`·`wrapper.ts` 없음 — §10-2
- [x] 파일 길이 <1,500줄(265 / 350), 신규 함수 `resolveAuthError` 15줄
- [x] zh/ja 신규 10키 → IMP-185 추가 기재
- [x] R-20: GitNexus 불가 + 호출처 grep(§3)

## 10. 근거 출력

### 10-1. 범위 내 리터럴/원문 (실제 출력)
```bash
$ grep -nE "error: *[\`'\"]" "src/app/[locale]/(auth)/login/actions.ts" | grep -v "logger\.\|console\."
(출력 없음)
$ grep -nE "error: *[\`'\"]" <5 action files> | grep -v "logger\.\|console\."
(출력 없음)
$ grep -rnE "(alert|showToast)\(.*(\.message|\.error|err)" src --include='*.tsx' --include='*.ts'
(서버 res.error || te(...) / te(...) 형태만 — 원문 직노출 0)
```
- `login/actions.ts`의 `error.message`는 **logger 인자와 resolveAuthError 입력**으로만 사용(반환 아님).
- `invoice.ts` `metadata: { error: error.message }`는 DB 내부 진단 필드(사용자 미도달)로 유지.

### 10-2. diff 범위 (실제 출력)
```bash
$ git diff --stat | grep -E "api/cron|validation/|lib/shxk|wrapper.ts"
(출력 없음)
$ git show --stat --oneline HEAD | tail -3
 27 files changed, 450 insertions(+), 79 deletions(-)
```

## 11. [작업 결과]

- **코드 커밋**: `d58f5ad60` `[Dave] feat: TASK-B-356 로그인/가입·잔여 액션·alert 화면 오류 로케일 전환`
- 문서 커밋: 본 task file
- PR: base `TeamB_Dev` / `Closes #1334` (부모 #1280은 닫지 않음)
- 라벨: `status:open` → `status:in-progress` → `status:review`

### 11-1. 검증 결과
| 검증 | 결과 |
|:--|:--|
| 신규/영향 테스트 | 로그인 6 / 재고·문서·키동기화·pivot 통과 |
| 전체 회귀(R-08) | **`Test Files 261 passed (261)` / `Tests 1923 passed (1923)`** (exit 0) |
| 빌드 | `BUILD_EXIT=0`, `✓ Compiled successfully in 12.0s` |
| 타입체크(advisory) | 변경 파일 오류 **0건** (기존 212건 — base와 동일) |
| 되돌리기 | **4 failed / 2 passed** → 복구 6 passed, `diff` 동일 |

### 11-2. `check-R17-DoD`
본 환경에 `check-R17-DoD` 실행 파일/슬래시 커맨드가 **없음**(`which` 미검출 — B-345/348/350/351/352/354 동일) → §9 DoD 수동 대조(미체크 0·placeholder 0).

## 12. [발견 이슈]

1. **[보안] 인증 오류 단일화 확인** — `Invalid login credentials`는 계정 존재 여부를 구분하지 않는 단일 문구로 수렴. 기존 구분(이메일 미인증·이미 가입·레이트리밋)은 유지, 비밀번호 정책 상세는 `auth_password_invalid`로 **정보 감소**(IMP-195).
2. **[전환] `adjustInventory`만 throw→반환** — 호출자(`InventoryAdjustmentModal.tsx:43`)가 이미 `result.success/error`를 처리하고 있어 안전. 나머지는 호출자 catch-only/미처리로 throw 유지.
3. **[alert 유지] UX 변경 없음** — 지시대로 `alert()` → `toast` 교체 없이 문구만 로케일화.
4. **[잔여] `invoice.ts` metadata.error 원문** — DB 내부 진단 필드로 사용자 미도달(반환/표시 경로 없음) → 유지. 서버 로그에도 객체로 기록.
5. **[테스트] `useRates` 훅에 `useTranslations` 도입** — 커스텀 훅도 클라이언트 컴포넌트 컨텍스트에서 호출되므로 허용. 관련 렌더 테스트(pivot)에 `next-intl` mock 추가.
6. **[IMP] 194·195 등록 완료**, 신규 10키는 IMP-185에 추가(zh/ja 초안 검수).
