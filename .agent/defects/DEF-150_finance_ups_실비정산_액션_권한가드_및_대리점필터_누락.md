# DEF-150 | `finance/{ups-actual-charges,ups-actual-cost,invoice,settlement}.ts` 대리점 범위 필터 누락·미인증 export·조회 가드 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1162 (Issue #1354, R-12 Ds-11 미반영 2차 finance 4개 파일 21개 함수 문서화) 수행 중, 21개 함수의 권한 가드·입력·부수효과를 코드 라인 단위로 전수 실사하다 발견 |
| **긴급도** | **High** (1번 항목: `searchDeliveredUpsOrders` 트래킹 번호 검색 경로에서 `AGENCY` 소속 화주 필터 누락) / **Medium** (2~4번 항목: `'use server'` 미인증 헬퍼 export, 원가/인보이스 조회 액션 역할 가드 부재, `MANAGER` 역할 분기 불일치) |
| **발견일** | 2026-11-17 |
| **발견자** | Riley (Team A, CPO) |
| **관련** | Issue #1354 (TASK-1162) · Issue #1338 (TASK-1156, DEF-147 점검 병행) · R-12 · R-18 |
| **조치 상태** | 미조치 — TASK-1162는 문서 전용 Task(`src/` 수정 금지)이므로 R-18에 따라 DEF 분리 등록 후 Aiden 선보고 |

---

## 1. 현상 및 코드 근거 (확인된 사실)

### 1.1 [High] `searchDeliveredUpsOrders` (`src/app/actions/finance/ups-actual-charges.ts:366-454`) — 2단계(`tracking_no`) 검색 시 `AGENCY` 소속 화주 필터 누락 및 대리점 본인 화주(`profile.org_id`) 누락

1. **트래킹 번호 검색 경로(2단계)의 `AGENCY` 필터 누락**:
   - 1단계(`order_no` 검색, L374-406)에서는 `if (profile.role === 'AGENCY')` 분기(L398-406)를 통해 `zen_agency_shippers`에 연결된 `shipperIds` 소속 오더만 `resultList`에 남긴다.
   - 그러나 2단계(`zen_tracking_configs.tracking_no` 검색, L410-451)에서는 매칭된 `order_id`로 `zen_orders`를 재조회(`moreOrders`, L424-440)한 뒤, L442-449에서 **`profile.role === 'AGENCY'` 여부 및 `shipperIds.has(o.shipper_id)` 검사를 전혀 거치지 않고 `resultList.push(o)`로 그대로 추가**한다.
   - 결과적으로 `AGENCY` 계정이 트래킹 번호(또는 일부 문자열)로 검색하면(`zen_orders` RLS 허용 범위 내에서) 소속 화주가 아닌 타 조직의 UPS 오더가 검색 결과에 노출될 수 있다.
2. **대리점 자기 자신(`profile.org_id`) 화주 오더 누락 (`DEF-B-141` 미동기화)**:
   - `src/app/actions/finance/settlement.ts:468-476`의 `resolveAgencyShipperIds()`는 `TASK-B-316 (Issue #1156, DEF-B-141)`로 `[...downstreamIds, agencyOrgId]`(대리점 자기 자신을 화주로 등록한 오더 포함)를 반환하도록 수정되었다.
   - 반면 `src/app/actions/finance/ups-actual-charges.ts`의 `recordUpsActualCharges`(L54-65)와 `searchDeliveredUpsOrders`(L398-406)는 `zen_agency_shippers` 테이블의 `shipper_org_id`만 조회하고 `profile.org_id`를 포함하지 않아, 대리점이 직접 발송한 UPS 오더에 대해 실비 등록·검색이 거부(`shipper_scope_denied`)된다.

---

### 1.2 [Medium] `getOrderReleasedDate` (`src/app/actions/finance/ups-actual-cost.ts:56-69`) — `'use server'` 모듈에서 인증 가드 없는 내부 헬퍼 함수가 Server Action으로 export됨

- `src/app/actions/finance/ups-actual-cost.ts`는 파일 최상단에 `'use server'`(L1)가 선언된 Server Action 모듈이다.
- L56-69의 `export async function getOrderReleasedDate(supabase: any, orderId: string, fallbackCreatedAt?: string)`는 내부에서 `validateUserAction()`이나 `assertAdmin()`을 전혀 호출하지 않고 첫 번째 인자로 `supabase: any` 클라이언트를 직접 받는다.
- Next.js App Router 규칙상 `'use server'` 파일의 모든 `export` 함수는 외부 호출 가능한 Server Action 엔드포인트로 노출되며, 외부에서 `supabase` 객체를 직렬화해 전달할 수도 없으므로 내부 헬퍼(`async function getOrderReleasedDate`)로 전환하거나 `src/lib/`로 분리해야 한다.

---

### 1.3 [Medium] 정산·원가·인보이스 조회 액션 5건 — 액션 레벨 역할·소유권 가드 부재 (RLS 단일 의존)

아래 5개 조회 함수는 모두 `validateUserAction()`(로그인 세션 유무)만 확인하고 액션 코드 내 역할/소유권 검사가 없다:

