# TASK-B-226: `/admin/ups-actual-charges` — 예상청구액 세부 항목 표출 + 추가 부가요금 등록 방식 재설계

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#902](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/902) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

jungjs(Jaison) 확정 지시: **"예상청구액의 항목을 리스트에 표출합니다. admin은 예상청구액에 추가 부가요금을 등록하여 최종 청구서를 생성합니다."**

현재 `/admin/ups-actual-charges`(`UpsActualAdjustmentForm.tsx`)는 "실제 청구액" 입력 테이블이 예상청구액 전체를 **대체**하는 모델입니다(기본값으로 `chargeType: 'BASE FREIGHT', amount: 예상청구액전체`를 자동 채워넣고, 저장 시 기존 항목을 전부 delete 후 입력값으로 재삽입). 이건 요구사항과 다릅니다 — 예상청구액은 **읽기전용 참고 리스트**로 그대로 보여주고, admin이 입력하는 건 순수하게 **추가되는 부가요금**이어야 하며, **최종 청구서 = 예상청구액 + 추가 부가요금**이어야 합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — jungjs 추가 코멘트 반영, 2026-07-27 재설계)

> Issue #902에 jungjs가 추가 코멘트로 아래 3가지를 명확히 확정함(이전 버전 설계에서 수정됨):
> 1. 예상청구액 = 예상운임(기본운임+급증긴급수수료+유류할증료 등 `zen_order_costs`의 모든 항목) — 상세 리스트로 표출
> 2. admin이 추가부가요금을 등록하면, **최종청구서 금액은 그 리스트(예상청구액 항목들 + 추가부가요금 항목들)의 총합**으로 표출
> 3. **조정금액(변경 전과 같은 로직으로 표출)** — 즉 `variance = actual - estimated` 계산식 자체는 절대 건드리지 않음. 대신 `actual`이 이제 "최종청구서 금액"(=예상청구액+추가부가요금)을 정확히 나타내도록 값을 만들어주면, 기존 수식 그대로 `variance`가 자동으로 "추가부가요금 합계"가 됨 — **코드 수식을 바꾸는 게 아니라 입력값의 의미만 맞추는 것**이 핵심.

### 1. 백엔드 — `src/app/actions/finance/ups-actual-charges.ts`

#### `getUpsChargeReconciliation()` (약 248행)

기존 `estimatedCosts` 조회 결과를 이미 갖고 있으므로, 항목별 breakdown을 추가로 반환. **`actual`/`variance` 계산식 자체는 그대로 두되, `actual`이 "예상청구액+추가부가요금"이 되도록 한 줄만 추가**:

```ts
const estimatedBreakdown = (estimatedCosts || []).map((cost) => ({
  costType: cost.cost_type,
  amount: Number(cost.unit_price) * Number(cost.quantity || 1),
  currency: cost.currency,
}));

// 2. 실제청구(=추가부가요금) 합산 — 기존 그대로
const additionalSum = (actualCharges || []).reduce((sum, charge) => sum + Number(charge.charge_amount), 0);

// 신규: actual = 예상청구액 + 추가부가요금 (최종청구서 금액)
const actual = estimated + additionalSum;

// variance 계산식은 절대 변경하지 않음 — 그대로 두면 자동으로 additionalSum과 같아짐
const variance = actual - estimated;

return {
  estimated,
  estimatedBreakdown,   // 신규 추가 필드 — 그 외 기존 필드(estimated/actual/variance/currency/isFinalized)는 이름·계산식 그대로
  actual,
  variance,
  currency,
  isFinalized: !!finalizedInvoice,
};
```

(기존 코드에서 `actual`을 `actualCharges.reduce(...)` 결과 그 자체로 바로 쓰고 있었다면, 위처럼 `estimated + additionalSum`으로 바뀌는 부분만 다름 — `variance` 라인은 건드리지 말 것.)

#### `recordUpsActualCharges()` (약 118행, `adjustmentAmount` 계산부)

**이 부분도 수식(`actualSum - estimatedSum`)은 절대 변경하지 않음.** 대신 `charges` payload(admin이 입력한 추가부가요금 항목들)의 합을 별도 변수로 두고, 기존 `actualSum` 변수 자체가 "예상청구액 포함 최종 합계"가 되도록 한 줄 추가:

```ts
// 변경 전
let actualSum = 0;
const actualChargesToInsert = charges.map((c) => {
  actualSum += c.amount;
  return { ... };
});
...
const adjustmentAmount = actualSum - estimatedSum;

// 변경 후 — DB에 저장되는 zen_ups_actual_charges 행(추가부가요금만)은 그대로, 합산 시점만 조정
let additionalSum = 0;
const actualChargesToInsert = charges.map((c) => {
  additionalSum += c.amount;
  return { ... };  // 저장 내용(zen_ups_actual_charges insert)은 변경 없음 — 여전히 "추가부가요금" 항목만 저장
});
...
const actualSum = estimatedSum + additionalSum;   // 신규: actualSum = 최종청구서 금액
const adjustmentAmount = actualSum - estimatedSum; // 수식 그대로 — 결과적으로 additionalSum과 동일해짐
```

즉 **DB에 저장되는 `zen_ups_actual_charges` 테이블 내용은 계속 "추가부가요금만"** 담고, 계산 시점에만 `estimatedSum`을 더해 `actualSum`(=최종청구서 금액)을 만들어 기존 수식에 흘려보내는 방식입니다.

