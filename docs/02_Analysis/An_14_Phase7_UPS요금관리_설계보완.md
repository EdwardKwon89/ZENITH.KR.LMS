# An-14 — Phase 7 보완설계: UPS 특송 요금 관리 (계산 파이프라인 + Admin/Agency UI)

> **문서번호**: An-14
> **작성일**: 2026-07-05
> **작성자**: Aiden (Claude, ZEN_CEO)
> **기반**: `docs/80_RawData/20260705 UPS특송 요금관리.md` (Edward 요구사항) + 구현현황 조사(2026-07-05, 본문 §0) + SNTL 원자료 대조(2026-07-05, 본문 §0-1)
> **승인 상태**: ✅ 설계 확정 — Edward 승인 완료 (2026-07-05). Team A(Aiden) 구현 담당 지정
> **관련 문서**: An-12(Phase 7 원설계), SAR_2026-06-26_001(incoterms 갭), DEF-081/083
> **원자료**: `docs/80_RawData/20260609 SNTL 자료/sntl_ups.txt`·`sntl_ups_rules.txt`, `20260609 UPS 특송 부가서비스.pdf`(2026 UPS Rate and Service Guide, 28p), `20260609 UPS 특송 요금 정보.xlsx`

---

## 0. 배경 — 조사로 확인된 현재 상태 요약

2026-07-05 구현현황 조사 결과, Phase 7 UPS 요금관리는 **DB 스키마는 대부분 존재하나 "계산"과 "Admin 등록 UI"가 develop 브랜치에 없다**는 것이 핵심 갭으로 확인되었다.

| 구분 | 상태 | 비고 |
|:---|:---:|:---|
| Zone/제품/기준요금/유류할증/OC 테이블 | ✅ | `zen_ups_*` 7종, 시드 데이터 포함 |
| Agency 하위화주·요율오버라이드 테이블 | ✅ | `zen_agency_shippers`, `zen_agency_rate_overrides` |
| 조회(SELECT) Server Actions | ✅ | `src/app/actions/ups/rates.ts` (TASK-143) |
| **Admin 요율 등록/수정 UI** | ❌ | TASK-146 승인까지 났으나 브랜치(`feature/ups-spr03-bkai-rates-admin`) **develop 미병합**. 1차 구현도 Zone/제품 탭만 실물, 기준요금·유류할증·OC 3탭은 Placeholder였음 |
| **요금 계산 엔진** | ❌ | `pricing-engine.ts`(TASK-141, 순수함수) 존재하나 동일 미병합 브랜치에만 있고, **Agency/화주 할인 단계는 애초에 미설계** |
| `zen_agency_shippers.discount_rate` | ❌ 사용 안 됨 | CRUD 저장만 되고 계산 로직에서 참조하는 코드 없음(죽은 필드) |
| `zen_agency_rate_overrides` | ⚠️ 구조적 결함 | 할인율·마진 컬럼 없이 Agency가 `cost_price`까지 직접 수기 입력 가능(RLS `FOR ALL`) — Admin 통제 불가 |
| `zen_ups_other_charges` | ⚠️ 구조적 결함 | 전역 공통코드 테이블이며 `agency_org_id` 없음 — "Agency별 비용 등록" 요구사항 불충족 |
| UAT 커버리지 | ⚠️ | 요금계산 검증 시나리오(UAT-17-03) 1건뿐이며 미완료(미체크) 상태. Zone/요율 등록 자체를 검증하는 시나리오 없음 |

**결론**: 단순 브랜치 병합으로는 부족하며, Agency/화주 단계 계산 로직과 일부 스키마(할인율·마진·Agency별 부가요금)를 신규 설계해야 요구사항을 충족한다.

---

## 0-1. SNTL 원자료 대조 결과 — 새로 확인된 사업 규칙 3건 + 구조적 리스크 5건

Edward 지시(2026-07-05)로 `docs/80_RawData/20260609 SNTL 자료/` 및 UPS 공식 2026 Rate and Service Guide를 대조. **§3~§4 설계에 즉시 반영해야 할 정확한 사업 규칙**과 **요율표 자체의 구조적 정확도 리스크**(§9 별도 정리, Phase 7.2 백로그)를 구분해 확인했다.

### (A) 즉시 반영 — Platform 원가 계산 규칙 (`sntl_ups.txt`)

