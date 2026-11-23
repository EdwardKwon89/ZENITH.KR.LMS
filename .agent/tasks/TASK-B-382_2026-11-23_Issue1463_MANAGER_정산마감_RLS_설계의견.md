# TASK-B-382 — Issue #1463: MANAGER의 정산마감 관련 테이블 RLS 정책 정렬 (설계 의견)

| 항목 | 내용 |
|:----|:-----|
| **Issue** | [#1463](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1463) |
| **담당(Worker)** | Baker (Team B) |
| **검증(Auditor)** | Jaison |
| **설계 확정** | **JSJung** → **Aiden** (본 문서는 확정 요청용 의견 — 구현 없음) |
| **상태** | 📝 설계 의견 **수정본 v5** (`status:draft`) — Jaison 5차 보완(컷오버 폐기·UPS 제거 후 정책 집합 재산정) + JSJung 영향 공지(16:08) + #1462 7차 반영. 재검토·최종 확정(①~④, ②는 신규 A/B 결정) 전까지 정책·함수·코드 변경 금지 |
| **브랜치** | `feature/teamb-task-b382-iss1463-manager-rls-design` (base `origin/TeamB_Dev` @ `83bb486f1`) |
| **연관** | DEF-B-166(b), DEF-B-168, **DEF-B-171**(확정: (b) / 후속 #1475), TASK-B-381(#1459 / **PR #1462 7차**), TASK-B-377(#1451 / PR #1454), TASK-B-379(#1453), **#1475(TASK-B-383, Mike)** |
| **공개 저장소 주의** | 아래 표는 **허용/거부 결과만** 기록합니다. 노출 경위·재현 절차 세부는 기재하지 않습니다. |
| **개정 이력** | `54ddba60a` 최초 → `6f400bf0d` 1차 → `e6b10c6e9` 2차 → `6d857341f` 3차 → `1f6f2c614` 4차 → **v5(본 개정)** |

| 버전 | 일자 | 반영 내용 |
|:--|:--|:--|
| v4 | 2026-11-23 | Jaison 4차 DELETE 근거 정정, JSJung #1475 확정 (커밋 `1f6f2c614`) |
| **v5** | 2026-11-24 | Jaison 5차 보완 6건 + JSJung 16:08 영향 공지 + #1462 7차 반영 — **컷오버 폐기·UPS 인보이스 경로 제거·정책 집합을 "UPS 제거 후" 기준으로 재산정** (커밋 `32d01d742`, 해시 기재 `2차 커밋`) |

---

## 0. 범위 · 방법론 (코드 열거와 실측의 구분)

| 구분 | 방법 | 범위 |
|:--|:--|:--|
| **코드 열거** | 서버 액션 본문과 호출 헬퍼의 `from()/insert()/update()/delete()/rpc()` 전수 확인 | 테이블×동작(§1) / 영향 범위(§4-3) / 정책×경로 필요 여부(§4-1-2) |
| **세션 실측 (SELECT)** | 표준 계정으로 **실제 로그인** 후 사용자 Bearer 토큰으로 가시 행 수 측정 | §2 표 |
| **세션 실측 (DML)** | JWT 클레임을 `authenticated` 롤 트랜잭션에 주입해 DML을 **매 트랜잭션 ROLLBACK**으로 측정 | §3 표 |
| **픽스처 실측 (청구서)** | 헤더 2건(플랫폼 발행 / 대리점 발행) + 항목 2건을 **로컬 트랜잭션 내에서만** 적재(`session_replication_role=replica`, ROLLBACK)해 역할별 가시성 측정 | §2-1, §7-1 |
| **트리거 실측** | ADMIN 세션으로 연결된 원가 행의 `invoice_id` 해제 UPDATE 실행 → ROLLBACK | §4-3 #3, DEF-B-168 |
| **정책 카탈로그** | `pg_policies` / `pg_constraint` / `information_schema.columns` 조회(읽기 전용) | §2·§4·§6·§7 |
| **미측정(명시)** | 서버 액션 자체의 브라우저 클릭 실행은 하지 않음. 빈 테이블(0행)은 RLS 판정 불가 → 카탈로그로만 판정. `ZENITH_SUPER_ADMIN` 임시 계정은 정리되어 세션 실측에서는 제외(정책 정의로 추론) | §2 각주 |

- 측정 후 잔여 확인: 청구서 픽스처 0건, 프로브 행 0건(모든 프로브 ROLLBACK + 사후 정합 확인).
- §2·§3의 실측값은 **현재 코드 기준 baseline**이며, v5의 "UPS 제거 후" 판정은 코드 열거(§1·§4-1-2)와 B-381 7차 설계 확정안에 근거합니다.

### 0-1. 본 개정 반영 대조표

| 출처 | 요청 | 반영 위치 |
|:--|:--|:--|
| Jaison 1차 보완 5건 | 공개 기재 삭제 / 영향 범위 표 / 스냅샷 원인 / 무결성 위험 / SUB_ADMIN | §2·§4-3·§6·§7·§9 (1차 수정분 유지) |
| JSJung 1차 결정 5건 | 방식 B· 정책 신설·가드 로컬 허용·SUB_ADMIN 제외·스냅샷 소관 | §9-1 (정책 수는 v5 재산정으로 갱신) |
| Aiden 모순 4건 | B-381 충돌 / 최소집합 / 스냅샷 의존 / 조정 경로 종속 | §4-1-1·§4-1-2·§6 |
| Jaison 2차 보완 1 | 청구서 가시성 픽스처 실측 + 헤더 정책 사실 + 무결성 위험 구분 | §2-1, §7-1 |
| Jaison 2차 보완 2 | `rejectInvoice` 예측 정정 + ADMIN 실측 + DEF 등록(DEF-B-168) | §4-3 #3, `[발견 이슈]`, DEF 파일 |
| Jaison 2차 보완 3~5 | 경로 분류 / 순서 충돌 해소 / 가드 거부 함수 명시 + 경로별 근거 표 | §4-3·§6·§4-1-2 (분류 열은 v5에서 "UPS 제거 후"로 대체) |
| JSJung 후속 결정 A | "MANAGER=admin"은 **청구서관리 전체를 포함하지 않음** — 헤더 정책 변경 없음 | §7-2, §9-1 #6 |
| JSJung 후속 결정 B | 정책 #8을 **(b) 존재 확인 전용 SECURITY DEFINER 함수**로 확정 | §4-1, §7-1, §8, §9-1 #7 |
| Jaison 3차 보완 1~4 | `invoice_id IS NULL` 정밀 산정 / 함수 fail-closed / DEF-B-171 등록 / §9 갱신 | §4-1-2·§7-1·§9-2 (DELETE 관련 항목은 v5 재산정으로 흡수) |
| Jaison 4차 보완 1 | `UPS_ACTUAL_COST_ADJ` INSERT가 `invoice_id: inv.id` 포함 → 세션 DELETE 근거 없음 | §4-1-2 (v5에서 "UPS 제거 후 소멸"로 연장) |
| JSJung #1475 결정 | ⑤ **확정: (b) 의도하지 않은 노출**, 후속 **#1475(TASK-B-383, Mike)** | §2-1·§6·§7-1·§9-1 #11·DEF-B-171 |
| **JSJung 영향 공지 (16:08)** | **컷오버 폐기**, UPS 인보이스 경로 제거, 비UPS 무변경 가정, "현재/UPS 제거 후" 나란히 기재 | §0-2·§4-1·§4-1-3·§4-3·§9-1 |
| **#1462 7차 (JSJung 확정)** | 단일 신규 경로, PAID 없음, M5, run-only, UPS 실비 경로 제거 | §1·§4-1-2·§4-3·§7-1·§9 |
| **Jaison 5차 보완 1** | 정책 집합을 "UPS 제거 후" 기준 재산정 — 정책×경로 필요 여부 표(현재/제거 후), UPDATE·DELETE 근거 명시 | §1·§4-1~§4-1-3·§5 |
| **Jaison 5차 보완 2** | ② "7개 vs 6개" 삭제 → "비UPS 인보이스·원가 RLS 개방 여부(A/B)" 신규 결정 | §4-1·§9-2 ② |
| **Jaison 5차 보완 3** | 존재 확인 함수·`unmarkOrderCostSettled` 유지, M5 초기화 제외 기준과 DRAFT 포함 판정 한 줄 대조 | §4-3 #11·§7-1 1번·§9-2 |
| **Jaison 5차 보완 4** | 스냅샷 의존을 "B-381 7차 기준, 단계 4"로 표현 | §6 |
| **Jaison 5차 보완 5** | §9 ① 경로 수 재산정, ③ 순서 갱신, ④ SUB_ADMIN 한 줄 종결 | §9-2 |
| **Jaison 5차 보완 6** | 공개 저장소 규칙(결과표만) 유지 | 전문 |

### 0-2. v5 범위 · 가정 (JSJung 16:08 공지 / #1462 7차)

- **컷오버 폐기**: 컷오버일·레거시 병행·"컷오버 전/후" 분류는 모두 삭제합니다. UPS 오더는 **신규 경로 하나**(`finalize_ups_settlement_run`)로 동작합니다.
- **UPS 인보이스 경로 제거**: UPS 정산마감은 `SECURITY DEFINER` RPC(역할 검사 ADMIN·MANAGER·ZENITH_SUPER_ADMIN)가 처리하므로 **MANAGER의 UPS 정산마감은 `zen_invoices`·`zen_order_costs` RLS에 의존하지 않습니다.**
- **비UPS 무변경**: 비UPS 오더·인보이스 경로는 이번 개편 범위 밖이며 변경하지 않습니다(B-381 7차, JSJung 확정 2026-11-24). 남는 RLS 불일치는 이 비UPS 경로에만 있습니다.
- 기존 데이터는 보존하되, 호환·이중 처리를 위한 레거시 분기는 두지 않습니다.
-최종 정책 수는 위 A/B 결정과 B-381 7차 설계 확정 후 확정합니다.

---

## 1. 정산마감 경로 테이블×동작 전수표 (코드 열거, UPS 제거 후 재정리)

| 함수 | SELECT | INSERT/UPSERT | UPDATE | DELETE | UPS 제거 후 |
|:--|:--|:--|:--|:--|:--|
| `generateInvoicesForOrder` (settlement.ts:15) | 인보이스(마감 확인, L44) | generator 경유 — **admin client → RLS 우회** | — | — | **유지(비UPS)** |
| `finalizeInvoice` (settlement.ts:141) | 인보이스(lookup)·원가(합계)·오더(권한) | 감사 이력 | 인보이스(finalize, L126) | — | **유지(비UPS)** |
| `rejectInvoice` (settlement.ts:633) | 인보이스(L641) | 감사 이력·재발행(admin client) | 인보이스 취소(L656)·원가 연결 해제(L670, 트리거 차단 → DEF-B-168) | — | **유지(비UPS)** |
| `updatePaymentStatus` (settlement.ts:213) | 인보이스 | — | 인보이스(결제상태·금액) | — | **유지(비UPS)** |
| `calculateSettlementAction` (settlement.ts:287) | 인보이스·원가 집계 | — | — | — | **유지(비UPS)** |
| `addManualOrderCost` (settlement.ts:478) | 원가(선행 확인, L519~525) | 원가(`invoice_id` 없이, L534) | — | — | **유지** |
| `unmarkOrderCostSettled` (ups-actual-cost.ts:910) | 오더·**청구서 항목(존재 확인 → §7-1 함수로 교체 예정)** | — | 오더(되돌림) | — | **유지** |
| `recordUpsActualCost` (ups-actual-cost.ts:202) | UPS 오더·업체실비·인보이스·원가 | UPS 원가·`UPS_ACTUAL_COST_ADJ` | 원가·인보이스(meta) | 원가 멱등 재생성 | **제거** (#1462 §2-7) |
| `recordActualCostAndFinalize` (:546) | UPS 오더·실비·인보이스 → `finalizeInvoice` 전체 | 실비·부가운임 | 실비 | 부가운임 | **제거** (#1462 §2-7) |
| `recordUpsActualCharges` (ups-actual-charges.ts:27) | 인보이스·원가 | UPS 델타 인보이스·원가 | 인보이스·원가(**admin client**, RLS 우회) | 델타 정리(admin client) | **제거** (전 오더 폐기) |
| `createPostFinalizationAdjustment` (settlement.ts:558) | 원 인보이스·오더·원가 | 조정 인보이스(`createAdjustmentInvoice`, L605 세션) | 인보이스·원가(`linkAdjustmentCosts`, L619~621 세션) | — | **제거** (호출부 위 UPS 함수 소멸) |
| `markOrderCostSettled` (settlement.ts:838) | 오더·실비·인보이스 | — | 오더 | — | **신규 RPC로 흡수·제거/내부화** (#1462 §2-7) |

- `linkAdjustmentCosts`(L614)와 `createAdjustmentInvoice`(L598)는 **`createPostFinalizationAdjustment` 전용 헬퍼**이며, UPS 인보이스 경로 제거 시 함께 소멸합니다(Jaison 5차 1).
- `InvoiceGenerator`는 `createAdminClient`(`invoice-generator.ts:17`)를 사용해 인보이스 INSERT·원가 연결 UPDATE를 **RLS 우회**로 수행합니다. 따라서 "인보이스 INSERT"의 세션 클라이언트 근거는 UPS 후속 조정(`createAdjustmentInvoice`) 하나뿐이며, 그 소멸 후에는 없습니다.
- UPS 마감 자체는 `finalize_ups_settlement_run`(`SECURITY DEFINER`, ADMIN·MANAGER·ZENITH_SUPER_ADMIN 검사)이 run·금액·주문 상태를 한 트랜잭션에 저장합니다(§7-1 2번 동일 기준).

---

## 2. 변경 전 세션 실측 — SELECT 가시성

| 테이블 | ADMIN | SUPER_ADMIN | MANAGER | AGENCY | SHIPPER | OPERATOR | SUB_ADMIN |
|:--|:--|:--|:--|:--|:--|:--|:--|
| `zen_orders` | O(15) | O(15) | **O(15)** | O(7) | O(10) | X | X |
| `zen_invoices` | O(16) | O(16) | **X(0)** | O(15) | O(7) | X | X |
| `zen_order_costs` | O(24) | O(24) | **X(0)** | O(24) | O(9) | X | X |
| `zen_ups_actual_cost` | O(5) | O(5) | **O(5)** | X | X | X | O(5) |
| `zen_ups_actual_other_charges` | O | O | **O** | X | X | X | O |
| `zen_order_rate_snapshots` | O(8) | **X(0)** | **X(0)** | O(7) | O(3) | X | X |

카탈로그 보충:
- `zen_exchange_rates`·`order_status_history`: authenticated SELECT 정책 존재 → MANAGER 읽기 가능.
- `zen_order_rate_snapshots`의 `SUPER_ADMIN X(0)` 원인: 정책 `Super admins have full access to order snapshots`가 `role = 'ADMIN'`만 체크(Jaison이 #1453에 전달 완료).
- 중첩 조회에서 MANAGER는 `snapshot: null` → `recomputeRevenue`의 0 폴백 영향은 §6 참조.

### 2-1. 청구서 헤더·항목 픽스처 실측 (Jaison 보완 1)

로컬 트랜잭션에 플랫폼 발행(`ADMIN_TO_AGENCY`) / 대리점 발행(`AGENCY_TO_SHIPPER`) 헤더와 항목을 각 1건씩 적재해 측정했습니다(ROLLBACK, 잔여 0건). `O`=가시, `X`=0행.

| 역할 | 헤더: 플랫폼 발행 | 헤더: 대리점 발행 | 항목: 플랫폼 발행 | 항목: 대리점 발행 |
|:--|:--:|:--:|:--:|:--:|
| ADMIN | O(1) | O(1) | O(1) | O(1) |
| ZENITH_SUPER_ADMIN | 추론 O | 추론 O | 추론 O | 추론 O (정책 역할 목록 기준, 세션 미측정) |
| **MANAGER** | **O(1)** | **X(0)** | **O(1)** | **X(0)** |
| AGENCY | O(1) | O(1) | O(1) | O(1) |
| SHIPPER | X(0) | O(1) | X(0) | O(1) |
| OPERATOR | O(1) | X(0) | O(1) | X(0) |
| SUB_ADMIN | X(0) | X(0) | X(0) | X(0) |

**사실**: "MANAGER가 청구서 항목을 0행으로 본다"는 일부만 맞습니다. `bsi_select`의 **발행 조직 분기** 때문에 MANAGER(플랫폼 조직 소속)는 **플랫폼이 발행한 청구서 항목을 볼 수 있습니다.** 안 보이는 것은 **대리점이 발행한 청구서(감독 대상)** 입니다. 헤더도 동일합니다(`bill_stmt_select_supervise`는 `role IN ('ADMIN','ZENITH_SUPER_ADMIN')` + 발행사 AGENCY 한정 → MANAGER 제외). 따라서 무결성 위험은 **대리점 발행 청구서에 포함된 오더**에서 발생합니다(§7-1).
- 같은 플랫폼 조직 소속 **OPERATOR도 플랫폼 발행 헤더·항목을 O**로 봅니다(조회는 발행 조직 기준, 역할 조건 없음 / 쓰기는 역할 목록으로 제한). 조회 범위 이슈로 **DEF-B-171** 등록 — JSJung이 **확정: (b) 의도하지 않은 노출**, 후속 **#1475(TASK-B-383, Mike)**. 본 Task에서는 청구서 조회 정책을 변경하지 않습니다(§9-1 #11).

---

## 3. 변경 전 세션 실측 — DML 허용/거부

| 테이블·동작 | ADMIN | SUPER_ADMIN | MANAGER | AGENCY | SHIPPER | OPERATOR | SUB_ADMIN |
|:--|:--|:--|:--|:--|:--|:--|:--|
| `zen_orders` UPDATE | O | O | **O** | O(소유) | O(소속) | X | X |
| `zen_invoices` SELECT/UPDATE | O | O | **X** | X(UPDATE) | X(UPDATE) | X | X |
| `zen_invoices` INSERT | O | O | **X** | X | X | X | X |
| `zen_order_costs` SELECT/INSERT/UPDATE/DELETE | O | O | **X** | X(쓰기) | X(쓰기) | X | X |
| `zen_ups_actual_cost` INSERT/UPDATE | O | O | **O** | X | X | X | O |
| 부가운임 테이블 INSERT/DELETE | O | O | **O** | X | X | X | O |
| `zen_order_rate_snapshots` INSERT/UPDATE | O | X | **X** | X | O(소속) | X | X |

잔여 데이터 없음(모든 프로브 ROLLBACK + 사후 정합 확인).

### 3-1. 앱 가드 실측

| 역할 | `checkPermission(role, '/admin')` | `validateAdminAction()` |
|:--|:--|:--|
| ZENITH_SUPER_ADMIN | true (bypass) | 통과 |
| ADMIN | true | 통과 |
| **MANAGER** | **false** | **예외** |
| SUB_ADMIN / OPERATOR / AGENCY / SHIPPER | false | 예외 |

`zen_role_permissions`에 MANAGER의 `/admin` 행 없음(`/admin/ups-actual-charges`만 있음). `createPostFinalizationAdjustment`는 `validateAdminAction()` 사용(563행) → 결정 #2로 이 함수에만 로컬 역할 목록 적용(전역 변경 금지). 단, 이 함수 자체가 **UPS 인보이스 경로 제거로 소멸**하므로(§1), 결정 #2의 실효 범위는 B-381 ① 경로(§9-1 #2)로 한정됩니다.

---

## 4. MANAGER 정책 집합 · 근거 · 영향 범위

### 4-1. 정책 집합 — **UPS 제거 후 재산정: A안 4개 / B안 0개** — 최종 결정 대기

> 구 **7개(인보이스 3 + 원가 4)** 및 **6개(DELETE 제외)** 안은 "컷오버 전 현행 유지" 전제가 폐기되어 **함께 폐기**합니다. UPS 마감은 `finalize_ups_settlement_run`(SECURITY DEFINER, ADMIN·MANAGER·SUPER 허용)이 처리해 RLS 비의존이고, UPS 인보이스 경로 제거로 `createPostFinalizationAdjustment`·`createAdjustmentInvoice`·`linkAdjustmentCosts`도 소멸합니다. 남는 불일치는 **비UPS 오더**의 인보이스·원가 경로이며, 이를 RLS까지 열지 여부를 §9-2 ②에서 결정합니다.

| 안 | 테이블·명령 | 정책 수 | 내용 |
|:--|:--|:--:|:--|
| **A. 필요한 비UPS 정책만 개방** | `zen_invoices` SELECT·UPDATE / `zen_order_costs` SELECT·INSERT | **4개** | 앱 가드(MANAGER 허용)와 RLS를 일치. 인보이스 INSERT·원가 UPDATE·DELETE는 세션 근거가 없어 신설하지 않음 |
| **B. 개방하지 않음** | — | **0개** | 인보이스·원가 정책 신설 없음. 비UPS 앱 가드 정리는 **별도 Task**로 이관(본 Task 범위 아님) |

- 두 안 모두 **UPS 정산마감 요구사항은 충족**합니다(RPC가 SECURITY DEFINER로 역할 검사). 차이는 비UPS 경로의 RLS 개방 여부뿐입니다.
- `zen_billing_statement_items` MANAGER SELECT 정책은 추가하지 않습니다. 1차 승인안 #8은 **존재 확인 전용 SECURITY DEFINER 함수**(§7-1)로 대체됩니다(양 안 공통).
- `zen_billing_statements`(헤더) 정책은 **변경 없음**(JSJung 후속 결정 A).
- `zen_orders`·`zen_ups_actual_*`·`zen_exchange_rates`·상태이력은 기존 정책으로 MANAGER 허용. AGENCY·SHIPPER·OPERATOR·SUB_ADMIN 정책 일체 변경 없음.

#### 4-1-1. "최소 집합" vs ADMIN 동등 권한 (Aiden 모순 2) — v5 재정의

| 비교안 | 구성 | 결과 | 한계 |
|:--|:--|:--|:--|
| **A안(4개)** | 비UPS 잔여 경로에 필요한 명령만 역할 확인으로 개방 | 앱 가드와 RLS 일치 | 행 단위 전권(컬럼 단위 제어 불가) — "마감 컬럼만 UPDATE"는 정책으로 불가 |
| **B안(0개)** | 인보이스·원가 정책 신설 없음 | 권한 확대 없음 | 비UPS 경로는 앱 가드와 RLS가 어긋난 상태 유지 → 앱 가드 정리 별도 필요 |
| 구 6/7개 안 | 2개 테이블에 6~7개 역할 확인 정책 | UPS 제거 전 전제 | **폐기** — UPS 경로 소멸로 근거 상실 |
| 기술 제약 | — | RLS는 **행 단위**만 제어(컬럼 단위는 별도 GRANT/뷰) | "마감 컬럼만 UPDATE"는 정책으로 불가 |

→ "최소 집합"은 **"UPS 제거 후에도 남는 비UPS 경로 중, 앱 가드가 MANAGER를 허용한 명령만 RLS가 막지 않는 집합(4개)"** 또는 **"신설 없음(0개) + 앱 가드 별도 정리"**로 재정의합니다. ADMIN 동등 전권이 의도인지는 §9-2 ① 확정 사항.

#### 4-1-2. 정책 × 경로 필요 여부 — **현재 코드 / UPS 제거 후** (Jaison 5차 보완 1)

| 정책 | 현재 코드 기준 세션 근거 | **UPS 제거 후** 근거 | 판정 |
|:--|:--|:--|:--|
| `zen_invoices` **SELECT** | `finalizeInvoice` lookup, `generateInvoicesForOrder` 마감 확인, `rejectInvoice`, `getShipperDailyBillingSummary`, `calculateSettlementAction`, UPS `recordUpsActualCost`·`recordUpsActualCharges` | 비UPS 잔여: `finalizeInvoice`·`generateInvoicesForOrder`·`rejectInvoice`·조회 2개 | **A: 필요 / B: 미개방** |
| `zen_invoices` **INSERT** | `createAdjustmentInvoice`(세션, UPS 마감 후 조정 전용), `InvoiceGenerator`(**admin client → RLS 우회**) | `createAdjustmentInvoice` 소멸, generator는 우회 → **세션 근거 없음** | **불필요(양 안 모두 신설 없음)** |
| `zen_invoices` **UPDATE** | `markInvoiceFinalized`(`finalizeInvoice`), `rejectInvoice` 취소, UPS `recordUpsActualCost`·`recordUpsActualCharges` | 비UPS 잔여: `finalizeInvoice`·`rejectInvoice` | **A: 필요 / B: 미개방** |
| `zen_order_costs` **SELECT** | `finalizeInvoice` 합계, `addManualOrderCost` 선행 확인, `calcAdjustmentTotal`, `invoice-files`·`statistics`, UPS 경로 | 비UPS 잔여: `finalizeInvoice`·`addManualOrderCost`·조회 경로 | **A: 필요 / B: 미개방** |
| `zen_order_costs` **INSERT** | `addManualOrderCost`(`invoice_id` 없이), UPS `recordUpsActualCost` 델타 | `addManualOrderCost` 잔여 | **A: 필요 / B: 미개방** |
| `zen_order_costs` **UPDATE (#6)** | `linkAdjustmentCosts`(settlement.ts:617, `UPS_ACTUAL_ADJUSTMENT` 연결), `rejectInvoice` 연결 해제(트리거 차단 → DEF-B-168) | `linkAdjustmentCosts`는 `createPostFinalizationAdjustment` 전용 → **소멸**. `rejectInvoice`는 트리거가 막아 근거 없음 | **근거 없음 — 제거 명시** |
| `zen_order_costs` **DELETE (#7)** | `recordUpsActualCost` 멱등 재생성(Jaison 4차 정정: INSERT가 `invoice_id: inv.id` → 근거 없음), `UPS_ACTUAL_ADJUSTMENT` 정리(admin client → 우회) | `recordUpsActualCost` 제거 → **소멸** | **근거 없음 — 제거 명시** |

**산정 결론**: UPS 제거 후 **원가 UPDATE(#6)·DELETE(#7) 모두 근거가 없습니다**(명시). `rejectInvoice`의 원가 연결 해제는 RLS와 무관하게 트리거가 차단합니다(DEF-B-168). 인보이스 INSERT도 세션 근거가 소멸합니다. 따라서 A안은 **인보이스 SELECT·UPDATE + 원가 SELECT·INSERT = 4개**, B안은 **0개**이며, 구 6/7개 안은 폐기합니다.

#### 4-1-3. UPS 제거 후 비UPS 인보이스 경로 (구 "컷오버 전/후" 분류 대체)

| 명령 | 잔여 비UPS 경로 | A안 판정 |
|:--|:--|:--|
| SELECT | `finalizeInvoice` lookup, `generateInvoicesForOrder` 마감 확인, `rejectInvoice` lookup, `getShipperDailyBillingSummary`, `calculateSettlementAction` | 필요 |
| INSERT | 세션 근거 소멸(`createAdjustmentInvoice`는 UPS 후속 조정 전용) / `InvoiceGenerator`는 admin client로 RLS 우회 | 불필요 |
| UPDATE | `markInvoiceFinalized`(`finalizeInvoice`), `rejectInvoice` 취소 | 필요 |

→ 컷오버일·기존 UPS 인보이스 보존 전제는 **폐기**. UPS 인보이스는 신규 경로로만 처리하고, UPS 오더의 구 경로는 제거합니다(기존 데이터 보존, 호환 분기 없음 — #1462 7차).

#### 4-1-4. ADMIN 동등 전권 비교 (Aiden 모순 2) — 요약

역할만 확인하는 정책은 ADMIN과 같은 행 단위 전권입니다. "MANAGER=admin" 규칙을 **잔여 비UPS 경로 전체**에 적용하는지 §9-2 ①에서 확인합니다. 단, 아래 두 함수는 정책과 무관하게 **가드에서 계속 거부**됩니다(Jaison 보완 5):
- `getRevenueReport` (`settlement.ts:419`, `validateAdminAction()`)
- `getCostReport` (`settlement.ts:444`, `validateAdminAction()`)

### 4-2. 방식 비교·권장안

| 항목 | A. 기존 ADMIN 정책에 MANAGER 추가 | B. MANAGER 전용 신설 (**승인**) |
|:--|:--|:--|
| ADMIN·SUPER_ADMIN 영향 | 즉시 영향 가능 | **없음**(정책 OR 결합) |
| 되돌리기 | 원문 복원 필요 | A안 신설 **4건 DROP** / B안 신설 0건 |
| 동시 변경 충돌 | B-375/B-379와 같은 객체 충돌 위험 | 없음 |
| 정책 수 | 적음 | **A안 4개 증가 / B안 0개** (구 6/7개 안 폐기) |

**B(MANAGER 전용 신설)** 유지. INSERT는 `WITH CHECK`, UPDATE는 `USING + WITH CHECK` 동일 조건. 최종 정책 수는 §9-2 ② 결정(A 4 / B 0) 따름.

### 4-3. 영향 범위(Blast Radius) — "현재 코드 / UPS 제거 후" 나란히 (Jaison 5차 보완 1)

| # | 서버 액션 (위치) | 앱 가드 | 변경 전(실측) | 현재 코드 기준 | **UPS 제거 후** | A안 예측 | B안 예측 |
|:-:|:--|:--|:--|:--|:--|:--|:--|
| 1 | `generateInvoicesForOrder` (settlement.ts:15) | `adminRoles` | 생성 차단 | UPS+비UPS | **비UPS만 유지** | 정상 생성 | 가드 거부 유지(별도 정리) |
| 2 | `finalizeInvoice` (settlement.ts:141) | `assertFinalizePermission` | 실패 | UPS+비UPS | **비UPS만** | 정상 마감 | 가드 거부 유지 |
| 3 | `rejectInvoice` (settlement.ts:633) | `assertFinalizePermission` | 실패 | UPS+비UPS | **비UPS만** — 원가 연결 해제는 트리거 차단(DEF-B-168) | 취소 성공 / 연결 해제 실패 | 가드 거부 유지 |
| 4 | `updatePaymentStatus` (settlement.ts:213) | `adminRoles` | 실패 | 비UPS | 비UPS | 정상(정산 외) | 가드 거부 유지 |
| 5 | `calculateSettlementAction` (settlement.ts:287) | `adminRoles` | 0행 | 비UPS | 비UPS | 정상 집계 | 가드 거부 유지 |
| 6 | `addManualOrderCost` (settlement.ts:478) | `adminRoles` | 실패 | 전 오더 | **유지** | 정상 등록 | 가드 거부 유지 |
| 7 | `createPostFinalizationAdjustment` (settlement.ts:558) | `validateAdminAction` → 결정 #2 | 가드+RLS 차단 | **UPS 전용** | **제거** (호출부 소멸) | 해당 없음 | 해당 없음 |
| 8 | `getShipperDailyBillingSummary` (daily-billing.ts:110) | `adminRoles` | 0행 | 비UPS | 비UPS | 정상 조회 | 가드 거부 유지 |
| 9 | `finalizeDailyShipperInvoices` (daily-billing.ts:434) | `adminRoles` | 전건 실패 | UPS+비UPS | **비UPS만**(UPS 항목 제외) | 정상 일괄 | 가드 거부 유지 |
| 10 | `recordUpsActualCharges` (ups-actual-charges.ts:27) | `assertAdminOnly` | 실패 | **UPS 전용** | **제거** | 해당 없음 | 해당 없음 |
| 11 | `unmarkOrderCostSettled` (ups-actual-cost.ts:910) | `assertAdmin`(MANAGER 포함) | 대리점 발행 청구서 포함 오더 해제 위험 | UPS 경로 | **유지** — M5 일괄 초기화는 이 함수를 거치지 않음(§7-1 1번 대조) | 포함 오더 거부 | 포함 오더 거부(함수는 양 안 공통) |

- **경로 수 재산정**: 현재 11개 → **UPS 제거 후 9개 잔여**(7·10번 제거). `recordUpsActualCost`·`recordActualCostAndFinalize`·`markOrderCostSettled`도 §1에서 제거/흡수로 정리했습니다.
- `getRevenueReport`·`getCostReport`는 `validateAdminAction()`으로 **정책과 무관하게 MANAGER 거부 유지**(§4-1-4).
- **의도 확인**: 잔여 9개 경로 전체에 ADMIN 동등 전권을 주는지(§9-2 ① — Jaison 승인, JSJung·Aiden 확정 대기).

---

## 5. 권한 확대 경계 검증 계획 (구현 시)

- **양성 대조**: A안 채택 시 4개 대상에서 MANAGER `X → O` 실측. **정산 외 경로 2개**(`updatePaymentStatus`, `getShipperDailyBillingSummary`) 정상 동작 확인. B안 채택 시 인보이스·원가 정책이 **신설되지 않았음**을 확인.
- **음성 대조(고정)**: AGENCY·SHIPPER·OPERATOR의 §2·§3 값 전후 동일. ADMIN·SUPER_ADMIN 셀도 불변(방식 B).
- **되돌리기 실측**: A안 신설 4건 DROP 후 MANAGER `X` 복귀 확인(프로브 `afterAll` 원복). B안은 해당 없음.
- **서버 액션 연결**: 잔여 9개 경로 중 정산 인접 경로 우선 확인. 제거 경로(7·10번)는 호출부 소멸로 미적용 확인.
- **UPS 경로 무의존 확인**: MANAGER가 `finalize_ups_settlement_run`을 **정책 0개 상태(B안)에서도** 호출 가능함을 확인(SECURITY DEFINER 역할 검사).
- **청구서 존재 확인 함수 테스트**: §7-1 5번 항목의 양성/음성 대조 + 되돌리기 실측. **#1475 적용 전/후 양쪽 상태 모두**에서 "MANAGER가 플랫폼 발행·대리점 발행 양쪽 포함 오더의 정산 해제를 거부"하는지 검증(§6 의존).
- **M5 기준 대조**: B-381 7차 M5 일괄 초기화의 "청구서 항목 포함 오더 제외"와 §7-1 함수의 "DRAFT 포함 상태 무관 존재 확인"이 **같은 포함 기준(상태 무관)**인지 한 줄 확인(§7-1 1번).
- **DEF-B-168 확인**: `rejectInvoice` 원가 연결 해제 실패가 수정 Task에서 해결됐는지 확인(본 Task에서는 수정 금지).
- 별도 보안 검토 항목 1건을 JSJung에게 직접 보고.

| 셀 | 변경 전(실측) | A안 후(예측) | B안 후(예측) |
|:--|:--|:--|:--|
| MANAGER / `zen_invoices` SELECT·INSERT·UPDATE | X | SELECT·UPDATE **O** / INSERT **X**(근거 소멸) | **X 전부** |
| MANAGER / `zen_order_costs` SELECT·INSERT·UPDATE·DELETE | X | SELECT·INSERT **O** / UPDATE·DELETE **X**(근거 소멸) | **X 전부** |
| MANAGER / UPS 정산마감(RPC) | (현재 UPS 구 경로) | **O** — SECURITY DEFINER, 양 안 동일 | **O** — 양 안 동일 |
| MANAGER / 청구서 항목 직접 SELECT | 플랫폼 발행 O / 대리점 발행 X | **동일(정책 추가 없음)** | **동일** |
| MANAGER / 존재 확인 함수 호출 | (함수 없음) | 포함 오더 `true`, 미포함 `false` | 동일(함수는 양 안 공통) |
| AGENCY·SHIPPER·OPERATOR 전체 | §2·§3·§2-1 그대로 | 동일(예측) | 동일(예측) |
| ADMIN·SUPER_ADMIN 전체 | §2·§3 그대로 | 동일(예측) | 동일(예측) |

---

## 6. TASK-B-379(#1453)와의 경계 · 순서 (v5 갱신)

- **UPS 경로 무의존**: UPS 정산마감은 `finalize_ups_settlement_run`(`SECURITY DEFINER`, 역할 검사 ADMIN·MANAGER·ZENITH_SUPER_ADMIN)이 처리하므로 `zen_invoices`·`zen_order_costs` RLS 정책 수(A 4 / B 0)와 무관합니다.
- **스냅샷 의존 — B-381 7차 기준, 단계 4**: `finalize_ups_settlement_run`의 **단계 4 `recomputeRevenue`**는 `order.snapshot`을 읽어 run에 저장할 화주·대리점 target을 계산합니다. MANAGER는 스냅샷이 `null`이라 0 폴백으로 결과가 달라질 수 있으므로, **#1453(B-379)의 MANAGER 스냅샷 SELECT 결정이 여전히 선행 조건**입니다. 본 Task는 스냅샷 정책을 변경하지 않습니다.
- 존재 확인 함수(M2)·`unmarkOrderCostSettled`는 UPS 경로 제거와 무관하게 **유지**됩니다. M5 일괄 초기화는 이 함수를 거치지 않으므로 "청구서 포함 오더 제외" 조건을 스크립트에 명시해야 합니다(§7-1 1번).
- **#1475(TASK-B-383) 의존(JSJung 확정)**: B-382의 존재 확인 전용 함수를 `unmarkOrderCostSettled`에 적용한 **뒤에** #1475를 병합합니다. #1475 적용 시 MANAGER에게 플랫폼 발행 청구서 항목이 0행으로 보여, 함수가 없으면 정산 해제가 허용될 수 있습니다. 테스트는 **#1475 적용 전/후 양쪽 상태**를 모두 검증합니다(§5·§7-1 5번).

### 순서 (Jaison 5차 보완 5 반영 — 최종 결정은 JSJung·Aiden)

| 구분 | 순서 | 근거 |
|:--|:--|:--|
| **설계 확정** | **B-381 7차(먼저) → B-382 v5 → JSJung → Aiden** | B-381 7차가 UPS 경로 제거·단일 신규 경로·M5를 확정(Jaison 승인 완료, PR #1462가 먼저 확정 요청 단계). B-382는 그 결과에 의존 |
| **구현** | **B-382 선행 → B-381 → B-377(#1454)** | JSJung 확정 B-382 선행(마이그레이션 객체·timestamp 충돌 회피). B-381은 UPS 경로 제거 전제 |
| **별도 선행 조건** | **#1453(B-379) 스냅샷 결정** | B-381 7차 단계 4 `recomputeRevenue`가 `order.snapshot` 사용 |
| **#1475** | B-382 함수 적용 후 병합 | 무결성 보호의 전제 |

→ 설계 확정 축과 구현 축은 별개입니다. 임의로 순서를 바꾸지 않습니다.

---

## 7. 청구서 관련 결정 · 무결성 보호 설계 (UPS 제거 후에도 유지)

### 7-1. 정책 #8 대체: 존재 확인 전용 SECURITY DEFINER 함수 (JSJung 후속 결정 B)

**사실(§2-1 실측)**: MANAGER는 플랫폼 발행 청구서 항목을 **볼 수 있고**, 대리점 발행 청구서 항목은 **0행**입니다. `unmarkOrderCostSettled`(ups-actual-cost.ts:925~935)는 항목 SELECT로 "포함 여부"를 확인하므로, **대리점 발행 청구서에 포함된 오더를 MANAGER가 정산 해제할 수 있는 무결성 위험**이 남습니다. 헤더 정책(`bill_stmt_select_supervise` 등)에도 MANAGER가 없어(JSJung 결정 A) 항목 데이터 접근 권한을 새로 주는 것은 결정과 어긋납니다.

→ **선택안 (b)**: MANAGER에게 청구서 항목 SELECT 권한을 주지 않고, **포함 여부만 boolean으로 반환하는 함수**를 사용합니다. **UPS 인보이스 경로 제거 후에도 `unmarkOrderCostSettled`는 유지되므로(§4-3 #11) 이 함수도 양 안 공통으로 유지**됩니다.

| 안 | 무결성 | 변경 파일 | 되돌리기 | 규칙 1 정합 |
|:--|:--|:--|:--|:--|
| (a) #8 SELECT 정책 유지 | 보장 | 마이그레이션 1 | DROP POLICY | 항목 데이터 읽힘 → 후속 결정과 충돌 |
| **(b) 존재 확인 함수 (확정)** | 보장 | 마이그레이션 1 + 앱 1 | DROP FUNCTION + 앱 롤백 | **데이터 미노출, 정산 해제 보호만 수행** |
| (c) MANAGER 해제 차단 | 보장 | 앱 1 | 앱 롤백 | 규칙 1의 "정산마감 MANAGER 허용"과 충돌 |

- **후속 #1475 의존**: #1475가 청구서 조회 정책을 정렬하면 MANAGER에게 플랫폼 발행 항목이 0행이 되어, 함수가 없으면 정산 해제가 허용될 수 있습니다. 따라서 **본 함수를 `unmarkOrderCostSettled`에 먼저 적용한 뒤 #1475를 병합**합니다(§6). 청구서 조회 정책 자체는 B-382에서 변경하지 않습니다(JSJung 결정).

**함수 설계 요구사항 (JSJung 지시 7개 항목 반영)**

1. **시그니처·반환**: `public.zen_billing_statement_order_included(p_order_id uuid) RETURNS boolean`. 오더별 boolean만 반환. 청구서 번호·금액·상태·발행 조직 등 **다른 정보는 반환하지 않음**. **청구서 상태(DRAFT/ISSUED/CLOSED)와 무관하게 "포함 여부"만 확인** — 기존 확인이 DRAFT 포함 오더도 차단했으므로(#1445 A5) 의미를 보존합니다. (필요 시 배열 오버로드 검토 — 본 설계는 단일 오더 기준.)
   - **M5 일괄 초기화 기준과 한 줄 대조**: #1462 7차 M5는 "`zen_billing_statement_items`에 이미 포함된 오더는 초기화 제외(포함 시 중단·보고)"이고, 본 함수는 "DRAFT 포함 상태 무관 포함 여부"를 반환하므로 **둘 다 '청구서 항목 포함 여부'를 상태와 무관하게 판정하는 동일 기준**입니다. 단, M5 일괄 SQL은 이 함수를 거치지 않으므로 스크립트에 해당 조건을 명시해야 합니다(#1462 §2-6).
2. **보안(#1449 B / B-381 RPC 동일 기준 / fail-closed)**: `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`; `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`(세션 클라이언트 호출용) 후 **함수 내부에서 `auth.uid()`로 역할 검사**(ADMIN·MANAGER·ZENITH_SUPER_ADMIN만 허용). **비허용 역할은 반드시 예외(`RAISE`)로 거부** — `false`를 반환하면 호출부가 "청구서에 포함 안 됨"으로 읽어 정산 해제를 허용하는 무결성 위험이 있으므로 금지. 앱도 **RPC 오류 시 해제를 차단(fail-closed)**하도록 구현. **actor를 파라미터로 받지 않음**; 앱은 **세션 클라이언트**로 호출(admin client 금지). AGENCY·SHIPPER·OPERATOR·anon의 직접 호출은 예외로 거부되고 포함 여부 열거도 불가.
3. **오더 범위 제한 검토**: 호출자가 임의 오더 id로 포함 여부를 알아낼 가능성은 **허용 역할이 관리자 3역할뿐**이고 반환값이 boolean 하나라 영향이 낮음 — 근거로 기재. (차단이 필요하면 오더 조직 범위 조건을 함수에 추가하는 옵션을 둔다.)
4. **앱 변경**: `unmarkOrderCostSettled`의 항목 SELECT(925~935행)를 `supabase.rpc('zen_billing_statement_order_included', { p_order_id: orderId })`로 교체. **ADMIN·SUPER_ADMIN의 기존 동작 불변** 검증(포함 오더 해제 거부 유지, 미포함 오더 해제 허용).
5. **테스트(양성/음성 대조)**: MANAGER 포함 오더 해제 **거부** / 미포함 **허용**; **DRAFT 청구서 포함 오더도 해제 거부**(상태 무관 존재 확인 — #1445 A5, 청구서 취소 후에는 허용); AGENCY·SHIPPER·OPERATOR·anon 직접 RPC 호출 **예외 거부**; **RPC 오류 시 앱이 해제를 막는 fail-closed 동작**; ADMIN 양성 대조; **청구서 데이터가 반환되지 않음을 단언**; 되돌리기 실측(함수 제거 시 MANAGER 해제가 어떻게 되는지) 표로 정리. **#1475 적용 전/후 양쪽 상태**에서 MANAGER의 플랫폼 발행·대리점 발행 포함 오더 해제 거부를 각각 검증(§6 의존).
6. **마이그레이션 분리**: 함수 생성 마이그레이션(+롤백 `DROP FUNCTION`)을 정책 마이그레이션과 **별도 파일**. 적용 순서 DB 먼저 / 롤백은 앱 먼저. 이 함수는 **컷오버·B-381 설계와 독립적**으로 사용 가능(오더-청구서 포함 여부만 확인).
7. 이전 지시(DEF-B-168, 순서 해소안, 보고서 함수 거부 유지, 경로별 근거 표)는 그대로 유지.

### 7-2. 청구서관리 범위 (JSJung 후속 결정 A — 종결)

"MANAGER=admin"은 **청구서관리 전체를 포함하지 않습니다.** `zen_billing_statements` 헤더의 감독 조회(`bill_stmt_select_supervise`)·생성·수정·삭제 정책은 **변경하지 않습니다**(역할 목록 ADMIN·ZENITH_SUPER_ADMIN·AGENCY 유지). MANAGER 허용 범위는 **정산마감 관련 범위로 한정**(규칙 1 그대로). §9-2의 해당 항목은 **"확정: 포함하지 않음"**으로 정리했습니다.

### 7-3. 기타 확정 사항

| 항목 | 확정 |
|:--|:--|
| SUB_ADMIN | **제외 확정·비차단** — 정책 추가·삭제 없음. 원가 테이블 SUB_ADMIN 접근 정렬은 #1451(A) 별도. 계정 존재·사용 여부는 업무 확인(§9-2 ④ — 답이 늦어도 진행 가능) |
| `createPostFinalizationAdjustment` 가드 | UPS 인보이스 경로 제거로 **함수 소멸** → 결정 #2의 실효 범위는 B-381 ① 경로로 한정. 전역 `validateAdminAction()` 변경은 금지 |
| 스냅샷 | **#1453 소관, B-381 7차 기준 단계 4가 선행 조건**(§6) |

---

## 8. 산출물 분리 · 롤백 SQL · 배포 순서 · Ds-11

### 8-1. 산출물 (승인 후에만 생성)

| # | 산출물 | 내용 | 시점 |
|:--|:--|:--|:--|
| M1 | `supabase/migrations/<ts>_task_b382_manager_finalization_rls.sql` | **A안**: 인보이스 SELECT·UPDATE(2) + 원가 SELECT·INSERT(2) = **MANAGER 전용 4개 정책** + `NOTIFY pgrst`. **B안**: 인보이스·원가 정책 신설 없음(M1 자체 생략) | §9-2 ② A/B 확정 후 |
| M2 | `supabase/migrations/<ts>_task_b382_billing_inclusion_rpc.sql` | 위 §7-1 존재 확인 `SECURITY DEFINER` 함수 + GRANT/REVOKE + `NOTIFY pgrst` (M1과 **별도 파일**, 양 안 공통) | §9-2 ② 확정 후 |
| M3 | 앱 변경 메모(마이그레이션 아님) | ① `unmarkOrderCostSettled`의 RPC 호출 교체 ② B안 채택 시 비UPS 앱 가드 정리는 **별도 Task**로 이관 | 별도 PR/커밋 |
| M4 | TASK-B-379 | 스냅샷 정책 | 별도 Task(#1453), B-381 7차 단계 4 선행 조건 |

### 8-2. 정책 정의(안 — M1, A안만)

```sql
-- A안 1~2: zen_invoices SELECT / UPDATE
-- A안 3~4: zen_order_costs SELECT / INSERT
-- INSERT는 WITH CHECK, UPDATE는 USING + WITH CHECK를 동일 조건으로 정의.
-- 공통 조건: EXISTS (SELECT 1 FROM public.zen_profiles p
--                   WHERE p.id = auth.uid() AND p.role = 'MANAGER')
-- 인보이스 INSERT / 원가 UPDATE·DELETE는 UPS 제거 후 세션 근거가 없어 신설하지 않음.
-- zen_billing_statement_items / zen_billing_statements: 정책 변경 없음.
NOTIFY pgrst, 'reload schema';
```

- **B안**: 위 M1을 생성하지 않습니다(정책 0개). M2 함수는 양 안 공통으로 생성합니다.

### 8-3. 롤백 SQL(안 — **A안 4문** / B안 해당 없음)

```sql
DROP POLICY IF EXISTS "Managers can view invoices for finalization"      ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can update invoices for finalization"    ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can view order costs for finalization"   ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can insert order costs for finalization" ON public.zen_order_costs;
NOTIFY pgrst, 'reload schema';
```

- 구 6/7개 안의 `Managers can insert invoices...`·`Managers can delete order costs...`·`Managers can update order costs...`는 **UPS 제거로 근거가 소멸해 애초에 생성하지 않습니다**(롤백 대상 아님).
- M2 롤백(별도, 양 안 공통): `REVOKE ...` 원복 후 `DROP FUNCTION IF EXISTS public.zen_billing_statement_order_included(uuid);`

### 8-4. 적용 순서

1. **배포**: (A안일 때) M1 → M2(DB) → 스키마 reload 확인 → M3(앱). 앱 먼저면 MANAGER 요청이 정책 대기 중 실패. B안은 M2 → M3 순서.
2. **롤백**: M3(앱) 선실시 → M2 함수 제거 → (A안일 때) M1 정책 DROP. DB 먼저면 새 앱의 MANAGER 경로가 실패.
3. M2 함수는 B-381 구현 및 UPS 경로 제거와 독립적으로 배포 가능(§7-1 6번).
4. 구현 순서(§6): B-382 선행 → B-381 → B-377. #1475는 B-382 함수 적용 후 병합.

### 8-5. Ds-11(R-12) 반영 위치 (구현 확정 후)

| 문서 | 위치 | 반영 내용 |
|:--|:--|:--|
| `docs/02_Analysis/ds11/Ds_11_04_Finance_Settlement.md` | `§4.2 정산·마감·조정` | 정산마감 권한 표, 테이블×동작 매트릭스, UPS 단일 경로 / 비UPS 무변경 구분 |
| `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | `§11.12~11.14` | MANAGER 정책 경계(A/B), B-379 소관 분리, 포함 확인 함수 |
| `docs/02_Analysis/Ds_11_API_상세_명세서.md` | 인덱스 3·7행 | 위 두 문서 반영 |

> 본 설계 의견 PR에서는 Ds-11을 수정하지 않습니다(구현 확정 후 R-12 동기화).

---

## 9. 확정 사항 · 추가 확인 요청 · 절차

### 9-1. JSJung 확정 사항

| # | 확정 내용 | 반영 |
|:-:|:--|:--|
| 1 | 방식 B: MANAGER 전용 정책 신설. 기존 ADMIN·SUPER_ADMIN 정책 미수정 | §4-2 |
| 2 | `createPostFinalizationAdjustment` MANAGER 허용 — 전역 가드 변경 금지, 이 함수에만 로컬 역할 목록 (단, UPS 경로 제거로 함수 소멸 → 실효는 B-381 ① 경로) | §3-1·§7-3 |
| 3 | SUB_ADMIN 이번 범위 제외(추가·삭제 없음) | §7-3 |
| 4 | ~~청구서 항목 MANAGER SELECT 정책(#8)~~ → **후속 결정 B로 대체** | §7-1 |
| 5 | 스냅샷 정책은 #1453 소관, B-382 선행(마이그레이션 번호 순서) | §6 |
| 6 | **"MANAGER=admin"은 청구서관리 전체를 포함하지 않음** — 헤더 정책 변경 없음 | §7-2 |
| 7 | **정책 #8 = (b) 존재 확인 전용 SECURITY DEFINER 함수** (UPS 제거 후 양 안 공통 유지) | §4-1·§7-1·§8 |
| 8 | ~~컷오버일 미정·기존 UPS 인보이스 보존~~ → **폐기**: **컷오버 폐기, UPS 단일 신규 경로, UPS 인보이스 경로 제거** | §0-2·§4-1-3 |
| 9 | ~~컷오버 전 오더 정산마감 현행 유지·legacy 경로 근거 유지~~ → **폐기**: UPS 구 경로(`recordUpsActualCost`·`recordActualCostAndFinalize`·`recordUpsActualCharges`·`createPostFinalizationAdjustment`) **제거**, 마감은 `finalize_ups_settlement_run` 단일 경로 | §1·§4-1-2 |
| 10 | DEF 번호 분담: Baker 168 / Dave 169+ → 본 검토 신규 DEF는 **DEF-B-171** | DEF-B-171 |
| 11 | **청구서 조회 범위 = (b) 의도하지 않은 노출** 확정(DEF-B-171). 후속 **#1475(TASK-B-383, Mike)** — 본 Task는 청구서 조회 정책 변경 없음. **B-382 함수 적용 후 #1475 병합** | §2-1·§6·§7-1·DEF-B-171 |
| 12 | **비UPS 오더·인보이스는 변경하지 않음**(B-381 7차, 2026-11-24 확정). RLS 재산정 대상은 비UPS 잔여 경로의 개방 여부(A/B)뿐 | §0-2·§4-1 |

### 9-2. 추가 확인 요청

| # | 확인 요청 | 근거/현재 의견 |
|:-:|:--|:--|
| ① | 잔여 **9개 경로**(현재 11개 → UPS 제거 후 9개)에 "MANAGER=admin" 동등 전권을 적용하는가. 단 `getRevenueReport`·`getCostReport`는 정책과 무관하게 거부 유지, `createPostFinalizationAdjustment`·`recordUpsActualCharges`는 제거로 제외 | **Jaison 4·5차 검토: 승인(경로 수 갱신 반영)** / §4-3 — JSJung·Aiden 최종 확정 대기 |
| ② | **신규 결정: MANAGER의 비UPS 오더 인보이스·원가 처리를 RLS까지 열 것인가** — **A**: 필요한 정책만 열어 앱 가드와 일치(인보이스 SELECT·UPDATE + 원가 SELECT·INSERT = **4개**) / **B**: 열지 않음(**0개**, 비UPS 앱 가드 정리는 별도 Task). 구 "7개 vs 6개(DELETE 제외)"는 UPS 제거 재산정에 흡수되어 **삭제**. 가정: 비UPS 무변경(B-381 7차 JSJung 확정) | Jaison 5차 보완 1·2 / §4-1·§4-1-2 — **JSJung 최종 결정 대기** |
| ③ | 순서 — **설계 확정: B-381 7차 → B-382 v5 → JSJung → Aiden / 구현: B-382 선행 → B-381 → B-377(#1454)**. 별도 선행 조건 #1453(B-379, B-381 7차 단계 4) | **Jaison 4·5차 검토: 승인(최신 순서 갱신)** / §6 — JSJung 최종 확정 대기 |
| ④ | SUB_ADMIN 계정의 실제 존재·사용 여부(업무 사실 확인). **이번 범위 제외 확정, 비차단 — 답이 늦어도 진행** | §7-3 |
| ⑤ | ~~청구서 조회 범위 의도 확인~~ → **JSJung 확정: (b) 의도하지 않은 노출, 후속 #1475(TASK-B-383, Mike)**. B-382는 청구서 조회 정책을 바꾸지 않고, 함수 적용 후 #1475 병합 | §9-1 #11·§6·DEF-B-171 |
| (종결) | ~~"MANAGER=admin"을 청구서관리에 적용하는가~~ → **JSJung 결정: 포함하지 않음** | §7-2·§9-1 #6 |

### 9-3. 다음 절차

1. **Jaison 5차 재검토(v5 반영 확인)** → 2. **B-381 7차 설계 확정(PR #1462, 선행)** → 3. **JSJung 최종 확정(①②③, ④는 비차단·⑤ 완료)** → 4. **Aiden 설계 확정** → 5. 구현 착수.
2. 이슈 `status:draft`, PR draft 유지. 확정 전까지 정책·함수·코드 변경 없음.
3. 구현 시 순서(§6)와 **#1475는 B-382 함수 적용 후 병합** 의존을 준수.

---

## [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-B-168 | `rejectInvoice`의 원가-인보이스 연결 해제가 트리거에 막혀 조용히 실패 | Medium | `.agent/defects/DEF-B-168_rejectInvoice_원가연결해제_조용한실패.md` |
| DEF-B-171 | 청구서 조회 가시성이 발행 조직 기준으로 결정되어 역할과 무관(OPERATOR도 플랫폼 발행분 조회) — **확정: (b) 의도하지 않은 노출, 후속 #1475(TASK-B-383, Mike)** | Low~Medium | `.agent/defects/DEF-B-171_청구서조회_발행조직기반_역할무관.md` |

- DEF-B-168: ADMIN 세션 실측에서 연결 해제 UPDATE가 트리거에 실패, 호출부가 오류를 확인하지 않아 조용히 실패(R-18 — 본 Task에서 수정 금지). **UPS 제거 후에도 비UPS `rejectInvoice` 경로에 남습니다**(§4-3 #3).
- DEF-B-171: 조회 범위에 한정, 쓰기는 역할 목록으로 제한됨. JSJung이 **(b) 의도하지 않은 노출**로 확정, 후속 **#1475(TASK-B-383, Mike)**. 본 Task에서는 정책 변경 없음.
- 번호 채번: 열린 PR 브랜치 합산 — PR #1454(165·166), PR #1462(167·169·170), 본 PR(168) → 신규는 **171**(JSJung 분담: Baker 168 / Dave 169+).

---

## 10. [작업 결과] (설계 의견 수정본 범위)

- 코드/정책/함수 변경 **없음**. 마이그레이션·서버 액션·테스트 파일 미추가(DEF 보고서만 추가). `Closes` 미사용(`Refs #1463`).
- 실측 근거: 최초 로그인 세션 SELECT + JWT 주입 롤백 DML, **청구서 픽스처 실측(잔여 0건)**, **ADMIN 트리거 실측(ROLLBACK)**, `pg_policies` 카탈로그, `checkPermission` 직접 실행. v3: 호출 클라이언트 유형 열거(세션 vs admin client). v4: `zen_order_costs` DELETE 경로 코드 대조(`ups-actual-cost.ts` L408 `invoice_id: inv.id`). **v5: UPS 제거 대상 호출 그래프 대조**(`createPostFinalizationAdjustment` → `createAdjustmentInvoice`/`linkAdjustmentCosts`, `InvoiceGenerator`의 admin client 우회, `finalize_ups_settlement_run`의 SECURITY DEFINER 역할 검사).
- 미확인 항목: 브라우저 클릭 미실행, 빈 테이블 판정 불가, SUPER_ADMIN 세션 미측정, 변경 후 매트릭스는 예측 — §0·§2 명시.
- 검토 반영: Jaison 1차 5 + 2차 5 + 3차 4 + 4차 1 + **5차 6** / JSJung 1차 5 + 후속 3 + 컷오버 전 현행 유지·DEF 분담 2 + #1475 결정 2 + **16:08 영향 공지** / #1462 7차 / Aiden 4건 — §0-1 대조표 참조.
- 라벨 `status:draft` 유지. 검증: Jaison / 최종 확정: JSJung → Aiden.
- **v5 커밋 해시: `32d01d742`** (본 해시 기재는 2차 커밋 — 정책·코드 변경 없음)
