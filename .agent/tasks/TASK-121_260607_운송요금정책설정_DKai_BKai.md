# TASK-121 — 운송수단별 요금 산정 정책 설정 기능

> **생성일**: 2026-06-07
> **발령자**: Aiden (Claude)
> **담당 Agent**: D_Kai (DB 스키마) + Riley (비용 산정 엔진·회귀 테스트) + B_Kai (Admin UI·RateTierEditor)
> **우선순위**: P2
> **전제조건**: TASK-120 ✅ (Phase 6 회귀 안정 확인 후 착수 권장)
> **IMP 연계**: IMP-105 (신규)

---

## 배경 및 목적

현재 `zen_rate_cards.tiers`는 `weight_min` / `unit_price(per kg)` / `min_total_price` 만 존재하며, **부피(CBM) 기반 요금 산정이 불가**하다.

국제 화물 표준 운임 산정 방식:

| 운송수단 | 표준 방식 | 설명 |
|:-------|:---------|:----|
| AIR | VOLUMETRIC | 부피중량(CBM × 1,000,000 ÷ divisor) vs 실중량 중 높은 쪽으로 weight tier 적용. AIR divisor = 6,000 |
| EXP | VOLUMETRIC | 동일 방식. EXP divisor = 5,000 |
| SEA | WM | 중량단가(per kg) vs 용적단가(per CBM) 각각 산출 후 높은 쪽 채택 |
| LAND | WM | 동일 방식 |

본 태스크는 운송수단별 산정 정책을 **Admin이 DB에서 직접 설정·변경**할 수 있는 기능을 구현한다.

---

## Agent별 역할 분담

| Agent | 담당 범위 | 착수 조건 |
|:------|:---------|:---------|
| **D_Kai** | §1 DB 마이그레이션 (`zen_transport_pricing_policies` + tiers cbm_price 확장 + RLS) | 즉시 (설계 의견 📝 제출 후 🔍 확정 대기) |
| **Riley** | §3 비용 산정 엔진 수정 (`calculate_order_costs` VOLUMETRIC/WM 분기) + §5 TC-POLICY-01~05 회귀 테스트 | D_Kai DB 마이그레이션 완료 후 |
| **B_Kai** | §2 Admin UI (`/admin/settings/transport-policies`) + §4 `RateTierEditor` cbm_price 필드 추가 | D_Kai DB 마이그레이션 완료 후 |

> **Riley 선정 근거**: Composite Pricing Engine(TASK-076) 구현자 + TISA 3계층 요율 매핑(TASK-092) 경험. `calculate_order_costs` 엔진 구조를 가장 잘 이해하는 Agent.

**착수 순서**:
```
D_Kai: DB 스키마 📝→🔍→🔄 (완료)
         ↓
Riley (엔진·테스트) ┐ 병렬 착수
B_Kai (UI)          ┘
```

---

## 구현 범위

### 1. DB 마이그레이션

**신규 테이블 `zen_transport_pricing_policies`**:

```sql
CREATE TABLE zen_transport_pricing_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_mode  TEXT NOT NULL UNIQUE CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
  pricing_method  TEXT NOT NULL CHECK (pricing_method IN ('WEIGHT_ONLY','VOLUMETRIC','WM')),
  volumetric_divisor INTEGER,          -- VOLUMETRIC 방식 전용 (AIR=6000, EXP=5000)
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID REFERENCES zen_profiles(id)
);
```

**기본 데이터 (INSERT)**:

| transport_mode | pricing_method | volumetric_divisor | description |
|:----|:----|:----:|:----|
| AIR | VOLUMETRIC | 6000 | IATA 항공 부피중량 기준 (L×W×H cm³ ÷ 6,000) |
| EXP | VOLUMETRIC | 5000 | 특송 부피중량 기준 (L×W×H cm³ ÷ 5,000) |
| SEA | WM | null | 해운 W/M 방식 (중량 vs 용적 병산) |
| LAND | WM | null | 육상 W/M 방식 (중량 vs 용적 병산) |

**`zen_rate_cards.tiers` JSONB 확장** (WM 방식 전용):
- 기존: `{ weight_min, unit_price, min_total_price }`
- 확장: `{ weight_min, unit_price, cbm_price, min_total_price }`
- `cbm_price`: SEA/LAND 카드에만 입력. AIR/EXP는 null 허용.

RLS: ADMIN만 INSERT/UPDATE/DELETE, 전 역할 SELECT.

---

### 2. Admin 설정 화면

**경로**: `/admin/settings/transport-policies`

