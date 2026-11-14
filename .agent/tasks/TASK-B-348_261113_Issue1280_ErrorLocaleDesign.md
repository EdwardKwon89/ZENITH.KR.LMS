# TASK-B-348 — Issue #1280: 오류 메시지 로케일 정합 설계 (전수조사 + 설계 의견)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1280](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1280) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-13 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 📝 설계 의견 제출 (`status:draft`) — **구현 금지 단계** |
| **브랜치** | `feature/teamb-task-b348-iss1280-error-locale-design` (base `origin/TeamB_Dev` @ `aeb0ef3c2`) |
| **채번 확인** | 착수 직전 `find .agent/tasks -name "TASK-B-348*"` → **0건** 확인. Jaison 지정 `TASK-B-348` 사용 |
| **이번 단계 범위** | 전수조사 + 설계 의견. **`src/`·`messages/*.json`·`tests/` 수정 0건** |

## 1. 목표 (JSJung 2026-11-12 정정 반영)

"한글 단일화"가 아니라 **"로케일 불일치 노출 제거 = 항상 현재 로케일 언어로만 표시"** 가 목표다.

- 오류 메시지는 **로케일별 원문**(`messages/{ko,en,zh,ja}.json`의 `errors.*`)으로 관리하고, 사용자의 현재 로케일 언어로만 출력한다.
- 사용자에게 노출되는 문자열은 **서버 리터럴(영문/한글)도, SHXK 중문 원문도 아니다**.
- SHXK 중문 오류: 사전 번역 → 미번역 시 로케일별 일반문구 대체 → **원문은 로그(`logger.error`)·`zen_ups_label_errors`에만 보존**(R-18).

## 2. 전수조사 (실측 — 명령 출력 그대로)

### (A) 서버 액션이 사용자에게 돌려주는 리터럴 오류 문자열

```bash
grep -rnE "(error|message): *[\`'\"][^\`'\"]*[A-Za-z]{4,}" src/app/actions --include='*.ts' | grep -v "logger\.\|console\." | wc -l
# → 66
```

- `error:` 리터럴 **105건**(전체 86개 액션 파일 중 13개 파일), `message:` 포함 시 **111건**.
- 언어 분포(111건 기준): 한글 포함 **90건**, 영문 포함 **73건**, **중문(CJK) 리터럴 0건** — 중문은 리터럴이 아니라 SHXK 응답 패스스루로 유입된다(→ (C)).

**파일별 건수 (전 13개, `error:` 기준)**

| # | 파일 | 건수 | 분류 |
|:--|:--|--:|:--|
| 1 | `src/app/actions/operations/ups-labels.ts` | 35 | **UPS/SHXK 핵심** |
| 2 | `src/app/actions/finance/ups-actual-cost.ts` | 19 | **UPS/SHXK 핵심** |
| 3 | `src/app/actions/finance/ups-actual-charges.ts` | 15 | **UPS/SHXK 핵심** |
| 4 | `src/app/actions/admin/auth.ts` | 11 | 그 외 |
| 5 | `src/app/actions/operations/tracking.ts` | 9 | **UPS/SHXK 핵심** |
| 6 | `src/app/actions/finance/settlement.ts` | 8 | 그 외 |
| 7 | `src/app/actions/operations/warehouse.ts` | 3 | **UPS/창고 핵심** |
| 8 | `src/app/actions/misc/voc.ts` | 3 | 그 외 |
| 9 | `src/app/actions/admin/member.ts` | 2 | 그 외 |
| 10 | `src/app/actions/misc/support.ts` | 2 | 그 외 |
| 11 | `src/app/actions/operations/orders.ts` | 1 | 그 외 |
| 12 | `src/app/actions/misc/wallet.ts` | 1 | 그 외 |
| 13 | `src/app/actions/misc/monitoring.ts` | 1 | 그 외 |
| | **합계** | **105** | **핵심 81 / 그 외 24** |

**대표 리터럴 10건**

