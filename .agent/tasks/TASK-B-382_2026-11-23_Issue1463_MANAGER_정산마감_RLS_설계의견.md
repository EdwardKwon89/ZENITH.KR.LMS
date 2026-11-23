# TASK-B-382 — Issue #1463: MANAGER의 UPS 정산마감 관련 테이블 RLS 정책 정렬 (설계 의견)

| 항목 | 내용 |
|:----|:-----|
| **Issue** | [#1463](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1463) |
| **담당(Worker)** | Baker (Team B) |
| **검증(Auditor)** | Jaison |
| **설계 확정** | **JSJung** (본 문서는 확정 요청용 의견 — 구현 없음) |
| **상태** | 📝 설계 의견 (`status:draft`) — 승인 전까지 정책 변경 금지 |
| **브랜치** | `feature/teamb-task-b382-iss1463-manager-rls-design` (base `origin/TeamB_Dev` @ `83bb486f1`) |
| **연관** | DEF-B-166(b), TASK-B-381(#1459), TASK-B-377(#1451), TASK-B-379(#1453) |
| **공개 저장소 주의** | 아래 표는 **허용/거부 결과만** 기록합니다. 노출 경위·재현 절차 세부는 기재하지 않습니다. |

---

## 0. 범위 · 방법론 (코드 열거와 실측의 구분)

| 구분 | 방법 | 범위 |
|:--|:--|:--|
| **코드 열거** | 6개 서버 액션 본문과 호출 헬퍼의 `from()/insert()/update()/delete()/rpc()` 전수 확인 | 테이블×동작 목록(§1) |
| **세션 실측 (SELECT)** | 표준 계정으로 **실제 로그인** 후 발급된 사용자 Bearer 토큰으로 각 테이블 가시 행 수 측정 | §2 표 |
| **세션 실측 (DML)** | 동일 로그인 세션의 JWT 클레임을 `authenticated` 롤 트랜잭션에 주입해 INSERT/UPDATE/DELETE를 **매 트랜잭션 ROLLBACK**으로 측정(잔여 데이터 없음) | §3 표 |
| **정책 카탈로그** | `pg_policies` / `pg_constraint` / `information_schema.columns` 조회(읽기 전용) | §2·§4 근거 |
| **미측정(명시)** | 서버 액션 자체의 브라우저 클릭 실행은 하지 않음. `finalizeInvoice` MANAGER 실패는 Jaison 단독 실측(#1463 본문)을 인용. 빈 테이블(0행)은 RLS 판정 불가 → 카탈로그로만 판정 | §2 각주 |

- `ZENITH_SUPER_ADMIN`은 재현 시드에 계정이 없어 **측정 전용 임시 로컬 계정**을 생성·사용 후 삭제했습니다(저장소 변경 없음, 잔여 계정 0건).
- 측정 후 잔여 확인: 인보이스 16 / 오더코스트 24 / 스냅샷 8 / 실비 5 / 부가운임 0건 — 측정 전과 동일, 프로브 행 0건.

---

## 1. 정산마감 경로 테이블×동작 전수표 (코드 열거)

| 함수 | SELECT | INSERT/UPSERT | UPDATE | DELETE |
|:--|:--|:--|:--|:--|
| `recordUpsActualCost` (ups-actual-cost.ts:202) | `zen_orders`(중첩 `zen_order_rate_snapshots.metadata` 포함), `zen_ups_actual_cost`, `zen_invoices`, `zen_order_costs`, `zen_ups_products`, `zen_exchange_rates`(간접), `order_status_history`(간접) | `zen_ups_actual_cost`, `zen_order_costs`(UPS_ACTUAL_COST_ADJ) | `zen_ups_actual_cost`, `zen_invoices`(total_amount·metadata) | `zen_order_costs`(UPS_ACTUAL_COST_ADJ, 멱등 재생성) |
| `recordActualCostAndFinalize` (:546) | `zen_orders`, `zen_ups_actual_cost`, `zen_invoices`, `zen_exchange_rates`(간접) → `finalizeInvoice` 경로 전체 | `zen_ups_actual_cost`, `zen_ups_actual_other_charges` → `finalizeInvoice` 경로 전체 | `zen_ups_actual_cost` → `finalizeInvoice` 경로 전체 | `zen_ups_actual_other_charges`(항상 삭제 후 재삽입) |
| `finalizeInvoice` (settlement.ts:141) | `zen_invoices`(lookup), `zen_order_costs`(합계), `zen_orders`(권한), `zen_organizations`·`zen_profiles`(알림 간접) | `zen_invoice_history` | `zen_invoices`(finalize) | — |
| `createPostFinalizationAdjustment` (:558) | `zen_invoices`(원 인보이스), `zen_orders`, `zen_order_costs` | `zen_invoices`(조정 인보이스), `zen_invoice_history`, `zen_order_costs`(비용 연결) | `zen_invoices`, `zen_order_costs`(invoice_id 연결) | — |
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
| `zen_invoice_history` | — | — | — | — | — | — | — |

추가 실측(중첩 리소스, 실제 로그인 세션): 스냅샷이 존재하는 오더를 `select=...,snapshot:zen_order_rate_snapshots(metadata)`로 조회 시 **ADMIN은 metadata 반환, MANAGER·SUPER_ADMIN은 `snapshot: null`**. 즉 MANAGER는 정산 경로의 스냅샷 기반 재계산 분기에서 `hasSnapshot: false`로 동작합니다(실패 아님, 계산 경로 차이).

카탈로그 보충(빈 테이블):
- `zen_exchange_rates`: `exchange_rates_authenticated_select`(SELECT `true`) + `exchange_rates_admin_all`(ALL, ADMIN·MANAGER·SUPER_ADMIN) → MANAGER 읽기 가능.
- `order_status_history`: `Allow authenticated read for history`(SELECT `true`) → MANAGER 읽기 가능.
- `zen_invoice_history`: **RLS 비활성(정책 0건)** → DML 제약 없음(§5 별도 보고).
- `zen_billing_statement_items`: `bsi_select`의 플랫폼 ADMIN 분기는 `role IN ('ADMIN','ZENITH_SUPER_ADMIN')`만 → **MANAGER는 조직 소유자 분기가 아니면 0행**. `unmarkOrderCostSettled`의 "청구서 연결 존재 여부" 확인이 MANAGER에게는 항상 없음으로 보일 수 있음 → **JSJung 결정 항목**(§6).

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
| `zen_invoice_history` INSERT | O | O | **O** | O | O | O | O |

`!` 사례는 스키마 제약 확인용 프로브에서만 발생했고, 제약을 바로잡은 재측정 결과 위 표로 반영했습니다. 잔여 데이터 없음(모든 프로브 ROLLBACK + 사후 정합 확인).

### 3-1. 앱 가드 실측 (함수 직접 실행 — 세션 아님)

| 역할 | `checkPermission(role, '/admin')` | `validateAdminAction()` 결과 |
|:--|:--|:--|
| ZENITH_SUPER_ADMIN | true (bypass) | 통과 |
| ADMIN | true | 통과 |
| **MANAGER** | **false** | **예외(Unauthorized access)** |
| SUB_ADMIN / OPERATOR / AGENCY / SHIPPER | false | 예외 |

`zen_role_permissions`에도 MANAGER의 `/admin` 행은 없습니다(MANAGER는 `/admin/ups-actual-charges`만 있음).

> **핵심:** `createPostFinalizationAdjustment`는 `validateAdminAction()`를 사용하므로(563행), **RLS 정책만 추가해도 MANAGER는 이 함수에서 차단**됩니다. 반면 다른 5개 함수는 `assertAdmin()`/`assertFinalizePermission()`이 MANAGER를 명시적으로 허용합니다. 따라서 정책 확대와 별도로 가드 처리에 대한 **JSJung 결정이 필요**합니다(§7).

---

## 4. MANAGER 최소 정책 집합 · 방식 비교 · 권장안

### 4-1. 최소 집합 (필요 지점만)

| 테이블 | 명령 | 조건 | 근거 |
|:--|:--|:--|:--|
| `zen_invoices` | SELECT, INSERT, UPDATE | `EXISTS (SELECT 1 FROM zen_profiles p WHERE p.id = auth.uid() AND p.role = 'MANAGER')` | `finalizeInvoice` lookup·finalize, 마감 후 조정 인보이스 발행·연결 |
| `zen_order_costs` | SELECT, INSERT, UPDATE, DELETE | 동일 | 인보이스 합계, 조정 비용 연결, UPS_ACTUAL_COST_ADJ 멱등 재생성 |

**추가하지 않는 것(의도):**
- `zen_orders` — 이미 `get_my_role() IN ('ZENITH_SUPER_ADMIN','ADMIN','MANAGER')`-policy 존재.
- `zen_ups_actual_cost`·`zen_ups_actual_other_charges` — `admin_manager_all*`에 MANAGER 포함(단, SUB_ADMIN도 포함 — §6).
- `zen_exchange_rates`·`order_status_history` — authenticated SELECT 정책 존재.
- `zen_invoice_history` — RLS 비활성(정책 추가 무의미, §5).
- `zen_order_rate_snapshots` — TASK-B-379 경계(§6).
- `zen_billing_statement_items` — 조직 데이터 노출 범위와 연결 → JSJung 결정(§7).
- AGENCY·SHIPPER·OPERATOR 대상 정책은 **일체 변경 없음**(규칙 1).

### 4-2. 방식 비교

| 항목 | A. 기존 ADMIN 정책에 MANAGER 추가 | B. MANAGER 전용 정책 신설 (권장) |
|:--|:--|:--|
| 변경 대상 | `Admins can manage all invoices`, `Admins can manage order costs`의 role 배열 | 신규 7개 정책만 추가 |
| ADMIN·SUPER_ADMIN 영향 | 같은 정책을 수정하므로 오타·조건 변경 시 즉시 영향 | **없음**(정책은 OR로 합쳐짐) |
| 되돌리기 | 원본 USING/WITH CHECK 문자열로 정책 재생성(테이블당 2문, 원문 보존 필수) | 신규 정책 7건 DROP만(원본 복원 불필요) |
| 동시 변경 충돌 | B-375/B-379 등 다른 RLS 작업과 같은 정책을 만질 위험 | 정책 객체가 달라 충돌 없음 |
| 정책 수/유지보수 | 적음 | 7개 증가, 향후 정책 변경 시 양쪽 확인 필요 |
| 감사·리뷰 | "기존 관리자 정책 확장"으로 의도가 덜 드러남 | MANAGER 전용으로 의도 명확 |

### 4-3. 권장안

**B(MANAGER 전용 정책 신설)**를 권장합니다. 되돌리기가 `DROP POLICY` 7줄로 단순하고, ADMIN·SUPER_ADMIN 정책을 건드리지 않아 병행 중인 RLS 작업(B-375 반영 완료, B-379 예정)과 충돌 가능성이 낮습니다. 조건은 ADMIN 정책과 동일하게 **역할만 확인**(조직 범위 제한 없음)하며, INSERT에는 `WITH CHECK`를 명시해 USING과 동일 조건을 적용합니다.

> 위안은 **설계 권고**입니다. 실제 반영은 JSJung 확정 후에만 진행합니다.

---

## 5. 권한 확대 경계 검증 계획 (구현 시)

- **양성 대조**: MANAGER가 §4의 7개 정책 대상에서 변경 전 `X` → 변경 후 `O`가 되는지 실측(인보이스 SELECT/INSERT/UPDATE, 오더코스트 SELECT/INSERT/UPDATE/DELETE).
- **음성 대조(고정)**: AGENCY·SHIPPER·OPERATOR의 §2·§3 값이 변경 전후 **완전히 동일**한지 실측. 특히 `zen_invoices` INSERT/UPDATE, `zen_order_costs` 쓰기, `zen_ups_actual_*` 쓰기가 계속 `X`인지 확인.
- **무변경 대조**: ADMIN·SUPER_ADMIN의 모든 셀이 전후 동일(정책 B 방식이므로 구조적으로 불변).
- **되돌리기 실측**: 신규 정책 DROP 후 MANAGER가 다시 `X`로 복귀하는지 확인(프로브는 `afterAll`에서 원복).
- **서버 액션 연결 확인**: MANAGER 세션에서 `recordUpsActualCost`·`recordActualCostAndFinalize`·`finalizeInvoice`·`markOrderCostSettled`·`unmarkOrderCostSettled`의 정상 경로, `createPostFinalizationAdjustment`는 §3-1 가드 결정 반영 여부 확인.
- **별도 보고(보안 관찰)**: `zen_invoice_history`에 RLS가 활성화되어 있지 않고 정책이 0건입니다. 이번 Task 범위(정책 신설) 밖이며 임의로 `ENABLE ROW LEVEL SECURITY`를 적용하지 않습니다. 별도 보안 검토 항목으로 JSJung에게 보고합니다(구체적 접근 방법은 공개 문서에 기재하지 않음).

| 셀 | 변경 전(실측) | 변경 후(예측 — 승인 후 재측정 필수) |
|:--|:--|:--|
| MANAGER / `zen_invoices` SELECT·INSERT·UPDATE | X | O |
| MANAGER / `zen_order_costs` SELECT·INSERT·UPDATE·DELETE | X | O |
| AGENCY·SHIPPER·OPERATOR 전체 | 표 §2·§3 그대로 | 동일(예측) |
| ADMIN·SUPER_ADMIN 전체 | 표 §2·§3 그대로 | 동일(예측) |

> "변경 후" 열은 **예측**이며 실측이 아닙니다. 구현 승인 후 동일 프로브로 재측정해 확정합니다.

---

## 6. TASK-B-379(#1453)와의 경계

- 겹치는 테이블은 `zen_order_rate_snapshots`입니다. `recordUpsActualCost`·`recordActualCostAndFinalize`의 오더 조회에 중첩 SELECT로 포함되며, §2 실측에서 MANAGER·SUPER_ADMIN은 `snapshot: null`입니다.
- **소관 분리**: 스냅샷의 **INSERT·UPDATE(입고 실측 갱신 주체, MANAGER·OPERATOR)** 는 **TASK-B-379(#1453)** 가 맡습니다. 본 Task는 스냅샷 정책을 **추가·수정하지 않습니다**(MANAGER의 스냅샷 SELECT 필요 여부도 B-379에서 함께 판단).
- **순서 제안**: 본 Task(B-382) 선행 → B-379 후행. B-379가 `zen_order_rate_snapshots` 정책을 바꿀 때 B-382의 신규 정책(다른 테이블)과 마이그레이션 파일·정책 객체가 겹치지 않도록 합니다. 동일 timestamp 충돌을 피해 B-379는 별도 마이그레이션 번호를 사용합니다.

## 7. SUB_ADMIN 및 결정 요청 항목 (JSJung 결정 — 임의 반영 금지)

| 항목 | 현재 실측/코드 | 요청 |
|:--|:--|:--|
| SUB_ADMIN의 정산 테이블 접근 | `zen_ups_actual_cost`·`zen_ups_actual_other_charges`는 O, `zen_invoices`·`zen_order_costs`·`zen_orders`는 X. `order-revenue-cost.ts`에 SUB_ADMIN 분기 존재(91·198·313행) | 확정 규칙(ADMIN·MANAGER·SUPER_ADMIN)에 SUB_ADMIN은 없음. **이번 Task에서 추가도 제외도 하지 않음**. 포함 여부만 결정 요청 |
| `createPostFinalizationAdjustment` 가드 | `validateAdminAction()`는 MANAGER를 거부(§3-1) | 정책만으로 해결 불가. 가드를 MANAGER 허용으로 바꿀지, 별도 가드를 둘지 **결정 요청** |
| `zen_billing_statement_items` | MANAGER는 플랫폼 ADMIN 분기에 없어 0행 | `unmarkOrderCostSettled` 선행 확인 정합성 관련. 정책 확대 여부 **결정 요청**(이번 최소 집합에는 미포함) |
| `zen_invoice_history` RLS | 비활성·정책 0건 | 별도 보안 검토로 보고. 이번 Task에서 정책 변경 없음 |

---

## 8. 마이그레이션 분리 · 롤백 SQL · 배포 순서 · Ds-11

### 8-1. 마이그레이션 분리(승인 후에만 생성)

| # | 산출물 | 내용 | 시점 |
|:--|:--|:--|:--|
| M1 | `supabase/migrations/<ts>_task_b382_manager_finalization_rls.sql` | `zen_invoices` SELECT/INSERT/UPDATE + `zen_order_costs` SELECT/INSERT/UPDATE/DELETE, MANAGER 전용 7개 정책 + `NOTIFY pgrst, 'reload schema'` | **JSJung 확정 후** |
| M2 | 앱 코드(가드) 변경 | `createPostFinalizationAdjustment`의 MANAGER 처리 — §7 결정 반영 | 별도 PR/커밋 |
| M3 | TASK-B-379 | `zen_order_rate_snapshots` 정책 | 별도 Task |

### 8-2. 정책 정의(안 — M1)

```sql
-- 요건: JSJung 확정 후에만 적용. 조건은 ADMIN 정책과 동일(역할만 확인).
CREATE POLICY "Managers can view invoices for finalization"
  ON public.zen_invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.zen_profiles p
                 WHERE p.id = auth.uid() AND p.role = 'MANAGER'));
-- INSERT는 WITH CHECK, UPDATE는 USING + WITH CHECK를 동일 조건으로 정의(총 3개).
-- zen_order_costs도 SELECT/INSERT/UPDATE/DELETE 4개를 같은 조건으로 정의(총 4개).
NOTIFY pgrst, 'reload schema';
```

### 8-3. 롤백 SQL(안 — M1 되돌리기)

```sql
DROP POLICY IF EXISTS "Managers can view invoices for finalization"       ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can insert invoices for finalization"     ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can update invoices for finalization"     ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can view order costs for finalization"    ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can insert order costs for finalization"  ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can update order costs for finalization"  ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can delete order costs for finalization"  ON public.zen_order_costs;
NOTIFY pgrst, 'reload schema';
```

- 기존 ADMIN/SUPER_ADMIN 정책은 변경하지 않으므로 롤백 시 원문 복원이 필요 없습니다(방식 B 선택 이유).
- 데이터 변경 없음(정책만 추가/제거).

### 8-4. 적용 순서

1. **배포 시**: DB 마이그레이션(M1) 선적용 → PostgREST 스키마 reload 확인 → 앱 배포. (앱 먼저 배포하면 MANAGER 요청이 정책 대기 중 실패)
2. **롤백 시**: 앱 롤백 선실시 → M1 롤백 SQL 적용. (DB 먼저 되돌리면 새 앱의 MANAGER 경로가 실패)
3. M2(가드)는 M1과 독립 PR로 두고, 가드 변경이 먼저 배포되더라도 MANAGER의 DB 접근은 M1 전까지 거부됩니다(안전한 순서).

### 8-5. Ds-11(R-12) 반영 위치 (구현 확정 후)

| 문서 | 위치 | 반영 내용 |
|:--|:--|:--|
| `docs/02_Analysis/ds11/Ds_11_04_Finance_Settlement.md` | `§4.2 정산·마감·조정` | 정산마감 권한 표(ADMIN·SUPER_ADMIN·MANAGER), 테이블×동작 매트릭스 링크 |
| `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | `§11.12~11.14` | UPS 실비→마감 경로의 MANAGER 정책 경계, TASK-B-379와의 소관 분리 |
| `docs/02_Analysis/Ds_11_API_상세_명세서.md` | 인덱스 3·7행 | 위 두 문서 업데이트 반영 |

> 본 설계 의견 PR에서는 Ds-11을 수정하지 않습니다(구현 확정 후 R-12 동기화).

---

## 9. 확정 요청 사항 (JSJung)

1. 권장안 **B(MANAGER 전용 정책 7개 신설)** 승인 여부.
2. `createPostFinalizationAdjustment`의 `validateAdminAction()` MANAGER 차단 처리 방향(§7).
3. SUB_ADMIN을 이번 범위에 포함할지(포함 시 어느 테이블까지) — 현재 규칙 문구는 ADMIN·MANAGER·SUPER_ADMIN만.
4. `zen_billing_statement_items` MANAGER SELECT 확대 여부(§7).
5. `zen_order_rate_snapshots`는 TASK-B-379 소관으로 분리하는 순서 확정(§6).

## 10. [작업 결과] (설계 의견 범위)

- 코드/정책 변경 **없음**. 마이그레이션·서버 액션·테스트 파일 미추가. `Closes` 미사용(`Refs #1463`).
- 실측 근거: 실제 로그인 세션 SELECT + JWT 클레임 주입 롤백 DML 프로브(잔여 데이터 0건 확인), `pg_policies` 카탈로그, `checkPermission` 함수 직접 실행.
- 미확인 항목은 §0·§2·§7에 명시(서버 액션 브라우저 미실행, 빈 테이블 판정 불가, 변경 후 매트릭스는 예측).
- 라벨: `status:open` → `status:in-progress` → `status:draft`. 검증: Jaison / 확정: JSJung.
