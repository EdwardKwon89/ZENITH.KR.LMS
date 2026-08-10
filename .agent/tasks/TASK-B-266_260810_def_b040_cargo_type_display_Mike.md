# TASK-B-266 — DEF-B-040 Agency/Shipper UPS 요율조회 화면 cargo_type 축 반영

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-B-266 |
| Issue-ID | #1027 / DEF-B-040 |
| 생성일 | 2026-08-10 |
| 담당 Agent | Mike (MiMo V2.5) |
| 우선순위 | P1 (defect:high) |
| 상태 | ✅ 완료 |

---

## 배경

JSJung이 "master air" 계정으로 `/agency/ups-rates` 확인 중, 등록한 할인율(DOC 55%/NON_DOC 75%)이 "대리점 원가" 표시에 이상하게 적용되는 것을 발견. Issue #1018(cargo_type 축 도입) 당시 조회 화면이 갱신되지 않아 Zone당 할인율 1개로 가정 중.

---

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:----------|
| `src/lib/ups/cargo-type-utils.ts` | 신규: candidateCargoTypes/resolveDiscountRate 분리 |
| `src/app/actions/ups/rates-public.ts` | getPublicWeightTierRates/getPublicFreightMinimums product join에 cargo_type 추가 |
| `src/app/[locale]/(dashboard)/agency/ups-rates/agency-ups-rates-client.tsx` | policyByZone 중첩 구조 + cargo-type-utils.ts import |
| `src/components/ups/UpsBaseRateMatrix.tsx` | discountRateMap 중첩 구조 + cargo-type-utils.ts import |
| `src/app/[locale]/(dashboard)/shipper/ups-rates/page.tsx` | zoneDiscountMap 중첩 구조로 변경 |
| `src/app/[locale]/(dashboard)/shipper/ups-rates/shipper-ups-rates-client.tsx` | cargo-type-utils.ts import |
| `tests/unit/ups/def-b040-cargo-type-display.test.ts` | 회귀 테스트 10개 추가 (실제 함수 import 기반) |

---

## 핵심 로직 (freight.ts와 동일 패턴)

```typescript
function candidateCargoTypes(productCargoType?: string): string[] {
  if (productCargoType === 'DOC') return ['DOC', 'ALL'];
  if (productCargoType === 'NON_DOC') return ['NON_DOC', 'ALL'];
  // BOTH(Expedited/Flight): NON_DOC 우선, ALL 폴백 (DOC는 후보 아님)
  return ['NON_DOC', 'ALL'];
}
```

---

## 검증 결과

- TypeScript 타입 체크: 통과
- 핵심 단위 테스트: 55개 전부 통과 ✅
  - def-b040-cargo-type-display: 10개
  - pricing-engine: 37개
  - pricing-schedule-jsonb: 8개

---

## [작업 결과]

**커밋**: `4ecbac03` — `[Mike] fix: DEF-B-040 그림자 테스트 제거, 실제 함수 import로 교체 (Issue #1027)`

**PR**: #1030 (TeamB_Dev base) — https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1030

**변경 파일 7개**:
1. `src/lib/ups/cargo-type-utils.ts` (신규)
2. `src/app/actions/ups/rates-public.ts`
3. `src/app/[locale]/(dashboard)/agency/ups-rates/agency-ups-rates-client.tsx`
4. `src/components/ups/UpsBaseRateMatrix.tsx`
5. `src/app/[locale]/(dashboard)/shipper/ups-rates/page.tsx`
6. `src/app/[locale]/(dashboard)/shipper/ups-rates/shipper-ups-rates-client.tsx`
7. `tests/unit/ups/def-b040-cargo-type-display.test.ts` (신규)

**회귀 테스트 10개**: 실제 `candidateCargoTypes`/`resolveDiscountRate` 함수 import 기반
- TC-DEF-B040-01: DOC/NONDOC별 할인율 조회 (3건)
- TC-DEF-B040-02: Expedited/Flight 안전장치 (2건)
- TC-DEF-B040-03: 기존 ALL 정책 하위호환 (3건)
- TC-DEF-B040-04: candidateCargoTypes 함수 검증 (1건)
- TC-DEF-B040-05: 되돌리기 검증 (1건)

**v1 반려 사유 해결**:
- 그림자(shadow) 테스트 제거 → `src/lib/ups/cargo-type-utils.ts` 분리 후 실제 import
- 되돌리기 검증: 실제 `resolveDiscountRate` 함수 사용
