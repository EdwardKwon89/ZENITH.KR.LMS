# TASK-B-389 — Issue #1529: B-381 데이터 작업(M4·M4-b·M5) 롤백 계획 (문서)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1529](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1529) (EPIC [#1364](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1364) T3 단계 3) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **상태** | 🔔 검토 대기 (`status:review`) |
| **브랜치** | `feature/teamb-task-b389-iss1529-rollback-plan` (base `origin/TeamB_Dev`) |
| **채번** | 이슈 지정 **TASK-B-389**. `next-task-number.sh B`는 390을 반환하지만 389는 본 이슈가 점유한 번호이므로 이슈 번호를 사용한다 |
| **범위** | **계획 문서만.** 운영 DB 접속 금지(R-14), M4·M4-b·M5 운영 실행 없음(실행은 Aiden·Edward), 코드·마이그레이션 파일 변경 0 |
| **공개 저장소** | 운영 값·건수·식별자·계정 미기재(R-21). 스키마(마이그레이션 파일명·컬럼)와 설계 문서만 근거 |

## 0. 근거와 공통 원칙

**근거**
- B-381 설계: `.agent/tasks/TASK-B-381_261123_Issue1459_SettlementChargeDesign.md` §2-5(인보이스 처리)·§2-6(SETTLED 초기화)·§2-11(테스트)·§2-12(배포 순서)·§2-13
- EPIC #1364: T3 계획표(단계 3 = 데이터 작업, "백업 복원만 가능"), 롤백 단일 통합본(§1 사전 확인·§2 백업·§3 마이그레이션 롤백·§3-0 b375 조건부)
- 스키마(마이그레이션 파일):
  - `20260422020000_zen_finance_core.sql` — `zen_invoices`(status: `UNPAID`·`PARTIAL`·`PAID`·`OVERDUE`·`CANCELED`, `metadata` JSONB), `zen_order_costs(invoice_id)`
  - `20260521000100_imp051_invoice_history.sql` + `20260721010000_add_invoice_history_notes.sql` — `zen_invoice_history(prev_status·next_status·paid_amount·changed_by·notes, ON DELETE CASCADE)`
  - `20260728100000_iss917_invoices_billed_org_id_tier.sql` — `billed_org_id`·`invoice_tier`, `metadata->>'source_order_id'` 사용
  - `20260721000000_add_invoice_finalization_columns.sql` — `is_finalized`·`finalized_at`·`finalized_by`·`finalized_reason`
  - `20260424160000_zen_tax_invoices.sql`(`invoice_id` CASCADE), `20260424130000_zen_finance_pdf_history.sql`(CASCADE), `20260630000000_create_zen_invoice_files.sql`(CASCADE), `20260428100000_zen_claims.sql`(`invoice_id` FK)
  - `20260516090000_prevent_cost_change_after_invoice.sql` — `zen_order_costs`에 `invoice_id`가 있으면 UPDATE/DELETE 차단 트리거
  - `20261118090000_task_b365_cost_settlement_columns.sql` — `zen_orders.cost_settlement_status`·`cost_settled_at`·`cost_settled_by`와 CHECK·인덱스
  - B-381 M1~M3: `zen_ups_settlement_runs`·`zen_ups_settlement_run_amounts`·`zen_ups_settlement_run_charges`, `zen_billing_statement_items`

**공통 원칙**
1. **운영 실행 주체는 Aiden**, 승인은 Edward(R-14). Jaison·Dave·Mike는 운영에서 실행하지 않는다. 이 문서의 SQL은 **초안(미실행)**이며 파일로 커밋하지 않는다.
2. 모든 단계는 **사전 읽기 전용 조회 → 중단 조건 확인 → 백업 → 실행 → 검증** 순서이며, 실행·복원 모두 **단일 트랜잭션**으로 수행한다.
3. 백업은 **DB 전체 백업(비공개 보관) + `rollback_bak` 보조 복사**의 이중화. `rollback_bak`은 PostgREST 노출 스키마가 아니며 anon·authenticated 접근을 회수한다(통합본 §2와 동일).
4. 기록은 **숫자·`true/false`만** 남긴다. 계정·식별자·경로·운영 값은 쓰지 않는다. 백업 파기는 롤백 확인 후 별도 승인으로 한다.
5. 복원은 **실행 역순**(M5 → M4-b → M4)으로 한다.

