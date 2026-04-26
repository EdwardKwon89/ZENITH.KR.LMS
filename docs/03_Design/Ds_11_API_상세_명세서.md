# 전사적 API 상세 명세서 (API Detailed Specification)

> **[DEPRECATED]** 본 파일은 2026-04-24부로 INDEX + DETAIL 분리 구조로 이관되었습니다.
>
> **신규 문서 사용 바랍니다:**
> - [Ds_11_INDEX.md](Ds_11_INDEX.md) — API 전체 카탈로그
> - [Ds_11_DETAIL_AUTH.md](Ds_11_DETAIL_AUTH.md) — 공통 응답 + 인증/사용자
> - [Ds_11_DETAIL_ORDER.md](Ds_11_DETAIL_ORDER.md) — 오더 관리 + 마스터 오더
> - [Ds_11_DETAIL_FINANCE.md](Ds_11_DETAIL_FINANCE.md) — 정산/재무 + 세금계산서
> - [Ds_11_DETAIL_LOGISTICS.md](Ds_11_DETAIL_LOGISTICS.md) — 물류 로직 + 마스터 데이터 + 시스템
> - [Ds_11_DETAIL_INVENTORY.md](Ds_11_DETAIL_INVENTORY.md) — 재고 관리
> - [Ds_11_DETAIL_TRACKING.md](Ds_11_DETAIL_TRACKING.md) — 통합 트래킹
> - [Ds_11_DETAIL_NOTIFICATION.md](Ds_11_DETAIL_NOTIFICATION.md) — 알림 관리

---

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** Ds-11
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-28
> **버전:** v1.12 (최종 — 이하 내용은 참조용으로만 유지)

본 문서는 `Ds_10 API 인벤토리`에 등록된 모든 인터페이스의 구체적인 명세를 기술합니다. 모든 파라미터는 `camelCase`를 기본으로 하며, DB 필드와 직접 매핑되는 경우 `snake_case`를 사용합니다.

---

## 1. 공통 응답 및 에러 코드 (Standard Response)

### 1.1 기본 응답 구조 (Server Action Result)
| 필드명 | 타입 | 설명 |
|:---|:---:|:---:|
| `success` | Boolean | 요청 성공 여부 |
| `data` | Object/Array | 반환 데이터 본체 (성공 시) |
| `error` | String | 에러 메시지 (실패 시) |

### 1.2 공통 에러 코드
| 코드 | 메시지 | 설명 |
|:---|:---|:---|
| `ERR_AUTH_001` | Unauthorized | 인증되지 않은 사용자 접근 |
| `ERR_PERM_001` | Forbidden | 해당 작업에 대한 권한 부족 |
| `ERR_VAL_001` | Validation Failed | 입력 데이터 검증 실패 (Zod Schema 위반) |
| `ERR_SYS_001` | Internal Server Error | 서버 내부 로직 오류 |

---

## 2. 인증 및 사용자 (Auth & User)

### 2.1 login (Action)
- **설명**: 사용자 이메일/비밀번호 기반 로그인
- **권한**: Public
- **파라미터 (FormData)**:
  - `email`: (string) 사용자 이메일
  - `password`: (string) 비밀번호
  - `locale`: (string, optional) 선호 언어 (ko, en, zh, ja)
- **응답**: `Promise<void>` (성공 시 대시보드 리다이렉트)

### 2.2 signup (Action)
- **설명**: 회원가입 및 신규 조직 생성 또는 기존 조직 가입 신청
- **권한**: Public
- **파라미터 (FormData)**:
  - `email`: (string) 이메일
  - `password`: (string) 비밀번호
  - `full_name`: (string) 사용자 성명
  - `org_id`: (uuid, optional) 기존 조직 ID (가입 신청 시)
  - `is_new_org`: (boolean) 신규 조직 생성 여부
  - `org_name`: (string, optional) 신규 조직명
  - `business_number`: (string, optional) 사업자 등록 번호
  - `org_type`: (string) 조직 유형 (SHIPPER, CARRIER, PARTNER, INDIVIDUAL)
  - `doc_file`: (File, optional) 사업자 등록증 등 증빙 서류
- **응답**: `{ success: true }` 또는 `{ error: string }`

