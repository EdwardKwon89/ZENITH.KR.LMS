# UAT-3.0: Phase 3 통합 검증 시나리오 (C안 — 기능 단위 + E2E)

> **프로젝트:** ZENITH_LMS  
> **버전:** v1.0  
> **작성일:** 2026-04-24  
> **작성자:** Aiden (AI Agent)  
> **검증 범위:** Phase 3.1 Tracking / 3.2 Finance / 3.3 Routing / 3.4 Inventory  
> **유형:** C안 — 기능 단위 시나리오(A) + E2E 시나리오(B) 통합

---

## ✅ 검증 방식 안내

| 구분 | 설명 | 시나리오 그룹 |
|:---|:---|:---|
| **A안 (기능 단위)** | 각 모듈 핵심 기능을 독립 검증 | TRK / FIN / INV / ROU |
| **B안 (E2E)** | 전체 물류 사이클을 사용자 관점에서 연속 검증 | E2E |
| **C안** | A + B 통합 — 모듈 독립 검증 후 E2E로 결합 | 전체 |

> [!IMPORTANT]
> **ROU 그룹 (TC-UAT-ROU.3/4)**: Sprint B(ROU-03/04/05) 완료 후 검증 실시.  
> Sprint B 완료 전에는 `[대기]` 상태로 유지하고, E2E-1의 경로 UI 검증 단계도 동일하게 적용.

---

## 🏛️ 그룹 TRK: 트래킹 기능 단위 검증 [Phase 3.1]

### TC-UAT-TRK.1: 외부 트래킹 동기화 (`syncExternalTracking`)

- **목표**: 외부 운송사 API 어댑터를 통해 트래킹 이벤트가 DB에 정상 적재되는지 검증
- **선행 조건**: 오더(`CONFIRMED` 이상)와 연결된 마스터 오더가 존재할 것
- **검증 시나리오**:
  1. **[Action]** Admin 계정으로 로그인 후 `/tracking` 대시보드 진입
  2. **[Action]** 특정 마스터 오더 번호 입력 → '동기화' 버튼 클릭 (`syncExternalTracking` 호출)
  3. **[Expected UI]** "동기화 완료" 토스트 메시지 노출
  4. **[Expected UI]** 트래킹 타임라인에 최신 이벤트(위치, 시각, 상태)가 추가 노출
  5. **[SQL Assertion]**
     ```sql
     SELECT event_code, location, occurred_at, raw_payload IS NOT NULL AS has_raw
     FROM zen_tracking_events
     WHERE master_order_id = '[대상_마스터_오더_ID]'
     ORDER BY occurred_at DESC
     LIMIT 5;
     -- 기대: 최신 이벤트 5건, has_raw = true (raw_payload 저장 확인)
     ```

---

### TC-UAT-TRK.2: 통합 트래킹 대시보드 — 오더 상세 연동

- **목표**: 오더 상세 페이지의 트래킹 타임라인이 마스터 오더 및 하우스 오더 단위로 정확히 표시되는지 검증
- **선행 조건**: TRK.1 이후 트래킹 이벤트가 1건 이상 존재
- **검증 시나리오**:
  1. **[UI]** `/orders/[orderId]` 진입
  2. **[Expected UI]** 'Tracking' 섹션에 마일스톤 타임라인 렌더링 (최소 1건)
  3. **[Expected UI]** 각 마일스톤에 위치명, 상태 배지(PENDING/IN_TRANSIT/ARRIVED 등), 발생 일시 표시
  4. **[Action]** `/tracking` 대시보드에서 마스터 오더 단위 조회 후 동일 이벤트 존재 확인
  5. **[Negative]** 타 조직 사용자(`SHIPPER`) 계정으로 접근 시 본인 소속 오더만 조회되는지 확인 (RBAC)

---

### TC-UAT-TRK.3: 상태 변경 알림 — 이메일 + IN_APP 동시 발송