| # | 위치 | 현재 값 | 문제 |
|:--|:--|:--|:--|
| 1 | `ups-labels.ts:202` | `error: 'Order not found'` | 영문 하드코딩 → ko/zh/ja 사용자에게 영문 노출 |
| 2 | `ups-labels.ts:210` | `error: 'Failed to fetch packages'` | 동일 |
| 3 | `ups-labels.ts:211` | `error: 'Order has no packages'` | 동일 |
| 4 | `ups-labels.ts:267` | `error: \`createorder failed: ${orderRes.message}\`` | **SHXK 중문/영문 원문이 그대로 포함** |
| 5 | `ups-labels.ts:269` | `error: 'duplicate order but no existing order_id returned'` | 영문 하드코딩 |
| 6 | `ups-labels.ts:391` | `error: 'Order not found'` | 동일 |
| 7 | `ups-labels.ts:399` | `error: \`shipping method not found for product=…\`` | 영문 + 내부 파라미터 노출 |
| 8 | `ups-labels.ts:806` | `catch → error: err.message` | **내부 예외 원문 직노출** |
| 9 | `ups-labels.ts:569` | `error: \`UPS 라벨 회수 실패(SHXK): ${removeRes.message}\`` | 한글 + SHXK 중문 혼재 |
| 10 | `wallet.ts:173` | `error: 'INSUFFICIENT_BALANCE', message: '지갑 잔액이 부족합니다.'` | **코드 문자열이 사용자에게 노출**(`PaymentModal.tsx:44`가 `result.error` 우선 출력 → 화면에 `INSUFFICIENT_BALANCE` 표시) |

### (B) 클라이언트가 `err.message` / `res.error`를 그대로 노출하는 지점

```bash
grep -rnE "toast\.error\(.*(\.message|\.error)" src --include='*.tsx' | wc -l
# → 93
```

- `src/**/*.tsx`의 `toast.error` 총 **170건** 중 **93건(55%)** 이 서버/예외 문자열을 그대로 표시.
- 분류: **UPS/창고/오더/트래킹 51건**, 그 외 42건.
- 상위 파일: `components/warehouse/OutboundProcessForm.tsx` 13, `components/orders/UpsTradeDocumentActions.tsx` 5, `components/warehouse/InboundProcessForm.tsx` 5, `components/orders/UpsActualAdjustmentForm.tsx` 4, `components/warehouse/DepartureConfirmForm.tsx` 4, `components/warehouse/UpsReceiveProcessForm.tsx` 4, `OrderCustomsAdminControl.tsx` 3, `admin/InvoiceTable.tsx` 3, `finance/OrderFinanceSummary.tsx` 3, `orders/BulkOrderUploadModal.tsx` 3.
- 이미 i18n 훅을 쓰는 파일: `useTranslations` **55개 파일**. `useLocale`는 **3개 파일**뿐.
- `err.message` 직노출 대표: `StatusChangeModal.tsx:62,83`, `BulkOrderUploadModal.tsx:50,85,104`, `mypage/corporate/page.tsx:87,106,123,139`, `warehouse/*` 다수.
- **변환 없이 코드 문자열을 노출하는 실사례**: `finance/PaymentModal.tsx:44` → `toast.error(result.error || t('insufficient_balance'))` — `wallet.ts:173`이 `error:'INSUFFICIENT_BALANCE'`를 반환하므로 실제 화면에 `INSUFFICIENT_BALANCE`가 출력된다.

### (C) SHXK 응답 패스스루

