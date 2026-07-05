# TASK-180 — Phase 7.2 IMP-146 SPR-02: 20kg 초과 티어 + DWB + Freight 최소운임

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-180 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | Riley |
| **우선순위** | P3 (Go-Live 비차단 백로그) |
| **전제조건** | 없음 (TASK-179 ✅ 완료로 해제됨) |
| **관련 IMP** | IMP-146 |
| **브랜치** | 신규 생성 — `feature/teama-task-180-tier-dwb-riley` |
| **커밋 태그** | `[Riley]` |
| **상태** | ⬜ (TASK-179 ✅ 완료 — 즉시 착수 가능) |

---

## [배경]

An-14 §9(요율표 구조 정확도 리스크) 중 3건을 해소한다. `docs/02_Analysis/An_14_Phase7_UPS요금관리_설계보완.md` §12 필독. TASK-179(B_Kai) ✅ 완료 — `resolveZoneByCountry()` 시그니처(2단계 Fallback + `fallbackApplied`) 안정화됨.

**⚠️ Riley 착수 전 필독 — TASK-181 Hotfix 선반영 사항(2026-07-05)**: DEF-095(WW_EXPEDITED 반올림 오류) Hotfix로 `resolveBillingWeight(chargeableKg, productCode)` 함수가 이미 구현·병합되었다(`ceilToHalfKg()` 대체, EXPEDITED 상시 1kg / 그 외 20kg 이하 0.5kg·초과 1kg). **아래 [작업 범위] 항목1의 반올림 로직 부분은 재구현 불필요** — 이미 존재하는 `resolveBillingWeight()`를 그대로 사용해 20kg 초과 티어 조회 분기만 추가하면 된다. 상세: `.agent/defects/DEF-095_WWEXPEDITED_중량반올림규칙_오류.md`, 코드 커밋 `b1d0725`.

## [작업 범위]

### 1. 20kg 초과 티어 요금 (An-14 §12-1 #1)

- 신규 `zen_ups_weight_tier_rates`(product_id, zone_id, tier_min_kg, tier_max_kg NULL 허용 최상위 구간, price_per_kg_selling, price_per_kg_cost, currency, valid_from/until, is_active) 마이그레이션
- 시드: 공식 Rate Guide(`docs/80_RawData/20260609 UPS 특송 부가서비스.pdf` p.14~27 "20kg 초과 화물 (kg당 가격)" 표) 기준
- `src/lib/ups/pricing-engine.ts` `computeUpsFreight()` 수정: 청구중량이 20kg(product별 point 테이블 상한) 초과 시 `zen_ups_base_rates` 대신 `zen_ups_weight_tier_rates`에서 구간 매칭 후 `단가 × 청구중량`으로 계산하는 분기 추가

### 2. DWB — Deficit Weight Billing (An-14 §12-1 #4)

- `applyDeficitWeightBilling()` 순수 함수 신규 — 청구중량 기준 금액 vs 다음 상위 구간(예: 20kg 도달 시 21kg 구간 최소가) 금액을 비교해 더 낮은 쪽 채택
- 공식 UPS Rate Guide 각주(`docs/80_RawData/20260609 UPS 특송 부가서비스.pdf` — "Deficit Weight Billing" 각주 참고) 기준 정확한 비교 로직 구현
- `computeUpsFreight()` 결과에 `dwbApplied: boolean` 필드 추가(breakdown 투명성)

### 3. Freight 최소운임 (An-14 §12-1 #5)

- 신규 `zen_ups_freight_minimums`(zone_id, product_id, min_charge_selling, min_charge_cost) 마이그레이션 + 시드(Rate Guide "최소 운임" 행 기준)
- `computeUpsFreight()`에서 Freight 계열 상품일 경우 계산 결과가 최소운임 미만이면 최소운임으로 상향하는 로직 추가

## [설계 의견 — 필수]

착수 전 아래 항목에 대한 방안을 상세 파일 `[설계 의견]` 섹션에 제출하고 Aiden 확정을 받는다(⬜→📝→🔍→🔄):

1. DWB 비교 대상 "다음 상위 구간"을 구체적으로 어떻게 정의할지(단순 다음 0.5kg/1kg 구간인지, 명시된 브레이크포인트 목록 기준인지) — 공식 문서 각주 재확인 필요
2. `zen_ups_weight_tier_rates`와 기존 `zen_ups_base_rates`(20kg 이하) 사이 조회 분기 기준(20kg을 하드코딩할지, product별 point 테이블 실제 최대 weight_kg를 동적 조회할지)

## [DoD]