```sql
CREATE SCHEMA IF NOT EXISTS rollback_bak;
REVOKE ALL ON SCHEMA rollback_bak FROM PUBLIC, anon, authenticated;
```

---

## 1. M4 — UPS 오더의 비취소 인보이스 일괄 취소

### 1-1. 실행 전 읽기 전용 조회·중단 조건

```sql
-- 대상: metadata.source_order_id가 UPS 오더인 비취소 인보이스
SELECT i.id, i.status, i.invoice_tier, i.paid_amount, i.is_finalized
FROM public.zen_invoices i
JOIN public.zen_orders o ON o.id = (i.metadata->>'source_order_id')::uuid
WHERE o.transport_mode = 'UPS'
  AND i.status <> 'CANCELED';

-- 중단 조건 1: PAID 존재
SELECT count(*) FROM public.zen_invoices i
JOIN public.zen_orders o ON o.id = (i.metadata->>'source_order_id')::uuid
WHERE o.transport_mode = 'UPS' AND i.status = 'PAID';

-- 중단 조건 2: source_order_id가 없거나 오더와 조인되지 않는 비취소 인보이스(M4-b 범위) 존재
SELECT count(*) FROM public.zen_invoices i
WHERE i.status <> 'CANCELED'
  AND (i.metadata->>'source_order_id' IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.zen_orders o WHERE o.id = (i.metadata->>'source_order_id')::uuid));
```

- **중단**: PAID가 1건이라도 있으면 실행하지 않고 보고한다(B-381 §2-5).
- **중단**: source-less 비취소 인보이스가 M4-b 대상 목록과 다르면 M4를 실행하지 않고 보고한다.
- 결과는 **건수만** 기록한다.

### 1-2. 백업

```sql
CREATE TABLE rollback_bak.b381_m4_target AS
SELECT i.id
FROM public.zen_invoices i
JOIN public.zen_orders o ON o.id = (i.metadata->>'source_order_id')::uuid
WHERE o.transport_mode = 'UPS' AND i.status <> 'CANCELED';

CREATE TABLE rollback_bak.b381_m4_invoice_bak AS
SELECT i.* FROM public.zen_invoices i
JOIN rollback_bak.b381_m4_target t ON t.id = i.id;

-- M4가 추가하는 이력은 notes='B381_M4' 식별자로 관리하므로 사전 백업하지 않는다.
```

- 백업 후 **행 수 대조**: `b381_m4_invoice_bak` = 대상 건수.
- `zen_order_costs`는 변경하지 않으므로 백업 대상이 아니다(불변 트리거 유지).

### 1-3. 실행(초안)

```sql
BEGIN;
UPDATE public.zen_invoices i
SET status = 'CANCELED',
    updated_at = now()
FROM rollback_bak.b381_m4_target t
WHERE i.id = t.id AND i.status <> 'PAID';

INSERT INTO public.zen_invoice_history
  (invoice_id, prev_status, next_status, paid_amount, changed_by, notes)
SELECT b.id, b.status, 'CANCELED', b.paid_amount, :approved_admin_id, 'B381_M4'
FROM rollback_bak.b381_m4_invoice_bak b;
COMMIT;
```

- `:approved_admin_id`는 **승인 기록에 명시된 admin 계정**을 실행 시 주입한다(문서·저장소에 쓰지 않음).

### 1-4. 복원 SQL 초안

```sql
BEGIN;
UPDATE public.zen_invoices i
SET status = b.status,
    paid_amount = b.paid_amount,
    updated_at = b.updated_at
FROM rollback_bak.b381_m4_invoice_bak b
WHERE i.id = b.id
  AND i.status = 'CANCELED';   -- M4 이후 상태가 바뀐 행은 복원하지 않고 보고

DELETE FROM public.zen_invoice_history h
USING rollback_bak.b381_m4_invoice_bak b
WHERE h.invoice_id = b.id
  AND h.notes = 'B381_M4'
  AND h.changed_by = :approved_admin_id;
COMMIT;
```

