# TASK-B-382 — Issue #1463: MANAGER의 UPS 정산마감 관련 테이블 RLS 정책 정렬 (설계 의견)

| 항목 | 내용 |
|:----|:-----|
| **Issue** | [#1463](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1463) |
| **담당(Worker)** | Baker (Team B) |
| **검증(Auditor)** | Jaison |
| **설계 확정** | **JSJung** (본 문서는 확정 요청용 의견 — 구현 없음) |
| **상태** | 📝 설계 의견 **수정본** (`status:draft`) — Jaison 보완 5건 + JSJung 결정 5건 + Aiden 모순 4건 반영. 재검토·최종 확정 전까지 정책 변경 금지 |
| **브랜치** | `feature/teamb-task-b382-iss1463-manager-rls-design` (base `origin/TeamB_Dev` @ `83bb486f1`) |
| **연관** | DEF-B-166(b), TASK-B-381(#1459), TASK-B-377(#1451 / A), TASK-B-379(#1453) |
| **공개 저장소 주의** | 아래 표는 **허용/거부 결과만** 기록합니다. 노출 경위·재현 절차 세부는 기재하지 않습니다. |
| **개정 이력** | `54ddba60a` 최초 제출 → 본 개정: 검토 의견(PR #1465 2026-11-23 10:40·10:44) 및 JSJung 결정(#1463 2026-11-23 10:43) 전량 반영 |

---

## 0. 범위 · 방법론 (코드 열거와 실측의 구분)

| 구분 | 방법 | 범위 |
|:--|:--|:--|
| **코드 열거** | 6개 서버 액션 본문과 호출 헬퍼의 `from()/insert()/update()/delete()/rpc()` 전수 확인 | 테이블×동작 목록(§1) / 영향 범위(§4-4) |
| **세션 실측 (SELECT)** | 표준 계정으로 **실제 로그인** 후 발급된 사용자 Bearer 토큰으로 각 테이블 가시 행 수 측정 | §2 표 |
| **세션 실측 (DML)** | 동일 로그인 세션의 JWT 클레임을 `authenticated` 롤 트랜잭션에 주입해 INSERT/UPDATE/DELETE를 **매 트랜잭션 ROLLBACK**으로 측정(잔여 데이터 없음) | §3 표 |
| **정책 카탈로그** | `pg_policies` / `pg_constraint` / `information_schema.columns` 조회(읽기 전용) | §2·§4·§6 근거 |
| **미측정(명시)** | 서버 액션 자체의 브라우저 클릭 실행은 하지 않음. `finalizeInvoice` MANAGER 실패는 Jaison 단독 실측(#1463 본문)을 인용. 빈 테이블(0행)은 RLS 판정 불가 → 카탈로그로만 판정 | §2 각주 |

- `ZENITH_SUPER_ADMIN`은 재현 시드에 계정이 없어 **측정 전용 임시 로컬 계정**을 생성·사용 후 삭제했습니다(저장소 변경 없음, 잔여 계정 0건).
- 측정 후 잔여 확인: 인보이스 16 / 오더코스트 24 / 스냅샷 8 / 실비 5 / 부가운임 0건 — 측정 전과 동일, 프로브 행 0건.

### 0-1. 본 개정 반영 대조표

| 출처 | 요청 | 반영 위치 |
|:--|:--|:--|
| Jaison 보완 1 | 공개 저장소 부적합 기재 삭제, 비공개 항목은 한 줄로 대체 | §2·§3·§5·§7 (아래 §5 한 줄) |
| Jaison 보완 2 | 영향 범위(blast radius) 표 + 의도 확인 + 정산 외 경로 테스트 | §4-4, §5, §9-2 ① |
| Jaison 보완 3 | 스냅샷 `SUPER_ADMIN X(0)` 원인(정책명·조건) 명시, #1453 전달, B-382 미변경 | §2, §6 |
| Jaison 보완 4 | `zen_billing_statement_items`를 무결성 위험으로 재기술 + SELECT 전용안 | §2, §4-1, §7, §8 |
| Jaison 보완 5 | SUB_ADMIN을 "질문" → "제외 확정", 업무 사실 확인은 별도 | §7, §9-2 ④ |
| Jaison 정리 | M2를 마이그레이션 표에서 "앱 변경" 메모로 이동 | §8-1 |
| JSJung 결정 1~5 | 방식 B / 8개 정책 / 가드 로컬 허용 / SUB_ADMIN 제외 / 청구서 SELECT / 스냅샷 소관 | §4·§7·§8·§9-1 |
| Aiden 모순 1 | B-381 append-only·DEFINER RPC와 직접 정책 충돌 → 재산정 또는 순서 명시 | §4-1-2, §6, §9-2 ② |
| Aiden 모순 2 | "최소 집합" vs ADMIN 동등 권한 → 비교·의도 명시 | §4-1-1, §9-2 ① |
| Aiden 모순 3 | 스냅샷 null 폴백 의존 → 순서 제안 반영 | §2, §6, §9-2 ③ |
| Aiden 모순 4 | 마감 후 조정 경로가 결정 #2에 종속 → §9 결정 항목에 명시 | §7, §9-2 ② |

---

## 1. 정산마감 경로 테이블×동작 전수표 (코드 열거)

| 함수 | SELECT | INSERT/UPSERT | UPDATE | DELETE |
|:--|:--|:--|:--|:--|
| `recordUpsActualCost` (ups-actual-cost.ts:202) | `zen_orders`(중첩 `zen_order_rate_snapshots.metadata` 포함), `zen_ups_actual_cost`, `zen_invoices`, `zen_order_costs`, `zen_ups_products`, `zen_exchange_rates`(간접), `order_status_history`(간접) | `zen_ups_actual_cost`, `zen_order_costs`(UPS_ACTUAL_COST_ADJ) | `zen_ups_actual_cost`, `zen_invoices`(total_amount·metadata) | `zen_order_costs`(UPS_ACTUAL_COST_ADJ, 멱등 재생성) |
| `recordActualCostAndFinalize` (:546) | `zen_orders`, `zen_ups_actual_cost`, `zen_invoices`, `zen_exchange_rates`(간접) → `finalizeInvoice` 경로 전체 | `zen_ups_actual_cost`, `zen_ups_actual_other_charges` → `finalizeInvoice` 경로 전체 | `zen_ups_actual_cost` → `finalizeInvoice` 경로 전체 | `zen_ups_actual_other_charges`(항상 삭제 후 재삽입) |
| `finalizeInvoice` (settlement.ts:141) | `zen_invoices`(lookup), `zen_order_costs`(합계), `zen_orders`(권한), `zen_organizations`·`zen_profiles`(알림 간접) | 감사 이력 기록 | `zen_invoices`(finalize) | — |
| `createPostFinalizationAdjustment` (:558) | `zen_invoices`(원 인보이스), `zen_orders`, `zen_order_costs` | `zen_invoices`(조정 인보이스), 감사 이력, `zen_order_costs`(비용 연결) | `zen_invoices`, `zen_order_costs`(invoice_id 연결) | — |
| `markOrderCostSettled` (:838) | `zen_orders`, `zen_ups_actual_cost`, `zen_invoices`, `order_status_history`(간접) | — | `zen_orders`(`cost_settlement_status` 등) | — |
| `unmarkOrderCostSettled` (:910) | `zen_orders`, `zen_billing_statement_items` | — | `zen_orders`(되돌림) | — |

- `recordUpsActualCost`는 인보이스 마감 상태에 따라 `createPostFinalizationAdjustment`를 **동적 import**로 호출(349·389행) → 두 함수의 권한 경로가 동일해야 함.
- `recordActualCostAndFinalize`는 실비 저장 후 `finalizeInvoice`를 호출(680행). 인보이스 마감 실패 시 실비 저장은 **롤백되지 않음**(기존 동작, 이번 설계 범위 외).

---

## 2. 변경 전 세션 실측 — SELECT 가시성

`O` = 해당 테이블 행이 조회됨(괄호는 가시 행 수) · `X` = 가시 행 0 · `—` = 테이블 자체가 비어 판정 불가

| 테이블 | ADMIN | SUPER_ADMIN | MANAGER | AGENCY | SHIPPER | OPERATOR | SUB_ADMIN |
|:--|:--|:--|:--|:--|:--|:--|:--|
| `zen_orders` | O(15) | O(15) | **O(15)** | O(7) | O(10) | X | X |
| `zen_invoices` | O(16) | O(16) | **X(0)** | O(15) | O(7) | X | X |
| `zen_order_costs` | O(24) | O(24) | **X(0)** | O(24) | O(9) | X | X |
| `zen_ups_actual_cost` | O(5) | O(5) | **O(5)** | X | X | X | O(5) |
| `zen_ups_actual_other_charges` | O | O | **O** | X | X | X | O |
| `zen_order_rate_snapshots` | O(8) | **X(0)** | **X(0)** | O(7) | O(3) | X | X |
| `zen_billing_statement_items` | — | — | — | — | — | — | — |
| `zen_exchange_rates` | — | — | — | — | — | — | — |
| `order_status_history` | — | — | — | — | — | — | — |

추가 실측(중첩 리소스, 실제 로그인 세션): 스냅샷이 존재하는 오더를 `select=...,snapshot:zen_order_rate_snapshots(metadata)`로 조회 시 **ADMIN은 metadata 반환, MANAGER·SUPER_ADMIN은 `snapshot: null`**. 이를 단순 "실패 아님, 계산 경로 차이"로만 보지 않고, `recomputeRevenue`의 0 폴백 영향과 B-381 의존으로 함께 다룹니다(§6).

카탈로그 보충(빈 테이블):
- `zen_exchange_rates`: `exchange_rates_authenticated_select`(SELECT `true`) + `exchange_rates_admin_all`(ALL, ADMIN·MANAGER·SUPER_ADMIN) → MANAGER 읽기 가능.
- `order_status_history`: `Allow authenticated read for history`(SELECT `true`) → MANAGER 읽기 가능.
- **`zen_order_rate_snapshots`의 `SUPER_ADMIN X(0)` 원인(코드/카탈로그 확인)**: 정책 `Super admins have full access to order snapshots`의 조건이 **`role = 'ADMIN'`뿐**이어서 이름과 달리 `ZENITH_SUPER_ADMIN`을 제외합니다. Jaison이 이 원인을 **#1453(TASK-B-379) 설계에 전달**했습니다. 본 Task는 스냅샷 정책을 **변경하지 않습니다**(§6).
- `zen_billing_statement_items`: `bsi_select`의 플랫폼 ADMIN 분기는 `role IN ('ADMIN','ZENITH_SUPER_ADMIN')`만 → **MANAGER는 조직 소유자 분기가 아니면 0행**. 이는 단순 가시성이 아니라 §7의 **데이터 무결성 위험**입니다(테이블이 비어 실측은 불가, 카탈로그·코드 추론).

---

## 3. 변경 전 세션 실측 — DML 허용/거부

`O` = 허용 · `X` = 거부(정책 없음/WITH CHECK 위반) · `!` = 스키마 제약(FK·CHECK)으로 정책 판정 불가

| 테이블·동작 | ADMIN | SUPER_ADMIN | MANAGER | AGENCY | SHIPPER | OPERATOR | SUB_ADMIN |
|:--|:--|:--|:--|:--|:--|:--|:--|
| `zen_orders` UPDATE | O | O | **O** | O(소유 오더) | O(소속 오더) | X | X |
| `zen_invoices` SELECT/UPDATE | O | O | **X** | X(UPDATE) | X(UPDATE) | X | X |
| `zen_invoices` INSERT | O | O | **X** | X | X | X | X |
| `zen_order_costs` SELECT/INSERT/UPDATE/DELETE | O | O | **X** | X(쓰기) | X(쓰기) | X | X |
| `zen_ups_actual_cost` INSERT/UPDATE | O | O | **O** | X | X | X | O |
| `zen_ups_actual_other_charges` INSERT/DELETE | O | O | **O** | X | X | X | O |
| `zen_order_rate_snapshots` INSERT/UPDATE | O | X | **X** | X | O(소속 오더) | X | X |

`!` 사례는 스키마 제약 확인용 프로브에서만 발생했고, 제약을 바로잡은 재측정 결과 위 표로 반영했습니다. 잔여 데이터 없음(모든 프로브 ROLLBACK + 사후 정합 확인).

### 3-1. 앱 가드 실측 (함수 직접 실행 — 세션 아님)

| 역할 | `checkPermission(role, '/admin')` | `validateAdminAction()` 결과 |
|:--|:--|:--|
| ZENITH_SUPER_ADMIN | true (bypass) | 통과 |
| ADMIN | true | 통과 |
| **MANAGER** | **false** | **예외(Unauthorized access)** |
| SUB_ADMIN / OPERATOR / AGENCY / SHIPPER | false | 예외 |

`zen_role_permissions`에도 MANAGER의 `/admin` 행은 없습니다(MANAGER는 `/admin/ups-actual-charges`만 있음).

> **핵심:** `createPostFinalizationAdjustment`는 `validateAdminAction()`를 사용하므로(563행), **RLS 정책만 추가해도 MANAGER는 이 함수에서 차단**됩니다. 반면 다른 5개 함수는 `assertAdmin()`/`assertFinalizePermission()`이 MANAGER를 명시적으로 허용합니다. JSJung 결정 #2로 이 함수에만 **로컬 역할 목록(ADMIN·MANAGER·ZENITH_SUPER_ADMIN)** 을 적용하기로 확정되었습니다(전역 변경 금지). Aiden 모순 4에 따라 B-381 ① 경로도 이 결정에 종속됩니다(§9-2 ②).

---

## 4. MANAGER 정책 집합 · 방식 비교 · 권장안 · 영향 범위

### 4-1. 확정 정책 집합 (JSJung 결정 — 총 8개)

| # | 테이블 | 명령 | 조건 | 근거 |
|:-:|:--|:--|:--|:--|
| 1~3 | `zen_invoices` | SELECT, INSERT, UPDATE | `EXISTS (SELECT 1 FROM zen_profiles p WHERE p.id = auth.uid() AND p.role = 'MANAGER')` | `finalizeInvoice` lookup·finalize, 조정 인보이스 발행·연결, 결제상태 변경 |
| 4~7 | `zen_order_costs` | SELECT, INSERT, UPDATE, DELETE | 동일 | 인보이스 합계, 조정 비용 연결, UPS_ACTUAL_COST_ADJ 멱등 재생성(단, B-381 확정 결과에 따라 재산정 — §4-1-2) |
| 8 | `zen_billing_statement_items` | **SELECT 전용** | 동일 | `unmarkOrderCostSettled`의 "청구서 포함 여부" 확인이 0행으로 보이는 **데이터 무결성 위험** 해소(쓰기 정책 없음) |

**추가하지 않는 것(의도):**
- `zen_orders` — 이미 `get_my_role() IN ('ZENITH_SUPER_ADMIN','ADMIN','MANAGER')` 정책 존재.
- `zen_ups_actual_cost`·`zen_ups_actual_other_charges` — `admin_manager_all*`에 MANAGER 포함(단, SUB_ADMIN도 포함 — §7).
- `zen_exchange_rates`·`order_status_history` — authenticated SELECT 정책 존재.
- `zen_order_rate_snapshots` — TASK-B-379(#1453) 소관(§6).
- AGENCY·SHIPPER·OPERATOR 대상 정책은 **일체 변경 없음**(규칙 1).
- SUB_ADMIN 정책은 **추가도 삭제도 없음**(JSJung 결정 #3 — §7).

#### 4-1-1. "최소 집합" vs ADMIN 동등 권한 (Aiden 모순 2)

Aiden 지적: 역할만 확인하는 정책은 행 범위 제한이 없어 ADMIN 정책과 **같은 전권**입니다. §4-1 표를 "필요 지점만"이라고 표현한 것은 범위가 다릅니다.

| 비교안 | 정책 구성 | 기능적 결과 | 한계 |
|:--|:--|:--|:--|
| **현재 승인안(8개)** | 3개 테이블에 역할만 확인하는 SELECT/INSERT/UPDATE/DELETE(+청구서 SELECT) | MANAGER가 ADMIN과 **동등한 행 단위 전권** | "최소"라는 표현과 불일치. 의도가 "ADMIN 동등 부여"라면 명시 필요 |
| 축소안(예) | 인보이스 SELECT·UPDATE, 원가 SELECT, 청구서 SELECT | 정산마감·조회·결제상태 변경은 가능 | `generateInvoicesForOrder`·`addManualOrderCost`·조정 인보이스 발행(§4-4)이 여전히 실패 → **APP 가드가 MANAGER를 이미 허용한 경로와 충돌** |
| 기술적 제약 | — | PostgreSQL RLS는 **행 단위**만 제어(컬럼 단위는 별도 `GRANT`/뷰 필요) → "마감 컬럼만 UPDATE"는 정책으로 불가 | 축소안도 결국 전 행 UPDATE를 허용해야 함 |

→ **결론**: JSJung의 "MANAGER=admin" 규칙을 적용한 승인안(8개)을 유지하되, §9-2 ①에서 **"정산마감 인접 경로 전체에 ADMIN 동등 권한을 주는 것이 의도인지"** 의도 확인을 받습니다. "최소 집합"이라는 표현은 위 비교를 근거로 **"APP 가드가 MANAGER를 허용한 경로를 RLS가 막지 않도록 하는 최소 정책"**으로 재정의합니다.

#### 4-1-2. B-381 연동 재산정 조건 (Aiden 모순 1)

- B-381(PR #1462 §2-2(3))은 연결 행의 UPDATE·DELETE가 트리거로 불가능해 **삭제 없는 append-only + DEFINER RPC**로 설계를 전환했습니다(코드 확인).
- B-381이 그대로 확정되면 `zen_order_costs`에 대한 MANAGER 직접 UPDATE·DELETE(정책 #6·#7)는 RPC 경로가 대체하므로 **불필요해질 수 있습니다**(RPC는 호출자 RLS를 타지 않음). 남는 것은 읽기·마감 경로입니다.
- **처리**: JSJung가 승인한 8개 정책을 본 설계의 기준안으로 유지하되, **구현 착수 전 B-381 확정 결과로 #6·#7의 필요 여부를 재산정**하는 것을 결정 항목으로 올립니다(§9-2 ②). B-381 확정 전에 본 Task를 구현하면 정책이 과잉 부여될 위험이 있습니다.

### 4-2. 방식 비교

| 항목 | A. 기존 ADMIN 정책에 MANAGER 추가 | B. MANAGER 전용 정책 신설 (**JSJung 승인**) |
|:--|:--|:--|
| 변경 대상 | `Admins can manage all invoices`, `Admins can manage order costs`의 role 배열 | 신규 **8개** 정책만 추가 |
| ADMIN·SUPER_ADMIN 영향 | 같은 정책을 수정하므로 오타·조건 변경 시 즉시 영향 | **없음**(정책은 OR로 합쳐짐) |
| 되돌리기 | 원본 USING/WITH CHECK 문자열로 정책 재생성(원문 보존 필수) | 신규 정책 **8건 DROP**만(원본 복원 불필요) |
| 동시 변경 충돌 | B-375/B-379 등 다른 RLS 작업과 같은 정책을 만질 위험 | 정책 객체가 달라 충돌 없음 |
| 정책 수/유지보수 | 적음 | **8개** 증가, 향후 정책 변경 시 양쪽 확인 필요 |
| 감사·리뷰 | "기존 관리자 정책 확장"으로 의도가 덜 드러남 | MANAGER 전용으로 의도 명확 |

### 4-3. 권장안 (확정)

**B(MANAGER 전용 정책 8개 신설)** — JSJung 승인. 되돌리기가 `DROP POLICY` 8줄로 단순하고, ADMIN·SUPER_ADMIN 정책을 건드리지 않아 병행 RLS 작업(B-375 반영 완료, B-379 예정)과 충돌 가능성이 낮습니다. 조건은 ADMIN 정책과 동일하게 **역할만 확인**하며, INSERT에는 `WITH CHECK`, UPDATE에는 `USING + WITH CHECK`를 동일 조건으로 적용합니다. `zen_billing_statement_items`는 **SELECT만** 추가합니다.

### 4-4. 영향 범위(Blast Radius) — MANAGER에게 새로 열리는 서버 액션 (Jaison 보완 2)

아래는 **앱 가드가 이미 MANAGER를 허용하되 RLS가 막아 동작하지 않던 경로**와, 결정 #2 반영 시 열리는 경로입니다(코드 열거 기준; 잠재 경로는 구현 시 재검증).

| # | 서버 액션 (위치) | 앱 가드 | 동작(영향 테이블) | 변경 전 | 변경 후(예측) |
|:-:|:--|:--|:--|:--|:--|
| 1 | `generateInvoicesForOrder` (`settlement.ts:15`, L19) | `adminRoles` | 인보이스 마감여부 SELECT + 인보이스/원가 INSERT | 마감 확인 0행 + 생성 차단 | 정상 생성 |
| 2 | `finalizeInvoice` (`settlement.ts:141`, L80 공유) | `assertFinalizePermission` | 인보이스 SELECT/UPDATE + 원가 합계 SELECT | 실패 | 정상 마감 |
| 3 | `rejectInvoice` (`settlement.ts:633`, L80 공유) | `assertFinalizePermission` | 인보이스 SELECT/UPDATE + 원가 `invoice_id` 해제 + 재발행 | 실패 | 정상 취소·재발행 |
| 4 | `updatePaymentStatus` (`settlement.ts:213`, L222) | `adminRoles` | 인보이스 SELECT/UPDATE(결제상태·금액) + 오더 billing status | 실패 | **정상 결제상태 변경(정산 외 경로)** |
| 5 | `calculateSettlementAction` (`settlement.ts:287`, L292) | `adminRoles` | 인보이스·원가 집계 SELECT | 0행/빈 결과 | 정상 집계 |
| 6 | `addManualOrderCost` (`settlement.ts:478`, L493) | `adminRoles` | 원가 SELECT + INSERT | 실패 | 정상 수동 원가 등록 |
| 7 | `createPostFinalizationAdjustment` (`settlement.ts:558`) | `validateAdminAction` → 결정 #2로 로컬 역할목록 | 조정 인보이스 SELECT/INSERT/UPDATE + 원가 UPDATE | 가드+RLS 이중 차단 | 가드 변경 + RLS로 정상 |
| 8 | `getShipperDailyBillingSummary` (`daily-billing.ts:110`, L131) | `adminRoles` | 인보이스 SELECT(`ADMIN_TO_*` tier) | 0행 | **정상 조회(정산 외 경로)** |
| 9 | `finalizeDailyShipperInvoices` (`daily-billing.ts:434`, L442) | `adminRoles` | `finalizeInvoice` 일괄 호출 | 전건 실패 | 정상 일괄 마감 |
| 10 | `recordUpsActualCharges` (`ups-actual-charges.ts:27`, L18) | `assertAdminOnly` | 인보이스 SELECT/UPDATE + 원가 SELECT/INSERT/UPDATE | 실패 | 정상 실비·원가 기록 |
| 11 | `unmarkOrderCostSettled` (`ups-actual-cost.ts:910`, L103) | `assertAdmin` (MANAGER 포함) | 청구서 항목 SELECT(정책 #8) + 오더 UPDATE | 항상 "항목 없음" → **무결성 위험** | 청구 포함 오더는 거부 |

- §1의 6개 함수(`recordUpsActualCost`·`recordActualCostAndFinalize`·`finalizeInvoice`·`createPostFinalizationAdjustment`·`markOrderCostSettled`·`unmarkOrderCostSettled`)도 동일하게 해제됩니다(중복 기재 생략).
- **의도 확인 항목**: JSJung의 "MANAGER=admin" 규칙이 위 11개 **정산마감 인접 경로 전체**에 적용되는지 확인 필요(§9-2 ①). 승인 시 ADMIN과 동등한 전권 부여를 뜻합니다(§4-1-1).
- **테스트 보강**: 구현 시 검증 플러스 케이스에 정산 외 경로 2개(`updatePaymentStatus`, `getShipperDailyBillingSummary`)를 포함합니다(§5).

---

## 5. 권한 확대 경계 검증 계획 (구현 시)

- **양성 대조**: MANAGER가 §4-1의 **8개 정책** 대상에서 변경 전 `X` → 변경 후 `O`가 되는지 실측(인보이스 SELECT/INSERT/UPDATE, 원가 SELECT/INSERT/UPDATE/DELETE, 청구서 항목 SELECT). **정산 외 경로 2개**(`updatePaymentStatus`, `getShipperDailyBillingSummary`)도 정상 동작 확인.
- **음성 대조(고정)**: AGENCY·SHIPPER·OPERATOR의 §2·§3 값이 변경 전후 **완전히 동일**한지 실측. 특히 인보이스 INSERT/UPDATE, 원가 쓰기, 실비 쓰기가 계속 `X`인지 확인.
- **무변경 대조**: ADMIN·SUPER_ADMIN의 모든 셀이 전후 동일(정책 B 방식이므로 구조적으로 불변).
- **되돌리기 실측**: 신규 **8개** 정책 DROP 후 MANAGER가 다시 `X`로 복귀하는지 확인(프로브는 `afterAll`에서 원복).
- **서버 액션 연결 확인**: MANAGER 세션에서 §4-4의 11개 경로 중 정산마감 6개 + 정산 외 2개 우선 확인, `createPostFinalizationAdjustment`는 결정 #2(로컬 역할 목록) 반영 여부 확인.
- 별도 보안 검토 항목 1건을 JSJung에게 직접 보고.

| 셀 | 변경 전(실측) | 변경 후(예측 — 승인 후 재측정 필수) |
|:--|:--|:--|
| MANAGER / `zen_invoices` SELECT·INSERT·UPDATE | X | O |
| MANAGER / `zen_order_costs` SELECT·INSERT·UPDATE·DELETE | X | O |
| MANAGER / `zen_billing_statement_items` SELECT | X(0행) | O |
| AGENCY·SHIPPER·OPERATOR 전체 | 표 §2·§3 그대로 | 동일(예측) |
| ADMIN·SUPER_ADMIN 전체 | 표 §2·§3 그대로 | 동일(예측) |

> "변경 후" 열은 **예측**이며 실측이 아닙니다. 구현 승인 후 동일 프로브로 재측정해 확정합니다.

---

## 6. TASK-B-379(#1453)와의 경계 · 순서 의존 (Jaison 보완 3 + Aiden 모순 1·3)

- 겹치는 테이블은 `zen_order_rate_snapshots`입니다. `recordUpsActualCost`·`recordActualCostAndFinalize`의 오더 조회에 중첩 SELECT로 포함되며, §2 실측에서 MANAGER·SUPER_ADMIN은 `snapshot: null`입니다.
- **원인(코드/카탈로그 확인)**: 정책 `Super admins have full access to order snapshots`가 `role = 'ADMIN'`만 체크해 `ZENITH_SUPER_ADMIN`·MANAGER를 제외합니다. Jaison이 #1453에 전달 완료. **본 Task는 스냅샷 정책을 추가·수정하지 않습니다.**
- **Aiden 모순 3 (코드 확인/영향 추정)**: `recomputeRevenue`(`ups-actual-cost.ts:140~`)는 `actualWeightKg ?? snapshot.platform.chargeableWeightKg`, `platformBase = snapshot.platform.totalSellingPrice`를 사용합니다. MANAGER 세션에서 스냅샷이 null이면 **0으로 폴백**되어 중량·치수 일부 입력 시 재계산 결과가 달라질 수 있습니다(폴백 식은 확인, 영향은 추정). B-381 규칙 2의 `p_freight_target`도 이 경로 위에 있으므로, **#1453(B-379)의 MANAGER 스냅샷 SELECT 결정은 B-381·B-382의 선행 의존**입니다.
- **Aiden 모순 1**: B-381의 append-only + DEFINER RPC 확정 여부가 `zen_order_costs` 직접 UPDATE·DELETE 정책(#6·#7)의 필요성을 좌우합니다(§4-1-2).

### 순서 제안과 미해소 충돌

| 의존 축 | Aiden 제안/요청 | JSJung 확정(#1463 10:43) | 상태 |
|:--|:--|:--|:--|
| 스냅샷 SELECT·폴백 정합성 | **B-379 → B-381 → B-382** | B-382 선행 → B-379 후행(정책 소관 분리·timestamp 충돌 회피 목적) | **충돌 — 해소 필요**(§9-2 ③) |
| 원가 append-only/RPC | B-381 확정 후 B-382 최소집합 재산정 | B-382 선행(언급 없음) | **미해소**(§9-2 ②) |
| 마이그레이션 객체 충돌 회피 | — | B-382 선행, B-379는 별도 timestamp | 확정 유지 |

→ 본 문서는 **JSJung 확정(B-382 선행, 스냅샷 정책 미변경)을 기준안으로 유지**하면서, Aiden이 제기한 두 의존을 **미해소 충돌로 명시**해 재확인을 요청합니다(§9-2 ②③). 임의로 순서를 바꾸지 않습니다.

---

## 7. SUB_ADMIN · 청구서 무결성 · 가드 결정 (JSJung 확정 반영)

| 항목 | 현재 실측/코드 | 확정/요청 |
|:--|:--|:--|
| SUB_ADMIN의 정산 테이블 접근 | `zen_ups_actual_cost`·`zen_ups_actual_other_charges`는 O, `zen_invoices`·`zen_order_costs`·`zen_orders`는 X. `order-revenue-cost.ts`에 SUB_ADMIN 분기 존재(91·198·313행) | **제외 확정**: 정책 추가도 삭제도 없음. 현재 접근 현황은 위 표로만 유지. 원가 테이블의 SUB_ADMIN 접근을 규칙에 맞게 정렬할지는 **#1451(A) 별도 결정**. 업무 사실 확인 질문은 §9-2 ④ |
| `createPostFinalizationAdjustment` 가드 | `validateAdminAction()`는 MANAGER 거부(§3-1) | **확정**: 이 함수에만 로컬 역할 목록(ADMIN·MANAGER·ZENITH_SUPER_ADMIN) 적용. `validateAdminAction()` 전역 변경 금지. 단, B-381 ① 경로가 이 결정에 종속(§9-2 ②) |
| `zen_billing_statement_items` | 플랫폼 ADMIN 분기가 `('ADMIN','ZENITH_SUPER_ADMIN')`만 → MANAGER 0행(코드·카탈로그 추론, 테이블 비어 실측 불가) | **포함 확정**: **SELECT 전용** 정책 추가(정책 #8). 쓰기 정책 없음. 아래 무결성 위험 해소가 목적 |

### 7-1. `zen_billing_statement_items` — 데이터 무결성 위험 (Jaison 보완 4)

MANAGER가 청구서 항목을 0행으로 보면, `unmarkOrderCostSettled`(`ups-actual-cost.ts:925~935`)의 "어떤 tier든 청구서 항목이 있으면 거부" 분기를 **항상 통과**합니다. 결과적으로 **이미 청구서에 포함된 오더의 정산 상태가 해제(`SETTLED` → `NOT_SETTLED`)될 수 있습니다.** 이는 단순 가시성 문제가 아니라 **청구-원가 정합성 훼손**이며, MANAGER를 admin으로 보는 규칙(SELECT 전용)에 따라 정책 #8을 추가해 해소합니다. MANAGER에게 쓰기 권한은 주지 않습니다.

---

## 8. 마이그레이션 분리 · 롤백 SQL · 배포 순서 · Ds-11

### 8-1. 산출물 분리(승인 후에만 생성)

| # | 산출물 | 내용 | 시점 |
|:--|:--|:--|:--|
| M1 | `supabase/migrations/<ts>_task_b382_manager_finalization_rls.sql` | `zen_invoices` SELECT/INSERT/UPDATE(3) + `zen_order_costs` SELECT/INSERT/UPDATE/DELETE(4) + `zen_billing_statement_items` SELECT(1) = **MANAGER 전용 8개 정책** + `NOTIFY pgrst, 'reload schema'` | **JSJung 최종 확정 후** |
| M3 | TASK-B-379 | `zen_order_rate_snapshots` 정책 | 별도 Task(#1453) |

> **앱 변경 메모(M2)** — 마이그레이션 산출물이 아님: `createPostFinalizationAdjustment`(`settlement.ts:563`)의 `validateAdminAction()` 호출을 **이 함수에만** 로컬 역할 목록(ADMIN·MANAGER·ZENITH_SUPER_ADMIN)으로 대체. `validateAdminAction()` 전역 변경 금지(JSJung 결정 #2). 별도 PR/커밋으로 관리. B-381 ① 경로와 함께 검토(§9-2 ②).

### 8-2. 정책 정의(안 — M1)

```sql
-- 요건: JSJung 최종 확정 후에만 적용. 조건은 ADMIN 정책과 동일(역할만 확인).
-- 1~3: zen_invoices SELECT / INSERT / UPDATE
-- 4~7: zen_order_costs SELECT / INSERT / UPDATE / DELETE
-- 8:   zen_billing_statement_items SELECT (쓰기 정책 없음)
-- 공통 조건: EXISTS (SELECT 1 FROM public.zen_profiles p
--                   WHERE p.id = auth.uid() AND p.role = 'MANAGER')
-- INSERT는 WITH CHECK, UPDATE는 USING + WITH CHECK를 동일 조건으로 정의.
NOTIFY pgrst, 'reload schema';
```

### 8-3. 롤백 SQL(안 — M1 되돌리기, 8문)

```sql
DROP POLICY IF EXISTS "Managers can view invoices for finalization"          ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can insert invoices for finalization"        ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can update invoices for finalization"        ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can view order costs for finalization"       ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can insert order costs for finalization"     ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can update order costs for finalization"     ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can delete order costs for finalization"     ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can view billing statement items"            ON public.zen_billing_statement_items;
NOTIFY pgrst, 'reload schema';
```

- 기존 ADMIN/SUPER_ADMIN 정책은 변경하지 않으므로 롤백 시 원문 복원이 필요 없습니다(방식 B 선택 이유).
- 데이터 변경 없음(정책만 추가/제거).

### 8-4. 적용 순서

1. **배포 시**: DB 마이그레이션(M1) 선적용 → PostgREST 스키마 reload 확인 → 앱 배포. (앱 먼저 배포하면 MANAGER 요청이 정책 대기 중 실패)
2. **롤백 시**: 앱 롤백 선실시 → M1 롤백 SQL 적용. (DB 먼저 되돌리면 새 앱의 MANAGER 경로가 실패)
3. M2(가드)는 M1과 독립 PR로 두고, 가드 변경이 먼저 배포되더라도 MANAGER의 DB 접근은 M1 전까지 거부됩니다(안전한 순서). 단, 순서 의존 충돌(§6)은 확정 전 해소 필요.

### 8-5. Ds-11(R-12) 반영 위치 (구현 확정 후)

| 문서 | 위치 | 반영 내용 |
|:--|:--|:--|
| `docs/02_Analysis/ds11/Ds_11_04_Finance_Settlement.md` | `§4.2 정산·마감·조정` | 정산마감 권한 표(ADMIN·SUPER_ADMIN·MANAGER), 테이블×동작 매트릭스 링크 |
| `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | `§11.12~11.14` | UPS 실비→마감 경로의 MANAGER 정책 경계, TASK-B-379와의 소관 분리 |
| `docs/02_Analysis/Ds_11_API_상세_명세서.md` | 인덱스 3·7행 | 위 두 문서 업데이트 반영 |

> 본 설계 의견 PR에서는 Ds-11을 수정하지 않습니다(구현 확정 후 R-12 동기화).

---

## 9. 확정 사항 · 추가 확인 요청 · 최종 확정 절차

### 9-1. JSJung 확정 사항 (2026-11-23 — 본 개정에 반영 완료)

| # | 확정 내용 | 반영 |
|:-:|:--|:--|
| 1 | 방식 B: MANAGER 전용 정책 신설(인보이스 3 + 원가 4 + 청구서 SELECT 1 = **8개**). 기존 ADMIN·SUPER_ADMIN 정책 미수정 | §4·§8 |
| 2 | `createPostFinalizationAdjustment` MANAGER 허용 — `validateAdminAction()` 전역 변경 금지, 이 함수에만 로컬 역할 목록 | §3-1·§7·§8-1 M2 |
| 3 | SUB_ADMIN 이번 범위 제외(추가·삭제 없음, 현황 표만 유지) | §7 |
| 4 | `zen_billing_statement_items` MANAGER SELECT 전용 포함(쓰기 없음) | §4-1 #8·§7-1·§8 |
| 5 | 스냅샷 정책은 #1453(TASK-B-379) 소관, B-382 선행. 본 Task는 스냅샷 정책 미변경 | §6 |

### 9-2. 추가 확인 요청 (검토 과정에서 새로 제기된 항목)

| # | 확인 요청 | 근거 |
|:-:|:--|:--|
| ① | **"MANAGER=admin" 규칙의 적용 범위**: §4-4의 11개 정산마감 인접 경로 전체에 ADMIN 동등 전권을 주는 것이 의도인지. "최소 집합" 표현은 §4-1-1 기준으로 재정의함 | Jaison 보완 2 + Aiden 모순 2 |
| ② | **B-381 확정 결과에 따른 재산정/순서**: B-381의 append-only + DEFINER RPC가 확정되면 원가 UPDATE·DELETE 정책(#6·#7) 불필요 가능. 재산정 시점과, B-381 ①(마감 후 조정 인보이스 → `createPostFinalizationAdjustment`, 결정 #2 종속)의 처리 순서 확정 | Aiden 모순 1·4 |
| ③ | **순서 충돌 해소**: Aiden 권장 `B-379 → B-381 → B-382`(스냅샷 null 폴백·`p_freight_target` 정합성) vs JSJung 확정 `B-382 선행 → B-379`(정책 소관·timestamp 충돌 회피). 어느 축을 우선할지 | Aiden 모순 3 + JSJung 결정 #5 |
| ④ | **SUB_ADMIN 업무 사실 확인**: SUB_ADMIN 계정이 실제로 존재/사용되는지(로컬 측정이 아닌 업무 확인). 규칙 정렬 여부는 #1451(A)에서 별도 결정 | Jaison 보완 5 |

### 9-3. 다음 절차

1. **Jaison 재검토** (본 수정본 기준) → 2. **JSJung 최종 확정** → 3. 구현 착수.
4. Aiden은 설계 의견 도착 후 모순 해소 여부 기준으로 확인(정책 결정 자체는 JSJung).
5. 확정 전까지 **정책·코드·마이그레이션 변경 없음**. 이슈는 `status:draft` 유지.

---

## 10. [작업 결과] (설계 의견 수정본 범위)

- 코드/정책 변경 **없음**. 마이그레이션·서버 액션·테스트 파일 미추가. `Closes` 미사용(`Refs #1463`).
- 실측 근거: 실제 로그인 세션 SELECT + JWT 클레임 주입 롤백 DML 프로브(잔여 데이터 0건 확인), `pg_policies` 카탈로그, `checkPermission` 함수 직접 실행 — **본 개정은 문서 수정만, 재측정 없음**(측정값은 최초 제출분 유지).
- 미확인 항목은 §0·§2·§7에 명시(서버 액션 브라우저 미실행, 빈 테이블 판정 불가, 변경 후 매트릭스는 예측).
- 검토 반영: Jaison 보완 5건, JSJung 결정 5건, Aiden 모순 4건 — §0-1 대조표 참조.
- 라벨: `status:open` → `status:in-progress` → `status:draft` 유지. 검증: Jaison / 최종 확정: JSJung.
