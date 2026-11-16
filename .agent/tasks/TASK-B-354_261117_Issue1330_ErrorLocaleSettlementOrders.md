# TASK-B-354 — Issue #1330: `settlement`·`orders` + 청구/주문/UPS 화면 사용자 오류 로케일 전환

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1330](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1330) (부모 #1280 / 선행 B-350~B-353 머지) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-17 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔧 진행 중 (`status:in-progress`) |
| **브랜치** | `feature/teamb-task-b354-iss1330-error-locale-settlement-orders` (base `origin/TeamB_Dev` @ `965b5c3b6`, develop 동기화 `rev-list --count = 0`) |
| **채번 확인** | 착수 직전 `find .agent/tasks -name "TASK-B-354*"` → **0건** 확인 |
| **범위** | `settlement.ts`·`orders.ts` + `messages/`·대상 클라이언트 15파일·테스트·회귀맵·IMP. **`admin/auth.ts`·`member.ts`·`voc.ts`·`support.ts`·`monitoring.ts`·zod·`lib/shxk/*`·`wrapper.ts` 미수정** |

## 1. 착수 시 재측정 (지시 명령 출력 그대로)

```bash
$ for f in src/app/actions/finance/settlement.ts src/app/actions/operations/orders.ts; do echo "== $f"; grep -nE "(error|message): *[\`'\"]" $f | grep -v "logger\.\|console\." | wc -l; grep -c "throw new Error" $f; grep -cE "err(or)?\.message" $f; done
== src/app/actions/finance/settlement.ts
8
35
8
== src/app/actions/operations/orders.ts
1
38
7

$ grep -rcE "toast\.error\(.*(\.message|\.error)" src/components/finance src/components/admin/InvoiceTable.tsx src/components/orders src/components/ups src/components/tracking
finance 13 / InvoiceTable 3 / orders 15 / ups 2 / tracking 2 = 35
```
- 파일 길이: settlement **640** / orders **1,297** → 변경 후 **711 / 1,371** (1,500 이내).

## 2. 작업 1 — 리터럴 오류 → `Errors` 재사용/신규 키

- 기존 40키 중 `profile_not_found`·`permission_denied`·`order_not_found`·`not_found`·`own_shipper_only`·`generic`·`fetch_failed` 재사용.
- **신규 18키**(4개 로케일 동일 세트, 총 **58키**): `invoice_not_found`·`invoice_already_finalized`·`invoice_already_canceled`·`invoice_finalize_reason_required`·`settlement_order_already_finalized`·`settlement_recalc_locked`·`settlement_items_locked`·`invoice_create_failed`·`cost_name_required`·`cost_amount_invalid`·`cost_currency_required`·`order_edit_status_invalid`({status})·`master_order_bound`·`route_required_for_scheduled`·`measurements_stale`·`inbound_no_measurement_changes`·`ups_edit_registered_locked`·`ups_edit_status_locked`.
- DB/시스템 실패는 문장 1:1 키 폭증을 피하기 위해 **`generic` + `{code}`** 로 통일(근거: 코드가 이미 상세 진단을 제공하고 원문은 로그에 남김). 사용한 코드: `ORDER_CREATE`·`ORDER_UPDATE`·`ORDER_LIST_LOOKUP`·`ORDER_DETAIL_LOOKUP`·`ORDER_ITEM_SAVE`·`ORDER_PACKAGE_SAVE`·`PACKAGE_SAVE`·`ITEM_SAVE`·`MASTER_ORDER_CREATE`·`MASTER_ORDER_DISSOLVE`·`MASTER_ORDER_LIST_LOOKUP`·`PENDING_HOUSE_LOOKUP`·`MASTER_STATUS_UPDATE`·`LINKED_HOUSES_LOOKUP`·`ORDER_BARCODE_LOOKUP`·`ORDER_ITEMS_LOOKUP`·`INBOUND_HISTORY_LOOKUP`·`ORDER_HISTORY_LOOKUP`·`COST_LOOKUP`·`INVOICE_FINALIZE`·`PAYMENT_STATUS_UPDATE`·`SETTLEMENT_OVERVIEW_LOOKUP`·`REVENUE_CHART_LOOKUP`·`REVENUE_REPORT_LOOKUP`·`COST_REPORT_LOOKUP`·`COST_INSERT`·`INVOICE_CANCEL`·`ORGANIZATION_LOOKUP`·`AGENCY_SHIPPER_LOOKUP`·`UNEXPECTED`.

## 3. 작업 2 — 호출자 판단표 (함수 단위)

| 함수 | 호출처:줄 | catch/반환 방식 | 조치 |
|:--|:--|:--|:--|
| `generateInvoicesForOrder` | `orders.ts:716`(`.catch` 로그) | 호출자가 catch | **throw 유지 + 로케일 문구** |
| `updatePaymentStatus` | `admin/ConfirmPaymentModal.tsx:40` | try/catch → toast | throw 유지 |
| `calculateSettlementAction` | `OrderFinanceSummary.tsx:70` | 반환 `result.success` 확인 | **반환 유지 + 문구 로케일** |
| `addManualOrderCost` | `OrderFinanceSummary.tsx:206` | 반환 확인 | throw 유지 + 문구 로케일 |
| `finalizeInvoice` | `admin/InvoiceTable.tsx`(+BillingConfirmModal 경유) | 반환 확인 | 반환 유지 + 문구 로케일 |
| `createPostFinalizationAdjustment` | `ups-actual-cost.ts:265/298`, `ups-actual-charges.ts:135` | 반환 확인(상위에서 로그) | 반환 유지 + 문구 로케일 |
| `rejectInvoice` | 컴포넌트 직접 호출 없음(예약 경로) | 반환 | 반환 유지 + 문구 로케일 |
| `getSettlementOverview`·`getWeeklyRevenueChart`·`getRevenueReport`·`getCostReport` | 서버 페이지(`settlement/page.tsx:11`, `finance/page.tsx:69`, `revenue/page.tsx:33`, `costs/page.tsx:32`) | 페이지 렌더(throw 시 오류 화면, 원문은 prod 마스킹) | throw 유지 + 로케일 문구 |
| `getOrganizations` | 서버/클라이언트(조직 화면) | 동일 | throw 유지 + 로케일 |
| `createOrder` | `OrderRegistrationForm.tsx` | try/catch → toast | throw 유지 + 로케일 |
| `updateOrder` | `orders/[orderId]/edit` 등 | try/catch → toast | throw 유지 + 로케일 |
| `getOrders`·`getOrderDetails` | 서버 페이지 | 페이지 렌더 | throw 유지 + 로케일 |
| `updateOrderStatus` | `InventoryScanner.tsx:40`, `UpsOrderStatusStepper` 등 | 반환 확인/throw catch 혼재 | throw 유지 + 로케일 |
| `createMasterOrder`·`dissolveMasterOrder` | `HouseOrderSelectionTable.tsx:47`, `MasterOrderTable.tsx:23` | try/catch → toast | throw 유지 + 로케일 |
| `getMasterOrders`·`getPendingHouseOrders`·`getMasterOrderWithHouses` | 서버 페이지 | 페이지 렌더 | throw 유지 + 로케일 |
| `getOrderByBarcodeOrNo` | `InboundProcessForm.tsx:78` | catch → toast | throw 유지 + 로케일 |
| `confirmInbound`/`saveInboundMeasurements` | `InboundProcessForm.tsx:122/161` | 반환 확인 | 반환 유지 + 로케일 |
| `getTodayInboundHistory`·`getOrderEditHistory` | 서버/클라이언트(창고·UPS 상세) | 페이지/ try | throw 유지 + 로케일 |

> **결론**: 이번 Task에서 throw→반환 전환은 **0건**(호출자가 반환을 처리하도록 같은 PR에서 수정 가능한 곳이 없거나, 이미 반환형). 따라서 B-352 유형("실패가 성공 토스트") 회귀 없음.

## 4. 작업 3 — 클라이언트 `err.message`/`.error` 직노출 (15파일 / 35지점)

- 원칙: 서버가 반환한 `res.error`(이미 로케일 문장)는 그대로 표시, **catch의 예외는 `console.error(err)` + `useTranslations('Errors')`의 `generic`+코드**로 대체.
- 각 파일에 `const te = useTranslations('Errors')` 추가(기존 7파일은 import만 보강, 8파일은 import+hook 추가). 컴포넌트 테스트 3파일에는 `next-intl` mock 추가.

| 파일 | 이전 | 이후 |
|:--|:--|:--|
| `finance/ShipperDailyBillingClient.tsx` | `res.error \|\| '상세 오더 목록 조회 실패'`, 마감 실패 템플릿 | `res.error \|\| te(generic,ACTION_FAILED)`, 마감 실패 `SETTLEMENT_CLOSE` + `console.error` |
| `finance/TaxInvoiceSheet.tsx` (2) | `` `발행 실패: ${err.message}` `` / 발송 | `console.error` + `INVOICE_ISSUE` / `INVOICE_SEND` |
| `finance/ExportButton.tsx` | `` `Export failed: ${error.message}` `` | `EXPORT` |
| `finance/BillingConfirmModal.tsx` (2) | `res.error \|\| '청구확정 실패'`, `err.message` | `BILLING_CONFIRM`, `UNEXPECTED` |
| `finance/OrderFinanceSummary.tsx` (3) | 영문 fallback 2 + `e.message` | `SETTLEMENT_RECALC` / `INVOICE_GENERATE` / `CHARGE_ADD` |
| `finance/InvoiceTable.tsx` | `` `발행 실패: ${error.message}` `` | `INVOICE_ISSUE` |
| `finance/PaymentModal.tsx` | `error.message \|\| 'Payment failed'` | `UNEXPECTED` (기존 `t('insufficient_balance')` 유지) |
| `admin/InvoiceTable.tsx` (3) | 발행/마감 실패 템플릿 + fallback | `INVOICE_ISSUE` / `INVOICE_FINALIZE` |
| `orders/UpsTradeDocumentActions.tsx` (5) | `res.error \|\| '…실패했습니다.'` / `err.message` | `PREVIEW_FAILED`·`VOID_FAILED`·`DOCUMENT_FAILED` / `UNEXPECTED` |
| `orders/OrderQnaSection.tsx` | `error.message \|\| "답변 등록…"` | `ANSWER_SUBMIT` |
| `orders/OrderRegistrationForm.tsx` (2) | `description: err.message` | `ADDRESS_SAVE` / `RATE_LOOKUP` |
| `orders/UpsActualAdjustmentForm.tsx` (4) | `res.error \|\| '저장 실패'` / `err.message` | `ACTUAL_SAVE`·`CHARGE_SAVE` / `UNEXPECTED` |
| `orders/BulkOrderUploadModal.tsx` (3) | `'템플릿…' + err.message` 등 | `TEMPLATE_DOWNLOAD` / `FILE_PARSE` / `BULK_UPLOAD` |
| `ups/UpsOrderStatusStepper.tsx` (2) | `res.error \|\| '실시간…'` / `'수동 전환 실패'` | `TRACKING_CHECK` / `STATUS_CHANGE` |
| `tracking/AdminTrackingControl.tsx` (2) | `error.message` | `UNEXPECTED` |

- 잔존 `toast.error(... .error)` 13건은 모두 `res.error || te(...)` 형태(서버 로케일 문장 우선).
- 코드(`{code}`)는 각 동작을 식별하는 상수 문자열이며 화면에는 로케일 일반문구+코드로 표시된다.

## 5. 작업 4·5 — 관측성 및 금전 영향 판정

### 5-1. `settlement.ts` `{success,error}` 반환 지점 logger 전수 점검
| 반환 지점 | logger |
|:--|:--|
| `finalizeInvoice` invoice 없음 / 이미 마감 / 사유 누락 | `logger.warn` 추가 |
| `finalizeInvoice` catch | 기존 `logger.error` 유지(문구만 변경) |
| `rejectInvoice` invoice 없음 / 이미 취소 / cancelErr / catch | `warn`/`error` 추가·유지 |
| `createPostFinalizationAdjustment` origInv 없음 / newInv 실패 / catch | `warn`/`error` 추가 |
| `computeInvoiceTotal`·`markInvoiceFinalized`·`generateInvoicesForOrder` 실패 | `logger.error` 추가 |
| `addManualOrderCost` 검증/권한/잠금/insert | `warn`/`error` 추가 |
| 조회 계열(getSettlementOverview/차트/리포트/조직) | `logger.error` 추가 |

### 5-2. 알림 판정 (ZEN_A4 4기준)
| 지점 | 금전 | 고객접점 | 침묵성 | 사고이력 | 해당 수 | 판정 |
|:--|:--:|:--:|:--:|:--:|:--:|:--|
| `settlement` 마감/입금/마감 후 조정 | O | O(인보이스) | O | O(#919·#603) | **4** | **알림 필요** → IMP-193 |
| `orders` 등록/수정/상태 전이 | O(운임·스냅샷) | O | O | O(B-339 등) | **4** | **알림 필요** → IMP-193 |
| `orders` 조회 계열(페이지) | X | O | O | X | 2 | 로그만(이번 범위) |

- 알림 신규 구성은 범위 밖 → **IMP-193** 등록.

## 6. 테스트

| 구분 | 파일 | 내용 |
|:--|:--|:--|
| 신규 | `tests/unit/finance/task-b354-error-locale.test.ts` | (a) finalizeInvoice 인보이스 없음 ko 문장·원문 미포함, (d) getOrganizations DB 오류 generic(ko)+코드·원문 미포함·`logger.error(…, error객체)`, (b) updateOrder 상태 잠금 **reject 정확 문장(상태 파라미터)** |
| 신규 | `tests/unit/i18n/task-b354-locale.test.ts` | (c) `invoice_not_found`·`order_edit_status_invalid({status})`·`ups_edit_registered_locked` ko/en/zh/ja (**en 단언 포함**) |
| 갱신 | `tests/unit/finance/agency-settlement-permission.test.ts` | 권한/스코프 문구 `toBe` (4건) |
| 갱신 | `tests/unit/logistics/inbound.test.ts` | DB 오류 throw 문구 → generic(ko)+ORDER_BARCODE_LOOKUP |
| 갱신 | `tests/unit/logistics/order-status.test.ts` (2), `order-update.test.ts`, `order-update-b339.test.ts` | 상태/수정 잠금 문구 |
| 갱신 | `tests/unit/master/master-actions.test.ts` (2), `master-detail.test.ts` | master 오류 문구 |
| 갱신 | `tests/unit/i18n/errors-key-sync.test.ts` | 40 → **58키** |
| 갱신 | `tests/unit/orders/ups-detail-b301.test.tsx`, `ups-detail-edit-button.test.tsx`, `tests/unit/ups/ups-stepper-b304.test.tsx` | `next-intl` mock 추가(훅 도입 대응) |

### 6-1. 되돌리기 검증 (실측)
`getOrganizations`의 generic 반환을 DB 원문 반환으로 되돌림 → **1 failed / 2 passed** (`expected '조직 조회 실패: DB_SECRET_ORG_77a' to be '…(코드: ORGANIZATION_LOOKUP)'`) → 복구 후 **3 passed**, `diff` 동일.

## 7. 검증 (DoD)

- [x] 작업 1~5 근거(파일:줄·테스트명) — §2~§6
- [x] 범위 내 파일 사용자 노출 영문/원문 리터럴 0건 — §8-1 **실제 출력**
- [x] 전체 회귀 PASS — `Test Files 259 passed (259)` / `Tests 1904 passed (1904)`
- [x] `npm run build` 성공 — `BUILD_EXIT=0`, `✓ Compiled successfully in 11.1s`
- [x] diff 범위: 제외 범위 파일 없음 — §8-2
- [x] 파일 길이 <1,500줄(**711 / 1,371**), 신규 함수 50줄 이하
- [x] zh/ja 신규 18키 → IMP-185 추가 기재
- [x] R-20: GitNexus 불가 + 호출처 grep — §8-3

## 8. 근거 출력

### 8-1. 리터럴/원문 (실제 출력)
```bash
$ grep -nE "(error|message): *[\`'\"]" src/app/actions/finance/settlement.ts | grep -v "logger\.\|console\."
(출력 없음)
$ grep -nE "(error|message): *[\`'\"]" src/app/actions/operations/orders.ts | grep -v "logger\.\|console\."
(출력 없음)
$ grep -n "\.message" src/app/actions/finance/settlement.ts
59: logger.error('[generateInvoicesForOrder] invoice generation failed:', result.message);   # 로그 전용
$ grep -n "\.message" src/app/actions/operations/orders.ts
(출력 없음)
```

### 8-2. diff 범위 (실제 출력)
```bash
$ git diff --stat | grep -E "admin/auth|member.ts|voc.ts|support.ts|monitoring.ts|validation/order|lib/shxk|wrapper.ts"
(출력 없음)
$ git diff --stat | wc -l
 39   # messages 4 · 소스 2 · 클라이언트 15 · 테스트 15 · IMP · task(untracked) 등
```

### 8-3. R-20 (GitNexus 불가)
`which gitnexus`/`.gitnexus` 없음 → **불가**, 호출처 grep은 §3 표.

## 9. [작업 결과]

- **코드 커밋**: `a6463532c` `[Dave] feat: TASK-B-354 settlement·orders 오류 로케일 전환 + 대상 화면 정리`
- 문서 커밋: 본 task file
- PR: base `TeamB_Dev` / `Closes #1330` (부모 #1280은 닫지 않음)
- 라벨: `status:open` → `status:in-progress` → `status:review`

### 9-1. 검증 결과
| 검증 | 결과 |
|:--|:--|
| 신규/영향 테스트 | `Test Files 2 passed (2)` / `Tests 13 passed (13)` (신규 2파일) |
| 전체 회귀(R-08) | **`Test Files 259 passed (259)` / `Tests 1904 passed (1904)`** (exit 0) |
| 빌드 | `BUILD_EXIT=0`, `✓ Compiled successfully in 11.1s` |
| 타입체크(advisory) | 변경 파일 오류 **0건** (기존 212건, base와 동일 계열) |
| 되돌리기 | **1 failed / 2 passed** → 복구 3 passed, `diff` 동일 |

### 9-2. `check-R17-DoD`
본 환경에 `check-R17-DoD` 실행 파일/슬래시 커맨드가 **없음**(`which` 미검출 — B-345/348/350/351/352 동일) → §7 DoD 수동 대조(미체크 0·placeholder 0).

## 10. [발견 이슈]

1. **[호출자 계약] throw→반환 전환 0건** — 38+35 throw 모두 호출자가 반환을 처리하지 않거나(컴포넌트 catch-only) 서버 페이지 렌더 경로라, B-352 반려 사례(실패가 성공 토스트로 표시)를 피하기 위해 **throw 유지 + 로케일 문구**로 통일했다.
2. **[UX 변화] 상태전이 거부 사유 미표시** — `validation.message`/`availability.message`(한국어 도메인 사유)를 사용자 문구에서 제거하고 `status_change_denied` 계열 키로 대체(원문은 `logger.warn`에만). 사유 파라미터화는 후속 IMP 후보.
3. **[클라이언트] 예외 메시지는 generic+코드로 표시** — 서버 반환 `res.error`(로케일 문장)는 그대로 표시하지만, catch의 예기치 못한 예외는 `console.error` + `Errors.generic`(+동작 코드)로 통일. 동작 코드 문자열이 화면에 노출되지만 로케일 일반문구와 함께 표시된다.
4. **[테스트] DB 의존 통합 테스트 flake 1회** — `iss1075-order-items-rls-insert` 3건이 전체 실행에서 1회 실패했으나 단독 실행 4/4 PASS, 재실행 전체 PASS(RLS 정책 조작 테스트 간 병렬 경합 추정). 코드 무관.
5. **[알림] CRITICAL 알림은 범위 밖** → **IMP-193** 등록(정산·오더 = 4기준 해당).
6. **[i18n] 신규 18키 zh/ja 초안** → **IMP-185**에 키 목록 추가(검수 대상).
