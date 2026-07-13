# [Draft] ZENITH_LMS API Specification (V2.0)

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** Ds-11
> **최종 버전:** v2.0 (Phase 3 Finance 엔진 반영)
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-22

---

## 1. 개요 (Overview)
본 문서는 ZENITH_LMS 플랫폼에서 사용되는 모든 API(Next.js Server Actions, Supabase RPC, System Utilities)의 전수 조사 결과와 향후 구현 예정인 API 후보군을 정의합니다. 모든 API는 RBAC(역할 기반 접근 제어)와 Zod 유효성 검사를 기반으로 설계되었습니다.

---

## 2. Server Actions (Next.js)

### 2.1 인증 및 보안 (Auth & Security)
| API 명칭 | 파일 위치 | 설명 | 보안 수준 |
|:---|:---|:---|:---|
| `login(email, password)` | `login/actions.ts` | 사용자 인증 및 세션 생성 | Public |
| `signup(payload)` | `login/actions.ts` | 신규 회원가입 및 프로필 생성 | Public |
| `validateUserAction()` | `lib/auth/guards.ts` | 유효한 세션 및 프로필 확인 (내부용) | Private |
| `validateAdminAction()` | `lib/auth/guards.ts` | 관리자 권한 확인 (내부용) | Admin |

### 2.2 기준 정보 관리 (Master Data)
| API 명칭 | 파일 위치 | 설명 | 권한 |
|:---|:---|:---|:---|
| `getPorts()` | `master.ts` | 전체 항구/공항 목록 조회 | User |
| `upsertPort(payload)` | `master.ts` | 항구 정보 생성/수정 | Admin |
| `getNations()` | `master.ts` | 국가 코드 목록 조회 | User |
| `getOrganizations()` | `master.ts` | 전체 조직(화주/파트너) 조회 | User |
| `getAirlines()` | `master.ts` | IATA 코드를 보유한 항공사 목록 조회 | User |
| `getCommonCodesByGroup(code)` | `master.ts` | 특정 그룹의 공통 코드 조회 | User |
| `getCurrentUserAffiliation()` | `master.ts` | 로그인 사용자의 소속 및 권한 정보 | User |

### 2.3 오더 및 물류 (Orders & Logistics)
| API 명칭 | 파일 위치 | 설명 | 권한 |
|:---|:---|:---|:---|
| `createOrder(payload)` | `orders.ts` | 하우스 오더(HBL) 생성 및 트래킹 초기화 | User |
| `getOrders(filters)` | `orders.ts` | 필터링 및 검색 기반 오더 목록 조회 | User (Scoped) |
| `getOrderDetails(id)` | `orders.ts` | 오더 상세(패키지, 아이템 포함) 조회 | User (Scoped) |
| `updateOrderStatus(id, status)` | `orders.ts` | 상태 머신 기반 오더 상태 변경 및 기록 | User (Scoped) |
| `createMasterOrder(payload)` | `orders.ts` | 하우스 오더들을 묶어 마스터 오더 생성 | Manager+ |
| `dissolveMasterOrder(id)` | `orders.ts` | 마스터 오더 해체 및 하위 오더 원복 | Manager+ |
| `getMasterOrders()` | `orders.ts` | 마스터 오더 목록 조회 | User |
| `getPendingHouseOrders()` | `orders.ts` | 마스터 결합 대기 중인 PACKED 오더 조회 | User |

### 2.4 정산 및 금융 (Finance)
| API 명칭 | 파일 위치 | 설명 | 권한 |
|:---|:---|:---|:---|
| `generateInvoicesForOrder(id)` | `finance.ts` | 오더별 정산 비용 계산 및 인보이스 발행 | Admin |
| `updatePaymentStatus(id, status)`| `finance.ts` | 인보이스 결제 상태 업데이트 및 오더 동기화 | Admin |
| `getSettlementOverview()` | `finance.ts` | 화주별/전체 정산 및 미납 현황 조회 | User (Scoped) |

### 2.5 트래킹 (Tracking)
| API 명칭 | 파일 위치 | 설명 | 권한 |
|:---|:---|:---|:---|
| `getTrackingEvents(id)` | `tracking.ts` | 특정 오더의 운송 이벤트 이력 조회 | User |
| `addTrackingEvent(payload)` | `tracking.ts` | 수동 운송 이벤트 추가 | Manager+ |
| `updateTrackingConfig(id, cfg)` | `tracking.ts` | 트래킹 공급자 및 번호 설정 변경 | Admin |