| # | 원문 근거 | 반영 내용 |
|:-:|:---|:---|
| A1 | "원가표는 시스템 대입 후 **+7%**가 실질 납부 운임" | `zen_ups_base_rates.cost_price`는 UPS 원가표 원본값 그대로 저장하고, **계산 시점에 × 1.07**을 적용(§3-6, §4). 하드코딩 대신 상수화하여 향후 UPS 계약 조건 변경에 대응 |
| A2 | "sales 유류할증과 원가 유류할증은 별도 관리" | 기존 `zen_ups_fuel_surcharges.selling_rate`/`cost_rate` 분리 컬럼으로 **이미 충족** — 변경 불요, 검증만 수행 |
| A3 | 부피중량: 원가=LWH/6000(고정), 판매=LWH/5000·5500·6000(3종 중 선택) | 기존 `zen_organizations.volumetric_divisor CHECK(5000,5500,6000)` + pricing-engine.ts 원가 고정 6000 로직으로 **이미 충족** — 변경 불요, 검증만 수행 |

### (B) 즉시 반영 — Other Charge 코드 보강 (요구사항 R7 "부가수수료(현지통관·기타)" 갭 해소)

기존 조사(§0)에서 "현지통관 전용 코드 없음"으로 확인된 갭을 SNTL 자료가 정확히 메운다. `sntl_ups.txt` 17-21행이 명시한 **"유류할증 미부과 항목"** 4종은 그대로 R7의 "부가 수수료(현지통관·기타)"에 해당하는 실제 UPS 청구 항목이다.

| 신규 charge_code | 명칭 | fuel_surcharge_applicable |
|:---|:---|:---:|
| `DUTY_AMOUNT` | Duty Amount (관세) | FALSE |
| `TARIFF_LINES_FEE` | Additional Tariff Lines Fee | FALSE |
| `INTL_PROCESSING_FEE` | International Processing Fee | FALSE |
| `DISBURSEMENT_FEE` | Disbursement Fee | FALSE |

기존 `SURGE`(급증수수료)·`OVERSIZE`(대형포장물)는 `fuel_surcharge_applicable=TRUE`로 이미 시드되어 있어 SNTL 자료(13-15행)와 일치 — 정합성 확인 완료.

### (C) 즉시 반영 — 대형포장물(OVERSIZE) 특수 계산 규칙

SNTL 자료 14-15행: "포장물 길이 + 둘레(폭×2+높이×2) > 300cm (400cm 이하) → **최소 청구중량 40kg 강제** + **1C/T당 69,200원 추가**(유류할증 부과 대상)".

현재 시드값(OVERSIZE 15,000/12,000원 고정)은 이 규칙을 반영하지 못한 **placeholder 수치**다. 단순 OC 금액 조회로는 처리 불가 — `pricing-engine.ts`에 **전용 판정 함수**(`applyOversizeRule(dims, billingKg)` → 조건 충족 시 `billingKg = max(billingKg, 40)` + 69,200원 가산)를 신규 추가해야 한다(§4).

### 결론

(A)(B)(C)는 이번 설계(§2~§7)에 바로 반영한다. 요율표 구조 자체의 정확도 리스크(20kg 초과 구간 kg당 단가, Box 상품, 서비스·방향별 Zone 상이, DWB, Freight 최소운임)는 **범위가 크고 7/20 Go-Live 일정에 대한 영향이 커 별도 §9 백로그로 분리**한다.

---

## 1. 요구사항 원문 매핑

`docs/80_RawData/20260705 UPS특송 요금관리.md` 문장을 계산 단계별로 분해:

| # | 요구사항 원문 | 계산 단계 | 현재 상태 |
|:-:|:---|:---:|:---:|
| R1 | UPS 판매가: 종류별·무게별·Zone별 기준요금 | Platform | ✅ 스키마+데이터 존재 |
| R2 | Zone 관리 기능 필요 | Platform | ⚠️ DB만 있고 관리 UI 없음 |
| R3 | 대리점 원가 = UPS 판매가 × 대리점별 할인율(Admin 설정) | **Agency** | ❌ 미구현 |
| R4 | 대리점 원가 = (R3) + 부가요금(배송 건수당 별도 적용) | **Agency** | ❌ 미구현 |
| R5 | 대리점 판매가 = 원가 + 마진 | **Agency** | ❌ 미구현 |
| R6 | 대리점 소속 화주는 화주별 할인율 적용받아 운송비 산정 | **Shipper** | ❌ 미구현(컬럼만 존재) |
| R7 | 최종 운송비 = UPS 배송요금 + 부가요금(유류·부피할증) + 부가수수료(현지통관·기타) | Platform 합산 | ✅ pricing-engine.ts 로직 존재(미병합) |
| R8 | 부가요금/수수료는 공통코드로 관리 + Agency별 비용 등록 가능 | Platform+Agency | ⚠️ 공통코드는 있으나 Agency별 등록 불가 |

