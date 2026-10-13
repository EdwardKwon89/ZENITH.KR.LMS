# TASK-B-336 — Issue #1247: 미존재·비활성 ups_product_code 등록 전 거부 + 스냅샷 누락 경고 (DEF-B-151)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1247](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1247) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-13 |
| **우선순위** | P2 |
| **상태** | 🔔 리뷰 대기 |
| **브랜치** | `feature/teamb-336-iss1247-ups-product-guard` (base `origin/TeamB_Dev` @ `2245c4772`) |

## 1. 배경·문제 (DEF-B-151, JSJung 발령 결정 2026-10-13)

`orderRegistrationSchema.ups_product_code`가 `z.string().optional()`(무검증)라 오타·구버전 코드(예 `WWE`)로 UPS 오더를 등록해도 오류 없이 저장되고, `saveOrderRateSnapshot`이 미존재 상품을 만나 `if (!product) return;`으로 **무음 반환** → **운임 스냅샷 없는 UPS 오더**가 생성되어 정산·인보이스가 실패한다. 상세: `.agent/defects/DEF-B-151_대량등록_미존재_ups_product_code_운임스냅샷_무음누락.md`(PR #1246으로 `TeamB_Dev` 병합).

## 2. 구현 (지시 1~4)

- `src/lib/orders/ups-product-guard.ts` **신규**: `export async function assertActiveUpsProduct(supabase, code): Promise<void>`. `zen_ups_products`에서 `.eq('product_code', code).eq('is_active', true).maybeSingle()` 조회. **`error`는 "없음"과 구분해** `UPS 상품 코드 검증 중 오류가 발생했습니다: <message>` throw, 없으면 `존재하지 않거나 비활성화된 UPS 상품 코드입니다: <code>` throw. (`'use server'` 아님 → export 자유)
- `src/app/actions/operations/orders.ts`
  - `createOrder`: `orderRegistrationSchema.parse`·DIRECT 정리 직후, `OrderRepository` 생성 **전**에 `if (validated.transport_mode === 'UPS' && validated.ups_product_code) await assertActiveUpsProduct(supabase, validated.ups_product_code);` → **RPC(오더 생성) 이전 거부**.
  - `updateOrder`: `validated.ups_product_code`가 **기존 저장값(`order.ups_product_code`)과 다를 때만** 검증(`effectiveTransportMode === 'UPS'` 기준) — 레거시 오더 수정 차단 방지.
  - `saveOrderRateSnapshot`: 무음 `return` 2곳(상품 미존재 / 중량·목적지 누락)에 `logger.warn`(오더 ID·코드·사유 포함). **동작 불변**(스냅샷은 여전히 스킵).
- **범위 밖 준수**: `ups_product_code` 필수화 스키마 변경 안 함(→ `[발견 이슈]` IMP 후보), `OrderRegistrationForm.tsx`·`UpsServiceSelector`·엑셀 템플릿 무변경, `estimateUpsFreight`·스냅샷 계산 무변경. `bulk-orders.ts`도 무수정(`formatBulkError`가 `Error.message`를 그대로 노출) — 테스트로만 보호.

## 3. [재현 결과] (실측)

- **단위(가드)**: mock 체인에서 `product_code`·`is_active`를 실제 비교 → `WWE`(미존재)는 `data:null` → `존재하지 않거나 비활성화된 UPS 상품 코드입니다: WWE` throw. `WW_SAVER_NONDOC`는 통과. (vacuous 아님 — 아래 되돌리기 (b)로 입증)
- **createOrder 미존재 코드**: `createOrderViaRpc` **0회**, `supabase.rpc` 0회 → 오더 미생성 후 throw.
- **실DB 화주 세션(R-14)**: `zen_ups_products` RLS = `is_active = true`(authenticated SELECT 정책 `ups_products_authenticated_select`). 화주 세션으로 `WW_SAVER_NONDOC` 실측 → 통과, `WWE` → 거부. (RLS가 정상 코드까지 막지 않음을 확인 — 이 가드의 전제)
- **saveOrderRateSnapshot**: 미존재 코드 → `logger.warn`(`[ORDER_RATE_SNAPSHOT] … orderId=… product_code=WWE`) + `zen_order_rate_snapshots` insert 미발생(동작 불변).

## 3-1. 기존 테스트 fixture 수정 (지시 2: 수정 사유·목록 기재)

| 파일 | 수정 내용 | 사유 |
|:--|:--|:--|
| `tests/unit/orders/order-edit-log-b303.test.tsx` | `buildSupabaseMock`의 `maybeSingle`이 `zen_ups_products`일 때 `{ product_code:'WW_EXPEDITED' }` 반환하도록 1줄 보강 | 기존 mock이 모든 테이블에 `data:null` 반환 → 새 가드가 정상 fixture(`WW_EXPEDITED`)까지 거부해 TC-B303-07 실패. **검증 약화 없음** — mock이 실존 활성 상품을 모델링하도록 보강(가드 자체 보호는 별도 `ups-product-guard.test.ts`가 담당). fixture 약화 아님. |

> 그 외 기존 테스트 fixture 수정 없음.

## 4. 테스트 (지시 1~5)

| TC | 입력/조건 | 기대 | 위치 |
|:--|:--|:--|:--|
| **TC-336-01** | 가드, 활성 코드 | resolve + 쿼리에 `product_code`·`is_active=true` 인자 포함(캡처) | `tests/unit/orders/ups-product-guard.test.ts` |
| **TC-336-02** | 가드, `WWE` | `존재하지 않거나 비활성화된 UPS 상품 코드입니다: WWE` | 〃 |
| **TC-336-03** | 가드, DB `error` | `UPS 상품 코드 검증 중 오류가 발생했습니다: connection reset`("없음"과 구분) | 〃 |
| **TC-336-04** | createOrder, `WWE` | throw + `createOrderViaRpc` 0회·`rpc` 0회 | 〃 |
| **TC-336-05** | createOrder, 실존 | `createOrderViaRpc` 1회 | 〃 |
| **TC-336-06** | createOrder, AIR(`WWE`) | `from('zen_ups_products')` 0회, 오더 1회 | 〃 |
| **TC-336-07** | updateOrder, 기존값 동일 | 조회 0회 + `updateHeader` 1회 | 〃 |
| **TC-336-08** | updateOrder, 다른 미존재 | throw + `updateHeader` 0회 | 〃 |
| **TC-336-09** | 스냅샷, 미존재 | `logger.warn`(orderId·product_code) + 스냅샷 insert 미발생 | 〃 |
| **TC-336-RLS-01/02** | 실DB·화주 세션: 통과/거부 | `WW_SAVER_NONDOC` resolve / `WWE` throw | `tests/integration/def-b151-ups-product-guard.test.ts` |
| **TC-336-BULK** | 대량 등록 2행 중 1행 미존재 | 해당 행 `success:false`(메시지 노출·`{` 미포함), 다른 행 성공(행 격리) | `tests/unit/operations/bulk-orders.test.ts` |

- **되돌리기 검증 3종 직접 수행**:
  - (a) `createOrder` 가드 호출 제거 → **TC-336-04 FAIL** (+ 관련 1건)
  - (b) 헬퍼 `is_active` 조건 제거 → **TC-336-01 FAIL** (활성 코드도 `is_active` 미포함으로 거부 — vacuous 아님 입증)
  - (c) 헬퍼 `error` 구분 제거 → **TC-336-03 FAIL**
  - 각각 단독 FAIL 확인 후 복원 → 가드 단위 9/9 + 통합 2/2 PASS.

## 5. 검증 (DoD)

- [x] 구현 1~4 (헬퍼 / createOrder 사전 거부 / updateOrder 조건부 / 스냅샷 경고)
- [x] 테스트 1~5 (단위 9 + 통합 2 + 대량 격리 1) — 신규 12건 PASS
- [x] 되돌리기 3종 직접 수행·기재(섹션 4)
- [x] **R-18**: DEF-B-151 `조치 상태`를 "TASK-B-336(Issue #1247)로 해결"로 갱신
- [x] **관측성 판단 근거(지시 4)**: 핵심 지점 4기준 중 ①금전 영향(운임 스냅샷 누락 → 정산·인보이스 실패) 해당, ③침묵성(무음 return) 해당 → **2개 충족**. 다만 **사전 거부(구현 1)로 근본 해소**되고 `logger.warn`으로 가시화되므로 실시간 알림(`logClientError`)은 구성하지 않음
- [x] **범위 밖 준수**: `orderRegistrationSchema` 무변경(`ups_product_code` optional 유지), `OrderRegistrationForm.tsx`·`UpsServiceSelector`·`bulk-order-template.ts`·`estimateUpsFreight`·스냅샷 계산 무변경. DEF/IMP 후보는 `[발견 이슈]`에 기재
- [x] `LIVE_REGRESSION_TEST_MAP.md` §69 신설 (R-09)
- [x] `npm test` 전체 PASS (R-08) — **220 files / 1563 tests** (신규 12 포함)
- [x] `npm run build` 성공
- [x] `tsc --noEmit` 변경 파일 신규 오류 0
- [x] **R-12**: `find docs -iname "Ds_11*"` 확인 — `Ds_11_API_상세_명세서.md:111` `createOrder` 절은 "입력: OrderRegistrationInput (Zod 기반)"만 기술(필드별 검증 규칙 미열거) → 검증은 `OrderRegistrationInput` 경계 내부 규칙, **문서 변경 불요**(해당 없음)
- [x] **R-04** 자가점검: diff는 base `origin/TeamB_Dev` 대비 코드 2 + 테스트 4 + MAP 1 + DEF 1 + 본 task file
- [x] **R-15 해당 없음**: DB 스키마·마이그레이션 무변경(RLS 정책 기존재 확인만). Baker R-10 예외(2026-07-15, 스크린샷 미요구)

## 6. [작업 결과]

- **코드 커밋**: `d8990a178` — `[Baker] fix: TASK-B-336 미존재·비활성 ups_product_code 등록 전 거부 + 스냅샷 누락 경고 (#1247)`
- **변경 파일**: `src/lib/orders/ups-product-guard.ts`(신규), `src/app/actions/operations/orders.ts`, `tests/unit/orders/ups-product-guard.test.ts`(신규), `tests/integration/def-b151-ups-product-guard.test.ts`(신규), `tests/unit/operations/bulk-orders.test.ts`, `tests/unit/orders/order-edit-log-b303.test.tsx`, `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`(§69), `.agent/defects/DEF-B-151_*.md`(조치 상태)
- **검증**: `npm test` **220 files / 1563 tests PASS**, `npm run build` 성공, `tsc --noEmit` 변경 파일 오류 0
- **PR**: [#1248](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1248) — base `TeamB_Dev`

## 7. [발견 이슈]

| DEF# | 결함 | 긴급도 | 보고서 | 상태 |
|:--|:--|:--|:--|:--|
| **DEF-B-151** | 미존재/비활성 `ups_product_code` 무음 통과 → 운임 스냅샷 없는 UPS 오더 생성 | Medium | [`DEF-B-151_…md`](../defects/DEF-B-151_대량등록_미존재_ups_product_code_운임스냅샷_무음누락.md) | **본 Task에서 해결** |
| — (IMP 후보) | `ups_product_code`를 UPS 오더의 **필수**로 승격(스키마) — 기존 fixture 다수 영향, 별도 검토 필요 | Low | (본 task 파일) | 범위 밖(보고만) |
| — | `updateOrder`의 `transport_mode`가 `editScope.lockTransportMode`일 때 `validated.ups_product_code`를 그대로 저장(잠금 대상 아님) → 기존값과 달라도 저장될 수 있음 | Low | (본 task 파일) | 범위 밖(가드는 통과 코드만 허용하므로 무해) |
