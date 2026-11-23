# TASK-B-382 — Issue #1463: MANAGER의 UPS 정산마감 관련 테이블 RLS 정책 정렬 (설계 의견)

| 항목 | 내용 |
|:----|:-----|
| **Issue** | [#1463](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1463) |
| **담당(Worker)** | Baker (Team B) |
| **검증(Auditor)** | Jaison |
| **설계 확정** | **JSJung** (본 문서는 확정 요청용 의견 — 구현 없음) |
| **상태** | 📝 설계 의견 **수정본 v4** (`status:draft`) — Jaison 4차 검토(DELETE 근거 정정·6개 기준안 제안) + JSJung ⑤ 확정((b)·후속 #1475) 반영. 재검토·최종 확정(①~④, ②는 신규 결정 항목) 전까지 정책·함수·코드 변경 금지 |
| **브랜치** | `feature/teamb-task-b382-iss1463-manager-rls-design` (base `origin/TeamB_Dev` @ `83bb486f1`) |
| **연관** | DEF-B-166(b), DEF-B-168, **DEF-B-171**(확정: (b) / 후속 #1475), TASK-B-381(#1459), TASK-B-377(#1451 / A), TASK-B-379(#1453), **#1475(TASK-B-383, Mike)** |
| **공개 저장소 주의** | 아래 표는 **허용/거부 결과만** 기록합니다. 노출 경위·재현 절차 세부는 기재하지 않습니다. |
| **개정 이력** | `54ddba60a` 최초 → `6f400bf0d` 1차 → `e6b10c6e9` 2차 → `6d857341f` 3차 → 본 개정: Jaison 4차 검토(`12:10`) + JSJung #1475 결정(`12:17`) 반영 |

---

## 0. 범위 · 방법론 (코드 열거와 실측의 구분)

| 구분 | 방법 | 범위 |
|:--|:--|:--|
| **코드 열거** | 서버 액션 본문과 호출 헬퍼의 `from()/insert()/update()/delete()/rpc()` 전수 확인 | 테이블×동작(§1) / 영향 범위(§4-3) / 경로별 근거(§4-1-2) |
| **세션 실측 (SELECT)** | 표준 계정으로 **실제 로그인** 후 사용자 Bearer 토큰으로 가시 행 수 측정 | §2 표 |
| **세션 실측 (DML)** | JWT 클레임을 `authenticated` 롤 트랜잭션에 주입해 DML을 **매 트랜잭션 ROLLBACK**으로 측정 | §3 표 |
| **픽스처 실측 (청구서)** | 헤더 2건(플랫폼 발행 / 대리점 발행) + 항목 2건을 **로컬 트랜잭션 내에서만** 적재(`session_replication_role=replica`, ROLLBACK)해 역할별 가시성 측정 | §2-1, §7-1 |
| **트리거 실측** | ADMIN 세션으로 연결된 원가 행의 `invoice_id` 해제 UPDATE 실행 → ROLLBACK | §4-3 #3, DEF-B-168 |
| **정책 카탈로그** | `pg_policies` / `pg_constraint` / `information_schema.columns` 조회(읽기 전용) | §2·§4·§6·§7 |
| **미측정(명시)** | 서버 액션 자체의 브라우저 클릭 실행은 하지 않음. 빈 테이블(0행)은 RLS 판정 불가 → 카탈로그로만 판정. `ZENITH_SUPER_ADMIN` 임시 계정은 정리되어 세션 실측에서는 제외(정책 정의로 추론) | §2 각주 |

- 측정 후 잔여 확인: 청구서 픽스처 0건, 프로브 행 0건(모든 프로브 ROLLBACK + 사후 정합 확인).

### 0-1. 본 개정 반영 대조표

| 출처 | 요청 | 반영 위치 |
|:--|:--|:--|
| Jaison 1차 보완 5건 | 공개 기재 삭제 / 영향 범위 표 / 스냅샷 원인 / 무결성 위험 / SUB_ADMIN | §2·§4-3·§6·§7·§9 (1차 수정분 유지) |
| JSJung 1차 결정 5건 | 방식 B·정책 8개(이후 7개 → 현재 6개/7개 결정 대기)·가드 로컬 허용·SUB_ADMIN 제외·스냅샷 소관 | §9-1 (단, #8은 아래 후속 결정으로 변경) |
| Aiden 모순 4건 | B-381 충돌 / 최소집합 / 스냅샷 의존 / 조정 경로 종속 | §4-1-1·§4-1-2·§6 |
| Jaison 2차 보완 1 | 청구서 가시성 픽스처 실측 + 헤더 정책 사실 + 무결성 위험 구분 | §2-1, §7-1 |
| Jaison 2차 보완 2 | `rejectInvoice` 예측 정정 + ADMIN 실측 + DEF 등록(DEF-B-168) | §4-3 #3, `[발견 이슈]`, DEF 파일 |
| Jaison 2차 보완 3 | 컷오버 결정 반영 — 영향 표에 열 추가, 인보이스 정책 근거 2분류 | §4-3, §4-1-3 |
| Jaison 2차 보완 4 | 순서 충돌 해소안(설계 순서 / 구현 순서 분리) | §6, §9-2 ③ |
| Jaison 2차 보완 5 | 가드 거부 함수 명시 + UPDATE·DELETE 경로별 근거 표 | §4-3 주석, §4-1-2 |
| JSJung 후속 결정 A | "MANAGER=admin"은 **청구서관리 전체를 포함하지 않음** — 헤더 정책 변경 없음 | §7-2, §9-1 #6 |
| JSJung 후속 결정 B | 정책 #8을 **(b) 존재 확인 전용 SECURITY DEFINER 함수**로 확정 → 당시 MANAGER 정책 **7개**(이후 정책 수는 §9-2 ② 최종 결정 대기) | §4-1, §7-1, §8, §9-1 #7 |
| JSJung 후속 결정 C | 컷오버: 레거시 청구서 기능을 신규 청구서관리로 대체(컷오버일 미정, 기존 UPS 인보이스 보존) | §4-1-3, §4-3 |
| Jaison 3차 보완 1 | 컷오버 전 현행 유지 반영 + `invoice_id IS NULL` 행 기준 UPDATE·DELETE 정밀 산정 + 근거 없는 명령 제외 안 비교 | §4-1-2 |
| Jaison 3차 보완 2 | 존재 확인 함수 fail-closed(비허용 역할 예외·RPC 오류 시 해제 차단), DRAFT 포함 여부, 깨진 문자 정정 | §7-1 1·2·5번 |
| Jaison 3차 보완 3 | 청구서 조회 권한이 발행 조직 기준(역할 무관) → **DEF-B-171** 등록, 정책 변경 없음 | §2-1, §9-2 ⑤, DEF 파일 |
| Jaison 3차 보완 4 | §9-2 갱신 — ①③④ 유지, ⑤ 신규(청구서 조회 범위 의도 확인) | §9-2 |
| JSJung 컷오버 전 결정 | 컷오버 전 오더 정산마감 **현행 유지**(B-381 LEGACY 개편 제외) → legacy 경로 근거 유지 | §4-1-2, §9-1 #9 |
| JSJung DEF 분담 | Baker 168 / Dave 169+ → 본 검토 신규 DEF는 **171** | DEF-B-171 |
| Jaison 4차 보완 1 | `UPS_ACTUAL_COST_ADJ` INSERT가 `invoice_id: inv.id` 포함 → 세션 클라이언트 DELETE 근거 없음. §4-1-2 표·결론 정정, **6개(DELETE 제외) 기준안 제안**, 7개 vs 6개를 결정 항목으로 상정 | §4-1·§4-1-2·§9-2 ② |
| JSJung #1475 결정 | ⑤ **확정: (b) 의도하지 않은 노출**, 후속 **#1475(TASK-B-383, Mike)**. B-382는 청구서 조회 정책 변경 없음 | §2-1·§6·§7-1·§9-1 #11·DEF-B-171 |
| JSJung #1475 의존 | B-382 존재 확인 함수를 `unmarkOrderCostSettled`에 적용한 뒤 #1475 병합, 테스트는 #1475 전/후 양쪽 상태 검증 | §5·§6·§7-1 5번 |

---

## 1. 정산마감 경로 테이블×동작 전수표 (코드 열거)

| 함수 | SELECT | INSERT/UPSERT | UPDATE | DELETE |
|:--|:--|:--|:--|:--|
| `recordUpsActualCost` (ups-actual-cost.ts:202) | `zen_orders`(중첩 스냅샷 metadata 포함), `zen_ups_actual_cost`, `zen_invoices`, `zen_order_costs`, `zen_exchange_rates`(간접), 상태이력(간접) | `zen_ups_actual_cost`, `zen_order_costs` | `zen_ups_actual_cost`, `zen_invoices`(total_amount·metadata) | `zen_order_costs`(UPS_ACTUAL_COST_ADJ 멱등 재생성) |
| `recordActualCostAndFinalize` (:546) | `zen_orders`, `zen_ups_actual_cost`, `zen_invoices`, 환율(간접) → `finalizeInvoice` 경로 전체 | `zen_ups_actual_cost`, 부가운임 테이블 | `zen_ups_actual_cost` | 부가운임 테이블(삭제 후 재삽입) |
| `finalizeInvoice` (settlement.ts:141) | 인보이스(lookup), 원가(합계), 오더(권한), 조직·프로필(알림 간접) | 감사 이력 기록 | 인보이스(finalize) | — |
| `createPostFinalizationAdjustment` (:558) | 원 인보이스, 오더, 원가 | 조정 인보이스, 감사 이력, 원가 | 인보이스, 원가(`invoice_id` 연결) | — |
| `markOrderCostSettled` (:838) | 오더, 실비, 인보이스, 상태이력(간접) | — | 오더(`cost_settlement_status` 등) | — |
| `unmarkOrderCostSettled` (:910) | 오더, **청구서 항목(존재 확인 → §7-1 함수로 교체 예정)** | — | 오더(되돌림) | — |

- `recordUpsActualCost`는 인보이스 마감 상태에 따라 `createPostFinalizationAdjustment`를 **동적 import**로 호출(349·389행) → 두 함수의 권한 경로가 동일해야 함.
- `recordActualCostAndFinalize`는 실비 저장 후 `finalizeInvoice`를 호출(680행). 인보이스 마감 실패 시 실비 저장은 롤백되지 않음(기존 동작, 범위 외).

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

**사실 정정**: "MANAGER가 청구서 항목을 0행으로 본다"는 일부만 맞습니다. `bsi_select`의 **발행 조직 분기** 때문에 MANAGER(플랫폼 조직 소속)는 **플랫폼이 발행한 청구서 항목을 볼 수 있습니다.** 안 보이는 것은 **대리점이 발행한 청구서(감독 대상)** 입니다. 헤더도 동일합니다(`bill_stmt_select_supervise`는 `role IN ('ADMIN','ZENITH_SUPER_ADMIN')` + 발행사 AGENCY 한정 → MANAGER 제외, `pg_policies`·마이그레이션 확인). 따라서 무결성 위험은 **대리점 발행 청구서에 포함된 오더**에서 발생합니다(§7-1).
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

`zen_role_permissions`에 MANAGER의 `/admin` 행 없음(`/admin/ups-actual-charges`만 있음). `createPostFinalizationAdjustment`는 `validateAdminAction()` 사용(563행) → 결정 #2로 이 함수에만 로컬 역할 목록 적용(전역 변경 금지). B-381 ① 경로도 이 결정에 종속(§9-1 #2·§9-2 ①).

---

## 4. MANAGER 정책 집합 · 근거 · 영향 범위

### 4-1. 정책 집합 — **기준안 6개(DELETE 제외) / 기존 승인 7개** — 최종 결정 대기

> JSJung이 이전에 승인한 **7개(인보이스 3 + 원가 4)**는 유효한 기준선입니다. Jaison 4차 검토에서 원가 DELETE(#7)의 세션 클라이언트 근거가 없음이 확인되어 **6개(인보이스 3 + 원가 3)**를 기준안으로 제안했습니다. 어느 쪽도 임의로 적용하지 않고 **§9-2 ②에서 JSJung 최종 결정을 기다립니다.**

| # | 테이블 | 명령 | 조건 | 근거 |
|:-:|:--|:--|:--|:--|
| 1~3 | `zen_invoices` | SELECT, INSERT, UPDATE | `EXISTS (SELECT 1 FROM zen_profiles p WHERE p.id = auth.uid() AND p.role = 'MANAGER')` | §4-1-3 참조(컷오버 전/후 분류) |
| 4~6 | `zen_order_costs` | SELECT, INSERT, UPDATE | 동일 | §4-1-2 정밀 산정(DELETE 제외 기준안). UPDATE는 B-381 확정 시 재산정 |
| (7) | `zen_order_costs` | DELETE | 동일 | **기존 승인 7개 안에만 포함** — 세션 클라이언트 근거 없음(§4-1-2). JSJung 결정 전까지 미적용 |

- **`zen_billing_statement_items` MANAGER SELECT 정책은 추가하지 않습니다.** 1차 승인안 #8은 JSJung 후속 결정으로 **존재 확인 전용 SECURITY DEFINER 함수**(§7-1)로 대체됩니다.
- `zen_billing_statements`(헤더) 정책은 **변경 없음**(JSJung 후속 결정 A).
- `zen_orders`·`zen_ups_actual_*`·`zen_exchange_rates`·상태이력은 기존 정책으로 MANAGER 허용. AGENCY·SHIPPER·OPERATOR 정책 일체 변경 없음. SUB_ADMIN 추가·삭제 없음.

#### 4-1-1. "최소 집합" vs ADMIN 동등 권한 (Aiden 모순 2)

| 비교안 | 구성 | 결과 | 한계 |
|:--|:--|:--|:--|
| **기존 승인안(7개)** / **제안 기준안(6개)** | 2개 테이블에 역할만 확인 | MANAGER가 ADMIN과 동등한 행 단위 전권 | "최소" 표현과 불일치 → §9-2 ①에서 의도 확인. 정책 수는 §9-2 ② 별도 결정 |
| 축소안(예) | 인보이스 SELECT·UPDATE, 원가 SELECT | 마감·조회만 가능 | `generateInvoicesForOrder`·`addManualOrderCost`·조정 인보이스 발행이 실패 → 앱 가드와 충돌 |
| 기술 제약 | — | RLS는 **행 단위**만 제어(컬럼 단위는 별도 GRANT/뷰) | "마감 컬럼만 UPDATE"는 정책으로 불가 |

→ "최소 집합"은 **"앱 가드가 MANAGER를 허용한 경로를 RLS가 막지 않는 최소 정책"**으로 재정의. ADMIN 동등 전권이 의도인지는 §9-2 ① 확정 사항.

#### 4-1-2. `zen_order_costs` SELECT·INSERT·UPDATE 근거와 DELETE 제외 판정 (Jaison 3차 보완 1 + 4차 보완 1)

**전제(유지)**: v2의 "B-381 확정 시 DELETE 근거 소멸"은 철회합니다. JSJung이 **컷오버 전 오더의 정산마감은 현행 유지**(B-381 LEGACY 개편 제외, 11:48 결정)로 확정했으므로 `recordUpsActualCost`·`linkAdjustmentCosts` 등 legacy 경로는 그대로 쓰입니다.

**핵심 제약**: `trg_prevent_cost_change_after_invoice`가 `OLD.invoice_id IS NOT NULL`인 행의 UPDATE·DELETE를 차단합니다. UPDATE의 실효 대상은 **`invoice_id IS NULL` 행뿐**입니다(v3의 "DELETE도 NULL 행 대상" 분류는 Jaison 4차 지적으로 아래와 같이 정정).

| 명령 | 대상 행 | 호출 경로 | 클라이언트 | RLS | 필요성 |
|:--|:--|:--|:--|:--:|:--|
| SELECT | 전체 | `finalizeInvoice` 합계, `addManualOrderCost` 선행 확인(settlement.ts:519-525), `calcAdjustmentTotal`, 실비 재계산 | 세션 | 적용 | **필수** |
| INSERT | 신규 | `addManualOrderCost`(연결 행 있으면 거부 후 `invoice_id` 없이 INSERT, L534), `recordUpsActualCost` 델타 비용(ups-actual-cost.ts:408) | 세션 | 적용 | **필수** |
| UPDATE | `invoice_id IS NULL` | `linkAdjustmentCosts`(settlement.ts:619-621)의 `UPS_ACTUAL_ADJUSTMENT` 행 `invoice_id` 연결 | 세션 | 적용 | **필수** |
| UPDATE | `invoice_id IS NOT NULL` | `rejectInvoice`(settlement.ts:670-671)의 연결 해제 | 세션 | 적용 | **근거 없음** — 트리거 차단(DEF-B-168) |
| DELETE | `invoice_id IS NOT NULL` | `recordUpsActualCost`(ups-actual-cost.ts:401-405)의 `UPS_ACTUAL_COST_ADJ` 멱등 재생성 | 세션 | 적용 | **근거 없음 — Jaison 4차 정정**: INSERT가 `invoice_id: inv.id`를 함께 넣어(L408) 행은 **생성 즉시 연결된 행**. 정책 유무와 무관하게 트리거가 막고, 호출부가 오류를 확인하지 않아 무시(DEF-B-167 (a)와 동일 사실) |
| DELETE | `UPS_ACTUAL_ADJUSTMENT` | `recordUpsActualCharges`(ups-actual-charges.ts:148)의 델타 정리 | **admin client** | 미적용 | **정책 불필요** — RLS 우회 |
| UPDATE·DELETE | (전체) | `recordUpsActualCharges`(ups-actual-charges.ts:148·174·226, L43 admin client), `lib/finance/settlement/settlement.ts`(L83·224·330), `invoice-generator.ts`(L111) | **admin client** | **미적용** | **정책 불필요** — RLS 우회 |

**Jaison 4차 정정 요지**: `UPS_ACTUAL_COST_ADJ`는 `invoice_id IS NULL` 상태로 만들어지는 행이 아닙니다(INSERT 시 `inv.id` 연결). 따라서 "NULL 행 DELETE가 MANAGER에서 필요하다"는 v3의 분류는 틀렸고, **DELETE 정책이 의미 있는 세션 클라이언트 경로는 코드에 없습니다.** 정책이 없으면 RLS가 0행으로 걸러 조용히 무시되고, 정책이 있으면 트리거 예외가 나지만 호출부가 무시하므로 결과는 같습니다. "DELETE 제외 시 잔여 행·중복 합산 회귀"는 이미 동작하지 않는 경로이므로 **회귀가 아닙니다**(DEF-B-167).

| 안 | 구성 | 결과 | 판단 |
|:--|:--|:--|:--|
| **기준안: DELETE 제외 (Jaison 권고)** | 원가 3개(SELECT·INSERT·UPDATE) — 총 **6개** | DELETE는 정책 없이도 트리거가 차단하므로 결과 동일 | **제안** — §9-2 ②에서 JSJung 최종 결정 대기 |
| 기존 승인안: DELETE 유지 | 원가 4개(SELECT·INSERT·UPDATE·DELETE) — 총 **7개** | 동일한 결과, 정책 1개만 추가 | **유효한 기존 기준선** — JSJung이 7개로 결정하면 그대로 구현 |
| 대안: UPDATE 제외 | 원가 2개 | `linkAdjustmentCosts`의 `invoice_id` 연결 실패 → 조정 인보이스 연결 누락 | **미채택** (단, B-381 확정 시 재산정 대상) |

**산정 결론**: **DELETE 근거는 없음**이 코드로 확인되었습니다. 다만 7개(원가 4개)는 JSJung이 이미 승인한 구성이므로 임의로 줄이지 않고, **6개(DELETE 제외)를 Jaison 권고 기준안으로 올려 §9-2 ②에서 최종 결정**을 받습니다. UPDATE의 실효 대상은 `invoice_id IS NULL`이며 세션 클라이언트 근거는 `linkAdjustmentCosts`(UPDATE)·`addManualOrderCost`(INSERT·SELECT)뿐입니다. admin client 경로는 RLS를 우회하므로 정책 근거에서 제외했습니다. **B-381 확정 시 UPDATE(#6)만 재산정**(연결을 INSERT 시점으로 이전하면 불필요). `rejectInvoice` UPDATE는 근거 없음(DEF-B-168).

#### 4-1-3. `zen_invoices` 3개 정책 근거 — 컷오버 전/후 분류 (JSJung 결정 C)

컷오버일 미정, **기존 UPS 인보이스는 보존**. 따라서 두 시기의 경로를 함께 다뤄야 합니다.

| 명령 | 컷오버 이후에도 필요한 경로 | 컷오버 전 레거시 인보이스 처리 경로 |
|:--|:--|:--|
| SELECT | 조정 인보이스 원본 조회(legacy 인보이스에 대한 후속 조정), 결제상태 조회 | `finalizeInvoice` lookup, `getShipperDailyBillingSummary`, `generateInvoicesForOrder` 마감 확인 |
| INSERT | 레거시 인보이스에 대한 **마감 후 조정 인보이스 발행**(`createAdjustmentInvoice`) | `generateInvoicesForOrder` 신규 인보이스 생성, `rejectInvoice` 재발행 |
| UPDATE | 레거시 인보이스 조정 금액 반영(`recordUpsActualCost`) | `finalizeInvoice` finalize, `updatePaymentStatus` 결제상태·금액 |

→ 컷오버 이후 신규 오더는 `zen_billing_statements`로 이동하므로 **신규 인보이스 생성 경로는 축소**되지만, **보존된 레거시 인보이스의 조정·결제 경로는 정책 3개가 계속 필요**합니다. 컷오버일 확정 후 최종 경로 구분을 재확인합니다.

#### 4-1-4. ADMIN 동등 전권 비교 (Aiden 모순 2) — 요약

역할만 확인하는 정책은 ADMIN과 같은 전권입니다. "MANAGER=admin" 규칙을 **정산마감 인접 경로 전체**에 적용하는지 §9-2 ①에서 확인합니다. 단, 아래 두 함수는 정책과 무관하게 **가드에서 계속 거부**됩니다(Jaison 보완 5):
- `getRevenueReport` (`settlement.ts:419`, `validateAdminAction()`)
- `getCostReport` (`settlement.ts:444`, `validateAdminAction()`)

### 4-2. 방식 비교·권장안

| 항목 | A. 기존 ADMIN 정책에 MANAGER 추가 | B. MANAGER 전용 신설 (**승인**) |
|:--|:--|:--|
| ADMIN·SUPER_ADMIN 영향 | 즉시 영향 가능 | **없음**(정책 OR 결합) |
| 되돌리기 | 원문 복원 필요 | 신규 **6건 DROP**(기준안) / 기존 승인 7건은 DELETE DROP 1문 추가 |
| 동시 변경 충돌 | B-375/B-379와 같은 객체 충돌 위험 | 없음 |
| 정책 수 | 적음 | **6개 증가(기준안)** / 기존 승인 7개는 JSJung 결정 대기 |

**B(MANAGER 전용 신설)** 유지. INSERT는 `WITH CHECK`, UPDATE는 `USING + WITH CHECK` 동일 조건. 최종 정책 수는 §9-2 ② 결정 따름.

### 4-3. 영향 범위(Blast Radius) — MANAGER에게 새로 열리는 경로 (Jaison 보완 2 + 3)

| # | 서버 액션 (위치) | 앱 가드 | 동작 | 변경 전 | 변경 후(예측) | 컷오버 이후에도 쓰이나? |
|:-:|:--|:--|:--|:--|:--|:--|
| 1 | `generateInvoicesForOrder` (settlement.ts:15, L19) | `adminRoles` | 인보이스 SELECT + 인보이스/원가 INSERT | 생성 차단 | 정상 생성 | **아니오** — 청구서관리로 대체 |
| 2 | `finalizeInvoice` (settlement.ts:141, L80) | `assertFinalizePermission` | 인보이스 SELECT/UPDATE + 원가 합계 | 실패 | 정상 마감 | 레거시만 |
| 3 | `rejectInvoice` (settlement.ts:633, L80) | `assertFinalizePermission` | 인보이스 SELECT/UPDATE + 원가 연결 해제 + 재발행 | 실패 | **취소 성공, 원가 연결 해제는 실패(DEF-B-168)** | 레거시만 |
| 4 | `updatePaymentStatus` (settlement.ts:213, L222) | `adminRoles` | 인보이스 SELECT/UPDATE(결제상태·금액) | 실패 | 정상(정산 외 경로) | 레거시만 |
| 5 | `calculateSettlementAction` (settlement.ts:287, L292) | `adminRoles` | 인보이스·원가 집계 SELECT | 0행 | 정상 집계 | 레거시만 |
| 6 | `addManualOrderCost` (settlement.ts:478, L493) | `adminRoles` | 원가 SELECT + INSERT | 실패 | 정상 등록 | **예** — 원가는 여전히 사용 |
| 7 | `createPostFinalizationAdjustment` (settlement.ts:558) | `validateAdminAction` → 결정 #2 | 조정 인보이스 SELECT/INSERT/UPDATE + 원가 UPDATE | 가드+RLS 차단 | 가드 변경 + RLS로 정상 | 레거시 인보이스 조정 |
| 8 | `getShipperDailyBillingSummary` (daily-billing.ts:110, L131) | `adminRoles` | 인보이스 SELECT(`ADMIN_TO_*`) | 0행 | 정상 조회 | 레거시만 |
| 9 | `finalizeDailyShipperInvoices` (daily-billing.ts:434, L442) | `adminRoles` | `finalizeInvoice` 일괄 | 전건 실패 | 정상 일괄 | 레거시만 |
| 10 | `recordUpsActualCharges` (ups-actual-charges.ts:27, L18) | `assertAdminOnly` | 인보이스 SELECT/UPDATE + 원가 SELECT/INSERT/UPDATE | 실패 | 정상 | 원가 경로는 예, 인보이스는 레거시 |
| 11 | `unmarkOrderCostSettled` (ups-actual-cost.ts:910, L103) | `assertAdmin`(MANAGER 포함) | **존재 확인 함수**(§7-1) + 오더 UPDATE | 대리점 발행 청구서 포함 오더를 해제하는 무결성 위험 | 함수가 포함 여부 반환 → 거부 | **예** |

- §1의 6개 함수도 동일하게 해제(중복 기재 생략).
- `getRevenueReport`·`getCostReport`는 `validateAdminAction()`으로 **정책과 무관하게 MANAGER 거부 유지**(§4-1-4).
- **의도 확인**: 11개 경로 전체에 ADMIN 동등 전권을 주는지(§9-2 ① — Jaison 승인, JSJung 확정 대기). 컷오버 이후 불필요 경로는 위 열로 표시.

---

## 5. 권한 확대 경계 검증 계획 (구현 시)

- **양성 대조**: 최종 채택 정책(기준안 6개 / 기존 승인 7개) 대상에서 MANAGER `X → O` 실측. **정산 외 경로 2개**(`updatePaymentStatus`, `getShipperDailyBillingSummary`) 정상 동작 확인.
- **음성 대조(고정)**: AGENCY·SHIPPER·OPERATOR의 §2·§3 값 전후 동일. ADMIN·SUPER_ADMIN 셀도 불변(정책 B).
- **되돌리기 실측**: 신규 정책(6건 또는 7건) DROP 후 MANAGER `X` 복귀 확인(프로브 `afterAll` 원복).
- **서버 액션 연결**: §4-3 11개 경로 중 정산마감 6개 + 정산 외 2개 우선 확인, `createPostFinalizationAdjustment`는 결정 #2 반영 여부.
- **청구서 존재 확인 함수 테스트**: §7-1 5번 항목의 양성/음성 대조 + 되돌리기 실측. **#1475 적용 전/후 양쪽 상태 모두**에서 "MANAGER가 플랫폼 발행·대리점 발행 양쪽 포함 오더의 정산 해제를 거부"하는지 검증(§6 의존).
- **DEF-B-168 확인**: `rejectInvoice` 원가 연결 해제 실패가 수정 Task에서 해결됐는지 확인(본 Task에서는 수정 금지).
- 별도 보안 검토 항목 1건을 JSJung에게 직접 보고.

| 셀 | 변경 전(실측) | 변경 후(예측 — 승인 후 재측정) |
|:--|:--|:--|
| MANAGER / `zen_invoices` SELECT·INSERT·UPDATE | X | O |
| MANAGER / `zen_order_costs` SELECT·INSERT·UPDATE (DELETE는 §9-2 ② 결정 대기) | X | O |
| MANAGER / 청구서 항목 직접 SELECT | 플랫폼 발행 O / 대리점 발행 X | **동일(정책 추가 없음)** |
| MANAGER / 존재 확인 함수 호출 | (함수 없음) | 포함 오더 `true`, 미포함 `false` |
| AGENCY·SHIPPER·OPERATOR 전체 | §2·§3·§2-1 그대로 | 동일(예측) |
| ADMIN·SUPER_ADMIN 전체 | §2·§3 그대로 | 동일(예측) |

---

## 6. TASK-B-379(#1453)와의 경계 · 순서 충돌 해소안

- 스냅샷 정책 `Super admins have full access to order snapshots`가 `role = 'ADMIN'`만 체크 → `ZENITH_SUPER_ADMIN`·MANAGER 제외. Jaison이 #1453에 전달 완료. **본 Task는 스냅샷 정책을 변경하지 않음.**
- `recomputeRevenue`(ups-actual-cost.ts:140~)는 `actualWeightKg ?? snapshot.platform.chargeableWeightKg`, `platformBase = snapshot.platform.totalSellingPrice` 사용 → MANAGER의 `snapshot: null`은 **0 폴백**으로 재계산 결과를 달리할 수 있음(식 확인, 영향 추정). B-381 규칙 2 `p_freight_target`도 이 경로 → #1453의 MANAGER 스냅샷 SELECT 결정은 B-381·B-382의 선행 의존.
- B-381 append-only + DEFINER RPC 확정 여부는 원가 **UPDATE(#6)** 필요성만 좌우합니다. **DELETE(#7)는 세션 클라이언트 근거가 없어 기준안에서 제외**(§4-1-2) — 최종 수는 §9-2 ②.
- **#1475(TASK-B-383) 의존(JSJung 12:17 결정)**: B-382의 존재 확인 전용 함수를 `unmarkOrderCostSettled`에 적용한 **뒤에** #1475를 병합합니다. #1475 적용 시 MANAGER에게 플랫폼 발행 청구서 항목이 0행으로 보여, 함수가 없으면 정산 해제가 허용될 수 있으므로 함수 선행이 무결성 보호의 전제입니다. 테스트는 **#1475 적용 전/후 양쪽 상태**를 모두 검증합니다(§5·§7-1 5번).

### 순서 충돌 해소안 (Jaison 제안 — 결정은 JSJung)

| 구분 | 순서 | 근거 |
|:--|:--|:--|
| **설계 확정 순서** | **B-381 → B-382** | B-382 정책 집합이 B-381의 append-only/RPC 설계에 의존(§4-1-2) |
| **구현 순서** | **B-382 ∥ B-379 (병렬, 대상 테이블·마이그레이션 timestamp가 겹치지 않게 B-382 선행) → B-381 마지막** | MANAGER 스냅샷 SELECT가 필요한 재계산 경로(B-379)와 정책(B-382)이 모두 선행된 뒤 B-381 구현 |
| Aiden 권장 `B-379 → B-381 → B-382` | 위 구현 순서에서 충족 | "B-379가 B-381의 선행" 반영 |
| JSJung 확정 `B-382 선행` | 마이그레이션 번호 순서에서 충족 | 정책 객체·timestamp 충돌 회피 |

→ 두 축은 양립합니다. 기준안은 위 분리안으로 적되, **최종 결정은 JSJung**(§9-2 ③). 임의로 순서를 바꾸지 않습니다.

---

## 7. 청구서 관련 결정 · 무결성 보호 설계

### 7-1. 정책 #8 대체: 존재 확인 전용 SECURITY DEFINER 함수 (JSJung 후속 결정 B)

**사실(§2-1 실측)**: MANAGER는 플랫폼 발행 청구서 항목을 **볼 수 있고**, 대리점 발행 청구서 항목은 **0행**입니다. `unmarkOrderCostSettled`(ups-actual-cost.ts:925~935)는 항목 SELECT로 "포함 여부"를 확인하므로, **대리점 발행 청구서에 포함된 오더를 MANAGER가 정산 해제할 수 있는 무결성 위험**이 남습니다. 헤더 정책(`bill_stmt_select_supervise` 등)에도 MANAGER가 없어(JSJung 결정 A) 항목 데이터 접근 권한을 새로 주는 것은 결정과 어긋납니다.

→ **선택안 (b)**: MANAGER에게 청구서 항목 SELECT 권한을 주지 않고, **포함 여부만 boolean으로 반환하는 함수**를 사용합니다.

| 안 | 무결성 | 변경 파일 | 되돌리기 | 규칙 1 정합 |
|:--|:--|:--|:--|:--|
| (a) #8 SELECT 정책 유지 | 보장 | 마이그레이션 1 | DROP POLICY | 항목 데이터 읽힘 → 후속 결정과 충돌 |
| **(b) 존재 확인 함수 (확정)** | 보장 | 마이그레이션 1 + 앱 1 | DROP FUNCTION + 앱 롤백 | **데이터 미노출, 정산 해제 보호만 수행** |
| (c) MANAGER 해제 차단 | 보장 | 앱 1 | 앱 롤백 | 규칙 1의 "정산마감 MANAGER 허용"과 충돌 |

- **후속 #1475 의존**: #1475가 청구서 조회 정책을 정렬하면 MANAGER에게 플랫폼 발행 항목이 0행이 되어, 함수가 없으면 정산 해제가 허용될 수 있습니다. 따라서 **본 함수를 `unmarkOrderCostSettled`에 먼저 적용한 뒤 #1475를 병합**합니다(§6). 청구서 조회 정책 자체는 B-382에서 변경하지 않습니다(JSJung 결정).

**함수 설계 요구사항 (JSJung 지시 7개 항목 반영)**

1. **시그니처·반환**: `public.zen_billing_statement_order_included(p_order_id uuid) RETURNS boolean`. 오더별 boolean만 반환. 청구서 번호·금액·상태·발행 조직 등 **다른 정보는 반환하지 않음**. **청구서 상태(DRAFT/ISSUED/CLOSED)와 무관하게 "포함 여부"만 확인** — 기존 확인이 DRAFT 포함 오더도 차단했으므로(#1445 A5) 의미를 보존합니다. (필요 시 배열 오버로드 검토 — 본 설계는 단일 오더 기준.)
2. **보안(#1449 B / B-381 RPC 동일 기준 / fail-closed)**: `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`; `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`(세션 클라이언트 호출용) 후 **함수 내부에서 `auth.uid()`로 역할 검사**(ADMIN·MANAGER·ZENITH_SUPER_ADMIN만 허용). **비허용 역할은 반드시 예외(`RAISE`)로 거부** — `false`를 반환하면 호출부가 "청구서에 포함 안 됨"으로 읽어 정산 해제를 허용하는 무결성 위험이 있으므로 금지. 앱도 **RPC 오류 시 해제를 차단(fail-closed)**하도록 구현. **actor를 파라미터로 받지 않음**; 앱은 **세션 클라이언트**로 호출(admin client 금지). AGENCY·SHIPPER·OPERATOR·anon의 직접 호출은 예외로 거부되고 포함 여부 열거도 불가. (v2의 깨진 문자 "호출用小" 정정 반영.)
3. **오더 범위 제한 검토**: 호출자가 임의 오더 id로 포함 여부를 알아낼 가능성은 **허용 역할이 관리자 3역할뿐**이고 반환값이 boolean 하나라 영향이 낮음 — 근거로 기재. (차단이 필요하면 오더 조직 범위 조건을 함수에 추가하는 옵션을 둔다.)
4. **앱 변경**: `unmarkOrderCostSettled`의 항목 SELECT(925~935행)를 `supabase.rpc('zen_billing_statement_order_included', { p_order_id: orderId })`로 교체. **ADMIN·SUPER_ADMIN의 기존 동작 불변** 검증(포함 오더 해제 거부 유지, 미포함 오더 해제 허용).
5. **테스트(양성/음성 대조)**: MANAGER 포함 오더 해제 **거부** / 미포함 **허용**; **DRAFT 청구서 포함 오더도 해제 거부**(상태 무관 존재 확인 — #1445 A5, 청구서 취소 후에는 허용); AGENCY·SHIPPER·OPERATOR·anon 직접 RPC 호출 **예외 거부**; **RPC 오류 시 앱이 해제를 막는 fail-closed 동작**; ADMIN 양성 대조; **청구서 데이터가 반환되지 않음을 단언**; 되돌리기 실측(함수 제거 시 MANAGER 해제가 어떻게 되는지) 표로 정리. **#1475 적용 전/후 양쪽 상태**에서 MANAGER의 플랫폼 발행·대리점 발행 포함 오더 해제 거부를 각각 검증(§6 의존).
6. **마이그레이션 분리**: 함수 생성 마이그레이션(+롤백 `DROP FUNCTION`)을 정책 마이그레이션과 **별도 파일**. 적용 순서 DB 먼저 / 롤백은 앱 먼저. 이 함수는 **컷오버·B-381 설계와 독립적**으로 사용 가능(오더-청구서 포함 여부만 확인).
7. 이전 지시(컷오버 경로 구분, DEF-B-168, 순서 해소안, 보고서 함수 거부 유지, UPDATE·DELETE 근거 표)는 그대로 유지.

### 7-2. 청구서관리 범위 (JSJung 후속 결정 A — 종결)

"MANAGER=admin"은 **청구서관리 전체를 포함하지 않습니다.** `zen_billing_statements` 헤더의 감독 조회(`bill_stmt_select_supervise`)·생성·수정·삭제 정책은 **변경하지 않습니다**(역할 목록 ADMIN·ZENITH_SUPER_ADMIN·AGENCY 유지). MANAGER 허용 범위는 **정산마감 관련 범위로 한정**(규칙 1 그대로). §9-2의 해당 항목은 **"확정: 포함하지 않음"**으로 정리했습니다.

### 7-3. 기타 확정 사항

| 항목 | 확정 |
|:--|:--|
| SUB_ADMIN | **제외 확정** — 정책 추가·삭제 없음. 원가 테이블 SUB_ADMIN 접근 정렬은 #1451(A) 별도. 계정 존재·사용 여부는 업무 확인(§9-2 ④) |
| `createPostFinalizationAdjustment` 가드 | 이 함수에만 로컬 역할 목록(ADMIN·MANAGER·ZENITH_SUPER_ADMIN). `validateAdminAction()` 전역 변경 금지. B-381 ① 경로 종속 |
| 스냅샷 | #1453 소관, B-382 선행(§6) |

---

## 8. 산출물 분리 · 롤백 SQL · 배포 순서 · Ds-11

### 8-1. 산출물 (승인 후에만 생성)

| # | 산출물 | 내용 | 시점 |
|:--|:--|:--|:--|
| M1 | `supabase/migrations/<ts>_task_b382_manager_finalization_rls.sql` | 인보이스 SELECT/INSERT/UPDATE(3) + 원가 SELECT/INSERT/UPDATE(3) = **MANAGER 전용 6개 정책(기준안)** + `NOTIFY pgrst`. JSJung이 7개 유지를 결정하면 DELETE 1개 추가 | JSJung 최종 확정 후 |
| M2 | `supabase/migrations/<ts>_task_b382_billing_inclusion_rpc.sql` | 위 §7-1 존재 확인 `SECURITY DEFINER` 함수 + GRANT/REVOKE + `NOTIFY pgrst` (M1과 **별도 파일**) | JSJung 최종 확정 후 |
| M3 | 앱 변경 메모(마이그레이션 아님) | ① `createPostFinalizationAdjustment` 가드 로컬 역할 목록 ② `unmarkOrderCostSettled`의 RPC 호출 교체 | 별도 PR/커밋 |
| M4 | TASK-B-379 | 스냅샷 정책 | 별도 Task(#1453) |

### 8-2. 정책 정의(안 — M1)

```sql
-- 1~3: zen_invoices SELECT / INSERT / UPDATE
-- 4~6: zen_order_costs SELECT / INSERT / UPDATE  (DELETE는 §9-2 ② 결정 대기 — 7개 확정 시 7번 추가)
-- 공통 조건: EXISTS (SELECT 1 FROM public.zen_profiles p
--                   WHERE p.id = auth.uid() AND p.role = 'MANAGER')
-- INSERT는 WITH CHECK, UPDATE는 USING + WITH CHECK를 동일 조건으로 정의.
-- zen_billing_statement_items / zen_billing_statements: 정책 변경 없음.
NOTIFY pgrst, 'reload schema';
```

### 8-3. 롤백 SQL(안 — **기준안 6문** / 기존 승인 7개 유지 시 7문)

```sql
DROP POLICY IF EXISTS "Managers can view invoices for finalization"        ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can insert invoices for finalization"      ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can update invoices for finalization"      ON public.zen_invoices;
DROP POLICY IF EXISTS "Managers can view order costs for finalization"     ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can insert order costs for finalization"   ON public.zen_order_costs;
DROP POLICY IF EXISTS "Managers can update order costs for finalization"   ON public.zen_order_costs;
NOTIFY pgrst, 'reload schema';
```

- §9-2 ②에서 **7개 유지**로 확정될 경우에만 아래 1문을 위 `NOTIFY` 앞에 추가합니다.

```sql
DROP POLICY IF EXISTS "Managers can delete order costs for finalization" ON public.zen_order_costs;
```

M2 롤백(별도): `REVOKE ...` 원복 후 `DROP FUNCTION IF EXISTS public.zen_billing_statement_order_included(uuid);`

### 8-4. 적용 순서

1. **배포**: M1 → M2(DB) → 스키마 reload 확인 → M3(앱). 앱 먼저면 MANAGER 요청이 정책 대기 중 실패.
2. **롤백**: M3(앱) 선실시 → M2 함수 제거 → M1 정책 DROP. DB 먼저면 새 앱의 MANAGER 경로가 실패.
3. M2 함수는 컷오버·B-381과 독립적으로 배포 가능(§7-1 6번).

### 8-5. Ds-11(R-12) 반영 위치 (구현 확정 후)

| 문서 | 위치 | 반영 내용 |
|:--|:--|:--|
| `docs/02_Analysis/ds11/Ds_11_04_Finance_Settlement.md` | `§4.2 정산·마감·조정` | 정산마감 권한 표, 테이블×동작 매트릭스, 컷오버 전/후 경로 구분 |
| `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | `§11.12~11.14` | MANAGER 정책 경계, B-379 소관 분리, 포함 확인 함수 |
| `docs/02_Analysis/Ds_11_API_상세_명세서.md` | 인덱스 3·7행 | 위 두 문서 반영 |

> 본 설계 의견 PR에서는 Ds-11을 수정하지 않습니다(구현 확정 후 R-12 동기화).

---

## 9. 확정 사항 · 추가 확인 요청 · 절차

### 9-1. JSJung 확정 사항

| # | 확정 내용 | 반영 |
|:-:|:--|:--|
| 1 | 방식 B: MANAGER 전용 정책 신설. 기존 ADMIN·SUPER_ADMIN 정책 미수정 | §4-2 |
| 2 | `createPostFinalizationAdjustment` MANAGER 허용 — 전역 가드 변경 금지, 이 함수에만 로컬 역할 목록 | §3-1·§7-3 |
| 3 | SUB_ADMIN 이번 범위 제외(추가·삭제 없음) | §7-3 |
| 4 | ~~청구서 항목 MANAGER SELECT 정책(#8)~~ → **후속 결정 B로 대체** | §7-1 |
| 5 | 스냅샷 정책은 #1453 소관, B-382 선행(마이그레이션 번호 순서) | §6 |
| 6 | **"MANAGER=admin"은 청구서관리 전체를 포함하지 않음** — 헤더 정책 변경 없음 | §7-2 |
| 7 | **정책 #8 = (b) 존재 확인 전용 SECURITY DEFINER 함수** (정책 수는 ② 최종 결정 대기: 기준안 6개 / 기존 승인 7개) | §4-1·§7-1·§8 |
| 8 | 컷오버: 레거시 청구서 기능을 신규 청구서관리로 대체(일 미정, 기존 UPS 인보이스 보존) | §4-1-3·§4-3 |
| 9 | **컷오버 전 오더의 정산마감은 현행 유지**(TASK-B-381 LEGACY 개편 제외) — `zen_invoices`·`zen_order_costs` legacy 경로 근거 유지 | §4-1-2·§4-1-3 |
| 10 | DEF 번호 분담: Baker 168 / Dave 169+ → 본 검토 신규 DEF는 **DEF-B-171** | DEF-B-171 |
| 11 | **청구서 조회 범위 = (b) 의도하지 않은 노출** 확정(DEF-B-171). 후속 **#1475(TASK-B-383, Mike)** — 본 Task는 청구서 조회 정책 변경 없음. **B-382 함수 적용 후 #1475 병합** | §2-1·§6·§7-1·DEF-B-171 |

### 9-2. 추가 확인 요청

| # | 확인 요청 | 근거/현재 의견 |
|:-:|:--|:--|
| ① | "MANAGER=admin" 동등 전권(11개 경로) 의도. 단 `getRevenueReport`·`getCostReport`는 정책과 무관하게 거부 유지, 컷오버 후 불필요 경로는 별도 표시 | **Jaison 4차 검토: 승인** / §4-3 — JSJung 최종 확정 대기 |
| ② | **원가 정책 7개 vs 6개(DELETE 제외) — 신규 결정 항목**: `UPS_ACTUAL_COST_ADJ` INSERT가 `invoice_id: inv.id`를 포함해 세션 클라이언트 DELETE 근거가 없음. 7개는 JSJung 기존 승인 기준선, **Jaison 의견은 6개**. 임의 변경 없이 최종 결정만 요청. (B-381 확정 시 UPDATE(#6)만 구현 전 재산정은 그대로) | Jaison 4차 보완 1 / §4-1-2 — **JSJung 결정 대기** |
| ③ | 순서 충돌: **설계 확정 B-381 → B-382 / 구현 B-382 ∥ B-379 → B-381 마지막** 분리안 확정 | **Jaison 4차 검토: 승인** / §6 — JSJung 최종 확정 대기 |
| ④ | SUB_ADMIN 계정의 실제 존재·사용 여부(업무 사실 확인). 이번 범위는 이미 제외 | 이번 범위 제외 확정 / §7-3 — 답이 늦어도 진행 가능 |
| ⑤ | ~~청구서 조회 범위 의도 확인~~ → **JSJung 확정: (b) 의도하지 않은 노출, 후속 #1475(TASK-B-383, Mike)**. B-382는 청구서 조회 정책을 바꾸지 않고, 함수 적용 후 #1475 병합 | §9-1 #11·§6·DEF-B-171 |
| (종결) | ~~"MANAGER=admin"을 청구서관리에 적용하는가~~ → **JSJung 결정: 포함하지 않음** | §7-2·§9-1 #6 |

### 9-3. 다음 절차

1. **Jaison 4차 재검토(② 반영 확인)** → 2. **JSJung 최종 확정(①②③④)** → 3. 구현 착수. (⑤는 확정 완료)
4. 이슈 `status:draft`, PR draft 유지. 확정 전까지 정책·함수·코드 변경 없음.
5. 구현 시 순서 분리안(§6)과 **#1475는 B-382 함수 적용 후 병합** 의존을 준수.

---

## [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-B-168 | `rejectInvoice`의 원가-인보이스 연결 해제가 트리거에 막혀 조용히 실패 | Medium | `.agent/defects/DEF-B-168_rejectInvoice_원가연결해제_조용한실패.md` |
| DEF-B-171 | 청구서 조회 가시성이 발행 조직 기준으로 결정되어 역할과 무관(OPERATOR도 플랫폼 발행분 조회) — **확정: (b) 의도하지 않은 노출, 후속 #1475(TASK-B-383, Mike)** | Low~Medium | `.agent/defects/DEF-B-171_청구서조회_발행조직기반_역할무관.md` |

- DEF-B-168: ADMIN 세션 실측에서 연결 해제 UPDATE가 `Cannot modify order costs after invoice has been issued`로 실패, 호출부가 `error`를 확인하지 않아 조용히 실패(R-18 — 본 Task에서 수정 금지).
- DEF-B-171: 조회 범위에 한정, 쓰기는 역할 목록으로 제한됨. JSJung이 **(b) 의도하지 않은 노출**로 확정, 후속 **#1475(TASK-B-383, Mike)**. 본 Task에서는 정책 변경 없음.
- 번호 채번: 열린 PR 브랜치 합산 — PR #1454(165·166), PR #1462(167·169·170), 본 PR(168) → 신규는 **171**(JSJung 분담: Baker 168 / Dave 169+).

---

## 10. [작업 결과] (설계 의견 수정본 범위)

- 코드/정책/함수 변경 **없음**. 마이그레이션·서버 액션·테스트 파일 미추가(DEF 보고서만 추가). `Closes` 미사용(`Refs #1463`).
- 실측 근거: 최초 로그인 세션 SELECT + JWT 주입 롤백 DML, **청구서 픽스처 실측(잔여 0건)**, **ADMIN 트리거 실측(ROLLBACK)**, `pg_policies` 카탈로그, `checkPermission` 직접 실행. v3 추가: **호출 클라이언트 유형 열거**(세션 vs admin client — RLS 적용 여부 판정). v4 추가: **`zen_order_costs` DELETE 경로 코드 대조**(`ups-actual-cost.ts` L408 `invoice_id: inv.id`) — §4-1-2.
- 미확인 항목: 브라우저 클릭 미실행, 빈 테이블 판정 불가, SUPER_ADMIN 세션 미측정, 변경 후 매트릭스는 예측 — §0·§2 명시.
- 검토 반영: Jaison 1차 5 + 2차 5 + 3차 4 + **4차 1** / JSJung 1차 5 + 후속 3 + 컷오버 전 현행 유지·DEF 분담 2 + **#1475 결정 2(⑤ 확정·병합 의존)** / Aiden 4건 — §0-1 대조표 참조.
- 라벨 `status:draft` 유지. 검증: Jaison / 최종 확정: JSJung.
