# TASK-B-381 — Issue #1459: UPS 정산마감 부가운임의 화주·대리점 청구 자동 반영 (설계 의견, 6차)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) (TASK-B-377 / #1449 A 연장) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **설계 확정: JSJung·Aiden** |
| **상태** | 📝 설계 의견 6차 (`status:draft`) — **구현 금지** |
| **브랜치** | `feature/teamb-task-b381-iss1459-settlement-charge-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **공개 저장소 주의** | 노출 경위·재현 절차는 쓰지 않고 "도달 가능/불가 + 코드 위치"만 기재 |
| **6차 반영** | JSJung: **컷오버 폐기** — 청구서관리는 신규 기능으로만 적용, 기존 데이터 보존·호환 의무 없음. Jaison 5차 보완 중 컷오버 항목은 영구 폐기 |

## 0. 범위 — UPS 오더 전체 단일 신규 경로

- **컷오버일·레거시 병행·"기존 인보이스는 그대로"는 폐기**한다.
- UPS 오더의 정산마감·청구는 **신규 경로 하나**로 동작한다.
- 비UPS 오더는 이번 개편 범위 밖이며 변경하지 않는다(JSJung 확인 대기).
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
| 2 | 인보이스 정리 방어 | UPS 오더에 **비취소 인보이스가 남아 있으면 `ups_invoice_exists` 거부** — 일괄 취소 스크립트(§2-4) 전에는 정산 불가 |
| 3 | 원가 저장 | `zen_ups_actual_cost` upsert + 원가 측 부가항목 저장 |
| 4 | 매출 재계산 | 입력 중량·치수로 `recomputeRevenue` — A·B 구분 없이 수행 |
| 5 | 환산·반올림 | 부가운임 항목별 KRW 환산(출고확정일), 항목별 2자리 반올림 |
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
- 비UPS 오더의 인보이스 생성·마감은 **변경하지 않는다**(JSJung 확인 대기 — 이 범위 밖).
- `generateInvoicesForOrder`를 직접 호출하는 관리자 액션(`generateInvoiceAction`)도 UPS 오더에는 사용하지 않도록 UI/가드를 정리한다.

### 2-5. 이미 생긴 UPS 인보이스 처리 — 비교

| 안 | 내용 | 장점 | 단점·위험 |
|:--|:--|:--|:--|
| **(a) 일괄 취소 (권장)** | UPS 오더의 비취소 인보이스를 1회 스크립트/마이그레이션으로 `CANCELED` 처리(연결 원가 행은 불변 트리거로 건드리지 않음). 이전 상태 백업 + 롤백 SQL | 신규 경로와 충돌 제거, `legacy_invoiced_order` 가드 자연 통과 | PAID 인보이스 처리·회계 영향 확인 필요 |
| (b) `legacy_invoiced_order` 가드 제거 | 정산 가드만 제거 | 변경 작음 | 남은 인보이스와 이중 청구 위험 |
| (c) 가드 유지 + 제외 표시 | 기존 상태 유지 | 데이터 무변경 | 해당 오더 정산 불가, 단일 경로 원칙 위배 |

- **권장: (a)**. `PAID` 인보이스는 일괄 취소에서 **제외**하고, 해당 오더는 `paid_invoice_exists`로 신규 정산을 막아 **이중 청구를 방지**한다(처리 방침은 JSJung 확인).
- 스크립트는 `zen_invoices` 상태만 변경하고 `zen_invoice_history`에 사유를 남긴다. 연결 `zen_order_costs`는 그대로 둔다.
- 원격 DB 변경은 **R-14 승인 후**에만 수행한다.

### 2-6. 기존 SETTLED·run 없는 UPS 오더 처리

| 안 | 내용 | 장점 | 단점 |
|:--|:--|:--|:--|
| **(a) 재정산 대상으로 초기화 (권장)** | `SETTLED`이면서 run이 없는 UPS 오더를 `NOT_SETTLED`로 1회 초기화(백업·롤백 SQL) | 단일 경로로 재정산·청구 가능 | 상태 이력 변경 |
| (b) 청구서 대상에서 제외 | run 없으면 `settlement_run_missing`으로 차단 | 데이터 무변경 | 해당 오더 영구 미청구 |
| (c) 최소 run 백필 | 기존 원장/스냅샷으로 run 1회 생성 | 청구 가능 | 레거시 금액 품질 문제 재도입 |

- **권장: (a)**, 보존 의무가 없고 단일 경로 원칙에 맞다. 초기화 대상·시점은 배포 절차에 포함한다.
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
- 이미 `SETTLED`면 거부, 비취소 UPS 인보이스가 있으면 `ups_invoice_exists`, PAID 인보이스가 있으면 `paid_invoice_exists`.
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
7. 기존 UPS 인보이스 일괄 취소(연결 원가 불변) + `ups_invoice_exists` 해제, PAID 예외 차단.
8. 기존 SETTLED·run 없음 초기화 → 재정산 성공(`settlement_run_missing` 해소).
9. 옛 UPS 화면·액션 제거 후 비UPS 화면 무회귀.
10. R-10: 새 정산마감·청구서 화면(화주·대리점) 스크린샷, `/admin/error-logs` 신규 ERROR 0.
11. `npm run test:regression` PASS, `npm run build`.

### 2-12. 마이그레이션·배포 순서

| # | 내용 | 시점 | 롤백 |
|:-:|:--|:--|:--|
| M1 | run 3테이블 + RLS(tier) + 불변 트리거 | 앱 배포 전 | DROP TABLE |
| M2 | `billing_items_amounts` run 전용 + `zen_billing_statement_items`(`freight_adjustment`·`charge_details`) + 통화 가드 제거 | 앱 배포 전 | 함수/컬럼 원복 |
| M3 | RPC `finalize_ups_settlement_run`(보안 GRANT 포함) | 앱 배포 전 | DROP FUNCTION |
| M4 | UPS 인보이스 일괄 취소(비PAID) + 상태 백업 + `zen_invoice_history` | 앱 배포 후 **R-14 승인 후** | 백업에서 상태 복원 |
| M5 | 기존 SETTLED·run 없음 UPS 오더 `NOT_SETTLED` 초기화(백업·롤백) | M4 후 | 백업에서 복원 |

**배포 순서**
1. Ds-11 확정.
2. M1·M2·M3 배포(추가형).
3. 앱 배포: UPS 자동 인보이스 중단 + 신규 정산 화면/액션(비취소 UPS 인보이스가 있으면 `ups_invoice_exists`로 차단).
4. M4 실행 → 비취소 UPS 인보이스 0건 확인.
5. M5 실행(필요 시) → 기존 SETTLED UPS 오더 재정산 가능.
6. R-10: 신규 경로로 정산·청구서 생성 확인.

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

| # | 항목 | 상태 |
|:-:|:--|:--|
| 1 | 비UPS 오더 무변경 | **JSJung 확인 대기** (이 범위 밖 가정) |
| 2 | PAID UPS 인보이스 처리 | **JSJung 확인** — 일괄 취소 제외 + 신규 정산 차단(`paid_invoice_exists`) 권장 |
| 3 | 기존 SETTLED·run 없음 UPS 오더 | **JSJung 확인** — 재정산 초기화(M5) 권장 |
| 4 | `zen_ups_actual_charges` DROP | **JSJung 결정**(코드 제거 후, 비가역) |
| 5 | `billing_items_amounts` 폴백 제거 | **(a) run-only 권장** — Jaison/Aiden 확인 |
| 6 | #1453 조율 | 회신 대기 |
| 7 | R-10 증적 대상 | 새 정산마감·청구서 화면(화주·대리점) |

## 4. 관련 DEF (수정 금지)

- DEF-B-165·166·167·169·170, DEF-B-168 링크. 영향표는 §2-8. DEF 번호 신규 등록 없음(설계 단계).

## 5. [작업 결과]

- **설계 의견 6차**: 컷오버 폐기·단일 신규 경로로 재작성. 5차 승인(run·RLS·RPC·청구서 금액 원천) 유지.
- 삭제: 컷오버 설정/RPC/동결/감사/경계/시험 환경, `isBeforeCutover`, LEGACY 분기.
- 추가: 자동 인보이스 중단, 기존 인보이스 처리, SETTLED 초기화, 옛 기능 정리표, DEF 영향표.
- 코드·마이그레이션 변경 없음.
- PR: #1462 (draft, `Refs #1459`, `Refs #1451`, `Refs #1453`, `Refs #1463`, `Refs #1369`).