### 1-5. 검증 질의

```sql
-- 1) 복원 후 대상 상태 분포가 백업과 동일한가(집계만)
SELECT count(*) AS restored,
       count(*) FILTER (WHERE i.status = b.status) AS same_status
FROM public.zen_invoices i JOIN rollback_bak.b381_m4_invoice_bak b ON b.id = i.id;

-- 2) M4가 남긴 이력이 0건인가
SELECT count(*) FROM public.zen_invoice_history WHERE notes = 'B381_M4';

-- 3) 불변식(전부 true 기대)
SELECT NOT EXISTS (
  SELECT 1 FROM public.zen_invoices i JOIN rollback_bak.b381_m4_invoice_bak b ON b.id = i.id
  WHERE i.status IS DISTINCT FROM b.status
) AS status_matches;
```

- **복원 불가·부분 복원**: M4 이후 해당 인보이스에 결제·상태 변경이 생기면 그 행은 복원하지 않는다(부분 복원). M4가 남긴 이력 행은 복원 시 삭제되므로 **감사 이력이 사라진다**(롤백 사실은 승인 기록에 남긴다). 외부 감사 로그·알림 발송 이력은 복원 대상이 아니다.

---

## 2. M4-b — 출처 오더 없는 비취소 인보이스 삭제

### 2-1. 실행 전 읽기 전용 조회·중단 조건

```sql
SELECT count(*) FROM public.zen_invoices i
WHERE i.status <> 'CANCELED'
  AND (i.metadata->>'source_order_id' IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.zen_orders o WHERE o.id = (i.metadata->>'source_order_id')::uuid));

-- 자식 참조 건수(전부 0이어야 단순 삭제 가능)
WITH target AS (
  SELECT i.id FROM public.zen_invoices i
  WHERE i.status <> 'CANCELED'
    AND (i.metadata->>'source_order_id' IS NULL
         OR NOT EXISTS (SELECT 1 FROM public.zen_orders o WHERE o.id = (i.metadata->>'source_order_id')::uuid))
)
SELECT
  (SELECT count(*) FROM public.zen_order_costs c    WHERE c.invoice_id IN (SELECT id FROM target)) AS order_costs,
  (SELECT count(*) FROM public.zen_claims c         WHERE c.invoice_id IN (SELECT id FROM target)) AS claims,
  (SELECT count(*) FROM public.zen_tax_invoices c   WHERE c.invoice_id IN (SELECT id FROM target)) AS tax_invoices,
  (SELECT count(*) FROM public.zen_finance_pdf_history c WHERE c.invoice_id IN (SELECT id FROM target)) AS pdf_history,
  (SELECT count(*) FROM public.zen_invoice_files c  WHERE c.invoice_id IN (SELECT id FROM target)) AS files,
  (SELECT count(*) FROM public.zen_invoice_history c WHERE c.invoice_id IN (SELECT id FROM target)) AS history;
```

- **중단**: 위 자식 참조 중 하나라도 0이 아니면 실행하지 않는다(CASCADE 자식이 있으면 롤백 시 함께 복원해야 하므로 별도 계획 필요).
- **중단**: 대상 건수가 설계에 기록된 목록과 다르면 실행하지 않고 보고한다.
- 컬럼으로 잡히지 않는 참조(알림 본문·외부 저장소 파일 등)는 **미확인**이다. 실행 전 Aiden·Edward가 확인한다.

### 2-2. 백업

```sql
CREATE TABLE rollback_bak.b381_m4b_target AS
SELECT i.id FROM public.zen_invoices i
WHERE i.status <> 'CANCELED'
  AND (i.metadata->>'source_order_id' IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.zen_orders o WHERE o.id = (i.metadata->>'source_order_id')::uuid));

CREATE TABLE rollback_bak.b381_m4b_invoice_bak AS
SELECT i.* FROM public.zen_invoices i JOIN rollback_bak.b381_m4b_target t ON t.id = i.id;
```

- 자식 참조가 0건임을 전제로 하므로 자식 테이블 백업은 만들지 않는다(0건이 아니면 실행 중단).

### 2-3. 실행(초안)

