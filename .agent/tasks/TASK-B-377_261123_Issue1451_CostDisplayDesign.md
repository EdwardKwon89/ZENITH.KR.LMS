# TASK-B-377 — Issue #1451: UPS 원가 열람 admin 전용 정렬 + 부가운임 항목별 표시·라벨 중립화 (설계 의견)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1451](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1451) (#1449 A·#1442 대체, 설계 의견부터) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **상태** | 📝 설계 의견 (`status:draft`) — **구현 금지** |
| **브랜치** | `feature/teamb-task-b377-iss1451-cost-display-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **채번** | `.agent/tasks` TASK-B-377 없음 — 이슈 지정 번호 사용 |
| **공개 저장소 주의** | 노출 경위·재현 절차는 본문에 쓰지 않고 "도달 가능/불가 + 근거 위치"만 기재 |

## 확정 규칙 (JSJung)

1. UPS 정산마감은 admin(SUPER_ADMIN·ADMIN·MANAGER)만.
2. 정산마감 시 수정된 청구중량으로 agent·shipper 운임 재계산.
3. 정산마감 시 추가된 부가운임은 agent·shipper 부가운임으로 적용.
4. **기본운임·유류·급행·총원가·환율·할증률 = admin만**. **부가운임은 agent·shipper에게 표시**.
5. 화주·대리점 라벨은 **"부가운임"**.
6. 정산마감에서 추가한 부가운임의 **항목명**도 표시.

## 1. 조사 (실측·코드)

### 1-1. `zen_ups_actual_cost` 원가 열람 (A 범위)

| 항목 | 실측 |
|:--|:--|
| RLS 정책 | `admin_manager_all`(ADMIN·MANAGER·SUPER_ADMIN·SUB_ADMIN ALL) + **`shipper_agency_select`(SELECT, 화주/대리점)** |
| 실제 세션 | SHIPPER·AGENCY가 `zen_ups_actual_cost`에서 `total_cost_krw=1000` 조회 성공 — **원가 컬럼 도달** |
| 액션 | `getUpsActualCost`는 `validateUserAction()`만, 역할 가드 없음 (`DEF-150 §1.3`) |
| b365 원가 컬럼 5개 | `cost_surcharge_rate`·`cost_surcharge_amount_krw`·`applied_exchange_rates`·`calc_version`·`cost_legacy_snapshot` — 같은 테이블/정책 아래 존재 |
| 앱 호출 경로 | `UpsActualAdjustmentForm`(#1440 관리자 전용 렌더), 오더정산 상세(Admin), `getOrderRevenueCost`(non-admin은 actual_cost 미사용) |

**결론**: RLS 정책 제거 + `getUpsActualCost` 관리자 가드가 필요. b365 컬럼은 추가 조치 없이 같은 정책으로 함께 차단된다.

### 1-2. 두 정산 경로 관계 (확인/미확인 구분)

| 경로 | 쓰는 테이블 | 인보이스 반영 |
|:--|:--|:--|
| `recordUpsActualCost` (B) | `zen_ups_actual_cost`, `zen_ups_actual_other_charges`, `zen_order_costs(UPS_ACTUAL_COST_ADJ)` | shipper 인보이스 `total_amount` 델타 갱신 |
| `recordActualCostAndFinalize` (A) | `zen_ups_actual_cost`, `zen_ups_actual_other_charges` | `finalizeInvoice`로 마감(기존 `zen_order_costs` 합계 기준) |
| `recordUpsActualCharges` | `zen_ups_actual_charges`, `zen_order_costs(UPS_ACTUAL_ADJUSTMENT)` | 마감 전 인보이스 합계 갱신 |

- **확인(코드)**: B와 charges 경로는 서로 다른 `cost_type`으로 **각각 인보이스 합계에 더해진다**. 같은 경제적 부가운임을 양쪽에 입력하면 **중복 반영 가능**하며, 두 경로 사이 dedup/상호 참조가 없다.
- **미확인(실DB 미실행)**: B+charges를 한 오더에 동시에 입력해 인보이스가 실제로 얼마가 되는지 end-to-end 재현은 이번 설계 단계에서 실행하지 않았다. (정산 엔진·rate snapshot fixture 필요)
- **미확인**: A 경로의 `zen_ups_actual_other_charges`가 `zen_order_costs`로 복사되지 않아, A 경로 부가운임이 인보이스 라인에 어떻게 반영되는지 → **별도 확인 필요**.

### 1-3. `zen_ups_actual_other_charges` RLS (Jaison 추정 검증)

정책:
```sql
shipper_agency_select_other_charges
  ... JOIN zen_ups_actual_cost c ON c.order_id = o.id ...
  WHERE c.id = zen_ups_actual_other_charges.order_id
