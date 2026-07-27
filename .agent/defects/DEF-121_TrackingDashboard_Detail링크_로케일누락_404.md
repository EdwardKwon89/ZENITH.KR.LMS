# DEF-121: TrackingDashboard "Detail" 링크 로케일 프리픽스 누락 — 404 발생

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-23 |
| **보고자** | jungjs |
| **긴급도** | High |
| **우선순위** | P2 |

## 현상

`/ko/tracking`(통합 트래킹) 화면의 오더 목록에서 "Detail" 클릭 시 404 발생.

## 근본 원인

`src/components/tracking/TrackingDashboard.tsx:257-263`

```tsx
<Link
  href={`/orders/${track.order_id}`}
  ...
>
  Detail
  <ExternalLink size={14} />
</Link>
```

`Link`는 `next/link`에서 직접 import(18행) — 로케일 세그먼트 없이 `/orders/${id}`로 이동. 프로젝트 구조상 오더 상세 페이지는 `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx`에 존재하므로, `/ko` 프리픽스가 없으면 매칭되는 라우트가 없어 404.

페이지 자체가 없는 게 아니라 **링크 생성 로직의 결함**.

## 참고 — 정상 동작 패턴

`src/components/orders/OrderDataTable.tsx:34-36,130`
```tsx
const params = useParams();
const safeLocale = (params?.locale as string) || locale || 'ko';
...
href={`/${safeLocale}/orders/${order.id}`}
```

또는 `src/i18n/routing.ts`의 `createNavigation(routing)`이 제공하는 로케일 인식 `Link`를 사용하는 대안도 가능.

## 조치안

`TrackingDashboard.tsx`에서 `useParams()`로 `safeLocale`을 구하거나 `next-intl` 라우팅 `Link`로 교체하여 `href`에 로케일 프리픽스 반영.

## 관련 파일
- `src/components/tracking/TrackingDashboard.tsx` (257-263행, import 18행)
- 참고: `src/components/orders/OrderDataTable.tsx`