```sql
BEGIN;
DELETE FROM public.zen_invoices i
USING rollback_bak.b381_m4b_target t
WHERE i.id = t.id;
COMMIT;
```

### 2-4. 복원 SQL 초안

```sql
BEGIN;
INSERT INTO public.zen_invoices
  (id, invoice_no, shipper_id, total_amount, paid_amount, currency, due_date, status,
   metadata, created_at, updated_at, created_by, applied_exchange_rate, paid_at,
   payment_method, is_finalized, finalized_at, finalized_by, finalized_reason,
   billed_org_id, invoice_tier)
SELECT
   id, invoice_no, shipper_id, total_amount, paid_amount, currency, due_date, status,
   metadata, created_at, updated_at, created_by, applied_exchange_rate, paid_at,
   payment_method, is_finalized, finalized_at, finalized_by, finalized_reason,
   billed_org_id, invoice_tier
FROM rollback_bak.b381_m4b_invoice_bak;
COMMIT;
```

- 컬럼 목록은 **실행 시점 스키마와 대조**한 뒤 사용한다(스키마 변경 시 초안을 갱신).
- `invoice_no` UNIQUE 충돌(삭제 후 같은 번호가 재사용된 경우) 시 복원하지 않고 보고한다.
- **복원 불가·부분 복원**: CASCADE 자식이 있었다면 이미 함께 삭제되어 복원되지 않는다(사전 0건 조건으로 차단). 외부 저장소의 인보이스 파일·알림 발송 이력은 복원 대상이 아니다. 삭제 후 새 인보이스가 같은 `invoice_no`를 쓰면 부분 복원만 가능하다.

### 2-5. 검증 질의

```sql
SELECT count(*) AS restored FROM public.zen_invoices i
JOIN rollback_bak.b381_m4b_invoice_bak b ON b.id = i.id;

SELECT NOT EXISTS (
  SELECT 1 FROM public.zen_invoices i
  JOIN rollback_bak.b381_m4b_invoice_bak b ON b.id = i.id
  WHERE i.invoice_no IS DISTINCT FROM b.invoice_no OR i.status IS DISTINCT FROM b.status
) AS content_matches;

SELECT count(*) AS dup_invoice_no FROM (
  SELECT invoice_no FROM public.zen_invoices GROUP BY invoice_no HAVING count(*) > 1
) d;
```

---

## 3. M5 — 기존 SETTLED·run 없음 UPS 오더 초기화

### 3-1. 실행 전 읽기 전용 조회·중단 조건

```sql
-- 대상: SETTLED + run 없음 + 청구서 항목 미포함 UPS 오더
SELECT count(*) FROM public.zen_orders o
WHERE o.transport_mode = 'UPS'
  AND o.cost_settlement_status = 'SETTLED'
  AND NOT EXISTS (SELECT 1 FROM public.zen_ups_settlement_runs r WHERE r.order_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.zen_billing_statement_items i WHERE i.order_id = o.id);

-- 중단 조건: 청구서 항목 포함 오더가 대상에 섞였는지
SELECT count(*) FROM public.zen_orders o
WHERE o.transport_mode = 'UPS'
  AND o.cost_settlement_status = 'SETTLED'
  AND EXISTS (SELECT 1 FROM public.zen_billing_statement_items i WHERE i.order_id = o.id);
```

- **중단**: 청구서 항목 포함 오더가 1건이라도 있으면 대상 선정이 잘못된 것이므로 실행하지 않고 보고한다(설계 §2-6).
- 실행 시점에 `zen_ups_settlement_runs`·`zen_billing_statement_items`가 존재해야 한다(M1·b359 적용 후).

### 3-2. 백업

```sql
CREATE TABLE rollback_bak.b381_m5_target AS
SELECT o.id FROM public.zen_orders o
WHERE o.transport_mode = 'UPS'
  AND o.cost_settlement_status = 'SETTLED'
  AND NOT EXISTS (SELECT 1 FROM public.zen_ups_settlement_runs r WHERE r.order_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.zen_billing_statement_items i WHERE i.order_id = o.id);

CREATE TABLE rollback_bak.b381_m5_order_bak AS
SELECT o.id, o.cost_settlement_status, o.cost_settled_at, o.cost_settled_by, o.updated_at
FROM public.zen_orders o JOIN rollback_bak.b381_m5_target t ON t.id = o.id;
```

