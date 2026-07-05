# 📡 ZENITH_LMS API Specification (v2.1 Sync)

> **프로젝트:** ZENITH_LMS (지능형 통합 물류 플랫폼)
> **최종 동기화:** 2026-04-27
> **상태:** **Synchronized** (Source Code & DB Schema 기반 전수 조사 완료)

본 문서는 ZENITH_LMS의 **Server Actions (Next.js)** 및 **Supabase RPC (PostgreSQL Functions)** 인터페이스를 정의합니다. 모든 신규 기능 개발 시 본 사양을 진실의 근거(Source of Truth)로 삼습니다.

---

## 1. 인증 및 세션 (Authentication)
사용자 인증 및 초기 세션 처리를 담당합니다.
- **Path**: `src/app/[locale]/(auth)/login/actions.ts`

### login(formData)
- **설명**: 이메일/비밀번호 기반 로그인 처리 및 세션 쿠키 설정
- **Input**: `FormData` (email, password)
- **Output**: `Promise<{ success: boolean, error?: string }>`

### signup(formData, locale)
- **설명**: 신규 사용자(화주/파트너) 가입 요청 처리
- **Input**: `FormData`, `locale` (default: 'ko')
- **Output**: `Promise<{ success: boolean, error?: string }>`

---

## 2. 마스터 데이터 (Master Data)
플랫폼의 기초가 되는 지리, 조직, 코드 정보를 관리합니다.
- **Path**: `src/app/actions/master.ts`

### getPorts()
- **설명**: 전 세계 항구/공항(ZEN_PORTS) 리스트 조회
- **Output**: `Promise<Port[]>`

### upsertPort(payload)
- **설명**: 항구 정보 추가 또는 수정 (Admin 전용)
- **Input**: `Partial<Port>`

### getNations()
- **설명**: 국가 코드 및 지역 정보 리스트 조회
- **Output**: `Promise<Nation[]>`

### getOrganizations()
- **설명**: 화주, 파트너사 등 등록된 모든 조직 정보 조회
- **Output**: `Promise<Organization[]>`

### getAirlines()
- **설명**: 등록된 항공사 마스터 정보 조회
- **Output**: `Promise<Airline[]>`

### getCommonCodesByGroup(groupCode)
- **설명**: 특정 그룹에 속한 공통 코드 리스트 조회 (예: 'PACKING_UNIT', 'TRANS_MODE')
- **Input**: `string`

### upsertCommonCode(payload) / deleteCommonCode(id)
- **설명**: 공통 코드 관리 (Admin 전용)

### getCurrentUserAffiliation()
- **설명**: 현재 로그인한 사용자의 소속 조직 및 권한 정보 조회
- **Output**: `Promise<{ org: Organization, profile: Profile }>`

---

## 3. 오더 관리 (Order Management)
물류 오더(House Order) 및 집행 오더(Master Order)의 생명주기를 관리합니다.
- **Path**: `src/app/actions/orders.ts`

### createOrder(payload)
- **설명**: 신규 하우스 오더 등록 (Header + Packages + Items 동시 처리)
- **Input**: `OrderRegistrationInput` (Zod Schema 검증)
- **Output**: `Promise<Order>`

### getOrders(filters)
- **설명**: 필터 조건에 따른 오더 리스트 조회 (Pagination 지원)
- **Input**: `{ status?, query?, page?, pageSize? }`

### getOrderDetails(orderId)
- **설명**: 특정 오더의 상세 정보 및 패킹/아이템 리스트 조회

### updateOrderStatus(orderId, newStatus)
- **설명**: 상태 머신(Status Machine) 규칙에 따른 오더 상태 변경
- **Validation**: `canChangeStatus` 로직 통과 필수

### createMasterOrder(payload) / dissolveMasterOrder(masterId)
- **설명**: 여러 하우스 오더를 하나의 마스터 오더로 묶거나(Binding) 해제(Dissolve)

### getMasterOrders() / getMasterOrderWithHouses(masterId)
- **설명**: 마스터 오더 목록 및 포함된 하우스 오더 상세 조회

---

## 4. 정산 및 재무 (Finance & Settlement)
비용 계산, 청구서 발행 및 결제 상태를 관리합니다.
- **Path**: `src/app/actions/finance.ts`