### 2.3 getCurrentUserAffiliation (Action)
- **설명**: 현재 로그인한 사용자의 소속 조직 및 권한 정보 조회
- **권한**: User
- **응답**: 
  ```json
  {
    "userId": "uuid",
    "userName": "string",
    "userEmail": "string",
    "role": "ADMIN|MEMBER|USER",
    "orgId": "uuid",
    "orgName": "string",
    "orgAddress": "string",
    "orgBizNo": "string",
    "isIndividual": "boolean",
    "dummyIndividualId": "string (SYSTEM_INDIVIDUAL_SHIPPER_ID)"
  }
  ```

### 2.4 approveOrganization / rejectOrganization (Action)
- **설명**: 대기 중인 조직 가입 신청 승인 또는 거절
- **권한**: Admin
- **파라미터**:
  - `orgId`: (uuid) 대상 조직 ID
  - `reason`: (string, reject 전용) 거절 사유
- **응답**: `{ success: boolean }`

### 2.5 requestOrganizationSupplement (Action)
- **설명**: [Ds-11 2.5] 조직 가입 신청 시 서류 보완 요청
- **권한**: Admin
- **파라미터**:
  - `orgId`: (uuid) 대상 조직 ID
  - `reason`: (string) 보완 요청 상세 사유
- **응답**: `{ success: boolean }`

---

## 3. 오더 관리 (Order Management)

### 3.1 createOrder (Action)
- **설명**: 하우스 오더 및 하부 패키지, 아이템 정보를 원자적으로 생성
- **권한**: User
- **입력 (Payload)**: `OrderRegistrationInput` (Zod 기반)
- **응답**: `OrderObject` (id, order_no, status 포함)

### 3.2 getOrders (Action)
- **설명**: 필터 및 검색 조건에 따른 오더 목록 조회 (Pagination 지원)
- **권한**: User
- **파라미터**:
  - `page`: (number, default: 1)
  - `pageSize`: (number, optional)
  - `status`: (string, optional)
  - `search`: (string, optional) 오더 번호 또는 수취인명 검색
  - `order_type`: (string, optional)
  - `transport_mode`: (string, optional)
- **응답**: `{ orders: Array<Order>, totalCount: number, page: number, pageSize: number }`

### 3.3 updateOrderStatus (Action)
- **설명**: 오더의 상태 전이 수행 및 히스토리 기록, 관련 자동 로직(정산/트래킹) 트리거
- **권한**: User (상태 전이 매트릭스 준수)
- **파라미터**:
  - `orderId`: (uuid)
  - `nextStatus`: (OrderStatus)
  - `reason`: (string, optional)
- **응답**: `{ success: true }`

### 3.4 getOrderDetails (Action)
- **설명**: 오더 단건의 상세 정보 및 계층형 데이터(Packages, Items)를 모두 조회
- **권한**: User
- **파라미터**: `orderId` (uuid)
- **응답**: `OrderDetailsObject` (Packages/Items 배열 포함)

### 3.5 get_next_order_sequence (RPC, Required)
- **설명**: 연도별/프리픽스별 하우스 오더 일련번호 생성
- **권한**: System
- **파라미터**:
  - `p_year`: (text) 연도 (예: '2026')
  - `p_prefix`: (text) 프리픽스 (예: 'ZEN')
- **응답**: `string` (예: 'ZEN-2026-000001')

### 3.6 get_orders_aggregation (RPC)
- **설명**: 지정된 하우스 오더들의 총 중량 및 CBM 합산
- **권한**: System
- **파라미터**:
  - `order_ids`: (uuid[])
  - `p_order_id`: (uuid)
  - `p_old_items`: (jsonb) 이전 아이템 목록 (수정 시)
  - `p_new_items`: (jsonb) 새로운 아이템 목록 (수정 시)
- **응답**: `Table(total_weight: numeric, total_volume: numeric)`

### 3.7 updateOrder (Action)
- **설명**: 기존 오더 정보 및 패키지/아이템 정보를 수정함. 변경된 아이템 수량에 따라 재고를 재조정함.
- **권한**: User
- **파라미터**:
  - `orderId`: (uuid)
  - `payload`: `OrderRegistrationInput`
- **응답**: `{ success: true }`

---

## 4. 마스터 오더 (Master Order)