---

## 2. 계산 파이프라인 설계 (3단계)

```
[1] Platform 단계 (기존 pricing-engine.ts 재사용)
    Zone + Product + Weight → base_rate 조회
    + fuel_surcharge(유류할증) + other_charges(부피할증 등, 유류할증 연동분 포함)
    = platformSellingTotal / platformCostTotal   ※ 원본 UPS 판매가/원가

[2] Agency 단계 (신규)
    agencyCost = platformSellingTotal × (1 − agency_discount_rate)  ※ R3
               + agencyOtherCharges(배송 건당, Agency가 등록)        ※ R4, R8
    agencySellingPrice = agencyCost + agencyMargin                 ※ R5
      (= zen_agency_rate_overrides.selling_price, Agency 자율 입력)

[3] Shipper 단계 (신규 — 기존 discount_rate 컬럼 실사용)
    finalFreight = agencySellingPrice × (1 − shipper_discount_rate) ※ R6
```

**핵심 설계 원칙**: `agency_discount_rate`는 Admin만 설정(대리점 통제권), `agencyMargin`(=agency 최종 selling_price)은 Agency 자율 입력(기존 An-12 "Agency 자체관리" 결정 유지). **`agencyCost`는 Agency가 직접 입력하지 못하도록 서버(트리거/함수)가 자동 산출** — 현재 RLS가 Agency에게 `cost_price` UPDATE까지 허용하는 구조적 결함(§0)을 이번에 함께 수정한다.

---

## 3. 데이터 모델 변경안

### 3-1. 신규 — `zen_agency_pricing_policies` (Admin이 설정하는 대리점별 할인율)

TISA 3계층 요율 구조(`zen_rate_cards.margin_rate` 등, IMP-092)와 동일한 패턴 재사용.

| 컬럼 | 타입 | 설명 |
|:---|:---|:---|
| id | UUID PK | |
| agency_org_id | UUID FK → zen_organizations, UNIQUE | 대리점당 1행(이력 필요 시 valid_from 확장) |
| discount_rate | NUMERIC(5,4) CHECK (0~1) | Admin 설정 — UPS 판매가 대비 할인율 (R3) |
| is_active | BOOLEAN | |
| created_at / updated_at / updated_by | | 변경 이력 추적 |

RLS: `ADMIN/MANAGER`만 INSERT/UPDATE, `AGENCY`(본인 org)는 SELECT만 — R3 "Admin 설정" 요건 강제.

### 3-2. 신규 — `zen_agency_other_charges` (Agency별 부가요금 등록)

`zen_agency_rate_overrides`(base_rate 오버라이드)와 대칭 구조로 `zen_ups_other_charges`(공통코드) 오버라이드.

| 컬럼 | 타입 | 설명 |
|:---|:---|:---|
| id | UUID PK | |
| agency_org_id | UUID FK | |
| other_charge_id | UUID FK → zen_ups_other_charges | 공통코드 참조(R8 "공통코드로 관리" 유지) |
| selling_price / cost_price | NUMERIC(18,2) | Agency별 금액(비우면 공통코드 기본값 사용) |
| is_active | BOOLEAN | |
| UNIQUE(agency_org_id, other_charge_id) | | |

기존 `zen_ups_other_charges` 테이블 자체는 손대지 않고(공통코드 원칙 유지), Agency가 있으면 override 우선 적용 — `zen_agency_rate_overrides`와 동일한 오버라이드 패턴이라 신규 개념 학습 비용 없음.

### 3-3. 변경 — `zen_agency_rate_overrides`

- **RLS 정책 수정**: `agency_rate_overrides_agency_own`을 `FOR ALL` → `FOR SELECT, INSERT(selling_price만), UPDATE(selling_price만)`로 축소. `cost_price`는 DB 트리거가 자동 계산해 덮어씀(Agency가 값을 보내도 무시).
- **신규 트리거**: `trg_agency_rate_override_calc_cost` (BEFORE INSERT/UPDATE) — `NEW.cost_price := base_rate.selling_price × (1 − policy.discount_rate)`. `zen_agency_pricing_policies`에 정책이 없으면 INSERT 차단(에러) — 할인율 미설정 대리점은 요율 등록 불가하도록 강제(데이터 정합성 보장).

