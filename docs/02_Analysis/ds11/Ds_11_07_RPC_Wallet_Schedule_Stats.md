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
| `create_billing_statement` | `p_tier, p_period_year, p_period_month, p_billed_org_id?, p_billed_name?, p_billed_biz_no?, p_period_from?, p_period_to?` | `TABLE (stmt_id, stmt_no, stmt_round)` | **(TASK-B-359 / Issue #1365)** 월 차수 청구서 채번+헤더 INSERT 원자 RPC. 발행자는 `auth.uid()` 도출(인자 없음, SECURITY INVOKER=RLS 최종 방어), `pg_advisory_xact_lock`으로 차수 경쟁 직렬화 + `UNIQUE(issuer,billed_key,년,월,차수)` 보조, seq는 `next_billing_statement_seq` 원자 증분(내부 역할 검사 포함 — TASK-B-378) → `ST-YYYYMM-NN-SSSS`. DRAFT·항목 0건으로 생성. 오류: `profile_not_found`·`create_not_allowed`(role)·`invalid_tier`·`invalid_period`·`target_org_not_found`·`target_not_linked`(대리점 비연결 ORG)·`adhoc_name_required`·`adhoc_requires_agency_issuer`(조건 6) |
| `next_billing_statement_seq` | `p_year, p_month` | `integer` | **(TASK-B-359 / TASK-B-378 #1452)** 월 내 청구서 seq 원자 증분 — 유일한 카운터 접근 경로(SECURITY DEFINER, `search_path` 고정). 카운터 테이블 `zen_billing_statement_seq`는 RLS 활성+정책 없음(직접 접근 차단). **(TASK-B-378)** 함수 내부 역할 검사를 청구서 생성 RPC 2종과 동일하게 정렬 — `zen_profiles` via `auth.uid()`, 허용 `ADMIN`·`ZENITH_SUPER_ADMIN`·`AGENCY`, 아니면 `profile_not_found`·`create_not_allowed: role=%` throw. GRANT도 두 RPC와 동일(`REVOKE FROM PUBLIC, anon, dashboard_user` / `GRANT authenticated, service_role`, dashboard_user는 방어적 명시·관측값 변화 없음). 오류: `invalid_period`·`profile_not_found`·`create_not_allowed` |

### 7.1 실행 권한·호출자 검증 정렬 (TASK-B-403 / Issue #1579)

대상 RPC는 **인증된 호출자만 실행**하며, 역할을 확인할 수 없는 호출은 거부한다. 허용 역할 규칙은 기존과 동일하다. 호출자가 사용자·조직 식별자를 인자로 넘기는 RPC의 인자 신원 검증 강화는 후속 단계다.

| 함수명 | 실행 권한 | 호출자 검증 |
| :--- | :--- | :--- |
| `approve_organization` | `authenticated`, `service_role` | `COALESCE(get_my_role(), '')` 기준 관리자 계열 확인(서버 내부 키 예외) |
| `reject_organization` | `authenticated`, `service_role` | 동일 |
| `request_organization_supplement` | `authenticated`, `service_role` | 동일 |
| `get_next_order_sequence` | `authenticated`, `service_role` | `COALESCE(get_my_role(), '')` 기준 기존 허용 역할 확인(서버 내부 키 예외) |
| `create_order_atomic` | `authenticated`, `service_role` | 비인증 호출 거부(서버 내부 키 예외, 인자 신원 검증은 후속) |
| `create_order_services_atomic` | `authenticated`, `service_role` | 비인증 호출 거부(서버 내부 키 예외, 인자 신원 검증은 후속) |
| `dissolve_master_order_atomic` | `authenticated`, `service_role` | 비인증 호출 거부(서버 내부 키 예외, 인자 신원 검증은 후속) |

- `service_role`(서버 내부 신뢰 키)과 DB 슈퍼유저 세션은 역할 확인 예외로 두어 기존 서버 내부 호출 동작을 유지한다.
- 마이그레이션: `supabase/migrations/20261128090000_task_b403_rpc_execute_privileges.sql` (신규 1건, 롤백 SQL 주석 포함)
- 오류: 권한 없음(`permission denied`), 역할 미확인·비허용(`Access Denied`)

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

