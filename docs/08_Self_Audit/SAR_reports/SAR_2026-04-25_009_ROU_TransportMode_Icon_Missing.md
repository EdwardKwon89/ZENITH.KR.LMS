# SAR-009: `RouteMilestoneTimeline` — 운송 수단(AIR/SEA/LAND) 아이콘 미표시

> **보고서 번호:** SAR_2026-04-25_009  
> **발견일:** 2026-04-25  
> **발견자:** Aiden (UAT-03 정적 검증)  
> **심각도:** 🟢 Low  
> **상태:** ✅ CLOSED — Aiden 직접 수정 완료 (2026-04-25, 회귀 108/108 PASS)

---

## 1. 문제 요약

`RouteMilestoneTimeline.tsx`에서 각 마일스톤의 운송 수단(`mode: 'AIR' | 'SEA' | 'LAND'`) 필드가 타입 정의에는 존재하나 JSX 렌더링에 포함되지 않아, UAT 시나리오 TC-UAT-ROU.3 Step 3의 기대값과 불일치.

---

## 2. UAT 시나리오 vs 실제 구현 비교

**TC-UAT-ROU.3 Step 3 기대값:**
> "각 마일스톤에 포트명, **운송 수단(AIR/SEA/LAND) 아이콘**, 예상 소요일 표시"

**현재 구현 (`RouteMilestoneTimeline.tsx:60-72`):**
```tsx
<div className="flex items-center gap-1.5 mt-0.5">
  <MapPin className="w-3 h-3 text-slate-400" />
  <span className="text-[10px] text-slate-500 font-medium">
    {milestone.location.lat.toFixed(2)}, {milestone.location.lng.toFixed(2)}
  </span>
</div>
<div className={cn("mt-2 inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ...")}>
  {milestone.status}  {/* COMPLETED / PENDING 만 표시 */}
</div>
```

`milestone.mode` 필드가 Props 인터페이스(`RouteMilestoneTimelineProps`)에 선언되어 있으나 (`mode: 'AIR' | 'SEA' | 'LAND'`) 렌더링 로직에서 사용되지 않음.

---

## 3. 근본 원인

`getRouteVisualization` Action에서 세그먼트의 `transport_mode`를 마일스톤으로 변환할 때 `mode` 필드를 정상 포함하나, 컴포넌트 구현 시 해당 필드를 렌더링하는 코드가 누락됨.

```typescript
// routing.ts:132-138 — mode 필드 정상 생성
milestones.push({
  name: firstPortName,
  location: MOCK_PORT_COORDS[firstPortName] || { lat: 0, lng: 0 },
  mode: firstSegment.transport_mode,  // ← 데이터는 있음
  status: eventLocations.has(firstPortName) ? 'COMPLETED' : 'PENDING'
});
```

---

## 4. 수정 방안

**운송 수단 아이콘 추가 (lucide-react 활용)**

```tsx
// RouteMilestoneTimeline.tsx — 아이콘 매핑 추가
import { Plane, Ship, Truck, MapPin, Navigation, CheckCircle2, CircleDashed } from "lucide-react";

const ModeIcon = ({ mode }: { mode: 'AIR' | 'SEA' | 'LAND' }) => {
  const icons = {
    AIR: <Plane className="w-3 h-3" />,
    SEA: <Ship className="w-3 h-3" />,
    LAND: <Truck className="w-3 h-3" />,
  };
  return icons[mode] || null;
};

// 마일스톤 카드 내 mode 표시 추가
<div className="flex items-center gap-1 mt-1">
  <ModeIcon mode={milestone.mode} />
  <span className="text-[9px] text-slate-400 font-medium uppercase">{milestone.mode}</span>
</div>
```

---

## 5. 영향 범위

| 항목 | 영향 |
|:---|:---|
| 기능 동작 | ✅ 정상 (데이터 흐름 무결) |
| UAT TC-UAT-ROU.3 Step 3 충족 여부 | ❌ 미충족 |
| 운영 UX | 🟡 정보 미표시 (AIR/SEA/LAND 구분 불가) |

---

## 6. 재발 방지 대책

- Props 인터페이스 정의 후 렌더링 코드 작성 시 모든 필드 사용 여부 체크
- 컴포넌트 구현 체크리스트에 "Props 전체 필드 렌더링 확인" 항목 추가

---

*작성: Aiden (2026-04-25) | UAT-03 정적 검증 결과*
