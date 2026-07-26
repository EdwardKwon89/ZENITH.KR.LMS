# TASK-B-212: DEF-B-006 — TrackingDashboard 집계 캡·13종 미집계·상태 텍스트 불일치·tracking_number 표기 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#861](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/861) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

JSJung이 `/ko/tracking` 집계 규칙·리스트 표출 로직을 직접 검토 지시했고, Jaison의 코드 리뷰로 4개 결함을 확인했습니다(`.agent/defects/DEF-B-006_...md` 참조). JSJung 확정 요구사항:
1. `OrderStatus` 13종 모두 집계, **Total Tracks = 13종의 합계**
2. 50건 페이지네이션 제한 해제
3. Latest Status 셀의 아이콘-텍스트 불일치도 같이 수정(JSJung 지시로 범위 통합)
4. `tracking_no`가 NULL이면 "—" 대신 공백 출력

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다. 기존 `ORDER_STATUS_META`/`ZenStatusBadge`(이미 프로젝트 전역에서 사용 중인 컴포넌트)를 재사용하므로 신규 i18n 키가 필요 없습니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/app/actions/operations/tracking.ts` — `getGlobalTrackingOverview()` 페이지네이션 캡 제거

193-212행의 `.range(from, to)` 호출을 제거합니다(PostgREST `max_rows=1000`이 안전판으로 남아있어 별도 조치 불필요 — `supabase/config.toml:18` 확인 완료). `page`/`pageSize` 파라미터는 시그니처만 유지(기존 테스트 호출부 `getGlobalTrackingOverview(1, 50)` 호환 목적, 실제로는 미사용):

```ts
export async function getGlobalTrackingOverview(page = 1, pageSize = 50) {
  const { supabase } = await validateUserAction();

  const { data, error, count } = await supabase
    .from("zen_tracking_configs")
    .select(`
      id,
      order_id,
      provider_type,
      provider_name,
      tracking_no,
      updated_at,
      order:zen_orders(
        id,
        order_no,
        shipper_id,
        recipient_name,
        transport_mode,
        status
      )
    `, { count: "exact" })
    .order("updated_at", { ascending: false });
  // .range(from, to) 제거 — 50건 캡 해제, PostgREST max_rows=1000이 안전 상한
  ...
```
`from`/`to` 계산 라인도 함께 제거.

### 2. `src/components/tracking/TrackingDashboard.tsx` — 상단 import 추가

```tsx
import { useTranslations } from 'next-intl';
import { OrderStatus, ORDER_STATUS_META } from '@/types/orders';
import { ZenStatusBadge } from '@/components/domain/ZenStatusBadge';
```

### 3. 통계 카드 — 13종 전체 + Total(합계)

기존 `stats` 배열(81-88행)을 교체:

```tsx
const t = useTranslations('orderStatus');

const STATUS_ORDER: OrderStatus[] = [
  OrderStatus.REGISTERED, OrderStatus.SCHEDULED, OrderStatus.WAREHOUSED,
  OrderStatus.PACKED, OrderStatus.RELEASED, OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED, OrderStatus.CLAIMED, OrderStatus.HELD,
  OrderStatus.CANCELED, OrderStatus.RETURNED, OrderStatus.DISPOSED,
  OrderStatus.MASTERED,
];

// ORDER_STATUS_META 배지 색상(bg-*-100/text-*-800)과 같은 색상군의 큰 숫자용 text-*-600 매핑
const STATUS_TEXT_COLOR: Record<OrderStatus, string> = {
  [OrderStatus.REGISTERED]: 'text-blue-600',
  [OrderStatus.SCHEDULED]: 'text-indigo-600',
  [OrderStatus.WAREHOUSED]: 'text-yellow-600',
  [OrderStatus.PACKED]: 'text-orange-600',
  [OrderStatus.RELEASED]: 'text-purple-600',
  [OrderStatus.IN_TRANSIT]: 'text-cyan-600',
  [OrderStatus.DELIVERED]: 'text-green-600',
  [OrderStatus.CLAIMED]: 'text-amber-600',
  [OrderStatus.HELD]: 'text-red-600',
  [OrderStatus.CANCELED]: 'text-gray-600',
  [OrderStatus.RETURNED]: 'text-rose-600',
  [OrderStatus.DISPOSED]: 'text-stone-600',
  [OrderStatus.MASTERED]: 'text-slate-700',
};

const statusStats = STATUS_ORDER.map(status => ({
  label: t(ORDER_STATUS_META[status].labelKey),
  value: tracks.filter(tr => tr.order?.status === status).length,
  color: STATUS_TEXT_COLOR[status],
}));

const stats = [
  { label: "Total Tracks", value: statusStats.reduce((sum, s) => sum + s.value, 0), color: "text-slate-900" },
  ...statusStats,
];
```

**Total Tracks는 반드시 `statusStats`의 합계로 계산**(요구사항 그대로) — `tracks.length`를 직접 쓰지 않습니다. `zen_orders.status`가 없는(NULL) 레코드가 있으면 합계가 `tracks.length`보다 작아질 수 있는데, 이는 의도된 동작입니다(정의되지 않은 상태는 어느 카드에도 안 잡히는 게 맞음 — 발생 시 `[발견 이슈]`에 기재).

### 4. 통계 카드 그리드 — 14개(Total+13) 대응

90-95행 그리드 클래스와 스켈레톤 개수 변경:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7 gap-4">
  {loading ? (
    Array.from({ length: 14 }).map((_, i) => <StatCardSkeleton key={i} />)
  ) : (
    ...
```

### 5. "Latest Status" 셀 — order.status 배지로 전환(230-257행 교체)

```tsx
<td className="px-6 py-4">
  <div className="flex flex-col gap-1">
    {track.order?.status && (
      <ZenStatusBadge status={track.order.status as OrderStatus} size="sm" />
    )}
    {track.latest_event ? (
      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
        <MapPin size={12} className="shrink-0" />
        <span className="truncate">
          {track.latest_event.description}{track.latest_event.location ? ` · ${track.latest_event.location}` : ''}
        </span>
      </div>
    ) : (
      !track.order?.status && <span className="text-xs text-slate-400">No events yet</span>
    )}
  </div>
</td>
```
`CheckCircle2`/`AlertCircle`/`RefreshCw` 아이콘 기반 분기는 제거(더 이상 사용 안 하면 import에서도 정리). `ZenStatusBadge`가 색상·아이콘 역할을 i18n 라벨로 대체합니다. 원본 이벤트 설명/위치는 보조 정보로 유지(있을 때만 표시).

### 6. `tracking_no` NULL 처리 (211-213행)

```tsx
<td className="px-6 py-4 text-sm font-medium text-slate-700">
  {track.tracking_no || ""}
</td>
```

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-212-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 212 나와야 정상)
- [ ] `tracking.ts`에서 `.range()` 제거
- [ ] `TrackingDashboard.tsx` 통계 카드 13종+Total 전환, 그리드 14칸 대응
- [ ] Latest Status 셀 `ZenStatusBadge` 전환
- [ ] `tracking_no` NULL → 공백
- [ ] 회귀 테스트 추가 — **반드시 behavioral 기반**(`toContain` 소스 문자열 검사 금지):
  - 백엔드: mock supabase가 60건 이상 반환할 때 `getGlobalTrackingOverview()` 결과 `configs.length`가 60(전량)으로 나오는지 — 50으로 잘리지 않는지 검증 (`.range` 미호출 자체를 직접 검증해도 좋음)
  - 프론트: `order.status`가 REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/CANCELED/DISPOSED/MASTERED(기존에 카드 없던 8종 중 최소 2~3종 샘플) 포함한 mock 데이터로 렌더링 후 해당 카드 숫자가 정확한지, Total이 13개 합과 일치하는지 검증
  - 프론트: `ZenStatusBadge`가 실제로 렌더링되어 상태별 i18n 라벨 텍스트가 표시되는지 검증(예: DELIVERED 오더 → "배송완료" 등 실제 번역 문자열 — `messages/ko.json`의 `orderStatus.DELIVERED.label` 확인 후 사용)
  - 프론트: `tracking_no: null`인 mock row가 셀에 빈 문자열로 렌더링되는지("—" 텍스트가 나오지 않는지) 검증
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Mike] fix: TASK-B-212 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 861 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-006 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #861`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — `toContain` 소스 문자열 검사 누적 9회(가장 최근 TASK-B-208/PR#855). 이번 Task는 특히 "13종 각각 정확한 카운트"가 핵심 검증 대상이라 vacuous test로는 실제 버그를 못 잡습니다. TASK-B-208 재작업(PR#855 최종본)에서 본인이 정확히 만들었던 카드별 실제 숫자 검증 패턴을 그대로 재사용할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
