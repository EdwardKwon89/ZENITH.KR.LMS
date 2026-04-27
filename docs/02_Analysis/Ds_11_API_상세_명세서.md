# 📡 ZENITH_LMS API Specification (v2.1 Sync)

> **프로젝트:** ZENITH_LMS (지능형 통합 물류 플랫폼)
> **최종 동기화:** 2026-04-22
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

## ⚠️ 확인된 사항 (Findings & Gaps)

### 1. 인벤토리(Inventory) 모듈 상태
- **현재 구현**: 백엔드(DB Schema, Server Actions) 구현 완료 및 오더 시스템 연동 완료.
- **UI 상태**: `/inventory` 관리 화면 개발 진행 중 (Phase 2.2 확장).
- **작동 방식**: SKU 기반으로 `on_hand_qty`, `reserved_qty`, `available_qty` 관리.

### 2. RPC 파라미터 불일치 수정
- `approve_organization` 함수가 문서상에는 3개의 인자를 받는 것으로 되어 있었으나, 실제 DB에는 `target_org_id` 하나만 받는 것으로 확인되어 사양을 수정하였습니다.

### 3. 소스코드 누락 항목
- `master.ts` 내의 공통 코드 관리(`CommonCode`) API 4종이 문서에 누락되어 추가되었습니다.
- `orders.ts` 내의 마스터 오더 상태 업데이트 및 상세 조회 API가 추가되었습니다.