### 3-3. 실행(초안)

```sql
BEGIN;
UPDATE public.zen_orders o
SET cost_settlement_status = 'NOT_SETTLED',
    cost_settled_at = NULL,
    cost_settled_by = NULL
FROM rollback_bak.b381_m5_target t
WHERE o.id = t.id;
COMMIT;
```

### 3-4. 복원 SQL 초안

```sql
BEGIN;
UPDATE public.zen_orders o
SET cost_settlement_status = b.cost_settlement_status,
    cost_settled_at = b.cost_settled_at,
    cost_settled_by = b.cost_settled_by,
    updated_at = b.updated_at
FROM rollback_bak.b381_m5_order_bak b
WHERE o.id = b.id
  AND o.cost_settlement_status = 'NOT_SETTLED'
  AND NOT EXISTS (SELECT 1 FROM public.zen_ups_settlement_runs r WHERE r.order_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.zen_billing_statement_items i WHERE i.order_id = o.id);
COMMIT;
```

- **복원 불가·부분 복원**: M5 이후 해당 오더에 새 정산 run·청구서 항목이 생기면 복원하지 않는다(충돌). 이 경우 해당 오더는 건너뛰고 건수를 보고한다. 오더 상태 이력(`order_status_history`)은 M5가 변경하지 않으므로 복원 대상이 아니다. `updated_at`은 백업 값으로 되돌리지만 다른 사유로 갱신된 경우 덮어쓸 수 있으므로, 실행 전후 값이 같은 행만 복원한다.

### 3-5. 검증 질의

```sql
SELECT count(*) AS restored FROM public.zen_orders o
JOIN rollback_bak.b381_m5_order_bak b ON b.id = o.id;

SELECT NOT EXISTS (
  SELECT 1 FROM public.zen_orders o
  JOIN rollback_bak.b381_m5_order_bak b ON b.id = o.id
  WHERE o.cost_settlement_status IS DISTINCT FROM b.cost_settlement_status
     OR o.cost_settled_at IS DISTINCT FROM b.cost_settled_at
     OR o.cost_settled_by IS DISTINCT FROM b.cost_settled_by
) AS content_matches;

SELECT count(*) AS settled_without_required_fields FROM public.zen_orders
WHERE cost_settlement_status = 'SETTLED'
  AND (cost_settled_at IS NULL OR cost_settled_by IS NULL);
```

---

## 4. 복원 불가·부분 복원 목록

| 단계 | 복원 불가/부분 복원 | 사유 | 대응 |
|:--|:--|:--|:--|
| M4 | M4 이후 상태가 바뀐 인보이스 | 실행 후 결제·상태 변경 | 해당 행 제외·보고(부분 복원) |
| M4 | M4가 남긴 `zen_invoice_history` 행 | 복원 시 삭제(감사 이력 소실) | 롤백 사실을 승인 기록에 남김 |
| M4-b | CASCADE 자식(세금계산서·PDF 이력·파일·이력) | 삭제 시 함께 소멸 | **사전 0건 조건**으로 실행 차단 |
| M4-b | 외부 저장소 파일·알림 발송 이력 | DB 밖 참조 | **미확인** — 실행 전 Aiden·Edward 확인 |
| M4-b | 삭제 후 재사용된 `invoice_no` | UNIQUE 충돌 | 부분 복원·보고 |
| M5 | M5 이후 run·청구서 항목이 생긴 오더 | 신규 데이터와 충돌 | 건너뛰기·보고 |
| 공통 | `rollback_bak` 밖 감사 로그·모니터링 | DB 외부 | 복원 대상 아님 |

---

## 5. 롤백 가능 구간·한계