- **목표**: 오더 트래킹 상태 변경 시 이메일(Resend)과 IN_APP 알림이 동시에 생성되는지 검증
- **선행 조건**: 알림 대상 사용자(Shipper)가 등록되어 있을 것
- **검증 시나리오**:
  1. **[Action]** Admin 계정으로 특정 오더의 트래킹 상태를 `IN_TRANSIT`으로 변경
  2. **[Expected UI — Admin]** 동작 후 "알림 발송 완료" 확인
  3. **[UI — User]** 해당 오더 소유 Shipper 계정으로 로그인 → `/notifications` 진입
  4. **[Expected UI]** 미읽음 IN_APP 알림 1건 노출 (오더 번호, 상태, 발생 시각 포함)
  5. **[Expected Email]** Resend 대시보드 또는 메일함에서 동일 이벤트 발송 로그 확인
  6. **[SQL Assertion]**
     ```sql
     SELECT type, channel, is_read, created_at
     FROM zen_notifications
     WHERE user_id = '[Shipper_user_id]'
     ORDER BY created_at DESC
     LIMIT 1;
     -- 기대: type = 'STATUS_CHANGE', channel = 'IN_APP', is_read = false
     -- ※ 알림 type은 'STATUS_CHANGE' (코드: notifications.ts) — 'TRACKING_UPDATE' 아님
     ```

---

### TC-UAT-TRK.4: Raw 로그 저장 및 RawLogViewer (Admin 전용)

- **목표**: 외부 API 응답 원본이 `zen_tracking_raw_logs`에 저장되고, Admin 뷰어에서 조회 가능한지 검증
- **선행 조건**: TRK.1 동기화 완료
- **검증 시나리오**:
  1. **[UI — Admin]** Admin 대시보드 → 'Raw Log Viewer' 진입
  2. **[Expected UI]** 마스터 오더별 원본 JSON 페이로드 목록 표시
  3. **[Action]** 특정 로그 항목 클릭 → 원본 JSON 전문 펼쳐보기 가능한지 확인
  4. **[Negative — RBAC]** `SHIPPER` 계정으로 `/admin/raw-logs` 직접 접근 시 403 또는 리다이렉트 확인

---

## 🏛️ 그룹 FIN: 정산/재무 기능 단위 검증 [Phase 3.2]

### TC-UAT-FIN.1: 정산 수식 엔진 — 복합 비용 계산 (`calculate_order_costs`)

- **목표**: 원가 + 이익률 - 할인 수식이 정확히 계산되어 DB에 적재되는지 검증
- **선행 조건**: 오더가 `CONFIRMED` 이상 상태, 요율 카드가 활성화 상태
- **검증 시나리오**:
  1. **[UI]** `/finance` 또는 오더 상세 → '정산 계산' 버튼 클릭
  2. **[Expected UI]** 계산 결과 프리뷰 (원가 / 이익금 / 할인금 / 최종 청구액) 노출
  3. **[SQL Assertion]**
     ```sql
     SELECT cost_type, unit_price, quantity,
            (unit_price * quantity) AS expected_total,
            total_amount
     FROM zen_order_costs
     WHERE order_id = '[대상_오더_ID]';
     -- 기대: expected_total = total_amount (unit_price * quantity = total_amount, Generated Column)
     -- ※ zen_order_costs 실제 컬럼: unit_price, quantity, total_amount (GENERATED AS unit_price * quantity)
     --    base_cost/profit_amount/discount_amount 컬럼은 없음
     ```
  4. **[Edge Case]** 소수점 환율(예: USD/KRW 1,350.75) 적용 시 반올림 처리가 명세와 일치하는지 확인

---

### TC-UAT-FIN.2: 인보이스 PDF 자동 발행 (FIN-01 — `issueInvoicePdf`)

- **목표**: 인보이스 발행 → PDF 생성 → Supabase Storage 업로드 → Signed URL 다운로드 가능 검증
- **선행 조건**: FIN.1 정산 계산 완료 상태의 오더
- **검증 시나리오**:
  1. **[UI]** 오더 상세 페이지 → Finance 섹션 → '인보이스 발행' 버튼 클릭
  2. **[Expected UI]** 발행 성공 토스트 + InvoiceHistorySheet에 신규 항목 추가
  3. **[Action]** InvoiceHistorySheet에서 해당 항목 클릭 → PDF 다운로드 링크 노출
  4. **[Action]** 다운로드 링크 클릭 → PDF 파일 정상 수신 확인 (파일명, 용량 > 0)
  5. **[SQL Assertion]**
     ```sql
     SELECT h.file_path, h.version, h.created_at AS issued_at
     FROM zen_invoice_pdf_history h
     JOIN zen_invoices i ON h.invoice_id = i.id
     WHERE i.order_id = '[대상_오더_ID]'
     ORDER BY h.version DESC
     LIMIT 1;
     -- 기대: file_path IS NOT NULL, version >= 1
     -- ※ PDF 경로는 zen_invoices.storage_path 아닌 zen_invoice_pdf_history.file_path에 저장됨
     ```