- [ ] `zen_ups_weight_tier_rates`·`zen_ups_freight_minimums` 마이그레이션 + 시드
- [ ] `computeUpsFreight()` 20kg 초과 분기 정확히 동작
- [ ] `applyDeficitWeightBilling()` 정확한 비교 로직 + breakdown 투명성
- [ ] Freight 최소운임 적용 로직
- [x] ~~`resolveBillingWeight(chargeableKg, productFamily)` 신규 — EXPEDITED 항상 1kg 올림, 그 외 상품 20kg 이하 0.5kg/초과 1kg 올림~~ **TASK-181 Hotfix로 선반영 완료** (코드 `b1d0725`) — Riley는 이 함수를 그대로 사용
- [x] ~~DEF-095 해소 확인~~ **TASK-181로 해소 완료**
- [ ] 신규 단위테스트(TC-UPS-TIER-*, TC-UPS-DWB-*, TC-UPS-FREIGHTMIN-*) — 경계값(20.0kg/20.5kg 등) 케이스 포함
- [ ] `npm run test:regression` 전체 PASS
- [ ] `npx tsc --noEmit` 신규 오류 0건
- [ ] `LIVE_REGRESSION_TEST_MAP.md`·`scratch/IMP_PROGRESS.md` 갱신
- [ ] `check-R17-DoD` 실행 완료

## [R-17 완료 보고 절차]

표준 절차 준수. TASK-179 ✅ 완료로 착수 가능(⬜→🔄 즉시 진행).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

## [설계 의견]

### 1. DWB 비교 대상 "다음 상위 구간" 정의 방안
- DWB(Deficit Weight Billing)는 실제 청구중량 기준 운임과 다음 상위 중량 구간(Weight Break)의 최소 중량 기준 운임을 비교하여 더 저렴한 쪽을 선택하는 규칙입니다.
- **구간 정의 방식**: 
  - 20.0kg 이하(Flat 구간)의 경우, 다음 상위 구간은 첫 번째 per-kg 티어인 **`21-44` kg 구간**이며, 비교 기준 중량은 **21.0kg**입니다.
  - 20.0kg 초과(per-kg 구간)의 경우, DB의 `zen_ups_weight_tier_rates`에 등록된 구간(예: `21-44`, `45-70`, `71-99` 등)을 기준으로 합니다.
  - 현재 중량 $W$가 속한 구간이 $T_i = [\text{min}_i, \text{max}_i]$ 일 때, 다음 상위 구간은 $T_{i+1} = [\text{min}_{i+1}, \text{max}_{i+1}]$ 입니다.
  - 이 경우, 비교 기준 중량은 다음 구간의 최솟값인 **$\text{min}_{i+1}$ kg** 입니다. (예: 43kg일 때 다음 구간인 45-70kg의 최솟값인 45kg과 비교)
- **비교 로직**:
  - 실제 중량 $W$에 대한 운임: $W \times \text{rate}(T_i)$
  - 다음 구간 최소 중량 $\text{min}_{i+1}$ 에 대한 운임: $\text{min}_{i+1} \times \text{rate}(T_{i+1})$
  - 두 값을 비교하여 다음 구간 운임이 더 낮다면, 청구 중량을 $\text{min}_{i+1}$ 로 변경하고 해당 구간의 단가를 적용하며 `dwbApplied = true`로 설정합니다.
  - 가장 높은 중량 구간(예: `1000+` kg)에 속한 경우 다음 상위 구간이 없으므로 DWB를 적용하지 않습니다.

### 2. `zen_ups_weight_tier_rates`와 `zen_ups_base_rates` 조회 분기 기준
- **분기 기준**: 하드코딩 `20.0kg`을 기준으로 분기합니다.
- **근거**: 
  - UPS 공식 가이드에 따르면 20.0kg 이하인 경우 0.5kg 단위의 Flat Rate 테이블(point)을 적용하고, 20.0kg 초과 화물에 대해서는 kg당 단가 테이블(tier)을 적용하는 것이 표준 비즈니스 룰입니다.
  - 기존 DB의 `zen_ups_base_rates`에 25kg, 30kg 데이터가 존재하지만, 이는 임시/레거시 데이터로 판단되며, 본 7.2 정밀화 요건이 배포된 이후에는 >20.0kg 화물은 모두 `zen_ups_weight_tier_rates`에서 조회하도록 설계하는 것이 비즈니스 스펙에 부합합니다.
- **중량 올림 규칙 세분화**:
  - **20.0kg 이하**: `WW_EXPEDITED` 상품은 **1.0kg 단위 올림**, 그 외 Express/Saver 상품은 **0.5kg 단위 올림**하여 `zen_ups_base_rates`에서 매칭합니다.
  - **20.0kg 초과**: 서비스 종류와 무관하게 **1.0kg 단위 올림** 처리하여 `zen_ups_weight_tier_rates`에서 매칭합니다. (공식 가이드: "20kg 초과 시 다음 1kg 단위로 올림")