| 위치 | 내용 |
|:--|:--|
| `src/lib/shxk/order.ts:50,61,86,96` | `message: res.enmessage \|\| res.cnmessage \|\| ''` — **영문 우선, 없으면 중문** |
| `src/lib/shxk/client.ts:108` | `cnmessage: (parsed.cnmessage as string) ?? ''` |
| `ups-labels.ts:262` | `error: \`SHXK 필수 항목 누락: ${payloadErrors.join(', ')}\`` (한글 + 내부 필드명) |
| `ups-labels.ts:267,269` | `createorder` 실패 시 `orderRes.message`(중문 가능) 그대로 |
| `ups-labels.ts:559,606` | `라벨 조회/삭제 실패: ${...message}` |
| `ups-labels.ts:569,722` | `UPS 라벨 회수 실패(SHXK): ${removeRes.message}` |
| `ups-labels.ts:806,845,897` | `catch` 블록에서 `err.message` 반환 |
| `ups-labels.ts:851~897` (`fetchShxkTradeDocument`) | SHXK `getnewlabel` 실패 메시지를 **`res.error`로 그대로 반환** |

**중문 원문이 사용자에게 도달함을 증명하는 기존 테스트**: `tests/unit/ups/task-b327-fetch-trade-document.test.ts:83,90`
```ts
holder.getnewlabel.mockResolvedValue({ success: 0, data: null, message: '未找到订单信息' });
...
expect(res.error).toBe('未找到订单信息');   // ← 현재 계약이 "중문 그대로 노출"
```

**번역 사전 현황** — `src/lib/shxk/translate.ts`
- `SHXK_TRANSLATION_DICT` **14개 항목**, 타입 `Record<string, { ko: string; en: string }>` → **zh/ja 없음**.
- 항목은 전부 트래킹 상태 문구이며 **오류 문구 항목 0건**.
- `pickShxkLocaleText(locale, zh, ko?, en?)`: ko→ko, zh→중문 원문, 그 외→en ?? **중문 원문** → ja 사용자는 중문 또는 영어를 본다.
- 사용처는 `src/components/tracking/UpsTrackingEventsList.tsx:57`, `src/lib/shxk/tracking.ts:71` 2곳뿐 — **오류 경로에는 전혀 적용되지 않는다**.

### (D) `messages/*.json` 구조

```bash
grep -n '"errors"' messages/ko.json        # → 출력 없음 (errors 네임스페이스 없음)
```

| 로케일 | flatten 키 수 | top-level 네임스페이스 | en 대비 누락 |
|:--|--:|--:|--:|
| en (baseline) | **873** | 46 | — |
| ko | 874 | 45 | 43 |
| zh | 362 | 22 | 511 |
| ja | 350 | 22 | 523 |

- **`errors` 네임스페이스는 4개 로케일 모두에 존재하지 않는다.**
- `NextIntlClientProvider`는 `src/app/[locale]/layout.tsx:52`에서 전체 `messages`를 내려주므로, 클라이언트에 `errors.*`를 추가하면 별도 배선 없이 `useTranslations('errors')` 사용 가능.
- 감사 스크립트 `scripts/audit-i18n.ts`(`npm run check:i18n`)는 **en을 baseline으로 missing만 FAIL**시키며 현재 **상시 FAIL**(ja 523 누락 — DEF-B-156). `.github/workflows/pr-checks.yml`에 `check:i18n` **미포함**(grep 0건).
- `LIVE_REGRESSION_TEST_MAP.md`는 **1,113줄**로 DEF-B-157(1,000줄 하드리밋) **초과 상태** → 신규 섹션 추가 방식 결정 필요(§5-Q5).

### (E) 서버 액션에서 현재 로케일을 얻을 수 있는가 (안 ②의 전제)

| 근거 | 확인 내용 |
|:--|:--|
| `src/app/actions/**` | `getTranslations`/`getLocale` 사용 **0건** — 서버 액션에 i18n 배선 없음 |
| `src/middleware.ts:15` | `createMiddleware(routing)` (next-intl) 사용 |
| `src/middleware.ts:122` | 인증 통과 후 `handleI18nRouting(requestWithId)` 실행 — **Server Action POST 포함**(action 호출 경로는 `/ko/...` 페이지 URL) |
| `node_modules/next-intl/.../middleware/middleware.js:39` | `headers.set(HEADER_LOCALE_NAME, locale)` — 요청 헤더에 `x-next-intl-locale` 주입 |
| `node_modules/next-intl/.../server/react-server/RequestLocale.js:8` | `headers()`에서 `HEADER_LOCALE_NAME`을 읽어 request locale 결정 |
| `src/i18n/routing.ts` | `locales: ['ko','en','zh','ja']`, `defaultLocale: 'ko'` |
| 기존 선례 | `src/app/[locale]/(auth)/login/actions.ts:76,125` — **클라이언트가 locale을 인자로 넘겨** `getTranslations({ locale, namespace:'Auth' })` |