---

### TC-UAT-FIN.3: 입금 처리 및 상태 자동 전환 (Partial → Paid)

- **목표**: 부분 입금 등록 시 `PARTIAL_PAID`, 전액 입금 시 `PAID` 상태로 자동 전환 검증
- **선행 조건**: FIN.2 인보이스 발행 완료 (total_amount > 0)
- **검증 시나리오**:
  1. **[UI — Admin]** 인보이스 상세 → '입금 확인' 모달 → 인보이스 금액의 50% 입력 → 저장
  2. **[Expected UI]** 인보이스 상태 배지: `PARTIAL_PAID` + 미납금 50% 표시
  3. **[Action]** 나머지 50% 입금 등록
  4. **[Expected UI]** 인보이스 상태 배지: `PAID` + 미납금 $0
  5. **[SQL Assertion]**
     ```sql
     SELECT status, total_amount, paid_amount
     FROM zen_invoices
     WHERE id = '[대상_인보이스_ID]';
     -- 기대: status = 'PAID', total_amount = paid_amount
     -- ※ 별도 zen_payments 테이블 없음 — updatePaymentStatus()가 zen_invoices.paid_amount를 직접 업데이트함
     ```
  6. **[Negative]** 인보이스 총액 초과 입금 시도 시 에러 처리 확인

---

### TC-UAT-FIN.4: 정산 데이터 엑셀 Export (FIN-02 — `/api/finance/export`)

- **목표**: 조건 필터 적용 후 정산 데이터가 엑셀 파일로 정상 다운로드되는지 검증
- **검증 시나리오**:
  1. **[UI]** `/finance` → 기간 필터 (이번 달) 설정 → '엑셀 다운로드' 버튼 클릭
  2. **[Expected]** `.xlsx` 파일 다운로드 완료 (파일명: `finance_export_YYYY-MM-DD.xlsx`)
  3. **[File Check]** 엑셀 파일 열기 → 오더번호, 인보이스번호, 총금액, 상태 컬럼 정상 존재 확인
  4. **[Filter Check]** 선택 기간 내 데이터만 포함되어 있는지 레코드 수 교차 검증
  5. **[Edge Case]** 데이터가 0건인 기간 선택 시 빈 파일 또는 헤더만 있는 파일 반환 확인

---

### TC-UAT-FIN.5: 세금계산서 발행 및 이메일 발송 (FIN-03 — `issueTaxInvoice`)

- **목표**: 세금계산서 표준 규격 생성 → 이메일 발송 → 발행 상태 이력 저장 검증
- **선행 조건**: FIN.3 `PAID` 상태 인보이스 존재
- **검증 시나리오**:
  1. **[UI — Admin]** 인보이스 상세 → '세금계산서 발행' 버튼 클릭
  2. **[Expected UI]** 세금계산서 미리보기 모달 노출 (공급자/공급받는자 정보, 공급가액, 세액)
  3. **[Action]** '발행 확정' 클릭
  4. **[Expected UI]** 발행 상태: `SENT` + 발행 시각 기록
  5. **[Expected Email]** 수신자 이메일 수신 확인 (세금계산서 PDF 첨부 또는 링크 포함)
  6. **[SQL Assertion]**
     ```sql
     SELECT tax_invoice_no, status, issued_at, sent_at
     FROM zen_tax_invoices
     WHERE invoice_id = '[대상_인보이스_ID]';
     -- 기대: status = 'SENT' 또는 'SUCCESS', sent_at IS NOT NULL
     ```

---

## 🏛️ 그룹 INV: 재고 기능 단위 검증 [Phase 3.4]

### TC-UAT-INV.1: 입출고 연동 자동 재고 증감 (`syncInventoryFromOrder`)

