# TASK-B-376 — Issue #1442: UPS 실비(`zen_order_costs.UPS_ACTUAL_ADJUSTMENT`) 화주·대리점 노출 차단 설계 의견

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1442](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1442) (DEF-150 후속, #1356·#1440·#1441 연장) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **상태** | 🔔 리뷰 대기 (`status:review`) — Jaison 설계 승인 반영 |
| **브랜치** | `feature/teamb-task-b376-iss1442-cost-exposure-design` (base `origin/TeamB_Dev` 1a04b4b9d — #1440·#1441 병합 후) |
| **채번** | `.agent/tasks` TASK-B-376 없음 — 이슈 지정 번호 사용 |

## 확정 규칙 (JSJung)

UPS 실비는 원가이며 **화주·대리점은 확인 불가**, `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 가능.
- `zen_ups_actual_charges` 원본: PR #1440(앱 가드)·#1441(RLS 제거)로 차단 완료.
- **`zen_order_costs`의 `UPS_ACTUAL_ADJUSTMENT` 행**(실비 합계 반영)도 차단 대상.

## 1. 현황 실측

### 1-1. RLS (`zen_order_costs`)

| 정책 | cmd | 조건(요약) |
|:--|:--|:--|
| `Shippers can view their order costs` | SELECT | `zen_orders.shipper_id` 소속 화주(또는 ADMIN/SUPER_ADMIN) — **cost_type 조건 없음** |
| `Agency can view shipper order costs` | SELECT | `zen_orders.agency_org_id = 내 org` — **cost_type 조건 없음** |
| `Admins can manage order costs` | ALL | `ADMIN`·`ZENITH_SUPER_ADMIN` (MANAGER 없음 — 이슈 지시대로 변경하지 않음) |

### 1-2. 직접 세션 SELECT (실측, 로컬 DB)

`376...` 픽스처(화주 오더 + `BASE_FREIGHT 100`·`UPS_ACTUAL_ADJUSTMENT 15`)에 대해 실제 `signInWithPassword` 세션으로 조회:

```text
shipper error=null rows=[{"cost_type":"BASE_FREIGHT","total_amount":100},{"cost_type":"UPS_ACTUAL_ADJUSTMENT","total_amount":15}]
agency  error=null rows=[{"cost_type":"BASE_FREIGHT","total_amount":100},{"cost_type":"UPS_ACTUAL_ADJUSTMENT","total_amount":15}]
```

→ **RLS가 유일한 방어선이며 현재 뚫려 있음.**

### 1-3. 화면 증적 (실제 로그인)

| 세션 | 화면 | 결과 |
|:--|:--|:--|
| SHIPPER | `/ko/orders/{orderId}` | **`UPS_ACTUAL_ADJUSTMENT` 라인(15 USD)과 합계 115 표시** — `docs/02_Analysis/evidence/task-b376/order-detail-shipper.png` |
| AGENCY | `/ko/orders/{orderId}` | **동일하게 표시** — `docs/02_Analysis/evidence/task-b376/order-detail-agency.png` |

`OrderFinanceSummary`는 `costs` 배열을 역할 필터 없이 그대로 렌더합니다(`src/components/finance/OrderFinanceSummary.tsx` L140~158).

## 2. 노출 경로 표 (이슈 기재 13개 + 관련)

| # | 경로 | SHIPPER 도달 | AGENCY 도달 | `UPS_ACTUAL_ADJUSTMENT` 노출 | 근거 |
|:-:|:--|:--:|:--:|:--:|:--|
| 1 | `orders/[orderId]/page.tsx` → `OrderFinanceSummary` | ✅ | ✅ | **화면에 라인·합계 표시** | 실측 스크린샷 |
| 2 | `orders/[orderId]/ups-detail/page.tsx` | ✅ | ✅ | **서버 조회만**(비용 배열은 invoice_id 조회에만 사용, 화면 미전달) — 사용자 세션 → A안 적용 | `costs` 사용처 grep |
| 3 | `finance/page.tsx` | ⚠️ CORPORATE/SHIPPER 가능 | ❌(프록시 차단) | `is_revenue=true` 합계에 **간접 포함**(라벨 없음) | `requireAuth`만, costs 합산 |
| 4 | `daily-billing.ts` `getShipperDailyBillingSummary` | ✅ | ✅ | `totalActualAdjustment` 필드 반환 | L250~ |
| 5 | `daily-billing.ts` `getShipperDailyOrdersDetails` | ✅ | ✅ | `actualAdjustment` 필드 반환 | L380~ |
| 6 | `invoice-files.ts` `generateInvoicePdf` | ⚠️ RLS상 도달 | ⚠️ | `invoice_id` 비용 전체를 PDF 라인으로 전달(업로드/RLS 성공 시) | L68~82 |
| 7 | `order-revenue-cost.ts` `getOrderRevenueCost` | ✅(자기 오더) | ✅ | `is_revenue=true` 합계(revenue)에 포함 | L72~ |
| 8 | `order-revenue-cost.ts` `getOrderRevenueCostList` | ✅ | ✅ | 동일 합계에 포함 | L130~ |
| 9 | `settlement.ts` `generateInvoicesForOrder` | ❌(Admin/Agency 전용) | ✅ | 계산 입력으로 사용, 반환은 인보이스 | L19~ |
| 10 | `settlement.ts` `calculateSettlementAction` | ❌ | ✅(소속만) | **A안 후 반환 `costs`에서 adjustment 제외**(`findFullByOrderId` 사용자 세션). 계산 엔진은 admin client라 금액 계산 불변 | L287~, `finance.repository.ts` L118 |
| 11 | `ups-actual-cost.ts` `getUpsActualCost` | ⚠️(§1.3 미가드) | ⚠️ | **다른 테이블(zen_ups_actual_cost)** — 이번 이슈 범위 밖 | L118 |
| 12 | `claims.ts` `getClaimDetails` | ⚠️(자기 org) | ⚠️ | `costs:zen_order_costs(...)` 조인 포함, UI 표시 여부 미확인 | L246 |
| 13 | `statistics.ts` `getCostProfitStats` | ❌ | ❌ | Admin 전용(`validateAdminAction`) | L8 |
| + | `lib/finance/settlement/settlement.ts` | ❌ | ❌ | admin client 사용(세션 노출 없음) | L28 |
| + | `invoice-generator.ts` | ❌ | ⚠️(호출자에 따라) | 인보이스 계산 내부(반환 없음) | L32~ |
| + | `finance.repository.ts` | ❌ | ⚠️ | `findByOrderId`는 id/invoice_id만, `findFullByOrderId`는 `calculateSettlementAction`에서만 — A안으로 adjustment 제외 | L111~123 |
| + | `UpsActualAdjustmentForm` | ❌(#1440 렌더 차단) | ❌ | — | page.tsx |

> ⚠️는 "역할·RLS 조건에 따라 도달 가능/반환 경로 존재"를 뜻하며, 1·4·5는 화면/응답에 명시 필드로 확인됨.

## 3. 차단안 비교

| 안 | 변경 | 장점 | 단점·회귀 위험 | 되돌리기 |
|:--|:--|:--|:--|:--|
| **A. RLS 두 SELECT 정책에 `cost_type <> 'UPS_ACTUAL_ADJUSTMENT'`** | 마이그레이션 1건(정책 DROP/CREATE 2개) | DB 단일 방어선으로 **13개 경로+직접 REST 전부 차단**. 앱 변경 0 | 화주·대리점의 일일청구/PDF에서 adjustment 라인이 0이 되고 인보이스 총액과 표시 합계가 어긋날 수 있음(총액은 유지). 정책 재생성 필요 | 정책 재생성 SQL |
| **B. 앱 레이어 필터** | 6~8개 화면·액션 수정 | DB 변경 없음 | 경로 누락 위험(13개+), 직접 REST는 그대로 노출 → **불충분** | 코드 롤백 |
| **C. 안전 뷰 `zen_order_costs_safe`** | 뷰+GRANT+13개 읽기 전환 | 향후 원가 범위 확장에 유연 | 변경 범위 최대, RLS/GRANT/조인 영향, 회귀 위험 높음 | 뷰 제거·읽기 원복 |

### 권장
**A안** — 비용 노출은 데이터 계층에서 막아야 하며, 앱 필터(B)는 직접 REST/누락 경로를 막지 못합니다. C는 이번 단일 행 제외에는 과합니다.
- 정책 예시:
```sql
DROP POLICY IF EXISTS "Shippers can view their order costs" ON public.zen_order_costs;
CREATE POLICY ... FOR SELECT USING (기존 조건 AND cost_type <> 'UPS_ACTUAL_ADJUSTMENT');
-- Agency 정책도 동일
```
- **인보이스·정산 계산 로직은 변경하지 않음**(이슈 지시). 총액은 스냅샷/저장값 그대로.
- 화면 표시 합계와 인보이스 총액의 차이는 **JSJung 결정 사항**으로 별도 표기(§4).

## 4. 인보이스 연결 문제 (JSJung 결정 대기)

`UPS_ACTUAL_ADJUSTMENT`는 `AGENCY_TO_SHIPPER`/`ADMIN_TO_SHIPPER` 인보이스에 `invoice_id`로 연결되어 `zen_invoices.total_amount`에 합산됩니다. A안 적용 시:
- 화주·대리점: 인보이스 **총액은 그대로**(실비 영향 포함), 비용 라인에서 adjustment만 사라짐.
- 청구 금액 자체의 노출·표시 방식은 이 이슈 범위 밖이며, 인보이스 로직은 변경하지 않습니다.

## 5. 범위 질문 — `is_revenue=false` 전체 차단 여부

| 선택 | 영향 |
|:--|:--|
| **UPS_ACTUAL_ADJUSTMENT만** (권장·이슈 제목) | 화주·대리점은 BASE_FREIGHT·FUEL·SURGE·OTHER 등 기존 원가 행을 계속 볼 수 있음(현행 유지). 화면 깨짐 없음 |
| **원가 전반(`is_revenue=false`) 차단** | `OrderFinanceSummary`·일일청구 breakdown·PDF에서 기본/유류/급증/기타가 0 또는 누락. 인보이스 총액과 표시 불일치가 광범위. 별도 설계·화면 개편 필요 |

→ 이번 이슈는 **UPS_ACTUAL_ADJUSTMENT만** 차단하고, 원가 전반은 JSJung 결정 후 별도 Task로 분리 권장.

## 6. 구현 (설계 승인 반영)

Jaison 승인(2026-11-23): **A안**, 범위는 `UPS_ACTUAL_ADJUSTMENT`만. 인보이스 총액 영향은 JSJung 결정 대기로 PR 본문에 명시.

| # | 파일 | 변경 |
|:--|:--|:--|
| 1 | `supabase/migrations/20261123110000_task_b376_cost_type_rls.sql` (신규) | `Shippers can view their order costs`·`Agency can view shipper order costs`를 `DROP/CREATE`(멱등). 기존 조건 유지 + 화주/대리점 분기에만 `cost_type <> 'UPS_ACTUAL_ADJUSTMENT'`. 관리자 정책·ADMIN/SUPER_ADMIN 분기 유지 |
| 2 | `tests/integration/task-b376-cost-adjustment-rls.test.ts` (신규) | 실제 세션·실DB: 화주/대리점 BASE 1행·ADJUSTMENT 0행, ADMIN/SUPER 2행, MANAGER 0행(현행 유지), 정책 재생성 되돌리기, 일일청구 실비 필드 0, AGENCY finalize 총액 불변 |
| 3 | `docs/02_Analysis/evidence/task-b376/order-detail-{shipper,agency}-after.png` (신규) | A안 적용 후 화면 — adjustment 라인/115 사라짐 |
| 4 | `docs/08_Self_Audit/Checklists/regression-items/TASK-B-376_Issue1442_cost-adjustment-rls.md` (신규) | R-09 회귀 항목 |

### 구현 후 실측

| TC | 결과 |
|:--|:--|
| 화주/대리점 SELECT | `['BASE_FREIGHT']` (ADJUSTMENT 0행) |
| ADMIN/SUPER_ADMIN SELECT | `['BASE_FREIGHT','UPS_ACTUAL_ADJUSTMENT']` |
| MANAGER SELECT | `[]` (기존과 동일 — `zen_order_costs`에 MANAGER 정책 없음) |
| 정책 되돌리기 | 기존 정책 재생성 시 화주/대리점에 ADJUSTMENT 1행 복구 → 제한 정책 재적용 시 0행 |
| `getShipperDailyBillingSummary` | `totalActualAdjustment=0`, base>0 |
| `getShipperDailyOrdersDetails` | `actualAdjustment=0`, base>0 |
| AGENCY `finalizeInvoice` | 호출 전후 `total_amount` 115 불변 |
| UI (실제 로그인) | 화주/대리점 주문 상세에서 adjustment 라인·115 **미표시** (`*-after.png`) |

### 화면 영향 (JSJung 결정 대기)
화주 화면 비용 합계는 `100`이 되지만 연결 인보이스 총액은 `115`로 남습니다. PDF 라인 합계도 총액보다 작아집니다. A안의 의도된 결과로 수용 가능한지 JSJung 확인이 필요합니다.

## 7. [작업 결과]

- 검증: 실DB 세션 테스트 **8/8 PASS**, 정책 되돌리기 실측, `npm run test:regression` **296 files / 2,269 tests PASS**, `npm run build` **EXIT=0**, `zen_error_logs` 신규 ERROR 0건
- 코드(마이그레이션)·테스트 커밋: `1a89e293b`
- 문서 커밋: 본 task file
- PR: #1443 (draft → ready), `Refs #1442`·`Refs #1356`


- 설계 의견 + 실측 스크린샷 2장. **구현·마이그레이션 없음.**
- 증적: `docs/02_Analysis/evidence/task-b376/order-detail-shipper.png`, `order-detail-agency.png`
- PR: #1443 (draft, `Refs #1442`·`Refs #1356`) — Jaison 검토 후 확정.