### generateInvoicesForOrder(orderId)
- **설명**: 오더 완료(RELEASED) 시 RPC를 호출하여 비용 산출 후 청구서 자동 생성
- **RPC Link**: `calculate_order_costs`

### updatePaymentStatus(invoiceId, status, paidAmount)
- **설명**: 입금 확인 처리 및 연결된 오더의 빌링 상태 동기화
- **Business Logic**: 결제 완료(PAID) 시 원본 오더의 `billing_status`를 'PAID'로 자동 전환

### getSettlementOverview()
- **설명**: 대시보드 및 정산 리스트용 통계 데이터(미결제 합계, 최근 인보이스 등) 조회
- **Output**: `Promise<SettlementSummary>`

### getRevenueReport(filters)
- **설명**: [NEW] 필터 조건(기간, 운송모드, 화주)에 따른 수입 현황 리스트 및 요약 조회
- **Input**: `{ startDate, endDate, transMode?, shipperId? }`
- **Output**: `Promise<{ items: Invoice[], summary: { totalRevenue, count, avgRevenue } }>`

### getCostReport(filters)
- **설명**: [NEW] 필터 조건(기간, 서비스유형)에 따른 비용 현황 리스트 및 요약 조회
- **Input**: `{ startDate, endDate, serviceType? }`
- **Output**: `Promise<{ items: OrderCost[], summary: { totalCost } }>`

### getTransportCosts() / upsertTransportCost(payload) / deleteTransportCost(id)
- **설명**: [NEW] 운송 모드별/구간별 원가(Cost) 마스터 정보 관리 (Admin 전용)
- **Output**: `Promise<TransportCostMaster[]>`

---

## 5. 인벤토리 관리 (Inventory Management)
조직별 SKU 기반 재고 현황 및 변동 이력을 관리합니다.
- **Path**: `src/app/actions/inventory.ts`

### getInventoryList(filters)
- **설명**: 조직별 재고 현황 목록 조회 (Pagination, 검색, 저재고 필터 지원)
- **Input**: `{ page?, pageSize?, search?, lowStockOnly? }`
- **Output**: `Promise<{ items: Inventory[], totalCount: number }>`

### getInventoryStats()
- **설명**: [NEW] 대시보드용 재고 통계 요약 (전체 SKU, 저재고 품목 수, 품절 품목 수 등)
- **Output**: `Promise<{ totalSku: number, lowStockCount: number, outOfStockCount: number }>`

### getInventoryHistory(inventoryId)
- **설명**: 특정 품목의 상세 입출고/조정 이력 조회
- **Output**: `Promise<InventoryHistory[]>`

### upsertInventoryItem(payload)
- **설명**: [NEW] SKU 기반 재고 품목 생성 또는 정보(최소 재고 수량 등) 수정
- **Input**: `Partial<Inventory> & { sku_code: string }`

### adjustInventory(payload)
- **설명**: 관리자에 의한 수동 재고 수량 조정 (조정 사유 필수)
- **Input**: `{ inventoryId, adjustmentQty, reason }`
- **Validation**: `adjustmentQty`가 음수일 경우 현재고보다 클 수 없음

### syncInventoryFromOrder(orderId, status, itemDiff?)
- **설명**: [Internal] 오더 상태 변화에 따른 재고 자동 동기화 (예약/출고/취소/수정)

---

## 6. 실시간 트래킹 (Tracking)
화물의 이동 경로 및 상태 변경 이벤트를 관리합니다.
- **Path**: `src/app/actions/tracking.ts`

### getTrackingEvents(orderId)
- **설명**: 특정 오더의 전체 트래킹 히스토리 조회
- **Output**: `Promise<TrackingEvent[]>`

### addTrackingEvent(orderId, payload)
- **설명**: [Admin] 신규 트래킹 이벤트 수동 등록 (또는 Webhook 연동)
- **Input**: `orderId`, `{ event_code, location, description, event_time? }`

### updateTrackingConfig(orderId, providerType, providerName?)
- **설명**: [Admin] 오더의 트래킹 Provider 설정을 변경 (VIRTUAL, MANUAL, API)

### syncExternalTracking()
- **설명**: [Admin/System] API 공급자가 설정된 모든 활성 트래킹 데이터를 일괄 동기화
- **Process**: `TrackingManager.getTrackingData` 호출 및 오더 상태 자동 동기화