- **목표**: 오더 입고/출고 처리 시 `zen_inventory` 수량이 자동 증감되는지 검증
- **선행 조건**: 재고 대상 SKU가 등록되어 있을 것
- **검증 시나리오**:
  1. **[Action]** 창고 운영 화면에서 특정 SKU 오더 '입고 확정' 처리
  2. **[Expected UI]** 재고 대시보드에서 해당 SKU 수량 즉시 증가 반영
  3. **[SQL Assertion]**
     ```sql
     SELECT sku_code, quantity, last_synced_at
     FROM zen_inventory
     WHERE sku_code = '[대상_SKU]';
     -- 기대: quantity = (이전값 + 입고수량)
     ```
  4. **[Action]** 동일 SKU 출고 확정 처리 후 수량 감소 확인

---

### TC-UAT-INV.2: 수동 재고 조정 + 사유(Reason) 로깅 (`InventoryAdjustmentModal`)

- **목표**: 수동 조정 시 사유 입력 필수 + 조정 이력이 DB에 기록되는지 검증
- **검증 시나리오**:
  1. **[UI]** 재고 대시보드 → 특정 SKU 우측 '수동 조정' 버튼 클릭
  2. **[Expected UI]** `InventoryAdjustmentModal` 오픈 — 조정 수량(+/-), 사유 입력 필드 노출
  3. **[Negative]** 사유 미입력 상태에서 '확정' 클릭 → 유효성 오류 메시지 확인
  4. **[Action]** 수량 `-5`, 사유 `"파손 처리"` 입력 → 확정
  5. **[Expected UI]** 재고 수량 감소 + 성공 토스트
  6. **[SQL Assertion]**
     ```sql
     SELECT change_qty, remarks, created_by, created_at
     FROM zen_inventory_history
     WHERE inventory_id = '[대상_inventory_ID]'
     ORDER BY created_at DESC
     LIMIT 1;
     -- 기대: change_qty = -5, remarks = '파손 처리'
     -- ※ 실제 테이블: zen_inventory_history (zen_inventory_logs 아님)
     --   컬럼: change_qty (adjustment_qty 아님), remarks (reason 아님), created_by/created_at
     ```

---

### TC-UAT-INV.3: 안전 재고 미달 알림 및 대시보드 하이라이트

- **목표**: 재고가 안전 재고 임계값 미만일 때 경고 배지(ZenBadge Warning/Danger)가 표시되는지 검증
- **선행 조건**: 특정 SKU의 `min_stock_qty`가 설정되어 있을 것
- **검증 시나리오**:
  1. **[Setup]** TC-INV.2를 통해 SKU 수량을 `min_stock_qty` 이하로 조정
  2. **[Expected UI]** 재고 대시보드 해당 행에 `Warning` 배지 (주황색) 또는 `Danger` 배지 (빨간색) 노출
  3. **[Expected UI]** 대시보드 상단 요약 통계에 "부족 재고 N건" 카운트 반영
  4. **[Action]** 수량을 `min_stock_qty` 초과로 재조정 → 배지 사라짐 확인

---

### TC-UAT-INV.4: 기간별 입출고 통계 (`InventoryHistorySheet`)

- **목표**: 기간 필터 적용 시 입출고 통계(건수, 수량 합계)가 정확히 집계되는지 검증
- **검증 시나리오**:
  1. **[UI]** 재고 대시보드 → 특정 SKU 클릭 → `InventoryHistorySheet` 오픈
  2. **[Action]** 기간 필터 (이번 주) 설정
  3. **[Expected UI]** 입고 건수, 출고 건수, 수동 조정 건수, 기간 말 재고 수량 표시
  4. **[Verification]** 기간 내 SQL 집계값과 화면 표시값 교차 검증
     ```sql
     SELECT transaction_type, COUNT(*) AS cnt, SUM(ABS(change_qty)) AS total_qty
     FROM zen_inventory_history
     WHERE inventory_id = '[대상_inventory_ID]'
       AND created_at BETWEEN '[start]' AND '[end]'
     GROUP BY transaction_type;
     -- ※ 실제 테이블: zen_inventory_history, 컬럼: transaction_type/change_qty/created_at
     ```

---

## 🏛️ 그룹 ROU: 라우팅 기능 단위 검증 [Phase 3.3]

### TC-UAT-ROU.1: 경로 옵션 3종 계산 (`getRouteOptions`)

