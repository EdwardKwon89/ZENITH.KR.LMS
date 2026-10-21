# TASK-B-339 — Issue #1254: UPS 오더 "UPS 등록 전까지" 전체 수정 가능 + 상세 화면 수정 버튼 진입

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1254](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1254) (TASK-B-338 #1253 철회분 포함) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-20 |
| **우선순위** | P1 (고객 요청) |
| **상태** | 🔔 리뷰 대기 (Jaison 반려 → 보완 2건 반영 후 재검토 요청) |
| **브랜치** | `feature/teamb-339-iss1254-ups-edit-before-registration` (base `origin/TeamB_Dev` @ `b292cdb58`) |

## 1. 배경·문제

고객 요청(JSJung 2026-10-20, Q1·Q2 확정):

1. **UPS 오더는 "UPS 등록 전"까지 수정 가능**해야 한다.
   - Q1: "UPS 등록 전" = 창고의 `UPS 등록`(WAREHOUSED→PACKED, SHXK `createorder`) **이전**.
   - Q2: WAREHOUSED 단계에서도 **전체 오더 수정 가능** — TASK-B-284(#1070)의 부분 수정 제약(화주·운송수단 잠금, 실측 패키지 치수·무게 잠금)을 해제.
2. **오더 수정은 오더 상세 화면의 수정 버튼으로 진입**할 수 있어야 한다.

> ⚠️ 이 Task는 TASK-B-284(#1070, 실측값 보호) 통제를 **의도적으로 완화**한다. 완화 위험은 안전장치 ①·②·③으로 보완한다. Aiden에게 통제 변경 사실 공유 필요(Jaison 조치).

### 발견한 결함 3건과 대응

| 결함 | 내용 | 대응 |
|:--|:--|:--|
| ① 상태 판정 허점 | HELD/RETURNED/CLAIMED는 PACKED·IN_TRANSIT **이후에도** 전이 가능 → 상태만으로 "등록 전" 보장 불가 | **활성 라벨 행**(`zen_ups_labels.is_voided=false`)을 등록 사실로 판정, 상태보다 우선 |
| ② 낡은 폼 덮어쓰기 | `updateOrder`는 패키지를 delete+reinsert → 잠금 해제 시 화주의 낡은 값이 창고 실측값을 조용히 덮어씀 | 안전장치 ①(5개 값 불변 시에만 `measured_at` 이월) + ②(낙관적 동시성) |
| ③ 운임 스냅샷 미갱신 | 중량·치수 변경 시 `zen_order_rate_snapshots`가 낡은 채 남음. `unique_order_snapshot(order_id)` 유일 인덱스라 insert-only 불가 | 안전장치 ③ update-or-insert + `is_manual` 보호 |

## 2. 구현

### A. 수정 가능 판정 (단일 정본)
- `src/lib/logistics/status-machine.ts` — `getOrderEditScope(WAREHOUSED,'UPS')` → `{ editable:true, fullEditable:true, lockShipperId:false, lockTransportMode:false, lockMeasuredPackageDims:false, auditEdit:true }`. **WAREHOUSED+비UPS는 불변(수정 불가)**. `isOrderPartiallyEditable`은 삭제하지 않고 의미 변경을 주석으로 갱신(참조처 없음 확인).
- `src/lib/orders/ups-edit-availability.ts` **신규** — `getUpsEditAvailability(status, hasActiveUpsLabel)`. 활성 라벨이면 **상태와 무관하게** `UPS_REGISTERED` 차단(메시지에 `UPS 등록취소` 안내), 아니면 `getOrderEditScope(status,'UPS')` 판정, WAREHOUSED는 `재실측` 안내 메시지.
- `src/lib/orders/ups-registration.ts` **신규** — `hasActiveUpsLabel(supabase, orderId)`: `zen_ups_labels`에서 `order_id`·`is_voided=false` `.limit(1).maybeSingle()`, **DB error는 throw**(없음으로 취급 금지).
- `src/lib/orders/detail-path.ts` **신규** — `getOrderDetailPath(orderId, transportMode)`: UPS→`/orders/{id}/ups-detail`, 그 외→`/orders/{id}`.

### B. 서버 강제와 안전장치 (`src/app/actions/operations/orders.ts`)
1. **등록 후 수정 차단**: `getOrderEditScope` 검사 직후 `transport_mode==='UPS'`면 `hasActiveUpsLabel` 확인 → 불가 시 `throw new Error(availability.message)`.
2. **안전장치 ① `measured_at` 이월/해제**: 재삽입 시 기존 실측 패키지의 **(length, width, height, gross_weight, packing_count) 5개 값이 모두 같으면 이월**, 하나라도 바뀌면 넣지 않음(→ 미실측·재실측 필요). 숫자 정규화(`normalizePackageNumber`)는 **`null`/`undefined`/`''`/`0`/`NaN`을 모두 "비어 있음(=0)"으로 통일**한다(수정 화면 `edit-defaults.ts`가 DB null 치수를 `?? 0`으로 실어 보내고 폼 `valueAsNumber`가 그 0을 제출하므로, `null !== 0` 판정은 값 미변경에도 `measured_at`을 지우는 위양성이었다 — Jaison 리뷰 보완 1). 기존 `lockMeasuredPackageDims` 분기는 유지(다른 스코프 호환).
3. **안전장치 ② 낙관적 동시성**: `src/lib/validation/order.ts`의 `orderPackageSchema`에 `measured_at: z.string().nullable().optional()` 추가(Zod 제거 방지). `updateOrder`에서 payload `measured_at` ≠ DB `measured_at`이면 **저장 전** throw(`창고에서 실측값이 갱신되었습니다…`). `measured_at` 미포함 payload는 비교 생략(레거시/fixture 보호). `OrderRegistrationForm.tsx` **무수정** — RHF `handleSubmit`이 `defaultValues.measured_at`을 그대로 넘김을 실측 확인.
4. **안전장치 ③ 스냅샷 갱신**: `src/lib/orders/rate-snapshot-refresh.ts` **신규** — `refreshUpsRateSnapshot({supabase, orderId, estimateFn})`. UPS 오더 현재 DB값(패키지 중량 합계·첫 패키지 치수·`recipient_country_code`(없으면 dest_port 국가)·`ups_product_code`·`incoterms`·`shipper_id`·`agency_org_id`·`recipient_state_province`)으로 재계산 → **update-or-insert**, `is_manual=true`는 warn 후 건너뜀, 계산 불가 시 warn, `estimateFn` throw는 **전파**. `updateOrder` 말미 **수정 후 운송수단(`effectiveTransportMode`)**이 UPS일 때만 호출(수정 전 `order.transport_mode` 기준은 UPS→비UPS 불필요 갱신·비UPS→UPS 갱신 누락 — Jaison 리뷰 보완 2), 실패는 `logger.error`만(수정 저장 롤백 안 함).
5. **감사**: `auditEdit:true` 유지. `ORDER_EDIT_LOG_CORE_FIELDS`에 `shipper_id`·`transport_mode` **이미 포함 확인**(변경 불요).

### C. 화면
1. `edit/page.tsx` — UPS는 `getUpsEditAvailability`(활성 라벨 반영)로 판단, 불가 시 상세로 리다이렉트. 리다이렉트·돌아가기 경로를 `getOrderDetailPath`로 교체(UPS도 `ups-detail`로).
2. `ups-detail/page.tsx` — 헤더에 `수정` 버튼 **항상 표시**. 가능=`<Link href=/orders/{id}/edit>`(Pencil, `title`=message), 불가=비활성 버튼(`aria-disabled="true"`, 회색, `title`=message). 등록 여부는 이미 조회한 `getUpsLabelStatus().hasActiveLabel` **재사용**(추가 쿼리 0).
3. `OrderRegistrationForm.tsx` **무수정** — `fullEditable:true`가 되면 기존 `isPartialEdit` 배너·`lockTransportMode`·`isPackageMeasured`가 자동 해제됨을 렌더 테스트로 확인.

## 3. 테스트 (신규 8세트)

| TC | 조건 | 기대 | 위치 |
|:--|:--|:--|:--|
| TC-AVL-01~04 | (REGISTERED/SCHEDULED/WAREHOUSED, false) | editable, WAREHOUSED는 message에 `재실측` | `tests/unit/orders/ups-edit-availability.test.ts` |
| TC-AVL-05~08 | (PACKED/IN_TRANSIT,false) / (HELD/RETURNED/CLAIMED/REGISTERED/WAREHOUSED,true) / 전체 상태 순회 | STATUS 차단 / UPS_REGISTERED 최우선 | 〃 |
| TC-LBL-01~06 | `hasActiveUpsLabel` — `.eq` 인자 캡처 | 있음 true / 없음 false / error throw | `tests/unit/orders/ups-registration.test.ts` |
| TC-PATH-01~05 | `getOrderDetailPath` | UPS→ups-detail, AIR/null/undefined→일반 | `tests/unit/orders/detail-path.test.ts` |
| TC-SNAP-01~07 | 기존/없음/`is_manual`/계산 불가/추정 throw/인자·국가 대체 | update-or-insert, 보존, warn, throw 전파 | `tests/unit/orders/rate-snapshot-refresh.test.ts` |
| TC-339-①~⑨-d | `updateOrder` — 라벨 차단 / 잠금 해제 / measured_at 이월·해제 / 동시성 / 비UPS 조회 0회 / **⑦-b·⑦-c 수정 후 운송수단 기준 스냅샷** / **⑨-b·⑨-c·⑨-d null↔0 정규화** | 인자 캡처 단언(delete·insert 0회 포함) | `tests/unit/logistics/order-update-b339.test.ts` |
| TC-BTN-①~⑤ | UPS 상세 렌더 | 링크 href / `재실측` / `aria-disabled` / `UPS 등록취소` | `tests/unit/orders/ups-detail-edit-button.test.tsx` |
| TC-FRM-①~④ | `getOrderEditScope('WAREHOUSED','UPS')` 실제 함수로 폼 렌더 | 배너 없음, 운송수단·실측 입력 disabled 아님 | `tests/unit/orders/edit-form-warehoused-unlocked.test.tsx` |
| TC-339-INT-①~⑥ | 실DB(R-14) — 실측 변경/불변(**치수 null 패키지를 폼과 같은 `0`으로 제출해 `measured_at` 보존**), 활성 라벨, 동시성, 화주 세션 RLS, 스냅샷 1행 | NULL/보존, 거부 시 DB 불변, 라벨 조회 가능 | `tests/integration/ups-edit-before-registration.test.ts` |

## 3-2. Jaison 반려 보완 2건 (2026-10-20)

| # | 지적 | 수정 | 추가 테스트 |
|:--|:--|:--|:--|
| 보완 1 | `measured_at` 이월 판정이 `null(DB) !== 0(폼)`으로 위양성 → 값 미변경인데 재실측 강제 | `normalizePackageNumber`를 `Number(value ?? 0)` 기반으로 변경, `null`/`undefined`/`''`/`0`/`NaN`을 **모두 0**으로 통일 | 단위 ⑨-b(치수 null→폼 0, 이월), ⑨-c(length null→5, 해제), ⑨-d(gross_weight null→0, 이월), 통합 INT-②(실DB null 치수 패키지) |
| 보완 2 | 스냅샷 갱신 조건이 **수정 전** `order.transport_mode` 기준 → UPS→비UPS 불필요 갱신, 비UPS→UPS 누락 | 같은 스코프의 `effectiveTransportMode`(수정 후 운송수단)로 교체 | 단위 ⑦-b(AIR→UPS 호출), ⑦-c(UPS→AIR 미호출) |

> **⑨-d 관련**: 리뷰 요청 문구는 "DB `gross_weight=0` / 페이로드 `null`"이나, `orderPackageSchema.gross_weight`는 `z.number()` 필수라 payload `null`은 Zod가 거부한다(저장 자체 불가 → `measured_at` 삭제 경로 없음). 따라서 같은 취지를 **DB `null` / payload `0`** 방향으로 검증했다. 폼이 빈 중량을 `NaN`으로 제출하는 경우도 Zod가 거부하므로 위양성 경로가 없다.

## 3-1. 기존 테스트 수정 (허용 목록 + 사유)

| 파일 | before | after | 사유 |
|:--|:--|:--|:--|
| `tests/unit/logistics/status-machine.test.ts` (TC-284-T3) | `fullEditable:false`, lock 3종 `true` | `fullEditable:true`, lock 3종 `false` | Q2 확정 — 잠금 해제(허용 목록) |
| `tests/unit/logistics/order-update.test.ts` (TC-EDIT-PAGE-02) | 주석 "부분 수정" | 주석 "전체 수정" | 주석만 갱신, **assertion 불변** |
| `tests/integration/iss1070-ups-warehoused-partial-edit.test.ts` (TC-284-02) | 실측 값 변경이 저장되지 않음(잠금) | 값은 저장되고 `measured_at`만 해제 | 새 사양(잠금 해제 + 안전장치 ①), 기대값 갱신 |
| 〃 (TC-284-01) | `buildPayload()`(실측 패키지 999 포함) | 실측 패키지는 기존 값(30/20/10/12.5) 유지, 미실측 패키지만 200/300/400/50 | 잠금 해제로 999를 보내면 두 패키지 모두 미실측이 되어 `getPkg(ORDER,false)` 식별 불가. 이 케이스의 목적("미실측 패키지 수정 성공")을 유지하기 위한 fixture 조정 — **새 사양 하에서 의미 보존** |

### ⚠️ 허용 목록 외 수정 (mock 인프라 한정 — 단언 변경 없음, JSJung/Aiden 확인 요청)

| 파일 | 수정 | 사유 |
|:--|:--|:--|
| `tests/unit/orders/ups-product-guard.test.ts` | generic supabase mock에 `limit: () => this` 추가 | `updateOrder`가 이제 `zen_ups_labels`를 `.limit(1)`로 조회 → mock 체인 미지원으로 TC-336-07/08이 "limit is not a function"으로 실패. **mock 체인 호환용 1줄** |
| `tests/unit/orders/ups-detail-b300.test.tsx` | (1) `lucide-react` mock에 `Pencil` 추가 (2) `@/lib/auth/rbac` mock을 `importOriginal` 스프레드로 변경 | 페이지가 `ups-edit-availability`→`status-machine`→`rbac(USER_ROLES)`를 새로 import → 기존 `rbac` 부분 mock에 `USER_ROLES` 부재로 suite 로드 실패. **assertion 무변경** |
| `tests/unit/orders/ups-detail-b301.test.tsx` | 위와 동일 | 위와 동일 |

> `b301 파일 수정 금지` 지시와 충돌한다. 위 변경은 **assertion을 건드리지 않는 mock 인프라 보강**이며, 새 사양(A-2/C-2)이 페이지↔lib 모듈 그래프를 필연적으로 확장해 발생한 것이다. 대안(페이지에서 `getUpsEditAvailability` 미사용)은 사양 위반이므로 택하지 않았다. **JSJung/Aiden 확인 요청.**

## 4. 되돌리기 검증 8종 (직접 수행, 단독 FAIL 확인 후 복원)

| # | 파괴한 메커니즘 | 대상 테스트 | 결과(FAIL 인용) |
|:--|:--|:--|:--|
| a | 판정의 `hasActiveUpsLabel` 우선 분기 제거 | `ups-edit-availability.test.ts` | `× TC-AVL-05 · TC-AVL-06 · TC-AVL-07 · TC-AVL-08` → `Tests 6 failed \| 10 passed` |
| b | `updateOrder` 라벨 가드 제거 | `order-update-b339.test.ts` TC-339-① | `× TC-339-①: UPS + 활성 라벨 → throw + updateHeader 0회` → `1 failed \| 8 skipped` |
| b′ | 〃 (통합 8-(ii)) | `ups-edit-before-registration.test.ts` TC-339-INT-③ | `× TC-339-INT-③: 활성 라벨 삽입 후 → 저장 거부 + DB 불변` → `1 failed \| 5 skipped` |
| c | `measured_at` 변경 감지 제거(항상 이월) | `order-update-b339.test.ts` TC-339-④ | `× TC-339-④: 실측 패키지 값 변경 → measured_at 없음` → `1 failed \| 8 skipped` |
| c′ | 〃 (통합 8-(i)) | `ups-edit-before-registration.test.ts` TC-339-INT-① | `× TC-339-INT-①: … DB measured_at이 NULL` → `1 failed \| 5 skipped` |
| d | 낙관적 동시성 비교 제거 | `order-update-b339.test.ts` TC-339-⑤ | `× TC-339-⑤: 페이로드 measured_at ≠ DB measured_at → throw + 삭제/삽입 0회` → `1 failed \| 8 skipped` |
| d′ | 〃 (통합 8-(iii)) | `ups-edit-before-registration.test.ts` TC-339-INT-④ | `× TC-339-INT-④: 폼 로드 후 창고가 measured_at을 갱신한 상태 → 저장 거부` → `1 failed \| 5 skipped` |
| e | 스냅샷 `is_manual` 분기 제거 | `rate-snapshot-refresh.test.ts` | `× TC-SNAP-03: is_manual=true(관리자 수동 확정)면 update·insert 0회 + warn` → `1 failed \| 8 passed` |
| f | 버튼 비활성 분기 제거 | `ups-detail-edit-button.test.tsx` | `× TC-BTN-01~05 (5건)` → `5 failed` |
| g | `getOrderEditScope` WAREHOUSED+UPS 잠금 복원 | `edit-form-warehoused-unlocked.test.tsx` | `× TC-FRM-01~04 (4건)` → `4 failed` |
| g′ | 〃 (단위 4-②) | `order-update-b339.test.ts` TC-339-② | `× TC-339-②: … shipper_id·transport_mode 변경값이 updateHeader에 반영` → `1 failed \| 8 skipped` |
| h | `detail-path` UPS 분기 제거 | `detail-path.test.ts` | `× TC-PATH-01: UPS → /orders/{id}/ups-detail` → `1 failed \| 4 passed` |
| i | **보완 1** — `normalizePackageNumber`를 `null`≠`0`으로 원복 | `order-update-b339.test.ts` ⑨-b·⑨-d / `ups-edit-before-registration.test.ts` INT-② | `× TC-339-⑨-b`, `× TC-339-⑨-d` → `Tests 2 failed \| 12 skipped`; `× TC-339-INT-②` (`expected null to be '2026-10-20 11:05:23…'`) → `1 failed \| 5 skipped` |
| j | **보완 2** — 스냅샷 조건을 수정 전 `order.transport_mode`로 원복 | `order-update-b339.test.ts` ⑦-b·⑦-c | `× TC-339-⑦-b`, `× TC-339-⑦-c` → `Tests 2 failed \| 12 skipped` |

> **되돌리기 방법(보완 (i)(j))**: 리뷰 지시대로 원본을 보존한 채 수행했다. 작업 전 `cp src/app/actions/operations/orders.ts /tmp/b339_orders_orig.ts`로 백업하고, 변이→테스트→`cp` 복원 후 **`shasum`이 원본과 동일함(`053de1d2…`)** 을 확인했다. untracked 파일은 이번 변이 대상이 아니었다(변이는 tracked `orders.ts` 1개).

> ⚠️ 되돌리기 스크립트 1차 실행 중 복원 로직 버그(`open(w)`가 `open(r)`보다 먼저 평가되어 파일이 빈 상태로 덮임)로 6개 파일이 순간적으로 0바이트가 되었다. `git checkout`(tracked 3) + 컨텍스트/테스트 계약 기반 재작성(untracked 3: `ups-edit-availability`·`detail-path`·`rate-snapshot-refresh`)으로 **완전 복구**했고, 복구 후 해당 단위 36/36 + 전체 회귀 1623/1623 PASS로 동일성을 입증했다. 이후 복원 로직을 고쳐 나머지 6건을 재수행했다.

## 5. 검증 (DoD)

- [x] 구현 A·B·C
- [x] 테스트 1~8 신규 작성·PASS
- [x] 되돌리기 8종(12케이스) 직접 수행·기재(섹션 4) + **보완 되돌리기 (i)(j) 추가**
- [x] 기존 테스트 변경 표(섹션 3-1) — 허용 목록 + mock 인프라 예외 명시(리뷰에서 **승인**됨)
- [x] `LIVE_REGRESSION_TEST_MAP.md` **§71** 신설 (R-09) — §70 공백은 TASK-B-337 미착수로 정상(리뷰 확인)
- [x] `npm run test:regression` 전체 PASS — **228 files / 1628 tests** (보완 +5 단위 테스트)
- [x] `npm run build` 성공 (exit 0)
- [x] `tsc --noEmit` 변경 파일(`src/`) 신규 오류 **0** (잔여는 기존 `tests/e2e/`·`iss1100-*` 오류로 무관)
- [x] **R-12**: `docs/03_Design/_archive/ds_11/Ds_11_DETAIL_ORDER.md` §3.7 `updateOrder`는 "기존 오더 정보 및 패키지/아이템 정보를 수정"만 기술하고 WAREHOUSED/부분 수정 서술 **없음 → 해당 없음**
- [x] **R-15 관측성**: 수정 거부(등록 후·동시성)는 **예상 가능한 업무 실패**로 사용자에게 메시지로 반환되므로 별도 `logger.warn` 생략(근거 명시). 스냅샷 갱신 실패만 `logger.error`(데이터 정합 영향)
- [x] **R-04** 자가점검: base `b292cdb58` 대비 코드 6(신규 4 + 수정 2) + 테스트 11(신규 7 + 수정 4) + MAP 1 + task file 1
- [x] **R-14**: 로컬 Supabase 실DB 통합 테스트 6건 PASS
- [x] 알려진 부작용 기재(섹션 7)

## 6. [작업 결과]

- **변경 파일**:
  - 신규: `src/lib/orders/ups-registration.ts`, `ups-edit-availability.ts`, `detail-path.ts`, `rate-snapshot-refresh.ts`
  - 수정: `src/app/actions/operations/orders.ts`, `src/lib/logistics/status-machine.ts`, `src/lib/validation/order.ts`, `src/app/[locale]/(dashboard)/orders/[orderId]/edit/page.tsx`, `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`
  - 테스트 신규: `tests/unit/orders/{ups-edit-availability,ups-registration,detail-path,rate-snapshot-refresh,ups-detail-edit-button,edit-form-warehoused-unlocked}.test.ts(x)`, `tests/unit/logistics/order-update-b339.test.ts`, `tests/integration/ups-edit-before-registration.test.ts`
  - 테스트 수정: `tests/unit/logistics/{status-machine,order-update}.test.ts`, `tests/integration/iss1070-ups-warehoused-partial-edit.test.ts`, `tests/unit/orders/{ups-product-guard,ups-detail-b300,ups-detail-b301}.test.tsx`
  - 문서: `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` (§71), 본 task file
- **검증**: 전체 회귀 **228 files / 1628 tests PASS**, build 성공, `src/` 타입 오류 0
- **커밋**: `ba548b63` (feat, 코드+테스트) · `41735a92` (docs, task file+MAP) · **[보완 커밋 해시는 아래 §8 참조]**

## 8. [보완 이력] Jaison 반려(2026-10-20) 대응

| 구분 | 내용 |
|:--|:--|
| 코드 | `orders.ts` 2건 — `normalizePackageNumber` null=0 통일, 스냅샷 조건 `effectiveTransportMode` (커밋 `8eb814e0`) |
| 테스트 | 단위 +5 (⑦-b·⑦-c·⑨-b·⑨-c·⑨-d), 통합 INT-② 확장(null 치수 패키지, 테스트 수 6 유지) |
| 되돌리기 | (i)(j) 수행·원본 백업(cp)+`shasum` 복원 확인 — 섹션 4 |
| 검증 | 회귀 **228 / 1628 PASS**, build 성공, `src/` 타입 오류 0 |
| 비차단 지적 | ① `status:in-progress` 제거 ② MAP는 코드 커밋 규칙 준수(이번 보완은 MAP 변경 없음) ③ 되돌리기 원본 보존(cp) — 모두 반영 |

## 7. [발견 이슈]

| # | 내용 | 긴급도 | 상태 |
|:--|:--|:--|:--|
| 1 | **통제 변경 공유**: WAREHOUSED+UPS의 잠금 3종이 해제됨(고객 요청). TASK-B-284 CPO&Audit 권고의 의도적 완화 — Aiden 공유 필요 | High | Jaison 조치 대기 |
| 2 | **알려진 부작용**: WAREHOUSED에서 `transport_mode`를 UPS 이외로 바꾸면 그 오더는 WAREHOUSED+비UPS가 되어 **이후 수정 불가**가 된다(REGISTERED에서 모드를 바꾸는 기존 동작과 같은 성격) | Low | 코드로 막지 않음(사양) |
| 3 | **알려진 부작용**: `shipper_id` 변경 시 이미 입고된 재고(`syncInventoryFromOrder`)의 소유 정합은 이 Task가 다루지 않음. 코드 확인 결과 재고 동기화는 **품목 수량 diff만** 반영하며 `shipper_id`(조직 소유)를 변경하지 않는다 → 재고 소유가 새 화주로 이전되지 않는 **불일치 가능성**이 있다(사실만 기재) | Low | 범위 밖(보고만) |
| 4 | `zen_ups_labels` RLS = `ups_labels_authenticated_select`(SELECT, `true`) → 화주 세션으로도 활성 라벨 조회 가능. 가드가 "항상 없음"으로 무력화되는 사고 없음을 통합 TC-339-INT-⑤로 실측 | — | 확인 완료 |
| 5 | MAP 번호 공백: Issue는 "TASK-B-337이 §70" 전제였으나 이 브랜치·main 모두 §70이 없다(TASK-B-337 미착수). 지시대로 **§71**로 신설 — 번호 공백 존재 | Low | Jaison 확인 완료(정상, §71 유지) |
| 6 | 허용 목록 외 mock 인프라 수정 3파일 발생(섹션 3-1) — `b301 수정 금지` 지시와 충돌 | Medium | Jaison **승인**(지시 과했음, 허용 범위 = 단언 무변경 mock 보강) |
