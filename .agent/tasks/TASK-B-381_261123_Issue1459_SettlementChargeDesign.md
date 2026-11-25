# TASK-B-381 — Issue #1459: UPS 정산마감 부가운임의 화주·대리점 청구 자동 반영 (설계 의견, 7차)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) (TASK-B-377 / #1449 A 연장) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **설계 확정: JSJung·Aiden** |
| **상태** | 📝 설계 의견 8차 — **Aiden 조건부 확정 조건 반영, 확정 해제 요청** (`status:draft`) — 구현 금지 |
| **브랜치** | `feature/teamb-task-b381-iss1459-settlement-charge-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **공개 저장소 주의** | 노출 경위·재현 절차는 쓰지 않고 "도달 가능/불가 + 코드 위치"만 기재 |
| **8차 반영** | Aiden 조건부 확정(2026-11-24) 조건 4건 + 비차단 2건 반영. 7차 JSJung 결정 유지 |

## 0. 범위 — UPS 오더 전체 단일 신규 경로

- **컷오버일·레거시 병행·"기존 인보이스는 그대로"는 폐기**한다.
- UPS 오더의 정산마감·청구는 **신규 경로 하나**로 동작한다.
- 비UPS 오더는 이번 개편 범위 밖이며 **변경하지 않는다(확정)**.
- 기존 데이터는 보존하되 **호환·이중 청구를 위한 레거시 분기는 두지 않는다**.

### 확정·유지되는 결정
| # | 내용 |
|:-:|:--|
| 1 | UPS 정산마감은 admin(ZENITH_SUPER_ADMIN·ADMIN·MANAGER)만. RPC 역할에 **MANAGER 포함** |
| 2 | 정산마감 시 수정된 청구중량으로 화주·대리점 운임 재계산(규칙 2) |
| 3 | 부가운임은 항목명·금액으로 화주·대리점 청구에 반영(규칙 3·4·6) |
| 4 | 임시저장=원가만 / **정산 완료=run 생성 + `SETTLED`** |
| 5 | run 저장소·RPC 보안·원자성·tier 단위 RLS·불변성(5차 승인) 유지 |
| 6 | 부가운임은 **KRW**(청구서 기준 통화), 출고확정일 환율, 항목별 반올림 |
| 7 | 실비 등록은 **전 오더에서 폐기** — 정산마감을 통해서만 |
| 8 | B-377 표시 소스는 **run** 기준으로 갱신 |

---

## 1. 현황 실측 (설계 근거)

### 1-1. 기존 경로는 부가운임을 청구에 반영하지 못한다

| 경로 | 실측 결과 | DEF |
|:--|:--|:--|
| A `recordActualCostAndFinalize` | 중량 입력·저장은 하지만 **재계산 없음**, 부가운임 청구 행 없음, 총액 80으로 마감 | DEF-B-169 |
| B `recordUpsActualCost` | 입력 부가운임 청구 미반영, 항목명 테이블 0행 | DEF-B-170 |
| C `recordUpsActualCharges` | `UPS_ACTUAL_ADJUSTMENT`만 생성, 항목명 없음, 2회차 `ADJUSTMENT_UPDATE` 실패 | DEF-B-167 |

### 1-2. 청구서 금액 원천의 한계 (run 저장소가 필요한 이유)

| 측정 | 결과 |
|:--|:--|
| `billing_items_amounts` 화주 | ADJ·부가운임이 `other_charges`에 혼입 |
| `billing_items_amounts` 대리점 | 요율 스냅샷만 읽어 **정산 결과 미반영** |
| 청구중량 | 스냅샷 `billingWeightKg` 우선 → 실측 재계산 미반영 |
| 통화 | 비KRW 원장은 `unsupported_cost_currency`로 차단 |

→ **정산 결과를 청구서가 읽는 단일 run 저장소(run-only)** 가 필요하다.

### 1-3. run 테이블 불변성

- `zen_order_costs` 연결 행은 UPDATE/DELETE 차단 트리거가 운영에서도 활성(Aiden 읽기 전용 조회).
- run 테이블도 같은 원칙(append-only)으로 설계한다(§2-3).

---

## 2. [설계 의견]

### 2-1. 단일 정산마감 `finalizeUpsSettlement`

| # | 단계 | 내용 |
|:-:|:--|:--|
| 1 | 가드 | admin 3역할(세션), UPS·`DELIVERED`·미정산 |
| 2 | 인보이스 정리 방어 | UPS 오더에 **비취소 인보이스가 남아 있으면 `ups_invoice_exists` 거부**. **DEFINER RPC 내부에서 확인**(앱 선확인은 보조) — 일괄 취소 스크립트(§2-4) 전에는 정산 불가 |
| 3 | 원가 저장 | `zen_ups_actual_cost` upsert + 원가 측 부가항목 저장 |
| 4 | 매출 재계산 | 입력 중량·치수로 `recomputeRevenue` — **run에 저장할 화주·대리점 target 계산용**. `zen_order_costs`를 갱신하지 않으며, 새 경로는 `UPS_ACTUAL_COST_ADJ` 델타를 생성하지 않는다(기존 행은 보존) |
| 5 | 환산·반올림 | 부가운임 항목별 KRW 환산(**출고확정일 기준**), 항목별 2자리 반올림. 기준일은 `getOrderReleasedDate` 정의(최신 RELEASED의 UTC 날짜, 이력 없으면 오더 생성일/오늘 폴백)를 따르며 기존 견적·원가 경로와 동일 |
| 6 | RPC 1회 | `finalize_ups_settlement_run`: run+amounts+charges 저장 + 주문 `SETTLED` **한 트랜잭션** |
| 7 | 후속 | 알림(best-effort), revalidate |

- **반영 시점**: 임시저장은 원가만, 청구 반영은 정산 완료 시점(기존 방침). 초안 금액은 청구서에 노출되지 않는다.
- 원가 저장(3)은 RPC 밖이다. RPC 실패 시 원가만 남지만 청구·상태는 변하지 않아 **재사용 가능한 임시저장**이다(DEF-B-166(b)의 거짓 마감 이력과 다름).
- **표시·청구 단일 소스**: run. 보조로 `zen_ups_actual_cost`(원가, admin)만 유지한다.

### 2-2. `billing_items_amounts` — run 전용 (레거시 폴백 제거)

| 안 | 내용 | 장점 | 단점 |
|:--|:--|:--|:--|
| **(a) run-only (권장)** | 최신 run 금액만 반환. run이 없으면 **청구서 생성 RPC에서 `settlement_run_missing` 오류** | 단일 소스, ADJ·통화·tier 문제 동시 해결, #1453 base 의존 제거 | 기존 SETTLED·run 없는 오더는 청구 불가 → §2-4/2-5에서 처리 |
| (b) 최소 폴백 유지 | run 없으면 현행 `zen_order_costs`/스냅샷 | 기존 오더 청구 가능 | ADJ 혼입·대리점 스냅샷·통화 문제 잔존, 이중 소스 |

- **권장: (a)**. 청구서 생성은 `SETTLED` UPS 오더만 가능하고, 신규 정산은 항상 run을 만든다. run이 없는 `SETTLED` UPS 오더는 §2-5에서 재정산 또는 제외로 정리한다.
- `billing_items_amounts`는 `charge_weight_kg`·tier 금액·`freight_adjustment`·`charge_details`를 run에서 반환한다.
- `create_billing_statement_with_items`의 **비KRW 원장 통화 가드는 제거**한다(run은 KRW 고정, 원장을 읽지 않음).
- #1453(Baker)는 이 함수의 base 의존 제거를 다루므로, **run-only 전환으로 요구가 단순화**된다. 조율 코멘트 유지.

### 2-3. run 저장소·RLS·불변성 (5차 승인 유지)

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
  id uuid pk, run_id uuid, tier text check (ADMIN_TO_AGENCY|SHIPPER), line_no int,
  name text, amount numeric, currency text
  index (run_id, tier, line_no)   -- 같은 이름 중복 허용
```