- **목표**: COST / TIME / BALANCED 3종 옵션이 계산되고 스코어 기준으로 정렬되어 반환되는지 검증
- **선행 조건**: 오더에 출발지/도착지/화물 정보가 입력되어 있을 것
- **검증 시나리오**:
  1. **[UI]** 오더 상세 → 'Route Optimization' 섹션 → '경로 계산하기' 버튼 클릭
  2. **[Expected UI]** 3종 카드(COST/TIME/BALANCED) 렌더링 — 각각 총비용, 총 소요일, score 표시
  3. **[Expected UI]** BALANCED 카드에 '⭐ 추천' 배지 표시
  4. **[Verification]** COST 카드의 비용이 TIME 카드보다 낮은지 (스코어 기준 정렬) 확인
  5. **[SQL Assertion]**
     ```sql
     SELECT option_type, total_cost, total_transit_days, score
     FROM zen_route_options
     WHERE order_id = '[대상_오더_ID]'
     ORDER BY score ASC;
     -- 기대: 3행 존재 (COST/TIME/BALANCED), BALANCED.score가 중간값
     ```

---

### TC-UAT-ROU.2: 경로 선택 및 `appliedRouteId` 확인 (`selectRoute`)

- **목표**: 옵션 선택 후 `zen_order_routes`에 실제 레코드 UUID가 저장되는지 검증
- **선행 조건**: TC-ROU.1 완료 (3종 옵션 계산됨)
- **검증 시나리오**:
  1. **[UI]** BALANCED 카드 하단 '이 경로 선택' 버튼 클릭
  2. **[Expected UI]** 섹션 하단에 "✅ 선택된 경로: BALANCED" + `appliedRouteId` 축약 표시
  3. **[SQL Assertion]**
     ```sql
     SELECT r.id AS applied_route_id, r.selected_option_id, o.option_type
     FROM zen_order_routes r
     JOIN zen_route_options o ON r.selected_option_id = o.id
     WHERE r.order_id = '[대상_오더_ID]';
     -- 기대: applied_route_id != order_id (orderId와 다른 UUID)
     --       option_type = 'BALANCED'
     ```
  4. **[Re-select Test]** 다른 옵션(COST) 재선택 후 `zen_order_routes` UPSERT 확인 (이전 레코드 교체)

---

### TC-UAT-ROU.3: 경로 마일스톤 타임라인 (`RouteMilestoneTimeline`) ⚠️ Sprint B 완료 후

- **목표**: 선택된 경로의 출발지 → 경유지 → 도착지 마일스톤이 타임라인으로 시각화되는지 검증
- **선행 조건**: TC-ROU.2 경로 선택 완료
- **검증 시나리오**:
  1. **[UI]** 오더 상세 → '경로 타임라인' 섹션 확인
  2. **[Expected UI]** 출발지 포트 → 경유지(s) → 도착지 포트 순서로 마일스톤 카드 렌더링
  3. **[Expected UI]** 각 마일스톤에 포트명, 운송 수단(AIR/SEA/LAND) 아이콘, 예상 소요일 표시
  4. **[Expected UI]** 현재 트래킹 이벤트와 비교해 완료된 구간은 `COMPLETED` 배지, 미완료는 `PENDING` 배지

---

### TC-UAT-ROU.4: 경로 정합성 배지 (`RouteConsistencyBadge`) ⚠️ Sprint B 완료 후 / Admin 전용

- **목표**: 트래킹 실적이 계획 경로와 불일치할 때 경고 배지가 노출되는지 검증
- **선행 조건**: TC-ROU.2 경로 선택 + TC-TRK.1 이후 실적 이벤트 존재
- **검증 시나리오**:
  1. **[UI — Admin]** 오더 상세 → 'Route Consistency' 배지 영역 확인
  2. **[Normal]** 계획 경로와 트래킹 이벤트 일치 시 → 초록색 `✅ 정합` 배지
  3. **[Discrepancy Test]** 계획에 없는 경유지 이벤트를 임시 삽입 후 새로고침
  4. **[Expected UI]** 주황/빨간색 `⚠️ 불일치` 배지 + discrepancy 메시지 노출
  5. **[Negative — RBAC]** `SHIPPER` 계정에서 해당 배지 미노출 확인

---

## 🔗 그룹 E2E: 통합 End-to-End 시나리오 [B안]

### TC-UAT-E2E.1: 완전 물류 사이클 (오더 → 경로 → 트래킹 → 정산 → 세금계산서)

