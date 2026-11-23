# TASK-B-381 — Issue #1459: UPS 정산마감 부가운임의 화주·대리점 청구 자동 반영 (설계 의견, 4차)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) (TASK-B-377 / #1449 A 연장) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **설계 확정: JSJung·Aiden** |
| **상태** | 📝 설계 의견 4차 (`status:draft`) — **구현 금지** |
| **브랜치** | `feature/teamb-task-b381-iss1459-settlement-charge-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **공개 저장소 주의** | 노출 경위·재현 절차는 쓰지 않고 "도달 가능/불가 + 코드 위치"만 기재 |
| **4차 반영** | JSJung 결정: **설계 기준 인보이스 중심 → 청구서관리 중심(컷오버 기준)**. Jaison 3차 보완 6건 + Aiden 모순 검토 6건 |

## 0. 설계 기준 (JSJung, 2026-11-23)

- 레거시 청구서 관련 기능을 **신규 청구서관리(statements)** 로 대체한다.
- 기존 UPS 인보이스는 보존하고, 신규 방식은 **컷오버일 이후 출고확정(RELEASED)된 UPS 오더**부터 적용한다.
- **컷오버일은 미정**(JSJung·Aiden, 오더정산 병합 직전 결정) → 설계에서는 **입력값/판정 함수 의존**으로 둔다.
- 컷오버 판정은 **#1369(TASK-B-363)의 판정 함수를 재사용**한다(이 Task에서 구현하지 않음).
- 컷오버 이후 오더의 인보이스 생성 중단은 **#1369 범위**다(이 Task는 의존성만 명시).

---

## 1. 실측 (실DB, 2026-11-23)

### 1-1. 방법과 한계

- 로컬 Supabase + `TeamB_Dev` 마이그레이션. 서버 액션은 `validateUserAction`만 ADMIN stub + **service-role 실연결**, `estimateUpsFreight`는 stub.
- statement 측정은 실제 SQL 함수 `billing_items_amounts` / `create_billing_statement_with_items`를 실DB에서 호출(ADMIN JWT 세션).
- **RLS 역할별 허용/거부는 미측정**(정책은 `pg_policies` 정의만 확인).
- 픽스처는 측정 후 `session_replication_role=replica`로 삭제.

### 1-2. 인보이스 경로 A·B·C (컷오버 전/레거시)

| 경로 | 입력 | 결과 |
|:--|:--|:--|
| B `recordUpsActualCost` | 중량 변경 + 기타 50 HKD | `UPS_ACTUAL_COST_ADJ:140`만 생성, 입력 부가운임 청구 행 없음, `zen_ups_actual_other_charges` 0행. 인보이스 180/220 |
| A `recordActualCostAndFinalize` | **중량 10** + 기타 40,000 KRW | `actual_weight_kg=10` 저장, **재계산 없음(`recalc` null)**, 청구 행 없음, **총액 80으로 `is_finalized=true`** |
| C `recordUpsActualCharges` | 30 USD | `UPS_ACTUAL_ADJUSTMENT:30` → 110. **2회차 `ADJUSTMENT_UPDATE` 실패** |

- A·B 모두 규칙 2·3·4 미충족(현행). C는 항목명 없음.
- `recomputeRevenue` 호출은 `recordUpsActualCost`(L315)·`previewUpsActualCost`(L528) 두 곳뿐 → **A는 재계산 안 함**.
- `estimateUpsFreight` 입력에는 자유 금액이 없고 **마스터 ID(`otherChargeIds`)만** 있다(`src/app/actions/ups/freight.ts:39`).

### 1-3. 연결 비용 행 불변 트리거

```sql
-- zen_order_costs: BEFORE DELETE OR UPDATE
IF OLD.invoice_id IS NOT NULL THEN
  RAISE EXCEPTION 'Cannot modify order costs after invoice has been issued (invoice_id: %)', OLD.invoice_id;
