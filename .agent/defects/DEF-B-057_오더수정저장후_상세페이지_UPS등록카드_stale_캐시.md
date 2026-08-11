# DEF-B-057 (Medium) — UPS 등록취소 후 오더 상세 페이지에 "UPS 등록" 카드가 stale하게 남음

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-12 |
| **발견 경위** | JSJung — ZEN-2026-000008 UPS 등록취소 성공했는데 오더 상세 페이지에 "UPS 등록" 카드(취소 버튼 등)가 여전히 보인다고 보고 |
| **긴급도** | Medium |
| **영향 범위** | `undoUpsRegistration()`/`cancelUpsRegistration()`/`registerUpsOrder()` 등 `zen_ups_labels` 상태를 바꾸는 모든 warehouse/ups-labels 서버 액션 — 오더 상세 페이지(`/orders/[orderId]`)의 캐시가 갱신되지 않음 |

## 근본 원인 (확정 완료)

DB 상태는 **정상**임을 직접 확인:
- `zen_ups_labels`에서 해당 오더 라벨 레코드 실제 삭제(0건)
- `zen_orders.status` → `WAREHOUSED`로 정상 전환

오더 상세 페이지(`src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx`)는 `getUpsLabelStatus(orderId)` → `hasActiveLabel` 값으로 UPS 등록 카드(`UpsTradeDocumentActions`) 노출 여부를 결정한다. 문제는 `cancelUpsRegistration()`/`undoUpsRegistration()`(및 관련 warehouse.ts 액션들)이 다음만 호출한다는 것:

```ts
revalidatePath("/(dashboard)/orders", "page");
```

이건 오더 **목록** 페이지(`/orders`)만 무효화하고, 동적 상세 페이지 `/orders/[orderId]`는 Next.js `revalidatePath`의 무효화 대상에 포함되지 않는다(정확히 그 경로 세그먼트만 타겟팅됨). 그 결과 오더 상세 페이지를 이미 열어둔 상태였거나 클라이언트 라우터 캐시에 이전 상태가 남아있으면, 취소/등록 후에도 새로고침 전까지 카드가 stale하게 보일 수 있다.

`grep -n "revalidatePath" src/app/actions/operations/{warehouse,ups-labels}.ts` 확인 결과 두 파일 어디에도 `/orders/[orderId]` 형태의 동적 상세 페이지 revalidate 호출이 전혀 없음.

## 재현 절차

1. UPS 등록 완료 상태의 오더에서 오더 상세 페이지를 열어둔 채로
2. 창고 화면(`/warehouse/outbound`)에서 해당 오더 UPS 등록취소 실행 → 성공
3. 열어둔 오더 상세 페이지로 돌아가면 "UPS 등록" 카드(문서 발급/취소 버튼)가 여전히 표시됨(새로고침 전까지)

## 수정 방향

`cancelUpsRegistration()`, `undoUpsRegistration()`, 그리고 라벨 상태를 바꾸는 다른 관련 액션들(`registerUpsOrder`/`fetchAndIssueUpsLabel`/`voidUpsLabel` 등)에 동적 세그먼트 패턴으로 상세 페이지도 함께 revalidate 추가:

```ts
revalidatePath('/(dashboard)/orders/[orderId]', 'page');
```

과설계 금지 — 이미 라벨 상태를 바꾸는 모든 지점에 `revalidatePath("/(dashboard)/orders", "page")`가 있으니 그 옆에 위 한 줄만 추가하면 됨.