### refreshTrackingData(orderId)
- **설명**: 특정 오더의 트래킹 데이터를 강제로 외부 API와 동기화
- **Input**: `orderId`
- **Output**: `Promise<{ success: boolean, count?: number, error?: string }>`

### getTrackingRawLogs(orderId)
- **설명**: [Admin] 문제 발생 시 디버깅을 위한 원본(Raw JSON) 응답 내역 조회
- **Output**: `Promise<RawLog[]>`

### getGlobalTrackingOverview()
- **설명**: 대시보드용 전체 트래킹 현황 요약 조회 (최신 이벤트 포함)
- **Output**: `Promise<TrackingOverview[]>`

---

## 7. Supabase RPC (Database Functions)
복잡한 로직이나 대량 데이터 연산이 필요한 경우 호출되는 DB 함수입니다.

| 함수명 | 인자(Arguments) | 반환형 | 설명 |
| :--- | :--- | :--- | :--- |
| `approve_organization` | `target_org_id (uuid)` | `text` | 신규 조직 승인 및 관리자 프로필 생성 |
| `reject_organization` | `target_org_id, comment` | `boolean` | 가입 거절 및 사유 기록 |
| `request_organization_supplement` | `target_org_id, comment` | `boolean` | 서류 보완 요청 |
| `calculate_order_costs` | `p_order_id (uuid)` | `jsonb` | TISA 엔진 기반 운임 산출 및 항목 기록 |
| `get_orders_aggregation` | `order_ids (uuid[])` | `TABLE` | 마스터 결합용 중량/부피 합산 |
| `fn_get_best_matching_rate` | `carrier_id, origin, dest, etc.` | `TABLE` | 최적 요율 카드 매칭 |
| `generate_master_order_no` | `None` | `text` | M-YYMMDD-NNNN 형식 번호 생성 |
| `get_next_order_sequence` | `p_year, p_prefix` | `text` | 시퀀스 기반 오더 번호 생성 |

---


## 8. 선불 지갑 관리 (Wallet Management)
화주 조직의 자금 충전, 환불 및 인보이스 결제를 관리합니다.
- **Path**: `src/app/actions/wallet.ts`

### getWalletBalance(orgId)
- **설명**: 특정 조직의 지갑 잔액 및 통화 정보 조회 (최초 접근 시 자동 생성)
- **Input**: `orgId (uuid)`
- **Output**: `Promise<{ balance: number, currency: string, updatedAt: string }>`

### topUpWallet(orgId, amount, description?)
- **설명**: 지갑 잔액 충전 (Admin 전용)
- **Input**: `orgId`, `amount (number)`, `description?`
- **Output**: `Promise<ActionResult>`

### requestRefund(walletId, amount, description?)
- **설명**: 지갑 잔액 환불 요청 (PENDING 상태로 거래 생성)
- **Input**: `walletId`, `amount`, `description?`
- **Output**: `Promise<ActionResult>`

### payInvoiceFromWallet(invoiceId)
- **설명**: 지갑 잔액을 사용하여 인보이스 결제 처리 (원자적 트랜잭션)
- **Input**: `invoiceId (uuid)`
- **Output**: `Promise<ActionResult>`
- **Error**: `INSUFFICIENT_BALANCE` (잔액 부족 시)

---

## 9. 운항 스케줄 (Vessel Schedules)
해상/항공 운항 스케줄 정보를 관리 및 조회합니다.
- **Path**: `src/app/actions/schedules.ts`

### getVesselSchedules(filters)
- **설명**: [NEW] 출발/도착지 및 기간별 운항 스케줄 조회
- **Input**: `{ originPortId?, destinationPortId?, startDate?, endDate? }`
- **Output**: `Promise<VesselSchedule[]>`

### upsertVesselSchedule(payload) / deleteVesselSchedule(id)
- **설명**: [NEW] 스케줄 정보 관리 (Admin 전용)

---

## 10. 통계 및 분석 (Statistics & Analytics)
플랫폼 내 물동량, 매출, 수익성 지표를 시각화하기 위한 데이터를 제공합니다.
- **Path**: `src/app/actions/statistics.ts`

### getCostProfitStats(period)
- **설명**: [NEW] 특정 기간('WEEK', 'MONTH', 'YEAR') 동안의 운송 모드별 매출/비용/수익/이익률 통계 조회
- **Input**: `'WEEK' | 'MONTH' | 'YEAR'`
- **Output**: `Promise<{ statsByMode: Array<{ mode, revenue, cost, profit, margin }> }>`


