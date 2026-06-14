# TASK-141 — Phase 7 SPR-02: UPS 요금 계산 엔진 코어 (IMP-112 통합 Task)

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

> **병행 Task**: TASK-143 (D_Kai — rates.ts 5종 조회) · TASK-144 (B_Kai — 창고 입고 UI) 동시 진행.  
> Aiden은 코어 엔진 + 타입 보완 + 통합 테스트 담당. rates.ts는 TASK-143, 창고 UI는 TASK-144로 분리됨.

---

## [목표]

An-12 §5.3 기반 UPS 요금 계산 엔진 코어를 구현하고, TASK-143(rates.ts) · TASK-144(창고 UI) 완료 후 통합 테스트를 작성한다.

> DB 컬럼은 TASK-138 완료. rates.ts 조회는 TASK-143(D_Kai), 창고 입고 UI는 TASK-144(B_Kai) 병행 처리.

---

## [작업 범위]

### 1. TypeScript 타입 보완 (`src/types/ups.ts`) — 선행 작업

기존 `UpsFreightCalcInput` / `UpsFreightCalcResult` 기반으로 추가:
- `UpsFreightInput` (An-12 §5.3 파라미터 매핑 — 기존 타입 alias 또는 확장)
- `UpsFreightResult` (breakdown 포함)
- `UpsBreakdown` (계산 근거 상세: zone, baseRate, fuelSurcharge, otherCharges 배열)

> **D_Kai / B_Kai 착수 전 선행 커밋 권장** — rates.ts와 warehouse UI에서 임포트 가능하도록.

### 2. UPS 요금 계산 엔진 (`src/lib/ups/pricing-engine.ts`)

An-12 §5.3 스펙:

```typescript
calculateUpsFreight({
  productId,          // zen_ups_products.id
  destCountryCode,    // ISO alpha-3 → Zone 매핑
  actualWeightKg,
  dimL, dimW, dimH,
  volumetricDivisor,  // 5000 | 5500 | 6000 (기본 5000)
  deliveryMethod,     // 'DDU' | 'DDP'
  otherChargeIds[],   // zen_ups_other_charges.id 목록
  effectiveDate,
}): UpsFreightResult
```

**Zone 매핑**: `destCountryCode` → `zen_ups_zone_countries` → `zen_ups_zones`  
**부피중량**: `(dimL × dimW × dimH) / volumetricDivisor`  
**chargeableWeight**: `max(actualWeightKg, volumetricWeight)`  
**함수 50줄 초과 시 반드시 헬퍼 함수 분리** (ZEN_A4 엄수)

### 3. Server Action 래퍼 (`src/app/actions/ups/pricing.ts`)

```typescript
export async function calculateUpsFreightAction(
  input: UpsFreightInput
): Promise<{ data: UpsFreightResult | null; error?: string }>
```

pricing-engine.ts 호출 래퍼. Zod 검증 포함.

### 4. 통합 테스트 (`tests/integration/p7-ups-pricing.test.ts`)

TASK-143 완료 후 작성 가능 (rates.ts 의존). TC 5건 이상:
- TC-UPS-P-01: 부피중량 > 실중량 → chargeableWeight = 부피중량
- TC-UPS-P-02: destCountryCode → Zone 매핑 정확도
- TC-UPS-P-03: 유류할증료 조회 + 요금 합산
- TC-UPS-P-04: OtherCharges 합산
- TC-UPS-P-05: totalSelling / totalCost 분리 계산

---

## [DoD]

- [ ] `src/types/ups.ts` UpsFreightInput / UpsFreightResult / UpsBreakdown 타입 추가 (선행 커밋)
- [ ] `src/lib/ups/pricing-engine.ts` 구현 완료 (함수 50줄 이하 엄수 — 헬퍼 분리 필수)
- [ ] `src/app/actions/ups/pricing.ts` Server Action 래퍼 구현 (Zod 검증 포함)
- [ ] `npx supabase db reset` 정상 완료 확인
- [ ] `npm run test:regression` 전체 PASS (신규 TC-UPS-P-01~05 포함)
- [ ] TASK-143 · TASK-144 완료 후 통합 테스트 정상 통과 확인
- [ ] 코드 커밋 해시: (작업 후 기재)
- [ ] DoD 자가 검증 `check-R17-DoD` 실행 완료

> ⚠️ **통합 의존성**: TC-UPS-P-01~05 통합 테스트는 TASK-143(rates.ts) 완료 후 작성 가능.  
> TASK-143 완료 전에는 `pricing-engine.ts` 단위 테스트(Mock 기반)로 선행 작성 가능.

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