- **tier**: `ADMIN_TO_AGENCY`(대리점 청구), `SHIPPER`(화주 청구). 한 SHIPPER 행이 `AGENCY_TO_SHIPPER`·`ADMIN_TO_SHIPPER`를 모두 처리한다(근거: `shipper-pricing.ts` — Agency 원가 경유 안 함).
- **append-only**: 재정산은 새 version. 같은 입력 2회는 새 version 미생성(정렬된 name+amount 비교).
- **금액**: `freight_adjustment = target - (base+fuel+surge+other)`(음수 가능), `settlement_charges_total` = 항목별 반올림 합, `line_total = base+fuel+surge+other+freight_adjustment+charges`.
- **RLS tier 분리**: ADMIN/SUPER/MANAGER 전체, AGENCY 자기 `ADMIN_TO_AGENCY`+소속 화주 `SHIPPER`, SHIPPER 자기 `SHIPPER`만(대리점 매입가 0건), anon 0.
- **불변성**: RLS는 SELECT 정책만, `REVOKE ALL` 후 `authenticated`에 SELECT만, run·amounts·charges에 `BEFORE UPDATE/DELETE` 트리거. 쓰기는 DEFINER RPC만.
- **표시**: run 금액·항목명이 화주·대리점 화면/청구서의 단일 소스. `freight_adjustment`는 "운임 조정", `SETTLEMENT_CHARGE`는 "부가운임"으로 분리.