```
- `c.id`(원가 행 PK)와 `other_charges.order_id`(오더 FK)를 비교 → **항상 불일치**.
- 실DB 세션 실측:

| 세션 | other_charges 조회 |
|:--|:--|
| SHIPPER | **0행** |
| AGENCY | **0행** |
| ADMIN | 1행 (`주소정정 수수료`, 20 HKD) |

→ 정책 술어 버그 확인. 부가운임 항목을 화주·대리점에 표시하려면 `c.order_id = zen_ups_actual_other_charges.order_id`로 수정 필요.

### 1-4. 라벨 노출

| 위치 | 현재 |
|:--|:--|
| `OrderFinanceSummary` 비용 라인 | `getCostTypeLabel('UPS_ACTUAL_ADJUSTMENT')` → 매핑 없음 → `UPS ACTUAL ADJUSTMENT` 원문 |
| 일일청구 breakdown | `actualAdjustment` 컬럼(라벨은 화면 문구) |
| 인보이스 PDF (`pdf.ts`) | `cost.cost_type` 원문 그대로 |
| `cost-type-labels.ts` | `UPS_ACTUAL_ADJUSTMENT` 매핑 없음 |

## 2. 노출 경로 표 (두 축)

`원가 컬럼 도달` = `zen_ups_actual_cost`의 기본/유류/총원가/환율/할증률 등. `부가운임 항목 표시` = item name/amount.

| # | 경로 | SHIPPER | AGENCY | 원가 컬럼 도달 | 부가운임 항목 표시 |
|:-:|:--|:--:|:--:|:--:|:--|
| 1 | `getUpsActualCost` 액션 | ✅(RLS) | ✅ | **도달(가드 없음)** | — |
| 2 | 오더정산 상세(Admin) | ❌ | ❌ | ❌(Admin 전용) | Admin |
| 3 | `UpsActualAdjustmentForm` | ❌(#1440) | ❌ | ❌ | — |
| 4 | `OrderFinanceSummary` | ✅ | ✅ | ❌(zen_order_costs만) | `UPS_ACTUAL_ADJUSTMENT` aggregate 라벨 원문 |
| 5 | `daily-billing` summary/details | ✅ | ✅ | ❌ | `actualAdjustment` 금액만(항목명 없음) |
| 6 | `invoice-files` PDF | ⚠️ | ⚠️ | ❌ | `UPS_ACTUAL_ADJUSTMENT` 라인 원문 |
| 7 | `order-revenue-cost` | ✅(자기) | ✅ | ❌(매출 합계) | — |
| 8 | `other_charges` 직접 조회 | ✅(정책상) | ✅ | ❌ | **0행(정책 버그)** |
| 9 | `zen_ups_actual_charges` | ❌(#1441) | ❌ | — | 닫힘 |
| 10 | claims/statistics | 제한적 | 제한적 | ❌ | 미확인 |

- **화면 합계 = 인보이스 총액**은 현재 #4에서 `UPS ACTUAL ADJUSTMENT` 포함으로 일치. 항목명 표시를 위해 #8 정책 수정 + 라벨 중립화 필요.

## 3. 부가운임 항목별 표시안 비교

| 안 | 변경 | 장점 | 단점·위험 | 되돌리기 |
|:--|:--|:--|:--|:--|
| **A. `zen_ups_actual_other_charges` RLS 정책 수정 + 기존 읽기 경로** | 정책 술어 1건(`c.order_id = ...`) + 화면/액션에 child rows 조회 추가 | 항목명·금액 데이터 이미 존재, 원가 컬럼 없음 | 금액이 HKD/원가 통화 → 인보이스 KRW 환산 필요. charges 경로(`zen_ups_actual_charges`) 항목은 여전히 이름 없음 | 정책 원복 |
| **B. 안전 뷰(`zen_order_costs_safe`/`other_charges_safe`)** | 뷰+GRANT+읽기 전환 | 컬럼 단위 통제 명확 | 변경 파일 많음, RLS/조인 영향, 금액 환산 | 뷰 제거 |
| **C. 가드된 조회 함수** | Admin/소유 검증 후 항목 DTO 반환(원가 제외, 환율 적용) | 표시 금액 기준·통화·권한을 한 곳에서 통제 | 신규 액션/Ds-11·테스트 | 함수 제거 |

**권장**: **C(가드된 조회 함수)**. `getOrderAdditionalCharges(orderId)`가 `validateUserAction` + 소유(화주/대리점) 또는 admin을 확인하고, `zen_ups_actual_other_charges`의 `charge_name/amount/currency`를 **인보이스 통화로 환산한 표시 금액**과 함께 반환. `zen_ups_actual_charges`는 #1441대로 닫아 두고, 그 경로로 입력된 부가운임은 `UPS_ACTUAL_ADJUSTMENT` aggregate만 표시(항목명 필요 시 별도 저장 구조 확장).
- 금액 기준: **화주 청구액 기준(인보이스 통화·적용 환율)**. 원가 통화(HKD)는 서버에서만 사용.
- A안은 최소 변경이나 charges 경로 항목명 문제가 남고, B는 과함.

## 4. `zen_order_costs`의 `UPS_ACTUAL_ADJUSTMENT` 처리

- 이 행은 **화주 청구용 부가운임 합계**이므로 #1442 A안처럼 숨기면 안 된다(폐기).
- 항목별 표시가 불가능하므로 aggregate 라벨은 **"부가운임"**으로 중립화하고, 상세 항목은 C 함수로 child rows를 사용한다.
- RLS 정책은 변경하지 않는다(부가운임은 보여야 함).

## 5. 라벨 중립화 (규칙 5)

- `getCostTypeLabel`에 audience 인자 추가(`getCostTypeLabel(costType, { admin: boolean })`) — `UPS_ACTUAL_ADJUSTMENT` → 비관리자 "부가운임", 관리자 원문 유지.
- 적용: `OrderFinanceSummary`(isAdmin prop), `ShipperDailyBillingClient` breakdown, `pdf.ts`(발행 audience 전달), 인보이스 PDF 라인.
- i18n: `ko/en/zh/ja` 4로케일 `Finance.additionalCharge`(가칭) 추가. 관리자 화면 라벨 불변.

## 6. 이슈 #1449 A 구현 계획 (설계 확정 후)

1. 앱: `getUpsActualCost`에 admin 가드(SUPER_ADMIN·ADMIN·MANAGER) + `logger.warn`/`permission_denied`.
2. 마이그레이션(별도, **앱 배포 뒤 마지막**): `zen_ups_actual_cost`의 `shipper_agency_select` DROP. b365 5컬럼은 같은 정책으로 차단됨(확인).
3. 롤백 SQL: 정책 재생성(원문) — 마이그레이션 파일에 포함.
4. `zen_ups_actual_other_charges` 정책 수정 마이그레이션(별도): `c.order_id = other_charges.order_id` + own order 조건.
5. 테스트: SHIPPER·AGENCY 원가 0행 / ADMIN·SUPER·MANAGER 읽기 / **양성 대조** 부가운임 항목 표시 / 함수별 되돌리기 / UI before-after.

## 7. DEF 보고 (R-18, 수정 금지)

- **DEF-B-165**: 일괄 마감 AGENCY 허용·화면 버튼·UPS 포함 가능 · 서버 success true/DB 미변경.
- **DEF-B-166**: `markInvoiceFinalized` 0행 무시 + history 기록 + MANAGER RLS 실패·`recordActualCostAndFinalize` warn-only.

## 8. Ds-11 / 마이그레이션 분리

- Ds-11: `getUpsActualCost` admin 전용, `getOrderAdditionalCharges`(신규 시), `zen_ups_actual_cost`/other_charges 정책 설명 갱신.
- 마이그레이션 3개 분리: (1) app deploy, (2) `zen_ups_actual_cost` 정책 DROP, (3) other_charges 정책 수정 — 각 롤백 SQL 포함, 운영 선적용 순서 준수.

## 9. [작업 결과]

- 설계 의견 + before 스크린샷 2장(`docs/02_Analysis/evidence/task-b377/before-{shipper,agency}.png`).
- **구현·마이그레이션 없음** (설계 확정 전).
- PR: #1454 (draft, `Refs #1451`·`Refs #1449`) — after 스크린샷은 구현 단계에서.