**화면 구성**:
- 페이지 제목: "운송 요금 산정 정책"
- 설명: "운송수단별 요금 산정 방식을 설정합니다. 변경 즉시 신규 오더 비용 산정에 적용됩니다."
- 4행 고정 테이블 (AIR / EXP / SEA / LAND — 행 추가/삭제 불가, 수정만 허용)

**테이블 컬럼**:

| 컬럼 | 내용 |
|:----|:----|
| 운송수단 | AIR / EXP / SEA / LAND (수정 불가) |
| 산정 방식 | WEIGHT_ONLY / VOLUMETRIC / WM select |
| 부피중량 제수 | VOLUMETRIC 선택 시만 활성화 (숫자 입력, 기본 AIR=6000 / EXP=5000) |
| 설명 | 자유 텍스트 |
| 마지막 수정 | 수정자 + 수정일시 |
| 저장 | 행별 "저장" 버튼 |

**디자인**: 운송 서비스 요율 목록과 동일 패턴 (ZenDataGrid 인라인 수정 또는 행별 모달)

**사이드바 위치**: `기본정보` 하위 메뉴 → `{ title: "요금 산정 정책", href: "/admin/settings/transport-policies" }` (ADMIN only)

---

### 3. 비용 산정 엔진 수정

**대상 함수**: `calculate_order_costs(order_id UUID)` (PostgreSQL stored function)

**수정 로직**:
```
-- 운송 요율 산정 시
1. zen_transport_pricing_policies에서 transport_mode의 policy 조회
2. WEIGHT_ONLY → 기존 로직 유지 (실중량 × weight tier)
3. VOLUMETRIC → chargeable_weight = MAX(actual_weight_kg, cargo_cbm * 1,000,000 / divisor)
               → chargeable_weight로 weight tier 적용
4. WM → weight_cost = actual_weight_kg × tier.unit_price
        cbm_cost = cargo_cbm × tier.cbm_price
        → MAX(weight_cost, cbm_cost) 채택
```

**영향 함수**: `fn_get_best_matching_rate` 포함 검토 필요.

---

### 4. RateTierEditor UI 수정

**대상 파일**: `src/components/admin/RateTierEditor.tsx`

WM 방식 카드 등록 시 `cbm_price` 입력 필드 추가:
- `RateCardForm`이 현재 선택된 `serviceType`을 `RateTierEditor`에 전달
- SEA / LAND 선택 시 각 tier 행에 `CBM단가` 컬럼 표시
- AIR / EXP 선택 시 `CBM단가` 컬럼 숨김

---

### 5. 회귀 테스트 케이스 추가

`LIVE_REGRESSION_TEST_MAP.md` 에 아래 항목 추가:

| TC-ID | 시나리오 | 기대 결과 |
|:------|:--------|:---------|
| TC-POLICY-01 | AIR 오더 부피중량 > 실중량 시 비용 산정 | 부피중량 기준 tier 적용 |
| TC-POLICY-02 | AIR 오더 실중량 > 부피중량 시 비용 산정 | 실중량 기준 tier 적용 |
| TC-POLICY-03 | SEA 오더 중량단가 > 용적단가 시 | 중량단가 채택 |
| TC-POLICY-04 | SEA 오더 용적단가 > 중량단가 시 | 용적단가 채택 |
| TC-POLICY-05 | Admin 정책 VOLUMETRIC→WM 변경 후 오더 산정 | 변경된 방식 즉시 반영 |

---

## 착수 절차 (R-17)

- **복잡도 판단**: 복잡 Task (DB·엔진·UI 3영역 + 기존 함수 영향도 분석 필요)
- **권장 경로**: ⬜ → 📝(설계 의견 제출) → 🔍(Aiden 확정) → 🔄

**D_Kai 착수 전 필수 확인**:
1. `fn_get_best_matching_rate` 영향도 분석 (`gitnexus_impact` 실행)
2. WM 방식 시 `tier.cbm_price` null 처리 — 기존 AIR/EXP 데이터 호환 전략 명시
3. RLS 정책: ADMIN INSERT/UPDATE/DELETE, 전 역할 SELECT

**Riley 착수 전 필수 확인**:
1. `calculate_order_costs` 현재 구현 전체 독해 (TASK-076 이후 변경분 포함)
2. `cargo_cbm` 필드가 `zen_orders`에 존재하는지 확인 → 없으면 D_Kai에게 마이그레이션 요청
3. `fn_get_best_matching_rate` → `calculate_order_costs` 호출 체인 파악

**B_Kai 착수 조건**: D_Kai `[설계 확정]` 이후 Admin UI 착수 (DB 스키마 확정 전 UI 착수 금지)

