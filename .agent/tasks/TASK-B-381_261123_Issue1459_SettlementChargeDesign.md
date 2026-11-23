# TASK-B-381 — Issue #1459: UPS 정산마감 부가운임의 화주·대리점 청구 자동 반영 (설계 의견, 2차)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) (TASK-B-377 / #1449 A 연장) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **설계 확정: JSJung** |
| **상태** | 📝 설계 의견 2차 (`status:draft`) — **구현 금지, JSJung 확정 후** |
| **브랜치** | `feature/teamb-task-b381-iss1459-settlement-charge-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **채번** | `.agent/tasks` TASK-B-381 없음 — 이슈 지정 번호 사용 |
| **공개 저장소 주의** | 노출 경위·재현 절차는 쓰지 않고 "도달 가능/불가 + 코드 위치"만 기재 |
| **2차 반영** | Jaison PR #1462 검토 보완 5건 + JSJung 결정 4(실비 통합)·5(MANAGER 별도 Task #1463) |

## 확정 규칙 (JSJung, 2026-11-23)

1. UPS 정산마감은 admin(ZENITH_SUPER_ADMIN·ADMIN·MANAGER)만.
2. 정산마감 시 수정된 청구중량으로 agent·shipper 운임 재계산(기본·유류·급증 포함).
3. 정산마감 시 추가된 부가운임은 **그대로** agent·shipper의 부가운임으로 적용.
4. 정산마감에서 입력한 부가운임은 화주(및 대리점) 청구에 **자동 반영**.
5. 기본운임·유류·급행(원가)은 admin만, 부가운임은 agent·shipper에게 **항목명·금액** 표시.
6. 화주·대리점 화면 라벨은 중립적 **"부가운임"**.

**JSJung 추가 결정(2026-11-23, Jaison 회신)**
- **결정 4**: 실비는 admin의 UPS 오더 정산마감을 통해서만 등록 → 실비 등록 경로는 **통합**(마감 경로가 단일 진실).
- **결정 5**: MANAGER 정책은 **별도 Task #1463(TASK-B-382, Baker)** 에서 설계. 이 Task에서 정책을 넓히지 않는다.

---

## 1. 현황 실측 (실DB, 2026-11-23)

### 1-1. 측정 방법과 한계 (먼저 읽을 것)

- **실DB**: 로컬 Supabase(`supabase_db_*`) + `TeamB_Dev` 마이그레이션 상태(로컬 reset 완료).
- **호출 경로**: 실제 서버 액션(`recordUpsActualCost`, `recordActualCostAndFinalize`, `recordUpsActualCharges`)을 vitest에서 직접 호출. `validateUserAction`만 ADMIN 프로필로 stub하고 **DB 클라이언트는 service-role 실연결**을 주입했다. 측정된 것은 "RLS를 통과한 뒤의 청구·인보이스 쓰기 동작"이며, **RLS 역할별 허용/거부는 이 실측 범위가 아니다**(정책은 `pg_policies` 정의만 확인).
- **`estimateUpsFreight`는 stub**. 따라서 아래 수치는 "stub가 반환한 매출"과 실제 청구 행의 관계를 보여주며, 실제 UPS 요율 계산의 정확성은 **미확인**이다.
- **픽스처**: UPS `DELIVERED` 오더 + `ADMIN_TO_AGENCY` 인보이스(80) + `AGENCY_TO_SHIPPER` 인보이스(80), 쉬퍼 인보이스에 `BASE_FREIGHT:80` 1행 연결. `ADMIN`은 `auth.users`에도 insert(마감 시 `finalized_by` FK). **주의**: 실제 인보이스 생성기는 `ADMIN_TO_AGENCY`에 비용 행을 연결하지 않는다(§1-5). 픽스처는 tier별 쓰기 동작을 같은 조건에서 비교하려고 대칭으로 연결한 것이다.
- **정리**: 측정 후 `session_replication_role=replica`로 픽스처 전부 삭제. 임시 테스트 파일은 측정 후 삭제(커밋 없음).

### 1-2. 경로 B — `recordUpsActualCost` (중량 변경 O)

입력: 기본 100 HKD + 유류 10 + 급증 5 + **기타 50 HKD**, `actualWeightKg=10`.

| 측정 대상 | 결과 |
|:--|:--|
| `zen_ups_actual_cost.other_charges_hkd` | 50 (원가 측에는 저장) |
| `zen_ups_actual_other_charges` | **0행** — B 경로는 항목명을 저장하지 않는다 |
| `zen_order_costs` | `UPS_ACTUAL_COST_ADJ:140` 1행 추가(쉬퍼 인보이스 연결). 기존 BASE 행(인보이스별 1행) 유지 |
| `ADMIN_TO_AGENCY` | **180** = stub `newAgencyTotal`(180), `metadata.platform_breakdown.otherCharges`=**5**(stub 값) |
| `AGENCY_TO_SHIPPER` | **220** = BASE 80 + ADJ 140 = stub `newShipperTotal`(220) |
| 규칙 2 | **stub 기준 배선만 확인** — 청구중량 변경 시 재계산 호출은 동작하나, 실제 요율 계산의 정확성은 미확인 |
| 규칙 3·4 | **미충족** — 입력한 기타 50 HKD는 어떤 청구 행에도 들어가지 않는다 |

**원인(코드 확인)**:
- `recomputeRevenue`가 `estimateUpsFreight`를 호출할 때 `otherCharges`를 전달하지 않는다(`src/app/actions/finance/ups-actual-cost.ts:169~180`).
- 더 근본적으로 `EstimateUpsFreightInput`에는 자유 입력 금액이 없고 **마스터 ID(`otherChargeIds?: string[]`)만** 있다(`src/app/actions/ups/freight.ts:39`). 따라서 "입력 부가운임을 견적에 넘기는" 방식은 불가능하고, **청구 행을 별도로 만드는 방향(§2)이 필수**다.
- B 경로(`ups-actual-cost.ts:202~461`, `recordUpsActualCost`)에는 `zen_ups_actual_other_charges` insert/delete가 **아예 없다**(코드 검색) → **항목명 자체가 소실**된다.

### 1-3. 경로 A — `recordActualCostAndFinalize` (중량 변경 포함)

입력: 기본 100,000 KRW + 기타 40,000 KRW(항목명 `주소정정 수수료`), **`actualWeightKg=10`**, `invoiceId=AGENCY_TO_SHIPPER`, `reason='청구확정'`.

| 측정 대상 | 결과 |
|:--|:--|
| `zen_ups_actual_cost.actual_weight_kg` | **10** (입력 중량 저장) |
| `recalc` 반환 | **없음(null)** — `recordActualCostAndFinalize`는 `recomputeRevenue`를 호출하지 않는다 |
| `zen_ups_actual_other_charges` | `주소정정 수수료:40000 KRW` 저장 |
| `zen_order_costs` | `BASE_FREIGHT:80`만 — **부가운임 청구 행 없음** |
| `AGENCY_TO_SHIPPER` | `total_amount=80`, **`is_finalized=true`** (`computeInvoiceTotal` = 연결된 `zen_order_costs` 합계) |
| `zen_invoice_history` | 1행 기록 |
| 규칙 2 | **미충족** — 중량을 입력·저장해도 화주 매출을 재계산하지 않는다 |
| 규칙 3·4 | **미충족** — 40,000원 부가운임이 청구에 없고, 그 상태로 **마감이 확정**된다 |

**코드 확인**: `recomputeRevenue` 호출은 `recordUpsActualCost`(L315)와 `previewUpsActualCost`(L528) **두 곳뿐**이다. A 경로는 원가만 저장하고 기존 비용 행 합계로 마감한다.

### 1-4. 경로 C — `recordUpsActualCharges` (현행 별도 실비 등록)

| 측정 | 결과 |
|:--|:--|
| 1회 입력 30 USD | `zen_ups_actual_charges` 행 저장(`charge_type` 코드만, **화면용 항목명 없음**), `UPS_ACTUAL_ADJUSTMENT:30` 생성, 쉬퍼 인보이스 **110**(BASE 80 + 30) |
| **2회 입력(같은 값)** | **실패** — `ADJUSTMENT_UPDATE` 오류. 원인은 §1-6의 불변 트리거 |
| 규칙 3·4 | 금액 반영은 되지만 **항목명 표시 불가**(규칙 5·6 일부 미충족), 재등록 불가 |

### 1-5. 인보이스 총액 계산 구조가 tier별로 다르다 (핵심)

| tier | 총액 산출 | 비용 행 |
|:--|:--|:--|
| `AGENCY_TO_SHIPPER` / `ADMIN_TO_SHIPPER` | 연결된 `zen_order_costs` **합계** | 있음 |
| `ADMIN_TO_AGENCY` | `metadata.platform_breakdown`(기본·유류·급증·기타) 기반 총액 | **없음** (`invoice-generator.ts:95~160`) |

- B 경로는 `ADMIN_TO_AGENCY`를 `newAgencyTotal`로 **직접 덮어쓰고**, 쉬퍼 인보이스는 연결 행 합계로 **재계산**한다(`ups-actual-cost.ts:340~445`).
- 따라서 "청구 행을 추가하면 총액이 자동 반영된다"는 **쉬퍼 tier에서만 성립**한다. `ADMIN_TO_AGENCY`는 breakdown·총액을 별도로 갱신해야 한다.
- C 경로는 `ADMIN_TO_AGENCY`에 `platformTotal + additionalSum`, 쉬퍼에는 연결 행 합계를 쓴다(`ups-actual-charges.ts:210~250`).

### 1-6. 연결된 비용 행은 불변이다 — `trg_prevent_cost_change_after_invoice` (신규, 설계 제약)

실DB 트리거 확인:

```sql
-- zen_order_costs
BEFORE DELETE OR UPDATE
  IF OLD.invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify order costs after invoice has been issued (invoice_id: %)', OLD.invoice_id;
  END IF;
