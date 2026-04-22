# 전사적 API 상세 명세서 (API Detailed Specification)

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** Ds-11
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-22
> **버전:** v1.8

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

> [!NOTE]
> v1.8 업데이트 사항: 마스터 데이터(국가, 조직, 항공사, 코드 삭제) API 구현 및 인벤토리 수정(UPDATED) 로직 동기화 완료.
> 상세한 TypeScript 타입 정의는 `src/types/` 및 `src/lib/validation/`을 참조하십시오.