---

## 15. 고객지원 (Support & VOC)
1:1 문의, FAQ, 공지사항 기능을 제공합니다.
- **Path**: `src/app/actions/support.ts`

### createQna(payload)
- **설명**: 신규 1:1 문의를 등록합니다. 오더와 연계 가능합니다.
- **Input**: `{ title: string, content: string, order_id?: string }`
- **Business Logic**: 
  - `order_id` 존재 시 해당 오더의 소유권(org_id 일치 여부) 검증
  - 성공 시 `PENDING` 상태로 등록 및 Admin 알림 발송

### getQnaList(filters)
- **설명**: 문의 목록을 조회합니다. 화주는 본인 조직의 것만, Admin은 전체 조회 가능합니다.
- **Input**: `{ status?, order_id?, limit?, offset? }`

### getQnaDetail(qnaId)
- **설명**: 문의 상세 내용 및 답변 이력을 조회합니다.

### answerQna(payload)
- **설명**: [Admin] 문의에 대한 답변을 등록하고 상태를 변경합니다.
- **Input**: `{ qnaId, content, isFinal? }`

### getOrderQnaList(orderId)
- **설명**: 특정 오더에 종속된 문의 목록만 조회합니다.

### upsertFaq(payload) / getFaqList(filters) / deleteFaq(id)
- **설명**: FAQ(자주 묻는 질문) 관리 및 조회

### upsertNotice(payload) / getNoticeList(filters) / deleteNotice(id)
- **설명**: 공지사항 관리 및 조회

---

## 18. 클레임 관리 (Claims & Incident Fees)
오더 진행 중 발생하는 파손, 분실, 지연 등에 대한 클레임 및 사고 비용을 관리합니다.
- **Path**: `src/app/actions/claims.ts`

### getClaims(filters)
- **설명**: 필터 조건(상태, 오더번호, 기간)에 따른 클레임 목록 조회
- **Input**: `{ status?, orderNo?, startDate?, endDate? }`
- **Output**: `Promise<Claim[]>`

### createClaim(payload)
- **설명**: 신규 클레임 등록 및 오더 상태를 'CLAIMED'로 자동 변경
- **Input**: `{ orderId, reasonCode, description }`
- **Business Logic**: 성공 시 `zen_orders.status`를 'CLAIMED'로 업데이트

### updateClaimStatus(claimId, status)
- **설명**: [Admin] 클레임 진행 상태(OPEN, INVESTIGATING, RESOLVED, CLOSED) 변경
- **Input**: `claimId`, `status`

### processIncidentFee(payload)
- **설명**: [Admin] 확정된 클레임 금액을 사고비(Incident Fee)로 등록하고 연계 인보이스에 반영
- **Input**: `{ claimId, feeAmount, currency, invoiceId?, description }`
- **Business Logic**: `zen_incident_fees` 등록 및 인보이스 `total_amount` 차감 반영

---

## 19. 다국어 문서 엔진 (Document Engine)
무역 필수 서류(CI, PL)를 다국어로 생성하고 관리합니다.
- **Path**: `src/app/actions/finance.ts` (또는 `documents.ts`)

### getOrderDocumentData(orderId)
- **설명**: 특정 오더의 CI/PL 생성을 위한 통합 데이터(오더, 패킹, 아이템, 화주정보) 조회
- **Input**: `orderId (uuid)`
- **Output**: `Promise<DocumentData>`

### CommercialInvoicePDF
- **설명**: `@react-pdf/renderer`를 사용하여 상업송장 PDF 템플릿 제공
- **Features**: Invoice No, Date, Shipper/Consignee, Goods Description, Qty, Amount 등

### PackingListPDF
- **설명**: `@react-pdf/renderer`를 사용하여 패킹리스트 PDF 템플릿 제공
- **Features**: PL No, Date, Mark & No, Description, G.W/N.W, CBM 등

---

## 21. 모니터링 및 로깅 (Monitoring & Logging)
시스템의 안정성을 위한 에러 로깅 및 모니터링 정보를 관리합니다.
- **Path**: `src/app/actions/monitoring.ts`