- **목표**: 오더 생성부터 세금계산서 발행까지 전체 물류 사이클의 데이터 정합성 검증
- **예상 소요 시간**: 30분
- **검증 시나리오**:

  | Step | 역할 | 동작 | 검증 포인트 |
  |:---:|:---:|:---|:---|
  | 1 | Shipper | `/orders/new` — B2B 오더 생성 (ICN → SIN, 100kg) | 오더 번호 발급, `REGISTERED` 상태 |
  | 2 | Admin | 오더 `CONFIRMED` 상태 전환 | `zen_order_rate_snapshots` 요율 스냅샷 적재 |
  | 3 | Shipper | 경로 계산 → BALANCED 경로 선택 | `zen_order_routes` 레코드 생성, `appliedRouteId` 확인 |
  | 4 | Admin | 창고 입고 확정 처리 | `zen_inventory` 수량 증가 |
  | 5 | Admin | 외부 트래킹 동기화 → 상태 `IN_TRANSIT` 변경 | Shipper 알림 수신 (IN_APP + Email) |
  | 6 | Admin | 정산 계산 실행 (`calculate_order_costs`) | 비용 계산 정합성 (Step 2 스냅샷 요율 기준) |
  | 7 | Admin | 인보이스 발행 (FIN-01) | PDF 생성, Signed URL 접근 가능 |
  | 8 | Admin | 전액 입금 등록 | 인보이스 상태 `PAID` 전환 |
  | 9 | Admin | 세금계산서 발행 (FIN-03) | `SENT` 상태, Shipper 이메일 수신 |
  | 10 | 검증 | SQL 최종 정합성 점검 (하단) | 전 단계 데이터 일관성 |

  ```sql
  -- E2E 최종 정합성 쿼리
  SELECT
    o.order_no,
    o.status AS order_status,
    r.id AS applied_route_id,
    c.total_amount AS cost_amount,
    i.invoice_no,
    i.status AS invoice_status,
    ti.tax_invoice_no,
    ti.status AS tax_status
  FROM zen_orders o
  LEFT JOIN zen_order_routes r ON r.order_id = o.id
  LEFT JOIN zen_order_costs c ON c.order_id = o.id
  LEFT JOIN zen_invoices i ON i.order_id = o.id
  LEFT JOIN zen_tax_invoices ti ON ti.invoice_id = i.id
  WHERE o.order_no = '[E2E_테스트_오더_번호]';
  -- 기대: 전 컬럼이 NULL 없이 완성된 행 1건
  ```

---

### TC-UAT-E2E.2: 재고 관리 사이클 (입고 → 동기화 → 부족 알림 → 조정 → 출고)

- **목표**: 입고부터 재고 소진까지의 흐름에서 모든 상태 변화가 정확히 추적되는지 검증
- **예상 소요 시간**: 15분
- **검증 시나리오**:

  | Step | 역할 | 동작 | 검증 포인트 |
  |:---:|:---:|:---|:---|
  | 1 | Admin | 창고 입고 확정 (SKU: TEST-001, 수량: 10) | `zen_inventory.quantity` = 10 |
  | 2 | Admin | `min_stock_qty` = 5 설정 | 안전재고 임계값 설정 확인 |
  | 3 | Admin | 출고 처리 (수량: 6) | `zen_inventory.quantity` = 4 → 미달 |
  | 4 | 검증 | 재고 대시보드 확인 | `Warning` 배지 노출 + 부족 재고 카운트 |
  | 5 | Admin | 수동 조정 +2 (사유: "긴급 입고") | `zen_inventory_logs` 이력 기록 |
  | 6 | 검증 | 최종 수량 = 6 (4+2), 안전재고 초과 | 배지 사라짐 확인 |
  | 7 | Admin | 전체 출고 처리 (수량: 6) | `zen_inventory.quantity` = 0 → Danger 배지 |

---

### TC-UAT-E2E.3: 관리자 감시 플로우 (경로 정합성 + Raw 로그 + 알림 일관성) ⚠️ Sprint B 완료 후

- **목표**: Admin이 경로 정합성 모니터링 → Raw 로그 확인 → 알림 이력 검토까지 일관된 흐름으로 수행 가능한지 검증
- **예상 소요 시간**: 20분
- **검증 시나리오**:
  1. **[Admin]** E2E-1 완료된 오더 상세 페이지 접근
  2. **[UI]** Route Consistency 배지 → 정합 여부 확인
  3. **[UI]** Tracking 섹션 → 계획 경로 vs 실적 비교
  4. **[UI]** `/admin/raw-logs` → 해당 오더 Raw JSON 조회
  5. **[UI]** `/notifications` (Admin) → 오더 관련 알림 이력 전체 확인
  6. **[Cross-check]** 알림 발송 시각 vs 트래킹 이벤트 발생 시각 일치 여부

