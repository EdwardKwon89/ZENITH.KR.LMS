# TASK-B-377 — Issue #1451: UPS 원가 열람 admin 전용 정렬 + 부가운임 항목별 표시·라벨 중립화 (설계 의견)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1451](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1451) (#1449 A·#1442 대체, 설계 의견부터) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **상태** | 📝 설계 의견 (`status:draft`) — **구현 금지** |
| **브랜치** | `feature/teamb-task-b377-iss1451-cost-display-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **공개 저장소 주의** | 목표 상태·판정 기준만 기재. 현재 코드의 역할별 반환·접근·가드 여부, 컬럼명, 응답 값, 재현 형태는 쓰지 않는다. |

## 확정 규칙 (JSJung)

1. UPS 정산마감은 admin(SUPER_ADMIN·ADMIN·MANAGER)만.
2. 정산마감 시 수정된 청구중량으로 agent·shipper 운임 재계산.
3. 정산마감 시 추가된 부가운임은 agent·shipper 부가운임으로 적용.
4. **기본운임·유류·급행·총원가·환율·할증률 = admin만**. **부가운임은 agent·shipper에게 표시**.
5. 화주·대리점 라벨은 **"부가운임"**.
6. 정산마감에서 추가한 부가운임의 **항목명**도 표시.

## 1. 판정 기준 (목표 상태)

- 원가 계열(기본운임·유류·급행·총원가·환율·할증률)은 **admin만** 열람할 수 있다.
- 부가운임의 **항목명·금액**은 화주·대리점에게 표시한다.
- 화면·PDF 라벨은 중립적으로 **"부가운임"** 을 쓴다.
- 실측 완료, 상세는 비공개 보고.

## 2. 목표 표시 경로 (변경 후 허용/거부)

| 경로 (현재 구조 — 갱신) | 원가 계열 | 부가운임 항목 | 판정 기준 |
|:--|:--:|:--:|:--|
| `getUpsActualCost` (관리자 정산) | admin만 | — | admin 3역할만 허용 · 실제 호출처 **2곳**(오더정산 상세, 실비 조정 폼) — PR-4a가 실비 조정 폼 제거하면 **1곳(잠정, §7)** |
| 오더정산 상세 `finance/order-settlement/[orderId]` (PR-4a 갱신 대상) | admin만 | admin | admin 전용 화면 |
| 오더 상세 `orders/[orderId]` → `OrderFinanceSummary` | 거부 | **허용 (run 경로로 전환, 항목1)** | 현재 `zen_order_costs`(`initialCosts`)에서 항목 수신 — 표시 소스를 run 단일 원천으로 교체. 라벨 "부가운임" |
| 일별 청구 `finance/daily-billing` (`ShipperDailyBillingClient`) | 거부 | 허용 | 부가운임 금액·항목명 표시 · PR-3 이후 UPS 자동인보이스 제외 |
| 인보이스 PDF (`invoice-generator`) | 거부 | 허용 | 항목 라벨 "부가운임" · PR-3 이후 UPS 경로 제외 |
| **청구서 화면 `finance/statements`·`statements/[id]`** | 거부 | **허용** | **항목명·금액 표시, 라벨 "부가운임" (Edward 결정 2026-11-26)** |
| **청구서 Excel `statement-excel(-data)`** | 거부 | **허용** | 위와 동일 (Edward 결정) |
| 부가운임 항목 조회 (가드) | 거부 | 허용 | 소유(화주/대리점) 또는 admin 검증 — `getOrderAdditionalCharges` (§3-1 결정) |
| `zen_ups_actual_charges` (관리자 초안 저장소) | — | 닫힘 | b375 정책 유지 (§6 4번·§8-1) |
| claims/statements 이외 statistics | 거부 | 허용(항목) | 표시 범위 확인 필요 |

- 오더 상세의 현재 구현: `orders/[orderId]/page.tsx`가 `zen_order_costs`를 조회해 `OrderFinanceSummary`에 `initialCosts`로 전달(`cost_type` 항목 라벨은 `getCostTypeLabel`) — **run을 읽지 않는 구조**이며 PR-4a 이후 변화는 §7 잠정 기재. (2026-11-26 직접 확인)
- **청구서 스냅샷 컬럼 표시(확정 필요)**: B-381 M2가 `zen_billing_statement_items`에 `freight_adjustment`·`charge_details` 스냅샷 컬럼을 추가했으나(M2 12~13행), 현재 `src`·`messages`의 화면 표시 코드는 **0건**(2026-11-26 확인) — 화주·대리점 표시 목표·라벨은 §5의 선택지에서 **Aiden·JSJung 확정 필요**.

## 3. 부가운임 항목별 표시안 비교

| 안 | 변경 | 장점 | 단점·위험 | 되돌리기 |
|:--|:--|:--|:--|:--|
| **A. 기존 항목 테이블 정책 수정 + 기존 조회 경로** | 정책 1건 + 화면/액션에 항목 조회 추가 | 항목명·금액 데이터 재사용, 원가 컬럼 없음 | 금액 통화 환산 필요, 다른 입력 경로 항목명 문제 잔존 | 정책 원복 |
| **B. 안전 뷰** | 뷰+GRANT+읽기 전환 | 컬럼 단위 통제 명확 | 변경 파일 많음, RLS/조인 영향, 환산 | 뷰 제거 |
| **C. 가드된 조회 함수 (권장)** | 소유/admin 검증 후 항목 DTO 반환(원가 제외, 인보이스 통화 환산) | 표시 금액 기준·통화·권한을 한 곳에서 통제 | 신규 액션/Ds-11·테스트 | 함수 제거 |

**권장: C**. `getOrderAdditionalCharges(orderId)`가 소유(화주/대리점) 또는 admin을 확인하고, 항목명·금액·통화를 **인보이스 통화로 환산한 표시 금액**으로 반환한다.
- 금액 기준: **화주 청구액 기준(인보이스 통화·적용 환율)**. 원가 통화는 서버에서만 사용.
- `zen_ups_actual_charges`는 #1441대로 닫고, 그 경로 항목은 aggregate 표시만 한다(항목명이 필요하면 별도 저장 구조 확장).

### 3-1. 갱신 결정 — 단일 원천 run(B-381), 환산 제거, 가드 조회 함수 유지 (항목1)

- **단일 원천: run** 으로 확정. 부가운임 항목은 `zen_ups_settlement_run_charges`(`line_no`·`name`·`amount`·`currency`)에 tier별로 보존된다(M1 `20261126090000_task_b381_ups_settlement_run.sql` 44~52행 직접 확인).
- **인보이스 통화 환산은 불필요** — `zen_ups_settlement_runs.currency`(16행)·`zen_ups_settlement_run_charges.currency`(52행)가 `CHECK (currency = 'KRW')` **고정**이고, 청구 스냅샷도 KRW 헤더 전제(M2 `20261126091000_task_b381_billing_items_amounts.sql`의 통화 가드 주석)다. 따라서 A안·C안에 있던 "인보이스 통화 환산" 단계는 이 갱신에서 **제거**한다.
- **가드 조회 함수는 필요하다** — 근거: ① `src/`의 run 직접 조회는 **0건**(`git grep zen_ups_settlement_run origin/TeamB_Dev -- src/`, `finalize_ups_settlement_run` RPC 호출만)이라 표시 DTO를 만들 경로가 없다. ② `zen_ups_settlement_run_amounts`에는 **원가 컬럼(`base_freight`·`fuel_surcharge`·`surge_fee`)이 포함**되므로(M1 31~41행), 표시 경로가 amounts를 읽으면 규칙 4 위반 위험이 있다 — **표시는 `run_charges`만으로 한정**한다(항목만, 원가 없음). ③ M1의 tier RLS(106·134·167행)는 행·tier 접근만 통제하고 **반환 DTO(어떤 컬럼을 내주는지)는 통제하지 않는다**. → 서버 액션 `getOrderAdditionalCharges(orderId)`에서 소유·admin 검증 후 `run_charges`의 `{line_no, name, amount, currency}`만 select·반환하는 구조로 확정(원가 미반환이 구조적 보장).
- **읽는 run 버전**: 해당 오더의 **최신 `version`** run을 읽는다 — 정산 재마감은 새 `version`을 만들고 같은 입력 재호출은 멱등으로 `version`을 만들지 않는다(M3 `20261126092000_task_b381_finalize_ups_settlement_run.sql` 119~123·153행 직접 확인). `run_charges`는 `run_id`·`tier` 기준이므로 최신 run의 자기 tier 항목만 반환한다.

## 4. 기존 부가운임 aggregate 행 처리

- 이 행은 **화주 청구용 부가운임 합계**이므로 숨기지 않는다(#1442 A안 폐기).
- 항목별 표시가 불가능하므로 aggregate 라벨은 **"부가운임"** 으로 중립화하고, 상세 항목은 C 함수로 조회한다.
- 부가운임은 표시 대상이므로 RLS 정책을 숨김 방향으로 바꾸지 않는다.

## 5. 라벨 중립화 (규칙 5)

- `getCostTypeLabel`에 audience 인자 추가 — 비관리자 "부가운임", 관리자 원문 유지.
- 적용: `OrderFinanceSummary`(isAdmin prop), `ShipperDailyBillingClient` breakdown, `pdf.ts`(발행 audience 전달), 인보이스 PDF 라인.
- i18n: `ko/en/zh/ja` 4로케일 `Finance.additionalCharge`(가칭) 추가. 관리자 화면 라벨 불변.
- **갱신 — 라벨 범위 재정의(항목4)**: 적용 대상은 §2 표의 "허용" 행 전체로 확정한다 — 화주·대리점 경로(오더 상세 `OrderFinanceSummary`, 일별 청구 `ShipperDailyBillingClient`, **청구서 화면 `finance/statements`, 청구서 Excel `statement-excel(-data)`**)는 전부 "부가운임", 관리자 경로(오더정산 상세·실비 조정 폼)는 원문 유지. **남는 경로** = 기존 행(비UPS `zen_order_costs`)과 §2의 "표시 범위 확인 필요" 행.
- **`freight_adjustment` 라벨 확인(근거, 한 줄)**: `src/lib/finance/settlement/cost-type-labels.ts`의 `COST_TYPE_LABELS`에 `FREIGHT_ADJUSTMENT`는 **미등재**라 fallback(`cost_type.replace(/_/g, ' ')`) 영문으로 노출되며, src·messages에 "운임 조정" 표기는 **0건**(2026-11-26 `git grep` 직접 확인) — 화주·대리점 경로에서는 §2의 원가 거부 대상이라 **규칙 5와 충돌하지 않는다**. 단, 관리자 경로의 영문 fallback도 "남는 경로"에 포함해 원문 라벨(가칭 "운임 조정") 처리를 §5에서 확정한다.
- **`freight_adjustment` 청구서 스냅샷 표시(항목4 보완 — Aiden·JSJung 확정 필요)**: M2가 `zen_billing_statement_items`에 `freight_adjustment`·`charge_details` 스냅샷을 추가했으나(M2 12~13·92·258행) 현재 화면 표시 코드는 **0건**. 화주·대리점 표시 목표·라벨은 **택일 미정**: **(a) 숨김** — 청구서 스냅샷은 관리자 집계용으로 표시하지 않음 / **(b) "부가운임" 합산** — `charge_details` 항목과 함께 부가운임으로 합산 표시 / **(c) 별도 라벨**(가칭 "운임 조정") — 규칙 5와의 관계 재검토. **확정 전까지 §2 청구서 행의 "허용"은 `charge_details` 항목명·금액 한정으로 읽는다.**

## 6. 이슈 #1449 A 구현 계획 (설계 확정 후)

1. 앱: `getUpsActualCost`에 admin 가드(SUPER_ADMIN·ADMIN·MANAGER) + `logger.warn`/`permission_denied`.
2. 마이그레이션(별도, **앱 배포 뒤 마지막**): `zen_ups_actual_cost`의 화주·대리점 SELECT 정책 제거.
3. 롤백 SQL: 정책 재생성 — 마이그레이션 파일에 포함.
4. **(갱신 — 항목3)** `zen_ups_actual_other_charges`(부가항목 입력·관리자 초안 저장소)의 **목표 상태는 admin 전용 입력·조회**로 정한다. 화주·대리점의 항목 표시는 이 테이블이 아니라 **run 경로(§3-1 `getOrderAdditionalCharges`)**가 맡는다 — 기존 서술의 "소유·admin 검증으로 화주에게 항목 조회" 방향은 폐기. 정책/가드 수정(별도)은 **admin 전용화** 기준으로 재작성.
5. 테스트 **(갱신 — 항목7)**: ① **RLS 매트릭스 재사용** — B-381 PR-1의 `tests/integration/task-b381-settlement-run-db.test.ts`(tier×역할) ② **신규 가드·정책은 실DB 세션 테스트**(`getOrderAdditionalCharges`: 소유·admin 통과 / 타 tier 거부 / 원가 컬럼 미반환, 되돌리기 포함) ③ **오더 상세 양성 대조(Edward 결정)** — 화주 자기 tier·대리점 자기 tier 항목 표시, 타 tier 0행, 원가 계열 미표시 ④ 비관리자 원가 미반환 / admin 3역할 읽기 / 함수별 되돌리기 / UI before-after(비공개 증적) + **R-10 UI 확인 대상에 오더 상세 화면 포함**.

## 7. DEF 보고 (R-18, 수정 금지)

- **DEF-B-165**: 일괄 마감의 역할·대상 조건 불일치와 거짓 성공.
- **DEF-B-166**: 마감 갱신 미반영 무시·이력 거짓 기록·부분 성공 경로.
- **(갱신 — 항목5, 잠정)** PR-3(#1549)·PR-4a(#1553)가 **병합 전**이므로 아래 값은 **잠정**이다: `getUpsActualCost` 실제 호출처 **2곳**(오더정산 상세, 실비 조정 폼) — PR-4a가 실비 조정 폼을 제거하면 **1곳**. DEF-B-165/166의 유효성(PR-3 fail-closed·PR-4a 개별 청구확정 제거 반영) 재측정은 **미실시(사유: 병합 후 확정 범위 — Jaison 알림 시점에 유효/부분해소/무효로 갱신)**.

## 8. Ds-11 / 마이그레이션 분리

- Ds-11: `getUpsActualCost` admin 전용, `getOrderAdditionalCharges`(신규 시), 원가/부가운임 조회 정책 설명 갱신.
- 마이그레이션 3개 분리: (1) 앱 배포, (2) 원가 테이블 화주·대리점 SELECT 정책 제거, (3) 부가운임 항목 조회 정책/가드 — 각 롤백 SQL 포함, 운영 선적용 순서 준수.

### 8-1. 정책 정리 3건의 적용 순서·롤백 (한 표 — T3 표 갱신 입력, 항목6)

| 순서 | 마이그레이션 | 대상 | 상태 | 롤백 | 비고 |
|:--:|:--|:--|:--|:--|:--|
| — | `20261123100000_task_b375_drop_shipper_agency_select_rls.sql` | `zen_ups_actual_charges`의 shipper·agency SELECT 정책 제거 | **완료**(2026-11-23 `TeamB_Dev` 병합, 파일 직접 확인) | `20260720000000_iss589_ups_actual_charges.sql`의 `shipper_agency_select` 재생성(파일 주석) | 대체 정책 없음·admin 정책 유지 |
| 2 | B-377 정책 마이그레이션 ① — **미작성**(설계 단계) | `zen_ups_actual_cost`의 화주·대리점 SELECT 정책 제거 | 설계 확정 후 작성 | **정책 재생성 SQL을 마이그레이션 파일에 포함**(§6 3번) | **"앱 배포 뒤 마지막" 원칙의 본체** |
| 2 | B-377 정책 마이그레이션 ② — **미작성**(설계 단계) | `zen_ups_actual_other_charges`의 `shipper_agency_select_other_charges` 정책 제거(§6 4번 항목3 admin 전용화) | 설계 확정 후 작성 | 정책 재생성 SQL 포함(예정) | **정책 변경 필요(근거): 현재 shipper·agency SELECT 정책이 존재함을 직접 확인**(`20260817100000_task_b317_actual_cost_schema.sql` 56행) |
| 3 | B-379 2/2 스냅샷 정책 교체 — **미작성** | 입고 실측 스냅샷 정책 | [#1453](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1453) `status:open`(설계 미확정) | 마이그레이션 포함(예정 — 미확인) | 설계 확정 후 확정 |

- **적용 순서 원칙**: (1) 앱 배포 → (2) B-377 정책 제거 → (3) B-379 2/2. b375(완료)는 참조선이며 남은 두 건은 각각 "앱 배포 뒤 마지막" 원칙을 따른다.

## 9. [작업 결과]

- 설계 의견. **구현·마이그레이션 없음**(설계 확정 전).
- 증빙 이미지는 현재 상태를 보여줄 수 있어 **저장소에서 제거하고 비공개 보관**한다(경로는 Jaison·Aiden에게 전달).
- 공개 기재 전수 점검 결과: 현재 상태 표·컬럼명·민감 표현 없음(사용 명령은 PR 코멘트 참조).
- PR: #1454 (draft, `Refs #1451`·`Refs #1449`) — after 스크린샷은 구현 단계에서 비공개 증적으로.
- **커밋 해시**: `1bb5b125a` (DEF-B-165/166 표현 정정 커밋). 해시 갱신 커밋 별도.