---

## DoD (완료 기준)

- [x] `zen_transport_pricing_policies` 테이블 생성 + 기본 4행 seed 완료 (`bb81021` — D_Kai)
- [x] `zen_rate_cards.tiers` JSONB에 `cbm_price` 필드 지원 (기존 데이터 호환) (`bb81021` — D_Kai)
- [x] `/admin/settings/transport-policies` 화면 구현 + ADMIN 권한 접근 확인 (`5171675` — B_Kai)
- [x] `calculate_order_costs` VOLUMETRIC / WM 분기 처리 구현 (`723db3e` — D_Kai·Riley→D_Kai 재배정)
- [x] `RateTierEditor` SEA/LAND 시 `cbm_price` 입력 필드 표시 (`0d428a3` — B_Kai)
- [x] TC-POLICY-01~05 회귀 테스트 추가 + 전체 PASS (`974e632` — D_Kai · 314/314 PASS)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 업데이트 (`974e632` — D_Kai)
- [x] D_Kai 코드 커밋 해시 기재: `723db3e` (§3 migration) + `c0bcab0` (§3 engine) + `974e632` (§5 tests)

---

## [설계 의견] — D_Kai 작성

### D_Kai — DB 마이그레이션 설계

**영향도 분석 결과**:
- `calculate_order_costs`는 DB 트리거(`fn_trigger_capture_order_rate`)에서만 호출, TypeScript 직접 호출 없음
- `fn_get_best_matching_rate` — `zen_rate_cards.tiers` JSONB 첫 번째 tier의 `unit_price` 반환
- 현재 chargeable_weight = SUM(packages.gross_weight) 단순 합산 (VOLUMETRIC/WM 미반영)

**§1 — zen_transport_pricing_policies 테이블 생성**
- CREATE TABLE per 명세 (transport_mode UNIQUE 4행 고정)
- Seed INSERT 4행 (AIR=VOLUMETRIC/6000, EXP=VOLUMETRIC/5000, SEA=WM/null, LAND=WM/null)
- RLS: ADMIN만 INSERT/UPDATE/DELETE, 전 역할 SELECT
- updated_at 트리거 자동 갱신

**§1b — zen_rate_cards.tiers JSONB cbm_price 확장**
- 기존 tiers 구조: `{ weight_min, unit_price, min_total_price }`
- 확장: `{ weight_min, unit_price, cbm_price, min_total_price }`
- CHECK 제약: `cbm_price`는 SEA/LAND 전용, AIR/EXP는 null만 허용
  - 단, JSONB 내부 필드이므로 DB CHECK로 강제 시 `jsonb_typeof` 함수 필요
  - **대안**: CHECK 제약 없이 애플리케이션 레벨 검증 (Admin UI에서 SEA/LAND만 cbm_price 입력 활성화)
  - **권안**: 애플리케이션 레벨 검증 + DB는 nullable 허용 (기존 데이터 호환성 유지)

**§3 — calculate_order_costs 수정 방안 (Riley 참고)**
```
1. zen_transport_pricing_policies에서 transport_mode(p_service_type)의 policy 조회
2. WEIGHT_ONLY → 기존 로직 유지
3. VOLUMETRIC → chargeable_weight = MAX(actual_weight_kg, cargo_cbm × 1,000,000 / divisor)
4. WM → weight_cost = actual_weight_kg × tier.unit_price
        cbm_cost = cargo_cbm × tier.cbm_price
        → MAX(weight_cost, cbm_cost) 채택, unit_price = MAX / chargeable_weight
```
- 단, `fn_get_best_matching_rate`가 단일 `unit_price` 반환하므로 WM 방식은 `calculate_order_costs`에서 직접 tier 조회 필요
- **방안 A**: `fn_get_best_matching_rate`에 pricing_method 파라미터 추가 + WM 시 cbm_price도 반환
- **방안 B**: `calculate_order_costs`에서 `fn_get_best_matching_rate` 호출 후, 추가로 `zen_rate_cards.tiers` 직접 조회하여 WM 계산
- **권안**: 방안 A (함수 시그니처 변경 최소화)

**기존 데이터 호환**: 기존 tiers에 `cbm_price` 없음 → WM 계산 시 `COALESCE(tier.cbm_price, 0)` 처리

---

## [설계 확정] — Aiden 전속

**확정일**: 2026-06-08 | **확정자**: Aiden (Claude, ZEN_CEO)

### §1b — tiers cbm_price CHECK 제약