### 3-4. `zen_agency_shippers.discount_rate` — 신규 소비 로직만 추가 (스키마 변경 없음)

계산 함수(§4)에서 화주 조회 시 이 컬럼을 반드시 읽도록 구현.

### 3-5. DDU/DDP(incoterms) 반영

`zen_orders.incoterms`(SAR_2026-06-26_001로 이미 추가됨)에 따라 계산 시 `zen_ups_other_charges` 중 `charge_code IN ('DDU','DDP')` 항목을 조건부 포함하도록 §4 계산 함수에 분기 추가. (스키마 변경 불요, 로직 추가만)

### 3-6. Platform 원가 +7% 반영 (§0-1 A1)

`zen_ups_base_rates.cost_price`는 UPS 원가표 원본값을 그대로 저장(운영 편의상 UPS가 매주/매월 배포하는 원가표를 그대로 입력). 계산 시 상수 `UPS_COST_SURCHARGE_RATE = 0.07`을 곱해 실 납부 원가를 산출 — §4 `pricing-engine.ts`에 반영하며 Admin UI 입력 화면에도 "원가표 원본값 입력(시스템이 +7% 자동 적용)" 안내 문구 표기.

### 3-7. `zen_ups_other_charges` 신규 코드 4종 (§0-1 B)

`DUTY_AMOUNT` / `TARIFF_LINES_FEE` / `INTL_PROCESSING_FEE` / `DISBURSEMENT_FEE` — 마이그레이션으로 시드 추가(모두 `fuel_surcharge_applicable=FALSE`, 최초 금액은 Admin이 Admin UI에서 등록).

---

## 4. 계산 로직 구현 설계

| 파일 | 상태 | 작업 내용 |
|:---|:---:|:---|
| `src/lib/ups/pricing-engine.ts` | 복원+보강 | 기존 미병합 브랜치 코드 rebase (Platform 단계, R1/R2/R7) + **원가 ×1.07 반영(§3-6)** + **대형포장물 특수룰(§0-1 C) 추가** |
| `src/lib/ups/agency-pricing.ts` | **신규** | `computeAgencyFreight(platformResult, policy, override?, agencyCharges[])` — R3/R4/R5 |
| `src/lib/ups/shipper-pricing.ts` | **신규** | `computeShipperFreight(agencyResult, shipperDiscountRate)` — R6 |
| `src/app/actions/ups/freight.ts` | **신규** | `estimateUpsFreight(orderInput)` — 3단계 통합 호출, 오더 등록 화면에서 실시간 미리보기용 |
| `src/lib/ups/order-integration.ts` | **신규** | 오더 확정 시 계산 결과를 `zen_order_rate_snapshots`에 저장(기존 스냅샷 관례 재사용, TISA 패턴과 동일) |

원가 산출(Agency 단계)은 위 3-3의 **DB 트리거가 최종 권위(source of truth)** 이며, 애플리케이션 계산 함수는 오더 등록 시점의 견적 미리보기 + 스냅샷 기록용으로 동일 공식을 재사용한다(이중 계산 로직 불일치 방지를 위해 트리거 SQL 공식과 TS 공식을 §7 테스트로 교차 검증).

**대형포장물(OVERSIZE) 특수 판정 함수**(§0-1 C): `applyOversizeRule(dims, billingKg)` — 길이+둘레(폭×2+높이×2) > 300cm(≤400cm) 조건 충족 시 `billingKg = max(billingKg, 40)` 및 OVERSIZE 항목 강제 포함(69,200원, 유류할증 부과 대상). `computeUpsFreight()` 파이프라인 내 청구중량 산출 직후 호출.

---

## 5. UI 범위

| 화면 | 작업 |
|:---|:---|
| `/admin/ups-rates` (5탭) | 미병합 브랜치 rebase. Zone/제품 탭은 기존 구현 재사용, **기준요금·유류할증·OC 3탭(현재 Placeholder)을 실제 CRUD로 완성** |
| `/admin/ups-rates` **신규 6번째 탭** | "Agency 할인율 정책" — `zen_agency_pricing_policies` CRUD (Admin 전용, R3) |
| `/agency/rate-overrides` (기존) | `cost_price` 입력 필드를 **읽기전용 자동계산값 표시**로 전환(트리거 계산 결과 안내), `selling_price`(마진 반영)만 입력받도록 폼 수정 |
| `/agency/rate-overrides` **신규 섹션** | Agency별 부가요금 등록(`zen_agency_other_charges`) — R8 |
| 오더 등록(`/orders/new`, UPS 선택 시) | 실시간 예상 운임 미리보기(breakdown: 기준요금/유류할증/부가요금/최종금액) — `estimateUpsFreight()` 연동 |

