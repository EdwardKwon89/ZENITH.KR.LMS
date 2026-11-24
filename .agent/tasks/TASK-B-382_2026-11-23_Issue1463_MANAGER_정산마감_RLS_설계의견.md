# TASK-B-382 — Issue #1463: MANAGER의 정산마감 관련 테이블 RLS 정책 정렬 (설계 의견)

| 항목 | 내용 |
|:----|:-----|
| **Issue** | [#1463](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1463) |
| **담당(Worker)** | Baker (Team B) |
| **검증(Auditor)** | Jaison |
| **설계 확정** | **JSJung → Aiden** (2026-11-24 확정 — §[설계 확정]) |
| **상태** | **구현 완료(검증 PASS) — 이슈 `status:review`**: 설계 확정(v5.2)대로 정책 0개(B안), 산출물 2개(M2 함수 + `unmarkOrderCostSettled` RPC 호출 교체)만 구현. §[작업 결과-구현] 참조 |
| **브랜치** | 구현: `feature/teamb-task-b382-iss1463-manager-rls-impl` (base `origin/TeamB_Dev` @ `aef912cdc`). 설계 전용 draft: `feature/teamb-task-b382-iss1463-manager-rls-design` (PR #1465, 병합 금지·유지) |
| **연관** | DEF-B-168, TASK-B-381(#1459 / **PR #1462 7차**), TASK-B-377(#1451 / PR #1454), TASK-B-379(#1453), **#1475(TASK-B-383, Mike)** |
| **공개 저장소 주의** | 목표 상태(변경 후 허용/거부)·판정 기준·산출물만 기재합니다. 실측 근거는 "실측 완료, 상세 비공개" 한 줄로 대체하고 상세는 Jaison·Aiden에게 비공개 채널로 전달합니다. 현재 코드의 역할별 결과·가시성·정책 조건 해석·필드 값·재현 호출 형태는 기재하지 않습니다. |
| **개정 이력** | `54ddba60a` 최초 → `6f400bf0d` 1차 → `e6b10c6e9` 2차 → `6d857341f` 3차 → `1f6f2c614` 4차 → `32d01d742` v5 → `60bedef3c` v5 해시 기재 → `20e78c7a5` v5.1 → `0d1fa60c0` v5.1 해시 기재 → `f3257bb14` v5.2 → `f862ffcac` v5.2 해시 기재 → `f61531fab` Aiden `[설계 확정]` 기록 → `c37c25e72` 공개 기재 정정 → `fc1344497` 해시 기재 → **`6641185eb` 구현 코드 커밋** |

| 버전 | 일자 | 반영 내용 |
|:--|:--|:--|
| v4 | 2026-11-23 | Jaison 4차 근거 정정, JSJung #1475 확정 (커밋 `1f6f2c614`) |
| v5 | 2026-11-24 | Jaison 5차 보완 6건 + JSJung 영향 공지 + #1462 7차 반영 — UPS 단일 경로·UPS 인보이스 경로 제거·정책 집합 재산정 (커밋 `32d01d742` / 해시 기재 `60bedef3c`) |
| **v5.1** | 2026-11-24 | Jaison 5차 재검토 승인, 보완 4건 반영 (커밋 `20e78c7a5`; 해시 기재 `0d1fa60c0`) |
| **v5.2** | 2026-11-24 | JSJung 결정 ② **B안(정책 0개)** 확정 반영 — M1 미생성·①② 종결·산출물 2개·핵심 테스트 승격 (커밋 `f3257bb14`; 해시 기재 `f862ffcac`) |
| **공개 기재 정정** | 2026-11-24 | 현재 상태 서술 전수 삭제, DEF-B-171 보고서 비공개 이관, Aiden 비차단 정정 2건(§4-3 경로 수·§8-1 M4 표현) 반영 (커밋 `c37c25e72`) |
| **구현** | 2026-11-24 | 확정 산출물 2개 구현(M2 함수 마이그레이션 + `unmarkOrderCostSettled` RPC 교체), 회귀 테스트·Ds-11·회귀항목 반영 (커밋 `6641185eb`) |

---

## 0. 범위 · 공개 기재 기준

- 본 문서는 **목표 상태와 판정 기준만** 기재합니다: 변경 후 허용/거부, 산출물, 테스트 대조 기준.
- 실측 근거는 **실측 완료, 상세는 Jaison·Aiden에게 비공개 전달**로 대체합니다. 공개 문서에는 현재 코드의 역할별 결과·가시성·정책 조건 해석·필드 값·재현 호출 형태를 쓰지 않습니다.
- 설계 전제는 Aiden 확정(§[설계 확정])을 따릅니다. 검토 과정은 아래 출처 요약으로만 남깁니다.

### 0-1. 반영 출처 (요약)

| 출처 | 반영 위치 |
|:--|:--|
| Jaison 5차 재검토 승인·보완 | §4-3·§5·§6·§7-3 |
| JSJung 결정 ② B안(정책 0개)·③ 순서·④ SUB_ADMIN 제외 | §4-1·§6·§7-3·§8·§9 |
| #1462 7차(단일 신규 경로·M5 포함 기준) | §1·§4-1·§6·§7-1 |
| Aiden 설계 확정 + 비차단 정정 2건 | §[설계 확정]·§4-3·§8-1 |
| 실측 근거 | 실측 완료, 상세 비공개 |

### 0-2. 목표 범위 · 전제

- **컷오버 폐기**: UPS 오더는 신규 경로 하나(`finalize_ups_settlement_run`, SECURITY DEFINER)로 동작합니다. 호환·이중 처리를 위한 레거시 분기를 두지 않고, 기존 데이터는 보존합니다.
- **UPS 인보이스 경로 제거**: UPS 정산마감은 RLS에 의존하지 않습니다. 단, 인보이스 존재 검사(`ups_invoice_exists`)를 **DEFINER RPC 안에서** 수행하는 것이 전제입니다(#1462 §2-9). 앱 세션 클라이언트에서 검사하면 거부가 무력화되므로 RPC 내부 검사가 필수입니다.
- **비UPS 무변경**: 비UPS 오더·인보이스 경로와 정책은 이번 개편 범위 밖입니다(B-381 7차, JSJung 확정). 앱 가드·정책 불일치는 업무 필요가 생길 때 별도 Task에서 다룹니다.
- **정책 수 0개(B안 확정)**: MANAGER 인보이스·원가 RLS 정책을 신설하지 않고 M1도 생성하지 않습니다.
- **산출물 2개**: M2(존재 확인 `SECURITY DEFINER` 함수) + 앱 변경(`unmarkOrderCostSettled` RPC 호출 교체).

---

## 1. 경로 정리 (목표 상태)

| 구분 | 대상 | 변경 후 판정 |
|:--|:--|:--|
| 유지(비UPS) | `generateInvoicesForOrder`·`finalizeInvoice`·`rejectInvoice`·`updatePaymentStatus`·`calculateSettlementAction`·`addManualOrderCost`·`unmarkOrderCostSettled` | 변경 없음(정책 신설 없음) |
| 제거/흡수(UPS) | `recordUpsActualCost`·`recordActualCostAndFinalize`·`recordUpsActualCharges`·`createPostFinalizationAdjustment`(+전용 헬퍼)·`markOrderCostSettled` | 단일 신규 경로로 대체 |
| 단일 신규 경로 | `finalize_ups_settlement_run` (SECURITY DEFINER) | UPS 마감 전담, RLS 비의존 |

- UPS 마감은 위 RPC가 run·금액·주문 상태를 한 트랜잭션에 저장하고, 역할 검사(ADMIN·MANAGER·ZENITH_SUPER_ADMIN)를 함수 내부에서 수행합니다.
- `unmarkOrderCostSettled`는 UPS 경로 제거와 무관하게 유지되며, 포함 여부 확인을 M2 함수로 교체합니다(§7-1).

---

## 2. 목표 상태 — SELECT 권한 경계

| 대상 | 변경 후 기준 |
|:--|:--|
| MANAGER / 인보이스·원가 | 정책 신설 없음 |
| MANAGER / UPS 정산마감 | SECURITY DEFINER RPC로 허용(RLS 비의존) |
| 청구서 헤더·항목 | MANAGER에게 SELECT 권한 부여 없음; 포함 여부는 boolean 함수로만 제공 |
| 그 외 역할·스냅샷·헤더 정책 | 변경 없음(소관 Task 유지) |

### 2-1. 청구서 관련 목표 기준

- 목표: 청구서 항목 데이터를 노출하지 않고, **오더 포함 여부만 boolean으로 반환**하는 함수를 사용합니다(§7-1).
- 실측 완료, 상세 비공개.

---

## 3. 목표 상태 — DML 권한 경계

| 대상 | 변경 후 기준 |
|:--|:--|
| 인보이스·원가(비UPS 포함) | MANAGER 정책 신설 없음 |
| UPS 마감 | SECURITY DEFINER RPC만 허용 |
| 앱 가드·전역 헬퍼 | 변경 없음(정리는 업무 발생 시 별도 Task) |

### 3-1. 앱 가드

- 전역 가드 변경은 금지합니다. UPS 인보이스 경로 제거로 `createPostFinalizationAdjustment`가 소멸하므로 **결정 #2는 종결(해당 없음)** 입니다.

---

## 4. MANAGER 정책 집합 · 근거 · 영향 범위

### 4-1. 정책 집합 — **확정: B안(정책 0개)**

> UPS 마감은 `finalize_ups_settlement_run`(SECURITY DEFINER)이 처리해 RLS 비의존이고, UPS 인보이스 경로 제거로 조정 경로 헬퍼도 소멸합니다. **JSJung ② 확정**에 따라 MANAGER 인보이스·원가 RLS 정책은 신설하지 않고 M1도 생성하지 않습니다. 비UPS 경로는 변경 없으며, 앱 가드 정리는 업무 발생 시 별도 Task로 다룹니다(본 Task 범위 아님).

| 안 | 테이블·명령 | 정책 수 | 내용 |
|:--|:--|:--:|:--|
| **B. 개방하지 않음 (확정)** | — | **0개** | 인보이스·원가 정책 신설 없음, M1 미생성. 비UPS 경로 변경 없음, 앱 가드 정리는 별도 Task(업무 발생 시) |

- **UPS 정산마감 요구사항은 정책 0개 상태에서도 충족**합니다(RPC가 SECURITY DEFINER로 역할 검사).
- `zen_billing_statement_items` MANAGER SELECT 정책은 추가하지 않습니다. 포함 여부 확인은 **존재 확인 전용 SECURITY DEFINER 함수**(§7-1)로 처리합니다.
- `zen_billing_statements`(헤더) 정책은 **변경 없음**(JSJung 후속 결정 A).
- 그 외 테이블·역할의 정책은 **일체 변경 없음**.

#### 4-1-1. "최소 집합" vs ADMIN 동등 권한 (Aiden 모순 2) — 종결

| 비교안 | 구성 | 결과 | 한계 |
|:--|:--|:--|:--|
| **확정: B안(정책 0개)** | 인보이스·원가 정책 신설 없음, M1 미생성 | 권한 확대 없음, UPS 정산마감은 DEFINER RPC로 충족 | 비UPS 경로는 변경 없음 → 앱 가드 정리는 별도 Task(업무 발생 시) |
| 구 제안 안 | 2개 테이블에 역할 확인 정책 다수 | 미채택·폐기 | UPS 경로 소멸 + JSJung ② B안 확정으로 근거 상실 |
| 기술 제약 | — | RLS는 **행 단위**만 제어(컬럼 단위는 별도 GRANT/뷰) | "마감 컬럼만 UPDATE"는 정책으로 불가 |

→ "최소 집합"은 **정책 신설 없음(0개)**으로 종결합니다. ADMIN 동등 전권 여부(§9-2 ①)는 **B안 확정으로 해당 없음**입니다.

#### 4-1-2. 정책 × 경로 필요 여부 — 변경 후 기준

| 정책 | 변경 후 근거 | 판정 |
|:--|:--|:--|
| 인보이스 SELECT/INSERT/UPDATE | 세션 근거 소멸 또는 비UPS 무변경 | 신설 없음(정책 0개 확정) |
| 원가 SELECT/INSERT | 비UPS 무변경 | 신설 없음(정책 0개 확정) |
| 원가 UPDATE/DELETE | UPS 경로 소멸로 근거 없음 | 신설 없음(정책 0개 확정) |

**산정 결론**: UPS 제거 후 원가 UPDATE·DELETE의 신설 근거가 없음을 명시합니다. JSJung ② **B안(정책 0개) 확정**에 따라 인보이스·원가 정책을 신설하지 않고, 구 제안 안은 모두 폐기합니다. 실측 근거는 실측 완료, 상세 비공개.

#### 4-1-3. UPS 제거 후 비UPS 인보이스 경로

| 명령 | 변경 후 기준 |
|:--|:--|
| SELECT | 변경 없음(정책 신설 없음) |
| INSERT | 신설 없음 |
| UPDATE | 변경 없음(정책 신설 없음) |

→ UPS 인보이스는 신규 경로로만 처리하고, UPS 오더의 구 경로는 제거합니다(기존 데이터 보존, 호환 분기 없음 — #1462 7차).

#### 4-1-4. ADMIN 동등 전권 비교 — 요약

역할만 확인하는 정책은 ADMIN과 같은 행 단위 전권입니다. §9-2 ①은 **B안(정책 0개) 확정으로 해당 없음**이며, 비UPS 경로의 앱 가드는 변경하지 않습니다. 정책과 무관한 앱 가드 제한도 변경하지 않습니다(Jaison 보완 5).

### 4-2. 방식 비교·권장안

| 항목 | A. 기존 ADMIN 정책에 MANAGER 추가 | B. MANAGER 전용 신설 (**승인**) |
|:--|:--|:--|
| 기존 정책 영향 | 즉시 영향 가능 | **없음**(정책 신설 0개) |
| 되돌리기 | 원문 복원 필요 | **롤백 대상 없음** |
| 동시 변경 충돌 | 객체 충돌 위험 | 없음 |
| 정책 수 | 적음 | **정책 0개(JSJung ② B안 확정)** |

**방식 B(기존 정책 미수정) 유지**. INSERT의 `WITH CHECK`, UPDATE의 `USING + WITH CHECK` 동일 조건은 신설 시 적용 원칙이나 본 Task에서는 해당 없음.

### 4-3. 영향 범위(Blast Radius) — 변경 후 기준

| # | 서버 액션 | 변경 후 판정 |
|:-:|:--|:--|
| 1 | `generateInvoicesForOrder` | 변경 없음(정책 신설 없음) |
| 2 | `finalizeInvoice` | 변경 없음(정책 신설 없음) |
| 3 | `rejectInvoice` | 변경 없음(정책 신설 없음) |
| 4 | `updatePaymentStatus` | 변경 없음(정책 신설 없음) |
| 5 | `calculateSettlementAction` | 변경 없음(정책 신설 없음) |
| 6 | `addManualOrderCost` | 변경 없음(정책 신설 없음) |
| 7 | `createPostFinalizationAdjustment` | 제거(호출부 소멸) |
| 8 | `getShipperDailyBillingSummary` | 변경 없음(정책 신설 없음) |
| 9 | `finalizeDailyShipperInvoices` | 변경 없음(정책 신설 없음) |
| 10 | `recordUpsActualCharges` | 제거 |
| 11 | `unmarkOrderCostSettled` | 유지 — 포함 오더는 포함 여부 확인 함수로 거부(M5 일괄 초기화는 이 함수를 거치지 않음) |

- **비UPS 경로 8개**(`generateInvoicesForOrder`·`finalizeInvoice`·`rejectInvoice`·`updatePaymentStatus`·`calculateSettlementAction`·`addManualOrderCost`·`getShipperDailyBillingSummary`·`finalizeDailyShipperInvoices`; 표 1~6·8~9번)는 **변경 없음**입니다. 앱 가드 정리는 별도 Task(업무 발생 시)이며 **이 Task에서 앱 가드를 고치지 않습니다**(§9-1 #13).
- **경로 수 재산정**: 11개 → **UPS 제거 후 9개 잔여**(7·10번 제거).
- `getRevenueReport`·`getCostReport`는 정책과 무관하게 **제한 유지**(변경 없음).
- §9-2 ①은 **B안 확정으로 해당 없음**입니다.

---

## 5. 권한 확대 경계 검증 계획 (구현 시)

**핵심 케이스 (JSJung ② B안 확정 반영 — 결과 표에도 명시)**
- **정책 0개 상태에서 MANAGER의 UPS 정산마감(RPC) 성공**: 인보이스·원가 정책이 신설되지 않은 상태에서 `finalize_ups_settlement_run` 호출이 성공함을 확인(SECURITY DEFINER 역할 검사).
- **비취소 UPS 인보이스가 있는 오더는 `ups_invoice_exists` 거부**: 검사가 **DEFINER RPC 안(#1462 §2-9)** 에서 수행되어 거부되는지 확인.

- **정책 0개 확인**: MANAGER 인보이스·원가 RLS가 신설되지 않았음을 확인. 정산 외 경로 2개(`updatePaymentStatus`, `getShipperDailyBillingSummary`)도 변경 없음.
- **음성 대조(고정)**: 권한 외 역할·청구서 헤더 정책은 전후 동일(변경 없음).
- **되돌리기**: 정책 마이그레이션(M1)을 생성하지 않으므로 **정책 롤백은 해당 없음**(M2 함수 롤백만 §7-1에서 확인).
- **서버 액션 연결**: 잔여 9개 경로는 **변경 없음**을 확인. 제거 경로(7·10번)는 호출부 소멸로 미적용 확인.
- **청구서 존재 확인 함수 테스트**: §7-1 5번 항목의 양성/음성 대조 + 되돌리기 실측. **#1475 적용 전/후 양쪽 상태 모두**에서 "MANAGER가 플랫폼 발행·대리점 발행 양쪽 포함 오더의 정산 해제를 거부"하는지 검증(§6 의존).
- **M5 기준 대조**: B-381 7차 M5 일괄 초기화의 "청구서 항목 포함 오더 제외"와 §7-1 함수의 "상태 무관 포함 여부"가 **같은 포함 기준**인지 한 줄 확인.
- 별도 기능 결함 1건은 수정 Task에서 확인(본 Task 범위 밖, 상세 비공개).

| 셀 | 변경 후 판정 기준 |
|:--|:--|
| MANAGER / `zen_invoices` SELECT·INSERT·UPDATE | 거부(정책 신설 없음) |
| MANAGER / `zen_order_costs` SELECT·INSERT·UPDATE·DELETE | 거부(정책 신설 없음) |
| **MANAGER / UPS 정산마감(RPC) — 핵심** | **허용** — 정책 0개 상태에서도 SECURITY DEFINER 역할 검사 |
| **MANAGER / 비취소 UPS 인보이스 잔존 오더 정산 — 핵심** | **`ups_invoice_exists` 거부** — DEFINER RPC 내부 검사 |
| MANAGER / 청구서 항목 직접 SELECT | 권한 부여 없음(데이터 미노출) |
| MANAGER / 존재 확인 함수 호출 | 포함 오더 `true`, 미포함 `false`(fail-closed) |
| 권한 외 역할 전체 | 변경 없음 |
| ADMIN·SUPER_ADMIN 전체 | 변경 없음 |

---

## 6. TASK-B-379(#1453)와의 경계 · 순서 (확정)

- **UPS 경로 무의존(단서 포함)**: UPS 정산마감은 `finalize_ups_settlement_run`(`SECURITY DEFINER`, 역할 검사 ADMIN·MANAGER·ZENITH_SUPER_ADMIN)이 처리하므로 인보이스·원가 RLS 정책 수(**0개, B안 확정**)와 무관합니다. **단, 인보이스 존재 검사(`ups_invoice_exists`)를 DEFINER RPC 안에서 수행하는 한** 성립합니다(#1462 §2-9). 앱 세션 클라이언트 검사는 fail-open 위험이 있어 전제로 인정하지 않습니다.
- **스냅샷 의존 — B-381 7차 기준, 앱 액션 4단계**: `recomputeRevenue`는 RPC가 아니라 앱 액션 `finalizeUpsSettlement`의 **4단계(세션 클라이언트, #1462 §2-1)** 이며, `order.snapshot`을 읽어 run에 저장할 대상을 계산합니다. **#1453(B-379)의 스냅샷 SELECT 결정이 선행 조건**입니다. 본 Task는 스냅샷 정책을 변경하지 않습니다.
- 존재 확인 함수(M2)·`unmarkOrderCostSettled`는 UPS 경로 제거와 무관하게 **유지**됩니다. M5 일괄 초기화는 이 함수를 거치지 않으므로 "청구서 포함 오더 제외" 조건을 스크립트에 명시해야 합니다(§7-1 1번).
- **#1475 의존**: B-382의 존재 확인 전용 함수를 `unmarkOrderCostSettled`에 적용한 **뒤에** #1475를 병합합니다. 테스트는 **#1475 적용 전/후 양쪽 상태**를 모두 검증합니다(§5·§7-1 5번).

| 구분 | 순서 | 근거 |
|:--|:--|:--|
| **설계 확정** | B-381 7차 → B-382 v5.2 → JSJung ③ → Aiden | **확정 완료(§[설계 확정])** |
| **구현** | **B-382 선행 → B-381 → B-377(#1454)** | JSJung 확정(마이그레이션 객체·timestamp 충돌 회피) |
| **별도 선행 조건** | **#1453(B-379) 스냅샷 결정** | B-381 7차 앱 액션 `finalizeUpsSettlement` 4단계가 `order.snapshot` 사용 |
| **#1475** | B-382 함수 적용 후 병합 | 무결성 보호의 전제 |

→ 설계 확정 축과 구현 축은 별개입니다. 임의로 순서를 바꾸지 않습니다.

---

## 7. 청구서 관련 결정 · 무결성 보호 설계

### 7-1. 정책 #8 대체: 존재 확인 전용 SECURITY DEFINER 함수 (JSJung 후속 결정 B)

- **목표**: MANAGER에게 청구서 항목 SELECT 권한을 주지 않고, **포함 여부만 boolean으로 반환하는 함수**를 사용합니다. UPS 인보이스 경로 제거 후에도 `unmarkOrderCostSettled`는 유지되므로(§4-3 #11) 이 함수도 B안 확정 기준으로 유지됩니다.
- 실측 완료, 상세 비공개.

| 안 | 무결성 | 변경 파일 | 되돌리기 | 규칙 1 정합 |
|:--|:--|:--|:--|:--|
| (a) SELECT 정책 유지 | 보장 | 마이그레이션 1 | DROP POLICY | 항목 데이터 읽힘 → 후속 결정과 충돌 |
| **(b) 존재 확인 함수 (확정)** | 보장 | 마이그레이션 1 + 앱 1 | DROP FUNCTION + 앱 롤백 | **데이터 미노출, 정산 해제 보호만 수행** |
| (c) MANAGER 해제 차단 | 보장 | 앱 1 | 앱 롤백 | 규칙 1의 "정산마감 MANAGER 허용"과 충돌 |

- **병합 순서 의존**: 함수를 `unmarkOrderCostSettled`에 먼저 적용한 뒤 #1475를 병합합니다(§6). 청구서 조회 정책 자체는 B-382에서 변경하지 않습니다(JSJung 결정).

**함수 설계 요구사항 (JSJung 지시 7개 항목 반영)**

1. **시그니처·반환**: `public.zen_billing_statement_order_included(p_order_id uuid) RETURNS boolean`. 오더별 boolean만 반환하고 다른 정보는 반환하지 않습니다. **청구서 상태와 무관하게 "포함 여부"만 확인**합니다(기존 차단 범위의 의미 보존). 필요 시 배열 오버로드 검토 — 본 설계는 단일 오더 기준.
   - **M5 일괄 초기화 기준과 한 줄 대조**: M5의 "청구서 항목 포함 오더 초기화 제외"와 본 함수의 "상태 무관 포함 여부"는 **같은 포함 기준**입니다. 단, M5 일괄 SQL은 이 함수를 거치지 않으므로 스크립트에 조건을 명시해야 합니다(#1462 §2-6).
2. **보안(#1449 B / B-381 RPC 동일 기준 / fail-closed)**: `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`; `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`(세션 클라이언트 호출용) 후 **함수 내부에서 허용 역할 3종(ADMIN·MANAGER·ZENITH_SUPER_ADMIN)만 검사**. **비허용 역할은 예외로 거부** — `false` 반환은 호출부가 "포함 안 됨"으로 읽어 정산 해제를 허용하는 위험이므로 금지. 앱도 **RPC 오류 시 해제를 차단(fail-closed)** 합니다. actor를 파라미터로 받지 않고, 앱은 세션 클라이언트로 호출합니다(admin client 금지).
3. **오더 범위 제한 검토**: 허용 역할이 관리자 3종뿐이고 반환값이 boolean 하나라 영향이 낮음을 근거로 기재합니다(차단이 필요하면 오더 조직 범위 조건을 추가하는 옵션을 둡니다).
4. **앱 변경**: `unmarkOrderCostSettled`의 포함 여부 확인을 M2 함수 호출로 교체합니다. **ADMIN·SUPER_ADMIN의 기존 동작 불변** 검증(포함 오더 해제 거부 유지, 미포함 오더 해제 허용).
5. **테스트(양성/음성 대조)**: MANAGER 포함 오더 해제 **거부** / 미포함 **허용**; **DRAFT 청구서 포함 오더도 해제 거부**(상태 무관, 청구서 취소 후에는 허용); 권한 외 역할·anon 직접 호출 **예외 거부**; **RPC 오류 시 앱이 해제를 막는 fail-closed 동작**; ADMIN 양성 대조; **청구서 데이터가 반환되지 않음을 단언**; 되돌리기 실측(함수 제거 시 동작) 표로 정리. **#1475 적용 전/후 양쪽 상태**에서 MANAGER의 플랫폼 발행·대리점 발행 포함 오더 해제 거부를 각각 검증(§6 의존).
6. **마이그레이션 분리**: 함수 생성 마이그레이션(+롤백 `DROP FUNCTION`)을 정책 마이그레이션과 **별도 파일**로 둡니다. 적용 순서 DB 먼저 / 롤백은 앱 먼저. 이 함수는 B-381 설계와 독립적으로 사용 가능합니다(오더-청구서 포함 여부만 확인).
7. 이전 지시(기능 결함 보고, 순서 해소안, 보고서 함수 거부 유지, 경로별 근거 표)는 그대로 유지합니다.

### 7-2. 청구서관리 범위 (JSJung 후속 결정 A — 종결)

"MANAGER=admin"은 **청구서관리 전체를 포함하지 않습니다.** `zen_billing_statements` 헤더 정책은 **변경하지 않습니다**. MANAGER 허용 범위는 **정산마감 관련 범위로 한정**(규칙 1 그대로)하며, §9-2 해당 항목은 **"확정: 포함하지 않음"**으로 정리했습니다.

### 7-3. 기타 확정 사항

| 항목 | 확정 |
|:--|:--|
| SUB_ADMIN | **이번 범위 제외** — 정책 추가·삭제 없음. 계정 존재·사용 여부는 업무 확인(§9-2 ④ — 답이 늦어도 진행 가능) |
| `createPostFinalizationAdjustment` 가드 | UPS 인보이스 경로 제거로 **함수 소멸 → 결정 #2 종결(해당 없음)**. 전역 `validateAdminAction()` 변경은 금지 |
| 스냅샷 | **#1453 소관, B-381 7차 앱 액션 4단계가 선행 조건**(§6) |

---

## 8. 산출물 분리 · 롤백 SQL · 배포 순서 · Ds-11

### 8-1. 산출물 (승인 후에만 생성)

| # | 산출물 | 내용 | 시점 |
|:--|:--|:--|:--|
| M2 | `supabase/migrations/20261124100000_task_b382_billing_inclusion_rpc.sql` | 위 §7-1 존재 확인 `SECURITY DEFINER` 함수 + GRANT/REVOKE + `NOTIFY pgrst` (정책 마이그레이션 없음, B안 확정 반영) | JSJung ② B안 확정 반영 |
| M3 | 앱 변경 메모(마이그레이션 아님) | ① `unmarkOrderCostSettled`의 RPC 호출 교체 ② 비UPS 앱 가드 정리는 **별도 Task**(업무 발생 시, 본 Task 범위 아님) | 별도 PR/커밋 |
| M4 | TASK-B-379 | 스냅샷 정책 | 별도 Task(#1453), **앱 액션 `finalizeUpsSettlement` 4단계** 선행 조건 |

- **M1(정책 마이그레이션)은 생성하지 않습니다**(JSJung ② B안 확정 — MANAGER 인보이스·원가 정책 신설 0개).
- **본 Task 실제 산출물은 M2 + M3(앱 변경) 두 가지**입니다(§0-2).

### 8-2. 정책 정의 — **해당 없음(정책 0개)**

JSJung ② **B안(정책 0개)** 확정으로 MANAGER 인보이스·원가 RLS 정책을 정의하지 않습니다. M1을 생성하지 않으며, `zen_billing_statement_items`·`zen_billing_statements`(헤더) 정책도 변경하지 않습니다(§7-2). 포함 여부 확인은 M2 함수(§7-1)로 처리합니다.

### 8-3. 롤백 SQL — **해당 없음(정책 신설 0개)**

- 정책 롤백 SQL: **해당 없음**.
- M2 롤백(별도): `REVOKE ...` 원복 후 `DROP FUNCTION IF EXISTS public.zen_billing_statement_order_included(uuid);`

### 8-4. 적용 순서

1. **배포**: M2(DB) → 스키마 reload 확인 → M3(앱). 정책 마이그레이션(M1)은 생성하지 않음. DB 먼저면 새 앱의 MANAGER 경로가 실패.
2. **롤백**: M3(앱) 선실시 → M2 함수 제거. 정책 DROP은 **해당 없음**(신설 0개).
3. M2 함수는 B-381 구현 및 UPS 경로 제거와 독립적으로 배포 가능(§7-1 6번).
4. 구현 순서(§6): B-382 선행 → B-381 → B-377. #1475는 B-382 함수 적용 후 병합.

### 8-5. Ds-11(R-12) 반영 위치 (구현 확정 후)

| 문서 | 위치 | 반영 내용 |
|:--|:--|:--|
| `docs/02_Analysis/ds11/Ds_11_04_Finance_Settlement.md` | `§4.2 정산·마감·조정` | 정산마감 권한 표, 테이블×동작 매트릭스, UPS 단일 경로 / 비UPS 무변경 구분 |
| `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | `§11.12~11.14` | MANAGER 정책 경계(정책 0개 확정), B-379 소관 분리, 포함 확인 함수 |
| `docs/02_Analysis/Ds_11_API_상세_명세서.md` | 인덱스 3·7행 | 위 두 문서 반영 |

> 본 설계 의견 PR에서는 Ds-11을 수정하지 않습니다(구현 확정 후 R-12 동기화).

---

## 9. 확정 사항 · 추가 확인 요청 · 절차

### 9-1. JSJung 확정 사항

| # | 확정 내용 | 반영 |
|:-:|:--|:--|
| 1 | 방식 B: 기존 정책 미수정 + **② B안(정책 0개) 확정** — MANAGER 인보이스·원가 정책 신설 없음, M1 미생성 | §4-2 |
| 2 | `createPostFinalizationAdjustment` 관리자 허용 — **UPS 경로 제거로 함수 소멸 → 결정 #2 종결(해당 없음)**. 전역 가드 변경 금지 | §3-1·§7-3 |
| 3 | SUB_ADMIN 이번 범위 제외(추가·삭제 없음) | §7-3 |
| 4 | ~~청구서 항목 MANAGER SELECT 정책(#8)~~ → **후속 결정 B로 대체** | §7-1 |
| 5 | 스냅샷 정책은 #1453 소관, B-382 선행(마이그레이션 번호 순서) | §6 |
| 6 | **"MANAGER=admin"은 청구서관리 전체를 포함하지 않음** — 헤더 정책 변경 없음 | §7-2 |
| 7 | **정책 #8 = (b) 존재 확인 전용 SECURITY DEFINER 함수** (B안 확정 기준 유지) | §4-1·§7-1·§8 |
| 8 | ~~컷오버일 미정·기존 UPS 인보이스 보존~~ → **폐기**: UPS 단일 신규 경로, UPS 인보이스 경로 제거 | §0-2·§4-1-3 |
| 9 | ~~구 경로 현행 유지~~ → **폐기**: UPS 구 경로 제거, 마감은 `finalize_ups_settlement_run` 단일 경로 | §1·§4-1-2 |
| 10 | DEF 번호 분담: Baker 168 / Dave 169+ | `[발견 이슈]` |
| 12 | **비UPS 오더·인보이스는 변경하지 않음**(B-381 7차, 2026-11-24 확정). 비UPS 잔여 경로의 RLS 개방 여부는 **B안(정책 0개)으로 확정** | §0-2·§4-1 |
| 13 | **② 비UPS 인보이스·원가 RLS는 열지 않음 = B안(정책 0개)** — M1 미생성, ① 종결, 비UPS 경로 변경 없음, 실제 산출물은 M2 + 앱 변경 2개 | §0-2·§4-1·§8·§9-2 |

### 9-2. 추가 확인 요청

| # | 확인 요청 | 근거/현재 의견 |
|:-:|:--|:--|
| ① | ~~잔여 9개 경로에 "MANAGER=admin" 동등 전권을 적용하는가~~ → **B안 확정으로 해당 없음**(정책 신설 없음). 잔여 경로의 앱 가드는 변경하지 않음 | §4-3·§9-1 #13 |
| ② | ~~비UPS 오더 인보이스·원가 처리를 RLS까지 열 것인가 (A 4개 / B 0개)~~ → **JSJung 확정: B안(정책 0개)** — M1 미생성, 비UPS 경로 변경 없음, 앱 가드 정리는 업무 발생 시 별도 Task | §9-1 #13 / §4-1·§8 |
| ③ | 순서 — **설계 확정: B-381 7차 → B-382 v5.2 → JSJung → Aiden / 구현: B-382 선행 → B-381 → B-377(#1454)**. 별도 선행 조건 #1453(B-379, B-381 7차 앱 액션 4단계) | **확정 완료(§[설계 확정])** / §6 |
| ④ | SUB_ADMIN 계정의 실제 존재·사용 여부(업무 사실 확인). **이번 범위 제외 확정, 비차단 — 답이 늦어도 진행** | §7-3 |
| ⑤ | ~~청구서 조회 범위 의도 확인~~ → **조회 정책 정렬은 후속 Task #1475(TASK-B-383, Mike)에서 별도 수행**, 상세 비공개. 본 Task는 청구서 조회 정책을 바꾸지 않고, 함수 적용 후 #1475 병합 | §6 |
| (종결) | ~~"MANAGER=admin"을 청구서관리에 적용하는가~~ → **JSJung 결정: 포함하지 않음** | §7-2·§9-1 #6 |

### 9-3. 다음 절차

1. **설계 확정 완료**(§[설계 확정]) → 담당자 지정 후 이슈 `status:ready` → 착수 시 `status:in-progress`.
2. 이슈는 `status:open` 유지(담당자 지정 전), PR은 draft 유지. 구현 확정 전까지 정책·함수·코드 변경 없음.
3. 구현 시 순서(§6)와 **#1475는 B-382 함수 적용 후 병합** 의존을 준수.
4. **JSJung ② 확정 = B안(정책 0개)** — A안은 삭제, M1 미생성, §9-2 ①② 종결. 비UPS 앱 가드는 변경 없음.

---

## [설계 확정] (Aiden 전속 — R-17)

| 항목 | 내용 |
|:--|:--|
| **확정 대상** | 설계 의견 v5.2 (head `f862ffcac`, 본문 `f3257bb14`) |
| **확정 일시** | 2026-11-24 09:49 KST **확정**. 전제(PR #1462 조건 1 반영)는 같은 날 10:59 KST 반영 확인 |
| **근거 코멘트** | [PR #1465 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1465#issuecomment-7118469813) / 전제 확인: [PR #1462 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1462#issuecomment-7119651852) |
| **확정 범위** | 정책 0개(B안), 산출물 2개(M2 존재 확인 `SECURITY DEFINER` 함수 + `unmarkOrderCostSettled` RPC 교체), 함수는 예외로 거부하는 fail-closed |
| **유지되는 전제** | "UPS 정산마감은 RLS 비의존"은 `ups_invoice_exists` 검사가 DEFINER RPC 안에서 수행되는 한 성립(PR #1462 §2-1·§2-9, 반영 확인 완료). 구현 순서 B-382 → B-381 → B-377, #1475는 M2 함수 적용 후 병합. 비UPS 경로의 앱 가드·RLS 불일치는 업무 발생 시 별도 Task |
| **잔여 비차단 정정** | §4-3 "비UPS 경로 7개" → 8개, §8-1 M4의 "B-381 7차 단계 4" 표현 통일 — 구현 PR 또는 이 파일을 다시 수정할 때 반영 |
| **상태 라벨** | IS #1463 `status:draft` 제거(2026-11-24 09:59 KST) → `status:open`(10:08 KST). **담당자(Baker) 지정 후 Aiden이 `status:ready` 부여**, 착수 시 담당 Agent가 `status:in-progress` 전환 |

## [발견 이슈]

- 기능 결함 1건(`rejectInvoice` 원가 연결 해제)은 별도 Task(R-18)로 이관 — 상세는 비공개 보고, 본 Task 범위 밖.
- 조회 정책 정렬은 후속 Task **#1475(TASK-B-383, Mike)** 에서 **별도 Task에서 조회 정책 정렬 예정**(상세 비공개).
- DEF 번호는 열린 PR 브랜치를 합산해 채번(DEF-B-168, DEF-B-169+).

---

## 10. [작업 결과] (설계 의견 수정본 범위)

- 코드/정책/함수 변경 **없음**. 마이그레이션·서버 액션·테스트 파일 미추가, `Closes` 미사용(`Refs #1463`).
- 공개 기재 정정: 현재 상태의 역할별 결과·가시성·정책 조건 해석·필드 값·재현 호출 형태를 모두 삭제하고, 목표 상태(변경 후 허용/거부)·산출물 2개·테스트 대조 기준만 남겼습니다. 실측 근거는 "실측 완료, 상세 비공개"로 대체하고 상세는 Jaison·Aiden에게 비공개 전달합니다.
- DEF-B-171 공개 보고서(`git rm`) 제거 — 후속 Task 번호와 별도 Task 정렬 예정 한 줄만 유지합니다.
- Aiden 비차단 정정 2건 반영: **§4-3 비UPS 경로 8개**, **§8-1 M4 = 앱 액션 `finalizeUpsSettlement` 4단계**.
- 검토 반영: Jaison 1~5차 + 5차 재검토 / JSJung 결정 / #1462 7차 / Aiden 설계 확정 — §0-1 요약 참조.
- 전수 grep 명령(DEF-B-171 삭제 전 실행, 현재 상태 서술 후보 확인):
  ```bash
  grep -nE 'ADMIN|MANAGER|AGENCY|SHIPPER|OPERATOR|SUB_ADMIN|O\(|X\(|볼 수 있|가시|0행|추론|실측|현재|변경 전|세션' .agent/tasks/TASK-B-382_*.md .agent/defects/DEF-B-168_*.md .agent/defects/DEF-B-171_*.md
  ```
- 라벨: 이슈 `status:open`(담당자 지정 후 `status:ready`), PR draft. 검증 Jaison / 최종 확정 Aiden(§[설계 확정]).
- **v5 커밋 해시: `32d01d742`**, 해시 기재 `60bedef3c`.
- **v5.1 커밋 해시: `20e78c7a5`**, 해시 기재 `0d1fa60c0`.
- **v5.2 커밋 해시: `f3257bb14`**, 해시 기재 `f862ffcac` (Aiden `[설계 확정]` 기록 커밋 `f61531fab`).
- **공개 기재 정정 커밋 해시: `c37c25e72`** — 해당 커밋에서 현재 상태 서술 삭제·DEF 보고서 제거·비차단 정정 2건을 반영했고, 본 커밋은 해시 기재 전용입니다.

---

## 11. [작업 결과-구현] (설계 확정 범위만)

- 코드 커밋: `6641185ebdda5ce96c485fc4d58c68fc86054476`

| 항목 | 내용 |
|:--|:--|
| **구현 커밋** | `6641185eb` `[Baker] fix: TASK-B-382 청구서 포함 확인 RPC 도입·정산 해제 fail-closed (Issue #1463)` |
| **산출물** | **M2** `supabase/migrations/20261124100000_task_b382_billing_inclusion_rpc.sql` — `public.zen_billing_statement_order_included(p_order_id uuid) RETURNS boolean`, `SECURITY DEFINER`·`search_path=public`, `REVOKE PUBLIC/anon`·`GRANT authenticated`, 내부 허용 역할 ADMIN·MANAGER·ZENITH_SUPER_ADMIN, 비허용은 예외 거부. **M3** `src/app/actions/finance/ups-actual-cost.ts`의 `unmarkOrderCostSettled` 포함 여부 확인을 RPC 호출로 교체 — RPC 오류·비정상 반환은 해제 차단(fail-closed), 세션 클라이언트 유지, ADMIN·SUPER_ADMIN 동작 불변 |
| **미생성** | M1(정책 마이그레이션) 없음 — 정책 0개(B안) 확정. 헤더 정책·SUB_ADMIN·AGENCY/SHIPPER/OPERATOR 권한 확대 없음 |
| **롤백** | 앱 RPC 호출 제거 → `DROP FUNCTION IF EXISTS public.zen_billing_statement_order_included(uuid);` 순서. 정책 롤백은 해당 없음. 마이그레이션 파일 하단에 주석으로 기재 |
| **테스트** | `tests/unit/db/taskb382-billing-inclusion-rpc.test.ts`(포함/미포함, 3역할, 상태 무관, 비허용 역할·anon 거부, boolean 단일 반환, EXECUTE 권한, 롤백 SQL), `tests/unit/finance/task-b367-unmark-cost-settled.test.ts`(RPC 오류 fail-closed·ADMIN/MANAGER/SUPER 양성 대조), `tests/integration/task-b367-unmark-cost-settled.test.ts`(실DB 앱 경로) |
| **검증 결과** | 단위 13/13 PASS, 실DB 함수 7/7 PASS, 실DB 앱 통합 5/5 PASS. `npm run test:regression` **298파일 / 2282케이스 전부 PASS**, `npm run build` PASS, `npm run check:ds11` 신규 미반영 0, `npm run check:lrtm` 유령 경로 0 |
| **Ds-11 / 회귀맵** | `Ds_11_04_Finance_Settlement.md` §4.2 RPC 항목, `Ds_11_11B_UPS_Agency_Actuals.md` `unmarkOrderCostSettled` 항목 갱신. 회귀항목 `TASK-B-382_Issue1463_billing-inclusion-rpc.md` 신규 등재 |
| **순서·의존** | 설계 확정 구현 순서 B-382 → B-381 → B-377 유지. **#1475는 M2 함수 적용 후 병합** — 적용 전/후 양쪽 검증 항목 등재(후 상태는 로컬 실DB에서 확인). PR #1465 설계 draft는 병합하지 않고 유지 |
| **절차** | 이력 재작성(force-push) 없음. `origin/TeamB_Dev` 최신(aef912cdc)을 일반 병합으로 반영. Squash 병합 후 구현 브랜치 삭제 예정 |
| **비공개 사항** | 실측 상세·재현 형태는 공개 문서에 기재하지 않고 Jaison·Aiden에게 비공개 전달(별도 채널). 기능 결함 1건은 본 범위 밖 별도 Task 유지 |

---

## 12. 검증 (DoD)

- [x] M2 함수 실DB 7/7 PASS — 포함/미포함 boolean, 허용 3역할(ADMIN·MANAGER·ZENITH_SUPER_ADMIN), DRAFT/ISSUED 상태 무관, 비허용 역할(AGENCY·SHIPPER) 예외 거부, anon EXECUTE 미보유, `boolean` 단일 반환 + `SECURITY DEFINER`, `authenticated`만 EXECUTE, 롤백 SQL 유효·트랜잭션 원복 (`tests/unit/db/taskb382-billing-inclusion-rpc.test.ts`)
- [x] M3 앱 단위 13/13 PASS — RPC 오류·비정상 반환 fail-closed(`generic{STATEMENT_ITEM_LOOKUP}`) 및 UPDATE 미실행, 포함 `true` → `statement_includes_order`, 미포함 `false` → 해제 성공, ADMIN·MANAGER·ZENITH_SUPER_ADMIN 양성 대조, 청구서 항목 테이블 직접 조회 0건 (`tests/unit/finance/task-b367-unmark-cost-settled.test.ts`)
- [x] 실DB 앱 통합 5/5 PASS — 실제 로그인 세션(authenticated)으로 포함 오더 거부 / DRAFT 헤더 삭제(CASCADE) 후 해제 성공 (`tests/integration/task-b367-unmark-cost-settled.test.ts`)
- [x] 정책 0개(B안) 확정 범위 준수 — M1 정책 마이그레이션 미생성, 헤더 정책·SUB_ADMIN·AGENCY/SHIPPER/OPERATOR 권한 확대 없음, `ups_invoice_exists` 검사는 B-381 RPC 내부 유지
- [x] 산출물 2개만 구현 — M2 함수 + `unmarkOrderCostSettled` RPC 교체 (추가 범위 없음)
- [x] 배포·롤백 순서 명시 — M2 → 스키마 reload → M3 / 앱 RPC 호출 제거 → 함수 제거. #1475는 M2 적용 후 병합(전/후 양쪽 검증 항목 등재)
- [x] Ds-11 갱신 + `npm run check:ds11` PASS (허용 목록 밖 신규 미반영 0)
- [x] 회귀항목 신규 등재 + `npm run check:lrtm` PASS (유령 경로 0, E2E 표기 누락 0, 허용 목록 밖 신규 미등재 0)
- [x] 전체 회귀 PASS — `npm run test:regression` **298파일 / 2282케이스 PASS**
- [x] `npm run build` PASS
- [x] 이력 재작성 없음 — `origin/TeamB_Dev` 최신(aef912cdc) 일반 병합, force-push 없음. Squash 병합 후 구현 브랜치 삭제 예정
- [x] 공개 기재 원칙 준수 — 실측 상세·재현 형태는 비공개(Jaison·Aiden), 공개 문서는 목표 상태·판정 기준만 기재
- [x] `check-R17-DoD` 전항목 통과
