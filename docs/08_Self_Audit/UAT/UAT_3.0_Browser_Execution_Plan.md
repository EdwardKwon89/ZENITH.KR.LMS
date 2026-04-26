# UAT-3.0 브라우저 검증 실행 계획 (Browser Execution Plan)

> **문서번호:** UAT-EXEC-01  
> **작성일:** 2026-04-25  
> **작성자:** Aiden (ZEN_CEO)  
> **수행 주체:** Riley (CPO, Header Agent)  
> **검증 주체:** Aiden  
> **근거 시나리오:** [UAT_3.0_Phase3_Integrated.md](UAT_3.0_Phase3_Integrated.md)

---

## 1. 목적 및 범위

정적 코드 검증(UAT-01/02/03)으로 확인할 수 없는 **런타임 동작 — UI 렌더링, 실제 DB 적재, 파일 다운로드, 이메일 발송** 을 브라우저에서 직접 검증한다.

### 잔여 검증 항목 (14건)

| 그룹 | TC | 항목 | 비고 |
|:---:|:---:|:---|:---|
| TRK | TRK.1~4 | 트래킹 동기화, 대시보드, 알림, RawLog | 4건 |
| FIN | FIN.1~5 | 정산, PDF, 입금, Excel, 세금계산서 | 5건 |
| INV | INV.1~4 | 자동증감, 수동조정, 안전재고, 통계 | 4건 |
| ROU | ROU.2~3 | isSelected 피드백, mode 아이콘 | BUG 수정 후 확인 |
| E2E | E2E.2~3 | 재고사이클, Admin 감시 플로우 | 2건 |

> **ROU.1/ROU.4/E2E.1** — 정적 검증 + 회귀 테스트로 PASS 확정. 브라우저 재검증 불필요.

---

## 2. 환경 준비 (Prerequisites)

### 2.1 개발 서버

```bash
export PATH=$PATH:/opt/homebrew/bin
rtk npm run dev
# → http://localhost:3000
```

### 2.2 필수 계정

| 계정 유형 | 용도 | 접속 방법 |
|:---|:---|:---|
| **Admin** | 관리자 전용 기능 (Raw Log, RBAC 확인 포함) | `admin@test.com` 또는 관리자 계정 |
| **Shipper** | 알림 수신, RBAC 차단 확인 | 일반 사용자 계정 (별도 브라우저 세션) |

> Supabase SQL 편집기 병행 접속 필수 — SQL Assertion 실시간 교차 검증용

### 2.3 테스트 데이터 사전 적재

아래 SQL을 Supabase SQL 편집기에서 실행하여 검증용 기초 데이터를 준비한다.

```sql
-- [STEP 0] 검증용 오더 조회 (CONFIRMED 상태 오더 1건 확인)
SELECT id, order_no, status
FROM zen_orders
WHERE status IN ('CONFIRMED', 'IN_TRANSIT')
ORDER BY created_at DESC
LIMIT 5;

-- [STEP 0-B] 재고 대상 SKU 확인
SELECT id, sku_code, quantity, min_stock_qty
FROM zen_inventory
ORDER BY created_at DESC
LIMIT 5;
```

> 위 조회 결과에서 실제 `order_id` 와 `sku_code` 를 메모한다. 이하 `[대상_오더_ID]` 는 해당 값으로 치환한다.

---

## 3. 실행 순서 및 의존성

```
INV.1 → INV.2 → INV.3 → INV.4   (독립 블록, 선착 가능)
       ↓
TRK.1 → TRK.2 → TRK.3 → TRK.4
       ↓
FIN.1 → FIN.2 → FIN.3 → FIN.4 → FIN.5
       ↓
ROU.2 → ROU.3                      (BUG-15-A/16-A 수정 확인)
       ↓
E2E.2 → E2E.3                      (전체 통합)
```

### 예상 소요 시간

| 블록 | TC | 예상 시간 |
|:---|:---|:---:|
| INV 블록 | INV.1~4 | 30분 |
| TRK 블록 | TRK.1~4 | 40분 |
| FIN 블록 | FIN.1~5 | 50분 |
| ROU 확인 | ROU.2~3 | 20분 |
| E2E 블록 | E2E.2~3 | 35분 |
| **합계** | **14건** | **~3시간** |

---

## 4. 블록별 실행 체크리스트

### 🟦 블록 A — INV (재고) [30분]

> 시작 전: Supabase에서 대상 SKU `id` 와 `quantity` 확인

#### INV.1 — 자동 재고 증감

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | Admin → 창고 운영 화면 → 특정 SKU 오더 '입고 확정' | '입고 완료' 토스트 | ✅ (SQL) |
| 2 | 재고 대시보드 → 해당 SKU 수량 증가 확인 | `(이전값 + 입고수량)` | ✅ (SQL) |
| 3 | SQL: `SELECT quantity FROM zen_inventory WHERE sku_code='...'` | 기대값과 일치 | ✅ (SQL) |
| 4 | 동일 SKU 출고 확정 → 수량 감소 확인 | `(이전값 - 출고수량)` | ✅ (SQL) |