**채택**: 애플리케이션 레벨 검증 (DB CHECK 제약 없음)
- 이유: JSONB 내부 필드에 DB CHECK 강제 시 `jsonb_typeof` 함수 의존성 증가 → 복잡도 대비 이득 미미
- Admin UI(B_Kai)에서 SEA/LAND 선택 시에만 `cbm_price` 입력 활성화. AIR/EXP는 UI에서 null 고정.

### §3 — calculate_order_costs 수정 방안

**채택**: 방안 A — `fn_get_best_matching_rate`에 `pricing_method` 파라미터 추가

```sql
-- 수정 후 시그니처
fn_get_best_matching_rate(
  p_rate_card_id UUID,
  p_weight NUMERIC,
  p_cbm NUMERIC,            -- 신규
  p_pricing_method TEXT     -- 'WEIGHT_ONLY'|'VOLUMETRIC'|'WM' 신규
) RETURNS TABLE(unit_price NUMERIC, cbm_price NUMERIC, min_total_price NUMERIC)
```

- WEIGHT_ONLY: 기존 로직 유지 (p_cbm 무시)
- VOLUMETRIC: chargeable_weight = MAX(p_weight, p_cbm × 1,000,000 / divisor) → weight tier 조회
- WM: weight_cost = p_weight × tier.unit_price, cbm_cost = p_cbm × tier.cbm_price → MAX 채택

**Riley 구현 요점**:
1. `calculate_order_costs`에서 `zen_transport_pricing_policies` 조회 → `pricing_method` + `volumetric_divisor` 획득
2. `fn_get_best_matching_rate` 호출 시 `p_cbm`, `p_pricing_method` 전달
3. `zen_orders.cargo_cbm` 필드 존재 여부 확인 → 없으면 D_Kai에게 즉시 보고 (착수 전 선행 확인)
4. 기존 AIR/EXP 데이터 호환: `COALESCE(tier.cbm_price, 0)` 처리

**B_Kai 구현 요점**:
1. D_Kai bb81021 기준 `zen_transport_pricing_policies` 스키마 기반으로 UI 착수
2. 페이지 경로: `/admin/settings/transport-policies`
3. 사이드바 `기본정보` 하위 메뉴에 "요금 산정 정책" 추가 (ADMIN only)
4. 4행 고정 테이블 (AIR/EXP/SEA/LAND — 삭제 불가, 행별 저장 버튼)
5. `RateTierEditor.tsx`: SEA/LAND 선택 시 `cbm_price` 컬럼 표시 (AIR/EXP 시 숨김)

---

## [작업 결과] — D_Kai / Riley / B_Kai 작성

### D_Kai (2026-06-07)

| 항목 | 상태 | 비고 |
|:-----|:----:|:-----|
| **§1 — zen_transport_pricing_policies** | ✅ | CREATE TABLE + 4행 seed (AIR/EXP=VOLUMETRIC, SEA/LAND=WM) + RLS + updated_at trigger |
| **§1b — zen_rate_cards.tiers cbm_price** | ✅ | JSONB 호환 확장 (COMMENT), 애플리케이션 레벨 검증 권장 |
| **§3 — 설계 의견** | ✅ | calculate_order_costs / fn_get_best_matching_rate 영향도 분석 + 2개 방안 제시 (방안 A 권장) |
| **회귀 테스트 (309/309)** | ✅ | bb81021 기준 PASS |
| **커밋** | bb81021 | `[D_Kai] feat: IMP-105 DB 스키마 — zen_transport_pricing_policies + tiers cbm_price` |

### D_Kai (2026-06-08) — §3 엔진 파트 · §5 TC-POLICY

**착수 전 필수 확인**:
- `zen_orders.cargo_cbm`: 불필요 확인 → `calculate_order_costs` SQL 함수는 `zen_order_packages.volume` SUM 사용

**Working Tree 정리**:
- Riley scope-creep 18개 파일 `git restore` 완료 ✅

**SQL Migration 검토**:
- Riley 작성 `20260608010000_imp105_transport_pricing_engine.sql` — `fn_get_best_matching_rate` 4-arg overload + `calculate_order_costs` VOLUMETRIC/WM 구현
- 로직 검증 후 `psql`로 직접 적용 (supabase db push connection timeout 이슈로 우회)

**SettlementEngine.ts 수정**:
- 정책 조회: `zen_transport_pricing_policies` → `pricing_method`, `volumetric_divisor` 획득
- Chargeable Weight 정책 기반 계산:
  - WEIGHT_ONLY: 실제 중량만 (`totalGrossWeight`)
  - VOLUMETRIC: MAX(실중량, CBM × 1,000,000 / divisor)
  - WM: 실제 중량 기준