```

- **인보이스에 연결된 `zen_order_costs` 행은 UPDATE·DELETE가 불가능**하다. INSERT는 허용된다.
- 이것은 이 Task 설계의 **하드 제약**이다. "청구 행을 삭제 후 재생성"하는 멱등성 설계는 **연결된 행에 대해 실행 불가**다.

### 1-7. 재정산 거동 실측 (위 트리거의 영향)

| 케이스 | 결과 |
|:--|:--|
| **B 동일 입력 2회** (같은 중량·같은 stub 매출) | 2회차 `shipperDelta=0` → ADJ 삭제는 트리거로 차단되지만 **오류를 확인하지 않아 무시**됨. 새 ADJ 미생성. 인보이스 총액 **220 유지** |
| **B 목표 변경** (1회차 shipper 220 → 2회차 250) | 2회차 `shipperDelta=30`. ADJ 삭제 실패(오류 무시) 후 ADJ **30을 추가 삽입** → ADJ 행이 `140 + 30`으로 **분절**. 인보이스 총액은 **250**(수치상 정상) |
| **C 동일 입력 2회** | 2회차 기존 ADJUSTMENT 행 UPDATE 시도 → 트리거에 막혀 **`ADJUSTMENT_UPDATE` 실패**(사용자에게 오류) |

**의미**: 현재 총액이 수치상 맞는 것은 "이전 총액 + 델타"를 다시 총액으로 쓰기 때문이다. 여기에 **부가운임 행이 총액에 포함되면, 다음 재정산의 델타가 부가운임을 상쇄해 총액에서 부가운임이 사라진다.** 따라서 새 설계는 **기준선을 분리한 append-only 델타**여야 한다(§2-2(3)). B의 삭제 오류 미확인은 DEF-B-167로 보고한다(§4).

### 1-8. 중복 반영 위험

- B는 `UPS_ACTUAL_COST_ADJ`, C는 `UPS_ACTUAL_ADJUSTMENT`로 **서로 다른 행**을 만들고 각각 총액에 반영된다. 같은 부가운임을 양쪽에 입력하면 **중복 합산 가능**(코드 확인 + 각 경로 개별 실측).
- B+C **동시 입력 end-to-end는 이번 설계에서 미실행** — 구현 착수 시 반드시 실측한다.

---

## 2. [설계 의견]

### 2-1. 반영 방식 비교

| 안 | 변경 | 장점 | 단점·위험 | 되돌리기 |
|:--|:--|:--|:--|:--|
| **A. 항목별 청구 행 + 항목명 컬럼 + append-only 델타 (권장)** | `zen_order_costs.cost_name` 추가, 정산마감 부가운임을 항목별 `is_revenue=true` 행(`cost_type='SETTLEMENT_CHARGE'`)으로 **추가만** 한다. 재정산은 델타 행 추가 | 항목명·금액·총액이 한 출처. 불변 트리거와 충돌 없음. 기존 합계·화면·PDF 구조 유지 | 델타 행 누적(표시는 항목명 집계 필요), 감액은 음수 행 필요 | 신규 `cost_type` 행 삭제(마감 전) / 음수 상쇄, 마이그레이션 롤백 |
| B. 기존 `OTHER_CHARGE`에 합계만 가산 | 새 행 1개 | 변경 최소 | **항목명 소실** → 규칙 5·6 위반 | — |
| C. 표시용 가드 함수만 (B-377 C안) | 조회 함수만 | 원가 차단 용이 | 청구 행이 없어 **총액 반영 불가** → 규칙 4 위반 | — |
| D. `zen_ups_actual_other_charges` 직접 청구 참조 | 화면이 원가 테이블을 직접 읽음 | 행 중복 없음 | 청구 합계·마감 총액과 분리, 금액 통화 불일치 | — |
| E. 전용 가변 테이블(`zen_invoice_charge_items`) + RPC | 새 테이블·표시·총액 경로 | 항목 단위 교체·감사 컬럼 가능 | 청구 총액 계산 경로가 2개로 갈라짐(누락 위험), 변경 범위 큼 | 테이블 제거 |

**권장: A안(append-only).** Jaison이 승인한 "항목별 `zen_order_costs` 행 + `cost_name`" 방향을 유지하되, §1-6 트리거 때문에 **삭제·재생성 대신 델타 추가**로 바꾼다. E안은 더 깔끔하지만 `computeInvoiceTotal`·PDF·화면·일일청구 등 총액 계산 경로를 모두 분기해야 해서 회귀 위험이 크다.

### 2-2. A안 상세

#### (1) 스키마

- `zen_order_costs.cost_name text NULL` 추가(항목명). 비정산 행은 NULL → 표시는 `cost_name ?? getCostTypeLabel(cost_type)` 폴백.
- `cost_type`은 내부 식별자로 신규 **`SETTLEMENT_CHARGE`** 사용(비관리자 라벨 "부가운임"). `cost_type` CHECK 제약은 실DB에 없다(`pg_constraint` 0건) → 값 추가에 DDL 불필요.
- 원본 금액·통화는 기존 원가 테이블(`zen_ups_actual_other_charges`)에 그대로 남는다. 청구 행에는 **인보이스 통화 환산 금액만** 저장한다.

#### (2) 생성 규칙 (tier별)

- `AGENCY_TO_SHIPPER` / `ADMIN_TO_SHIPPER`: 항목별 1행(`invoice_id` 포함 INSERT). INSERT는 트리거 제약이 없다.
- `ADMIN_TO_AGENCY`: 비용 행을 만들지 않고(§1-5)
  - `metadata.settlement_charges[]` = `{name, amount, currency}` **인보이스 통화 기준**으로 **교체**
  - `metadata.platform_breakdown.otherCharges` = 기존 운임 breakdown + 정산 부가운임 합
  - `total_amount = 정산 기준 운임(S_new) + 부가운임 합`
  - 인보이스는 가변(트리거 없음)이므로 **교체**가 가능하다.
- 두 tier에 적용하는 금액은 규칙 3의 "그대로"를 따라 **동일 명목 금액**이며, 각 인보이스 통화로 각각 환산한다.

#### (3) 멱등성·원자성 — RPC 1회 호출 (Jaison 보완 #3·#4 반영)

`supabase-js` 다중 호출로는 트랜잭션이 불가능하므로 **SQL 함수(RPC) 1회**로 묶는다.

```
apply_settlement_charges(
  p_order_id uuid, p_invoice_id uuid, p_tier text,
  p_freight_target numeric,        -- 이번 정산의 운임 목표(부가운임 제외)
  p_charges jsonb,                 -- [{name, amount, currency}] (인보이스 통화 환산 완료)
  p_currency text, p_actor uuid
) returns jsonb
```

함수 내부(단일 트랜잭션):
1. `p_order_id` 기준 advisory lock + 인보이스 `SELECT ... FOR UPDATE`.
2. 현재 연결 행을 집계: `F` = `BASE_FREIGHT`·`FUEL_SURCHARGE`·`SURGE_FEE`·`OTHER_CHARGE` 합, `A` = `UPS_ACTUAL_COST_ADJ` 합, `C(name)` = `SETTLEMENT_CHARGE`의 항목명별 합.
3. **ADJ 델타** = `p_freight_target - (F + A)` → 0이 아니면 ADJ 행 **추가**(삭제 없음).
4. **부가운임 델타** = 항목명별 `new_amount - C(name)` → 0이 아니면 `SETTLEMENT_CHARGE` 행 **추가**(음수 허용 여부는 미결, §3).
5. 쉬퍼 인보이스 `total_amount = F + A_new + C_new`.
6. `ADMIN_TO_AGENCY`면 `metadata.settlement_charges` 교체 + `platform_breakdown.otherCharges`·`total_amount = p_freight_target + C_new`.
7. 반환: `{total, charges, adjDelta}`.

- **부분 실패 없음**: 함수 내 예외 → 전체 롤백. 액션은 `success:false`만 반환(부분 성공 상태 없음). DEF-B-166과 같은 "성공 표시 vs DB 불일치"를 만들지 않는다.
- **같은 입력 2회** → 3·4의 델타가 0 → 행 추가 없음, 총액 불변.
- **목표 변경 재정산** → ADJ 델타와 항목 델타만 추가되고, 총액은 `S_new + C_new`로 정확.
- **삭제·UPDATE 없음** → 트리거와 충돌하지 않고, 기존 행 오류 미확인 문제도 발생하지 않는다.
- **정산 해제(`unmark`)**: `unmarkOrderCostSettled`는 현재 주문 상태만 되돌리고 인보이스·비용 행은 건드리지 않는다(코드 확인). 따라서 해제 후 재마감은 **델타 0**이면 아무 변화 없고, 부가운임을 바꾸면 델타 행이 추가된다. "해제 = 부가운임 제거"가 필요하면 **음수 행**이 필요하다(미결, §3).
- **RPC 보안**: `SECURITY DEFINER` + 고정 `search_path`. 역할 검사는 앱 가드와 동일하게 3역할을 기본으로 하되, **MANAGER 허용은 #1463 결과에 맞춘다**(이 Task에서 임의 결정 금지).

#### (4) 금액·통화 (미결 — §3)

- 환산: 입력 통화 → **인보이스 통화**, 기준일은 원가와 동일하게 **출고확정일(RELEASED)** `getExchangeRate(from, to, releasedDate)`.
- **`metadata.settlement_charges[]`에는 인보이스 통화 금액만** 넣는다. `original_amount`·`original_currency`(원가 통화)는 **넣지 않는다** — 인보이스 `metadata`는 화주·대리점이 SELECT 가능하므로 원가 통화 노출 경로가 된다(Jaison 보완 #5).
- 인보이스 metadata 키 전수(코드 확인): `source_order_id`, `order_no`, `rate_snapshot{exchange_rate,is_fallback}`, `platform_breakdown{baseFreight,fuelSurcharge,surgeFee,otherCharges}`, `adjustment_of`. **원가 키(`total_cost_krw` 등)는 없다.** `rate_snapshot.exchange_rate`는 기존부터 노출되는 환율이다.
- 반올림·음수·통화 기준은 §3의 미결 항목으로 두고 **두 안의 영향 범위**를 적었다.

#### (5) 실비 등록 경로 통합 (JSJung 결정 4)

권장 정리:

| 대상 | 권장 | 근거·제약 |
|:--|:--|:--|
| `recordUpsActualCharges` | **폐기(쓰기 중단)** — 전환 기간에는 명시적 `use_settlement_path` 오류 반환 후 제거 | 마감 경로가 단일 진실. #1440의 admin 가드 자체는 유지(되돌리지 않음) |
| `UpsActualAdjustmentForm` | **제거** (오더 상세·`/admin/ups-actual-charges`) | 입력 UI를 정산마감 화면(`BillingConfirmModal`/오더정산)으로 일원화. #1440의 "관리자만 렌더" 조건은 제거 전까지 유지 |
| `zen_ups_actual_charges` | **읽기 전용 이력 유지**, 테이블 DROP 없음 | #1441의 화주·대리점 SELECT 정책 제거 유지(재추가 금지). `getUpsActualCharges`·`getUpsChargeReconciliation`은 admin 가드로 읽기만 |
| `UPS_ACTUAL_ADJUSTMENT` | **기존 행 유지(이력)**, 신규 생성 중단. 신규는 `SETTLEMENT_CHARGE` | 연결 행은 트리거로 삭제 불가. 표시는 두 타입 모두 "부가운임"/항목명 |

- #1440·#1441과 모순 없음: 권한을 넓히지 않고, 정책을 재추가하지 않으며, 관리자 가드를 유지한다. 폐기는 **쓰기 경로/입력 UI**만 정리한다.

#### (6) 마감 후 추가로 발견된 실비 (JSJung 결정 4-2)

| 안 | 방식 | 장점 | 단점·영향 |
|:--|:--|:--|:--|
| **① 마감 후 조정 인보이스 (권장)** | `createPostFinalizationAdjustment`로 부가운임 델타만 새 인보이스 발행. `linkAdjustmentCosts`에 `SETTLEMENT_CHARGE` 추가, `createAdjustmentInvoice`에 `invoice_tier`·`billed_org_id` 설정 | 마감된 인보이스·이력 불변(감사 안전). 새 입력 화면 없이 정산 화면에서 처리 | 조정 인보이스의 tier/billed_org 미설정 갭을 함께 고쳐야 함(§3 #7) |
| ② `unmark` 후 재마감 | `unmarkOrderCostSettled`로 해제 → 재마감 | 흐름 단순 | 현재 `unmark`는 인보이스 `is_finalized`를 되돌리지 않는다 → 재마감하려면 **마감 취소 동작을 새로 구현**해야 하고, 확정 인보이스를 다시 쓰는 감사 위험 |

**권장: ①**. "마감을 통해서만 등록" 규칙은 유지된다(새 화면 없이 정산 화면에서 조정 인보이스 생성).

#### (7) 기존 데이터 (JSJung 결정 4-3)

- **로컬 DB 조회 결과(2026-11-23)**: `UPS_ACTUAL_ADJUSTMENT` 0행, `UPS_ACTUAL_COST_ADJ` 0행, `zen_ups_actual_charges` 0행, `zen_ups_actual_other_charges` 0행, 인보이스 0행. (로컬은 reset 상태이므로 **운영 데이터의 근거가 아니다**.)
- **운영 DB는 조회하지 않았다**(접근 없음). Jaison에게 아래 조회를 요청한다:
  ```sql
  SELECT count(*) FROM zen_order_costs WHERE cost_type IN ('UPS_ACTUAL_ADJUSTMENT','UPS_ACTUAL_COST_ADJ');
  SELECT count(*) FROM zen_order_costs WHERE cost_type='UPS_ACTUAL_ADJUSTMENT' AND invoice_id IS NOT NULL;
  SELECT count(*) FROM zen_ups_actual_charges;
  ```
- **이관 방침(권장)**: 기존 `UPS_ACTUAL_ADJUSTMENT` 행은 **삭제·변환하지 않고 이력으로 유지**(트리거로 삭제도 불가). 신규 정산은 `SETTLEMENT_CHARGE`. 표시는 두 타입을 모두 "부가운임"으로 매핑. 데이터 이관 마이그레이션은 **불필요**.

#### (8) MANAGER (JSJung 결정 5)

- `zen_order_costs`·`zen_invoices`의 MANAGER 정책은 **별도 Task #1463(TASK-B-382, Baker)** 에서 확정한다.
- 이 Task는 정책을 넓히지 않고, #1463과 겹치는 정책 변경을 하지 않는다.
- 현 정책 정의상 MANAGER는 두 테이블 SELECT/ALL 권한이 없어 RLS에서 막힌다(정책 조회 확인, MANAGER 세션 실행은 미실시). 이 Task의 RPC 역할 검사도 **#1463 결과를 따른다**.

#### (9) 화면·PDF 표시 (B-377 연계)

- 쉬퍼 tier: `zen_order_costs`의 `cost_name`을 **항목명별로 집계**해 표시(append-only 델타 누적 대응). 순액 0인 항목은 숨긴다.
- `ADMIN_TO_AGENCY`: 비용 행이 없으므로 `metadata.settlement_charges[]`로 표시.
- PDF(`src/lib/finance/pdf.ts`): `cost_name` 우선, 없으면 기존 `cost_type` 매핑. 동일하게 항목명 집계.
- `cost-type-labels.ts`: `SETTLEMENT_CHARGE: '부가운임'`, `UPS_ACTUAL_ADJUSTMENT: '부가운임'`(legacy) 추가. 관리자 화면은 `cost_name` 우선.

#### (10) R-11 API 계약

- 기존 마감 액션 입력 확장: `otherCharges: {name, amount, currency}[]`를 **청구 반영 대상**으로 사용(B는 현재 무시).
- 신규 별도 입력 액션은 만들지 않는다(마감과 분리되면 부분 성공 위험).
- 반환값: `billing?: { invoiceId, tier, total, charges: {name, amount, currency}[], adjDelta }`.
- Ds-11 갱신: `ups-actual-cost.ts`, `ups-actual-charges.ts`(폐기), `settlement.ts`(조정 연결), `daily-billing`/`OrderFinanceSummary`/`pdf.ts`, `zen_order_costs`(컬럼·cost_type), 신규 RPC.

### 2-3. 테스트 계획

1. **B**: 중량 변경 + 부가운임 2건 → 쉬퍼 총액 = 재계산 운임 + 부가운임 합, `ADMIN_TO_AGENCY` 총액 = `platform_breakdown` 합(부가운임 포함) 일치.
2. **A**: **중량 변경 포함** 입력 → 재계산 여부는 §3 #1 결정에 따른 기대값으로 검증. 마감 전 부가운임이 청구 행으로 생성되고 `is_finalized=true` 총액에 포함.
3. **멱등성(필수)**: 같은 입력 2회 → 행 수·총액 불변. 목표 변경 재마감 → ADJ 델타만 추가, 부가운임 유지, 총액 = 새 운임 + 부가운임.
4. **원자성**: RPC 내부 실패 주입 → 전체 롤백, 부분 성공 없음.
5. **C 통합**: 전환 기간 `recordUpsActualCharges` 호출 시 명시적 폐기 오류(기존 `ADJUSTMENT_UPDATE`가 아님).
6. **마감 후 조정**: 조정 인보이스 생성 + `invoice_tier`·`billed_org_id` 설정 실측(§3 #7).
7. **중복(B+C)**: 같은 항목을 양쪽에 입력했을 때 합계 1회/2회 — **구현 착수 시 필수 실측**.
8. **세션 매트릭스**: SHIPPER·AGENCY·ADMIN·MANAGER 각각 인보이스·청구 행 조회/표시. MANAGER 결과는 #1463 전까지 현 정책 그대로 기록.
9. **화면**: before/after 스크린샷(화주·대리점), `cost_name` 폴백으로 기존 화면 무회귀.
10. `npm run test:regression` PASS.

### 2-4. 마이그레이션·롤백 분리

| # | 내용 | 적용 시점 | 롤백 |
|:-:|:--|:--|:--|
| M1 | `zen_order_costs.cost_name text NULL` 추가 | **앱 배포 전**(의존성) | `DROP COLUMN cost_name` |
| M2 | RPC `apply_settlement_charges` 생성(SECURITY DEFINER, search_path 고정) | 앱 배포 전 | `DROP FUNCTION` |
| M3 | (승인 시) `recordUpsActualCharges` 폐기·UI 제거 — **DDL 없음** | 앱 배포 | 코드 롤백 |

- 원가 테이블(`zen_ups_actual_cost`) 정책 변경은 TASK-B-377 범위이며 이 Task에 포함하지 않는다.
- MANAGER 정책은 #1463 범위이며 이 Task에 포함하지 않는다.

---

## 3. 미확인·미결 (unknown으로 명시)

| # | 항목 | 상태 / 두 안의 영향 |
|:-:|:--|:--|
| 1 | **A 경로에서 청구중량이 바뀌어도 재계산해야 하는가** (규칙 2 범위) | **미결 — JSJung**. 안1(재계산): A에 `recomputeRevenue` 추가 → 마감 총액이 실제 중량 기준으로 바뀜, 기존 마감 데이터와 불일치 가능, 테스트 확대. 안2(현행): 원가만 갱신, 화주 청구는 견적 중량 유지 → 규칙 2 위반 소지 |
| 2 | 반올림 기준 | **미결 — JSJung**. 안1(항목별 2자리): 항목 합과 총액이 1~2센트 차이 가능. 안2(합산 후): 항목 표시 합과 총액이 1~2센트 차이 가능 |
| 3 | 음수(크레딧) 허용 | **미결 — JSJung**. 허용: append-only 감액·해제 가능, 총액 감소·환불 처리 필요. 불허: 마감 전만 변경 가능, 마감 후는 조정 인보이스 필수 |
| 4 | 통화 환산 기준일 | **미결 — JSJung**. 안1(출고확정일): 원가와 일관. 안2(인보이스 발행일): 청구 시점 기준이나 원가와 불일치 |
| 5 | tier 간 통화가 다를 때 | **미결 — JSJung**. 각 인보이스 통화로 개별 환산(권장) vs 기준 통화 1개 |
| 6 | B+C 동시 입력 시 실제 중복 합산 | **미실행 — 구현 착수 시 실측** |
| 7 | 마감 후 조정 인보이스의 `invoice_tier`/`billed_org_id` 미설정 영향 | **미확인(코드 확인)** — `createAdjustmentInvoice`가 두 컬럼을 넣지 않음. 테스트 계획 6에서 실측 |
| 8 | 운영 DB의 기존 `UPS_ACTUAL_ADJUSTMENT`/`zen_ups_actual_charges` 데이터 | **미조회** — Jaison에게 조회 요청(§2-2(7) SQL) |
| 9 | RPC의 MANAGER 허용 여부 | **#1463 결과 대기** — 이 Task에서 결정하지 않음 |
| 10 | 실제 UPS 요율에서 입력 부가운임이 estimate에 어떻게 반영되어야 하는지 | **미확인 — 요율 담당**. `otherChargeIds`(마스터 ID)만 입력 가능하므로 자유 입력은 청구 행으로만 처리 |

---

## 4. 관련 DEF (R-18, 수정 금지·보고만)

| DEF | 내용 | 이 Task와의 관계 |
|:--|:--|:--|
| **DEF-B-165** | 일괄 마감 `finalizeDailyShipperInvoices` AGENCY 허용·UPS 포함 가능·success true vs DB 미변경 | 규칙 1(마감 admin 전용)과 충돌. 이 Task는 일괄 마감을 변경하지 않는다 |
| **DEF-B-166** | `markInvoiceFinalized` 0행 무시 + `zen_invoice_history` 거짓 기록·MANAGER 마감 실패 경로 | RPC 원자성 설계로 같은 문제군을 회피한다. 정책은 #1463 |
| **DEF-B-167** | 연결 비용 행 불변 트리거 + 재정산 오류 미확인 → ADJ 행 분절·C 재등록 실패 | §1-6·§1-7 실측 근거. 이 Task에서 수정하지 않고 append-only 설계로 회피 |

상세: **DEF-B-167**은 이 브랜치의 `.agent/defects/DEF-B-167_*.md`. **DEF-B-165·166**은 TASK-B-377 브랜치(PR #1454)에 등록되어 있고 이 브랜치에는 아직 없다(중복 생성하지 않음).

## 5. [작업 결과]

- **설계 의견 2차**: Jaison 보완 5건 + JSJung 결정 4·5 반영. 코드·마이그레이션 변경 없음.
- 신규 실측: A 경로 중량 변경(재계산 없음), 연결 비용 행 불변 트리거, B 재정산 거동(동일/목표 변경), C 2회차 실패.
- 신규 DEF-B-167 보고.
- 연계: TASK-B-377(#1451, PR #1454)의 표시 설계가 이 Task의 청구 행 결과를 소스로 사용한다. **B-377의 항목 표시는 이 Task의 `cost_name`/`metadata.settlement_charges` 확정에 의존**한다.
- PR: #1462 (draft, `Refs #1459`, `Refs #1451`).