- **안전 구간**: 각 단계 실행 직후, **신규 데이터(새 정산·청구서·결제)가 생기기 전**. 이 구간에서는 백업 복원으로 원상 복구가 가능하다.
- **실행 후 신규 데이터가 생긴 뒤**: 신규 데이터와 충돌하는 행은 복원하지 않는다(부분 복원). 전체 복원은 신규 데이터 삭제를 동반하므로 **Edward 별도 결정** 없이는 하지 않는다.
- **앱이 신버전으로 배포된 뒤 데이터만 복원**하면 DB가 레거시 상태(SETTLED·run 없음, 취소 인보이스)로 돌아가 신앱의 단일 경로와 불일치한다. 이 경우 **앱 롤백을 선행**하거나 전방 수정을 선택한다.
- 마이그레이션(M1~M3) 롤백과 데이터 복원은 **데이터 복원이 먼저**다(M5가 run·청구서 항목 테이블을 참조).

---

## 6. 로컬 리허설 절차 (실행은 이 Task 범위 밖)

1. **환경**: 로컬 Supabase만 사용(R-14). 운영 접속 금지.
2. **대상 상태 만들기**(로컬 시드 기반): UPS 오더 + 연결 인보이스, source-less 인보이스, SETTLED·run 없음 오더, 청구서 항목 포함 오더(제외 확인용)를 각각 만든다.
3. **사전 조회·백업**: 각 단계의 §1-1·§2-1·§3-1 조회를 실행해 건수를 기록하고, §1-2·§2-2·§3-2 백업을 만든다.
4. **실행**: M4 → M4-b → M5 순서로 초안 SQL을 실행한다.
5. **검증**: 각 단계 실행 직후 §1-5·§2-5·§3-5의 카운트·불변식을 확인한다.
6. **복원**: 역순(M5 → M4-b → M4)으로 복원 SQL을 실행하고, 백업 대비 건수·상태가 일치하는지 확인한다.
7. **기록**: 단계별 건수·`true/false`만 기록한다. 실패·부분 복원은 사유와 함께 기록한다.
8. **후속**: 이 리허설은 별도 실측 Task(예: B-388 방식)에서 수행하며, 이 Task는 절차만 정의한다.

---

## 7. 통합본·앱 롤백과의 순서

- **원칙**: 앱 롤백 → 데이터 복원(M5 → M4-b → M4) → B-381 M1~M3 파일 롤백 → 통합본 §3(b382 → b360 → b359 → b365). b375(§3-0)는 조건부·Edward 결정으로 통합본 순서를 따른다.
- **데이터 복원이 마이그레이션 롤백보다 먼저**여야 한다(M5가 run·청구서 항목 테이블을 사용).
- **M2 롤백은 통합본 §3보다 먼저** 수행한다(통합본 §0-4).
- 앱을 신버전으로 유지한 채 데이터만 복원하는 것은 금지하지 않지만, 신앱과 불일치하므로 **앱 롤백 병행** 또는 전방 수정으로 처리한다(Edward 결정).
- 단계 3(데이터)만 되돌리고 마이그레이션은 유지하는 **데이터 단독 롤백**도 가능하나, 신규 데이터가 없을 때만 유효하다.

---

## 8. [작업 결과]

- 산출물 1~5: M4·M4-b·M5 각각 작성(읽기 전용 조회·중단 조건, 백업, 복원 SQL 초안, 복원 불가/부분 복원, 검증 질의).
- 산출물 6: 로컬 리허설 절차 작성(실행은 범위 밖).
- 산출물 7: 통합본·앱 롤백과의 순서 작성.
- 복원 불가·부분 복원 목록: §4 표.
- SQL은 **초안(미실행)**이며 마이그레이션·코드 파일 변경 **0건**.
- 추가 줄에 절대경로·계정·운영 식별자·운영 값 없음(R-21).
- EPIC #1364 요약 코멘트: 작성 후 게시.
- **커밋 해시**: `4a975f20eff36394b2bd7ed7cbf954523f6b8fd5`

## 9. 미작성·미확인

- **미확인**: `zen_invoices.id`를 컬럼으로 갖지 않는 참조(알림 본문·외부 저장소 파일 등)의 실제 존재 여부 — 실행 전 Aiden·Edward 확인 필요.
- **미실행**: 모든 SQL(초안). 로컬 리허설·운영 실행은 후속 Task/Edward 승인.
- **미확정**: M4-b 대상 건수·구성은 실행 직전 조회로 확정한다(문서에 값 미기재).