### logClientError(payload)
- **설명**: 클라이언트 사이드에서 발생한 에러를 DB(`zen_error_logs`)에 기록하고, 중대 에러 시 관리자 알림을 발송합니다.
- **Input**: `{ message: string, stack?: string, url?: string, severity?: 'WARNING'|'ERROR'|'CRITICAL' }`
- **Business Logic**: 
  - `zen_error_logs` 테이블에 INSERT (error_type: 'CLIENT')
  - `severity === 'CRITICAL'`인 경우 `zen_notifications` 테이블에 ADMIN 대상 인앱 알림 자동 생성

### getErrorLogs(filters)
- **설명**: [Admin] 필터 조건에 따른 에러 로그 목록을 조회합니다. (최신순, Pagination 지원)
- **Input**: `{ severity?, resolved?, page?, pageSize? }`
- **Output**: `Promise<{ items: ErrorLog[], totalCount: number }>`

### resolveErrorLog(logId)
- **설명**: [Admin] 에러 로그의 해결 상태(`resolved`)를 `true`로 변경합니다.
- **Input**: `logId (uuid)`

---

## 11. UPS 특송 요금 관리 (Phase 7.1 — IMP-145)

> **설계 문서**: An-14_Phase7_UPS요금관리_설계보완.md
> **마지막 갱신**: 2026-07-05 (TASK-171~176)
> **Team B 인계 범위**: GH #181 (오더 등록 연동 + 정산)
>
> **핵심 계약**: `zen_agency_rate_overrides.cost_price`는 DB 트리거(`trg_agency_rate_override_calc_cost`)가 `base_rate.selling_price × (1 - policy.discount_rate)`로 **서버에서 자동 계산**한다. 클라이언트가 `cost_price` 값을 보내도 **무시**된다. Agency는 `selling_price`(마진 포함)만 입력할 수 있다.

### 11.1 요금 계산 API

#### estimateUpsFreight(input) — Server Action
- **Path**: `src/app/actions/ups/freight.ts`
- **설명**: UPS 운송 요금을 3단계(Platform/Agency/Shipper)로 계산하여 반환. 오더 등록 화면에서 실시간 견적 표시용.
- **Input** (`EstimateUpsFreightInput`):
  - `productId: string` — UPS 제품 ID
  - `destCountryCode: string` — 목적지 국가코드 (ISO alpha-3)
  - `actualWeightKg: number` — 실중량
  - `dimL/dimW/dimH?: number` — 가로/세로/높이(cm)
  - `incoterms?: 'DDU' | 'DDP'`
  - `volumetricDivisor?: 5000 | 5500 | 6000`
  - `otherChargeIds?: string[]` — 적용할 부가요금 ID 목록
  - `agencyOrgId?: string | null` — 대리점 org_id (null이면 Agency/Shipper 단계 생략)
  - `shipperOrgId?: string | null` — 화주 org_id (null이면 Shipper 단계 생략)
  - `referenceDate?: string` — 기준일자 (YYYY-MM-DD, 미전달 시 오늘)
- **Output** (`UpsFreightEstimate`):
  - `platform: UpsFreightResult` — Platform 단계 (기준요금 + 유류할증 + OC)
  - `agency: UpsAgencyFreightResult | null` — Agency 단계 (할인율 적용 + 마진)
  - `shipper: UpsShipperFreightResult | null` — Shipper 단계 (화주 할인율 적용)

**동작 분기**:
- `agencyOrgId` 미전달 → Platform 단계만 계산, agency/shipper는 null
- `agencyOrgId` 전달 + `shipperOrgId` 미전달 → Platform + Agency 단계 계산
- `agencyOrgId` + `shipperOrgId` 전달 → 3단계 전부 계산

### 11.2 Admin 요율 CRUD Actions

- **Path**: `src/app/actions/ups/rates-mutation.ts`
- **인증**: ADMIN / MANAGER / ZENITH_SUPER_ADMIN만 접근 가능 (`requireAdminOrManager()`)

