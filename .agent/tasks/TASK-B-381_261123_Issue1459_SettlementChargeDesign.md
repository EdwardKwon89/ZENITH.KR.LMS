# TASK-B-381 — Issue #1459: UPS 정산마감 부가운임의 화주·대리점 청구 자동 반영 (설계 의견, 3차)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) (TASK-B-377 / #1449 A 연장) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **설계 확정: JSJung** |
| **상태** | 📝 설계 의견 3차 (`status:draft`) — **구현 금지, JSJung 확정 후** |
| **브랜치** | `feature/teamb-task-b381-iss1459-settlement-charge-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **채번** | `.agent/tasks` TASK-B-381 없음 — 이슈 지정 번호 사용 |
| **공개 저장소 주의** | 노출 경위·재현 절차는 쓰지 않고 "도달 가능/불가 + 코드 위치"만 기재 |
| **3차 반영** | Jaison 2차 검토 보완 4건 + JSJung 결정 6건(A·B 통합 포함) + 운영 데이터 업무 확인 |

## 확정 규칙·결정

### 기본 규칙 (JSJung, 2026-11-23)
1. UPS 정산마감은 admin(ZENITH_SUPER_ADMIN·ADMIN·MANAGER)만.
2. 정산마감 시 수정된 청구중량으로 agent·shipper 운임 재계산(기본·유류·급증 포함).
3. 정산마감 시 추가된 부가운임은 **그대로** agent·shipper의 부가운임으로 적용.
4. 정산마감에서 입력한 부가운임은 화주(및 대리점) 청구에 **자동 반영**.
5. 기본운임·유류·급행(원가)은 admin만, 부가운임은 agent·shipper에게 **항목명·금액** 표시.
6. 화주·대리점 화면 라벨은 중립적 **"부가운임"**.

### 확정 결정 (2026-11-23, JSJung)
| # | 확정 내용 |
|:-:|:--|
| 1 | **경로 A에서도 청구중량이 바뀌면 화주 운임을 재계산**한다(규칙 2는 "정산마감 시" 전반). |
| 2 | 부가운임 반올림은 **항목별 반올림 후 합산**. 항목 표시 합 = 청구 총액. |
| 3 | **음수(감액) 행 허용 — admin 입력에 한해.** 델타 append-only 구조에서 감액·해제는 음수 행. |
| 4 | 환율 기준일 = **출고확정일**(원가와 동일). |
| 5 | 인보이스 통화가 다르면 **인보이스별 통화로 각각 환산**. |
| 6 | **정산마감 경로 A·B를 하나의 정산마감 동작으로 통합**한다. |
| 7 | 실비 등록은 **정산마감을 통해서만**(C 경로 통합). |
| 8 | MANAGER 정책은 **별도 Task #1463(TASK-B-382, Baker)** 에서 설계. |

---

## 1. 현황 실측 (실DB, 2026-11-23)

### 1-1. 측정 방법과 한계

- **실DB**: 로컬 Supabase + `TeamB_Dev` 마이그레이션 상태(reset 완료).
- **호출**: 실제 서버 액션을 vitest에서 직접 호출. `validateUserAction`만 ADMIN으로 stub, **DB는 service-role 실연결**. 즉 "RLS 통과 후의 쓰기 동작"만 측정했고 **RLS 역할별 허용/거부는 미측정**(정책은 `pg_policies` 정의만 확인).
- **`estimateUpsFreight`는 stub** — 실제 UPS 요율 계산의 정확성은 미확인.
- **픽스처**: UPS `DELIVERED` 오더 + `ADMIN_TO_AGENCY`(80) + `AGENCY_TO_SHIPPER`(80), 쉬퍼 인보이스에 `BASE_FREIGHT:80` 연결. `ADMIN`은 `auth.users`에도 insert.
- 측정 후 `session_replication_role=replica`로 전부 삭제, 임시 테스트 파일 삭제.

### 1-2. 경로 B — `recordUpsActualCost`

입력: 기본 100 HKD + 유류 10 + 급증 5 + **기타 50 HKD**, `actualWeightKg=10`.

| 측정 대상 | 결과 |
|:--|:--|
| `zen_ups_actual_cost.other_charges_hkd` | 50 (원가 측 저장) |
| `zen_ups_actual_other_charges` | **0행** — B는 항목명을 저장하지 않는다 |
| `zen_order_costs` | `UPS_ACTUAL_COST_ADJ:140` 추가(쉬퍼 인보이스 연결) |
| `ADMIN_TO_AGENCY` | **180** = stub `newAgencyTotal`, breakdown.otherCharges=5(stub) |
| `AGENCY_TO_SHIPPER` | **220** = BASE 80 + ADJ 140 |
| 규칙 2 | **stub 기준 배선만 확인**, 실제 요율 정확성 미확인 |
| 규칙 3·4 | **미충족** — 입력 기타 50은 어떤 청구 행에도 없음 |

**원인(코드)**:
- `recomputeRevenue`가 `estimateUpsFreight` 호출 시 `otherCharges`를 전달하지 않는다(`ups-actual-cost.ts:169~180`).
- 근본적으로 입력 타입에 자유 입력 금액이 없고 **마스터 ID(`otherChargeIds`)만** 있다(`src/app/actions/ups/freight.ts:39`).
- B 경로(`ups-actual-cost.ts:202~461`)에는 `zen_ups_actual_other_charges` 쓰기가 없다.

### 1-3. 경로 A — `recordActualCostAndFinalize`

입력: 기본 100,000 KRW + 기타 40,000 KRW(`주소정정 수수료`), **`actualWeightKg=10`**, `invoiceId`, `reason`.

| 측정 대상 | 결과 |
|:--|:--|
| `zen_ups_actual_cost.actual_weight_kg` | **10** 저장 |
| `recalc` 반환 | **없음(null)** — A는 `recomputeRevenue`를 호출하지 않는다 |
| `zen_ups_actual_other_charges` | `주소정정 수수료:40000 KRW` |
| `zen_order_costs` | `BASE_FREIGHT:80`만 |
| `AGENCY_TO_SHIPPER` | `total_amount=80`, **`is_finalized=true`** |
| 규칙 2·3·4 | **모두 미충족**(중량 저장만, 매출 재계산 없음, 부가운임 청구 없음, 그 상태로 마감) |

`recomputeRevenue` 호출은 `recordUpsActualCost`(L315)·`previewUpsActualCost`(L528) 두 곳뿐이다.

### 1-4. 경로 C — `recordUpsActualCharges`

| 측정 | 결과 |
|:--|:--|
| 1회 30 USD | `zen_ups_actual_charges` 행 + `UPS_ACTUAL_ADJUSTMENT:30`, 쉬퍼 인보이스 **110** |
| **2회 같은 값** | **실패** `ADJUSTMENT_UPDATE` — §1-6 트리거 |
| 규칙 5·6 | **항목명 없음**(`zen_ups_actual_charges`는 `charge_type` 코드만) |

### 1-5. 청구 총액 구조 (tier별)

| tier | `zen_invoices` 총액 | 비용 행 |
|:--|:--|:--|
| `AGENCY_TO_SHIPPER` / `ADMIN_TO_SHIPPER` | 연결된 `zen_order_costs` 합계 | 있음 |
| `ADMIN_TO_AGENCY` | `metadata.platform_breakdown` 기반 | **없음** (`invoice-generator.ts:95~160`) |

### 1-6. 연결 비용 행 불변 트리거 (설계 하드 제약)

```sql
-- zen_order_costs: BEFORE DELETE OR UPDATE
IF OLD.invoice_id IS NOT NULL THEN
  RAISE EXCEPTION 'Cannot modify order costs after invoice has been issued (invoice_id: %)', OLD.invoice_id;