### 4.1 createMasterOrder (Action)
- **설명**: 선택된 하우스 오더들을 묶어 마스터 오더를 생성하고 상태를 MASTERED로 변경
- **권한**: User
- **파라미터**:
  - `houseOrderIds`: (uuid[])
  - `carrier_id`: (uuid, optional)
  - `vessel_flight_no`: (string, optional)
  - `origin_port_id`: (uuid, optional)
  - `dest_port_id`: (uuid, optional)
  - `remarks`: (string, optional)
- **응답**: `MasterOrderObject`

### 4.2 updateMasterOrderStatus (Action)
- **설명**: 마스터 오더의 상태 업데이트. CANCELED 시 하위 오더 자동 해체.
- **권한**: User
- **응답**: `{ success: true }`

### 4.3 dissolveMasterOrder (Action)
- **설명**: 마스터 오더를 해체하고 소속 하우스 오더들을 복구함
- **권한**: User
- **응답**: `{ success: true }`

### 4.4 getMasterOrders (Action)
- **설명**: 생성된 모든 마스터 오더 목록 조회
- **권한**: User
- **응답**: `Array<MasterOrder>`

### 4.5 getPendingHouseOrders (Action)
- **설명**: 마스터에 결합 가능한(PACKED 상태) 하우스 오더 목록 조회
- **권한**: User
- **응답**: `Array<Order>`

### 4.6 generate_master_order_no (RPC)
- **설명**: 마스터 오더 번호 생성 (M-YYMMDD-NNNN 형식)
- **권한**: System
- **응답**: `string`

### 4.7 getMasterOrderWithHouses (Action)
- **설명**: 특정 마스터 오더의 상세 정보와 바인딩된 하우스 오더 목록 조회
- **권한**: User
- **파라미터**: `masterId` (uuid)
- **응답**: `MasterOrderDetailsObject` (houses 배열 포함)

---

## 5. 정산 및 재무 (Finance)

### 5.1 generateInvoicesForOrder (Action)
- **설명**: 오더 완료(RELEASED) 시점에 해당 오더의 모든 비용을 계산하여 인보이스 생성
- **권한**: User
- **응답**: `{ success: true, invoice_no: string }`

### 5.2 updatePaymentStatus (Action)
- **설명**: 인보이스의 결제 상태를 업데이트함 (PAID, CANCELED)
- **권한**: Admin
- **응답**: `{ success: true }`

### 5.3 getSettlementOverview (Action)
- **설명**: 정산 대시보드용 인보이스 목록 조회
- **권한**: User
- **응답**: `Array<Invoice>`

### 5.4 calculate_order_costs (RPC)
- **설명**: 오더의 중량, 부피 및 요율 카드를 기반으로 비용 계산 및 `zen_order_costs` 기록
- **권한**: System
- **파라미터**: `p_order_id` (uuid)
- **응답**: `{ success: boolean, total_freight: numeric, currency: string, message: string }`

### 5.5 issueInvoicePdf (Action)
- **설명**: [WBS 3.2.2.3] 특정 인보이스의 PDF 파일을 생성하고 Supabase Storage에 업로드 후 이력을 기록함.
- **권한**: Admin/Partner
- **파라미터**:
  - `invoiceId`: (uuid) 대상 인보이스 ID
- **응답**: `{ success: true, pdfUrl: string, historyId: uuid }`

### 5.6 getInvoicePdfHistory (Action)
- **설명**: [WBS 3.2.2.3] 특정 인보이스에 대해 발행된 PDF 이력(버전, 생성일, 생성자, 파일 경로) 조회
- **권한**: User (소속 조직 인보이스만 조회 가능)
- **파라미터**: `invoiceId` (uuid)
- **응답**: `Array<{ id: uuid, filePath: string, version: number, createdAt: string, createdBy: string }>`

### 5.7 exportSettlementData (Route Handler)
- **설명**: [WBS 3.2.4] 정산 데이터를 조건별로 필터링하여 Excel(XLSX) 형식으로 내보냄. 대용량 처리를 위해 Route Handler(`/api/finance/export`)로 구현함.
- **권한**: Admin/Partner/User (소속 조직 데이터만 접근 가능)
- **파라미터 (Query Params)**:
  - `status`: (string, optional) PAID, UNPAID, CANCELED
  - `dateFrom`: (string, optional, YYYY-MM-DD) 시작일
  - `dateTo`: (string, optional, YYYY-MM-DD) 종료일
  - `shipperId`: (uuid, optional) 특정 화주 필터링 (Admin 전용)
