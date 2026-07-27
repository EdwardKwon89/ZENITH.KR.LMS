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

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. 백엔드 — `src/app/actions/finance/ups-actual-charges.ts`

#### `getUpsChargeReconciliation()` (약 248행)

기존 `estimatedCosts` 조회 결과를 이미 갖고 있으므로, 항목별 breakdown을 추가로 반환:

```ts
const estimatedBreakdown = (estimatedCosts || []).map((cost) => ({
  costType: cost.cost_type,
  amount: Number(cost.unit_price) * Number(cost.quantity || 1),
  currency: cost.currency,
}));
```

반환 객체에 `estimatedBreakdown`과 `finalTotal` 추가, `variance`는 `actual`(추가 부가요금 합계)과 동일한 값으로 의미 변경:

```ts
return {
  estimated,
  estimatedBreakdown,               // 신규
  actual,                            // 의미 변경: 이제 "추가 부가요금 합계"
  finalTotal: estimated + actual,    // 신규: 최종 청구서 금액
  variance: actual,                  // 변경 전: actual - estimated → 변경 후: actual 그대로
  currency,
  isFinalized: !!finalizedInvoice,
};
```

#### `recordUpsActualCharges()` (약 118행, `adjustmentAmount` 계산부)

```ts
// 변경 전
const adjustmentAmount = actualSum - estimatedSum;

// 변경 후 — actualSum이 이제 "추가 부가요금 합계"이므로 그대로 조정금액이 됨
const adjustmentAmount = actualSum;
```
`estimatedSum` 조회 로직(`estimatedCosts` select) 자체는 그대로 두되, 이 뺄셈에만 더 이상 사용하지 않게 됨 — 완전히 불필요해지면 정리해도 되고, 남겨둬도 무방(다른 곳에서 참조 안 하면 제거 권장).

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

#### (c) 요약 카드 라벨/의미 변경 (약 205~250행)

3개 카드 유지하되:
- **1번 카드** "예상 청구액 (Estimated)" — 그대로 유지(`estimatedTotal`)
- **2번 카드** "실제 청구액 (Actual)" → **"추가 부가요금 (Additional Charges)"**로 라벨 변경 (값은 기존 `actualTotal` 그대로 — 청구 항목 테이블의 합계)
- **3번 카드** "조정 차액 (Variance)" → **"최종 청구서 금액 (Final Invoice Total)"**으로 라벨 변경, 값은 `reconciliation.finalTotal`(또는 `estimatedTotal + actualTotal`) 표시. 기존의 +/- 색상 강조(빨강/파랑) 로직은 제거하고 단순 합계로 표시(증감 개념이 아니라 "합산 결과"이므로).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-226-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 226 나와야 정상)
- [ ] 백엔드 2곳 수정(위 스펙대로)
- [ ] 프론트엔드 3곳 수정(위 스펙대로)
- [ ] 회귀 테스트 추가 — behavioral 기반:
  - `getUpsChargeReconciliation()`이 `estimatedBreakdown`·`finalTotal`을 정확히 반환하는지(실제 로컬 DB 기반 또는 mock 어느 쪽이든, 값 계산 로직 검증)
  - `recordUpsActualCharges()`의 `adjustmentAmount`가 `actualSum`(estimatedSum 차감 없이)과 일치하는지
  - 기존 `tests/unit/finance/ups-actual-charges.test.ts`의 TC-B204-01~07이 전부 그대로 통과하는지(회귀 확인)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/admin/ups-actual-charges`에서 `ZEN-2026-000001` 조회 → "예상 청구액 상세" 리스트에 기본운임/유류할증료/급증 긴급 수수료/기타 부가운임 4개 항목이 표시되는지, 청구 항목 테이블이 빈 상태로 시작하는지, 부가요금 1건 추가·저장 후 "최종 청구서 금액"이 예상청구액+추가금액으로 정확히 계산되는지 확인 → 스크린샷(R-10)

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Mike] feat: TASK-B-226 ...`) → 2. **이 파일 그대로 사용**해 `[작업 결과]` 작성(새 파일 생성 금지) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 902 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #902`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 직전 TASK-B-224(같은 파일 `ups-actual-charges.ts`)에서 배정 파일을 무시하고 새 파일을 생성한 이력이 바로 오늘 있었음 — 이번엔 반드시 이 파일(`TASK-B-226_260727_Issue902_UpsChargesEstimateBreakdownAdditional_Mike.md`)에 직접 작업 결과를 작성할 것. R-10 스크린샷도 매번 누락됐었으니 이번엔 반드시 포함할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