END IF;
```

- 인보이스 연결 행은 **UPDATE·DELETE 불가**, INSERT만 가능.
- 실측: B 재정산 시 ADJ 삭제가 차단되지만 **오류를 확인하지 않아 무시**됨. 목표 변경(220→250) 시 ADJ가 `140 + 30`으로 분절(총액 250). C 2회차는 `ADJUSTMENT_UPDATE` 실패.
- **DEF-B-167**로 보고(§4).

### 1-7. 재정산 거동 요약

| 케이스 | 결과 |
|:--|:--|
| B 동일 입력 2회 | ADJ 삭제 실패(무시), 델타 0 → 총액 220 유지 |
| B 목표 변경 | ADJ 행 분절(140+30), 총액 250 |
| C 동일 입력 2회 | `ADJUSTMENT_UPDATE` 실패 |

총액이 수치상 맞는 것은 "이전 총액 + 델타"를 다시 총액으로 쓰기 때문이다. **부가운임 행이 총액에 포함되면 다음 델타가 부가운임을 상쇄**한다 → 기준선 분리 append-only가 필수.

### 1-8. 청구 산출물이 둘이다 (중요 전제)

| 산출물 | 화면 | 금액 소스 | 통화 |
|:--|:--|:--|:--|
| `zen_invoices` | `/finance/daily-billing`, `BillingConfirmModal` | 쉬퍼=연결 `zen_order_costs` 합 / 대리점=`platform_breakdown` | USD 등 |
| `zen_billing_statements` | `/finance/statements` | RPC `billing_items_amounts` | 헤더 **KRW** |

`billing_items_amounts`(마이그레이션 `20261120090000_task_b360...sql`):
- 쉬퍼 tier: `line_total` = **`is_revenue=true` 전체 합**(모든 cost_type), `other_charges` = line_total − 기본·유류·급증 → **`SETTLEMENT_CHARGE` 행이 자동 포함**된다.
- `ADMIN_TO_AGENCY`: 금액이 `zen_order_rate_snapshots.metadata`(agency/platform)에서 온다 → **비용 행이 반영되지 않는다**.
- 비KRW 매출 행이 있으면 `unsupported_cost_currency`로 **statement 생성이 차단**된다(기존 제약, UPS 비용은 USD).

**이 설계는 결정 5에 따라 `zen_invoices`(인보이스별 통화)를 기준으로 한다.** statement 이관 시의 통화·대리점 소스 문제는 §3 #4로 남긴다.

---

## 2. [설계 의견]

### 2-1. 통합 정산마감 동작 (결정 6)

#### (1) 동작 순서 — `finalizeUpsSettlement(orderId, input)`

| # | 단계 | 내용 |
|:-:|:--|:--|
| 1 | 권한·상태 | `validateUserAction()` **세션 클라이언트** + admin 3역할 가드, UPS·`DELIVERED`·`cost_settlement_status <> 'SETTLED'` 확인 |
| 2 | 인보이스 확인 | `metadata->>source_order_id` 기준 비취소 인보이스 조회. **없으면 `invoice_not_found`로 거부**(인보이스 생성은 별도 단계, 숨은 비용 재계산 방지). **하나라도 `is_finalized=true`면 `invoice_finalized`로 거부** → 조정 인보이스 경로(§2-3) |
| 3 | 원가 확정 | 기존 B/A의 원가 저장 로직(`zen_ups_actual_cost` upsert, +7% 기본운임, 환율·`total_cost_krw`) |
| 4 | 매출 재계산 (규칙 2) | 입력에 중량·치수가 있으면 **A에서도** `recomputeRevenue` 호출 → `newAgencyTotal`·`newShipperTotal` |
| 5 | 부가운임 환산 | 항목별로 **인보이스 통화**로 환산(출고확정일 환율), **항목별 2자리 반올림** |
| 6 | DB 원자 처리 (RPC 1회) | `finalize_ups_settlement(...)`: 기준선·ADJ·부가운임·legacy 계산 → 델타 INSERT → 인보이스 총액 갱신 → **인보이스 마감** → 주문 `SETTLED` 를 **한 트랜잭션**으로 처리 |
| 7 | 후속 | 마감 이메일(best-effort), `revalidatePath` |

**마감 포함 여부**: **6단계에서 마감까지 포함**을 권장한다. 별도 단계로 두면 "SETTLED인데 인보이스 미마감" 또는 그 반대의 부분 상태가 생긴다. 화면의 "미리보기"와 "임시 저장"은 유지하되, **정산마감 동작은 하나**로 둔다.

> **동작 변경 주의**: 기존 `markOrderCostSettled`의 `legacy_invoiced_order` 가드(B-366)는 "레거시 인보이스가 있으면 정산 금지"였다. 통합 동작에서는 **인보이스가 청구 대상**이므로 이 가드를 **"인보이스 존재 + 미마감"** 으로 대체한다. 의도된 변경이지만 회귀 위험 항목으로 §2-8에 포함한다. 단, §3 #4에서 청구 단위가 statement로 확인되면 2단계 전제도 함께 바뀐다.

| 안 | 장점 | 단점 |
|:--|:--|:--|
| **(a) 마감 포함 단일 동작 (권장)** | 규칙 2·3·4가 한 트랜잭션에서 보장, 상태 불일치 없음 | 입력이 많은 폼에서 한 번에 확정(프리뷰/임시저장으로 완화) |
| (b) 저장과 마감 분리 | 기존 UX 유지 | 부분 상태·재시도 복잡, "SETTLED vs 미마감" 불일치 |

#### (2) 기존 액션·화면 정리 (호출처 전수)

**grep 결과(2026-11-23, `src/`)**:

| 대상 | 호출처 |
|:--|:--|
| `recordActualCostAndFinalize` | `src/components/finance/BillingConfirmModal.tsx:6,118` |
| `recordUpsActualCost` | `src/components/finance/order-settlement/OrderSettlementDetail.tsx:15,192` / `src/components/orders/UpsActualAdjustmentForm.tsx:5,143` |
| `previewUpsActualCost` | `BillingConfirmModal.tsx:6,79` / `OrderSettlementDetail.tsx:14,153` / `UpsActualAdjustmentForm.tsx:5,125` |
| `recordUpsActualCharges` | `src/components/orders/UpsActualAdjustmentForm.tsx:4,243` |
| `markOrderCostSettled` / `unmarkOrderCostSettled` | `OrderSettlementDetail.tsx:16,17,213,214` / `finance/index.ts:36,37` |
| `BillingConfirmModal` | `src/components/finance/ShipperDailyBillingClient.tsx:28,693` |
| `UpsActualAdjustmentForm` | `admin/ups-actual-charges/ups-actual-charges-client.tsx:5,123` / `orders/[orderId]/page.tsx:30,568` |
| `OrderSettlementDetail` | `finance/order-settlement/[orderId]/page.tsx:8,159` |

**권장 정리**:

| 대상 | 권장 | 비고 |
|:--|:--|:--|
| `finalizeUpsSettlement` | **신규 통합 액션** | 이 Task의 단일 정산마감 진입점 |
| `previewUpsActualCost` | 유지(이름 유지), 반환에 **tier별 청구 총액·항목 합** 추가 | 미리보기 전용 |
| `recordUpsActualCost` | `saveUpsSettlementDraft`로 대체. 전환 기간에는 기존 이름을 **얇은 래퍼**로 유지 후 제거 | 청구 행을 만들지 않는 임시 저장 |
| `recordActualCostAndFinalize` | **제거**(BillingConfirmModal 이관 후) | A 단독 경로 폐기 |
| `recordUpsActualCharges` | **폐기** — 전환 기간에는 `use_settlement_path` 오류, 이후 제거 | #1440 admin 가드는 유지 |
| `markOrderCostSettled` | RPC로 흡수(내부 전용) | 외부 호출 제거 |
| `unmarkOrderCostSettled` | 유지 — **상태만** 되돌림 | 마감된 인보이스가 있으면 거부(§2-4) |
| `BillingConfirmModal` | **제거** — daily-billing의 청구확정 버튼을 `/finance/order-settlement/[orderId]` **링크로 대체** | 중복 입력 화면 제거 |
| `UpsActualAdjustmentForm` | **제거** — admin 페이지는 읽기 전용 이력으로 | C 입력 UI 폐기 |
| `OrderSettlementDetail` | **단일 정산마감 화면** — 항목별 부가운임 입력·마감 버튼 추가 | 기존 중량·치수·원가 입력 유지 |

#### (3) R-11 API 계약

```
finalizeUpsSettlement(orderId: string, input: {
  upsInvoiceNo?: string; upsInvoiceDate?: string;
  actualWeightKg?: number; actualLengthCm?: number; actualWidthCm?: number; actualHeightCm?: number;
  baseFreight: { amount: number; currency: 'KRW'|'USD'|'HKD' };
  fuelSurcharge: { amount: number; currency: string };
  surgeFee: { amount: number; currency: string };
  otherChargesTotal?: { amount: number; currency: string };
  otherCharges: { name: string; amount: number; currency: string }[];  // 음수 허용(admin)
  reason?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  settled?: boolean;
  invoices?: { id: string; tier: string; currency: string; total: number }[];
  charges?: { name: string; amount: number; currency: string }[];
  recalculated?: { newAgencyTotal: number; newShipperTotal: number };
  error?: string;
}>
```

- **오류**: `permission_denied`·`order_not_found`·`not_ups_order`·`ups_actual_cost_status_invalid`·`already_settled`·`invoice_not_found`·`invoice_finalized`·`invoice_canceled`·`unsupported_cost_currency`·`currency_conversion_failed`·`rpc_failed`.
- **Ds-11 반영 위치**: `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md`(UPS 실비·정산), `docs/02_Analysis/ds11/Ds_11_04_Finance_Settlement.md`(마감·인보이스), 필요 시 인덱스 `docs/02_Analysis/Ds_11_API_상세_명세서.md`. R-12에 따라 **구현 PR에서 동시 갱신**.

### 2-2. RPC 상세 — `finalize_ups_settlement`

**시그니처(제안)**

```
finalize_ups_settlement(
  p_order_id uuid, p_invoice_ids uuid[], p_reason text,
  p_agency_freight_target numeric, p_shipper_freight_target numeric,
  p_agency_charges jsonb, p_shipper_charges jsonb
) returns jsonb
```

**계산식 (legacy 포함 — 보완 1)**

- `F` = `BASE_FREIGHT`·`FUEL_SURCHARGE`·`SURGE_FEE`·`OTHER_CHARGE` 합
- `A` = `UPS_ACTUAL_COST_ADJ` 합
- **`L` = legacy `UPS_ACTUAL_ADJUSTMENT` 합** (C가 만든 이력)
- `C` = `SETTLEMENT_CHARGE` 합(항목명별)
- **ADJ 델타** = `target - (F + A)` → 0이 아니면 INSERT (`L`은 기준선에서 제외)
- **부가운임 델타** = 항목명별 `new - C(name)` → 0이 아니면 INSERT(음수 허용)
- **총액** = `F + A_new + C_new + L` (쉬퍼 tier)
- `ADMIN_TO_AGENCY` = `target + C_new + L` (L은 방어적, 실제 0 예상)
- `computeInvoiceTotal`(연결 행 전체 합)과 **정확히 일치**해야 한다.

**인보이스 상태 (보완 2)**

- `is_finalized=true` → **거부**(`invoice_finalized`) → 조정 인보이스 경로.
- `status='CANCELED'` → **거부**(`invoice_canceled`).
- `p_invoice_ids`가 비었거나 주문의 인보이스와 불일치 → 거부.
- 주문이 이미 `SETTLED` → 거부(`already_settled`).

**보안 (보완 3)**

- `SECURITY DEFINER`, `SET search_path = public`(고정).
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon;` → `GRANT EXECUTE ... TO authenticated;`
- 함수 내부에서 `auth.uid()`로 `zen_profiles.role` 조회 → **ADMIN·ZENITH_SUPER_ADMIN** 허용(MANAGER는 #1463 결과 후). `auth.uid()`를 actor로 사용하며 **파라미터로 actor를 받지 않는다**.
- 앱은 **세션 클라이언트**로 호출(`createAdminClient` 금지 — `auth.uid()`가 비어 검사가 무의미해짐).
- 테스트: SHIPPER·AGENCY·anon 직접 RPC **거부**, ADMIN **양성 대조**.

**원자성**

- 위 모든 쓰기(비용 행·총액·마감 플래그·history·주문 상태)를 함수 1회로 처리. 예외 시 전체 롤백 → 부분 성공 없음(DEF-B-166 문제군 회피).
- 마감 이메일은 함수 밖 best-effort.

### 2-3. 마감 후 조정 (확정 결정 3·7)

- 마감된 인보이스에 부가운임이 추가로 발견되면 **`createPostFinalizationAdjustment`로 조정 인보이스**를 발행한다(새 입력 화면 없음).
- 보완: `linkAdjustmentCosts`가 `UPS_ACTUAL_ADJUSTMENT`만 연결하므로 **`SETTLEMENT_CHARGE`도 연결 대상**에 추가하고, `createAdjustmentInvoice`에 `invoice_tier`·`billed_org_id`를 설정한다(현재 미설정, §3 #5).
- **감액**은 음수 행(결정 3)으로 처리. 조정 인보이스 금액도 음수 가능.
- 정산 해제(`unmark`)는 **상태만** 되돌리고 청구는 유지한다. 청구를 0으로 만들려면 부가운임 0으로 재마감(음수 델타)한다.

### 2-4. 정산 해제·재마감

- `unmarkOrderCostSettled`는 현재 상태만 되돌린다(코드 확인).
- **마감된 인보이스가 있으면 해제를 거부**하고 조정 경로를 안내한다(감사 보호).
- 마감 전이면 해제 후 재마감 시 append-only 델타가 0 또는 조정치만 추가된다.

### 2-5. 실비 경로 정리 (결정 7 + JSJung 업무 확인)

**운영 사용 이력 없음(JSJung 업무 확인)** — DB 조회로 검증한 것이 아니다. 로컬 0행은 운영 근거가 아니다.

| 안 | 내용 | 장점 | 단점·위험 |
|:--|:--|:--|:--|
| **(a) 읽기 전용 이력 유지 (권장)** | `zen_ups_actual_charges`·`UPS_ACTUAL_ADJUSTMENT` 행 유지, 쓰기만 중단. `getUpsActualCharges`·`getUpsChargeReconciliation`은 admin 읽기 | 롤백 쉬움, 과거 이력 보존 | 사용되지 않는 테이블·정책 잔존 |
| (b) 테이블·정책·액션 완전 제거 | 마이그레이션으로 테이블 DROP + 정책·액션 제거 + 롤백 SQL | 스키마 단순화 | **DROP은 되돌릴 수 없음**, 이력 소실, #1440/#1441 산출물과 충돌 검토 필요 |

- **이 Task에서는 (a)**. (b)는 JSJung 최종 결정 사항으로 남긴다(§3 #2).
- `recordUpsActualCharges`는 폐기 오류 후 제거, `UpsActualAdjustmentForm`은 제거. #1440의 admin 가드와 #1441의 정책 제거는 **유지**하며 권한을 넓히지 않는다.

### 2-6. 화면·PDF 표시

- 쉬퍼 tier: `cost_name`을 **항목명별 집계**해 표시(append-only 델타). 순액 0 항목은 숨김.
- `ADMIN_TO_AGENCY`: `metadata.settlement_charges[]`(인보이스 통화 금액만)로 표시.
- PDF: `cost_name` 우선, 없으면 기존 매핑. 항목별 반올림 합 = 총액.
- `cost-type-labels.ts`: `SETTLEMENT_CHARGE: '부가운임'`, `UPS_ACTUAL_ADJUSTMENT: '부가운임'`(legacy).
- B-377(#1451)의 표시 설계는 이 Task의 `cost_name`/`metadata.settlement_charges` 결과를 소스로 사용한다.

### 2-7. 테스트 계획

1. **같은 입력 2회**: 행 수·총액 불변(필수).
2. **중량 변경 재계산**: A·B 모두 `newShipperTotal`·`newAgencyTotal` 반영, ADJ 델타 정확.
3. **부가운임 음수 행**: 감액 후 총액 감소, 항목 표시 합 = 총액.
4. **환산·반올림**: 항목별 반올림 합 = 총액, KRW/USD/HKD 입력.
5. **통화가 다른 두 인보이스**: 각 인보이스 통화로 환산, 각 총액 정합.
6. **legacy `L`**: `UPS_ACTUAL_ADJUSTMENT` 연결 행이 있는 인보이스에서 총액 = F+A+C+L, ADJ 기준선에서 L 제외.
7. **마감·취소 인보이스 거부**: `invoice_finalized`·`invoice_canceled`, 조정 경로 안내.
8. **RPC 보안**: SHIPPER·AGENCY·anon 거부, ADMIN 양성 대조, MANAGER 현 상태 기록.
9. **원자성**: RPC 내부 실패 주입 → 전체 롤백.
10. **마감 후 조정**: 조정 인보이스 `invoice_tier`·`billed_org_id` 설정 실측.
11. **세션 매트릭스**: SHIPPER·AGENCY·ADMIN·MANAGER 조회/표시.
12. **화면**: before/after 스크린샷, 기존 화면 무회귀(폴백).
13. **statement 영향(전제 확인)**: UPS 청구가 statement로 이관된 경우를 가정해 `billing_items_amounts`의 `line_total` 포함 여부·비KRW 차단을 기록(§3 #4).
14. `npm run test:regression` PASS.

### 2-8. 마이그레이션·전환 순서

| # | 내용 | 시점 | 롤백 |
|:-:|:--|:--|:--|
| M1 | `zen_order_costs.cost_name text NULL` | 앱 배포 전 | `DROP COLUMN` |
| M2 | RPC `finalize_ups_settlement`(+ 보안 GRANT/REVOKE) | 앱 배포 전 | `DROP FUNCTION` |
| M3 | (statement 사용 시) `billing_items_amounts`의 `ADMIN_TO_AGENCY` `other_charges`에 `SETTLEMENT_CHARGE` 합 포함 | 앱 배포 전 | 함수 원복 |

**앱 변경(DDL 없음)**: 통합 액션·화면 전환, `recordUpsActualCharges` 폐기, `UpsActualAdjustmentForm`·`BillingConfirmModal` 제거, `recordActualCostAndFinalize` 제거. (마이그레이션 표에서 제외)

**단계적 전환**:
1. Ds-11 확정 → M1·M2(+M3) 배포(추가형, 기존 앱 무영향).
2. 앱에 통합 액션·화면 추가(기존 액션 유지).
3. 화면을 통합 액션으로 전환, C 입력 UI 제거.
4. 안정화 후 기존 액션·모달 제거. 테이블 DROP은 JSJung 결정 후 별도.

**호환**:
- 마감 전 인보이스: 통합 액션이 그대로 처리.
- 마감된 인보이스: `invoice_finalized` 거부 → 조정 인보이스.
- 기존 `UPS_ACTUAL_COST_ADJ`·`UPS_ACTUAL_ADJUSTMENT` 행: 삭제하지 않고 기준선/legacy로 반영.
- 진행 중 draft(원가만 저장): 재사용.

---

## 3. 남은 확인 항목

| # | 항목 | 상태 |
|:-:|:--|:--|
| 1 | 운영 기존 데이터 | **조회하지 않음 — JSJung 업무 확인: 실비 등록 기능 사용 이력 없음**(DB 조회 검증 아님). 로컬 0행은 운영 근거 아님 |
| 2 | `zen_ups_actual_charges` 테이블·정책 완전 제거 여부 | **JSJung 최종 결정**(DROP은 비가역). 이 Task는 (a) 이력 유지 |
| 3 | RPC의 MANAGER 허용 | **#1463 결과 대기** — 이 Task에서 결정하지 않음 |
| 4 | 청구 단위(`zen_invoices` vs `zen_billing_statements`) 및 statement의 `ADMIN_TO_AGENCY` 비용 행 소스 | **Jaison 확인** — 이 설계는 결정 5에 따라 `zen_invoices` 기준. statement 이관 시 M3·통화 가드 정리 필요 |
| 5 | 조정 인보이스 `invoice_tier`/`billed_org_id` 미설정 | **코드 확인** — 테스트 10에서 실측 |
| 6 | 실제 UPS 요율 정확성 | **미확인 — 요율 담당** |
| 7 | `unmark` 후 재마감 시 음수 처리 정책 | 결정 3으로 음수 행 사용. 마감된 인보이스는 해제 거부(§2-4) |

---

## 4. 관련 DEF (R-18, 수정 금지·보고만)

| DEF | 내용 | 관계 |
|:--|:--|:--|
| **DEF-B-165** | 일괄 마감 AGENCY 허용·UPS 포함 가능·success true vs DB 미변경 | 규칙 1. 이 Task는 일괄 마감 미변경 |
| **DEF-B-166** | `markInvoiceFinalized` 0행 무시·history 거짓 기록·MANAGER 실패 | RPC 원자성으로 회피. 정책은 #1463 |
| **DEF-B-167** | 연결 비용 행 불변 트리거 + 재정산 오류 미확인 → ADJ 분절·C 재등록 실패 | §1-6·§1-7 실측. append-only로 회피 |

DEF-B-165·166은 TASK-B-377 브랜치(PR #1454)에 등록되어 있고 이 브랜치에는 없다(중복 생성하지 않음). DEF-B-167은 이 브랜치에 있다.

## 5. [작업 결과]

- **설계 의견 3차**: Jaison 2차 보완 4건 + JSJung 결정 6건(A·B 통합) 반영. 코드·마이그레이션 변경 없음.
- 통합 정산마감 동작(순서·마감 포함·기존 액션/화면 정리·grep 전수·R-11 계약·전환 순서) 정리.
- RPC 계산식에 legacy `L` 포함, 상태·보안·원자성 보강.
- 실비 경로 (a)/(b) 비교, 운영 데이터는 JSJung 업무 확인으로 정리(DB 조회 아님).
- PR: #1462 (draft, `Refs #1459`, `Refs #1451`).
