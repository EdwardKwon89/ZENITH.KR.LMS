# DEF-B-005: TrackingDashboard Provider 배지가 UPS 오더에 "MANUAL"로 오표시 — Issue #851 캐리어 배지 목적 미실현

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — PR#857(TASK-B-209/DEF-B-004) 재검토 중 발견 |
| **긴급도** | Medium |
| **우선순위** | P3 |

## 원인 — DEF-B-004 정정(Jaison 지시)의 부작용, Baker 귀책 아님

PR#857(TASK-B-209)에서 `zen_tracking_configs.provider_type`을 `'API'`(CHECK 위반)에서 `'MANUAL'`로 재정정했습니다(Jaison이 "MockCarrierProvider 트리거 차단"을 위해 제안한 값). 이 자체는 데이터 오염(Mock 트래킹 이벤트 오삽입) 위험을 없애는 올바른 조치였으나, 부작용으로 `TrackingDashboard.tsx`의 Provider 배지가 UPS 오더에 대해 더 이상 의미 있는 표시를 하지 못하게 되었습니다.

## 현상

`TrackingDashboard.tsx:217-224`:
```tsx
<span className={cn(
  "text-[10px] px-1.5 py-0.5 rounded-full w-fit mt-1 border",
  track.provider_type === "API" ? "bg-blue-50 text-blue-600 border-blue-100" :
  track.provider_type === "VIRTUAL" ? "bg-purple-50 text-purple-600 border-purple-100" :
  "bg-slate-50 text-slate-600 border-slate-200"
)}>
  {track.provider_type}
</span>
```
`provider_type`이 `'MANUAL'`이 되면서 색상 분기 어디에도 매칭되지 않아 무색(회색) 스타일로 떨어지고, 배지 텍스트도 UPS 오더인데 그대로 **"MANUAL"**로 노출됩니다. `provider_name`(215행)도 `'MANUAL'` 문자열이라 캐리어를 전혀 식별할 수 없습니다.

Issue #851(TASK-B-207)이 애초에 만들려던 "통합트래킹 캐리어 배지" 기능이 DEF-B-004 정정 이후에도 여전히 실현되지 않은 상태입니다.

## 조치안 (Jaison 확정 설계)

DB 제약(`provider_type` CHECK `VIRTUAL/MANUAL/API`)은 건드리지 않습니다 — 이미 같은 컴포넌트 261행에서 링크 분기 목적으로 `track.order?.transport_mode === 'UPS'`를 사용 중이므로, 배지도 **동일 필드를 우선 체크**하도록 순수 프론트엔드 표시 로직만 변경합니다(스키마·서버 변경 없음, 리스크 낮음).

`TrackingDashboard.tsx` 213-226행(Provider 컬럼) 교체:
```tsx
<div className="flex flex-col">
  <span className="text-sm text-slate-900 font-medium">
    {track.order?.transport_mode === 'UPS' ? 'UPS' : (track.provider_name || "—")}
  </span>
  <span className={cn(
    "text-[10px] px-1.5 py-0.5 rounded-full w-fit mt-1 border",
    track.order?.transport_mode === 'UPS' ? "bg-blue-50 text-blue-600 border-blue-100" :
    track.provider_type === "API" ? "bg-blue-50 text-blue-600 border-blue-100" :
    track.provider_type === "VIRTUAL" ? "bg-purple-50 text-purple-600 border-purple-100" :
    "bg-slate-50 text-slate-600 border-slate-200"
  )}>
    {track.order?.transport_mode === 'UPS' ? 'UPS' : track.provider_type}
  </span>
</div>
```
`transport_mode`는 이미 `getGlobalTrackingOverview()`의 order 서브쿼리에 select되어 있어(기존 TASK-B-200) 별도 쿼리 변경 불필요.

## 검증 요구사항

- 렌더링 기반 behavioral 테스트 필수(toContain 소스 문자열 검사 금지) — `tests/unit/tracking/tracking-dashboard.test.tsx`에 케이스 추가:
  - UPS 오더(mock `order.transport_mode: 'UPS'`) → Provider 컬럼에 "UPS" 텍스트 + 파란 배지 렌더링 확인
  - 비UPS 오더(AIR 등, 기존 `provider_type='VIRTUAL'`) → 기존 로직대로 보라 배지 유지되는지 회귀 확인(기존 동작 깨지지 않았는지)

## 관련 Task
- `TASK-B-210` (배정 예정) — 이 DEF의 수정 담당

## 관련 파일
- `src/components/tracking/TrackingDashboard.tsx:213-226`
- `src/app/actions/operations/tracking.ts` (`getGlobalTrackingOverview` — `transport_mode` 이미 select됨, 변경 불필요)
