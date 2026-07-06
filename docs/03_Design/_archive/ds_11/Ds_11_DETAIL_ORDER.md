# Ds-11 API 상세 명세 — ORDER (오더 관리 + 마스터 오더)

> **프로젝트:** ZENITH_LMS | **버전:** v1.13 | **최종 수정:** 2026-04-24
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

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

### 3.5 get_next_order_sequence (RPC)

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
