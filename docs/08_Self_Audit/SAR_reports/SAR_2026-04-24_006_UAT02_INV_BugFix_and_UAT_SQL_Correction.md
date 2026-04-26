# SAR - UAT-02 1차 검증: INV 코드 버그 2건 + UAT SQL 불일치 6건

**문서번호:** SAR-2026-04-24-006  
**날짜:** 2026-04-24  
**작성자:** Aiden (AI Agent)  
**심각도:** MODERATE (코드 버그 2건 — TC-UAT-INV.1 FAIL 유발 / SQL 불일치는 검증 오판 유발)

---

## 1. 발견 경위 (Discovery)

UAT-02 정적 코드 검증 (Phase 3.1 TRK / 3.2 FIN / 3.4 INV 모듈) 수행 중 발견.  
`src/app/actions/inventory.ts`의 `syncInventoryFromOrder` 함수와 `UAT_3.0_Phase3_Integrated.md` SQL Assertion 다수에서 구현과 명세의 불일치를 확인함.

---

## 2. 발견된 결함 목록

### [BUG-INV-01] WAREHOUSED 입고 케이스 누락 (코드 버그)

- **파일:** `src/app/actions/inventory.ts:173-235`
- **현상:** `syncInventoryFromOrder` switch문에 `OrderStatus.WAREHOUSED` 케이스가 없어, 오더 입고(`WAREHOUSED`) 시 `zen_inventory.on_hand_qty`가 증가하지 않음
- **영향:** TC-UAT-INV.1 실패 — 입고 확정 후 재고 수량 미반영
- **조치:** `WAREHOUSED` 케이스 추가 — `on_hand_qty` 증가 + `INBOUND` 이력 기록

```typescript
// 수정 후 (추가된 케이스)
case OrderStatus.WAREHOUSED:
  updatePayload = { on_hand_qty: inventory.on_hand_qty + item.quantity };
  historyPayload = {
    ...historyPayload,
    transaction_type: 'INBOUND',
    change_qty: item.quantity,
    result_qty: inventory.on_hand_qty + item.quantity,
    remarks: `Order Warehoused: ${orderId}`
  };
  break;
```

---

### [BUG-INV-02] OrderStatus.CANCELLED 오타 (코드 버그)

- **파일:** `src/app/actions/inventory.ts:201`
- **현상:** switch case에 `OrderStatus.CANCELLED`(이중 L) 사용 — 실제 enum은 `CANCELED`(단일 L)
- **영향:** 오더 취소 시 `reserved_qty` 차감 처리가 무시됨 (case never matches)
- **조치:** `OrderStatus.CANCELLED` → `OrderStatus.CANCELED` 수정

---

### [UAT-DOC-001] TRK.3 알림 type 불일치

- **문서:** `UAT_3.0_Phase3_Integrated.md` — TC-UAT-TRK.3 SQL Assertion
- **현상:** SQL 기대값 `type = 'TRACKING_UPDATE'` — 실제 DB 제약 및 코드는 `'STATUS_CHANGE'` 사용
  - `zen_notifications` CHECK 제약: `type IN ('STATUS_CHANGE', 'HELD', 'DELIVERED', ...)`
  - `notifications.ts` IN_TRANSIT 케이스: `type: 'STATUS_CHANGE'`
- **조치:** 기대값 `'TRACKING_UPDATE'` → `'STATUS_CHANGE'` 로 교정

---

### [UAT-DOC-002] FIN.1 zen_order_costs 컬럼 불일치

- **문서:** TC-UAT-FIN.1 SQL Assertion
- **현상:** `base_cost, profit_amount, discount_amount, final_amount` 컬럼 참조 — 실제 스키마는 `unit_price, quantity, total_amount`(GENERATED AS unit_price * quantity)
- **조치:** 실제 컬럼명 기반으로 SQL 재작성

---

### [UAT-DOC-003] FIN.2 PDF 경로 테이블 불일치

- **문서:** TC-UAT-FIN.2 SQL Assertion
- **현상:** `zen_invoices.storage_path` 참조 — 실제 PDF 경로는 `zen_invoice_pdf_history.file_path`에 저장됨 (`issueInvoicePdf` 구현 확인)
- **조치:** SQL을 `zen_invoice_pdf_history` JOIN 쿼리로 교정

---

### [UAT-DOC-004] FIN.3 zen_payments 테이블 없음

- **문서:** TC-UAT-FIN.3 SQL Assertion
- **현상:** `zen_payments` 테이블 서브쿼리 참조 — 해당 테이블 없음. 실제 구현은 `updatePaymentStatus()`가 `zen_invoices.paid_amount`를 직접 업데이트
- **조치:** SQL을 `zen_invoices.paid_amount` 직접 조회로 교정

---

### [UAT-DOC-005/006] INV.2/INV.4 zen_inventory_logs 테이블/컬럼 불일치

- **문서:** TC-UAT-INV.2, TC-UAT-INV.4 SQL Assertion
- **현상:** `zen_inventory_logs` 테이블 + `sku_id, adjustment_qty, reason, adjusted_by, adjusted_at` 컬럼 참조
  - 실제 테이블: `zen_inventory_history`
  - 실제 컬럼: `inventory_id, change_qty, remarks, created_by, created_at, transaction_type`
- **조치:** 테이블명 및 전 컬럼명 교정

---

## 3. 검증 (Verification)

- 회귀 테스트: `rtk npm run test:regression` → 수정 후 재실행 예정
- 코드 수정 완료: `src/app/actions/inventory.ts` BUG-INV-01/02
- UAT 문서 교정 완료: `UAT_3.0_Phase3_Integrated.md` SQL Assertion 6건

---

## 4. 예방 (Prevention)

- **체크리스트 추가**: UAT SQL Assertion 작성 시 실제 마이그레이션 파일(`supabase/migrations/`)과 소스 코드(`src/app/actions/`) 크로스체크 의무화
- **Enum 참조 원칙**: TypeScript 코드 작성 시 문자열 리터럴 대신 Enum 값을 사용하고, IDE 자동완성으로 오타 방지
- **WAREHOUSED 패턴 표준화**: 오더 상태 전환 핸들러 작성 시 INBOUND/OUTBOUND 모두 포함 여부를 코드 리뷰 체크리스트에 추가

---
*작성: Aiden (2026-04-24) | 연관 SAR: SAR-2026-04-24-005 (BUG-10-A 선행)*
