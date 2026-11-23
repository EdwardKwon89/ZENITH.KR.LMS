# TASK-B-381 — Issue #1459: UPS 정산마감 부가운임의 화주·대리점 청구 자동 반영 (설계 의견, 5차)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) (TASK-B-377 / #1449 A 연장) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **설계 확정: JSJung·Aiden** |
| **상태** | 📝 설계 의견 5차 (`status:draft`) — **구현 금지** |
| **브랜치** | `feature/teamb-task-b381-iss1459-settlement-charge-design` (base `origin/TeamB_Dev` 83bb486f1) |
| **공개 저장소 주의** | 노출 경위·재현 절차는 쓰지 않고 "도달 가능/불가 + 코드 위치"만 기재 |
| **5차 반영** | JSJung: 컷오버 전 오더 **현행 유지**, 실비 화면 컷오버 전 유지, 컷오버일=설정값. Jaison 4차 보완 6건 + Aiden 6건 |

## 0. 범위·확정 결정

### 범위
- **컷오버일 이후 출고확정된 UPS 오더만** 이번 개편 대상이다.
- 컷오버 전 오더(기존 인보이스 보유)는 **현행 그대로** — 기존 액션·화면·인보이스·실비 등록을 변경하지 않는다.
- 컷오버 판정은 **#1369(TASK-B-363) 판정 함수를 재사용**하고, 이 Task는 호출만 한다. 인보이스 생성 중단도 #1369 범위다.