---

## 📊 통합 검증 결과 매트릭스

| ID | 그룹 | 시나리오 | Phase 1 (Logic) | Phase 2 (UI) | 최종 결과 | 비고 |
|:---:|:---:|:---|:---:|:---:|:---:|:---|
| TRK.1 | Tracking | 외부 트래킹 동기화 | N/A | [ ] | 🔲 대기 | |
| TRK.2 | Tracking | 통합 트래킹 대시보드 | N/A | [ ] | 🔲 대기 | |
| TRK.3 | Tracking | 알림 (이메일+IN_APP) | N/A | [ ] | 🔲 대기 | |
| TRK.4 | Tracking | Raw 로그 뷰어 (Admin) | N/A | [ ] | 🔲 대기 | |
| FIN.1 | Finance | 정산 수식 엔진 | N/A | [ ] | 🔲 대기 | |
| FIN.2 | Finance | 인보이스 PDF 발행 | N/A | [ ] | 🔲 대기 | |
| FIN.3 | Finance | 입금 처리 (Partial→Paid) | N/A | [ ] | 🔲 대기 | |
| FIN.4 | Finance | 엑셀 Export | N/A | [ ] | 🔲 대기 | |
| FIN.5 | Finance | 세금계산서 + 이메일 | N/A | [ ] | 🔲 대기 | |
| INV.1 | Inventory | 자동 재고 증감 | N/A | [ ] | 🔲 대기 | |
| INV.2 | Inventory | 수동 조정 + 로깅 | N/A | [ ] | 🔲 대기 | |
| INV.3 | Inventory | 안전재고 알림 | N/A | [ ] | 🔲 대기 | |
| INV.4 | Inventory | 기간별 통계 | N/A | [ ] | 🔲 대기 | |
| ROU.1 | Routing | 경로 옵션 3종 계산 | ✅ 회귀 PASS | ✅ | ✅ PASS | UAT-03 정적 검증 2026-04-25 |
| ROU.2 | Routing | 경로 선택 + ID 확인 | ✅ 회귀 PASS | ⚠️ | ⚠️ 조건부 | BUG-15-A: isSelected 상태 미반영 (SAR-008) |
| ROU.3 | Routing | 마일스톤 타임라인 | ✅ | ⚠️ | ⚠️ 조건부 | BUG-16-A: mode 아이콘 미표시 (SAR-009) |
| ROU.4 | Routing | 정합성 배지 (Admin) | ✅ | ✅ | ✅ PASS | UAT-03 정적 검증 2026-04-25 |
| E2E.1 | E2E | 완전 물류 사이클 | ✅ | ✅ | ✅ PASS | uat-phase3-e2e.test.ts 108/108 (2026-04-25) |
| E2E.2 | E2E | 재고 관리 사이클 | — | [ ] | 🔲 대기 | 브라우저 직접 검증 필요 |
| E2E.3 | E2E | Admin 감시 플로우 | — | [ ] | 🔲 대기 | BUG-15-A/16-A 수정 후 |

> [!IMPORTANT]
> 전체 결과가 `✅ PASS`가 되기 전까지 Phase 3 완료 처리 및 운영 배포를 금지합니다.

---

## 📅 검증 일정 (권고)

| 단계 | 범위 | 시기 | 담당 |
|:---|:---|:---|:---|
| 1차 (기능 단위) | TRK.1~4 + FIN.1~5 + INV.1~4 | 즉시 착수 가능 | Aiden + Riley |
| 2차 (Routing UI) | ROU.1~4 | Sprint B 완료 직후 | Riley (UI) + Aiden (검증) |
| 3차 (E2E) | E2E.1~3 | ROU.3/4 검증 완료 후 | Aiden (오케스트레이션) |
| Phase 3 완료 판정 | 전체 매트릭스 PASS | 3차 완료 후 | Aiden |

---

*작성: Aiden (2026-04-24) | 적용 Phase: 3.1~3.4 | 버전: v1.0*
