# DEF-126: 신규 UPS Order Detail 화면(ups-detail)으로의 내비게이션 연결 누락

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-24 |
| **보고자** | Aiden (Edward 지적 — "Team B에서 신규 화면이 안 보인다" 확인 요청) |
| **긴급도** | High |
| **우선순위** | P1 |
| **연결 이슈** | TASK-189(Issue #607, 신규 화면 최초 구현) / TASK-209(Issue #794, order.status 재구성) |

## 현상

TASK-189/TASK-209로 만든 신규 UPS 전용 Order Detail 화면(`/orders/[orderId]/ups-detail`, 7단계 스텝퍼·실시간 확인·품목 팝업 포함)이 실제로는 **일반적인 사용 흐름으로 도달할 방법이 없음**. 오더 목록에서 "View Details"를 클릭하면 UPS 오더든 아니든 항상 구식 범용 상세 화면(`/orders/[orderId]`)으로 이동한다.

## 근본 원인

`src/components/orders/OrderDataTable.tsx:129-134`의 "View Details" 링크가 `transport_mode`와 무관하게 항상 고정 경로로 하드코딩되어 있음:

```tsx
<Link href={`/${safeLocale}/orders/${order.id}`}>
  View Details
</Link>
```

- `orders` 배열은 `getOrders()`(`src/app/actions/operations/orders.ts:275`) → `OrderRepository.findList()`(`src/lib/repositories/order.repository.ts:82`, `select('*')`)로 조회되어 **`transport_mode` 필드는 이미 포함되어 있음** — 단순히 이 값을 조건 분기에 안 쓴 것.
- 범용 상세 페이지(`src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx:91`)도 `isUpsOrder = order.transport_mode === 'UPS'` 플래그가 있으나, 페이지 이동(redirect)에는 전혀 쓰이지 않고 페이지 내부 일부 섹션(UPS 인보이스 출력 버튼 등) 노출 여부에만 쓰임 — 즉 범용 페이지 자체가 UPS 오더를 부분적으로만 지원하도록 이미 손질되어 있었음.
- `middleware.ts`에도 UPS 관련 리다이렉트 로직 없음.

현재 `/ups-detail`로 연결되는 유일한 경로는 `src/components/finance/ShipperDailyBillingClient.tsx:482`의 하드코딩된 링크 1곳뿐(화주 일별 청구 화면에서만 도달 가능).

## 영향 범위

| 컴포넌트 | 파일 | 증상 |
|:--------|:-----|:-----|
| `OrderDataTable` | `src/components/orders/OrderDataTable.tsx:129-134` | 모든 오더 상세보기 링크가 UPS 여부 무관 고정 경로 |
| 범용 상세 페이지 | `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx` | UPS 오더도 이 페이지에서 열림 — redirect 없음 |

## 영향

- TASK-189/TASK-209에 투입된 UPS 전용 화면(order.status 7단계 스텝퍼, 실시간 확인 버튼, Agency 수동 DELIVERED, 품목 팝업 등)이 정상 운영 흐름에서는 **사실상 아무도 볼 수 없음** — URL을 직접 입력하거나 화주 일별 청구 화면을 거쳐야만 도달 가능.
- Team B가 develop 동기화 후 "최신 화면이 보이지 않는다"고 확인 요청한 근본 원인.

## 조치 방향 (설계 결정 필요)

| 안 | 설명 | 장단점 |
|:---|:-----|:-------|
| A. `OrderDataTable` 링크 조건 분기 | `order.transport_mode === 'UPS'`일 때만 `/ups-detail`로 링크, 그 외엔 기존 경로 유지 | 가장 단순, 목록 단계에서 바로 분기 |
| B. 범용 상세 페이지에서 redirect | `/orders/[orderId]/page.tsx` 진입 시 UPS 오더면 `/ups-detail`로 서버 redirect | 기존 북마크/링크도 자동 전환되나, 범용 페이지의 기존 UPS 부분 지원 섹션과 역할 중복 정리 필요 |
| C. A+B 병행 | 목록 링크도 바꾸고 범용 페이지도 안전망으로 redirect | 가장 견고하나 범용 페이지의 기존 UPS 섹션(인보이스 출력 등) 정리 필요, 범위가 커짐 |

**현재 상태**: 발견만 되어 있으며, 수정은 별도 Task(TASK-210, Riley 배정)에서 설계 결정 후 진행.

## 검증 방법 제안

- UPS 오더로 목록 접속 → "View Details" 클릭 → `/ups-detail`로 이동하는지 확인
- 비UPS 오더는 기존 `/orders/[orderId]`로 정상 유지되는지 확인
- 직접 `/orders/[orderId]` URL로 UPS 오더 접근 시 처리 방식(B/C안 채택 시 redirect 확인)