---

## 6. API/명세 반영 의무 (R-12)

본 설계 승인 후 구현 착수 전, `docs/02_Analysis/Ds_11_API_상세_명세서.md`(또는 관련 `Ds_11_DETAIL_*`)에 아래 반영 필수:
- `estimateUpsFreight`, Agency 정책 CRUD, Agency 부가요금 CRUD 액션 명세 추가
- `zen_agency_rate_overrides.cost_price` 서버 계산 방식으로 변경된 점 명시(클라이언트가 값을 보내도 무시됨을 API 계약에 명기)

---

## 7. 검증 계획

- **단위 테스트**: `tests/unit/ups/agency-pricing.test.ts`, `shipper-pricing.test.ts` — R3~R6 공식 케이스별 검증 + 트리거 SQL과 TS 계산 결과 일치 여부 교차 테스트 + **원가 ×1.07 반영 케이스** + **대형포장물(길이+둘레 300~400cm, 40kg 미만 화물) 특수룰 케이스**(§0-1 A1/C)
- **UAT 보강**:
  - UAT-17-03(기존, 현재 미완료) — Agency 오버라이드 반영 최종금액 검증을 **재실행하여 완료 처리**
  - **신규 UAT-20**: Admin의 Zone/기준요금/유류할증/OC(신규 4종 포함) 등록·수정 시나리오
  - **신규 UAT-21**: Admin 대리점 할인율 정책 설정 → Agency 원가 자동계산 검증
  - **신규 UAT-22**: 화주별 할인율 적용 최종 운송비 검증 (R6, 현재 완전 공백)
- **회귀**: `rtk npm run test:regression` 전체 PASS (R-08)

---

## 8. 리스크 및 미결정 사항 (Edward 확인 필요)

| # | 항목 | 옵션 | Aiden 권고 |
|:-:|:---|:---|:---|
| 1 | 미병합 브랜치(`rates-admin`, pricing-engine) 처리 | (A) rebase 후 재활용 (B) 폐기 후 재작성 | **(A)** — `git merge-tree` 확인 결과 develop과 실질 충돌 없음(§부록), 2,600줄 재작성 비용 회피 가능 |
| 2 | `zen_agency_pricing_policies` 이력 관리 | (A) 단일행 UPSERT (B) valid_from 이력 테이블 | **(A)** 우선 — MVP 범위, 필요 시 후속 IMP로 이력화 |
| 3 | Agency 부가요금 미등록 시 폴백 | (A) 공통코드 기본값 사용 (B) 0원 처리 | **(A)** — R8 "공통코드로 관리" 취지상 기본값 상속이 자연스러움 |

---

## 9. 요율표 구조 정확도 리스크 — Phase 7.2 백로그 (Go-Live 이후)

UPS 공식 2026 Rate and Service Guide(28p) 대조 중, 요구사항 R1~R8과 별개로 **현재 `zen_ups_base_rates` 스키마 자체의 정확도 한계**가 5건 확인되었다. 계산 파이프라인(§2~§4) 설계와 독립적인 이슈이며, 재설계 범위가 커 7/20 Go-Live를 지연시킬 위험이 있으므로 **별도 IMP로 분리해 Edward 우선순위 판단을 받는다**.

| # | 리스크 | 현재 한계 | 실제 UPS 규칙 |
|:-:|:---|:---|:---|
| 1 | 20kg 초과 구간 요금 구조 | `zen_ups_base_rates`는 무게 포인트(0.5kg 단위) 방식만 지원 | 20kg 초과 시 **21-44 / 45-70 / 71-99 / 100-299 / 300+ kg 구간별 kg당 단가** 방식으로 전환됨(포인트 테이블로 표현 불가) |
| 2 | 정액 Box 상품 | `zen_ups_products` 시드에 없음 | "UPS 10KG Box"/"UPS 25KG Box" — 각 상품 상한(10kg/25kg)까지 Zone별 정액 요금 |
| 3 | Zone-국가 매핑 단순화 | `zen_ups_zone_countries`는 country_code당 Zone **1개(전역)** | 실제로는 **서비스(Express/Saver/Expedited/Freight) × 방향(수출/수입)별로 동일 국가라도 Zone 번호가 다름** |
| 4 | DWB(Deficit Weight Billing) | 미구현 | 실중량 구간 요금과 상위 구간 요금 중 **낮은 금액 우선 적용** 로직 존재 |
| 5 | Freight 최소운임 | 미반영 | UPS Worldwide Express Freight/Freight Midday는 70kg 초과 구간에 **Zone별 최소운임(flat floor)** 적용 |

