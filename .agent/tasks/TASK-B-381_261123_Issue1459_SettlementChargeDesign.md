# TASK-B-381 — Issue #1459: UPS 정산마감 부가운임의 화주·대리점 청구 자동 반영 (설계 의견)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) (TASK-B-377 / #1449 A 연장) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **설계 확정: JSJung** |
| **상태** | 📝 설계 의견 (`status:draft`) — **구현 금지, JSJung 확정 후** |
| **브랜치** | `feature/teamb-task-b381-iss1459-settlement-charge-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **채번** | `.agent/tasks` TASK-B-381 없음 — 이슈 지정 번호 사용 |
| **공개 저장소 주의** | 노출 경위·재현 절차는 쓰지 않고 "도달 가능/불가 + 코드 위치"만 기재 |

## 확정 규칙 (JSJung, 2026-11-23)

1. UPS 정산마감은 admin(ZENITH_SUPER_ADMIN·ADMIN·MANAGER)만.
2. 정산마감 시 수정된 청구중량으로 agent·shipper 운임 재계산(기본·유류·급증 포함).
3. 정산마감 시 추가된 부가운임은 **그대로** agent·shipper의 부가운임으로 적용.
4. 정산마감에서 입력한 부가운임은 화주(및 대리점) 청구에 **자동 반영**.
5. 기본운임·유류·급행(원가)은 admin만, 부가운임은 agent·shipper에게 **항목명·금액** 표시.
6. 화주·대리점 화면 라벨은 중립적 **"부가운임"**.

---

## 1. 현황 실측 (실DB, 2026-11-23)

### 1-1. 측정 방법과 한계 (먼저 읽을 것)

- **실DB**: 로컬 Supabase(`supabase_db_*`) + `TeamB_Dev` 마이그레이션 상태(로컬 reset 완료).
- **호출 경로**: 실제 서버 액션(`recordUpsActualCost`, `recordActualCostAndFinalize`, `recordUpsActualCharges`)을 vitest에서 직접 호출. `validateUserAction`만 ADMIN 프로필로 stub하고 **DB 클라이언트는 service-role 실연결**을 주입했다. 따라서 측정된 것은 "RLS를 통과한 뒤의 청구·인보이스 쓰기 동작"이다. **RLS(역할별 허용/거부)는 이 실측 범위가 아니다.**
- **`estimateUpsFreight`는 고정 stub**으로 대체했다(청구중량 변경 경로의 청구 행·합계 변화만 분리 관찰하기 위함). 따라서 아래 수치는 "stub가 반환한 매출"과 실제 청구 행의 관계를 보여주며, 실제 UPS 요율 계산값이 아니다.
- **픽스처**: UPS `DELIVERED` 오더 + `ADMIN_TO_AGENCY` 인보이스(80) + `AGENCY_TO_SHIPPER` 인보이스(80), 각 인보이스에 `BASE_FREIGHT:80` 1행 연결. `ADMIN`은 `auth.users`에도 insert(마감 시 `finalized_by` FK).
- **정리**: 측정 후 `session_replication_role=replica`로 픽스처 전부 삭제.
- 실측에 쓴 임시 테스트 파일은 측정 후 삭제했다(커밋하지 않음).

### 1-2. 경로 B — `recordUpsActualCost` (중량 변경 O)

입력: 기본 100 HKD + 유류 10 + 급증 5 + **기타 50 HKD**, `actualWeightKg=10`.

| 측정 대상 | 결과 |
|:--|:--|
| `zen_ups_actual_cost.other_charges_hkd` | 50 (원가 측에는 저장) |
| `zen_ups_actual_other_charges` | **0행** — B 경로는 항목명을 저장하지 않는다 |
| `zen_order_costs` | `UPS_ACTUAL_COST_ADJ:140` 1행 추가(쉬퍼 인보이스 연결). 기존 BASE 2행 유지 |
| `ADMIN_TO_AGENCY` | **180** = stub `newAgencyTotal`(180), `metadata.platform_breakdown.otherCharges`=**5**(stub 값) |
| `AGENCY_TO_SHIPPER` | **220** = BASE 80 + ADJ 140 = stub `newShipperTotal`(220) |
| 규칙 2 | 청구중량 변경 시 기본·유류·급증 재계산은 동작(총액 기준 충족) |
| 규칙 3·4 | **미충족** — 입력한 기타 50 HKD는 어떤 청구 행에도 들어가지 않는다 |

**원인(코드 확인)**: `recomputeRevenue`가 `estimateUpsFreight`를 호출할 때 `otherCharges`를 **전달하지 않는다**(`src/app/actions/finance/ups-actual-cost.ts:167~180`). 입력 부가운임은 원가 합계(`total_cost_krw`)에만 반영된다. 또한 B 경로는 `zen_ups_actual_other_charges`에 쓰지 않으므로(`ups-actual-cost.ts:255~300` 구간) **항목명 자체가 소실**된다.

### 1-3. 경로 A — `recordActualCostAndFinalize` (중량 변경 X, 마감)

입력: 기본 100,000 KRW + 기타 40,000 KRW(항목명 `주소정정 수수료`), `invoiceId=AGENCY_TO_SHIPPER`, `reason='청구확정'`.

| 측정 대상 | 결과 |
|:--|:--|
| `zen_ups_actual_other_charges` | `주소정정 수수료:40000 KRW` 저장 |
| `zen_order_costs` | `BASE_FREIGHT:80`만 — **부가운임 청구 행 없음** |
| `AGENCY_TO_SHIPPER` | `total_amount=80`, **`is_finalized=true`** (`computeInvoiceTotal` = 연결된 `zen_order_costs` 합계) |
| `zen_invoice_history` | 1행 기록 |
| 규칙 3·4 | **미충족** — 40,000원 부가운임이 청구에 없고, 그 상태로 **마감이 확정**된다 |

즉 A 경로는 "원가 측 항목은 저장하지만 청구 행을 만들지 않고, 기존 비용 행 합계로 마감"한다. 마감 후에는 이 금액을 추가하려면 마감 후 조정 경로가 필요하다.

> 참고: 중량 변경이 없는 A 경로는 `recomputeRevenue`를 호출하지 않으므로 규칙 2(재계산)가 적용되지 않는다. 이는 확정 규칙 2가 "정산마감 시" 전반을 의미하는지, "청구중량이 바뀐 경우"만 의미하는지에 대한 **JSJung 확인 항목**이다(§4-1).

### 1-4. 경로 C — `recordUpsActualCharges` (현행 별도 실비 등록)

입력: 30 USD.

| 측정 대상 | 결과 |
|:--|:--|
| `zen_ups_actual_charges` | 행 저장(`charge_type` 코드만, **화면용 항목명 없음**) |
| `zen_order_costs` | `UPS_ACTUAL_ADJUSTMENT:30` 추가, 쉬퍼 인보이스 연결 |
| `AGENCY_TO_SHIPPER` | **110** = BASE 80 + 30 (연결 행 합계 재계산) |
| 규칙 3·4 | 금액 반영은 되지만 **항목명 표시 불가**(규칙 5·6 일부 미충족) |

### 1-5. 인보이스 총액 계산 구조가 tier별로 다르다 (핵심)

| tier | 총액 산출 | 비용 행 |
|:--|:--|:--|
| `AGENCY_TO_SHIPPER` / `ADMIN_TO_SHIPPER` | 연결된 `zen_order_costs` **합계** | 있음 |
| `ADMIN_TO_AGENCY` | `metadata.platform_breakdown`(기본·유류·급증·기타) 기반 총액 | **없음** (`invoice-generator.ts:95~160`) |

- B 경로는 `ADMIN_TO_AGENCY`를 `newAgencyTotal`로 **직접 덮어쓰고**, 쉬퍼 인보이스는 연결 행 합계로 **재계산**한다(`ups-actual-cost.ts:340~445`).
- 따라서 "청구 행을 추가하면 총액이 자동 반영된다"는 **쉬퍼 tier에서만 성립**한다. `ADMIN_TO_AGENCY`는 breakdown·총액을 별도로 갱신해야 한다.
- C 경로는 `ADMIN_TO_AGENCY`에 `platformTotal + additionalSum`, 쉬퍼에는 연결 행 합계를 쓴다(`ups-actual-charges.ts:210~250`).

### 1-6. 중복 반영 위험

- B는 `UPS_ACTUAL_COST_ADJ`, C는 `UPS_ACTUAL_ADJUSTMENT`로 **서로 다른 행**을 만들고 각각 총액에 반영된다. 같은 부가운임을 양쪽에 입력하면 **중복 합산 가능**(코드 확인 + 각 경로 개별 실측).
- B+C **동시 입력 end-to-end는 이번 설계에서 미실행**(stub·snapshot 의존) — 구현 착수 시 반드시 실측한다.
- A의 `zen_ups_actual_other_charges`는 원가 측에만 남고 청구로 이어지지 않는다(§1-3).

---

## 2. [설계 의견]

### 2-1. 반영 방식 비교

| 안 | 변경 | 장점 | 단점·위험 | 되돌리기 |
|:--|:--|:--|:--|:--|
| **A. 항목별 청구 행 + 항목명 컬럼 (권장)** | `zen_order_costs.cost_name` 추가, 정산마감 부가운임을 항목별 `is_revenue=true` 행으로 생성(쉬퍼 tier) / `ADMIN_TO_AGENCY`는 breakdown 갱신 | 항목명·금액·총액이 한 출처. 기존 합계·화면·PDF 구조 유지 | 스키마 1컬럼, 재마감 멱등성, tier별 총액 처리 | 컬럼·행 삭제, 마이그레이션 롤백 |
| B. 기존 `OTHER_CHARGE`에 합계만 가산 | 새 행 1개 | 변경 최소 | **항목명 소실** → 규칙 5·6 위반 | — |
| C. 표시용 가드 함수만 (B-377 C안) | 조회 함수만 | 원가 차단 용이 | 청구 행이 없어 **총액 반영 불가** → 규칙 4 위반 | — |
| D. `zen_ups_actual_other_charges` 직접 청구 참조 | 화면이 원가 테이블을 직접 읽음 | 행 중복 없음 | 청구 합계·마감 총액과 분리, 금액 통화 불일치 | — |

**권장: A안.** 이유는 규칙 4(자동 반영)와 5·6(항목명 표시)을 **동시에** 만족하는 유일한 안이기 때문이다. C안은 B-377의 "표시" 요구만 만족하고 청구 총액을 바꾸지 못한다.

### 2-2. A안 상세

#### (1) 스키마

- `zen_order_costs.cost_name text NULL` 추가(항목명). 비정산 행은 NULL 유지 → 기존 표시는 `cost_name ?? getCostTypeLabel(cost_type)` 폴백.
- `cost_type`은 **내부 식별자**로 신규 `SETTLEMENT_CHARGE`를 사용(라벨 매핑에서 비관리자에게 "부가운임").
  - `zen_order_costs.cost_type`에는 CHECK 제약이 없다(실DB 확인, `pg_constraint` 0건) → 신규 값 추가에 DDL 불필요.
  - `UPS_` 접두사를 쓰지 않는 이유: 화면·PDF에 raw로 노출될 여지를 줄이고, 향후 타 택배사에도 재사용 가능하게 하기 위함.
- 원본 금액·통화는 **기존 원가 테이블**(`zen_ups_actual_other_charges.charge_name/amount/currency`, `zen_ups_actual_charges.charge_type/charge_amount/currency`)에 그대로 남는다. 청구 행에는 **인보이스 통화로 환산한 금액**만 저장한다 → 별도 원본 컬럼 불필요(감사 추적은 원가 테이블 + `zen_ups_actual_cost.applied_exchange_rates`).

#### (2) 생성 규칙 (tier별)

- `AGENCY_TO_SHIPPER` / `ADMIN_TO_SHIPPER`: 부가운임 **항목별 1행**씩 `invoice_id` 연결. 총액은 연결 행 합계로 재계산.
- `ADMIN_TO_AGENCY`: 비용 행을 만들지 않고
  - `metadata.platform_breakdown.otherCharges` += 환산 합계
  - `metadata.settlement_charges[]` = `{name, amount, currency, original_amount, original_currency}` (항목명 표시용)
  - `total_amount` += 환산 합계
  - 를 **한 트랜잭션(또는 순서 보장)** 으로 갱신.
- 두 tier에 적용하는 금액은 규칙 3의 "그대로"를 따라 **동일 명목 금액**이며, 각 인보이스 통화로 각각 환산한다(통화가 다를 수 있음).

#### (3) 멱등성·재마감 (가장 중요)

- **삭제/재생성 범위**: `order_id = ? AND cost_type = 'SETTLEMENT_CHARGE'` **만**. `BASE_FREIGHT`·`FUEL_SURCHARGE`·`SURGE_FEE`·`UPS_ACTUAL_COST_ADJ`·`UPS_ACTUAL_ADJUSTMENT`는 건드리지 않는다.
- **ADJ 기준선 분리**: `UPS_ACTUAL_COST_ADJ`의 델타는 **부가운임 행을 제외한** 연결 비용 합계를 기준으로 계산해야 한다.
  - 현재: `shipperDelta = newShipperTotal - inv.total_amount` → 재마감 시 총액에 이전 부가운임이 포함되어 델타가 왜곡된다.
  - 제안: `freightBase = sum(linked costs where cost_type <> 'SETTLEMENT_CHARGE')`, `ADJ = newShipperTotal - freightBase`, 이후 `total = freightBase + ADJ + charges`.
- **정산 해제(`unmark`)**: `SETTLEMENT_CHARGE` 행 삭제 + 총액 재계산. 단 인보이스가 마감 상태면 삭제 대신 마감 후 조정 경로를 쓴다.
- **마감 후 재입력**: 기존 `createPostFinalizationAdjustment`를 재사용하되, `linkAdjustmentCosts`가 `UPS_ACTUAL_ADJUSTMENT`만 연결하므로 **`SETTLEMENT_CHARGE`도 연결 대상에 추가**해야 한다(`settlement.ts:614~623`). 이 함수의 `invoice_tier`/`billed_org_id` 미설정은 기존 갭이므로 이 Task에서 바꾸지 않고 별도 확인 항목으로 남긴다.

#### (4) 금액·통화 (JSJung 확인 필요)

- 환산: 입력 통화 → **인보이스 통화**. 기준일은 기존 원가와 동일하게 **출고확정일(RELEASED)** `getExchangeRate(from, to, releasedDate)`.
- 반올림: 항목별 2자리 반올림 후 합산할지, 합산 후 반올림할지 → **JSJung 결정**. (차액 1~2센트 발생 가능)
- 음수(크레딧·환불) 허용 여부 → **JSJung 결정**. 음수 행을 허용하면 총액 재계산은 단순 합계로 처리 가능.
- `ADMIN_TO_AGENCY`와 쉬퍼 인보이스의 통화가 다를 때 각각 환산 → **JSJung 확인**.

#### (5) 중복(C 경로) 관계 (JSJung 결정)

- `recordUpsActualCharges`(C)와 정산마감 부가운임은 **같은 업무**(부가운임을 청구에 반영)로 보인다.
- 권장: **정산마감 부가운임을 단일 진실**로 하고, C 경로도 동일한 `SETTLEMENT_CHARGE` 항목별 행을 만들도록 통합(마감 전 입력은 행 생성, 마감 후는 조정 인보이스). C의 `zen_ups_actual_charges.charge_type`은 코드값이므로 표시명 매핑 테이블이 필요하다.
- 대안: C 경로를 "마감 후 추가 실비"로만 제한하고, 마감 전 정산 입력과 중복 차단. **어느 쪽이든 JSJung 결정 필요.**

#### (6) 권한 경계 (JSJung 확인 필요)

- 실DB 정책 확인: `zen_order_costs` SELECT = SHIPPER(자기 오더)·AGENCY(자기 대리점 오더)·ADMIN·ZENITH_SUPER_ADMIN. **MANAGER는 SELECT/ALL 정책이 없다**(`Admins can manage order costs`도 ADMIN·SUPER_ADMIN만).
- 규칙 1은 MANAGER 마감을 허용하지만, 현 정책으로는 MANAGER 세션에서 청구 행 생성·인보이스 갱신이 **RLS에서 막힌다**. DEF-B-166의 MANAGER 실패 경로와 동일 계열.
- 이 Task에서 정책을 넓히지 않는다(권한 확대는 별도 결정). → **MANAGER 처리 방침을 JSJung이 결정**해야 구현 착수가 가능하다.
- 원가 컬럼(`zen_ups_actual_cost`) 접근 차단은 TASK-B-377/#1451 설계 범위다. 이 Task는 `zen_order_costs`에 원가 컬럼을 추가하지 않는다.

### 2-3. 화면·PDF 표시 (B-377 연계)

- 쉬퍼 tier: `zen_order_costs`의 `cost_name`을 그대로 표시. `cost_type='SETTLEMENT_CHARGE'`의 라벨은 비관리자 "부가운임", 관리자 화면은 항목명 + (원가 아님) 그대로.
- `ADMIN_TO_AGENCY`: 비용 행이 없으므로 `metadata.settlement_charges[]`(또는 B-377의 가드된 조회 함수)로 항목명을 표시. **B-377의 표시 소스는 이 Task의 청구 행 결과를 사용**한다.
- PDF(`src/lib/finance/pdf.ts`)는 `cost_name` 우선, 없으면 기존 `cost_type` 매핑.
- `cost-type-labels.ts`에 `SETTLEMENT_CHARGE: '부가운임'` 추가(비관리자 기준). 관리자 화면에서 항목명을 쓰려면 `cost_name`을 우선 사용한다.

### 2-4. R-11 API 계약

- 기존 마감 액션 입력 확장을 권장:
  - `recordUpsActualCost` / `recordActualCostAndFinalize`의 `otherCharges: {name, amount, currency}[]`를 **청구 반영 대상**으로 사용(현재 A만 저장, B는 무시).
  - 반환값에 `billing?: { invoiceId, tier, createdRows: {name, amount, currency}[], total }` 추가(관리자 화면 확인용).
- 신규 별도 액션(`applySettlementCharges`)은 만들지 않는다 — 마감과 분리되면 부분 성공 상태가 생긴다.
- Ds-11 갱신 대상: `ups-actual-cost.ts`(마감·부가운임 반영), `settlement.ts`(마감 후 조정 연결), `daily-billing`/`OrderFinanceSummary`/`pdf.ts`(표시), `zen_order_costs`(컬럼·cost_type).

### 2-5. 테스트 계획

1. **단위/통합(실DB, ADMIN)**: B 경로 중량 변경 + 부가운임 2건 → 쉬퍼 인보이스 총액 = 재계산 운임 + 부가운임 합, `ADMIN_TO_AGENCY` 총액 = 신규 agency 총액 + 부가운임 합.
2. **A 경로**: 마감 전 부가운임 입력 → 청구 행 생성 후 `is_finalized=true` 총액에 포함. 마감 후 입력 → 조정 인보이스 생성·연결.
3. **멱등성**: 같은 입력 2회 → `SETTLEMENT_CHARGE` 행 수 불변, 총액 불변. 중량만 변경 재마감 → 부가운임 유지, ADJ만 갱신.
4. **정산 해제 후 재마감**: 행 삭제 → 재생성, 총액 정합.
5. **중복(B+C)**: 같은 항목을 양쪽에 입력했을 때 합계가 1회인지 2회인지 — **구현 착수 시 필수 실측**.
6. **세션 실측(RLS)**: SHIPPER·AGENCY가 자기 인보이스의 부가운임 항목명·금액을 조회 가능, 원가 컬럼은 불가. ADMIN/SUPER_ADMIN 정상. **MANAGER는 현 정책상 실패 예상 — 결과를 그대로 기록**.
7. **화면**: before/after 스크린샷(화주·대리점), `cost_name` 폴백으로 기존 화면 무회귀.
8. `npm run test:regression` PASS.

### 2-6. 마이그레이션·롤백 분리

| # | 내용 | 적용 시점 | 롤백 |
|:-:|:--|:--|:--|
| M1 | `zen_order_costs.cost_name text NULL` 추가 | **앱 배포 전** (의존성) | `DROP COLUMN cost_name` |
| M2 | (필요 시) 신규 `cost_type` 사용에 따른 인덱스/뷰 없음 — DDL 없음 | — | — |
| M3 | (JSJung 결정 시) C 경로 통합·중복 차단에 따른 데이터 정리 | 앱 배포 후 별도 | 데이터 복원 SQL |

- 원가 테이블(`zen_ups_actual_cost`) 정책 변경은 TASK-B-377 범위이며 이 Task에 포함하지 않는다.

---

## 3. 미확인·확인 필요 (unknown으로 명시)

| # | 항목 | 상태 |
|:-:|:--|:--|
| 1 | 확정 규칙 2가 "중량 변경이 없어도 항상 재계산"인지 | **미확인 — JSJung** |
| 2 | 항목별·합산 반올림 기준, 음수 허용 | **미확인 — JSJung** |
| 3 | `ADMIN_TO_AGENCY`와 쉬퍼 인보이스 통화가 다를 때 환산 정책 | **미확인 — JSJung** |
| 4 | C 경로 통합 vs 마감 후 전용 제한 | **미확인 — JSJung** |
| 5 | MANAGER 청구 행·인보이스 접근 정책 | **미확인 — JSJung** (현 정책상 불가) |
| 6 | B+C 동시 입력 시 실제 중복 합산 여부 | **미실행 — 구현 착수 시 실측** |
| 7 | 마감 후 조정 인보이스의 `invoice_tier`/`billed_org_id` 미설정 영향 | **미확인 — 별도 확인** |
| 8 | 실제 UPS 요율에서 입력 부가운임이 estimate에 어떻게 반영되어야 하는지 | **미확인 — JSJung/요율 담당** |

---

## 4. [작업 결과]

- **설계 의견 전용**: 코드·마이그레이션 변경 없음. 실측은 임시 vitest 파일로 수행 후 삭제(커밋 없음).
- 실측 근거: §1-2~1-5 표(실DB, ADMIN, `estimateUpsFreight` stub).
- 연계: TASK-B-377(#1451, PR #1454)의 표시 설계가 이 Task의 청구 행 결과를 소스로 사용한다.
- PR: #1460 (draft, `Refs #1459`, `Refs #1451`) — JSJung 확정 후 구현.
