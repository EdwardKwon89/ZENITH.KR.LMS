# DEF-B-020: `/admin/ups-actual-charges` "실제 청구액 (Actual)" 카드가 예상청구액을 전혀 반영하지 않음

| 항목 | 내용 |
|:------|:------|
| **발견일** | 2026-07-27 |
| **보고자** | Jaison — PR#906(TASK-B-227) 리뷰 중 R-10 스크린샷 확인 과정에서 발견 |
| **긴급도** | High |
| **우선순위** | P1 |
| **관련 Issue** | 신규 (아래 TASK-B-228로 배정) |
| **귀책 Task** | TASK-B-226 (PR#904, Mike) — 이번 TASK-B-227(PR#906, Dave/D_Kai)의 변경 범위 밖 |

## 현상

`/admin/ups-actual-charges`에서 예상 청구액이 `526,236.81 KRW`인 오더를 조회했을 때, "실제 청구액 (Actual)" 카드가 `0.00 KRW`로 표시됨(부가요금 행이 아직 등록되지 않은 상태). 카드 캡션에는 "예상 청구액 + 아래 추가 등록된 부가요금의 합산액"이라고 명시되어 있으나 실제 표시값은 이 문구와 전혀 다름. 같은 원인으로 "조정 차액 (Variance)"도 `-526,236.81 KRW`(예상청구액 전액이 마이너스로 표시)라는 잘못된 값이 표출됨.

(PR#906의 R-10 스크린샷 `01_ups_charges_no_invoice.png`/`02_ups_charges_with_invoice.png`에서 직접 확인 — 두 파일이 MD5 동일이라는 별도 문제와 함께, 그 화면 자체에 이 결함이 그대로 노출되어 있었음)

## 원인 (코드 확인 완료)

`src/components/orders/UpsActualAdjustmentForm.tsx`:

```ts
const actualTotal = charges.reduce((sum, c) => sum + c.amount, 0);   // 151행
const estimatedTotal = reconciliation?.estimated || 0;                // 152행
const variance = actualTotal - estimatedTotal;                        // 153행
```

TASK-B-226(PR#904)에서 백엔드 `getUpsChargeReconciliation()`을 `actual = estimated + additionalSum`, `variance = actual - estimated`로 정확히 수정했지만(`src/app/actions/finance/ups-actual-charges.ts:284,286`), **프론트엔드는 이 값(`reconciliation.actual`/`reconciliation.variance`)을 전혀 사용하지 않고**, 로컬 `charges`(현재 화면에서 입력 중인 추가 부가요금 행)만 합산한 `actualTotal`을 독자적으로 재계산해 카드에 표시하고 있음. `grep` 확인 결과 `reconciliation.actual`/`reconciliation.variance`는 컴포넌트 어디에서도 참조되지 않음.

결과적으로 "실제 청구액" 카드는 캡션이 설명하는 값(예상+추가)이 아니라 "추가로 등록한 부가요금 합계만"을 표시 — 부가요금을 하나도 등록하지 않은 상태에서는 예상청구액이 있어도 무조건 0으로 보임.

## 조치안

`UpsActualAdjustmentForm.tsx` 151~153행을 백엔드 값 기준으로 교체:

```ts
const actualTotal = reconciliation?.actual ?? 0;
const estimatedTotal = reconciliation?.estimated || 0;
const variance = reconciliation?.variance ?? 0;
```

(로컬 `charges.reduce()`는 더 이상 카드 표시용으로 사용하지 않음 — 단, `charges` 배열 자체는 편집 테이블 렌더링·`handleSave` payload 용도로는 계속 필요하므로 그대로 유지)

## 관련 Task
- `TASK-B-228` (Mike, 완료)

## 관련 파일
- `src/components/orders/UpsActualAdjustmentForm.tsx` (151~153행, `actualTotal`/`estimatedTotal`/`variance`)
- `src/app/actions/finance/ups-actual-charges.ts` (`getUpsChargeReconciliation()`, 참고용 — 이 파일은 이미 정확함, 수정 불필요)

## 해소 확인

PR#909(TASK-B-228, 커밋 `d3195375`)에서 조치안대로 수정 완료, TeamB_Dev 병합 완료(`bcebb28f`). Jaison이 격리 워크트리에서 버그 재현(수정 전 코드로 되돌려 재실행) → 신규 테스트 2건 모두 정확히 FAIL 확인 → 원복 후 전체 회귀 137 files/913 tests ALL PASS 재검증. R-10은 JSJung 직접 화면 확인으로 대체.