> 결론: 서버 액션에서도 `getTranslations({ locale, namespace })`의 **locale을 명시적으로 주입**하면 동작 근거가 확실하다(요청 헤더 기반 `getLocale()`은 보조 수단, 헤더 부재 시 `routing.defaultLocale` 폴백 필요).

### (F) 테스트 영향 실측

| 항목 | 건수 |
|:--|--:|
| 서버 액션을 직접 import 하는 테스트 파일 | **69** |
| `.error)` 단언을 포함한 테스트 파일 | **34** (단언 총 119건: `toBe`/`toContain`/`toEqual`) |
| 그중 **정확 문자열** `toBe` 단언 | **15건** |
| `.error).toContain(` | 53 |
| `vi.mock('next-intl…')` 사용 테스트 파일 | 31 (선례: `tests/unit/auth/signup-role-mapping.test.ts:18` → `getTranslations` mock, `tests/unit/ups/task-b327-trade-document-toast.test.tsx:22` → `useTranslations` mock) |

**정확 문자열 단언 15건(전부 갱신 대상)**: `tests/unit/rates/rates.test.ts:111,163,187` / `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts:281` / `tests/unit/ups/task-b327-fetch-trade-document.test.ts:90`(중문) / `tests/unit/member/profile.test.ts:62` / `tests/unit/member/corporate.test.ts:75,201,209,216` / `tests/unit/member/grade-promotion.test.ts:146` / `tests/unit/operations/bulk-orders.test.ts:210` / `tests/unit/finance/ups-actual-charges-dual-invoice.test.ts:187` / `tests/unit/finance/wallet.test.ts:115` / `tests/unit/logistics/inbound.test.ts:285`

## 3. [설계 의견] — 안 ①②③ 비교

### 안 ① — 서버는 `errorCode`(+params)만 반환, 클라이언트가 `useTranslations('errors')`로 변환

```ts
// 서버
return { success: false, errorCode: 'ORDER_NOT_FOUND' as const };
// 클라이언트
const te = useTranslations('errors');
toast.error(te(result.errorCode));
```

| 장점 | 단점·리스크 |
|:--|:--|
| 표시 계층이 로케일을 소유 → 서버는 로케일과 완전 분리(테스트 단순) | **클라이언트 93개 지점 전부 수정** + 액션 105개 리터럴을 코드로 치환 + 코드↔키 매핑표 유지 |
| 클라이언트가 오류 종류별 분기(재시도·리다이렉트)에 유리 | 기존 `{ success, error }` 계약 변경 → **69개 테스트 파일·119개 단언** 영향. 하위호환 필드(`error`)를 남기면 이중 계약으로 혼란 |
| 서버 로그/응답이 기계 판독 가능 | 코드 네이밍 규약(105개) 신설·전수 리뷰 필요 → 1차 PR 리스크 최대 |
| | `throw new Error` 531건은 코드화 불가 → 어차피 클라이언트 일반문구 처리 필요 |

### 안 ② — 서버 액션이 `getTranslations`로 변환해 **문장 반환**(기존 시그니처 유지)

```ts
// src/lib/i18n/action-error.ts (신규 제안)
export async function actionLocale(): Promise<string> {
  try { return await getLocale(); } catch { return routing.defaultLocale; }   // 'ko'
}
export async function trError(key: string, params?: Record<string, string>) {
  const t = await getTranslations({ locale: await actionLocale(), namespace: 'errors' });
  return t(key, params);
}

// 사용
if (!order) return { success: false, error: await trError('order_not_found') };
```