### 2-4. UPS 인보이스 자동 생성 중단

- `operations/orders.ts`의 `nextStatus === RELEASED` 분기에서 **UPS 오더는 `generateInvoicesForOrder`를 호출하지 않는다**(비UPS만 호출).
- **서버 액션 직접 호출 방어**: `generateInvoicesForOrder` 함수 내부에서도 UPS 오더를 `logger.warn`과 함께 거부한다(AGENCY 등 직접 호출 경로 차단). 비UPS 동작은 불변.
- 비UPS 오더의 인보이스 생성·마감은 **변경하지 않는다**(JSJung 확인 대기 — 이 범위 밖).
- `generateInvoicesForOrder`를 직접 호출하는 관리자 액션(`generateInvoiceAction`)도 UPS 오더에는 사용하지 않도록 UI/가드를 정리한다.

### 2-5. 이미 생긴 UPS 인보이스 처리 — 비교

| 안 | 내용 | 장점 | 단점·위험 |
|:--|:--|:--|:--|
| **(a) 일괄 취소 (권장)** | UPS 오더의 비취소 인보이스를 1회 스크립트/마이그레이션으로 `CANCELED` 처리(연결 원가 행은 불변 트리거로 건드리지 않음). 이전 상태 백업 + 롤백 SQL | 신규 경로와 충돌 제거, `legacy_invoiced_order` 가드 자연 통과 | PAID 발견 시 스크립트 중단(방어) |
| (b) `legacy_invoiced_order` 가드 제거 | 정산 가드만 제거 | 변경 작음 | 남은 인보이스와 이중 청구 위험 |
| (c) 가드 유지 + 제외 표시 | 기존 상태 유지 | 데이터 무변경 | 해당 오더 정산 불가, 단일 경로 원칙 위배 |

- **권장: (a)**. 운영 UPS 인보이스에 **PAID는 없음(JSJung 확정)**. `paid_invoice_exists`는 **방어용 가드로만** 유지하고, 일괄 취소 스크립트는 **PAID가 1건이라도 발견되면 중단·보고**한다. 별도 정책 분기·표는 두지 않는다.
- 스크립트는 `zen_invoices` 상태만 변경하고 `zen_invoice_history`에 사유를 남긴다. 연결 `zen_order_costs`는 그대로 둔다.
- 원격 DB 변경은 **R-14 승인 후**에만 수행한다.

### 2-6. 기존 SETTLED·run 없는 UPS 오더 처리

| 안 | 내용 | 장점 | 단점 |
|:--|:--|:--|:--|
| **(a) 재정산 대상으로 초기화 (권장)** | `SETTLED`이면서 run이 없는 UPS 오더를 `NOT_SETTLED`로 1회 초기화(백업·롤백 SQL) | 단일 경로로 재정산·청구 가능 | 상태 이력 변경 |
| (b) 청구서 대상에서 제외 | run 없으면 `settlement_run_missing`으로 차단 | 데이터 무변경 | 해당 오더 영구 미청구 |
| (c) 최소 run 백필 | 기존 원장/스냅샷으로 run 1회 생성 | 청구 가능 | 레거시 금액 품질 문제 재도입 |

- **권장: (a)**, 보존 의무가 없고 단일 경로 원칙에 맞다. 초기화 대상·시점은 배포 절차에 포함한다.
- **M5 초기화 대상 제외**: `zen_billing_statement_items`에 이미 포함된 오더는 초기화하지 않는다(포함 시 중단·보고). 일괄 SQL은 `unmarkOrderCostSettled`의 청구서 포함 검사를 거치지 않으므로 이 조건을 스크립트에 명시한다.
- (c)는 ADJ·통화·tier 문제를 다시 들여오므로 사용하지 않는다.

### 2-7. 옛 UPS 기능 정리표 (비UPS 불변)