| 파일 | 함수 (행 번호) | 코드상 가드 | 위험 및 비고 |
|:-----|:-------------|:-----------|:------------|
| `src/app/actions/finance/ups-actual-cost.ts` | `getUpsActualCost(orderId)` (L72-91) | `validateUserAction()` (L73) | 같은 파일의 `recordUpsActualCost`·`previewUpsActualCost`·`recordActualCostAndFinalize`는 모두 `assertAdmin(profile)`(`ZENITH_SUPER_ADMIN`/`ADMIN`/`MANAGER`)을 강제하나, 조회 함수인 `getUpsActualCost`만 `assertAdmin`이 빠져 있음 (`zen_ups_actual_cost`는 플랫폼 원가 데이터 — #1338 B_Kai 점검 범위와 연계) |
| `src/app/actions/finance/ups-actual-charges.ts` | `getUpsActualCharges(orderId)` (L279-299) | `validateUserAction()` (L280) | `assertAdminOrAgency` 및 오더 소유권 확인 없음 (RLS 단일 의존) |
| `src/app/actions/finance/ups-actual-charges.ts` | `getUpsChargeReconciliation(orderId)` (L301-364) | `validateUserAction()` (L302) | `zen_order_costs`·`zen_ups_actual_charges`·`zen_invoices` 3개 테이블을 조회해 예상/실제/차액 및 마감 여부를 반환하나 액션 레벨 소유권·역할 확인 없음 |
| `src/app/actions/finance/invoice.ts` | `getInvoicePdfHistory(invoiceId)` (L109-132) | `validateUserAction()` (L110) | `zen_invoice_pdf_history` 조회 후 **`supabase.storage.from('invoices').createSignedUrl(item.file_path, 3600)`(1시간 유효 서명 URL)**을 생성해 반환함. Storage 버킷 정책과 별개로 `invoiceId` 소유권 검증이 액션 코드에 없음 |
| `src/app/actions/finance/invoice.ts` | `getTaxInvoiceHistory(invoiceId)` (L282-294) | `validateUserAction()` (L283) | `invoiceId`에 대한 호출자 소속 화주/관리자 검증 없이 `findTaxInvoicesByInvoiceId` 호출 (RLS 단일 의존) |

---

### 1.4 [Low/Medium] `settlement.ts` `getSettlementOverview` · `getWeeklyRevenueChart` — `MANAGER` 역할 누락 및 `finalizeInvoice` 감사 이력 실패 무시

1. **`MANAGER` 역할 누락 (`src/app/actions/finance/settlement.ts:352, 377`)**:
   - 같은 파일의 `generateInvoicesForOrder`(L19), `assertFinalizePermission`(L80), `updatePaymentStatus`(L222), `calculateSettlementAction`(L292), `addManualOrderCost`(L493)는 모두 `adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN]`로 `MANAGER`를 플랫폼 관리자로 인정한다.
   - 그러나 `getSettlementOverview()`(L352)와 `getWeeklyRevenueChart()`(L377)만 `const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;`으로 작성되어 있어, 플랫폼 `MANAGER`가 호출하면 `shipperId = profile.org_id`(플랫폼 조직 ID)로 필터링되어 전체 정산 통계가 0건으로 조회된다.
2. **`markInvoiceFinalized` · `rejectInvoice` · `createPostFinalizationAdjustment` 내부 DB 호출 반환값 `error` 미확인**:
   - `settlement.ts:132-138`(`zen_invoice_history` insert), `L582-586`(`zen_invoices` total_amount update 및 history insert), `L664-671`·`L680-686`(`zen_invoice_history` insert 및 `zen_order_costs` 연결 해제)에서 `{ error }` 반환값을 확인·로깅하지 않는다(GOV_COMMON 실패 관측성 의무 관련, 기존 Issue #1183과 인접 영역).

---

## 2. 권장 조치

1. **`ups-actual-charges.ts` (`searchDeliveredUpsOrders`, `recordUpsActualCharges`)**:
   - `searchDeliveredUpsOrders` L440 이후 `moreOrders` 병합 시에도 `profile.role === 'AGENCY'`이면 `shipperIds.has(o.shipper_id)` 필터를 동일하게 적용.
   - 두 함수 모두 `shipperIds` 구성 시 `profile.org_id`(대리점 본인 화주)를 포함하도록 `resolveAgencyShipperIds` 패턴으로 통일.
2. **`ups-actual-cost.ts` (`getOrderReleasedDate`, `getUpsActualCost`)**:
   - `getOrderReleasedDate`를 `'use server'` 파일에서 non-export 내부 함수(또는 `src/lib/` 유틸)로 분리하고, `getUpsActualCost`에 역할/소유권 검증 정책을 명시.
3. **`invoice.ts` · `settlement.ts`**:
   - `getInvoicePdfHistory`에서 `invoiceId`의 `shipper_id === profile.org_id`(또는 관리자/소속 대리점) 확인 후 Signed URL 발급.
   - `getSettlementOverview`·`getWeeklyRevenueChart`의 `isAdmin` 판정에 `USER_ROLES.MANAGER` 추가.