| 장점 | 단점·리스크 |
|:--|:--|
| **클라이언트 93개 지점 무수정**(계약 `{error:string}` 유지) → 회귀 위험 최소 | 서버 계층이 i18n에 의존 → 액션 단위 테스트에 `next-intl/server` mock 필요(중앙 `tests/setup.ts` 1곳으로 흡수 가능, 선례 31개 파일) |
| 서버가 이미 SHXK 원문·내부 예외를 보유 → **번역·일반문구 대체·로그 보존을 한 지점에서** 처리 | 요청 컨텍스트가 없는 실행(스크립트/크론)에서 `getLocale()` 실패 가능 → `defaultLocale` 폴백으로 차단(위 코드) |
| `NextIntlClientProvider`가 전체 messages를 내려주므로 추가 배선 불요 | 문장이 응답에 고정 → 클라이언트 캐시/재표시 시 로케일 전환 미반영(현 UI는 토스트 1회성이라 영향 없음) |
| 기존 테스트 15건만 기대값 갱신(나머지는 mock t로 통과) | 코드 기반 분기가 필요한 미래 요구에는 부적합 → `errorCode` **선택 필드** 병행으로 확장 여지 |

### 안 ③ — 혼합(핵심 경로만 ①, 나머지 ②)

| 장점 | 단점·리스크 |
|:--|:--|
| 장기적으로 가장 유연 | **두 계약이 공존** → 클라이언트가 "문자열인지 코드인지" 판별해야 함(휴리스틱/플래그 필요), 신규 진입자 혼란 |
| 핵심 경로만 코드화해 점진 도입 | 1차 PR에서 93개 지점 중 51개만 수정 → 절반만 바뀐 상태가 오래 유지됨(중간 상태의 일관성 없음) |
| | 코드 테이블과 번역 키를 **두 번** 관리 |

### 추천안 — **안 ②** (필요 지점에 `errorCode` 선택 필드)

| 판단 기준 | 안 ① | **안 ② (추천)** | 안 ③ |
|:--|--:|--:|--:|
| 클라이언트 수정 지점 | 93 (+ `err.message` 처리 별도) | **0** (+ `err.message` 처리 별도) | 51 |
| 서버 리터럴 치환 | 105 | **105** | 81 |
| 계약 변경 | 있음(전면) | **없음** | 부분(이중) |
| 테스트 갱신 | 119 단언/34 파일 | **15 단언** + 중앙 mock 1곳 | 혼재 |
| 신규 실패 모드 | 코드 누락 → `undefined` 표시 | 번역 키 누락 → 키 문자열 표시(키 동기화 테스트로 차단) | 코드/문자열 판별 오류 |
| 예상 공수 | 10~14h | **8~11h** | 9~13h |

**추천 근거**
1. 이 코드베이스의 오류 소비 지점은 **전부 "문자열을 그대로 toast"** 이며, 클라이언트가 오류 종류로 분기하는 곳은 **현재 0건**(`INSUFFICIENT_BALANCE`도 분기 없이 표시만 함) → 안 ①의 핵심 장점이 아직 수요가 없다.
2. 93개 지점을 건드리지 않으므로 **회귀 반경이 서버 계층으로 국한**된다(현재 Dave의 반복 위반 유형 = 범위 초과·절차 누락 → 변경 반경 최소화가 안전).
3. 로케일 해석 근거가 확보되어 있다(§2-E: 미들웨어가 액션 POST에도 `x-next-intl-locale` 주입, `getTranslations({locale})` 명시 주입 시 결정적).
4. **단, `errorCode`를 완전히 배제하지 않는다** — 클라이언트가 분기해야 하는 요구가 생기면 `{ success:false, error: 문장, errorCode:'INSUFFICIENT_BALANCE' }` 처럼 **선택 필드 추가**만으로 확장(안 ③의 이중 계약 문제 회피).