**Aiden 권고**: 6/30 시범 운영은 이미 현재 단순화 모델(10-Zone, 포인트 요금, Box 상품 없음)로 진행 중이므로, 위 5건은 **IMP-146(가칭) "UPS 요율표 구조 정밀화"**로 별도 발령하여 Go-Live(7/20) 이후 착수를 권고. 단, 현재 시범 운영 중 20kg 초과 화물·Box 상품 주문이 실제 발생하고 있는지 Edward 확인 필요 — 발생 중이라면 우선순위를 즉시 상향해야 함.

---

## 10. 작업 계획 (Task Breakdown)

> 승인 상태: ✅ Edward 승인 완료(2026-07-05) — Team A(Aiden) 구현 담당. 브랜치 `feature/teama-phase71-ups-rate-management` 단일 브랜치로 TASK-171~178 순차 구현 후 통합 PR.

| Task-ID | 개요 | 선행조건 | 담당 | 산출물 |
|:---|:---|:---|:---:|:---|
| TASK-171 | 스키마: `zen_agency_pricing_policies`·`zen_agency_other_charges` 신규 + `zen_agency_rate_overrides` RLS/트리거 수정 + OC 4종 추가(§3-1·3-2·3-3·3-7) | 본 설계 승인 | Aiden | migration 3~4개, 트리거 단위테스트 |
| TASK-172 | `feature/ups-spr03-bkai-rates-admin` 브랜치 코드 이식 — pricing-engine.ts 등 복원 + i18n/NaviSidebar 충돌 해소 | TASK-171 | Aiden | 이식 커밋, 빌드 PASS |
| TASK-173 | `pricing-engine.ts` 보강(원가×1.07, 대형포장물 특수룰) + `agency-pricing.ts`·`shipper-pricing.ts` 신규(§4) | TASK-172 | Aiden | 계산 모듈 3종 + 단위테스트 |
| TASK-174 | `estimateUpsFreight` 통합 Action + 오더 등록 화면 실시간 미리보기 연동 + `order-integration.ts`(스냅샷 저장) | TASK-173 | Aiden | Server Action, UI 연동 |
| TASK-175 | Admin UI 완성 — 기준요금/유류할증/OC 3탭(기존 Placeholder) 실 CRUD + 신규 "Agency 할인율 정책" 탭(§5) | TASK-171, 172 | Aiden | `/admin/ups-rates` 6탭 |
| TASK-176 | Agency UI 수정 — `rate-overrides` cost_price 읽기전용화 + Agency 부가요금 등록 섹션 신규(§5) | TASK-171 | Aiden | `/agency/rate-overrides` 개선 |
| TASK-177 | Ds_11 API 명세 갱신(§6) + UAT-17-03 재실행 완료 처리 + 신규 UAT-20/21/22 작성(§7) | TASK-174~176 | Aiden | 명세 갱신, UAT 4종 |
| TASK-178 | 전체 회귀 + E2E-24(UPS 오더 플로우) 재검증 | TASK-171~177 전량 | Aiden | 회귀 PASS 증적 |

**순서**: TASK-171 → TASK-172 → (TASK-173, TASK-175, TASK-176 병행 가능) → TASK-174 → TASK-177 → TASK-178

**별도 트랙**: §9 백로그(요율표 구조 정밀화)는 위 표와 무관하게 IMP-146(가칭)으로 분리 발령 — Edward 우선순위 확인 후 별도 Task 채번.

---

## 부록 — 미병합 브랜치 재사용 가능성 확인 (2026-07-05)

```
git merge-base feature/ups-spr03-bkai-rates-admin develop
git merge-tree <merge-base> develop feature/ups-spr03-bkai-rates-admin
→ 실질 CONFLICT 마커 없음(문자열 "onConflict" 오탐 2건 제외)
→ develop에서 변경된 파일: messages/*.json, NaviSidebar.tsx (i18n 키/메뉴 추가 — 충돌 가능성 낮음, 수작업 재배치 권장)
```
