# DEF-B-041 — UPS 기준요금(base_rates) 조회가 PostgREST 기본 1000행 제한에 걸려 뒷부분(고중량 구간) 잘림

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 "master air" 대리점 계정으로 `/agency/ups-rates`에서 Express NON_DOC 기준요금을 조회하던 중 "20kg까지 표출이 안 된다(12kg에서 끊김)"고 보고, Playwright로 실제 재현·근본원인 확정 |
| **긴급도** | High — 실사용자가 보는 가격 조회 화면이 데이터를 불완전하게 표시(누락), admin/agency/shipper 3개 화면 전부 영향 |
| **현재 상태** | 미수정 |

## 근본 원인 (완전 확정 — 재현 완료)

`zen_ups_base_rates` 활성 행이 현재 **1,560건**인데, 아래 두 조회 함수가 **상품 필터 없이 전체를 한 번에 조회**하면서 명시적 `.range()`/페이지네이션이 없음:

### 1. `src/app/actions/ups/rates-public.ts` — `getPublicBaseRates()`
```ts
const { data, error } = await supabase
  .from('zen_ups_base_rates')
  .select('...')
  .eq('is_active', true)
  .lte('valid_from', refDate)
  .or(`valid_until.is.null,valid_until.gte.${refDate}`)
  .order('weight_kg');   // ← productId 필터 없음, .limit()/.range() 없음
```
사용처: `agency/ups-rates/page.tsx`, `shipper/ups-rates/page.tsx`

### 2. `src/app/actions/ups/rates.ts` — `getUpsBaseRates()`
```ts
export async function getUpsBaseRates(filters?: { productId?: string; ... }) {
  let base = supabase.from('zen_ups_base_rates').select('...').eq('is_active', true)...;
  if (filters?.productId) base = base.eq('product_id', filters.productId);
  ...
}
```
`admin/ups-rates/page.tsx`가 `getUpsBaseRates()`를 **필터 없이** 호출(`const baseRates = await getUpsBaseRates();`) — 이 경우도 동일 결함.

PostgREST(Supabase REST API)는 응답을 **기본 1,000행으로 제한**(`db-max-rows` 설정, 초과분은 조용히 잘림 — 에러 없음). `.order('weight_kg')`가 **상품 구분 없이 전역 정렬**이라, 1,000행째에서 끊기는 지점(`weight_kg`)이 모든 상품에 공통으로 적용됨.

## 실측 확인 (재현 완료)

```
활성 zen_ups_base_rates 총 행수: 1,560건
REST API 필터 없이 조회 시 응답: Content-Range: 0-999/* (1,000행만 반환, 나머지 560건 조용히 누락)
1,000번째(마지막) 행의 weight_kg: 12.0
→ WW_EXPRESS_NONDOC 등 모든 상품이 실제로는 0.5~20.0kg 데이터가 있음에도
  화면에는 0.5~12.0kg(24개 중량)까지만 표시됨
```
Playwright로 `agency@zenith.kr` 계정 실로그인 → `/ko/agency/ups-rates` → Express(비서류) 선택 → 실제 렌더링된 테이블 행 24개(0.5~12kg)만 확인, DB에는 40개(0.5~20kg) 존재함을 대조 확인.

## 영향 범위

- `/admin/ups-rates` — 기준요금 탭(`getUpsBaseRates()` 무필터 호출)
- `/agency/ups-rates` — 기준요금 탭(`getPublicBaseRates()`)
- `/shipper/ups-rates` — 기준요금 탭(`getPublicBaseRates()`)
- 3개 화면 전부 고중량 구간 데이터가 조용히 누락되어 표시됨(에러 없이 발생 — 관리자/대리점/화주 전부가 실제보다 적은 중량 구간만 보고 있었을 가능성)
- 실제 요금 계산 엔진(`freight.ts`)은 이 함수들을 쓰지 않고 개별 상품/Zone 단위로 조회하므로 **청구 금액 자체에는 영향 없음** — 조회 화면 표시 전용 결함

## 수정 방향 (TASK-B-268에 배정)

`getPublicBaseRates()`(rates-public.ts)와 `getUpsBaseRates()`(rates.ts, productId 미지정 시)에 **페이지네이션 루프**를 추가해 1,000행 제한을 우회하고 전체 데이터를 확실히 가져오도록 수정:

```ts
async function fetchAllBaseRates(queryBuilder: () => PostgrestFilterBuilder<...>) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryBuilder().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}
```
쿼리 빌더를 재실행 가능한 형태로 감싸거나, 동일 필터 조건으로 매 페이지 새 쿼리를 만들어 `.range(from, to)`만 바꿔 반복 호출.

**대안(더 근본적, 검토만)**: 애초에 전체 상품 데이터를 한 번에 다 가져오는 대신 admin/agency/shipper 화면도 `selectedProductId` 선택 시점에만 해당 상품 데이터를 조회하도록 지연 로딩으로 전환하면 1개 상품 최대 400행 수준이라 이 문제 자체가 재발할 여지가 없음. 다만 이번 Task는 화면 구조 변경 없이 페이지네이션 추가로 최소 침습 수정 우선, 지연 로딩 전환은 후속 개선(IMP)으로 별도 기록 권장.

## 회귀 테스트 (필수)

- `getPublicBaseRates()`/`getUpsBaseRates()` mock에서 1,000행 초과 데이터(예: 1,200행, 2페이지)를 반환하도록 설정 시 함수가 전체를 병합해 반환하는지(behavioral, `.range()` 호출 인자 캡처로 페이지네이션 동작 검증)
- 1,000행 이하인 경우 기존과 동일하게 1회 호출로 끝나는지(회귀 방지)
- **되돌리기 검증 필수** — 페이지네이션 로직 제거 시 1,000행 초과분이 누락되는 증상이 실제로 재현되는지 확인 후 결과를 task file에 기재
- (권장) 실제 로컬 DB(1,560행 존재하는 현재 상태)에서 Playwright로 Express NON_DOC 선택 후 20.0kg 행이 실제로 렌더링되는지 확인