## 4. 세부 설계 제안

### 4-1. `errors` 네임스페이스 키 구조 (ko 기준, en/zh/ja 동일 키 세트)

```jsonc
"errors": {
  "generic": "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: {code})",
  "order_not_found": "오더를 찾을 수 없습니다.",
  "packages_not_found": "오더의 패키지 정보를 찾을 수 없습니다.",
  "order_has_no_packages": "오더에 패키지가 없습니다.",
  "shipping_method_not_found": "해당 상품/국가/인코텀즈에 맞는 운송 방식이 없습니다.",
  "shxk_required_missing": "SHXK 필수 항목이 누락되었습니다: {fields}",
  "shxk_generic": "택배사 시스템에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: {code})",
  "label_issue_failed": "라벨 발급에 실패했습니다.",
  "label_void_failed": "라벨 회수에 실패했습니다.",
  "document_fetch_failed": "무역 서류를 불러오지 못했습니다.",
  "permission_denied": "권한이 없습니다.",
  "insufficient_balance": "잔액이 부족합니다.",
  "not_found": "대상을 찾을 수 없습니다.",
  "network_error": "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  "unknown_action": "지원하지 않는 요청입니다."
}
```

- 값에는 **로케일별 원문**만 넣고, 내부 파라미터(상품코드·쿼리)는 `code`/`fields` 파라미터로 축약한다.
- 기존 한글 문구를 그대로 키로 승격해 문구 변경을 최소화한다(`label_issue_failed` 등).

### 4-2. 키 동기화 테스트 설계

| 항목 | 설계 |
|:--|:--|
| 파일 | `tests/unit/i18n/errors-key-sync.test.ts` (신규) |
| 기준 | **ko의 `errors.*` 키 집합**(baseline) — `en`/`zh`/`ja`에 대해 `toEqual(sortedKeys)` |
| 범위 한정 | **`errors` 네임스페이스 한정**. 전역 감사는 DEF-B-156(ja 523 누락)으로 상시 FAIL이므로 이 테스트에 섞지 않는다 |
| 추가 단언 | ① 값이 빈 문자열/`undefined` 아님 ② 키별 ICU 파라미터 이름 집합 일치(`{code}`·`{fields}` 누락 방지) |
| 실패 예시 | `[zh] missing errors.* keys: order_not_found, shxk_generic` — PR에서 즉시 차단 |
| CI | 기존 `Regression Tests`에 자동 포함(별도 workflow 수정 불요) |
| 후속(선택) | `scripts/audit-i18n.ts`에 `--namespace errors` 옵션 추가 → 로컬 감사 편의(DEF-B-156 해소 전까지 전역 FAIL 유지) |

### 4-3. SHXK 번역 사전 4개 로케일 확장

| 항목 | 변경안 |
|:--|:--|
| 타입 | `Record<string, { ko: string; en: string; zh: string; ja: string }>` — **zh는 원문 그대로**(`zh: key`) |
| 항목 추가 | 기존 14개 트래킹 문구 + **오류 문구 세트**(예: 주문 미존재, 라벨 미존재, 중복 주문, 필수값 누락, 시스템 오류) |
| 매칭 | 기존 `includes` 부분매칭 유지. **en/zh 양쪽 키**로 조회(응답이 `enmessage || cnmessage`이므로 어느 쪽이 와도 히트) |
| 미매칭 | `translateShxkText() → null` → 호출부에서 `errors.shxk_generic`(`{code}`)으로 **일반문구 대체** |
| 표출 | `pickShxkLocaleText()`도 4개 로케일 사전을 쓰도록 확장(현재 ja가 중문 원문을 보는 문제 해소) |
| 원문 보존 | `logger.error('[SHXK] raw message: …')` + 실패 시 `zen_ups_label_errors` insert(`ups-labels.ts:403` 기존 경로) 유지 |
| 테스트 | (a) zh/en 원문 → 4개 로케일 번역 `toBe` (b) 미매칭 원문 → 일반문구 + 원문이 반환값에 **미포함**(`not.toContain`) (c) 로그 mock 호출 검증 |