#### INV.2 — 수동 조정 + 사유 로깅

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | 재고 대시보드 → SKU 우측 '수동 조정' 버튼 | `InventoryAdjustmentModal` 오픈 | [ ] |
| 2 | 사유 미입력 → '확정' 클릭 | 유효성 오류 메시지 표시 | [ ] |
| 3 | 수량 `-5`, 사유 `"파손 처리"` 입력 → 확정 | 성공 토스트 + 수량 감소 | ✅ (SQL) |
| 4 | SQL: `zen_inventory_history` 최신 레코드 확인 | `change_qty=-5, remarks='파손 처리'` | ✅ (SQL) |

```sql
SELECT change_qty, remarks, created_by, created_at
FROM zen_inventory_history
WHERE inventory_id = '[대상_inventory_ID]'
ORDER BY created_at DESC LIMIT 1;
```

#### INV.3 — 안전재고 배지

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | INV.2로 수량을 `min_stock_qty` 이하로 조정 | — | ✅ (SQL) |
| 2 | 재고 대시보드 해당 행 확인 | `Warning` (주황) 또는 `Danger` (빨강) 배지 노출 | [ ] |
| 3 | 상단 통계 확인 | "부족 재고 N건" 카운트 반영 | ✅ (SQL) |
| 4 | 수량을 `min_stock_qty` 초과로 재조정 | 배지 사라짐 | [ ] |

#### INV.4 — 기간별 통계

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | SKU 클릭 → `InventoryHistorySheet` 오픈 | 시트 정상 렌더링 | [ ] |
| 2 | 기간 필터 (이번 주) 설정 | 필터 적용된 목록 | [ ] |
| 3 | 화면 통계 vs SQL 교차 검증 | 건수 및 수량 합계 일치 | [ ] |

```sql
SELECT transaction_type, COUNT(*) AS cnt, SUM(ABS(change_qty)) AS total_qty
FROM zen_inventory_history
WHERE inventory_id = '[대상_inventory_ID]'
  AND created_at BETWEEN '[start]' AND '[end]'
GROUP BY transaction_type;
```

---

### 🟩 블록 B — TRK (트래킹) [40분]

#### TRK.1 — 외부 트래킹 동기화

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | Admin → `/tracking` 대시보드 진입 | 대시보드 정상 렌더링 | [ ] |
| 2 | 마스터 오더 번호 입력 → '동기화' 버튼 클릭 | "동기화 완료" 토스트 | [ ] |
| 3 | 타임라인에 최신 이벤트 추가 확인 | 위치 + 시각 + 상태 표시 | [ ] |
| 4 | SQL: `zen_tracking_events` 최신 5건, `has_raw=true` | 기대값 일치 | [ ] |

```sql
SELECT event_code, location, occurred_at, raw_payload IS NOT NULL AS has_raw
FROM zen_tracking_events
WHERE master_order_id = '[대상_마스터_오더_ID]'
ORDER BY occurred_at DESC LIMIT 5;
```

#### TRK.2 — 통합 트래킹 대시보드

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | `/orders/[orderId]` 진입 → Tracking 섹션 확인 | 마일스톤 타임라인 렌더링 (1건 이상) | [ ] |
| 2 | 각 마일스톤: 위치명 + 상태 배지 + 발생 일시 표시 | 3항목 모두 확인 | [ ] |
| 3 | `/tracking` 대시보드에서 동일 이벤트 존재 확인 | 데이터 동기 | [ ] |
| 4 | **[RBAC]** SHIPPER 계정 → 본인 오더만 조회되는지 확인 | 타 조직 오더 미노출 | [ ] |

#### TRK.3 — 알림 발송 (이메일 + IN_APP)

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | Admin → 특정 오더 트래킹 상태 `IN_TRANSIT` 변경 | 변경 처리 완료 | [ ] |
| 2 | Shipper 계정으로 `/notifications` 진입 | 미읽음 IN_APP 알림 1건 노출 | [ ] |
| 3 | 알림 내용: 오더번호 + 상태 + 발생 시각 | 정보 정확성 확인 | [ ] |
| 4 | Resend 대시보드 또는 수신 메일함 확인 | 이메일 발송 로그 존재 | [ ] |
| 5 | SQL: `zen_notifications` 최신 레코드 | `type='STATUS_CHANGE', channel='IN_APP', is_read=false` | [ ] |

```sql
SELECT type, channel, is_read, created_at
FROM zen_notifications
WHERE user_id = '[Shipper_user_id]'
ORDER BY created_at DESC LIMIT 1;
```

