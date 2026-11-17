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

