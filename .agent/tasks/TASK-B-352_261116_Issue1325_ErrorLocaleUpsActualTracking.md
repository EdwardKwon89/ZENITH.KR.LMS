# TASK-B-352 — Issue #1325: `ups-actual-cost`·`ups-actual-charges`·`tracking` 사용자 오류 로케일 전환

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1325](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1325) (부모 #1280 / 선행 B-350·B-351 머지 완료) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-16 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔧 진행 중 (`status:in-progress`) |
| **브랜치** | `feature/teamb-task-b352-iss1325-error-locale-ups-actual-tracking` (base `origin/TeamB_Dev` @ `5056416d5`, develop 동기화 확인 `rev-list --count origin/TeamB_Dev..origin/develop = 0`) |
| **채번 확인** | 착수 직전 `find .agent/tasks -name "TASK-B-352*"` → **0건** 확인. Jaison 지정 `TASK-B-352` 사용 |
| **범위** | `ups-actual-cost.ts`·`ups-actual-charges.ts`·`tracking.ts` + `messages/*.json`·테스트·회귀맵·IMP. **`ups-labels.ts`·`lib/shxk/*`·`warehouse.ts`·`src/components/**`·`wrapper.ts` 미수정** |

## 1. 착수 시 재측정 (지시 명령 출력 그대로)

```bash
$ for f in src/app/actions/finance/ups-actual-cost.ts src/app/actions/finance/ups-actual-charges.ts src/app/actions/operations/tracking.ts; do echo "== $f"; grep -nE "(error|message): *[\`'\"]" $f | grep -v "logger\.\|console\." | wc -l; grep -c "throw new Error" $f; grep -cE "err(or)?\.message|\.message\}" $f; done
== src/app/actions/finance/ups-actual-cost.ts
19
3
13
== src/app/actions/finance/ups-actual-charges.ts
15
5
16
== src/app/actions/operations/tracking.ts
9
5
8
```
→ Jaison 측정값과 **동일**.

## 2. 작업 항목 1 — 리터럴 오류 → `trError()` / `generic`+코드

- 기존 `Errors` 21키를 우선 재사용하고 **9키 추가**(§7-1) → **ko 기준 30키**, 4개 로케일 동일 세트.
- 영문/한글 리터럴 43줄(19+15+9) 중 사용자 반환 지점 전량 전환. 내부 값(오더번호·상품코드·쿼리)은 파라미터로 넣지 않고 로그로만.
- 최종 잔존 리터럴은 §5-1 grep 출력(0줄)으로 확인.

| 파일 | 대표 전환 |
|:--|:--|
| `ups-actual-cost.ts` | 오더 없음 → `order_not_found` / UPS 아님 → `not_ups_order` / 상태 → `ups_actual_cost_status_invalid` / 청구확정 상태 → `billing_finalize_status_invalid` / 권한 → `permission_denied` / 프로필 없음 → `profile_not_found` |
| `ups-actual-charges.ts` | 오더 없음 / UPS 아님 / 상태 → `ups_actual_charge_status_invalid` / Agency 스코프 → `shipper_scope_denied` / 권한 → `permission_denied` |
| `tracking.ts` | 오더 없음 → `order_not_found` / 라벨 없음 → `label_not_found` / SHXK poll 실패 → `shxk_generic{code:TRACKING_POLL}` / 사유 없음 → `manual_reason_required` / 이미 배송완료 → `already_delivered` / 소속 조직 없음 → `agency_org_missing` / 스코프 → `shipper_scope_denied` / 상태전이 거부 → `status_change_denied` |

- DB/시스템 실패는 `trError('generic', { code })` + `logger.error`:
  `ACTUAL_COST_SAVE`, `ACTUAL_COST_EXCHANGE_SAVE`, `INVOICE_LOOKUP`, `INVOICE_UPDATE`, `POST_FINALIZATION_ADJUST`, `ADJUSTMENT_COST_CREATE`, `LINKED_COST_LOOKUP`, `INVOICE_AMOUNT_UPDATE`, `OTHER_CHARGES_SAVE`, `ACTUAL_COST_LOOKUP`, `ACTUAL_CHARGES_LOOKUP`, `ESTIMATED_COST_LOOKUP`, `ORDER_SEARCH`, `CHARGES_DELETE`, `CHARGES_INSERT`, `ADJUSTMENT_DELETE`, `ADJUSTMENT_LOOKUP`, `ADJUSTMENT_UPDATE`, `ADJUSTMENT_INSERT`, `ADJUSTMENT_LINK`, `TRACKING_EVENT_SAVE`, `TRACKING_CONFIG_SAVE`, `TRACKING_CONFIG_LOOKUP`, `TRACKING_RAW_LOGS_LOOKUP`, `TRACKING_OVERVIEW_LOOKUP`, `STATUS_UPDATE`, `UNEXPECTED`.

## 3. 작업 항목 2 — `err.message`/DB 원문 직노출 제거

- 3파일의 `err.message` 사용 **0건**으로 정리(측정 13/16/8 → 0/0/0, §5-1). `tracking.ts`의 잔존 1건은 `check.message`를 **로그 문자열에만** 사용(반환값 아님).
- catch 8곳(`recordUpsActualCost`/`preview`/`recordActualCostAndFinalize`/`recordUpsActualCharges`/`refreshTrackingData`)은 `generic {code:'UNEXPECTED'}` 반환 + `logger.error(…, err)`로 **에러 객체 유지**.
- getter(계약 유지 필요, §4)는 throw 메시지를 `trError('generic',{code})`로 생성 → **원문 미포함**. 원문은 `logger.error`에 객체로 전달.

## 4. 작업 항목 3 — throw 13건 판정

| # | 파일:줄(원) | throw 내용 | 사용자 도달 여부 / 호출자 근거 | 조치 |
|:--|:--|:--|:--|:--|
| 1 | `ups-actual-cost.ts:44` | 실제 원가 확정 권한 없음 | **도달** — `recordUpsActualCost`/`previewUpsActualCost`/`recordActualCostAndFinalize`의 try 내부 → catch가 `err.message` 반환하던 경로(클라이언트 toast) | **반환 전환** (`assertAdmin()` → `string|null`, 3개 호출부 `return {success:false,error}`) |
| 2 | `ups-actual-cost.ts:83` | 실제 원가 조회 실패 | **간접 도달** — `getUpsActualCost`는 `UpsActualAdjustmentForm.tsx:77`이 호출하나 내부 catch는 `console.error`만. 반환 계약(`data` 직접) 변경은 `src/components/**` 수정이 필요해 **이번 범위 금지** | **throw 유지 + 로케일 문구 + logger.error** (원문 미포함, 계약 불변) |
| 3 | `ups-actual-cost.ts:436` | `User profile not found` | **도달** — 같은 함수 catch가 원문 반환 | **반환 전환** (`profile_not_found`) |
| 4 | `ups-actual-charges.ts:21` | 부가요금 등록 권한 없음 | **도달** — record(내부 catch) + search(호출 컴포넌트 toast) | **반환 전환** (`assertAdminOrAgency()`), search는 로케일 문구 throw |
| 5 | `ups-actual-charges.ts:273` | 실제 청구 목록 조회 실패 | **간접** — `UpsActualAdjustmentForm.tsx:165`, 계약 변경 시 components 수정 필요 | **throw 유지 + 로케일 문구 + logger.error** |
| 6 | `ups-actual-charges.ts:289` | 예상 운임 조회 실패 | **간접** — `getUpsChargeReconciliation` (동일 컴포넌트:162) | **throw 유지 + 로케일 문구 + logger.error** |
| 7 | `ups-actual-charges.ts:308` | 실제 청구 조회 실패 | **간접** — 동일 | **throw 유지 + 로케일 문구 + logger.error** |
| 8 | `ups-actual-charges.ts:363` | 오더 검색 실패 | **도달** — `ups-actual-charges-client.tsx:37`이 catch 후 `toast.error(err.message)` | **throw 유지 + 로케일 문구 + logger.error** (문구는 로케일 일반문구 → 원문 미노출) |
| 9 | `tracking.ts:97` | add tracking event 실패 | **도달** — `AdminTrackingControl.tsx:39`는 **반환값을 보지 않고** catch에서만 `toast.error` → 반환 전환 시 실패가 성공 토스트로 보임 | **throw 유지 + 로케일 문구 + logger.error**(재작업) |
| 10 | `tracking.ts:127` | update tracking config 실패 | **도달** — `AdminTrackingControl.tsx:52` 동일 구조 | **throw 유지 + 로케일 문구 + logger.error**(재작업) |
| 11 | `tracking.ts:145` | fetch configs 실패 | **도달** — `TrackingDashboard.tsx:68` catch(로그만). 반환 무시 → 계약 확장 안전 | **반환 전환** (`{success:false,processed:0,errors:0,error}`) |
| 12 | `tracking.ts:179` | raw logs 조회 실패 | 서버 컴포넌트(`orders/[orderId]/page.tsx:105`) 렌더 경로 — throw 시 페이지 오류(원문은 Next가 마스킹) | **반환 전환** (`{logs:[],total:0,error}` — 기존 필드 유지) |
| 13 | `tracking.ts:211` | tracking overview 조회 실패 | **도달** — `TrackingDashboard.tsx:52` catch(로그만) | **반환 전환** (`{configs:[],total:0,error}`) |

> 요약: **반환 전환 6건**, **throw 유지 7건**(getter 5 + tracking 2 — 호출 화면이 반환값을 보지 않고 catch로만 실패 처리). 유지 7건도 메시지는 `trError` 문구이며 원문은 로그에만 남는다.

## 5. 작업 항목 4 — SHXK 원문 패스스루

```bash
$ grep -nE "orderRes\.message|removeRes\.message|res\.message|cnmessage|enmessage|未找到|Invalid Ship" src/app/actions/finance/ups-actual-cost.ts src/app/actions/finance/ups-actual-charges.ts src/app/actions/operations/tracking.ts
(출력 없음)
```
→ 3개 파일에 **SHXK 원문 패스스루 없음 = 해당 없음**. `tracking.ts`의 SHXK 실패는 `pollTracking()`이 `null`을 반환하는 구조이며, 사용자 문구는 `Errors.shxk_generic{code:'TRACKING_POLL'}`로 대체했다(원문 없음). `translateShxkMessage()` 신규 사전 항목도 **추가하지 않음**(관측 문구 없음).

## 6. 작업 항목 5 — 관측성(#1183) 및 알림 판정

### 6-1. #1183 처리표 (DB 쓰기/조회 실패 로깅)

| 파일 | 지점 | 처리 |
|:--|:--|:--|
| `ups-actual-cost.ts` | `zen_ups_actual_cost` upsert(record) | `logger.error(…, upsertError)` 추가 |
| 동일 | `zen_ups_actual_cost` update(환율/원가) | 추가 |
| 동일 | `zen_invoices` select(invError) | 추가 |
| 동일 | `zen_invoices` update(ADMIN_TO_AGENCY) | 추가 |
| 동일 | `zen_order_costs` insert(화주 조정) | 추가 |
| 동일 | `zen_order_costs` select(costsError) | 추가 |
| 동일 | `zen_invoices` update(화주 금액) | 추가 |
| 동일 | `zen_ups_actual_cost` upsert(finalize) | 기존 로그 유지(문구만 갱신) |
| 동일 | `zen_ups_actual_other_charges` insert | 기존 로그 유지 |
| 동일 | 마감 후 조정 실패(agency/shipper) | `logger.error(res.error)` 추가 |
| `ups-actual-charges.ts` | `zen_ups_actual_charges` delete | 추가 |
| 동일 | `zen_ups_actual_charges` insert | 추가 |
| 동일 | `zen_order_costs` select(estError) | 추가 |
| 동일 | `zen_order_costs` delete(조정) | 추가 |
| 동일 | `zen_order_costs` select(기존 조정 확인) | 추가 |
| 동일 | `zen_order_costs` update(조정) | 추가 |
| 동일 | `zen_order_costs` insert(조정) | 추가 |
| 동일 | `zen_invoices` update(ADMIN_TO_AGENCY) | 추가 |
| 동일 | `zen_order_costs` update(인보이스 연결) | 추가 |
| 동일 | `zen_order_costs` select(연결 비용) | 추가 |
| 동일 | `zen_invoices` update(화주 금액) | 추가 |
| 동일 | 마감 후 조정 실패 | `logger.error(failed.error)` 추가 |
| 동일 | `zen_tracking_configs` select(searchDeliveredUpsOrders) | 추가(기존 무로그) |
| `tracking.ts` | events insert / config update / config select / raw logs / overview / orders update / SHXK poll | 전부 추가 |

- **DB 쓰기 실패는 `logger.error(…, error객체)`** 로 통일(직전 3파일 총 `logger.error` 호출 0~1건대 → 대폭 보강).

### 6-2. 핵심 지점 알림 판정 (ZEN_A4 4기준)

| 지점 | 금전 | 고객접점 | 침묵성 | 사고이력 | 해당 수 | 판정 |
|:--|:--:|:--:|:--:|:--:|:--:|:--|
| `ups-actual-cost` DB 쓰기 실패(원가 확정) | O | O(오더 상세) | O | O(#1183) | **4** | **알림 필요** → IMP-190 |
| `ups-actual-charges` DB 쓰기 실패(청구/조정) | O | O | O | O(#1183) | **4** | **알림 필요** → IMP-190 |
| `tracking` 조회/저장 실패 | △ | O | O | X | 2 | 알림 필요(후속 판단) — 이번엔 로그만 |

- **알림(`logClientError(CRITICAL)`) 신규 구성은 이번 PR 범위 밖**(지시) → **IMP-190** 등록.

## 7. 산출물

### 7-1. `Errors` 신규 키 9개 (ko 기준, 4개 로케일 동일 세트)
`not_ups_order`, `ups_actual_cost_status_invalid`, `ups_actual_charge_status_invalid`, `billing_finalize_status_invalid`, `shipper_scope_denied`, `manual_reason_required`, `already_delivered`, `agency_org_missing`, `status_change_denied`
- zh/ja는 초안 → **IMP-185에 키 목록 추가 기재**(지시).

### 7-2. 테스트
| 구분 | 파일 | 내용 |
|:--|:--|:--|
| 신규 | `tests/unit/finance/task-b352-error-locale.test.ts` | (a) 실패 경로 ko 문장 + 원문 미포함 (비용 upsert·요금 delete·상태 update), (b) getter throw 로케일 문구·원문 미포함, (d) `logger.error(…, error객체)` 인자 검증 |
| 신규 | `tests/unit/i18n/task-b352-locale.test.ts` | (c) 로케일 스위치형 mock으로 `not_ups_order`·`ups_actual_charge_status_invalid`·`manual_reason_required` ko/en/zh/ja 문구 |
| 갱신 | `tests/unit/finance/ups-actual-cost.test.ts` | `toContain` → `toBe` (not_ups_order / cost_status / permission_denied / billing_finalize_status) |
| 갱신 | `tests/unit/finance/ups-actual-charges.test.ts` | `toContain` → `toBe` (charge_status / shipper_scope_denied) |
| 갱신 | `tests/unit/finance/ups-actual-charges-dual-invoice.test.ts` | `'추가 인보이스 생성 실패'` → `generic(ko)+POST_FINALIZATION_ADJUST` |
| 갱신 | `tests/unit/operations/tracking-actions.test.ts` | INSERT/updateConfig 실패가 **reject**(정확 ko 문구) + DB 원문 미포함 + `logger.error(…, error객체)` 계약 고정 (재작업) |
| 갱신 | `tests/unit/ups/ups-order-detail-status.test.ts` | label 문구 → `label_not_found` / 스코프 문구 → `shipper_scope_denied` (`toBe`) |
| 갱신 | `tests/unit/i18n/errors-key-sync.test.ts` | 21키 → **30키** |

### 7-3. 되돌리기 검증 (실측)
| 검증 | 되돌린 내용 | 결과 | 복구 |
|:--|:--|:--|:--|
| A. DB 원문 은닉 | `recordUpsActualCharges` delete 실패를 `` `기존 실제 요금 삭제 실패: ${deleteError.message}` ``로 원복 | **1 failed / 3 passed** (`expected '기존 실제 요금 삭제 실패: DB_SECRET_CHARGE_DELE…' to be '…(코드: CHARGES_DELETE)'`) | 원복 후 **4 passed** |
| B. 관측성 | `recordUpsActualCost` upsert 실패의 `logger.error(…, upsertError)` 한 줄 삭제 | **1 failed / 3 passed** (`expected "vi.fn()" to be called with arguments`) | 원복 후 **4 passed**, `diff` 동일 |
| C. 호출 계약(재작업) | `addTrackingEvent` 실패를 `throw` → `return {success:false,error}` 로 원복 | **1 failed / 8 passed** (`expected undefined to be an instance of Error` — 성공 토스트 회귀 재현) | 원복 후 **9 passed**, `diff` 동일 |

## 8. 검증 (DoD)

- [x] 작업 1~6 근거(파일:줄·테스트명) — §2~§7
- [x] 3개 파일 사용자 노출 영문/원문 리터럴 0건 — §9-1 **실제 출력**
- [x] 전체 회귀 PASS — `Test Files 256 passed (256)` / `Tests 1850 passed (1850)`
- [x] `npm run build` 성공 — `BUILD_EXIT=0`, `✓ Compiled successfully in 23.1s`
- [x] diff 범위: `ups-labels.ts`·`lib/shxk/*`·`warehouse.ts`·`src/components/**`·`wrapper.ts` 없음 — §9-2
- [x] 파일 길이 1,500줄 미만 (**618 / 454 / 495**), 신규 함수 50줄 이하(`assertAdmin` 5줄, `assertAdminOrAgency` 6줄). 기존 대형 함수(`recordUpsActualCost` 245·`recordUpsActualCharges` 251 등)는 **base부터 초과** — 분해는 범위 외로 수치만 기재
- [x] zh/ja 신규 키 목록 IMP-185 추가 기재
- [x] R-20: GitNexus 불가 + 호출처 grep — §9-3

## 9. 근거 출력

### 9-1. 리터럴/원문 0건
```bash
$ for f in src/app/actions/finance/ups-actual-cost.ts src/app/actions/finance/ups-actual-charges.ts src/app/actions/operations/tracking.ts; do echo "== $f"; grep -nE "(error|message): *[\`'\"]" $f | grep -v "logger\.\|console\."; grep -c "\.message" $f; done
== src/app/actions/finance/ups-actual-cost.ts
0
== src/app/actions/finance/ups-actual-charges.ts
0
== src/app/actions/operations/tracking.ts
1        # check.message — logger 문자열에만 사용(반환값 아님)
```
```bash
$ grep -nE "(error|message): *[\`'\"][A-Za-z]" <3 files> | grep -v "logger\."
(출력 없음)
```

### 9-2. diff 범위 (실제 출력)
```bash
$ git diff --stat | grep -E "ups-labels|lib/shxk|warehouse|components/|wrapper"
(출력 없음)

$ git diff --stat
 messages/en.json                                   |  11 +-
 messages/ja.json                                   |  11 +-
 messages/ko.json                                   |  11 +-
 messages/zh.json                                   |  11 +-
 scratch/post_launch_improvements.md                |  14 +++
 src/app/actions/finance/ups-actual-charges.ts      |  87 ++++++++++-----
 src/app/actions/finance/ups-actual-cost.ts         | 123 +++++++++++++++------
 src/app/actions/operations/tracking.ts             |  69 +++++++++---
 tests/unit/finance/ups-actual-charges-dual-invoice.test.ts | 3 +-
 tests/unit/finance/ups-actual-charges.test.ts      |  4 +-
 tests/unit/finance/ups-actual-cost.test.ts         | 10 +-
 tests/unit/i18n/errors-key-sync.test.ts            | 11 +-
 tests/unit/operations/tracking-actions.test.ts     | 12 +-
 tests/unit/ups/ups-order-detail-status.test.ts     |  6 +-
 14 files changed, 289 insertions(+), 94 deletions(-)
# 신규(untracked) 2건: tests/unit/finance/task-b352-error-locale.test.ts, tests/unit/i18n/task-b352-locale.test.ts
```

### 9-3. R-20 (GitNexus 불가)
- `which gitnexus` / `.gitnexus/` 모두 없음 → **불가**, grep 대체:
  - `recordUpsActualCost`·`previewUpsActualCost`·`recordActualCostAndFinalize` → `src/components/orders/UpsActualAdjustmentForm.tsx`, `src/components/finance/BillingConfirmModal.tsx`
  - `getUpsActualCost`·`getUpsActualCharges`·`getUpsChargeReconciliation` → `UpsActualAdjustmentForm.tsx`
  - `searchDeliveredUpsOrders` → `admin/ups-actual-charges/ups-actual-charges-client.tsx`
  - `recordUpsActualCharges` → `UpsActualAdjustmentForm.tsx`
  - `addTrackingEvent`·`updateTrackingConfig` → `AdminTrackingControl.tsx`; `syncExternalTracking`·`getGlobalTrackingOverview` → `TrackingDashboard.tsx`; `checkRealtimeUpsTrackingAction`·`manuallySetOrderDeliveredAction` → `UpsOrderStatusStepper.tsx`; `getTrackingEvents`·`getTrackingRawLogs`·`getUpsTrackingEvents` → 오더 상세 서버 페이지
  - 반환 계약은 신규 `error` 필드 추가뿐이며 기존 필드 유지 → **컴포넌트 수정 불필요**(diff 0건으로 확인)

## 10. [작업 결과]

- **코드 커밋**: `fef7e1f07` `[Dave] feat: TASK-B-352 ups-actual·charges·tracking 오류 로케일 전환` / 재작업 `18b0be059` `[Dave] fix: TASK-B-352 재작업 — tracking 이벤트/공급자 실패는 throw 유지(성공 토스트 회귀 방지)`
- 문서 커밋: 본 task file
- PR: base `TeamB_Dev` / `Closes #1325` (부모 #1280은 닫지 않음)
- 라벨: `status:open` → `status:in-progress` → `status:review`

### 10-1. 검증 결과

| 검증 | 명령 | 결과 |
|:--|:--|:--|
| 신규/영향 테스트 | `npx vitest run <8개 파일>` | `Test Files 8 passed (8)` / `Tests 61 passed (61)` |
| 전체 회귀(R-08) | `npm run test:regression` | **`Test Files 256 passed (256)` / `Tests 1851 passed (1851)`** (exit 0) — 재작업 후 재실행 |
| 빌드 | `npm run build` | `BUILD_EXIT=0`, `✓ Compiled successfully in 8.9s` (재작업 후) |
| 타입체크(advisory) | `npx tsc --noEmit` | 변경 파일 오류 **0건** (전체 기존 오류 212건 — base와 동일 계열) |
| 되돌리기 A (DB 원문 은닉) | §7-3 | **1 failed / 3 passed** → 복구 4 passed |
| 되돌리기 B (관측성 로그) | §7-3 | **1 failed / 3 passed** → 복구 4 passed, `diff` 동일 |

### 10-3. 🔁 재작업 이력 (Jaison 리뷰 2026-11-16 — 성공 토스트 회귀)

**차단 사유**: `addTrackingEvent`·`updateTrackingConfig`를 반환 방식으로 바꾸면서, 유일 호출자 `AdminTrackingControl.tsx:36-56`이 **반환값을 보지 않고** `try { await … ; toast.success } catch { toast.error }` 구조라 **DB 실패 시에도 성공 토스트**가 뜨는 회귀.

| 단계 | 실행 | 결과 |
|:--|:--|:--|
| 1 | 두 함수를 **throw 유지 + 로케일 문구**로 되돌림(원문은 `logger.error(…, error객체)`) | 성공 시 `{success:true}` 계약 그대로 |
| 2 | 테스트 갱신: INSERT/updateConfig 실패 → `rejects.toThrow(정확 ko 문구)` + 원문 미포함 + logger 인자 검증 | `tracking-actions.test.ts` 통과 |
| 3 | **재발 방지 테스트 1건 추가**: `updateTrackingConfig` reject 계약 고정 | 통과 |
| 4 | 되돌리기 C: 반환 방식으로 원복 → **1 failed / 8 passed** → 복구 **9 passed** | 회귀 재현 확인 |
| 5 | task file §4 표 9·10행, 요약 카운트 **6건/7건**으로 정정 | — |
| 6 | 전체 회귀·빌드 재실행 | §10-1 갱신 |

- 코드 로직 변경은 위 2개 함수의 실패 처리 방식 복원뿐이며, 나머지 전환·로깅은 그대로다.

### 10-2. `check-R17-DoD`
본 환경에 `check-R17-DoD` 실행 파일/슬래시 커맨드가 **없음**(`which` 미검출 — B-345/348/350/351 동일) → §8 DoD를 수동 대조했다(미체크 0건·placeholder 0건·증거 명령/출력 기재).

## 11. [발견 이슈]

1. **[범위 제약] getter 5건은 throw 유지** — `getUpsActualCost`·`getUpsActualCharges`·`getUpsChargeReconciliation`·`searchDeliveredUpsOrders`(×2)는 반환 계약을 `{success,error}`로 바꾸려면 `src/components/**` 수정이 필요하나, 이번 DoD가 `components/**` diff 0건을 요구한다. → **메시지는 로케일 문구 + 원문은 logger**로 처리(원문 노출 0). 계약 전환은 B-353에서 클라이언트와 함께 다루는 것이 안전.
2. **[계약 확장] `tracking` getter 2건에 `error?` 필드 추가** — `getTrackingRawLogs`·`getGlobalTrackingOverview`가 실패 시 빈 결과 + `error` 필드를 반환하도록 확장했다. 기존 소비자(`orders/[orderId]/page.tsx`, `TrackingDashboard.tsx`)는 해당 필드를 읽지 않아 **무수정으로 동작**(컴포넌트 diff 0건).
3. **[관측성] #1183 ~21지점 로깅 보강 완료** — DB 쓰기 실패는 모두 `logger.error(…, error객체)`. 다만 `ups-actual-*`는 ZEN_A4 알림 기준 3~4개 해당(금전·고객접점·침묵성·이력)이므로 `logClientError(CRITICAL)` 연동이 필요하나 **이번 PR 범위 밖** → **IMP-190** 등록.
4. **[i18n] 신규 9키 zh/ja 초안** — IMP-185에 키 목록 추가 기재(지시). 문구 검수는 JSJung 대상.
5. **[회귀 수치] 256 files / 1,850 tests** — develop 동기화(#1324)로 base 테스트 수가 244/1,781에서 증가한 값이며, 본 Task 신규 2파일·9테스트가 포함된 실행 결과다.
6. **[테스트 갱신] `toContain` → `toBe`** — 기존 느슨한 단언을 새 로케일 문구 정확 비교로 강화했다(단언 약화 없음). `ups-order-detail-status`의 라벨/스코프 문구도 `toBe`로 갱신.
7. **[동작 변화] `getTrackingRawLogs` 실패 시 동작 변경** — 이전에는 throw로 서버 컴포넌트 렌더가 오류 페이지가 됐으나, 이제 **빈 목록 + `error` 필드**를 반환해 관리자 보조 화면이 빈 상태로 렌더된다(원인은 `logger.error`에 기록). Jaison 리뷰에서 수용(단, PR 본문에 명시 요청) → 본 항목으로 기록.
8. **[UX 변화] `status_change_denied` 통일로 구체 사유 미표시** — 기존에는 `check.message`(예: 상태전이 규칙 상세)를 사용자에게 보여줬으나, 로케일 문구로 통일하며 **구체 사유는 로그에만** 남는다. 사유를 문구 파라미터로 넘기는 개선은 **IMP 후보**(Jaison 비차단 메모 1).
9. **[문구 의미] `label_not_found` 재사용** — "활성 UPS 운송장 번호 없음"에 "발급된 라벨이 없습니다"를 사용했다. 의미가 인접하나 완전히 같지는 않으므로 zh/ja 검수(IMP-185) 시 함께 검토 대상(Jaison 비차단 메모 2).