- **응답**: Binary File (Blob)
  - `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition`: `attachment; filename=settlement_export_YYYYMMDD.xlsx`

---

## 6. 물류 트래킹 및 로직 (Logistics Logic)

### 6.1 getTrackingEvents (Action)
- **설명**: 특정 오더에 대한 모든 트래킹 이벤트 조회
- **권한**: User
- **응답**: `Array<TrackingEvent>`

### 6.2 addTrackingEvent (Action)
- **설명**: 관리자가 트래킹 이벤트를 수동으로 추가함
- **권한**: Admin
- **응답**: `{ success: true }`

### 6.3 fn_trigger_capture_order_rate (RPC)
- **설명**: 특정 상태(예: PACKED) 도달 시 적용 요율을 스냅샷으로 저장
- **권한**: System
- **파라미터**: `p_order_id` (uuid)
- **응답**: `void`

### 6.4 updateTrackingConfig (Action)
- **설명**: 오더의 트래킹 공급자 설정(Provider Type/Name) 변경
- **권한**: Admin
- **파라미터**:
  - `orderId`: (uuid)
  - `providerType`: (string) 'VIRTUAL' | 'KOREA_POST' | 'FEDEX' 등
  - `providerName`: (string)
- **응답**: `{ success: boolean }`

### 6.5 fn_get_best_matching_rate (RPC)
- **설명**: 화주/구간/중량 기준 최적 요율 검색
- **권한**: System/User
- **응답**: `MatchingRateRecord`

### 6.6 syncExternalTracking (Cron/Action) [Phase 3.1]
- **설명**: 주기적 폴링 워커를 통해 외부(또는 Mock) 운송사 API를 호출하여 트래킹 상태 동기화
- **권한**: System/Admin
- **동작**: `zen_tracking_configs`의 활성 목록 순회 -> 어댑터 호출 -> `zen_tracking_raw_logs` 저장 -> `zen_tracking_events` 업데이트
- **응답**: `{ success: boolean, processed: number, errors: number }`

### 6.7 getTrackingRawLogs (Action) [Phase 3.1]
- **설명**: [An_02 3.2.1 대응] 문제 발생 시 디버깅 및 감사(Audit) 목적으로 외부 API 원본(Raw JSON) 응답 내역 조회
- **권한**: Admin
- **파라미터**: `trackingConfigId` (uuid)
- **응답**: `Array<TrackingRawLog>`

---

## 7. 마스터 데이터 (Master Data)

### 7.1 upsertPort (Action) / getPorts (Action)
- **설명**: 항구(Port/Airport) 정보 관리 및 조회
- **권한**: Admin(Upsert), User(Get)
- **응답**: `PortObject` 또는 `Array<Port>`

### 7.2 getNations (Action)
- **설명**: 시스템에 등록된 모든 국가 및 ISO 코드 조회
- **권한**: User
- **응답**: `Array<{ id, name, code }>`

### 7.3 getOrganizations (Action) / getAirlines (Action)
- **설명**: 활성화된 조직(화주/파트너) 목록 조회. Airlines는 IATA 코드가 있는 CARRIER만 필터링.
- **권한**: User
- **응답**: `Array<Organization>`

### 7.4 upsertCommonCode (Action) / getCommonCodes (Action)
- **설명**: 시스템 공통 코드(코드 그룹 포함) 관리 및 조회
- **권한**: Admin(Upsert), User(Get)
- **응답**: `CommonCodeObject` 또는 `Array<CommonCode>`

### 7.5 getCommonCodesByGroup (Action)
- **설명**: 특정 그룹(예: 'TRANSPORT_MODE', 'PACKING_UNIT')에 속한 활성 코드만 조회
- **권한**: User
- **파라미터**: `groupCode` (string)
- **응답**: `Array<CommonCode>`

### 7.6 deleteCommonCode (Action)
- **설명**: 공통 코드 삭제 (가급적 비활성화 권장하나 물리 삭제 지원)
- **권한**: Admin
- **파라미터**: `id` (uuid)
- **응답**: `{ success: true }`