### 4-4. `err.message` 직노출 제거 (클라이언트 93건)

| 구분 | 처리 |
|:--|:--|
| 서버 반환 `res.error` | 안 ②로 이미 로케일 문장 → 그대로 표시 가능(수정 불요) |
| `catch (err) { toast.error(err.message) }` | `toast.error(te('generic'))` + `console.error(err)`(또는 Sentry). 대상: `StatusChangeModal.tsx:62,83`, `BulkOrderUploadModal.tsx:50,85,104`, `mypage/corporate/page.tsx` 4건, `warehouse/*` 20여건 등 |
| 하드코딩 영문/한글 폴백(`|| '저장 실패'`) | `te('generic')` 또는 해당 키로 치환 |
| `INSUFFICIENT_BALANCE` | 서버가 `insufficient_balance` 문장 반환 → `PaymentModal.tsx:44` 수정 없이 해소(코드 문자열 노출 제거) |

### 4-5. PR 분할안 (총 2개 + 선택 1개)

| PR | 범위 | 주요 파일 | 예상 공수 |
|:--|:--|:--|--:|
| **PR①** 핵심 경로 | `errors` 네임스페이스(4 로케일) + `action-error.ts` 헬퍼 + 키 동기화 테스트 + **UPS/SHXK/창고 액션 81건**(`ups-labels.ts` 35, `ups-actual-cost.ts` 19, `ups-actual-charges.ts` 15, `tracking.ts` 9, `warehouse.ts` 3) + SHXK 사전 확장·일반문구 대체 + UPS/창고 클라이언트 `err.message` 노출 정리(51건) + 테스트 15건 중 핵심분 갱신 + MAP 신규 섹션 | `messages/*.json`, `src/lib/i18n/action-error.ts`(신규), `src/lib/shxk/translate.ts`, `src/app/actions/{operations,finance}/…`, `src/components/{warehouse,orders}/*`, `tests/unit/i18n/*` | **6~7h** |
| **PR②** 나머지 | 그 외 액션 24건(`admin/auth.ts` 11, `settlement.ts` 8, `voc.ts` 3, `member.ts` 2, `support.ts` 2, `orders.ts`/`wallet.ts`/`monitoring.ts` 각 1) + 나머지 클라이언트 노출 42건 + 잔여 테스트 갱신 | `src/app/actions/{admin,finance,misc,operations}`, `src/components/**`, `src/app/[locale]/**` | **3~4h** |
| **PR③(선택)** | `src/lib/validation/order.ts` zod 메시지 15건 로컬라이제이션(Aiden 요청 포함분) — zod 스키마를 로케일 팩토리로 전환해야 해 별도 설계 필요 | `src/lib/validation/order.ts`, `src/components/orders/OrderRegistrationForm.tsx` | **2~3h** |

- 합계 **11~14h**(이슈 추정 8~12h 대비 상향 — 클라이언트 93건·테스트 119단언 실측 반영).
- PR①/②는 `errors` 키 세트를 공유하므로 **PR① 병합 후 PR② 착수**(키 충돌 방지).

## 5. 결정 요청 (Jaison)

| # | 질문 | 기본 제안 |
|:--|:--|:--|
| Q1 | 추천안 **안 ②** 채택 여부(`errorCode`는 선택 필드로만 유보) | 채택 |
| Q2 | `errors` 네임스페이스 **4개 로케일 완비**(ja 포함) 여부 — DEF-B-156(ja 축소 운영)과 충돌 | errors.*만 4개 로케일 완비 + 나머지는 DEF-B-156 유지 |
| Q3 | 서버 액션 locale 해석: `getLocale()` + 실패 시 `defaultLocale('ko')` 폴백 승인 | 승인 |
| Q4 | `validation/order.ts` zod 메시지(15건)를 PR③로 분리할지, PR②에 포함할지 | PR③ 분리 |
| Q5 | `LIVE_REGRESSION_TEST_MAP.md`가 1,113줄(DEF-B-157 하드리밋 초과) — 신규 섹션을 본 파일에 추가할지, `LIVE_REGRESSION_TEST_MAP_TOOLS.md` 같은 분리 파일로 둘지 | 분리 파일 + 본 파일에 링크 1줄 |

