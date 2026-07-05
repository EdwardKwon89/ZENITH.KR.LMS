# TASK-179 — Phase 7.2 IMP-146 SPR-01: Box 상품 + Zone-서비스-방향 매핑 정밀화

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-179 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | B_Kai |
| **우선순위** | P3 (Go-Live 비차단 백로그) |
| **전제조건** | 없음 |
| **관련 IMP** | IMP-146 |
| **브랜치** | 신규 생성 — `feature/teama-task-179-zone-box-precision-bkai` |
| **커밋 태그** | `[B_Kai]` |
| **상태** | 🔍 (설계 확정 — 즉시 착수 가능) |

---

## [배경]

An-14 §9(요율표 구조 정확도 리스크) 중 2건을 해소한다. `docs/02_Analysis/An_14_Phase7_UPS요금관리_설계보완.md` §12 필독.

## [작업 범위]

### 1. Box 상품 등록 (An-14 §12-1 #2)

- `zen_ups_products`에 `max_weight_kg INT` 컬럼 추가(마이그레이션)
- `UPS_10KG_BOX`(max_weight_kg=10)·`UPS_25KG_BOX`(max_weight_kg=25) 신규 제품 시드
- `zen_ups_base_rates`에 Box 상품용 요율 시드(1kg 단위, 공식 UPS Rate Guide 참고 — `docs/80_RawData/20260609 UPS 특송 부가서비스.pdf` p.14 "UPS 10 KG Box 및 UPS 25 KG Box" 표 참조)
- Admin UI(`/admin/ups-rates` 제품 탭)에 Box 상품 CRUD 시 `max_weight_kg` 입력 필드 추가

### 2. Zone-서비스-방향 매핑 (An-14 §12-1 #3)

- `zen_ups_zone_countries`에 `product_family VARCHAR(20)`(EXPRESS/SAVER/EXPEDITED/FREIGHT)·`direction VARCHAR(6)`(EXPORT/IMPORT) 컬럼 추가
- 기존 UNIQUE(country_code) → UNIQUE(country_code, product_family, direction)로 재정의
- **데이터 마이그레이션**: 기존 시드 46개국 매핑을 `product_family='EXPRESS', direction='EXPORT'`로 우선 채움(하위 호환 유지, 기존 6/30 시범 운영 데이터 깨지지 않도록)
- `src/lib/ups/pricing-engine.ts`의 `resolveZoneByCountry()`에 `productFamily`·`direction` 파라미터 추가(기본값 EXPRESS/EXPORT로 하위호환 유지)
- Admin UI Zone 관리 탭에 product_family·direction 필터/입력 추가

## [설계 의견 — 필수]

착수 전 아래 항목에 대한 방안을 상세 파일 `[설계 의견]` 섹션에 제출하고 Aiden 확정을 받는다(⬜→📝→🔍→🔄):

1. 기존 시드 데이터(46개국)를 EXPRESS/EXPORT로만 초기화하면 나머지 조합(SAVER/EXPEDITED/FREIGHT × IMPORT 등)은 매핑이 비어있게 된다 — 조회 시 폴백 전략(예: 매핑 없으면 EXPRESS/EXPORT 값 사용)을 어떻게 설계할지
2. `resolveZoneByCountry()` 시그니처 변경이 기존 호출부(TASK-174 `freight.ts` 등)에 미치는 영향 — 하위호환 유지 방법

## [DoD]

- [ ] `zen_ups_products.max_weight_kg` 컬럼 추가 + Box 제품 2종 시드
- [ ] Box 상품 요율 시드(공식 Rate Guide 기준, 최소 Zone 2~10 × 1~15kg 구간)
- [ ] `zen_ups_zone_countries` 컬럼 2종 추가 + UNIQUE 재정의 + 기존 데이터 마이그레이션(하위호환)
- [ ] `resolveZoneByCountry()` 파라미터 확장(하위호환 기본값 포함) + 기존 호출부 정상 동작 확인
- [ ] **(Aiden 설계확정 추가)** `resolveZoneByCountry()` 반환값에 `fallbackApplied: boolean` 추가 — EXPRESS/EXPORT 폴백 발동 여부 투명성 확보
- [ ] Admin UI 반영(Box 상품 필드, Zone 매핑 필터)
- [ ] 신규 단위테스트(TC-UPS-BOX-*, TC-UPS-ZONEMAP-*)
- [ ] `npm run test:regression` 전체 PASS (현재 기준선 424 이상 유지)
- [ ] `npx tsc --noEmit` 신규 오류 0건
- [ ] `LIVE_REGRESSION_TEST_MAP.md`·`scratch/IMP_PROGRESS.md` 갱신
- [ ] `check-R17-DoD` 실행 완료

## [R-17 완료 보고 절차]

표준 절차 준수(R-17 §0 Git 동기화 → 신규 브랜치 → 코드 커밋 → task file 🔔 → ACTIVE_TASK 반영 → check-R17-DoD → 문서 커밋 → PR 생성, `Closes` 대상 이슈 없음).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

