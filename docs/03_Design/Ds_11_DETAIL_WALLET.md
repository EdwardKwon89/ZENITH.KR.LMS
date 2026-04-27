# Ds-11 API 상세 명세 — WALLET (선불 지갑)

> **프로젝트:** ZENITH_LMS | **버전:** v1.1 | **최종 수정:** 2026-04-27
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)

---

## 17. 선불 지갑 (Wallet)

### 17.1 getWalletBalance (Action)

- **설명**: 현재 로그인한 사용자의 소속 조직(org_id)에 해당하는 지갑 잔액을 조회함
- **권한**: User
- **응답**: `{ success: true, balance: number, currency: string }`

### 17.2 topUpWallet (Action)

- **설명**: 관리자가 특정 조직의 지갑에 금액을 충전함
- **권한**: Admin
- **파라미터**:
  - `orgId`: (uuid) 대상 조직 ID
  - `amount`: (number) 충전 금액
  - `description`: (string, optional) 충전 사유
- **응답**: `{ success: true, newBalance: number }`

### 17.3 requestRefund (Action)

- **설명**: 사용자가 지갑 잔액의 환불을 요청함. 즉시 차감되지 않고 관리자 승인 대기 상태로 이력이 생성됨
- **권한**: User
- **파라미터**:
  - `amount`: (number) 환불 요청 금액
  - `description`: (string, optional) 환불 사유
- **응답**: `{ success: true, transactionId: uuid }`

### 17.4 payInvoiceFromWallet (Action)

- **설명**: 선불 지갑 잔액을 사용하여 특정 인보이스의 대금을 결제함.
- **특징**: 잔액 차감, 거래 이력 생성, 인보이스 상태 업데이트가 **원자적(Atomic)**으로 수행되어야 함
- **권한**: User
- **파라미터**:
  - `invoiceId`: (uuid) 대상 인보이스 ID
- **응답**: `{ success: true, invoice_no: string, remainingBalance: number }`
- **오류 케이스**:
  - `INSUFFICIENT_BALANCE`: 지갑 잔액이 인보이스 금액보다 적을 경우

### 17.5 getWalletTransactions (Action)

- **설명**: 소속 조직의 지갑 거래 이력을 조회함
- **권한**: User
- **파라미터**:
  - `limit`: (number, default 20)
  - `offset`: (number, default 0)
- **응답**: `Array<WalletTransaction>`

---

## DB Schema & Types

### WalletTransaction (Type)

```typescript
type WalletTransaction = {
  id: string; // uuid
  walletId: string; // uuid
  type: 'TOP_UP' | 'DEDUCT' | 'REFUND_REQUEST' | 'REFUND';
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  referenceId: string | null; // 인보이스 ID 등
  description: string | null;
  createdAt: string;
  createdBy: string;
}
```

### zen_wallet (Table)

| Column | Type | Default | Description |
|:---|:---|:---|:---|
| `id` | uuid | gen_random_uuid() | PK |
| `org_id` | uuid | - | FK (public.zen_organizations.id), Unique |
| `balance` | numeric | 0 | 현재 잔액 (CHECK balance >= 0) |
| `currency` | text | 'KRW' | 기본 통화 |
| `updated_at` | timestamptz | now() | |

### zen_wallet_transactions (Table)

| Column | Type | Default | Description |
|:---|:---|:---|:---|
| `id` | uuid | gen_random_uuid() | PK |
| `wallet_id` | uuid | - | FK (public.zen_wallet.id) |
| `type` | text | - | TOP_UP, DEDUCT, REFUND_REQUEST, REFUND |
| `amount` | numeric | - | 금액 (CHECK amount > 0) |
| `status` | text | 'COMPLETED' | PENDING, APPROVED, REJECTED, COMPLETED |
| `reference_id` | uuid | null | 연관 데이터 참조 |
| `description` | text | null | 사유 |
| `created_by` | uuid | auth.uid() | |
| `created_at` | timestamptz | now() | |