## 6. 검증 (DoD — 설계 단계)

- [x] `[설계 의견]` 섹션에 안 ①/②/③ 장단점·리스크 비교 + 추천안 1개 명시
- [x] 전수조사 표: 파일별 건수(13개 전수), 대표 리터럴 10건, 클라이언트 노출 93건, UPS/SHXK 핵심 vs 그 외 분류
- [x] 서버 액션 locale 획득 근거를 **코드로 확인**(미들웨어·next-intl 내부·기존 선례)
- [x] 키 동기화 테스트 설계(DEF-B-156 범위 한정 포함)
- [x] SHXK 사전 4개 로케일 확장 + 미번역 대체 + 원문 로그 보존 설계
- [x] PR 분할안(범위·예상 공수)
- [x] 기존 테스트 영향 실측(15 정확단언 / 119 단언 / 69 액션 호출 파일)
- [x] 코드 변경 0건 — `git diff origin/TeamB_Dev --stat` 에 `src/`·`messages/`·`tests/` 없음
- [x] `scratch/` 임시 파일 미커밋(R-13)

## 7. [작업 결과]

- 코드 커밋: **없음**(설계 의견 단계 — 지시대로 `src/`·`messages/`·`tests/` 수정 0건)
- 문서 커밋: 본 task file 1건 `[Dave] docs: TASK-B-348 설계 의견 — task file`
- PR: #1280 설계 의견 PR(`Refs #1280` — 설계 단계이므로 `Closes` 미사용)
- 라벨: `status:open` → `status:in-progress` → **`status:draft`**
- 전수조사 원자료: `scratch/b348_action_errors.txt`(111줄), `scratch/b348_client_exposure.txt`(93줄) — **R-13에 따라 커밋하지 않음**
- `check-R17-DoD`: 본 환경 PATH/슬래시 커맨드에 존재하지 않아 실행 불가(TASK-B-345에서도 동일 확인) → 설계 단계 항목(§6)을 **수동 동치 점검**했고, 미체크 0건·placeholder 0건·증거 수치 기재 완료.

## 8. [발견 이슈]

1. **`INSUFFICIENT_BALANCE` 코드 문자열이 사용자 화면에 노출** — `wallet.ts:173`이 코드를 `error`로 반환하고 `PaymentModal.tsx:44`가 `result.error`를 그대로 toast → 실제 표시값 `INSUFFICIENT_BALANCE`. 본 Task 설계(안 ②)로 자연 해소되나, **현재 운영 중 결함**으로 별도 확인 권장.
2. **SHXK 중문 원문의 사용자 도달이 기존 테스트로 고정되어 있음** — `task-b327-fetch-trade-document.test.ts:90`이 `'未找到订单信息'`를 기대값으로 단언. 구현 시 이 단언을 로케일 문구로 **의도적으로 갱신**해야 한다(회귀 아님).
3. **`check:i18n`이 CI에 없음** — DEF-B-156의 ja 523 누락이 상시 FAIL이어서 감사가 무력화된 상태. `errors.*` 한정 테스트를 Regression 스위트에 넣는 것으로 우회 가능(본 설계 4-2).
4. **`LIVE_REGRESSION_TEST_MAP.md` 1,113줄** — DEF-B-157(1,000줄 하드리밋) 초과가 유지되고 있다. 본 Task PR에서 섹션을 추가하면 더 악화 → 분리 파일안을 Q5로 상정.
5. **`scratch/` 산출물 커밋 금지 준수** — 전수조사 원자료는 커밋하지 않았고, 표에 수치를 직접 기재해 재현 가능하게 했다.