### JSJung 확정 (2026-11-23)
| # | 내용 |
|:-:|:--|
| 1 | **컷오버일 = 신규 기능 개발 완료·배포일**(미정). 코드 상수가 아닌 **설정값**으로 두고, 값이 없으면 신규 분기 비활성 |
| 2 | 컷오버 전 오더의 정산마감은 **현행 유지**. LEGACY 개편(cost_name·인보이스 RPC·legacy L·조정 인보이스 개선)은 **이 Task 범위 제외** |
| 3 | 컷오버 전 오더의 `UpsActualAdjustmentForm`·`recordUpsActualCharges`(실비 등록)는 **현행 유지**. 컷오버 후 오더에서만 거부/미노출 |
| 4 | 실비는 컷오버 후 오더에서 **정산마감을 통해서만** 등록 |
| 5 | MANAGER는 RPC에서 **ADMIN·MANAGER·ZENITH_SUPER_ADMIN** 허용(#1463 정책과 무관하게 DEFINER) |
| 6 | append-only·RPC 원자성·음수 행(admin)·항목별 반올림·출고확정일 환율·A도 재계산은 유지 |
| 7 | 새 DEF 번호는 **DEF-B-169부터**(Baker는 168 사용) |

---

## 1. 실측 (실DB, 2026-11-23)

### 1-1. 방법과 한계

- 로컬 Supabase + `TeamB_Dev` 마이그레이션. 서버 액션은 `validateUserAction`만 ADMIN stub + **service-role 실연결**, `estimateUpsFreight`는 stub.
- statement 측정은 실제 SQL 함수(`billing_items_amounts`·`create_billing_statement_with_items`)를 실DB에서 호출(ADMIN JWT).
- **RLS 역할별 허용/거부는 미측정**(정책은 `pg_policies` 정의만 확인). 픽스처는 측정 후 삭제.

### 1-2. 청구서(statement) 금액 — 이번 설계의 핵심

픽스처: UPS `DELIVERED`·`SETTLED`, 스냅샷(platform 250/30/10/10, agency 200/20/5/5, `agencyCostPrice=180`, `billingWeightKg=10`, USD), 원장(250/30/10/10 + ADJ 40 + SETTLEMENT 30).

| 측정 | 결과 |
|:--|:--|
| `billing_items_amounts(..., 'AGENCY_TO_SHIPPER')` | 250 / 30 / 10 / **80** / **370**, `charge_weight_kg=10` |
| `billing_items_amounts(..., 'ADMIN_TO_AGENCY')` | 200 / 20 / 5 / **5** / **230**, `charge_weight_kg=10` |
| 화주 `other_charges` | **ADJ 40 + OTHER 10 + SETTLEMENT 30 = 80** → **ADJ가 "기타 부가운임"에 혼입** |
| 대리점 tier | 스냅샷만 읽음 → **ADJ·부가운임 미반영** |
| 청구중량 | 스냅샷 `billingWeightKg=10` 우선 → `actual_weight_kg=12`도 **10 유지** |
| 통화 | USD 원장 → **`unsupported_cost_currency`** 실패, KRW → 생성 성공 |
| 인보이스 대조 | 대리점 인보이스 `agencyCostPrice`(180) vs statement 230 → **50 차이**, 화주는 **USD vs KRW 단위 불일치** |

### 1-3. 컷오버 전(레거시) 현행 — 수정하지 않고 DEF로 기록

| 경로 | 실측 결과 | DEF |
|:--|:--|:--|
| A `recordActualCostAndFinalize` | 중량 10 저장, **재계산 없음**, 총액 80으로 마감 | **DEF-B-169** |
| B `recordUpsActualCost` | 기타 50 HKD 청구 미반영, `zen_ups_actual_other_charges` 0행(항목명 소실) | **DEF-B-170** |
| C `recordUpsActualCharges` | 2회차 `ADJUSTMENT_UPDATE` 실패 | **DEF-B-167** 링크 |
| `rejectInvoice` | 연결 해제 UPDATE가 불변 트리거에 차단(오류 미확인) 가능성 | **DEF-B-168** 링크(Baker 브랜치) |

- 연결 행 불변 트리거(`trg_prevent_cost_change_after_invoice`)는 운영에서도 활성(Aiden 읽기 전용 조회).

---

## 2. [설계 의견]

### 2-1. 컷오버 분기 구조 — legacy 무변경

| 안 | 내용 | 장점 | 단점 |
|:--|:--|:--|:--|
| **(A) 화면/라우트 분기 (권장·채택)** | 컷오버 판정으로 **컷오버 전=기존 화면·기존 액션 그대로**, 컷오버 후=신규 `finalizeUpsSettlement`·신규 화면 | legacy 회귀 0, 책임 분리 | 컴포넌트 2개 |
| (B) 단일 액션 내 분기 | 신규 액션이 legacy 액션을 내부 호출 | 진입점 1개 | 중첩 호출·부분 상태, 결국 legacy UI도 필요 |

- **LEGACY 개편 범위 비교(JSJung 결정으로 (A) 채택)**

| 항목 | LEGACY 무변경 (채택) | LEGACY에도 규칙 적용 (미채택) |
|:--|:--|:--|
| `cost_name` 컬럼 | **없음** | 필요 |
| 인보이스 RPC·마감 | **없음** | 필요 |
| legacy `L` 총액식 | **없음** | 필요 |
| 통화 다른 두 인보이스 환산 | **없음** | 필요 |
| 마감 후 조정 인보이스 개선 | **없음** | 필요 |
| #1369 "기존 인보이스 그대로" | 일치 | 충돌 |
| 결함 | DEF-B-169·170으로 기록 | 이 Task에서 수정 |

- 컷오버 전 `UPS_ACTUAL_ADJUSTMENT` 행은 legacy 인보이스에만 연결되고, **컷오버 전 오더는 statement 대상 제외(#1369)** 이므로 충돌하지 않는다.

### 2-2. 컷오버일 설정·경계

- 저장: `zen_system_settings.setting_key = 'ups_settlement_cutover_date'`(YYYY-MM-DD), 값·`updated_at`으로 이력. (기존 설정 패턴)
- **값이 없거나 파싱 실패 → 신규 분기 비활성**(legacy 라우팅).
- 판정: **출고확정일 ≥ 컷오버일**이면 신규 경로(제안). 최종 경계는 #1369 함수가 결정하며 이 Task는 호출만.
- 경계 테스트: 컷오버 당일·전일, 출고확정 취소·변경, 컷오버 직전 정산 시작(in-flight), 설정값 없음/잘못된 값.
- 배포 순서의 **마지막 단계에서 설정값을 기록**한다(그 전에는 신규 분기 비활성).

### 2-3. 컷오버 후 통합 정산마감 `finalizeUpsSettlement` (신규 전용)

| # | 단계 | 내용 |
|:-:|:--|:--|
| 1 | 가드 | admin 3역할(세션), UPS·`DELIVERED`·미정산, **컷오버 후·설정값 존재** 확인. 컷오버 전이면 `legacy_order` 반환(신규 액션 비활성) |
| 2 | 인보이스 방어 | 컷오버 후 오더에 인보이스가 있으면 `unexpected_legacy_invoice` 거부 |
| 3 | 원가 저장 | `zen_ups_actual_cost` upsert(현행 계산·환율 로직 재사용) |
| 4 | 매출 재계산 | 입력 중량·치수로 `recomputeRevenue` — **A·B 구분 없이** 수행(규칙 2) |
| 5 | 환산·반올림 | 부가운임 항목별 **KRW** 환산(출고확정일), 항목별 2자리 반올림 |
| 6 | RPC 1회 | `finalize_ups_settlement_run`: run(version)+amounts+charges 저장 + 주문 `SETTLED` **한 트랜잭션** |
| 7 | 후속 | 알림(best-effort), revalidate |

**반영 시점 (명시)**

| 단계 | 원가 | run/청구 | 청구서 | 화주 노출 |
|:--|:--|:--|:--|:--|
| 임시저장(`saveUpsSettlementDraft`) | O | **X** | X | 기존 금액만 |
| 정산 완료(`finalizeUpsSettlement`) | O(재사용) | **O** | statement 생성 시 반영 | 청구서 생성 후 |

- 대안(임시저장 시점 반영)은 초안 금액 노출·불변 트리거 때문에 음수 행에 의존한다. **정산 완료 시점 반영 권장** → §3 #1(JSJung 확인).
- 원가 저장(3)은 RPC 밖이다. RPC 실패 시 원가만 남지만 **청구·상태가 변하지 않아 재사용 가능한 임시저장**이다(DEF-B-166(b)의 "마감 이력 거짓 기록"과 다름).

### 2-4. 청구서 금액 원천 — 해결안 비교

| 안 | 내용 | 장점 | 단점·위험 |
|:--|:--|:--|:--|
| (a) 스냅샷 반영 | 정산 결과를 `zen_order_rate_snapshots.metadata`에 기록 | 함수 변경 최소 | 감사 스냅샷 변조, tier·항목명 부적합, ADJ 분류 불가 |
| (b) 기존 원장 읽기 변경 | `billing_items_amounts`가 `zen_order_costs`·`actual_weight_kg`·tier 태깅을 읽게 | 새 저장소 없음 | tier 컬럼 필요, 대리점 금액 부재, legacy 이중 계산 위험 |
| **(c) 정산 결과 단일 저장소 (권장)** | `zen_ups_settlement_runs(+amounts,+charges)`에 tier별·항목별·KRW 스냅샷. `billing_items_amounts`가 최신 run 우선 | 규칙 2·3·4·6 한 곳, legacy 무변경 | 신규 테이블·함수 변경, #1453 조율 |

**권장: (c)**. **#1453(Baker) 조율**: 같은 `billing_items_amounts`를 변경하므로 B-379 접근 경로 변경을 먼저/하나의 마이그레이션으로 반영하고, B-381은 "run 우선 + legacy 폴백" 분기를 그 위에 얹는 순서. `#1453`에 조율 코멘트 게시(2026-11-23), **회신 대기**.

### 2-5. 정산 run 저장소

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

- **tier 매핑**: `ADMIN_TO_AGENCY`(대리점 청구), `SHIPPER`(화주 청구). `billing_items_amounts`는 요청 tier가 `ADMIN_TO_AGENCY`면 agency, `AGENCY_TO_SHIPPER`·`ADMIN_TO_SHIPPER`면 shipper 행을 읽는다. **한 SHIPPER 행이 두 발행자 tier를 처리**한다.
  - 근거: `src/lib/ups/shipper-pricing.ts:1~5` — "Admin 판매가에서 Zone별 할인율로 직접 계산(Agency 원가 경유 안 함)", `finalFreight = discountedBase + fuel + other + surge`. 대리점 마진은 `agencyCostPrice`와 플랫폼가의 차이로, 화주 금액에 가산되지 않는다.
- **append-only 버전**: 재정산은 새 version 추가(기존 run 불변). **같은 입력 2회**: 최신 run과 계산 결과(정렬된 name+amount 목록 포함)가 동일하면 **새 version 미생성**.
- **금액 분해**: `freight_adjustment = target - (base+fuel+surge+other)`(음수 가능). ADJ를 "기타 부가운임"에 섞지 않는다. breakdown이 없으면 `base=target`, 나머지 0, 차액은 adjustment.
- `settlement_charges_total` = charges 합(항목별 반올림 후). charge amount **음수 허용(admin)**. `line_total = base+fuel+surge+other+freight_adjustment+charges`.
- **통화**: run 금액은 **KRW**. 입력 통화는 출고확정일 환율로 환산, 항목별 반올림.

### 2-6. run RLS — tier 단위 분리 (필수·보안)

`run_amounts`·`run_charges` SELECT 정책:

| 역할 | 허용 행 |
|:--|:--|
| ADMIN·ZENITH_SUPER_ADMIN·MANAGER | 전체 |
| AGENCY | 자기 오더(`order.agency_org_id = 내 org`)의 **`ADMIN_TO_AGENCY`**(자기 매입가) + **`SHIPPER`** 행 |
| SHIPPER | 자기 오더(`order.shipper_id = 내 org`)의 **`SHIPPER` 행만** — `ADMIN_TO_AGENCY` **0건** |
| anon | 0건 |

- `runs` 헤더도 같은 오더 소유 조건으로 제한(금액 없음).
- `billing_items_amounts`는 **SECURITY INVOKER 유지**. 대리점이 소속 화주 statement를 만들 때 `SHIPPER` 행을 읽고, 화주는 agency 행을 읽지 못한다.
- **세션 매트릭스 테스트**: SHIPPER가 `ADMIN_TO_AGENCY` 0건(양성 대조: 자기 SHIPPER 행 1건), AGENCY가 두 tier, ADMIN 전체, anon 0. 결과표만 문서화(재현 절차 없음).

### 2-7. `billing_items_amounts` + 청구서 항목

- 최신 run이 있으면 run 금액 반환(KRW, `charge_weight_kg`=run 값). 반환 컬럼 추가: `freight_adjustment numeric`, `charge_details jsonb`.
  - `other_charges` = run `other_charges` + `settlement_charges_total`, `line_total` = base+fuel+surge+other+freight_adjustment+charges.
- run이 없으면 **현행 로직 폴백**(legacy: `zen_order_costs`/스냅샷, `unsupported_cost_currency` 유지, `freight_adjustment=0`, `charge_details=null`). **legacy 값 동일성 회귀 테스트 필수**.
- **run 경로에서는 비KRW 원장 통화 가드를 우회**한다(함수가 원장을 읽지 않으므로). `create_billing_statement_with_items`의 통화 가드도 **run 존재 시 우회**하도록 함께 변경(현재는 원장을 직접 검사).
- `zen_billing_statement_items` 컬럼 추가: `freight_adjustment numeric not null default 0`, `charge_details jsonb null`.
- 표시: `other_charges`는 기타+부가운임 합, `charge_details`로 항목명, `freight_adjustment`는 "운임 조정" 별도 라인. `line_total` 불변식 유지.

### 2-8. 항목명·중복·ADJ·라벨

- **같은 이름 중복 허용**: `run_charges`는 `id` PK + `line_no`, 이름 unique 없음. 같은 이름 2건은 2행으로 저장하고 합계를 낸다(항목별 반올림 불변식 유지). 표시는 이름별 그룹(선택).
- **ADJ 분류**: run 경로의 ADJ는 `freight_adjustment`(운임 조정)로 분리. legacy 폴백은 현행 유지.
- **라벨**:

| cost_type | 라벨(화주·대리점) |
|:--|:--|
| `SETTLEMENT_CHARGE` | **부가운임** |
| `OTHER_CHARGE` | 기타 부가운임 |
| `UPS_ACTUAL_COST_ADJ` | **운임 조정** |
| `UPS_ACTUAL_ADJUSTMENT`(legacy) | 부가운임(정산) |

- #1451(B-377) 라벨 표에 `UPS_ACTUAL_COST_ADJ`가 없다 → **두 task file 동시 갱신 필요**(이 Task 제안: "운임 조정").
- **표시 소스**: 컷오버 후 오더는 run(amounts+charges), 컷오버 전은 기존 `zen_order_costs`. B-377 표시 설계는 두 소스를 지원해야 한다(§2-13).

### 2-9. 실비 등록 경로 (컷오버 전 유지·후 거부)

| 대상 | 컷오버 전 오더 | 컷오버 후 오더 |
|:--|:--|:--|
| `recordUpsActualCharges` | **현행 유지**(쓰기 허용, 폐기 오류 없음) | **거부**(`use_settlement_path`) |
| `UpsActualAdjustmentForm` | **현행 유지**(admin 가드) | **미노출** |
| `zen_ups_actual_charges` | 유지·이력 | 읽기 전용(과거) |
| `UPS_ACTUAL_ADJUSTMENT` | legacy 인보이스 연결 유지 | 신규 생성 없음 |

- 판정은 #1369 함수(설정값) 재사용. #1440 admin 가드·#1441 정책 제거는 유지(권한 확대 금지).
- **테이블 DROP((b)안)은 범위 제외** — 컷오버 전 오더가 계속 사용.

### 2-10. 레거시 기능 정리표

| 기능 | 컷오버 전 | 컷오버 후 | 비고 |
|:--|:--|:--|:--|
| `BillingConfirmModal`·`finalizeDailyShipperInvoices` | 유지 | 미사용 | legacy 인보이스 |
| `OrderSettlementDetail`(기존 동작) | 유지 | 신규 화면으로 라우팅 | (A)안 |
| `recordUpsActualCost`·`recordActualCostAndFinalize`·`markOrderCostSettled` | 유지 | 미사용 | legacy 결함은 DEF |
| `recordUpsActualCharges`·`UpsActualAdjustmentForm` | 유지 | 거부/미노출 | §2-9 |
| `finalizeUpsSettlement`(신규) | 비활성 | 사용 | post-cutover 전용 |
| `/finance/statements` | **컷오버 전 오더 제외**(#1369 정책) | 사용 | legacy 폴백 회귀 테스트 |
| `/finance/daily-billing` | 유지 | 미사용 | legacy |

- **호출처 grep(2026-11-23)**: `recordActualCostAndFinalize`→`BillingConfirmModal.tsx:6,118`; `recordUpsActualCost`→`OrderSettlementDetail.tsx:15,192`·`UpsActualAdjustmentForm.tsx:5,143`; `previewUpsActualCost`→3개 컴포넌트; `recordUpsActualCharges`→`UpsActualAdjustmentForm.tsx:4,243`; `markOrderCostSettled`→`OrderSettlementDetail.tsx:16,213`·`finance/index.ts:36`; `BillingConfirmModal`→`ShipperDailyBillingClient.tsx:28,693`; `UpsActualAdjustmentForm`→admin client·orders page; `OrderSettlementDetail`→`finance/order-settlement/[orderId]/page.tsx:8,159`.

### 2-11. 청구서 발행 후·정산 해제

| 시점 | 청구서 상태 | 정산 해제 | 부가운임 변경 |
|:--|:--|:--|:--|
| 정산 완료 전 | — | — | 임시저장만 |
| 정산 완료 후·statement 생성 전 | 없음 | 허용(상태만, run 이력 유지) | 재정산 시 새 run version |
| statement 생성 후 | `zen_billing_statement_items` 포함 | **차단**(`statement_includes_order`) | **불가**(unique(order_id,tier)) |
| statement 발행 후 | `issued` 등 | 차단 | 불가 → 새 차수/조정은 후속 Task |

- 청구서는 발행 시점 스냅샷이며 같은 오더·tier는 1회만 포함 → **정산이 청구서 생성보다 먼저 확정**되어야 한다.

### 2-12. RPC — `finalize_ups_settlement_run`

**보안**
- `SECURITY DEFINER`, `SET search_path = public`.
- `REVOKE ALL ... FROM PUBLIC, anon` → `GRANT EXECUTE ... TO authenticated`.
- 내부에서 `auth.uid()`로 `zen_profiles.role` 검사: **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**. actor 파라미터 없음.
- 앱은 **세션 클라이언트**로 호출(admin client 금지).
- 테스트: SHIPPER·AGENCY·anon 직접 호출 거부, ADMIN·MANAGER 양성 대조.

**상태·원자성**
- `SETTLED` 이미면 거부, UPS·DELIVERED·컷오버 후·설정값 확인.
- run+amounts+charges+주문 `SETTLED`를 **한 트랜잭션** → 부분 실패 없음.
- 컷오버 전/설정값 없음이면 `legacy_order`(방어), 인보이스 존재 시 `unexpected_legacy_invoice`.
- **MANAGER 의존성**:

| 단계 | 클라이언트 | RLS 의존 |
|:--|:--|:--|
| 원가 저장(`zen_ups_actual_cost`·`zen_ups_actual_other_charges`) | 세션 | 두 테이블 `admin_manager_all`에 MANAGER 포함(정책 정의 확인) |
| run RPC | 세션 | DEFINER + `auth.uid()` → RLS 무관, MANAGER 동작 |
| statement 생성(별도 흐름) | 세션 | 기존 정책(#1463과 무관) |

### 2-13. B-377(#1451)·B-382(#1463) 정합

- **B-377**: 컷오버 후 표시 소스가 `zen_order_costs`가 아니라 run이므로 B-377의 `cost_name`·가드 함수 가정을 **다시 써야 한다**.
  - 일정: B-381 설계 확정 → B-377이 run 소스로 표시 설계 갱신(PR #1454) → 구현은 B-381 run API 확정 후. 두 task file을 함께 갱신. #1451에 일정 코멘트.
- **B-382**: 이 Task는 정책을 바꾸지 않는다. DEFINER RPC·`zen_order_costs` INSERT 전용으로 B-382의 UPDATE/DELETE 근거가 줄어 재산정 필요(Jaison이 #1463에 전달). DEF-B-168은 Baker 브랜치 사용.

### 2-14. R-11·Ds-11

- 신규/변경: `finalizeUpsSettlement`, `saveUpsSettlementDraft`, `previewUpsSettlement`, RPC `finalize_ups_settlement_run`, `billing_items_amounts`(컬럼 추가).
- 입력: UPS 인보이스 정보·중량/치수·원가 항목·부가운임 항목(음수 허용)·사유.
- 출력: `{success, settled, runVersion, statementPreview:{tier,base,fuel,surge,other,freightAdjustment,charges,total,weightKg}[], recalculated, error}`.
- 오류: `permission_denied`·`order_not_found`·`not_ups_order`·`ups_actual_cost_status_invalid`·`already_settled`·`legacy_order`·`unexpected_legacy_invoice`·`currency_conversion_failed`·`rpc_failed`.
- Ds-11: `Ds_11_11B_UPS_Agency_Actuals.md`, `Ds_11_04_Finance_Settlement.md`, 인덱스. 구현 PR에서 갱신(R-12).

### 2-15. 테스트 계획

**신규(path)**
1. 컷오버 후 정산 완료 → run 양 tier 값, `charge_weight_kg`=재계산 중량, `billing_items_amounts` 일치.
2. ADJ `freight_adjustment` 분리, `other_charges`에 미혼입.
3. `charge_details` 항목명·금액(항목별 반올림 합=총액), **같은 이름 2건** 2행·합계.
4. 비KRW 원장이어도 run 경로 statement 생성 성공, legacy 폴백은 현행 차단 유지.
5. 같은 입력 2회 → 새 version 미생성·금액 불변.
6. run RLS 매트릭스(SHIPPER agency 0건, AGENCY 2 tier, ADMIN 전체, anon 0).
7. RPC 보안·원자성(부분 실패 롤백).
8. 컷오버 경계: 당일·전일, 설정값 없음/오류, 출고확정 취소·변경, in-flight.
9. 컷오버 전 오더: 신규 액션 `legacy_order`, 기존 화면·액션 무변경(스모크).
10. legacy 폴백 `billing_items_amounts` 값이 변경 전과 동일(회귀).

**표시·연계**
11. B-377 표시(컷오버 후 run 소스, 항목명·운임 조정 라벨).
12. before/after 스크린샷, 기존 화면 무회귀.
13. `npm run test:regression` PASS.

### 2-16. 마이그레이션·배포 순서

| # | 내용 | 시점 | 롤백 |
|:-:|:--|:--|:--|
| M1 | run 3테이블 + RLS(tier 분리) | 앱 배포 전 | DROP TABLE |
| M2 | `billing_items_amounts` run 분기 + `create_billing_statement_with_items` 통화 가드 우회 + `zen_billing_statement_items`(`freight_adjustment`·`charge_details`) | **#1453 조율 후**, 앱 배포 전 | 함수/컬럼 원복 |
| M3 | RPC `finalize_ups_settlement_run`(보안 GRANT 포함) | 앱 배포 전 | DROP FUNCTION |

**배포 순서**
1. Ds-11 확정.
2. **#1369(판정 함수·인보이스 생성 중단) 선행** — 이 Task는 의존.
3. M1·M2·M3 배포(추가형, 기존 앱 무영향).
4. 앱: 신규 화면·액션 추가(컷오버 설정값이 없어 **비활성**).
5. 배포 후 **마지막에 `ups_settlement_cutover_date` 설정** → 신규 분기 활성.
6. B-377 표시 갱신.

- 컷오버 전 오더는 `billing_items_amounts` legacy 폴백으로 현행 동작 유지(회귀 필수). 컷오버 후 오더만 run 경로.
- 진행 중 legacy draft/인보이스는 무변경.

---

## 3. 남은 확인 항목

| # | 항목 | 상태 |
|:-:|:--|:--|
| 1 | **반영 시점**(임시저장 vs 정산 완료) | **JSJung 확인**. 권장=정산 완료 시점 |
| 2 | **컷오버일 값·경계 포함 여부(`>=`)** | **JSJung/#1369**. 값은 배포 마지막에 설정 |
| 3 | `billing_items_amounts` 변경 순서 | **#1453(Baker) 회신 대기** — 2026-11-23 코멘트 |
| 4 | B-377 표시 설계 갱신 일정 | B-381 확정 후 B-377이 run 소스로 갱신(#1451 코멘트) |
| 5 | statement 발행 후 금액 변경 | **불가**(unique). 후속 Task |
| 6 | run 항목명 표시 그룹화(같은 이름) | UI 결정(합계/개별) |
| 7 | 운영 데이터 | Aiden 읽기 전용 조회(0건·연결 18·트리거 활성), Jaison 미검증 |

---

## 4. 관련 DEF (R-18, 수정 금지·보고만)

| DEF | 내용 | 상태 |
|:--|:--|:--|
| **DEF-B-169** | A 경로 중량 변경 시 재계산 없음 | **이 브랜치 신규** |
| **DEF-B-170** | B 경로 부가운임 청구 미반영·항목명 소실 | **이 브랜치 신규** |
| **DEF-B-167** | 연결 비용 행 불변 트리거 + 재정산 오류 미확인(C 재등록 실패 포함) | 이 브랜치(링크) |
| **DEF-B-168** | `rejectInvoice` 원가 연결 해제 조용한 실패 | Baker 브랜치(PR #1465) — 링크 |
| **DEF-B-165·166** | 일괄 마감·`markInvoiceFinalized` 결함 | TASK-B-377 브랜치(PR #1454) — 링크 |

## 5. [작업 결과]

- **설계 의견 5차**: 컷오버 후 전용으로 범위 축소(컷오버 전 현행 유지). Jaison 4차 보완 6건 + Aiden 6건 + JSJung 결정 반영.
- 신규 DEF-B-169·170 등록, 167·168·165·166 링크.
- run RLS tier 분리·중복 항목 허용·컷오버 설정값·#1369 선행·B-377 정합 일정 반영.
- 코드·마이그레이션 변경 없음.
- PR: #1462 (draft, `Refs #1459`, `Refs #1451`, `Refs #1453`, `Refs #1463`).