---

## 8. 시스템 및 인프라 (System & Infra)

### 8.1 rls_auto_enable (RPC)
- **설명**: 신규 테이블 생성 시 RLS 정책을 자동 활성화
- **권한**: Superuser/System

### 8.2 update_timestamp_column (RPC)
- **설명**: `updated_at` 컬럼 자동 갱신 트리거용 함수
- **권한**: System

---

## 10. 인벤토리 관리 (Inventory Management)

### 10.1 getInventoryList (Action)
- **설명**: 조직별 SKU 기반 재고 현황 목록 조회
- **권한**: User
- **파라미터**:
  - `page`: (number, default: 1)
  - `pageSize`: (number)
  - `search`: (string, optional) SKU 코드 또는 품목명 검색
  - `lowStockOnly`: (boolean, optional) 안전 재고 미달 품목만 필터링
- **응답**: `{ items: Array<Inventory>, totalCount: number }`

### 10.2 getInventoryHistory (Action)
- **설명**: 특정 재고 품목의 상세 변동 이력(원장) 조회
- **권한**: User
- **파라미터**: `inventoryId` (uuid)
- **응답**: `Array<InventoryHistory>`

### 10.3 adjustInventory (Action)
- **설명**: 관리자에 의한 수동 재고 조정 및 사유 기록
- **권한**: Admin
- **파라미터**:
  - `inventoryId`: (uuid)
  - `adjustmentQty`: (number) 증감분 (+/-)
  - `reason`: (string) 조정 사유
- **응답**: `{ success: true, finalQty: number }`

### 10.4 syncInventoryFromOrder (Internal Action/Logic)
- **설명**: 오더 상태 변경 트리거에 의한 재고 자동 처리
- **프로세스**:
  - `REGISTERED`: `reserved_qty` 증가
  - `RELEASED`: `on_hand_qty` 차감 및 `reserved_qty` 차감
  - `CANCELLED`: `reserved_qty` 차감
  - `UPDATED`: 수정 전후 차이만큼 `reserved_qty` 가감 (반영 완료)
- **응답**: `void`
- **응답**: `void`

---

## 11. 통합 트래킹 (Tracking & Visibility)

### 11.1 getGlobalTrackingOverview (Action)
- **설명**: 마스터 오더 및 하우스 오더 전체에 대한 실시간 트래킹 요약 데이터 조회
- **권한**: User (조직 권한 기반)
- **파라미터**:
  - `orgId`: (uuid) 조회 대상 조직 ID
- **응답**:
  ```typescript
  {
    totalActive: number;      // 현재 운송 중인 오더 총 수
    byStatus: {               // 상태별 집계
      booked: number;
      picked_up: number;
      in_transit: number;
      arrived: number;
      delivered: number;
    };
    recentEvents: Array<{      // 최근 발생한 주요 트래킹 이벤트
      orderId: string;
      orderNo: string;
      status: string;
      location: string;
      timestamp: string;
    }>;
  }
  ```

### 11.2 syncExternalTracking (Action)
- **설명**: 외부 운송사(Carrier) API를 호출하여 최신 트래킹 정보를 동기화하고 로컬 DB 및 Raw Log에 저장
- **권한**: User/System (폴링 연동)
- **파라미터**:
  - `trackingNo`: (string) 송장 번호
  - `carrierCode`: (string) 운송사 코드 (e.g., 'UPS', 'DHL', 'HMM')
- **프로세스**:
  1. `TrackingAdapter`를 통한 외부 API 호출
  2. 응답 원본을 `zen_tracking_raw_logs` 테이블에 저장 (Business QA 대응)
  3. `orders` 및 `order_tracking_events` 테이블 업데이트
- **응답**: `{ success: true, currentStatus: string, lastLocation: string }`

### 11.3 getTrackingRawLogs (Action)
- **설명**: 특정 오더의 외부 API 응답 원본(Raw Data) 이력 조회 (디버깅 및 정합성 검증용)
- **권한**: Admin
- **파라미터**: `orderId` (uuid)
- **응답**: `Array<{ id: uuid, raw_payload: JSON, created_at: string }>`

---

---

## 12. 알림 관리 (Notification Management) [WBS 3.1.2.2]

### 12.0 DB 스키마

