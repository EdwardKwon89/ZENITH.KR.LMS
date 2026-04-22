# 전사적 API 인벤토리 (API Inventory)

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** Ds-10
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-22
> **버전:** v1.3

본 문서는 ZENITH LMS 플랫폼 내의 모든 시스템 간 호출(Server Actions) 및 데이터베이스 인터페이스(Supabase RPC)를 정의한 전사적 자산입니다. 모든 기능 개발 및 시스템 통합 시 본 인벤토리를 '진실의 근거(Source of Truth)'로 삼습니다.

---

## 1. 기본 프로토콜 및 가공 규칙 (Standard)

본 프로젝트는 Next.js App Router의 **Server Actions**를 주 API 인터페이스로 사용하며, 복잡한 비즈니스 로직은 **Supabase RPC(PostgreSQL Functions)**를 통해 처리합니다.

- **인증 및 보안**: `lib/auth/guards.ts`의 RBAC 정책을 준수합니다.
  - **User**: 로그인된 모든 사용자
  - **Admin**: 시스템 관리자 권한
  - **Public**: 비인증 접근 허용 (로그인 등)
- **상세 명세**: 각 API의 구체적인 필드 및 입출력 정의는 [Ds_11 API 상세 명세서](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/03_Design/Ds_11_API_상세_명세서.md)를 참조하십시오.
- **응답 형식**: 성공 시 객체 또는 리스트 반환, 에러 시 `Error` 객체 Throw.
- **Source of Truth**: 코드와 문서가 상이할 경우 **실제 코드의 시그니처**를 최우선으로 하며, 본 문서를 즉시 동기화합니다.

---

## 2. 인증 및 권한 (Auth & User Management)

| 구분 | 명칭 (Action/RPC) | 설명 | 권한 | 파라미터 |
|:---:|:---|:---|:---:|:---|
| Action | `login` | 사용자 인증 및 세션 생성 | Public | `formData (email, password, locale)` |
| Action | `signup` | 회원가입 및 조직 생성/참가 | Public | `formData (email, password, name, org_id, is_new_org, org_name, biz_no, org_type, doc_file)` |
| Action | `getCurrentUserAffiliation` | 현재 사용자의 조직/권한 컨텍스트 조회 | User | - |
| RPC | `approve_organization` | 대기 중인 조직 가입 승인 | Admin | `target_org_id` |
| RPC | `reject_organization` | 조직 가입 거절 | Admin | `target_org_id`, `p_reason` |
| RPC | `request_organization_supplement` | 조직 증빙 서류 보완 요청 | Admin | `target_org_id`, `p_message` |

---

## 3. 오더 관리 (Order Management)

### 3.1 하우스 오더 (House Order)
| 구분 | 명칭 (Action/RPC) | 설명 | 권한 | 파라미터 |
|:---:|:---|:---|:---:|:---|
| Action | `createOrder` | 신규 오더 생성 (Header/Pkg/Item) | User | `payload (OrderRegistrationInput)` |
| Action | `getOrders` | 오더 목록 조회 (필터/검색 포함) | User | `page`, `pageSize`, `status`, `search`, `order_type`, `transport_mode` |
| Action | `getOrderDetails` | 오더 상세 및 계층 데이터 조회 | User | `orderId` |
| Action | `updateOrderStatus` | 오더 상태 전이 및 히스토리 기록 | User | `orderId`, `nextStatus`, `reason` |
| RPC | `get_next_order_sequence` | 하우스 오더 번호 시퀀스 생성 | System | `p_year`, `p_prefix` |

### 3.2 마스터 오더 (Master Order)
| 구분 | 명칭 (Action/RPC) | 설명 | 권한 | 파라미터 |
|:---:|:---|:---|:---:|:---|
| Action | `createMasterOrder` | 마스터 오더 생성 및 하우스 바인딩 | User | `payload (houseOrderIds, carrier_id, ...)` |
| Action | `getMasterOrders` | 마스터 오더 목록 조회 | User | - |
| Action | `getMasterOrderWithHouses` | 마스터 상세 및 소속 하우스 조회 | User | `masterId` |
| Action | `updateMasterOrderStatus` | 마스터 상태 업데이트 및 자동 로직 수행 | User | `masterId`, `nextStatus`, `reason` |
| Action | `dissolveMasterOrder` | 마스터 해체 및 하우스 복구 | User | `masterId` |
| Action | `getPendingHouseOrders` | 마스터 결합 가능한 하우스 오더 조회 | User | - |
| RPC | `generate_master_order_no` | 마스터 오더 번호 생성 | System | - |
| RPC | `get_orders_aggregation` | 하우스 오더 합산 중량/부피 계산 | System | `order_ids` |