| Action | 설명 |
|:-------|:-----|
| `createUpsZone(data)` | Zone 신규 등록 |
| `updateUpsZone(id, data)` | Zone 정보 수정 |
| `deleteUpsZone(id)` | Zone 비활성화 |
| `addZoneCountry(zoneId, countryCode)` | Zone에 국가 매핑 추가 |
| `removeZoneCountry(id)` | Zone 국가 매핑 제거 |
| `createUpsProduct(data)` | 제품 신규 등록 |
| `updateUpsProduct(id, data)` | 제품 정보 수정 |
| `upsertUpsBaseRate(data)` | 기준요금 등록/수정 (unique: product_id+zone_id+weight_kg+valid_from) |
| `upsertUpsFuelSurcharge(data)` | 유류할증료 등록/수정 (unique: product_id+effective_week) |
| `createUpsOtherCharge(data)` | 부가요금 코드 신규 등록 |
| `updateUpsOtherCharge(id, data)` | 부가요금 정보 수정 |
| `deleteUpsOtherCharge(id)` | 부가요금 비활성화 |
| `upsertAgencyPricingPolicy(data)` | 대리점 할인율 정책 등록/수정 (unique: agency_org_id) |
| `getAgencyPricingPolicy(agencyOrgId)` | 대리점 할인율 정책 조회 |

### 11.3 Agency 요율 Actions

- **Path**: `src/app/actions/agency/rate-overrides.ts`
- `getAgencyRateOverrides(agencyOrgId)` — Agency 요율 오버라이드 목록
- `upsertAgencyRateOverride(agencyOrgId, data)` — 오버라이드 등록/수정. **`cost_price`는 서버 트리거가 자동 계산 → 클라이언트 전송값 무시**
- `deactivateAgencyRateOverride(id)` — 오버라이드 비활성화

- **Path**: `src/app/actions/agency/other-charges.ts` (신규)
- `getAgencyOtherCharges(agencyOrgId)` — Agency별 부가요금 목록
- `upsertAgencyOtherCharge(agencyOrgId, data)` — 부가요금 등록/수정
- `deactivateAgencyOtherCharge(id)` — 부가요금 비활성화

### 11.4 DB 함수 (Security Definer)

#### `fn_get_ups_agency_selling_price(agency_org_id, base_rate_id)`
- **설명**: 화주 세션이 Agency의 `cost_price`나 `discount_rate`를 보지 않고 `selling_price`만 조회. `SECURITY DEFINER`로 실행되어 RLS 우회.
- **호출 권한**: `service_role`, ADMIN/MANAGER, 해당 Agency 본인, 또는 해당 Agency 소속 화주

#### `fn_get_ups_agency_other_charge_price(agency_org_id, other_charge_id)`
- **설명**: Agency 부가요금 판매가 조회 (동일 보안 모델)

### 11.5 Team B 인계 계약 (GH #181)

Team A가 제공하는 API 계약 — Team B가 오더 등록 화면 연동 시 그대로 소비:

| 항목 | Team A 제공 | Team B 소비 |
|:-----|:-----------|:-----------|
| 요금 계산 API | `estimateUpsFreight()` Action 노출 | 오더 등록 화면에서 호출하여 실시간 견적 표시 |
| 오더-Agency 연결 | — | `zen_orders.agency_org_id` 저장 (`zen_agency_shippers` 조회) |
| 요율 스냅샷 저장 | — | 오더 확정 시 `zen_order_rate_snapshots` 기록 |
| 정산 분리 | — | 화주→Agency, Agency→플랫폼 청구 구분 |
| RBAC AGENCY 격리 | 기존 RLS 활용 | AGENCY 화주 역할이 본인 소속 요율만 노출되도록 적용 |

---

## ⚠️ 확인된 사항 (Findings & Gaps)
... (생략)

### 1. 인벤토리(Inventory) 모듈 상태
- **현재 구현**: 백엔드(DB Schema, Server Actions) 구현 완료 및 오더 시스템 연동 완료.
- **UI 상태**: `/inventory` 관리 화면 개발 진행 중 (Phase 2.2 확장).
- **작동 방식**: SKU 기반으로 `on_hand_qty`, `reserved_qty`, `available_qty` 관리.

### 2. RPC 파라미터 불일치 수정
- `approve_organization` 함수가 문서상에는 3개의 인자를 받는 것으로 되어 있었으나, 실제 DB에는 `target_org_id` 하나만 받는 것으로 확인되어 사양을 수정하였습니다.

### 3. 소스코드 누락 항목
- `master.ts` 내의 공통 코드 관리(`CommonCode`) API 4종이 문서에 누락되어 추가되었습니다.
- `orders.ts` 내의 마스터 오더 상태 업데이트 및 상세 조회 API가 추가되었습니다.