```sql
CREATE TABLE zen_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES zen_orders(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,        -- 'STATUS_CHANGE' | 'HELD' | 'DELIVERED'
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  channel     TEXT NOT NULL,        -- 'EMAIL' | 'IN_APP'
  is_read     BOOLEAN DEFAULT false,
  sent_at     TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- RLS: 본인 알림만 조회 가능
```

**알림 트리거 대상 상태 전환:**

| OrderStatus | 수신자 | 채널 |
|:---|:---|:---|
| WAREHOUSED | 송하인(shipper) | EMAIL + IN_APP |
| RELEASED | 송하인 | EMAIL + IN_APP |
| IN_TRANSIT | 수하인(recipient_email) | EMAIL + IN_APP |
| DELIVERED | 송하인 + 수하인 | EMAIL + IN_APP |
| HELD | 송하인 + Admin | EMAIL + IN_APP |

### 12.1 triggerStatusChangeNotification (Internal Action)
- **설명**: `updateOrderStatus` 완료 시 내부 호출 — 알림 생성 및 Resend 이메일 발송
- **권한**: System (외부 직접 호출 불가)
- **파라미터**:
  - `orderId`: (uuid)
  - `newStatus`: (OrderStatus)
  - `previousStatus`: (OrderStatus)
- **프로세스**:
  1. 트리거 대상 상태 여부 확인
  2. `zen_orders`에서 shipper/recipient 정보 조회
  3. `zen_notifications` 테이블에 IN_APP 알림 삽입
  4. Resend API로 이메일 발송 (실패 시 로그만, 상태 변경 롤백 없음)
- **응답**: `void`

### 12.2 getNotifications (Action)
- **설명**: 로그인 사용자의 알림 목록 조회 (미읽음 우선 정렬)
- **권한**: User
- **파라미터**:
  - `limit?`: number (default 20)
  - `offset?`: number (default 0)
- **응답**: `{ notifications: NotificationItem[], unreadCount: number }`

### 12.3 markNotificationRead (Action)
- **설명**: 특정 알림 읽음 처리
- **권한**: User (본인 알림만)
- **파라미터**: `notificationId` (uuid)
- **응답**: `{ success: boolean }`

### 12.4 markAllNotificationsRead (Action)
- **설명**: 전체 미읽음 알림 일괄 읽음 처리
- **권한**: User
- **파라미터**: 없음
- **응답**: `{ success: boolean, updatedCount: number }`

### 5.8 issueTaxInvoice (Action)
- **설명**: [WBS 3.2.5.1] 특정 인보이스를 기반으로 표준 세금계산서 데이터를 생성함.
- **권한**: Admin/Partner
- **파라미터**:
  - `invoiceId`: (uuid) 대상 인보이스 ID
- **응답**: `{ success: true, taxInvoiceId: uuid }`

### 5.9 sendTaxInvoiceEmail (Action)
- **설명**: [WBS 3.2.5.2] 생성된 세금계산서를 고객 이메일로 발송함. Resend를 사용하며 발송 성공 여부를 추적함.
- **권한**: Admin/Partner
- **파라미터**:
  - `taxInvoiceId`: (uuid) 세금계산서 ID
  - `recipientEmail`: (string) 수신자 이메일
- **응답**: `{ success: true, messageId: string }`

### 5.10 getTaxInvoiceHistory (Action)
- **설명**: 특정 인보이스와 연결된 세금계산서 발행 및 발송 이력을 조회함.
- **권한**: User (소속 조직 데이터만 가능)
- **파라미터**: `invoiceId` (uuid)
- **응답**: `Array<TaxInvoiceRecord>`

---

## 6. 물류 트래킹 및 로직 (Logistics Logic)

> [!NOTE]
> v1.10 업데이트 사항: Finance(인보이스 PDF 발행, 엑셀 내보내기) API 명세 추가 및 통합 트래킹(Section 11) 구조 정비 완료.
> v1.11 업데이트 사항: Section 12 알림 관리(Notification) API 명세 추가 — WBS 3.1.2.2 대응.
> v1.12 업데이트 사항: FIN-02 엑셀 Export 응답 상세화 및 버전 최신화.
> v1.13 업데이트 사항: FIN-03 세금계산서(Tax Invoice) 발행 및 메일 발송 API 명세 추가.