---

## 4. 정산 및 재무 (Finance & Settlement)

| 구분 | 명칭 (Action/RPC) | 설명 | 권한 | 파라미터 |
|:---:|:---|:---|:---:|:---|
| Action | `generateInvoicesForOrder` | 오더별 자동 인보이스 생성 | User | `orderId` |
| Action | `updatePaymentStatus` | 인보이스 결제 상태 업데이트 | Admin | `invoiceId`, `status`, `paidAmount` |
| Action | `getSettlementOverview` | 정산 현황 대시보드 데이터 조회 | User | - |
| RPC | `calculate_order_costs` | 오더 비용 계산 엔진 호출 | System | `p_order_id` |
| RPC | `fn_trigger_capture_order_rate` | 오더 시점 요율 스냅샷 캡처 트리거 | System | `p_order_id` |

---

## 5. 물류 트래킹 및 로직 (Logistics Logic)

| 구분 | 명칭 (Action/RPC) | 설명 | 권한 | 파라미터 |
|:---:|:---|:---|:---:|:---|
| Action | `getTrackingEvents` | 오더의 트래킹 히스토리 조회 | User | `orderId` |
| Action | `addTrackingEvent` | 트래킹 이벤트 수동 추가 | Admin | `orderId`, `payload (event, location, ...)` |
| Action | `updateTrackingConfig` | 트래킹 공급자 설정 변경 | Admin | `orderId`, `providerType`, `providerName` |
| RPC | `fn_get_best_matching_rate` | 최적 매칭 요율 검색 엔진 | System | `p_shipper_id`, `p_origin_port_id`, `p_dest_port_id`, `p_weight` |

---

## 6. 마스터 데이터 (Master Data)

| 구분 | 명칭 (Action/RPC) | 설명 | 권한 | 파라미터 |
|:---:|:---|:---|:---:|:---|
| Action | `getPorts` | 항구/공항 코드 목록 조회 | User | - |
| Action | `upsertPort` | 항구/공항 정보 생성/수정 | Admin | `payload` |
| Action | `getNations` | 국가 코드 목록 조회 | User | - |
| Action | `getOrganizations` | 전체 조직(화주/파트너/항공사) 조회 | User | - |
| Action | `getAirlines` | IATA 코드를 보유한 항공사 목록 조회 | User | - |
| Action | `getCommonCodes` | 공통 코드 전체 조회 | Admin | - |
| Action | `getCommonCodesByGroup` | 특정 그룹 공통 코드 조회 | Admin | `groupCode` |
| Action | `upsertCommonCode` | 공통 코드 생성/수정 | Admin | `payload` |
| Action | `deleteCommonCode` | 공통 코드 삭제 | Admin | `id` |

---

## 7. 향후 계획 API (Future/Planned)

| 구분 | 명칭 | 설명 | 관련 Phase | 권한 |
|:---:|:---|:---|:---:|:---:|
| Action | `getVOCs` | VOC(고객의 소리) 목록 조회 | Phase 3 | User |
| Action | `createVOC` | 신규 VOC 등록 | Phase 3 | User |
| Action | `getVolumeStatistics` | 기간별 물동량 통계 조회 | Phase 4 | Admin |
| Action | `getProfitStatistics` | 기간별 수익성 통계 조회 | Phase 4 | Admin |
| Action | `getFAQs` | 자주 묻는 질문 목록 조회 | Phase 3 | Public |
| Action | `getNotices` | 공지사항 목록 조회 | Phase 3 | Public |

---

## 📝 개정 이력 (Revision History)

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-22 | Antigravity | 전사적 API 인벤토리 초기 구축 및 표준화 |
| v1.1 | 2026-04-22 | Antigravity | 누락 API(RPC/Actions) 및 향후 필요 API 추가, 파라미터 현행화 |
| v1.2 | 2026-04-22 | Antigravity | 전수 조사를 통한 100% 현행화 및 Future API 정리 |
| v1.3 | 2026-04-22 | Antigravity | fn_trigger_capture_order_rate 추가 및 Future API 세부 항목 보완 |