### 2. 프론트엔드 — `src/components/orders/UpsActualAdjustmentForm.tsx`

#### (a) "기본값 자동 채움" 로직 제거 (약 60~70행, `loadData()`의 `else` 분기)

```ts
// 변경 전
} else {
  // Default row
  setCharges([
    { chargeType: 'BASE FREIGHT', amount: recon.estimated > 0 ? recon.estimated : 0, currency: recon.currency || 'USD', upsInvoiceNo: '', upsInvoiceDate: '', notes: '' },
  ]);
}

// 변경 후 — 추가 부가요금이 없으면 빈 상태로 시작(예상청구액을 복제하지 않음)
} else {
  setCharges([]);
}
```

`handleRemoveRow`의 "마지막 한 줄은 빈 값으로 유지" 로직(약 105~117행)도 재검토 필요 — 이제 0개 상태가 정상이므로, 마지막 줄 삭제 시에도 그냥 빈 배열로 만들면 됨(강제로 빈 행 1개를 유지할 필요 없음).

#### (b) "예상 청구액 상세" 읽기전용 리스트 신규 추가

`import { getCostTypeLabel } from '@/lib/finance/settlement/cost-type-labels';` 추가.

기존 요약 카드(Reconciliation Summary Cards) 위나 옆에, `reconciliation.estimatedBreakdown`을 순회하는 읽기전용 리스트 삽입:

```tsx
{reconciliation?.estimatedBreakdown && reconciliation.estimatedBreakdown.length > 0 && (
  <ZenCard className="p-4 mb-4 bg-gray-50 dark:bg-zinc-900">
    <div className="text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2">예상 청구액 상세 (Estimated Breakdown)</div>
    <div className="space-y-1">
      {reconciliation.estimatedBreakdown.map((item, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-zinc-400">{getCostTypeLabel(item.costType)}</span>
          <span className="font-mono">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency}</span>
        </div>
      ))}
    </div>
  </ZenCard>
)}
```

#### (c) 요약 카드 — 라벨·계산식·색상 로직 전부 그대로 유지 (변경 없음)

jungjs 확정: "조정금액은 현재와 같은 로직으로 표출합니다." 3개 카드(예상 청구액/실제 청구액/조정 차액) 모두 **기존 라벨·기존 색상 강조 로직 그대로 유지**. 백엔드에서 `actual`/`variance` 값 자체가 이미 "예상청구액+추가부가요금" 기준으로 올바르게 계산되어 내려오므로(위 1번 항목), 프론트엔드는 **그 값을 그대로 표시하기만 하면 됩니다** — 카드 라벨이나 조건부 스타일 코드를 수정하지 마세요.

다만 캡션(작은 안내문구)만 실제 의미에 맞게 소폭 정정 가능:
- "실제 청구액 (Actual)" 카드 캡션: "아래 입력된 실제 항목의 합산액" → "예상 청구액 + 아래 추가 등록된 부가요금의 합산액"
- 나머지 캡션·라벨·색상 로직은 변경 금지

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-226-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 226 나와야 정상)
- [ ] 백엔드 2곳 수정(위 스펙대로)
- [ ] 프론트엔드 3곳 수정(위 스펙대로)
- [ ] 회귀 테스트 추가 — behavioral 기반:
  - `getUpsChargeReconciliation()`이 `estimatedBreakdown`을 정확히 반환하는지 + `actual = estimated + additionalSum`, `variance = actual - estimated`(수식은 기존 그대로, 값만 검증)가 정확히 계산되는지
  - `recordUpsActualCharges()`의 `adjustmentAmount`가 여전히 `actualSum - estimatedSum` 수식으로 계산되며, 그 결과값이 추가부가요금 합계와 일치하는지(수식이 안 바뀌었는지까지 확인 — 예: 추가부가요금 0원일 때 adjustmentAmount가 정확히 0인지)
  - 기존 `tests/unit/finance/ups-actual-charges.test.ts`의 TC-B204-01~07이 전부 그대로 통과하는지(회귀 확인)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/admin/ups-actual-charges`에서 `ZEN-2026-000001` 조회 → "예상 청구액 상세" 리스트에 `zen_order_costs`의 각 항목(기본운임/유류할증료/급증 긴급 수수료 등)이 표시되는지, 청구 항목 테이블이 빈 상태로 시작하는지, 부가요금 1건 추가·저장 후 "실제 청구액" 카드가 예상청구액+추가금액으로 정확히 갱신되고 "조정 차액" 카드가 그 추가금액과 일치하는지 확인 → 스크린샷(R-10)

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Mike] feat: TASK-B-226 ...`) → 2. **이 파일 그대로 사용**해 `[작업 결과]` 작성(새 파일 생성 금지) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 902 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #902`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 직전 TASK-B-224(같은 파일 `ups-actual-charges.ts`)에서 배정 파일을 무시하고 새 파일을 생성한 이력이 바로 오늘 있었음 — 이번엔 반드시 이 파일(`TASK-B-226_260727_Issue902_UpsChargesEstimateBreakdownAdditional_Mike.md`)에 직접 작업 결과를 작성할 것. R-10 스크린샷도 매번 누락됐었으니 이번엔 반드시 포함할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