END IF;
```

- 실측: B 재정산의 ADJ 삭제가 차단되지만 **오류 미확인**으로 무시 → ADJ `140 + 30` 분절(총액 250). C 2회차 실패.
- **DEF-B-167** 보고.

### 1-4. 청구서(statement) 금액 실측 — 이번 설계의 핵심

픽스처: UPS `DELIVERED`·`SETTLED` 오더, 스냅샷(platform 250/30/10/10, agency 200/20/5/5, `agencyCostPrice=180`, `billingWeightKg=10`, USD), 원장(250/30/10/10 + ADJ 40 + SETTLEMENT 30).

| 측정 | 결과 |
|:--|:--|
| `billing_items_amounts(..., 'AGENCY_TO_SHIPPER')` | base 250 / fuel 30 / surge 10 / **other 80** / line_total **370**, `charge_weight_kg=10` |
| `billing_items_amounts(..., 'ADMIN_TO_AGENCY')` | base 200 / fuel 20 / surge 5 / **other 5** / line_total **230**, `charge_weight_kg=10` |
| 화주 tier의 `other_charges` | **ADJ 40 + OTHER 10 + SETTLEMENT 30 = 80** → **ADJ가 "기타 부가운임"에 섞임** |
| `SETTLEMENT_CHARGE` 행 | `is_revenue=true`이면 **자동 포함**됨(함수값 기준: 행 추가 전 340 → 추가 후 370) |
| 대리점 tier | 스냅샷만 읽음 → **ADJ·부가운임 미반영**(230 그대로) |
| 청구중량 | 스냅샷 `billingWeightKg=10` 우선 → `actual_weight_kg=12`를 넣어도 **10 유지**(규칙 2 미반영) |
| 통화 | 원장이 USD면 `create_billing_statement_with_items` → **`unsupported_cost_currency`** 실패. KRW로 바꾸면 생성 성공(340/230 KRW) |
| 인보이스와의 정합(코드+실측 대조) | 대리점 인보이스 총액 = `agencyCostPrice`(180) vs statement 230 → **50 차이**. 화주는 금액 숫자는 같을 수 있으나 **USD vs KRW 단위 불일치** |

**결론**: `billing_items_amounts`는 (1) 대리점 tier에 정산 결과가 도달하지 않고, (2) 청구중량·통화·ADJ 분류가 정산 결과와 어긋난다. **정산 결과를 청구서가 읽는 단일 저장소가 필요**하다(§2-2).

---

## 2. [설계 의견]

### 2-1. 컷오버 분기 — 하나의 정산마감 동작 `finalizeUpsSettlement`

```
finalizeUpsSettlement(orderId, input)
  ├─ isBeforeCutover(order)  ( #1369 판정 함수 )
  │    └─ LEGACY 인보이스 경로 (기존 A·B 동작 보존 + 부가운임 청구 행)
  └─ else
       └─ STATEMENT 경로 (정산 run 저장 → 청구서가 읽음, 인보이스 없음)
```

| 단계 | LEGACY(컷오버 전) | STATEMENT(컷오버 후) |
|:-:|:--|:--|
| 1 | admin 3역할·UPS·DELIVERED·미정산 | 동일 |
| 2 | 인보이스 조회·상태 확인(마감/취소 거부) | **인보이스 존재 여부만 확인**(있으면 데이터 이상 `unexpected_legacy_invoice` 거부). 총액·마감 처리는 하지 않음 |
| 3 | 원가 저장(`zen_ups_actual_cost`) | 동일 |
| 4 | 중량·치수 입력 시 **A도 재계산**(규칙 2) | 동일 |
| 5 | 부가운임 인보이스 통화 환산(출고확정일) | **KRW 환산**(청구서 기준 통화), 항목별 반올림 |
| 6 | RPC: ADJ/부가운임 append-only + 인보이스 총액·마감 + 주문 SETTLED | RPC: **정산 run 저장 + 주문 SETTLED** (인보이스 없음) |
| 7 | 마감 이메일(best-effort) | 동일 |

**병행 / 컷오버 두 경우의 영향**

| 정책 | 컷오버 전 오더 | 컷오버 후 오더 | 이 Task 영향 |
|:--|:--|:--|:--|
| **병행**(레거시 인보이스 유지) | legacy 인보이스 경로(현행 유지) | statement 경로 | `billing_items_amounts` 폴백이 legacy를 그대로 처리. **컷오버 전 오더는 statement에서 제외**해야 이중 청구·금액 불일치가 없다(#1369 정책) |
| **컷오버**(신규 기능으로 대체) | legacy 경로만(무변경) | 인보이스 생성 중단(#1369), statement 경로 | legacy 함수는 컷오버 전 오더에만 사용. post-cutover는 run만 사용 |

- **컷오버 후에는 `zen_order_costs`에 부가운임 청구 행을 쓰지 않는다**(원가 원장만). 표시·청구는 run 저장소를 읽는다. `cost_name`/append-only 델타는 **legacy 경로 전용**으로 유지한다.
- **반영 시점(명시)**: `saveUpsSettlementDraft`(임시저장)는 **원가만 저장하고 청구 행/run을 만들지 않는다**. 청구 반영은 **정산 완료(`finalizeUpsSettlement`) 시점**이다.

| 단계 | 원가 저장 | 청구 행/run | 인보이스/청구서 | 화주 노출 |
|:--|:--|:--|:--|:--|
| 임시저장 | O | **X** | X | 기존 금액만 |
| 정산 완료 | O(재사용) | **O** | statement 생성 시 반영 | 청구서 생성 후 |

- 대안(임시저장 시점 반영)은 초안 금액이 화주에게 노출되고, 불변 트리거 때문에 삭제가 안 되어 음수 행에 의존한다. **정산 완료 시점 반영을 권장**하며, 이 선택은 §3 #1(JSJung 확인)로 올린다.
- 원가 저장(3)은 RPC 밖이다. RPC 실패 시 원가만 남지만 **청구·상태는 변하지 않아 재사용 가능한 임시저장**이다(DEF-B-166(b)의 "마감 이력 거짓 기록"과 다름).

### 2-2. 청구서 금액 원천 — 해결안 비교 (필수)

| 안 | 내용 | 장점 | 단점·위험 |
|:--|:--|:--|:--|
| (a) 스냅샷 반영 | 정산 결과를 `zen_order_rate_snapshots.metadata`에 기록 | 함수 변경 최소 | **감사 스냅샷 변조**, tier별 금액·항목명 부적합, ADJ 분류 불가, 통화 |
| (b) 기존 원장 읽기 변경 | `billing_items_amounts`가 `zen_order_costs`(ADJ/charge)·`actual_weight_kg`·tier 태깅을 읽게 | 새 저장소 없음 | `zen_order_costs`에 **tier 컬럼 필요**, 대리점 금액 부재, legacy 인보이스 이중 계산 위험, 통화 |
| **(c) 정산 결과 단일 저장소 (권장)** | 정산 RPC가 `zen_ups_settlement_runs(+amounts,+charges)`에 **tier별·항목별·KRW 스냅샷**을 append-only 버전으로 기록. `billing_items_amounts`가 최신 run을 읽음 | 규칙 2·3·4·6을 한 곳에서, 대리점 포함, legacy 무변경, 감사 추적 | 신규 테이블·함수 변경, **B-379(#1453)와 조율 필요** |

**권장: (c)**. (a)는 감사 스냅샷을 변조하고, (b)는 tier 태깅·legacy 이중 계산 위험이 있다. (c)는 legacy 경로를 건드리지 않고 신규 경로만 run을 읽게 한다.

- **#1453(Baker) 조율**: 같은 `billing_items_amounts`를 변경하므로, **B-379의 접근 경로(안전 뷰) 변경을 먼저/하나의 마이그레이션으로** 반영하고 B-381은 "run 우선 + legacy 폴백" 분기를 그 위에 얹는 순서를 제안. `#1453`에 조율 코멘트 게시(2026-11-23), **회신 대기**. (task file 한 줄 기록)

### 2-3. 정산 run 저장소 (제안 스키마)

```
zen_ups_settlement_runs
  id uuid pk, order_id uuid, version int, charge_weight_kg numeric,
  currency text default 'KRW', source text default 'UPS_SETTLEMENT',
  settled_at timestamptz, settled_by uuid, created_at
  unique(order_id, version)

zen_ups_settlement_run_amounts
  run_id uuid, tier text check (ADMIN_TO_AGENCY|SHIPPER),
  base_freight numeric, fuel_surcharge numeric, surge_fee numeric, other_charges numeric,
  freight_adjustment numeric, settlement_charges_total numeric, line_total numeric
  unique(run_id, tier)

zen_ups_settlement_run_charges
  run_id uuid, tier text check (ADMIN_TO_AGENCY|SHIPPER), name text, amount numeric, currency text
  unique(run_id, tier, name)
```

- **tier 매핑**: run은 발행자 tier가 아니라 **청구 관계**로 저장한다 — `ADMIN_TO_AGENCY`(대리점 청구), `SHIPPER`(화주 청구). `billing_items_amounts`는 요청 tier가 `ADMIN_TO_AGENCY`면 agency 행, `AGENCY_TO_SHIPPER`·`ADMIN_TO_SHIPPER`면 shipper 행을 읽는다(발행자에 따라 금액이 달라지지 않는다).
- **append-only 버전**: 재정산은 새 `version`을 추가하고 최신 버전을 읽는다(기존 run 불변). `zen_order_costs`의 append-only 델타(불변 트리거) 원칙을 저장소 수준에서 유지한다.
  - **같은 입력 2회**: 계산 결과가 최신 run과 동일하면 **새 version을 만들지 않는다**(행 수·금액 불변).
- **breakdown 출처**: shipper는 스냅샷/estimate breakdown, agency는 `estimate.agency` breakdown. breakdown이 없으면 `base=target`, 나머지 0, 차액은 `freight_adjustment`로 흡수한다(합 불변식 유지).
- **금액 분해**: `base/fuel/surge/other`는 estimate breakdown을 쓰고, `freight_adjustment = 정산 target - (base+fuel+surge+other)`. 차액(음수 가능)을 별도 항목으로 두어 **ADJ를 "기타 부가운임"에 섞지 않는다**.
- `settlement_charges_total` = run charges 합(항목별 반올림 후 합). **run charge amount는 음수 허용(admin 한정)** — 감액·해제를 새 run에서 순액으로 표현한다.
- `line_total = base+fuel+surge+other+freight_adjustment+settlement_charges_total`.
- **통화**: run 금액은 **KRW**. 입력 통화는 출고확정일 환율로 환산, 항목별 2자리 반올림.
- **가시성**: run은 청구서 발행자가 읽어야 하므로 RLS를 `zen_order_costs`와 동일 축(ADMIN/SUPER/MANAGER, AGENCY 자기 오더, SHIPPER 자기 오더)으로 둔다. `billing_items_amounts`는 **SECURITY INVOKER 유지**.
- **정산 해제/재정산**: run 추가만 가능. statement 포함 후에는 변경 금지(§2-6).

### 2-4. `billing_items_amounts` 변경 + 청구서 항목

- 최신 run이 있으면 **run 금액을 그대로 반환**(KRW, `charge_weight_kg`=run 값). 반환 컬럼 추가: `freight_adjustment numeric`, `charge_details jsonb`.
  - `other_charges` = run `other_charges` + `settlement_charges_total`, `line_total` = base+fuel+surge+other+freight_adjustment+charges.
- run이 없으면 **현행 로직 폴백**(legacy: `zen_order_costs`/스냅샷, `unsupported_cost_currency` 유지, `freight_adjustment=0`, `charge_details=null`).
- **run 경로에서는 비KRW 원장 통화 가드를 우회**한다(함수가 원장을 읽지 않으므로). legacy 경로는 현행 유지.
- `zen_billing_statement_items`에 컬럼 추가:
  - `freight_adjustment numeric not null default 0` — "운임 조정"
  - `charge_details jsonb null` — `[{name, amount, currency}]`(부가운임 항목명)
- 표시: `other_charges`는 기타+부가운임 합계, `charge_details`로 항목명, `freight_adjustment`는 별도 "운임 조정" 라인. `line_total` 불변식 유지.
- ADJ 분류: run 경로에서 ADJ는 `freight_adjustment`로 분리. legacy 폴백은 현행(ADJ가 other에 포함) 유지 → 컷오버 전/후 혼선 방지.

### 2-5. RPC — `finalize_ups_settlement_run` / `finalize_ups_settlement_invoice`

**공통 보안**
- `SECURITY DEFINER`, `SET search_path = public`.
- `REVOKE ALL ... FROM PUBLIC, anon` → `GRANT EXECUTE ... TO authenticated`.
- 내부에서 `auth.uid()`로 `zen_profiles.role` 검사: **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**(JSJung 확정, #1463 정책과 무관하게 DEFINER로 동작). actor 파라미터 없음.
- 앱은 **세션 클라이언트**로 호출(admin client 금지 — `auth.uid()` 무의미).
- 테스트: SHIPPER·AGENCY·anon 직접 호출 거부, ADMIN·MANAGER 양성 대조.

**상태·원자성**
- run 경로: 주문이 `SETTLED`면 거부, `DELIVERED`·UPS 확인, run+amounts+charges+주문 `SETTLED`를 **한 트랜잭션**.
- legacy 경로: `is_finalized`·`CANCELED` 인보이스 거부, ADJ/부가운임 append-only + 총액 + 마감 + `SETTLED`를 **한 트랜잭션**.
- `L`(legacy `UPS_ACTUAL_ADJUSTMENT` 합)은 legacy 총액 `F+A+C+L`에 포함, ADJ 기준선 `F+A`에서는 제외(최소 방어).
- 부분 실패 없음(전체 롤백).

**MANAGER 의존성** (Jaison 3차 보완 3)

| 단계 | 클라이언트 | RLS 의존 |
|:--|:--|:--|
| 원가 저장(`zen_ups_actual_cost`·`zen_ups_actual_other_charges`) | 세션 | 두 테이블 `admin_manager_all`에 MANAGER 포함(정책 정의 확인) |
| legacy 인보이스 조회·마감 | 세션 | `zen_invoices`에 MANAGER 정책 없음 → **#1463**(컷오버 전 경로만) |
| run RPC(정산 완료) | 세션 | DEFINER + `auth.uid()` 검사 → RLS 무관, **MANAGER 동작** |
| legacy 청구 행 RPC | 세션 | DEFINER → RLS 무관 |

### 2-6. 청구서 발행 후·정산 해제 (표)

| 시점 | 청구서 상태 | 정산 해제 | 부가운임 변경 |
|:--|:--|:--|:--|
| 정산 완료 전 | — | — | 임시저장만 |
| 정산 완료 후·statement 생성 전 | 없음 | 허용(상태만; run은 이력으로 남음) | 재정산 시 **새 run version** |
| statement 생성 후 | `zen_billing_statement_items`에 포함 | **차단**(`statement_includes_order`) | **불가**(unique(order_id,tier)) |
| statement 발행 후 | `issued` 등 | 차단 | **불가** → 새 차수/조정은 별도 Task |

- 청구서는 **발행 시점 스냅샷**이며, 같은 오더·tier는 한 번만 포함된다(unique). 따라서 **정산이 청구서 생성보다 먼저 확정**되어야 한다. 이 순서를 UI/문서에 명시.

### 2-7. 레거시 기능 정리표 (컷오버 기준)

| 기능 | 컷오버 전 오더 | 컷오버 후 오더 | 전환 기간 공존 |
|:--|:--|:--|:--|
| `BillingConfirmModal`(A 마감) | 유지(레거시 인보이스) | 미노출 | 컷오버까지 유지 |
| `finalizeDailyShipperInvoices` | 유지 | 미사용 | 유지 |
| `UpsActualAdjustmentForm`(C) | **쓰기 중단** | 미노출 | 읽기 전용 이력 |
| `recordUpsActualCharges` | **폐기 오류** | **폐기 오류** | 제거 예정 |
| `recordActualCostAndFinalize` | 통합 액션 legacy 분기로 흡수 | 미사용 | 래퍼 유지 후 제거 |
| `recordUpsActualCost` | `saveUpsSettlementDraft` 대체 | 동일 | 래퍼 유지 후 제거 |
| `markOrderCostSettled` | 통합 액션 내부 | run RPC 내부 | 외부 호출 제거 |
| `unmarkOrderCostSettled` | statement 포함 시 차단 | 동일 | 유지 |
| `/finance/daily-billing` | 유지(레거시 인보이스) | 미사용 | 유지 |
| `/finance/statements` | **컷오버 전 오더 제외 정책 필요** | 사용 | #1369 정책 |
| `OrderSettlementDetail` | 단일 정산마감 화면(legacy 분기) | 동일(statement 분기) | 유지 |

- **호출처 grep(2026-11-23)**: `recordActualCostAndFinalize`→`BillingConfirmModal.tsx:6,118`; `recordUpsActualCost`→`OrderSettlementDetail.tsx:15,192`·`UpsActualAdjustmentForm.tsx:5,143`; `previewUpsActualCost`→3개 컴포넌트; `recordUpsActualCharges`→`UpsActualAdjustmentForm.tsx:4,243`; `markOrderCostSettled`→`OrderSettlementDetail.tsx:16,213`·`finance/index.ts:36`; `BillingConfirmModal`→`ShipperDailyBillingClient.tsx:28,693`; `UpsActualAdjustmentForm`→admin client·orders page; `OrderSettlementDetail`→`finance/order-settlement/[orderId]/page.tsx:8,159`.

### 2-8. 라벨 (Aiden #5 정합)

| cost_type | 라벨(화주·대리점) | 비고 |
|:--|:--|:--|
| `SETTLEMENT_CHARGE` | **부가운임** | 항목명은 `cost_name`/`charge_details` |
| `OTHER_CHARGE` | 기타 부가운임 | 기존 견적 부가항목 |
| `UPS_ACTUAL_COST_ADJ` | **운임 조정** | 운임 재계산 차액 — 기존 라벨 표에 없음 |
| `UPS_ACTUAL_ADJUSTMENT`(legacy) | 부가운임(정산) | 이력 |

- **#1451(B-377) 라벨 표에 `UPS_ACTUAL_COST_ADJ`가 없다.** 구현 시 두 task file의 표를 함께 갱신해야 한다(이 Task 제안: "운임 조정"). `OTHER_CHARGE`("기타 부가운임")와 `SETTLEMENT_CHARGE`("부가운임")는 별도 라인으로 구분한다.
- statement `charge_details`에서도 동일 라벨을 사용한다.
- **표시 소스**: 컷오버 후 오더의 화주·대리점 비용 요약은 `zen_order_costs`가 아니라 **run의 amounts+charges**를 읽는다(항목명·통화·재계산 중량). legacy 오더는 기존 `zen_order_costs` 표시를 유지한다. B-377 표시 설계는 컷오버 분기에 맞춰 두 소스를 모두 지원해야 한다.

### 2-9. B-382(#1463) 정합

- 이 설계는 `zen_order_costs`를 **INSERT 전용**으로 쓰고(legacy) run RPC는 DEFINER다. B-382가 든 "UPS_ACTUAL_COST_ADJ 멱등 재생성"의 UPDATE·DELETE 근거는 사라진다.
- **이 Task에서는 정책을 바꾸지 않는다.** B-382는 이 설계 확정 후 정책 집합을 재산정한다(Jaison이 #1463에 전달). 컷오버 후 오더가 인보이스를 거치지 않으면 `zen_invoices` MANAGER 정책 필요성도 줄어든다.

### 2-10. R-11·Ds-11

- 신규/변경:
  - `finalizeUpsSettlement(orderId, input)` — 통합 정산마감(legacy/statement 분기)
  - `saveUpsSettlementDraft(orderId, input)` — 원가만(청구 없음)
  - `previewUpsSettlement(orderId, input)` — 금액·run 프리뷰
  - RPC `finalize_ups_settlement_run`, `finalize_ups_settlement_invoice`
  - `billing_items_amounts` 시그니처/반환(`freight_adjustment`, `charge_details`)
- 입력: UPS 인보이스 정보, 중량·치수, 원가 항목(통화), 부가운임 항목(음수 허용), 사유.
- 출력: `{success, settled, path:'legacy'|'statement', runVersion?, invoices?, statementPreview?, recalculated?, error?}`.
- 오류: `permission_denied`·`order_not_found`·`not_ups_order`·`ups_actual_cost_status_invalid`·`already_settled`·`invoice_finalized`·`invoice_canceled`·`unexpected_legacy_invoice`·`unsupported_cost_currency`·`currency_conversion_failed`·`rpc_failed`.
- Ds-11: `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md`, `Ds_11_04_Finance_Settlement.md`, 인덱스. R-12에 따라 구현 PR에서 갱신.

### 2-11. 테스트 계획

**statement 핵심 (신규)**
1. 정산 완료 후 `billing_items_amounts` 양 tier 값이 run과 일치(대리점 포함), `charge_weight_kg`가 재계산 중량.
2. run 경로에서 ADJ가 `freight_adjustment`로 분리되고 `other_charges`에 섞이지 않음.
3. `charge_details`에 항목명·금액(항목별 반올림 합 = 총액).
4. 비KRW 원장이어도 run 경로는 statement 생성 성공(가드 우회), legacy 폴백은 현행 차단 유지.
5. 컷오버 전/후 분기: legacy는 인보이스, statement는 run. `unexpected_legacy_invoice` 방어.
6. statement 포함 후 `unmark` 차단·재정산 불가(unique) 확인.

**기존 유지**
7. 같은 입력 2회 → **새 version 미생성**, run·금액 불변.
8. 중량 변경 재계산(A·B).
9. 음수 행(감액)·환산/반올림·통화 다른 두 인보이스(legacy).
10. legacy `L` 포함 총액.
11. RPC 보안·원자성(부분 실패 롤백).
12. 마감/취소 인보이스 거부(legacy).
13. 세션 매트릭스(SHIPPER/AGENCY/ADMIN/MANAGER).
14. 화면 before/after, 기존 화면 무회귀.
15. `npm run test:regression` PASS.

### 2-12. 마이그레이션·전환 순서

| # | 내용 | 시점 | 롤백 |
|:-:|:--|:--|:--|
| M1 | `zen_order_costs.cost_name` (**legacy 경로** 청구 행·표시 전용) | 앱 배포 전 | DROP COLUMN |
| M2 | run 3테이블 + RLS | 앱 배포 전 | DROP TABLE |
| M3 | `billing_items_amounts` run 분기 + `zen_billing_statement_items`(`freight_adjustment`, `charge_details`) | **#1453과 조율 후**, 앱 배포 전 | 함수/컬럼 원복 |
| M4 | `finalize_ups_settlement_run` / `_invoice` RPC(보안 GRANT 포함) | 앱 배포 전 | DROP FUNCTION |
| — | 컷오버 판정 함수 | **#1369** | — |

**앱 변경(DDL 없음)**: 통합 액션·화면 전환, C 폐기, `BillingConfirmModal`/`UpsActualAdjustmentForm` 정리, legacy 래퍼 제거.

**전환 순서**: Ds-11 → M1·M2·(M3)·M4(추가형, 기존 앱 무영향) → 앱 통합 액션·화면 추가 → 화면 전환·C 폐기 → 안정화 후 legacy 제거. 컷오버일 확정 후 #1369와 함께 오더별 분기 활성화.

**호환**: 컷오버 전 오더는 legacy 인보이스 그대로(무변경). 컷오버 후 오더만 run 경로. 진행 중 draft는 원가 재사용. 기존 `UPS_ACTUAL_COST_ADJ`/`UPS_ACTUAL_ADJUSTMENT` 행은 legacy 기준선/`L`로 반영.

---

## 3. 남은 확인 항목

| # | 항목 | 상태 |
|:-:|:--|:--|
| 1 | **반영 시점**(임시저장 vs 정산 완료) | **JSJung 확인**. 권장=정산 완료 시점(초안 노출·불변 트리거 회피). 대안=임시저장 시점(초안 노출, 음수 행 의존) |
| 2 | **컷오버일** | **미정(JSJung·Aiden)**. #1369 판정 함수 의존 |
| 3 | 컷오버 전 오더의 statement 포함 여부 | **#1369 정책**. 포함 시 legacy 금액(ADJ 혼입·통화)과 어긋남 |
| 4 | `zen_ups_actual_charges` 테이블·정책 완전 제거 | **JSJung 최종 결정**(DROP 비가역). 이 Task는 (a) 이력 유지 |
| 5 | RPC MANAGER | **확정**(ADMIN·MANAGER·SUPER). #1463 정책과 무관하게 DEFINER |
| 6 | `billing_items_amounts` 변경 순서 | **#1453(Baker) 조율 회신 대기** — 2026-11-23 코멘트 게시 |
| 7 | 운영 기존 데이터 | **Aiden 읽기 전용 조회(2026-11-23 19:28 KST)**: `UPS_ACTUAL_ADJUSTMENT`·`UPS_ACTUAL_COST_ADJ` 0, `zen_ups_actual_*` 각 0, 연결 `zen_order_costs` 18, 트리거 활성. **Jaison 미검증** |
| 8 | statement 발행 후 금액 변경 | **불가**(unique). 별도 차수/조정은 후속 Task |
| 9 | `zen_billing_statement_items` 표시 컬럼 확정 | Jaison/Aiden 확인(§2-4) |

---

## 4. 관련 DEF (R-18, 수정 금지·보고만)

| DEF | 내용 | 관계 |
|:--|:--|:--|
| **DEF-B-165** | 일괄 마감 AGENCY 허용·UPS 포함·success true vs DB 미변경 | 규칙 1. 이 Task 미변경 |
| **DEF-B-166** | `markInvoiceFinalized` 0행 무시·history 거짓 기록·MANAGER 실패 | RPC 원자성으로 회피 |
| **DEF-B-167** | 연결 비용 행 불변 트리거 + 재정산 오류 미확인 → ADJ 분절·C 재등록 실패 | §1-3 실측. run/append-only로 회피 |

DEF-B-165·166은 TASK-B-377 브랜치(PR #1454)에 등록, 이 브랜치에는 없다(중복 생성 금지). DEF-B-167은 이 브랜치에 있다.

## 5. [작업 결과]

- **설계 의견 4차**: 청구서관리 중심·컷오버 기준으로 전환. Jaison 3차 보완 6건 + Aiden 6건 반영.
- 신규 실측: `billing_items_amounts` 양 tier, ADJ 혼입, 대리점 스냅샷 고정, 청구중량 우선순위, 통화 가드, 인보이스-청구서 불일치.
- 해결안 (a)/(b)/(c) 비교, **(c) 정산 run 단일 저장소 권장**. #1453 조율 코멘트 게시(회신 대기).
- 코드·마이그레이션 변경 없음.
- PR: #1462 (draft, `Refs #1459`, `Refs #1451`, `Refs #1453`, `Refs #1463`).
