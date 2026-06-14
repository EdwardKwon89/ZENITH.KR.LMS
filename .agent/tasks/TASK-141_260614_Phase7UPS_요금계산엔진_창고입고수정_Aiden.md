# TASK-141 — Phase 7 SPR-02: UPS 요금 계산 엔진 + 창고 입고 수정

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-141 |
| **생성일** | 2026-06-14 |
| **할당 Agent** | Aiden (Claude) |
| **우선순위** | P1 |
| **전제조건** | TASK-138 ✅ (UPS DB 스키마 완비) |
| **관련 IMP** | IMP-112 |
| **브랜치** | `feature/ups-spr02-aiden-pricing-engine` |
| **상태** | ⬜ |

---

## [목표]

An-12 §5.3 기반 UPS 요금 계산 엔진을 구현하고, 창고 입고 화면에 PKG REF_NO 입력(domestic_ref_no) 기능을 추가한다.

> DB 컬럼(zen_order_packages REF_NO 5종, zen_orders delivery_method 등)은 TASK-138 `ups_007`에서 완료. 본 Task는 비즈니스 로직 + UI 구현.

---

## [작업 범위]

### 1. UPS 요금 계산 엔진 (`src/lib/ups/pricing-engine.ts`)

An-12 §5.3 스펙 준수:

```typescript
calculateUpsFreight({
  productId,          // zen_ups_products.id
  destCountryCode,    // 목적지 국가코드 → Zone 매핑
  actualWeightKg,
  dimL, dimW, dimH,
  volumetricDivisor,  // 고객별 5000/5500/6000 (zen_organizations)
  deliveryMethod,     // 'DDU' | 'DDP'
  otherCharges[],     // zen_ups_other_charges 항목
  effectiveDate,
}): {
  chargeableWeight,   // max(actualWeight, volumetricWeight)
  baseFreight,        // zen_ups_base_rates 조회
  fuelSurcharge,      // zen_ups_fuel_surcharges 조회
  otherChargesTotal,
  totalSelling,
  totalCost,
  breakdown,          // 계산 근거 JSON
}
```

**Zone 매핑 로직**: `destCountryCode` → `zen_ups_zone_countries` → `zen_ups_zones`

### 2. Server Actions (`src/app/actions/ups/`)

An-12 §5.1 기준:

| 파일 | 함수 |
|:----|:----|
| `rates.ts` | `getUpsZones()`, `getUpsProducts()`, `getUpsBaseRates()`, `getUpsFuelSurcharge()`, `getUpsOtherCharges()` |
| `pricing.ts` | `calculateUpsFreight()` — pricing-engine.ts 래퍼 |

### 3. 창고 입고 화면 수정 (`/warehouse/inbound`)

- domestic_ref_no 입력 필드 추가 (패키지별)
- 국제번호(intl_ref_no) 수동 입력 버튼 (MVP: 수동 입력 → SPR-05에서 API 자동화)
- `intl_ref_locked = true` 시 intl_ref_no 수정 불가 처리

### 4. TypeScript 타입 보완 (`src/types/ups.ts`)

- `UpsFreightInput`, `UpsFreightResult`, `UpsBreakdown` 인터페이스 추가 (기존 파일 확장)

### 5. 회귀 테스트 신규 케이스 (R-09)

`tests/integration/p7-ups-pricing.test.ts` — IMP-112 관련 TC 5건 이상:
- TC-UPS-P-01: 부피중량 > 실중량 시 chargeableWeight 계산
- TC-UPS-P-02: Zone 매핑 (국가코드 → Zone)
- TC-UPS-P-03: 유류할증료 조회 + 합산
- TC-UPS-P-04: OtherCharges 합산
- TC-UPS-P-05: totalSelling / totalCost 분리 계산

---

## [DoD]

- [ ] `src/lib/ups/pricing-engine.ts` 구현 완료 (함수 50줄 이하 엄수 — 분리 필수)
- [ ] `src/app/actions/ups/rates.ts` + `pricing.ts` Server Actions 구현
- [ ] 창고 입고 화면 domestic_ref_no / intl_ref_no 입력 UI 추가
- [ ] `intl_ref_locked` 조건부 수정 불가 처리
- [ ] `src/types/ups.ts` FreightInput/Result 타입 추가
- [ ] `npx supabase db reset` 정상 완료 확인
- [ ] `npm run test:regression` 신규 TC 5건 이상 PASS
- [ ] 코드 커밋 해시: (작업 후 기재)
- [ ] DoD 자가 검증 `check-R17-DoD` 실행 완료

---

## [R-17 완료 보고 절차]

1. **코드 커밋**: `[Claude] feat: TASK-141 IMP-112 UPS 요금 계산 엔진 + 창고 입고 수정`
2. **본 파일 `[작업 결과]` 작성** + 상태 🔔 변경
3. **ACTIVE_TASK.md** 🔄→🔔
4. **IMP_PROGRESS.md** IMP-112 행 🔔 갱신
5. **`check-R17-DoD` 실행** — 전항목 통과 확인
6. **문서 커밋**: `[Claude] docs: TASK-141 완료 보고 — IMP-112 🔔`

---

## [설계 확정]

An-12 §5.3 스펙 확정 (Edward 승인, 2026-06-14). 추가 설계 결정 불요.

---

## [작업 결과]

_(작업 후 기재)_

---

## [Aiden 검토]

_(🔔 제출 후 Aiden 기재)_

---

## [발견 이슈]

_(없음)_