#### TRK.4 — RawLogViewer (Admin 전용)

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | Admin → 'Raw Log Viewer' 진입 | 원본 JSON 목록 표시 | [ ] |
| 2 | 특정 로그 클릭 → JSON 전문 펼쳐보기 | 원본 페이로드 렌더링 | [ ] |
| 3 | **[RBAC]** SHIPPER → `/admin/raw-logs` 직접 접근 | 403 또는 리다이렉트 | [ ] |

---

### 🟨 블록 C — FIN (정산) [50분]

#### FIN.1 — 정산 수식 엔진

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | `/finance` 또는 오더 상세 → '정산 계산' 버튼 클릭 | 계산 결과 프리뷰 노출 | [ ] |
| 2 | 프리뷰: 원가 / 이익금 / 할인금 / 최종 청구액 표시 | 4항목 존재 | [ ] |
| 3 | SQL: `zen_order_costs` — `unit_price * quantity = total_amount` | Generated Column 정합 | ✅ (SQL) |
| 4 | 소수점 환율 처리 확인 | 반올림 명세 일치 | ✅ (SQL) |

```sql
SELECT cost_type, unit_price, quantity,
       (unit_price * quantity) AS expected_total, total_amount
FROM zen_order_costs
WHERE order_id = '[대상_오더_ID]';
```

#### FIN.2 — 인보이스 PDF 발행

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | 오더 상세 → Finance 섹션 → '인보이스 발행' 버튼 클릭 | 발행 성공 토스트 | [ ] |
| 2 | `InvoiceHistorySheet` → 신규 항목 추가 확인 | 목록에 신규 행 | ✅ (SQL) |
| 3 | 해당 항목 클릭 → PDF 다운로드 링크 노출 | 링크 표시 | [ ] |
| 4 | 다운로드 링크 클릭 → PDF 파일 정상 수신 | 파일명 + 용량 > 0 | [ ] |
| 5 | SQL: `zen_invoice_pdf_history.file_path IS NOT NULL` | 저장 경로 존재 | [ ] |

```sql
SELECT h.file_path, h.version, h.created_at AS issued_at
FROM zen_invoice_pdf_history h
JOIN zen_invoices i ON h.invoice_id = i.id
WHERE i.order_id = '[대상_오더_ID]'
ORDER BY h.version DESC LIMIT 1;
```

#### FIN.3 — 입금 처리 (Partial → Paid)

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | 인보이스 상세 → '입금 확인' 모달 → 총액의 50% 입력 | 저장 완료 | [ ] |
| 2 | 상태 배지 확인 | `PARTIAL_PAID` + 미납금 50% 표시 | [ ] |
| 3 | 나머지 50% 추가 입금 등록 | — | [ ] |
| 4 | 상태 배지 확인 | `PAID` + 미납금 $0 | [ ] |
| 5 | **[Negative]** 총액 초과 입금 시도 | 에러 처리 확인 | [ ] |
| 6 | SQL: `status='PAID', total_amount=paid_amount` | 정합 | [ ] |

```sql
SELECT status, total_amount, paid_amount
FROM zen_invoices
WHERE id = '[대상_인보이스_ID]';
```

#### FIN.4 — 엑셀 Export

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | `/finance` → 기간 필터(이번 달) → '엑셀 다운로드' | `.xlsx` 파일 다운로드 | [ ] |
| 2 | 파일명 확인 | `finance_export_YYYY-MM-DD.xlsx` | [ ] |
| 3 | 파일 열기 → 컬럼 확인 | 오더번호, 인보이스번호, 총금액, 상태 존재 | [ ] |
| 4 | 기간 내 레코드 수 SQL 교차 검증 | 건수 일치 | [ ] |
| 5 | **[Edge]** 0건 기간 선택 → 빈 파일 또는 헤더만 | 빈 파일 정상 처리 | [ ] |

#### FIN.5 — 세금계산서 발행 + 이메일

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | `PAID` 인보이스 상세 → '세금계산서 발행' | 미리보기 모달 노출 | [ ] |
| 2 | 미리보기: 공급자/공급받는자/공급가액/세액 | 4항목 확인 | [ ] |
| 3 | '발행 확정' 클릭 | 상태 `SENT` + 발행 시각 기록 | [ ] |
| 4 | 수신자 이메일 확인 | 발송 로그 존재 | [ ] |
| 5 | SQL: `status='SENT' 또는 'SUCCESS', sent_at IS NOT NULL` | 정합 | [ ] |

```sql
SELECT tax_invoice_no, status, issued_at, sent_at
FROM zen_tax_invoices
WHERE invoice_id = '[대상_인보이스_ID]';
```

---

### 🟥 블록 D — ROU 수정 확인 [20분]

> BUG-15-A/16-A 수정 후 실제 브라우저에서 결함이 해소되었는지 확인한다.

