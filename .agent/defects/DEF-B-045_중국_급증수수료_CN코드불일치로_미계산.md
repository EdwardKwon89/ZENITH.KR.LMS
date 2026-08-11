# DEF-B-045 — 중국(CN) 목적지 급증 긴급 수수료(Surge Fee)가 계산 안 됨 (DEF-B-044와 동일 원인, 다른 지점)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — 중국행 예상운임 계산 후 "급증 수수료가 계산이 안 되는데 왜지?" |
| **긴급도** | High — 중국행 UPS 오더 전체가 급증 수수료 143원/kg(+유류할증) 누락, 실제 청구금액보다 낮게 계산됨 |
| **현재 상태** | 미수정 |
| **관련** | **DEF-B-044(TASK-B-272)와 동일 근본 원인** — Zone 조회는 고쳤으나 급증 수수료 조회는 동일 문제가 있는 걸 Jaison이 당시 놓침(설계 스코프 누락, 제 책임) |

## 근본 원인 (확정)

`src/app/actions/ups/freight.ts:197-206`의 급증 수수료 조회가 여전히 정규화 안 된 원본 `input.destCountryCode`(`"CN"`)로 조회:
```ts
const { data: surgeFeeRows } = await supabase
  .from('zen_ups_surge_fees')
  .select('*')
  .eq('destination_country_code', input.destCountryCode)   // ← 'CN' 그대로, CNN/CNS 미정규화
  ...
```
DEF-B-044에서 확인했듯 `zen_ups_zone_countries`처럼 `zen_ups_surge_fees`도 중국을 `CNN`/`CNS`로 분리 관리:
```
CNN | 143.00원/kg | is_active=t
CNS | 143.00원/kg | is_active=t
CN  | (존재하지 않음, 0건)
```
→ `input.destCountryCode='CN'`으로는 항상 0건 조회 → `surgeFee = null` → `applySurgeFee()`가 전부 0으로 반환 → 급증 수수료 항목 자체가 누락된 채로 예상운임이 계산됨(에러 없이 조용히 누락 — 유형은 다르지만 DEF-B-044와 같은 "확인 없이 조용히 틀린 값" 계열).

**참고**: 남/북 요율이 현재 둘 다 143.00원으로 동일하므로 "잘못된 값"이 나오는 건 아니지만, 조회 자체가 실패해 **항목이 통째로 빠지는** 문제라 DEF-B-044보다는 영향이 작지만 여전히 실제 금액 누락.

## 수정 방향

DEF-B-044/TASK-B-272에서 이미 만든 `resolveChinaSubCode()`(`src/lib/ups/pricing-engine.ts`, export됨)를 그대로 재사용 — `freight.ts`의 급증 수수료 조회 직전에 동일하게 정규화:
```ts
import { resolveChinaSubCode } from '@/lib/ups/pricing-engine';
// ...
const surgeFeeCountryCode = input.destCountryCode.toUpperCase() === 'CN'
  ? resolveChinaSubCode(input.destStateProvince)
  : input.destCountryCode;

const { data: surgeFeeRows } = await supabase
  .from('zen_ups_surge_fees')
  .select('*')
  .eq('destination_country_code', surgeFeeCountryCode)
  ...
```
`estimateUpsFreight()`가 이미 `input.destStateProvince`를 받고 있으므로(TASK-B-272에서 추가됨) 추가 배선 불필요 — 이 함수 내부 로직만 수정하면 됨.

**[구현자 확인 필요]** `freight.ts` 전체에 `destination_country_code`로 조회하는 다른 쿼리가 이것 하나뿐인지(Jaison이 `grep`으로 1차 확인 완료 — `rates.ts`/`rates-mutation.ts`/`rates-public.ts`는 전부 관리자 CRUD/목록 조회용이라 원본 코드 그대로 보여줘야 정상, 정규화 대상 아님) 재확인 권장.

## 회귀 테스트 (필수)

- `destCountryCode='CN', destStateProvince='GD'` → 급증 수수료 정상 조회·계산됨(0이 아님) 확인
- `destCountryCode='CN', destStateProvince='BJ'`(목록 외) → 급증 수수료 정상 조회·계산됨 확인
- `destCountryCode='CN'`(주 정보 없음) → CNN으로 정규화되어 정상 조회됨 확인(폼 레벨에서 이 케이스가 막히지만, 함수 자체의 방어적 동작도 확인)
- CN 외 국가는 기존 동작 그대로(회귀 방지)
- **되돌리기 검증 필수** — 정규화 제거 시 중국행 급증 수수료가 0으로 계산되는 원래 버그 재현되는지 확인
