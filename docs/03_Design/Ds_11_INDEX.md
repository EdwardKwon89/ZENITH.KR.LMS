# Ds-11 API 카탈로그 (Index)

> **프로젝트:** ZENITH_LMS | **버전:** v1.14 | **최종 수정:** 2026-04-26
>
> **구조:** 본 INDEX는 전체 API 목록 및 링크만 관리합니다. 파라미터·응답 상세는 각 DETAIL 파일을 참조하십시오.
>
> **상세 파일 목록:**
> - [AUTH](Ds_11_DETAIL_AUTH.md) — 공통 응답 + 인증/사용자
> - [ORDER](Ds_11_DETAIL_ORDER.md) — 오더 관리 + 마스터 오더
> - [FINANCE](Ds_11_DETAIL_FINANCE.md) — 정산/재무 + 세금계산서
> - [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md) — 물류 로직 + 마스터 데이터 + 시스템
> - [INVENTORY](Ds_11_DETAIL_INVENTORY.md) — 재고 관리
> - [TRACKING](Ds_11_DETAIL_TRACKING.md) — 통합 트래킹
> - [NOTIFICATION](Ds_11_DETAIL_NOTIFICATION.md) — 알림 관리
> - [ROUTING](Ds_11_DETAIL_ROUTING.md) — 경로 최적화 및 시각화
> - [VOC](Ds_11_DETAIL_VOC.md) — 고객 불만 관리 (Phase 4 Sprint 3)
> - [SUPPORT](Ds_11_DETAIL_SUPPORT.md) — 고객지원 포털 QnA/FAQ/공지사항 (Phase 4 Sprint 4)
> - [OPS_PARAMS](Ds_11_DETAIL_OPS_PARAMS.md) — 운영 파라미터 & Feature Flag (Phase 4 Sprint 5)

---

## API 전체 목록