- WM Fallback: `cbm_price` tier 조회 → MAX(weight_cost, cbm_cost) 산정
- Rate card 조회 컬럼명 수정: `origin_code`→`origin_port_id`, `dest_code`→`dest_port_id`, `mode`→`transport_mode`, `status`→`is_active` (pre-existing 버그 fix)

| 항목 | 상태 | 비고 |
|:-----|:----:|:-----|
| **§3 — fn_get_best_matching_rate 4-arg** | ✅ | migration `723db3e` |
| **§3 — calculate_order_costs VOLUMETRIC/WM** | ✅ | migration `723db3e` (Riley 로직 검토 후 활용) |
| **§3 — SettlementEngine.ts 분기** | ✅ | `c0bcab0` |
| **§5 — TC-POLICY-01~05** | ✅ | `974e632` · 5종 TS+SQL 동시 검증 |
| **회귀 테스트 (314/314)** | ✅ | PASS |
| **커밋 1** | `723db3e` | `[D_Kai] feat: TASK-121 §3 fn_get_best_matching_rate 4-arg overload + calculate_order_costs VOLUMETRIC/WM` |
| **커밋 2** | `c0bcab0` | `[D_Kai] feat: TASK-121 §3 SettlementEngine VOLUMETRIC/WM 분기 처리` |
| **커밋 3** | `974e632` | `[D_Kai] test: TASK-121 TC-POLICY-01~05 통합 테스트 추가` |

### B_Kai (2026-06-08)

| 항목 | 상태 | 비고 |
|:-----|:----:|:-----|
| **§2 — Admin 운송 정책 설정 화면** | ✅ | `/admin/settings/transport-policies` — server action + page + client inline-edit 컴포넌트 |
| **§2 — 사이드바 메뉴** | ✅ | `기본정보` 하위 "요금 산정 정책" 추가 (NaviSidebar) |
| **§2 — i18n 번역** | ✅ | ko/en/ja/zh 4개 언어 |
| **§4 — RateTierEditor cbm_price** | ✅ | SEA/LAND conditional `cbm_price` 필드 + transportMode prop |
| **회귀 테스트 (309/309)** | ✅ | 5171675 + 0d428a3 기준 PASS |
| **커밋 1** | `5171675` | `[B_Kai] feat: TASK-121 §2 Admin 운송 정책 설정 화면` |
| **커밋 2** | `0d428a3` | `[B_Kai] feat: TASK-121 §4 RateTierEditor cbm_price 필드 추가` |

**Riley 인계 사항**:
- DoD 3개 항목 미완료: §3 엔진 수정 + TC-POLICY-01~05 + LIVE_REGRESSION_TEST_MAP.md
- B_Kai 구현 완료 후 🔔 상태 — Riley §3 완료 후 Aiden ✅ 통합 승인 필요

---

## [Aiden 최종 승인] — 2026-06-08

**승인자**: Aiden (Claude, ZEN_CEO) | **승인일**: 2026-06-08 | **Edward 확인**: ✅

**검증 결과**:
- R-17 커밋 순서 정상: 코드(723db3e→c0bcab0→974e632) → 🔔(c13fc52) → IMP_PROGRESS(c3b5a3f) ✅
- DoD 전항목 `[x]` 체크 + 커밋 해시 전량 기재 ✅
- TC-POLICY-01~05 TS+SQL 양쪽 검증 구조 ✅
- 회귀 314/314 PASS ✅
- Advisory 1건 (비차단): D_Kai rate card 조회 컬럼명 수정 (pre-existing 버그 fix, task file 명시 완료)

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:----|
| 2026-06-07 | Aiden (Claude) | TASK-121 신규 발령 |
| 2026-06-08 | Aiden (Claude) | 설계 확정 — §1b 애플리케이션 레벨 검증 채택, §3 방안 A 채택. Riley·B_Kai 착수 지시 발령. |
| 2026-06-07 | Aiden (Claude) | 담당 Agent 개정 — Riley 추가 (비용 산정 엔진·회귀 테스트 담당). Riley 선정 근거: TASK-076 Composite Pricing Engine 구현자. |
| 2026-06-08 | Aiden (Claude) | §3 엔진 파트 Riley→D_Kai 재배정 — Riley 토큰 소진·scope 초과로 중단. D_Kai 착수 지시 발령. Working tree scope-creep 폐기 지시 포함. |
| 2026-06-08 | Aiden (Claude) | TASK-121 ✅ 최종 승인 — DoD 전항목·R-17 절차·회귀 314/314 실물 검증 완료. Edward 승인 확인. |