| 기능 | UPS 오더 | 비UPS 오더 | 권장 |
|:--|:--|:--|:--|
| 출고확정 시 `generateInvoicesForOrder` | **중단** | 유지 | 조건 분기(§2-4) |
| `BillingConfirmModal` | **제거/숨김** | 해당 없음 | UPS 진입점 제거 |
| `finalizeDailyShipperInvoices` | **UPS 항목 제외** | 유지 | 필터/가드 |
| `recordUpsActualCost` | **제거**(신규 경로 대체) | — | 코드 제거 |
| `recordActualCostAndFinalize` | **제거** | — | 코드 제거 |
| `recordUpsActualCharges` | **전 오더 폐기** | — | 오류/숨김 → 제거 |
| `UpsActualAdjustmentForm` | **제거** | — | UI 제거 |
| `markOrderCostSettled` | 신규 RPC로 흡수 | — | 제거/내부화 |
| `unmarkOrderCostSettled` | 유지(statement 포함 차단) | — | 유지 |
| `/finance/daily-billing` UPS 항목 | **숨김/제외** | 유지 | UI |
| `/finance/statements` | 신규 경로 | — | 사용 |
| `zen_ups_actual_charges` | 데이터 이력 | — | 코드 제거 후 **DROP은 별도 결정**(비가역) |
| `isBeforeCutover` 스텁 | — | — | **제거**(#1369와 중복되지 않게 조율) |
| `legacy_invoiced_order` 가드 | — | — | **제거**(단일 경로, #1369 조율) |

- 실비 등록은 **전 오더에서 폐기**(정산마감 경유만). `zen_ups_actual_charges` 테이블 DROP은 코드 제거와 분리해 비교하고 JSJung이 결정한다.
- `zen_ups_actual_other_charges`는 원가 측 감사용으로 유지(화면 비노출), 청구는 run을 쓴다.

### 2-8. DEF 영향표 (수정 금지, 보고만)

| DEF | UPS 경로 제거 후 | 비UPS 인보이스 |
|:--|:--|:--|
| DEF-B-165 | UPS 포함·AGENCY 허용 부분 **소멸** | 남음 |
| DEF-B-166 | UPS 인보이스 마감 경로 **소멸** | 남음 |
| DEF-B-167 | C 경로 **소멸** | 트리거 자체는 잔존(기존 행) |
| DEF-B-169 | A 경로 **소멸** | 해당 없음 |
| DEF-B-170 | B 경로 **소멸** | 해당 없음 |
| DEF-B-168 | UPS 인보이스 취소는 별도 스크립트 | 비UPS `rejectInvoice` 경로 **남음** |

### 2-9. RPC·보안·원자성 (유지)

- `finalize_ups_settlement_run`: `SECURITY DEFINER`, `search_path` 고정, `REVOKE PUBLIC/anon` → `GRANT authenticated`, `auth.uid()` 역할 검사 **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**, actor 파라미터 없음, 세션 클라이언트 호출.
- run+amounts+charges+`SETTLED` 한 트랜잭션. 부분 실패 없음.
- 이미 `SETTLED`면 거부, 비취소 UPS 인보이스가 있으면 `ups_invoice_exists`, PAID가 있으면 `paid_invoice_exists`(방어용).
- 테스트: SHIPPER·AGENCY·anon 거부, ADMIN·MANAGER 양성 대조.

### 2-10. R-11·Ds-11

- 신규/변경: `finalizeUpsSettlement`, `saveUpsSettlementDraft`, `previewUpsSettlement`, RPC `finalize_ups_settlement_run`, `billing_items_amounts`(run 전용·컬럼 추가), `zen_billing_statement_items`(`freight_adjustment`·`charge_details`).
- 오류: `permission_denied`·`order_not_found`·`not_ups_order`·`ups_actual_cost_status_invalid`·`already_settled`·`ups_invoice_exists`·`paid_invoice_exists`·`settlement_run_missing`·`currency_conversion_failed`·`rpc_failed`.
- Ds-11: `Ds_11_11B_UPS_Agency_Actuals.md`, `Ds_11_04_Finance_Settlement.md`, 인덱스. 구현 PR에서 갱신.

### 2-11. 테스트 계획 (단일 경로)

1. 정산 완료 → run 양 tier, `charge_weight_kg`·`billing_items_amounts` 일치.
2. ADJ `freight_adjustment` 분리, `other_charges` 미혼입, 항목명·항목별 반올림 합=총액(같은 이름 2건 포함).
3. 같은 입력 2회 → 새 version 미생성·금액 불변.
4. run RLS 매트릭스(SHIPPER agency 0건, AGENCY 2 tier, ADMIN 전체, anon 0).
5. RPC 보안·원자성(부분 실패 롤백), MANAGER 양성.
6. UPS 출고확정 → 인보이스 미생성, 비UPS → 생성(회귀).
7. 기존 UPS 인보이스 일괄 취소(연결 원가 불변) + `ups_invoice_exists` 해제. **PAID 발견 시 스크립트 중단·보고**.
8. 기존 SETTLED·run 없음 초기화 → 재정산 성공(`settlement_run_missing` 해소). **청구서 포함 오더는 초기화 제외(중단·보고)**.
9. **MANAGER가 비취소 UPS 인보이스가 있는 오더를 정산 → `ups_invoice_exists` 거부**.
10. `generateInvoicesForOrder` 직접 호출: **UPS 거부**, **비UPS 성공**(회귀).
11. **M4-b**: 대상 2건 삭제 후 참조 무결성·연결 파일 0건 확인(실행 전 조회·백업·롤백 리허설).
12. 옛 UPS 화면·액션 제거 후 비UPS 화면 무회귀.
13. R-10: 새 정산마감·청구서 화면(화주·대리점) 스크린샷, `/admin/error-logs` 신규 ERROR 0.
14. `npm run test:regression` PASS, `npm run build`.

### 2-12. 마이그레이션·배포 순서

| # | 내용 | 시점 | 롤백 |
|:-:|:--|:--|:--|
| M1 | run 3테이블 + RLS(tier) + 불변 트리거 | 앱 배포 전 | DROP TABLE |
| M2 | `billing_items_amounts` run 전용 + `zen_billing_statement_items`(`freight_adjustment`·`charge_details`) + 통화 가드 제거 | 앱 배포 전 | 함수/컬럼 원복 |
| M3 | RPC `finalize_ups_settlement_run`(보안 GRANT 포함) | 앱 배포 전 | DROP FUNCTION |
| M4 | UPS 인보이스 일괄 취소 + 상태 백업 + `zen_invoice_history`(승인된 admin 계정 id를 `changed_by`로 사용). **PAID 발견 시 중단·보고** | 앱 배포 후 **R-14·Edward 승인 후**, 로컬 리허설 후 | 백업에서 상태 복원 |
| M4-b | **출처 오더 없는 비취소 인보이스 2건 삭제**. 참조 행·삭제 제약·트리거·연결 파일 없음 확인 → **단순 삭제**. 대상 행 전체 백업·롤백 SQL. 인보이스 id를 컬럼으로 갖지 않는 참조(알림 등)는 **미확인** — 실행 전 확인 | M4 후, **R-14·Edward 별도 승인**, 로컬 리허설 후. 실행 직전 동일 읽기 전용 조회 재수행 | 백업에서 복원 |
| M5 | 기존 SETTLED·run 없음 UPS 오더 `NOT_SETTLED` 초기화(백업·롤백). **청구서 항목 포함 오더 제외** | M4·M4-b 후, 별도 승인·로컬 리허설 후 | 백업에서 복원 |

**마이그레이션 시각 채번 (2026-11-25 예약)**

| # | 예약 파일명 | 내용 |
|:-:|:--|:--|
| M1 | `20261126090000_task_b381_ups_settlement_run.sql` | run 3테이블 · RLS(tier) · 불변 트리거 |
| M2 | `20261126091000_task_b381_billing_items_amounts.sql` | `billing_items_amounts` run 전용 · statement items 컬럼 · 통화 가드 제거 |
| M3 | `20261126092000_task_b381_finalize_ups_settlement_run.sql` | RPC `finalize_ups_settlement_run`(보안 GRANT 포함) |

- **기준 실측(2026-11-25)**: `origin/develop` 최신 `20261122100200`, `origin/TeamB_Dev` 최신 `20261124100000` → 둘보다 늦은 **2026-11-26 09:00 KST**부터 10분 간격으로 채번했습니다.
- `next-task-number.sh`는 TASK 번호용이므로 마이그레이션 시각 채번에 사용하지 않았습니다.
- 실제 파일 작성 직전 `git fetch origin` 후 양쪽 최신 시각을 재확인하고, 더 늦은 시각이 있으면 **3개 예약 시각을 함께 뒤로** 옮깁니다(타임스탬프가 늦은 쪽이 양보).
- M4·M4-b·M5는 데이터 조치 SQL로 마이그레이션 파일이 아니며, 운영 적용 시점·순서는 #1364에서 Aiden·Edward가 확정합니다. Team B는 로컬 리허설만 합니다.

**배포 순서**
1. Ds-11 확정. **M4·M5 전 R-14 승인 아래 읽기 전용 조회**(UPS 인보이스 건수·상태별·PAID 건수·청구서 포함 오더 수)를 수행하고 결과를 task file에 기록한다.
2. M1·M2·M3 배포(추가형).
3. 앱 배포: UPS 자동 인보이스 중단 + 신규 정산 화면/액션(비취소 UPS 인보이스가 있으면 `ups_invoice_exists`로 차단).
4. M4 실행(로컬 리허설·백업·롤백 확인 후, R-14·Edward 승인) → 비취소 UPS 인보이스 0건 확인.
5. **M4-b 실행**: 실행 직전 읽기 전용 조회 재수행(대상 2건·PAID/참조 없음 확인) → 대상 행 백업 → 삭제 → 참조 무결성 확인. **Jaison·Dave는 실행하지 않는다.**
6. M5 실행(필요 시, 별도 승인) → 기존 SETTLED UPS 오더 재정산 가능.
7. R-10: 신규 경로로 정산·청구서 생성 확인.

- 컷오버 설정·`isBeforeCutover`·레거시 분기는 **없다**.
- 비UPS 오더·인보이스는 무변경.

### 2-13. 연계 정합

- **#1369(TASK-B-363)**: 컷오버 구현이 아니라 **옛 UPS 기능 정리·자동 인보이스 중단** 범위로 변경. B-381은 조건·요구만 명시하고 구현 중복을 피한다. (이전 컷오버 요구 코멘트는 철회)
- **B-377(#1451)**: 표시 소스는 **run 단일**. pre/post 분기 삭제. 설계 갱신 일정은 B-381 확정 후 PR #1454에서.
- **B-382(#1463)**: RPC DEFINER·`zen_order_costs` DML 미사용으로 MANAGER 정책 근거 재산정. 이 Task는 정책 미변경.
- **#1453(Baker)**: `billing_items_amounts` run 전용으로 base 의존이 사라짐 — 조율 코멘트 유지.
- **`zen_ups_actual_charges` DROP**: 코드 제거 후 별도 결정(비가역, JSJung).

---

## 3. 남은 확인 항목

### 확정 (JSJung, 2026-11-24)

| # | 항목 | 확정 | 근거·비고 |
|:-:|:--|:--|:--|
| 1 | 비UPS 오더 무변경 | **확정** | 청구서 생성이 UPS 전용이라 충돌 없음 |
| 2 | PAID UPS 인보이스 | **없음(JSJung)** | `paid_invoice_exists`는 방어용 가드만, 스크립트는 PAID 발견 시 중단·보고 |
| 3 | 기존 SETTLED·run 없음 | **재정산 초기화(M5)** | **청구서 항목 포함 오더는 제외**(중복 청구 방지) |
| 4 | `zen_ups_actual_charges` DROP | **코드 제거 후 별도 결정** | 비가역 |
| 5 | `billing_items_amounts` 폴백 | **run-only(폴백 제거)** | 청구서는 UPS·DELIVERED·SETTLED 전용, 신규 정산은 항상 run 생성 |

| # | 항목 | 상태 |
|:-:|:--|:--|
| 6 | #1453 오율 함수 조율 | **회신 대기** |
| 7 | R-10 증적 대상 | 새 정산마감·청구서 화면(화주·대리점) — 계획 |

## 4. 관련 DEF (수정 금지)

- DEF-B-165·166·167·169·170, DEF-B-168 링크. 영향표는 §2-8. DEF 번호 신규 등록 없음(설계 단계).

## [설계 확정] (Aiden 전속 — R-17)

| 항목 | 내용 |
|:--|:--|
| **확정 대상** | 설계 의견 8차 (head `b688a7eb1`, 내용 커밋 `f2df3a7cf`) |
| **확정 일시** | 2026-11-24 09:49 KST 조건부 확정 → 10:59 KST 조건 반영 확인·**확정** |
| **근거 코멘트** | 조건부 확정: [PR #1462 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1462#issuecomment-7118469514) / 확정: [PR #1462 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1462#issuecomment-7119651852) / 운영 읽기 전용 조회 결과: [PR #1462 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1462#issuecomment-7119652114) |
| **확정 범위** | 단일 신규 경로(`finalizeUpsSettlement` + `finalize_ups_settlement_run`), run 저장소·tier 단위 RLS·불변성, run 전용 `billing_items_amounts`, 컷오버 폐기, 비UPS 무변경, UPS 자동 인보이스 중단(서버 측 가드), M1~M5 배포 순서 |
| **조건 4건 반영 확인** | ① `ups_invoice_exists` DEFINER RPC 내부 확인(§2-1 2단계·§2-11 9번) ② `generateInvoicesForOrder` 서버 측 UPS 거부(§2-4·§2-11 10번) ③ M4 행위자·M4/M5 전 읽기 전용 조회·별도 승인(§2-12) ④ 환율 기준일 정의(§2-1 5단계) — 비차단 2건(`isBeforeCutover`·`legacy_invoiced_order` 제거 정리표)도 반영 |
| **유지되는 전제** | 구현 순서 B-382 → B-381 → B-377. M4·M5(운영 DB 변경)는 로컬 리허설 후 R-14·Edward 별도 승인으로만 실행. 구현은 별도 PR이며 이 PR(설계 문서)은 draft·Squash 병합. #1453(B-379)의 MANAGER 스냅샷 결정은 단계 4(`recomputeRevenue`)의 선행 조건 |
| **상태 라벨** | IS #1459 `status:draft` 제거(2026-11-24 10:59 KST) → `status:open`. **담당자 지정 후 Aiden이 `status:ready` 부여**, 착수 시 담당 Agent가 `status:in-progress` 전환 |

## 5. [작업 결과]

- **설계 의견 8차**: Aiden 조건부 확정 조건 4건(`ups_invoice_exists` RPC 내부, 자동 생성 서버 가드, M4 행위자·사전 조회, 환율 기준일) + 비차단 2건 반영.
- Jaison 6차 보완 3건: M5 청구서 포함 제외, `recomputeRevenue` 목적 명시, §3 확정/근거 정리.
- 7차 지시: PAID는 방어 가드로만, M5 제외 조건·테스트, 상태 표기·§5 갱신.
- 코드·마이그레이션 변경 없음. PR은 draft 유지(`status:draft`).
- **커밋 해시**: 코드 `7d7366ee7cdc6283d51c5ee9d35cb46a9bbd8daa` / 문서 `7d7366ee7cdc6283d51c5ee9d35cb46a9bbd8daa` (M4-b 추가 커밋). 해시 갱신 커밋은 별도.
- PR: #1462 (draft, `Refs #1459`, `Refs #1451`, `Refs #1453`, `Refs #1463`, `Refs #1369`).


## 7. 마이그레이션 시각 예약 (2026-11-25)

- M1 `20261126090000` · M2 `20261126091000` · M3 `20261126092000` (10분 간격)
- 기준: `origin/develop` `20261122100200` / `origin/TeamB_Dev` `20261124100000` 실측, 둘보다 늦은 시각으로 채번
- 작성 직전 재확인·충돌 시 3개 일괄 조정. M4·M4-b·M5는 데이터 조치(운영 절차, #1364)
- **커밋 해시**: 코드 `7d7366ee7cdc6283d51c5ee9d35cb46a9bbd8daa` / 문서 `7d7366ee7cdc6283d51c5ee9d35cb46a9bbd8daa`

## 8. [구현 작업 결과] PR-1 — DB M1~M3 (2026-11-26)

| 항목 | 내용 |
|:--|:--|
| **브랜치** | `feature/teamb-task-b381-iss1459-pr1-db` |
| **PR** | #1536 (`TeamB_Dev`, `Refs #1459`) |
| **마이그레이션 시각** | M1 `20261126090000` · M2 `20261126091000` · M3 `20261126092000` (작성 직전 재확인: develop `20261122100200`·TeamB_Dev `20261124100000`보다 늦음) |
| **범위** | DB만. 앱 액션·화면·자동 인보이스 중단은 PR-2~4 |

### 8-1. 산출물
- M1: `zen_ups_settlement_runs`·`_run_amounts`·`_run_charges` + tier RLS + append-only 트리거 + ROLLBACK 블록
- M2: `billing_items_amounts` run 전용(레거시 폴백 제거) + `zen_billing_statement_items.freight_adjustment`·`charge_details` + 통화 가드 제거 + ROLLBACK 블록
- M3: `finalize_ups_settlement_run`(DEFINER·search_path·GRANT, admin 3역할, 멱등, 인보이스 방어, 원자 처리) + ROLLBACK 블록
- 테스트: `tests/integration/task-b381-settlement-run-db.test.ts` (**12건, 자기완결형 — CI 실행**)
- 회귀 항목: `docs/08_Self_Audit/Checklists/regression-items/TASK-B-381_Issue1459_pr1_db.md`

### 8-2. 테스트 결과

- **자기완결형**: `beforeAll`에서 조직·GoTrue 계정(런타임 난수)·오더를 만들고 `afterAll`에서 정리한다. `skipIf`/전용 환경변수 없이 **CI에서 실행**된다(12/12).
- 신규 DB 통합 **9/9 PASS** — RPC 성공·멱등·불변 트리거·RLS tier·MANAGER 양성·비관리자 거부·인보이스 방어·run 전용 금액·원자성
- 되돌리기: 불변 트리거 비활성 → 1 failed(복구 PASS), M1~M3 롤백 블록 실행 → 객체 0 확인 후 재적용 PASS
- 기존 회귀 갱신: b360 청구서 28/28, b360 Excel 19/19, b359 스키마 36/36
- 전체: **306 passed · 2 skipped / 2,345 passed · 25 skipped**, build SUCCESS

### 8-3. M2 영향 확인 (레거시 폴백 제거)
- run 없는 UPS 오더 청구는 `settlement_run_missing`으로 차단된다.
- 폴백 의존 fixture 3파일을 run 기반으로 갱신했다: `task-b360-billing-statements.test.ts`, `task-b360-excel-export.test.ts`, `taskb359-billing-statement-db.test.ts`.
- 그 외 폴백 의존 테스트는 전체 회귀에서 발견되지 않았다.

### 8-4. 배포·로컬 영향
- 이 PR 병합 후 Mike·Baker 로컬 DB는 `./scripts/check-db-freshness.sh --fix`가 필요하다.
- M5 로컬 리허설(#1532)은 M1 이후 재실측 대상이다.
- 운영 적용은 Aiden(Edward 승인, R-14). M4·M4-b·M5는 이 PR 범위 밖.

### 8-5. 설계 §2-11 14항목 매핑
| # | 항목 | PR/테스트 |
|:-:|:--|:--|
| 1 | run 양 tier·charge weight·billing_items_amounts 일치 | **PR-1** TC-381-01·08 |
| 2 | ADJ 분리·항목명·반올림 합=총액 | PR-2(액션) + PR-1 TC-381-08 |
| 3 | 같은 입력 2회 → 새 version 없음 | PR-1 TC-381-02 + PR-2 |
| 4 | run RLS 매트릭스 | **PR-1** TC-381-04 |
| 5 | RPC 보안·원자성·MANAGER 양성 | **PR-1** TC-381-03·05·06·09 |
| 6 | UPS 출고확정 인보이스 미생성 (비UPS 회귀) | PR-3 |
| 7 | 기존 UPS 인보이스 일괄 취소 | 범위 밖(#1532·운영) |
| 8 | SETTLED·run 없음 초기화 | 범위 밖(#1532·운영) |
| 9 | MANAGER 비취소 인보이스 → `ups_invoice_exists` | **PR-1** TC-381-07 |
| 10 | `generateInvoicesForOrder` 직접 호출 UPS 거부 | PR-3 |
| 11 | M4-b 삭제·참조 무결성 | 범위 밖(#1532·운영) |
| 12 | 옛 UPS 화면·액션 제거 후 비UPS 무회귀 | PR-4 |
| 13 | R-10 화면·ERROR 0 | PR-4 |
| 14 | 전체 회귀·build | **PR-1** + 각 PR |

### 8-6. 실패 관측성·금전 영향
- RPC 실패는 오류 코드로 반환되어 앱에서 `logger.error`로 기록한다(PR-2). 금액·정산 영향이 있어 PR-2에서 핵심 지점 4기준 판정 후 필요 시 CRITICAL 알림을 구성한다.
- **커밋 해시**: 코드 `7d7366ee7cdc6283d51c5ee9d35cb46a9bbd8daa` / 문서 `7d7366ee7cdc6283d51c5ee9d35cb46a9bbd8daa`

### 8-7. 재검토 보완 반영 (Jaison 필수 4·권고 3)

| # | 변경 | 파일·확인 |
|:-:|:--|:--|
| 1 | **멱등 재마감**: 같은 입력 분기에서 오더가 `NOT_SETTLED`면 인보이스 방어 후 **run 생성 없이 `SETTLED` 복구**. 다른 입력은 새 version | M3 §4~5. 테스트 `task-b381-settlement-run-db.test.ts` — unmark 후 재마감 시 run 1건·같은 run_id·`SETTLED`, 다른 입력은 version 2 |
| 2 | **M2 ROLLBACK 실행 가능**: `billing_items_amounts` DROP → b360 두 함수 원문 재적용 → 컬럼 DROP → GRANT/reload. 주석 해제만으로 실행 | M2 하단 블록. 실행 검증: 롤백 후 `billing_items_amounts` OUT **7**·items 컬럼 **11**·두 함수 존재, 재적용 후 **10**·**13** |
| 3 | **Ds-11 갱신**: run 3테이블·RPC·변경 RPC·컬럼 추가 기재, 인덱스 갱신 | `Ds_11_11B_UPS_Agency_Actuals.md §11.19`, `Ds_11_04_Finance_Settlement.md`, `Ds_11_API_상세_명세서.md` |
| 4 | **보안 테스트 추가**: anon RPC 거부, `has_function_privilege`(**anon** f·authenticated t — PUBLIC 직접 검사 아님), `prosecdef=true`·`search_path=public`, GRANT 회수 시 호출 실패(되돌리기) | 동일 테스트 파일 |
| 5 | `settled_by` FK를 **ON DELETE RESTRICT**로 변경 + 오더 CASCADE·불변 트리거 주석 | M1 |
| 6 | 인보이스 `source_order_id` 비교를 **text 비교**로 변경(비uuid 값 형변환 오류 방지) | M3 |
| 7 | **RLS 음성 대조**(비소속 대리점·타 조직 화주 0건) + 오류 `not_ups_order`·`already_settled`(다른 입력)·`paid_invoice_exists` 테스트 | 동일 테스트 파일 |

- 신규 DB 통합 **12/12 PASS**(자기완결형, CI 실행), 전체 **307 passed · 1 skipped / 2,357 passed · 16 skipped**, build SUCCESS.
- 되돌리기: 불변 트리거 비활성 1 failed, GRANT 회수 시 호출 실패, M1~M3 롤백 블록 검증.