| # | 도메인 | 함수 / 엔드포인트 | 유형 | 권한 | 한 줄 설명 | 상세 |
|:---:|:---|:---|:---:|:---:|:---|:---|
| 1.1 | Common | Standard Response | - | - | 공통 응답 구조 및 에러 코드 | [AUTH](Ds_11_DETAIL_AUTH.md#1-공통-응답-및-에러-코드) |
| 2.1 | Auth | `login` | Action | Public | 이메일/비밀번호 로그인 | [AUTH](Ds_11_DETAIL_AUTH.md#21-login) |
| 2.2 | Auth | `signup` | Action | Public | 회원가입 및 조직 신청 | [AUTH](Ds_11_DETAIL_AUTH.md#22-signup) |
| 2.3 | Auth | `getCurrentUserAffiliation` | Action | User | 소속 조직 및 권한 정보 조회 | [AUTH](Ds_11_DETAIL_AUTH.md#23-getcurrentuseraffiliation) |
| 2.4 | Auth | `approveOrganization` / `rejectOrganization` | Action | Admin | 조직 가입 승인/거절 | [AUTH](Ds_11_DETAIL_AUTH.md#24-approveorganization--rejectorganization) |
| 2.5 | Auth | `requestOrganizationSupplement` | Action | Admin | 서류 보완 요청 | [AUTH](Ds_11_DETAIL_AUTH.md#25-requestorganizationsupplement) |
| 3.1 | Order | `createOrder` | Action | User | 하우스 오더 원자적 생성 | [ORDER](Ds_11_DETAIL_ORDER.md#31-createorder) |
| 3.2 | Order | `getOrders` | Action | User | 오더 목록 조회 (필터/페이지) | [ORDER](Ds_11_DETAIL_ORDER.md#32-getorders) |
| 3.3 | Order | `updateOrderStatus` | Action | User | 상태 전이 + 히스토리 + 자동 로직 트리거 | [ORDER](Ds_11_DETAIL_ORDER.md#33-updateorderstatus) |
| 3.4 | Order | `getOrderDetails` | Action | User | 오더 단건 상세 (Packages/Items 포함) | [ORDER](Ds_11_DETAIL_ORDER.md#34-getorderdetails) |
| 3.5 | Order | `get_next_order_sequence` | RPC | System | 하우스 오더 일련번호 생성 | [ORDER](Ds_11_DETAIL_ORDER.md#35-get_next_order_sequence) |
| 3.6 | Order | `get_orders_aggregation` | RPC | System | 오더 총 중량/CBM 합산 | [ORDER](Ds_11_DETAIL_ORDER.md#36-get_orders_aggregation) |
| 3.7 | Order | `updateOrder` | Action | User | 오더 정보 수정 + 재고 재조정 | [ORDER](Ds_11_DETAIL_ORDER.md#37-updateorder) |
| 4.1 | Master | `createMasterOrder` | Action | User | 마스터 오더 생성 + 하우스 오더 묶음 | [ORDER](Ds_11_DETAIL_ORDER.md#41-createmasterorder) |
| 4.2 | Master | `updateMasterOrderStatus` | Action | User | 마스터 상태 업데이트 (CANCELED 시 자동 해체) | [ORDER](Ds_11_DETAIL_ORDER.md#42-updatemasterorderstatus) |
| 4.3 | Master | `dissolveMasterOrder` | Action | User | 마스터 해체 + 하우스 오더 복구 | [ORDER](Ds_11_DETAIL_ORDER.md#43-dissolvemasterorder) |
| 4.4 | Master | `getMasterOrders` | Action | User | 마스터 오더 목록 조회 | [ORDER](Ds_11_DETAIL_ORDER.md#44-getmasterorders) |
| 4.5 | Master | `getPendingHouseOrders` | Action | User | 마스터 결합 가능 하우스 오더 목록 | [ORDER](Ds_11_DETAIL_ORDER.md#45-getpendinghouseorders) |
| 4.6 | Master | `generate_master_order_no` | RPC | System | 마스터 오더 번호 생성 | [ORDER](Ds_11_DETAIL_ORDER.md#46-generate_master_order_no) |
| 4.7 | Master | `getMasterOrderWithHouses` | Action | User | 마스터 상세 + 바인딩 하우스 목록 | [ORDER](Ds_11_DETAIL_ORDER.md#47-getmasterorderwithhouses) |
| 5.1 | Finance | `generateInvoicesForOrder` | Action | User | 오더 완료 시 인보이스 자동 생성 | [FINANCE](Ds_11_DETAIL_FINANCE.md#51-generateinvoicesfororder) |
| 5.2 | Finance | `updatePaymentStatus` | Action | Admin | 인보이스 결제 상태 업데이트 | [FINANCE](Ds_11_DETAIL_FINANCE.md#52-updatepaymentstatus) |
| 5.3 | Finance | `getSettlementOverview` | Action | User | 정산 대시보드 인보이스 목록 | [FINANCE](Ds_11_DETAIL_FINANCE.md#53-getsettlementoverview) |
| 5.4 | Finance | `calculate_order_costs` | RPC | System | 중량/부피/요율 기반 비용 계산 | [FINANCE](Ds_11_DETAIL_FINANCE.md#54-calculate_order_costs) |
| 5.5 | Finance | `issueInvoicePdf` | Action | Admin | PDF 청구서 생성 + Storage 업로드 + 이력 기록 | [FINANCE](Ds_11_DETAIL_FINANCE.md#55-issueinvoicepdf) |
| 5.6 | Finance | `getInvoicePdfHistory` | Action | User | 인보이스 PDF 발행 이력 조회 | [FINANCE](Ds_11_DETAIL_FINANCE.md#56-getinvoicepdfhistory) |
| 5.7 | Finance | `exportSettlementData` | Route Handler | User/Admin | 정산 데이터 엑셀 Export | [FINANCE](Ds_11_DETAIL_FINANCE.md#57-exportsettlementdata) |
| 5.8 | Finance | `issueTaxInvoice` | Action | Admin | 세금계산서 데이터 생성 | [FINANCE](Ds_11_DETAIL_FINANCE.md#58-issuetaxinvoice) |
| 5.9 | Finance | `sendTaxInvoiceEmail` | Action | Admin | 세금계산서 이메일 발송 (Resend) | [FINANCE](Ds_11_DETAIL_FINANCE.md#59-sendtaxinvoiceemail) |
| 5.10 | Finance | `getTaxInvoiceHistory` | Action | User | 세금계산서 발행/발송 이력 조회 | [FINANCE](Ds_11_DETAIL_FINANCE.md#510-gettaxinvoicehistory) |
| 6.1 | Logistics | `getTrackingEvents` | Action | User | 오더 트래킹 이벤트 전체 조회 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#61-gettrackingevents) |
| 6.2 | Logistics | `addTrackingEvent` | Action | Admin | 트래킹 이벤트 수동 추가 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#62-addtrackingevent) |
| 6.3 | Logistics | `fn_trigger_capture_order_rate` | RPC | System | 상태 도달 시 요율 스냅샷 저장 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#63-fn_trigger_capture_order_rate) |
| 6.4 | Logistics | `updateTrackingConfig` | Action | Admin | 트래킹 공급자 설정 변경 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#64-updatetrackingconfig) |
| 6.5 | Logistics | `fn_get_best_matching_rate` | RPC | System/User | 최적 요율 검색 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#65-fn_get_best_matching_rate) |
| 6.6 | Logistics | `syncExternalTracking` | Cron/Action | System/Admin | 외부 운송사 API 트래킹 동기화 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#66-syncexternaltracking) |
| 6.7 | Logistics | `getTrackingRawLogs` | Action | Admin | 외부 API 원본 Raw 로그 조회 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#67-gettrackingrawlogs) |
| 7.1 | Master Data | `upsertPort` / `getPorts` | Action | Admin/User | 항구 정보 관리 및 조회 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#71-upsertport--getports) |
| 7.2 | Master Data | `getNations` | Action | User | 국가 및 ISO 코드 조회 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#72-getnations) |
| 7.3 | Master Data | `getOrganizations` / `getAirlines` | Action | User | 조직/항공사 목록 조회 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#73-getorganizations--getairlines) |
| 7.4 | Master Data | `upsertCommonCode` / `getCommonCodes` | Action | Admin/User | 공통 코드 관리 및 조회 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#74-upsertcommoncode--getcommoncodes) |
| 7.5 | Master Data | `getCommonCodesByGroup` | Action | User | 그룹별 활성 코드 조회 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#75-getcommoncodesBygroup) |
| 7.6 | Master Data | `deleteCommonCode` | Action | Admin | 공통 코드 삭제 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#76-deletecommoncode) |
| 8.1 | System | `rls_auto_enable` | RPC | Superuser | 신규 테이블 RLS 자동 활성화 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#81-rls_auto_enable) |
| 8.2 | System | `update_timestamp_column` | RPC | System | updated_at 자동 갱신 트리거 | [LOGISTICS](Ds_11_DETAIL_LOGISTICS.md#82-update_timestamp_column) |
| 10.1 | Inventory | `getInventoryList` | Action | User | SKU 기반 재고 현황 목록 | [INVENTORY](Ds_11_DETAIL_INVENTORY.md#101-getinventorylist) |
| 10.2 | Inventory | `getInventoryHistory` | Action | User | 재고 변동 이력(원장) 조회 | [INVENTORY](Ds_11_DETAIL_INVENTORY.md#102-getinventoryhistory) |
| 10.3 | Inventory | `adjustInventory` | Action | Admin | 수동 재고 조정 + 사유 기록 | [INVENTORY](Ds_11_DETAIL_INVENTORY.md#103-adjustinventory) |
| 10.4 | Inventory | `syncInventoryFromOrder` | Internal | System | 오더 상태 변경 트리거 재고 자동 처리 | [INVENTORY](Ds_11_DETAIL_INVENTORY.md#104-syncinventoryfromorder) |
| 11.1 | Tracking | `getGlobalTrackingOverview` | Action | User | 마스터/하우스 오더 실시간 트래킹 요약 | [TRACKING](Ds_11_DETAIL_TRACKING.md#111-getglobaltrackingoverView) |
| 11.2 | Tracking | `syncExternalTracking` | Action | User/System | 외부 운송사 트래킹 동기화 + Raw Log 저장 | [TRACKING](Ds_11_DETAIL_TRACKING.md#112-syncexternaltracking) |
| 11.3 | Tracking | `getTrackingRawLogs` | Action | Admin | 오더별 외부 API 원본 이력 조회 | [TRACKING](Ds_11_DETAIL_TRACKING.md#113-gettrackingrawlogs) |
| 12.1 | Notification | `triggerStatusChangeNotification` | Internal | System | 상태 변경 시 알림 생성 + Resend 이메일 | [NOTIFICATION](Ds_11_DETAIL_NOTIFICATION.md#121-triggerstatuschangenotification) |
| 12.2 | Notification | `getNotifications` | Action | User | 로그인 사용자 알림 목록 조회 | [NOTIFICATION](Ds_11_DETAIL_NOTIFICATION.md#122-getnotifications) |
| 12.3 | Notification | `markNotificationRead` | Action | User | 단건 알림 읽음 처리 | [NOTIFICATION](Ds_11_DETAIL_NOTIFICATION.md#123-marknotificationread) |
| 12.4 | Notification | `markAllNotificationsRead` | Action | User | 전체 미읽음 알림 일괄 읽음 처리 | [NOTIFICATION](Ds_11_DETAIL_NOTIFICATION.md#124-markallnotificationsread) |
| 13.1 | Routing | `getRouteOptions` | Action | User | 오더 기반 경로 옵션 3종(최저비용/최단시간/최적) 생성 및 반환 | [ROUTING](Ds_11_DETAIL_ROUTING.md#131-getrouteoptions) |
| 13.2 | Routing | `selectRoute` | Action | User | 선택한 경로 옵션을 오더에 적용 | [ROUTING](Ds_11_DETAIL_ROUTING.md#132-selectroute) |
| 13.3 | Routing | `calculateRouteCost` | Action | User/System | 단일 경로 세그먼트 비용 계산 | [ROUTING](Ds_11_DETAIL_ROUTING.md#133-calculateroutecost) |
| 13.4 | Routing | `getRouteVisualization` | Action | User | 오더 적용 경로의 마일스톤 + 시각화 데이터 반환 | [ROUTING](Ds_11_DETAIL_ROUTING.md#134-getroutevisualization) |
| 13.5 | Routing | `getRouteConsistencyStatus` | Action | Admin | 트래킹 실적 vs 라우팅 계획 정합성 점검 | [ROUTING](Ds_11_DETAIL_ROUTING.md#135-getrouteconsistencystatus) |
| 14.1 | VOC | `createVoc` | Action | User | 오더별 고객 불만(VOC) 등록 + Admin 알림 | [VOC](Ds_11_DETAIL_VOC.md#141-createvoc-action) |
| 14.2 | VOC | `getVocList` | Action | User/Admin | VOC 목록 조회 (RBAC: User=본인 org, Admin=전체) | [VOC](Ds_11_DETAIL_VOC.md#142-getvoclist-action) |
| 14.3 | VOC | `getVocDetail` | Action | User/Admin | VOC 단건 상세 + 답변 이력 조회 | [VOC](Ds_11_DETAIL_VOC.md#143-getvocdetail-action) |
| 14.4 | VOC | `answerVoc` | Action | Admin | VOC 답변 등록 + 상태 자동 전환 + 고객 알림 | [VOC](Ds_11_DETAIL_VOC.md#144-answervoc-action) |
| 14.5 | VOC | `updateVocStatus` | Action | Admin | VOC 처리 상태 직접 변경 (OPEN→IN_PROGRESS→CLOSED) | [VOC](Ds_11_DETAIL_VOC.md#145-updatevocstatus-action) |
| 15.1 | Support | `createQna` | Action | User | 1:1 문의 등록 (오더 연계 선택) | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#151-createqna-action) |
| 15.2 | Support | `getQnaList` | Action | User/Admin | 문의 목록 조회 | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#152-getqnalist-action) |
| 15.3 | Support | `getQnaDetail` | Action | User/Admin | 문의 단건 상세 + 답변 이력 | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#153-getqnadetail-action) |
| 15.4 | Support | `answerQna` | Action | Admin | 문의 답변 등록 + 상태 전환 + 고객 알림 | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#154-answerqna-action) |
| 15.5 | Support | `upsertFaq` | Action | Admin | FAQ 등록/수정 | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#155-upsertfaq-action) |
| 15.6 | Support | `getFaqList` | Action | User/Admin | FAQ 목록 조회 (User=활성만) | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#156-getfaqlist-action) |
| 15.7 | Support | `deleteFaq` | Action | Admin | FAQ 소프트 삭제 (is_active=false) | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#157-deletefaq-action) |
| 15.8 | Support | `upsertNotice` | Action | Admin | 공지사항 등록/수정 + 발행 처리 | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#158-upsertnotice-action) |
| 15.9 | Support | `getNoticeList` | Action | User/Admin | 공지사항 목록 (User=발행분만) | [SUPPORT](Ds_11_DETAIL_SUPPORT.md#159-getnoticelist-action) |
| 16.1 | OpsParams | `getSystemParam` | Action | Admin | 시스템 파라미터 단건 조회 | [OPS_PARAMS](Ds_11_DETAIL_OPS_PARAMS.md#161-getsystemparam-action) |
| 16.2 | OpsParams | `getParamsByCategory` | Action | System/Admin | 카테고리별 파라미터 일괄 조회 (캐시 대상) | [OPS_PARAMS](Ds_11_DETAIL_OPS_PARAMS.md#162-getparamsbycategory-action) |
| 16.3 | OpsParams | `updateSystemParam` | Action | Admin | 파라미터 수정 + 감사 로그 + 캐시 무효화 | [OPS_PARAMS](Ds_11_DETAIL_OPS_PARAMS.md#163-updatesystemparam-action) |
| 16.4 | OpsParams | `getFeatureFlags` | Action | Admin/User | Feature Flag 목록 조회 | [OPS_PARAMS](Ds_11_DETAIL_OPS_PARAMS.md#164-getfeatureflags-action) |
| 16.5 | OpsParams | `updateFeatureFlag` | Action | Admin | Feature Flag 활성화/비활성화 (org별 또는 전역) | [OPS_PARAMS](Ds_11_DETAIL_OPS_PARAMS.md#165-updatefeatureflag-action) |

---

> **에이전트 작업 지침**: 신규 API 추가 시 이 INDEX 테이블에 먼저 행을 추가한 후 해당 DETAIL 파일에 상세 명세를 작성하십시오. 기존 API 수정 시 DETAIL 파일만 수정하고, INDEX의 한 줄 설명이 달라질 경우 INDEX도 동시 업데이트하십시오.