### 2.6 인벤토리 관리 (Inventory Management)
| API 명칭 | 파일 위치 | 설명 | 권한 |
|:---|:---|:---|:---|
| `getInventoryList(filters)` | `inventory.ts` | 조직별 SKU 기반 재고 현황 목록 조회 | User |
| `getInventoryHistory(id)` | `inventory.ts` | 재고 품목의 상세 변동 이력(원장) 조회 | User |
| `adjustInventory(id, qty, reason)` | `inventory.ts` | 수동 재고 조정 및 사유 기록 | Admin |
| `syncInventoryFromOrder(orderId, oldStatus, newStatus)`| `orders.ts` / `inventory.ts` | 오더 상태 변경에 따른 재고 자동 동기화 | System |

---

## 3. Supabase RPC (Postgres Functions)

| RPC Function Name | Input Parameters | Return Type | 설명 |
|:---|:---|:---|:---|
| `calculate_order_costs` | `p_order_id: uuid` | `jsonb` | 요율 카드를 기반으로 오더의 최종 운임 계산 |
| `get_orders_aggregation` | `order_ids: uuid[]` | `table` | 여러 오더의 중량(Weight), 부피(Volume) 합산 |
| `generate_master_order_no` | `-` | `text` | `M-YYMMDD-NNNN` 형식의 마스터 번호 생성 |
| `get_next_order_sequence` | `p_year, p_prefix` | `text` | 하우스 오더용 시퀀스 번호 발급 |
| `fn_get_best_matching_rate` | `p_org, p_dest, ...` | `table` | 조건에 맞는 최적의 Slab 요율 조회 |
| `get_orders_aggregation` | `order_ids: uuid[]` | `table` | 다수 오더의 합산 통계(중량/부피) 제공 |
| `approve_organization` | `p_org_id, p_id, p_role` | `void` | 조직 승인 및 담당자 권한 부여 |

---

## 4. 시스템 및 인프라 유틸리티 (System & Infra)
이 섹션은 비즈니스 로직 외 시스템 운영을 지원하는 내부 함수들을 포함합니다.

- **`rls_auto_enable(target_table)`**: 신규 테이블 생성 시 RLS 정책을 자동 적용하는 유틸리티.
- **`update_timestamp_column()`**: `updated_at` 컬럼을 자동 갱신하는 트리거 함수.
- **`handle_new_user()`**: Supabase Auth 가입 시 `profiles` 테이블에 기초 데이터를 동기화하는 트리거.

---

## 5. 향후 구현 예정 API 후보군 (Future Candidates)
WBS 및 로드맵을 기반으로 Phase 3/4에서 구현될 예정인 API입니다.

### 5.1 고객 지원 및 VOC (Phase 4.1)
- `getVOCs(filters)`: 고객 문의 목록 조회
- `createVOC(payload)`: 신규 문의 접수
- `getNotices()` / `getFAQs()`: 공지사항 및 자주 묻는 질문

### 5.2 지능형 관제 및 통계 (Phase 3.3)
- `getOptimizedRoutes(origin, dest)`: 최적 경로 및 비용 시뮬레이션
- `getVolumeStatistics(period)`: 물동량 추이 분석 데이터
- `getProfitStatistics(period)`: 수익성 분석 데이터

### 5.3 외부 연동 및 자동화 (Phase 3.1)
- `getExternalTracking(provider, id)`: 실시간 외부 API(항공/선사) 연동 어댑터
- `issueTaxInvoice(invoice_id)`: 국세청/전자세금계산서 전송 엔진 연동
- `exportSettlements(filter)`: 대용량 정산 데이터 엑셀 다운로드 스트림

---

## 6. API 통합 규칙 (Integration Rules)
1. **Error Handling**: 모든 API는 `try-catch`로 감싸져 있으며, 에러 발생 시 사용자 친화적인 메시지와 상세 로그를 분리하여 처리합니다.
2. **Revalidation**: 데이터 변경 발생 시 `next/cache`의 `revalidatePath`를 호출하여 실시간 UI 업데이트를 보장합니다.
3. **Immutability**: `MASTERED` 또는 `PAID` 상태의 데이터는 API 레벨에서 수정 요청을 거부(Guard)합니다.