## [설계 의견]

### 의견 1: Zone 매핑 폴백 전략

**문제**: 마이그레이션 후 46개국 시드는 `product_family='EXPRESS', direction='EXPORT'`로 초기화됨. SAVER/EXPORT, EXPRESS/IMPORT 등 다른 조합 조회 시 매핑이 없어 zone 미발견(null) 상태 발생 가능.

**제안: 2단계 Fallback Chain**

1. **정확 매치**: `(country_code, product_family, direction)` — 최우선
2. **Fallback → EXPRESS/EXPORT**: 정확 매치 실패 시 `(country_code, 'EXPRESS', 'EXPORT')`로 재조회 (기존 단일 매핑과 동일)

**근거**:
- EXPRESS/EXPORT가 모든 국가에 존재하는 유일한 보장 조합 (마이그레이션 결과)
- 기존 단일 매핑(`UNIQUE(country_code)`) 동작과 100% 하위호환
- Admin이 SAVER/IMPORT 등 특수 매핑을 점진 추가해도 EXPRESS/EXPORT가 안전폴백
- 3단계 이상 복잡한 폴백(방향/계열 순차)은 실제 사용 패턴이 확인될 때까지 오버엔지니어링

**의사코드**:
```ts
resolveZoneByCountry(code, zones, pf='EXPRESS', dir='EXPORT') {
  // 1) 정확 매치
  const exact = zones.find(z => z.countries.some(
    c => c.country_code===code && c.product_family===pf && c.direction===dir
  ));
  if (exact) return exact;
  // 2) Fallback: EXPRESS/EXPORT
  return zones.find(z => z.countries.some(
    c => c.country_code===code && c.product_family==='EXPRESS' && c.direction==='EXPORT'
  )) ?? null;
}
```

### 의견 2: `resolveZoneByCountry()` 시그니처 변경 영향

**조사 결과**: `resolveZoneByCountry()`의 **현재 생산코드 호출자 0건**. TASK-174 `freight.ts`는 인라인 `.some()`으로 Zone 해결 (`src/app/actions/ups/freight.ts:66-70`).

**영향 분석**:
| 항목 | 내용 |
|:-----|:-----|
| 생산코드 직접 호출 | **0건** — 변경으로 인한 Side effect 없음 |
| TASK-174 `freight.ts` | 인라인 로직이므로 별도 마이그레이션 필요 없음. 단, TASK-180(Riley)가 이 함수 사용 예정 |
| 단위테스트 | **0건** — 신규 작성 필요(DoD TC-UPS-ZONEMAP-*) |
| 하위호환 | 기본파라미터 `productFamily='EXPRESS', direction='EXPORT'`로 완전 보장 |

**제안**: 기본파라미터 추가로 기존 미래 호출자(TASK-174/180)에 안전한 시그니처 제공.

**추가 권고**: TASK-174 `freight.ts`의 인라인 Zone 해결 로직도 `resolveZoneByCountry()`로 통일할 것을 권장 (TASK-180 이후 리팩터링 Task로 분리 가능).

## [설계 확정]

_(Aiden 전속, 2026-07-05)_

**판정**: ✅ 설계 승인 — 즉시 착수 가능.

**검토 근거**:
1. **의견1(Fallback 전략)** — 2단계(정확 매치→EXPRESS/EXPORT) 체인 채택. "실제 사용 패턴 확인 전 3단계 이상 폴백은 오버엔지니어링"이라는 판단 타당 — ZEN_A4 원칙(불필요한 추상화 금지)과 부합. 그대로 승인.
2. **의견2(호출부 영향)** — `resolveZoneByCountry()` 생산코드 호출자 0건, `freight.ts:66-70` 인라인 로직이라는 조사 결과를 직접 코드 확인으로 재검증함(정확). 리팩터링(인라인→함수 통일)을 지금 하지 않고 별도 Task로 분리 제안한 판단도 타당 — 범위 확대 방지.

**DoD 보완 지시** (착수 전 상세파일 DoD에 아래 1건 추가):
1. Fallback 발동 시 투명성 확보 — `resolveZoneByCountry()`가 EXPRESS/EXPORT 폴백을 사용했는지 여부를 반환값에 포함(예: `{ zone, fallbackApplied: boolean }`). 근거: 기존 `applyOversizeRule()`의 `applied` 필드, TASK-180 `applyDeficitWeightBilling()`의 `dwbApplied` 필드와 동일한 "암묵적 규칙 적용 시 breakdown에 명시" 관례를 따름 — SAVER/IMPORT 등 미매핑 조합에 EXPRESS/EXPORT Zone이 잘못 적용된 견적을 추후 감사(audit)로 식별 가능하게 함.

**의견2 추가 확인**: TASK-180(Riley)이 `resolveZoneByCountry()`를 실사용할 예정이므로, 본 Task 완료 후 반환 타입 변경분(`fallbackApplied` 추가)을 TASK-180 착수 전 Riley에게 공유할 것.

## [작업 결과]

_(B_Kai 작성)_