### 3. 신규 DB 테이블 스키마 설계

#### (A) `zen_ups_weight_tier_rates`
```sql
CREATE TABLE public.zen_ups_weight_tier_rates (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id             UUID NOT NULL REFERENCES public.zen_ups_products(id) ON DELETE CASCADE,
  zone_id                UUID NOT NULL REFERENCES public.zen_ups_zones(id) ON DELETE CASCADE,
  tier_min_kg            NUMERIC(6,2) NOT NULL CHECK (tier_min_kg >= 0),
  tier_max_kg            NUMERIC(6,2) CHECK (tier_max_kg IS NULL OR tier_max_kg > tier_min_kg), -- NULL은 상한 없음(최상위 구간)
  price_per_kg_selling   NUMERIC(18,2) NOT NULL CHECK (price_per_kg_selling >= 0),
  price_per_kg_cost      NUMERIC(18,2) NOT NULL CHECK (price_per_kg_cost >= 0),
  currency               VARCHAR(3) NOT NULL DEFAULT 'KRW',
  valid_from             DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until            DATE,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES public.zen_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_zone_tier UNIQUE (product_id, zone_id, tier_min_kg, valid_from)
);
```

#### (B) `zen_ups_freight_minimums`
```sql
CREATE TABLE public.zen_ups_freight_minimums (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id            UUID NOT NULL REFERENCES public.zen_ups_zones(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES public.zen_ups_products(id) ON DELETE CASCADE,
  min_charge_selling NUMERIC(18,2) NOT NULL CHECK (min_charge_selling >= 0),
  min_charge_cost    NUMERIC(18,2) NOT NULL CHECK (min_charge_cost >= 0),
  currency           VARCHAR(3) NOT NULL DEFAULT 'KRW',
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES public.zen_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_zone_product_min UNIQUE (zone_id, product_id)
);
```

## [설계 확정]

_(Aiden 전속, 2026-07-05)_

**판정**: ✅ 설계 승인 — 원문 대조 검증 완료. TASK-179 ✅ 완료로 즉시 착수 가능.

**검증 근거** (`docs/80_RawData/20260609 UPS 특송 부가서비스.pdf` 원문 대조):
1. **DWB 정의(항목1 방안)** — p.17/18 각주 원문("UPS 청구 시스템은 실 중량과 높은 중량에 대한 각각의 공시 요금을 비교한 후, 둘 중 낮은 금액에 고객 할인율을 적용하여 최종 요금을 산출합니다. 기본으로 DWB가 적용됩니다")과 Riley 제안(현재 구간 vs 다음 상위 구간 최솟값 비교, 낮은 쪽 채택)이 정확히 일치. 최상위 구간(300kg+) 예외 처리도 타당.
2. **20kg 경계 반올림 규칙(항목2 방안)** — p.2 원문("UPS Express 발송물 중량이 20kg 이하인 경우 0.5kg 단위, 20kg 초과 시 1kg 단위로 올림. UPS Expedited 발송물은 중량과 무관하게 항상 1kg 단위로 올림")과 Riley 제안 완전 일치. **우수한 1차 사료 검증** — 그대로 채택.

**진행 상황 업데이트(2026-07-05)**: 위 검증 과정에서 파생 발견된 DEF-095(WW_EXPEDITED 0.5kg 반올림 오적용 — 기 병합 Phase 7.1 코드 결함)는 Edward 지시로 **TASK-181 Hotfix로 별도 즉시 처리·병합 완료**(코드 `b1d0725`). 당초 본 Task DoD에 포함하려던 `resolveBillingWeight()` 신규 구현은 이 Hotfix로 선반영되었으므로, Riley는 해당 함수를 그대로 소비만 하면 되고 항목1의 반올림 로직 재구현은 불필요하다. TASK-179(B_Kai)도 ✅ 완료(PR#190 머지)되어 `resolveZoneByCountry()` 시그니처가 안정화되었으므로 본 Task의 마지막 남은 전제조건도 해제되었다.

**미결정 사항(§12-3) 처리**: 항목3(Zone 매핑 초기화)은 TASK-179 소관으로 완료됨. 항목1(20kg 초과 실사용 여부)은 Edward 확인 필요 — 미확인 상태로도 설계·구현은 진행 가능(백로그 성격상 발생 여부와 무관하게 정확도 개선 필요).

## [작업 결과]

_(Riley 작성)_