#### ROU.2 수정 확인 — isSelected 피드백 (BUG-15-A)

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | 오더 상세 → Route Optimization → '경로 계산하기' | 3종 카드 렌더링 | [ ] |
| 2 | BALANCED 카드 '이 경로 선택' 클릭 | **BALANCED 카드 파란 테두리(ring) + "선택됨" 상태로 즉시 전환** | [ ] |
| 3 | 다른 옵션(COST) 재선택 | COST 카드로 선택 상태 이동 | [ ] |
| 4 | 페이지 리로드 후 선택 상태 유지 확인 | 이전 선택 카드가 선택된 상태로 복원 | [ ] |

#### ROU.3 수정 확인 — mode 아이콘 (BUG-16-A)

| # | 동작 | 기대 결과 | ✅ |
|:---:|:---|:---|:---:|
| 1 | 경로 선택 후 마일스톤 타임라인 확인 | `RouteMilestoneTimeline` 렌더링 | [ ] |
| 2 | 각 마일스톤 카드 내 아이콘 확인 | AIR→✈, SEA→🚢, LAND→🚛 아이콘 노출 | [ ] |
| 3 | 아이콘 옆 텍스트 확인 | `AIR` / `SEA` / `LAND` 텍스트 표시 | [ ] |

---

### 🟪 블록 E — E2E [35분]

#### E2E.2 — 재고 관리 사이클

| Step | 역할 | 동작 | 검증 포인트 | ✅ |
|:---:|:---:|:---|:---|:---:|
| 1 | Admin | 창고 입고 확정 (TEST-001, 수량: 10) | `zen_inventory.quantity = 10` | [ ] |
| 2 | Admin | `min_stock_qty = 5` 설정 | 임계값 저장 확인 | [ ] |
| 3 | Admin | 출고 처리 (수량: 6) | `quantity = 4` → Warning 배지 | [ ] |
| 4 | 검증 | 재고 대시보드 | Warning 배지 + 부족 카운트 | [ ] |
| 5 | Admin | 수동 조정 +2, 사유 "긴급 입고" | `zen_inventory_history` 이력 기록 | [ ] |
| 6 | 검증 | 수량 = 6, 안전재고 초과 | 배지 사라짐 | [ ] |
| 7 | Admin | 전체 출고 (수량: 6) | `quantity = 0` → Danger 배지 | [ ] |

#### E2E.3 — Admin 감시 플로우

| Step | 역할 | 동작 | 검증 포인트 | ✅ |
|:---:|:---:|:---|:---|:---:|
| 1 | Admin | E2E.1 완료된 오더 상세 접근 | 오더 상세 페이지 정상 렌더링 | [ ] |
| 2 | Admin | Route Consistency 배지 확인 | 정합 여부 표시 | [ ] |
| 3 | Admin | Tracking 섹션 — 계획 vs 실적 비교 | 마일스톤 상태 일치 | [ ] |
| 4 | Admin | `/admin/raw-logs` — 해당 오더 Raw JSON | JSON 전문 조회 가능 | [ ] |
| 5 | Admin | `/notifications` — 오더 관련 알림 이력 | 전체 알림 이력 확인 | [ ] |
| 6 | 검증 | 알림 발송 시각 vs 트래킹 이벤트 시각 | 시각 일치 (±5초 허용) | [ ] |

---

## 5. 결과 보고 양식

각 블록 완료 후 아래 양식으로 Aiden에게 보고한다.

```
[블록] TRK/FIN/INV/ROU/E2E
[완료 TC] TRK.1 ✅ / TRK.2 ✅ / ...
[실패 TC] TRK.3 ❌ (현상: ...)
[SQL 증적] 쿼리 결과 붙여넣기
[특이사항] 없음 / ...
```

---

## 6. 합격 기준 (Pass/Fail)

| 기준 | 판정 |
|:---|:---:|
| 14건 전체 체크리스트 항목 ✅ | ✅ PASS → Phase 3 완료 판정 |
| 1건 이상 ❌ (Critical) | ❌ FAIL → SAR 작성 후 Riley 수정 |
| 1건 이상 ⚠️ (Minor, 운영 무관) | ⚠️ 조건부 PASS → SAR 접수 후 진행 가능 |

---

## 7. 작업 지시

**Riley에게:**  
본 계획서에 따라 블록 A(INV) → B(TRK) → C(FIN) → D(ROU확인) → E(E2E) 순서로 브라우저 검증을 수행하고, 각 블록 완료 후 위 양식으로 Aiden에게 보고하십시오.

개발 서버: `rtk npm run dev` (localhost:3000)  
SQL 편집기: Supabase 대시보드 → SQL Editor

---

*작성: Aiden (2026-04-25) | 수행 주체: Riley | 근거: UAT_3.0_Phase3_Integrated.md v1.0*
