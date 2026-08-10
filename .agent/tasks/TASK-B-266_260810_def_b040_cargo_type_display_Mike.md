# TASK-B-266 — DEF-B-040 Agency/Shipper UPS 요율조회 화면 cargo_type 축 반영

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-B-266 |
| Issue-ID | #1027 / DEF-B-040 |
| 생성일 | 2026-08-10 |
| 담당 Agent | Mike (MiMo V2.5) |
| 우선순위 | P1 (defect:high) |
| 상태 | 🔄 진행 중 |

---

## 배경

JSJung이 "master air" 계정으로 `/agency/ups-rates` 확인 중, 등록한 할인율(DOC 55%/NON_DOC 75%)이 "대리점 원가" 표시에 이상하게 적용되는 것을 발견. Issue #1018(cargo_type 축 도입) 당시 조회 화면이 갱신되지 않아 Zone당 할인율 1개로 가정 중.

---

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:----------|
| `src/app/actions/ups/rates-public.ts` | getPublicWeightTierRates/getPublicFreightMinimums product join에 cargo_type 추가 |
| `src/app/[locale]/(dashboard)/agency/ups-rates/agency-ups-rates-client.tsx` | policyByZone 중첩 구조 + candidateCargoTypes 패턴 적용 |
| `src/components/ups/UpsBaseRateMatrix.tsx` | discountRateMap 중첩 구조 + candidateCargoTypes 패턴 적용 |
| `src/app/[locale]/(dashboard)/shipper/ups-rates/page.tsx` | zoneDiscountMap 중첩 구조로 변경 |
| `src/app/[locale]/(dashboard)/shipper/ups-rates/shipper-ups-rates-client.tsx` | candidateCargoTypes 패턴 적용 |
| `tests/unit/ups/def-b040-cargo-type-display.test.ts` | 회귀 테스트 10개 추가 |

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

## 완료 보고

- 코드 수정 완료
- 회귀 테스트 10개 추가 완료
- feature 브랜치: `feature/teamb-266-def-b040-cargo-type-display-v2`
