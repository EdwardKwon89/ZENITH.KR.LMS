## 7. Supabase RPC (Database Functions)
복잡한 로직이나 대량 데이터 연산이 필요한 경우 호출되는 DB 함수입니다.

| 함수명 | 인자(Arguments) | 반환형 | 설명 |
| :--- | :--- | :--- | :--- |
| `approve_organization` | `target_org_id (uuid)` | `text` | 신규 조직 승인 및 관리자 프로필 생성 |
| `reject_organization` | `target_org_id, comment` | `boolean` | 가입 거절 및 사유 기록 |
| `request_organization_supplement` | `target_org_id, comment` | `boolean` | 서류 보완 요청 |
| `calculate_order_costs` | `p_order_id (uuid)` | `jsonb` | TISA 엔진 기반 운임 산출 및 항목 기록 |
| `get_orders_aggregation` | `order_ids (uuid[])` | `TABLE` | 마스터 결합용 중량/부피 합산 |
| `fn_get_best_matching_rate` | `carrier_id, origin, dest, etc.` | `TABLE` | 최적 요율 카드 매칭 |
| `generate_master_order_no` | `None` | `text` | M-YYMMDD-NNNN 형식 번호 생성 |
| `get_next_order_sequence` | `p_year, p_prefix` | `text` | 시퀀스 기반 오더 번호 생성 |

---


## 8. 선불 지갑 관리 (Wallet Management)
화주 조직의 자금 충전, 환불 및 인보이스 결제를 관리합니다.
- **Path**: `src/app/actions/wallet.ts`

### getWalletBalance(orgId)
- **설명**: 특정 조직의 지갑 잔액 및 통화 정보 조회 (최초 접근 시 자동 생성)
- **Input**: `orgId (uuid)`
- **Output**: `Promise<{ balance: number, currency: string, updatedAt: string }>`

### topUpWallet(orgId, amount, description?)
- **설명**: 지갑 잔액 충전 (Admin 전용)
- **Input**: `orgId`, `amount (number)`, `description?`
- **Output**: `Promise<ActionResult>`

### requestRefund(walletId, amount, description?)
- **설명**: 지갑 잔액 환불 요청 (PENDING 상태로 거래 생성)
- **Input**: `walletId`, `amount`, `description?`
- **Output**: `Promise<ActionResult>`

### payInvoiceFromWallet(invoiceId)
- **설명**: 지갑 잔액을 사용하여 인보이스 결제 처리 (원자적 트랜잭션)
- **Input**: `invoiceId (uuid)`
- **Output**: `Promise<ActionResult>`
- **Error**: `INSUFFICIENT_BALANCE` (잔액 부족 시)

---

## 9. 운항 스케줄 (Vessel Schedules)
해상/항공 운항 스케줄 정보를 관리 및 조회합니다.
- **Path**: `src/app/actions/schedules.ts`

### getVesselSchedules(filters)
- **설명**: [NEW] 출발/도착지 및 기간별 운항 스케줄 조회
- **Input**: `{ originPortId?, destinationPortId?, startDate?, endDate? }`
- **Output**: `Promise<VesselSchedule[]>`

### upsertVesselSchedule(payload) / deleteVesselSchedule(id)
- **설명**: [NEW] 스케줄 정보 관리 (Admin 전용)

---

## 10. 통계 및 분석 (Statistics & Analytics)
플랫폼 내 물동량, 매출, 수익성 지표를 시각화하기 위한 데이터를 제공합니다.
- **Path**: `src/app/actions/statistics.ts`

### getCostProfitStats(period)
- **설명**: [NEW] 특정 기간('WEEK', 'MONTH', 'YEAR') 동안의 운송 모드별 매출/비용/수익/이익률 통계 조회
- **Input**: `'WEEK' | 'MONTH' | 'YEAR'`
- **Output**: `Promise<{ statsByMode: Array<{ mode, revenue, cost, profit, margin }> }>`


---

