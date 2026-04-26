# Ds-11 API 상세 명세 — FINANCE (정산/재무 + 세금계산서)

> **프로젝트:** ZENITH_LMS | **버전:** v1.13 | **최종 수정:** 2026-04-24
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

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

- **설명**: 특정 인보이스의 PDF 파일을 생성하고 Supabase Storage에 업로드 후 이력을 기록함
- **권한**: Admin
- **파라미터**:
  - `invoiceId`: (uuid) 대상 인보이스 ID
- **응답**: `{ success: true, pdfUrl: string, historyId: uuid }`

### 5.6 getInvoicePdfHistory (Action)

- **설명**: 특정 인보이스에 대해 발행된 PDF 이력(버전, 생성일, 생성자, 파일 경로) 조회
- **권한**: User (소속 조직 인보이스만 조회 가능)
- **파라미터**: `invoiceId` (uuid)
- **응답**: `Array<{ id: uuid, filePath: string, version: number, createdAt: string, createdBy: string }>`

### 5.7 exportSettlementData (Route Handler)

- **설명**: 정산 데이터를 조건별로 필터링하여 Excel(XLSX) 형식으로 내보냄. 대용량 처리를 위해 Route Handler(`/api/finance/export`)로 구현함.
- **권한**: Admin/User (소속 조직 데이터만 접근 가능)
- **파라미터 (Query Params)**:
  - `status`: (string, optional) PAID, UNPAID, CANCELED
  - `dateFrom`: (string, optional, YYYY-MM-DD) 시작일
  - `dateTo`: (string, optional, YYYY-MM-DD) 종료일
  - `shipperId`: (uuid, optional) 특정 화주 필터링 (Admin 전용)
- **응답**: Binary File (Blob)
  - `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition`: `attachment; filename=settlement_export_YYYYMMDD.xlsx`

### 5.8 issueTaxInvoice (Action)

- **설명**: 특정 인보이스를 기반으로 표준 세금계산서 데이터를 생성함 [WBS 3.2.5.1]
- **권한**: Admin (ZENITH_SUPER_ADMIN, ZENITH_MANAGER)
- **파라미터**:
  - `invoiceId`: (uuid) 대상 인보이스 ID
- **응답**: `{ success: true, taxInvoiceId: uuid }`

### 5.9 sendTaxInvoiceEmail (Action)

- **설명**: 생성된 세금계산서를 고객 이메일로 발송함. Resend를 사용하며 발송 성공 여부를 추적함 [WBS 3.2.5.2]
- **권한**: Admin (ZENITH_SUPER_ADMIN, ZENITH_MANAGER)
- **파라미터**:
  - `taxInvoiceId`: (uuid) 세금계산서 ID
  - `recipientEmail`: (string) 수신자 이메일
- **응답**: `{ success: true, messageId: string }`

### 5.10 getTaxInvoiceHistory (Action)

- **설명**: 특정 인보이스와 연결된 세금계산서 발행 및 발송 이력을 조회함
- **권한**: User (소속 조직 데이터만 가능)
- **파라미터**: `invoiceId` (uuid)
- **응답**: `Array<TaxInvoiceRecord>`

---

## DB Schema & Types

### TaxInvoiceRecord (Type)

```typescript
type TaxInvoiceRecord = {
  id: string; // uuid
  invoiceId: string; // uuid
  taxInvoiceNo: string; // 세금계산서 번호 (TX-YYYYMMDD-SERIAL)
  status: 'ISSUED' | 'SENT' | 'FAILED';
  recipientEmail: string;
  sentAt: string | null;
  issuedAt: string;
  issuedBy: string; // User ID
  metadata: {
    messageId?: string; // Resend API Message ID
    error?: string; // 발송 실패 시 에러 메시지
    [key: string]: any;
  };
}
```

### zen_tax_invoices (Table)

| Column | Type | Default | Description |
|:---|:---|:---|:---|
| `id` | uuid | gen_random_uuid() | PK |
| `invoice_id` | uuid | - | FK (public.zen_invoices.id) |
| `tax_invoice_no` | text | - | 세금계산서 고유 번호 (Unique) |
| `status` | text | 'ISSUED' | ISSUED, SENT, FAILED |
| `supplier_info` | jsonb | - | 공급자 정보 (상호, 사업자번호 등) |
| `buyer_info` | jsonb | - | 공급받는자 정보 (상호, 사업자번호 등) |
| `items` | jsonb | - | 품목 상세 내역 (Array) |
| `total_amount` | numeric | 0 | 합계 금액 (공급가액 + 세액) |
| `vat_amount` | numeric | 0 | 부가가치세액 |
| `recipient_email` | text | - | 수신자 이메일 주소 |
| `sent_at` | timestamptz | null | 이메일 발송 완료 시각 |
| `issued_at` | timestamptz | now() | 데이터 생성 시각 |
| `issued_by` | uuid | auth.uid() | FK (auth.users.id) |
| `metadata` | jsonb | '{}' | 기타 메타데이터 (Resend messageId 등) |

#### RLS Policies

- **SELECT**: `Profiles.org_id = zen_invoices.shipper_id` 또는 `role = 'ADMIN'`
- **INSERT/UPDATE**: `role = 'ADMIN'` (ZENITH_SUPER_ADMIN, ZENITH_MANAGER 권한 필요)
- **DELETE**: 금지 (발행 이력 보존)
