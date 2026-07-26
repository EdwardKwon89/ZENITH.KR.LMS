# TASK-B-210: DEF-B-005 — TrackingDashboard Provider 배지 UPS 오더 미표시 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#858](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/858) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 개요

PR#857(TASK-B-209/DEF-B-004)에서 `zen_tracking_configs.provider_type`을 `'API'`(CHECK 위반) → `'MANUAL'`로 재정정하면서, `TrackingDashboard.tsx`의 Provider 배지가 UPS 오더에 "MANUAL"로 오표시되는 부작용이 생겼습니다. Issue #851(TASK-B-207)이 원래 만들려던 "UPS 캐리어 배지" 목적이 여전히 미실현 상태입니다. 상세 원인은 `.agent/defects/DEF-B-005_TrackingDashboard_ProviderBadge_UPS미표시.md` 참조.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

DB 제약(`provider_type` CHECK)은 건드리지 않습니다. 이미 같은 컴포넌트 261행에서 링크 분기 목적으로 `track.order?.transport_mode === 'UPS'`를 사용 중이므로(TASK-B-200), 배지도 동일 필드를 우선 체크하도록 **순수 프론트엔드 표시 로직만** 변경합니다. `transport_mode`는 `getGlobalTrackingOverview()` order 서브쿼리에 이미 select되어 있어 서버/쿼리 변경 불필요.

`src/components/tracking/TrackingDashboard.tsx` 213-226행(Provider 컬럼) 교체:
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

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-210-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 210 나와야 정상)
- [ ] `TrackingDashboard.tsx` Provider 컬럼 위 스펙대로 교체
- [ ] 회귀 테스트 추가 — **반드시 behavioral/렌더링 기반**(`toContain` 소스 문자열 검사 금지):
  - `tests/unit/tracking/tracking-dashboard.test.tsx`에 UPS 오더(mock `order.transport_mode: 'UPS'`) 케이스 추가 → Provider 컬럼에 "UPS" 텍스트 + 파란 배지 렌더링 확인
  - 비UPS 오더(기존 `provider_type` 기반 케이스, 예: `VIRTUAL`) 회귀 케이스도 함께 추가해 기존 보라 배지 동작이 안 깨졌는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Baker] fix: TASK-B-210 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 858 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #858`) — PR 본문/task file에 DEF-B-005 문서도 함께 갱신(검증 결과 반영)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 최근 이력: PR#844(🔍 설계확정 무시 착수), PR#837(타인 작업 기록 덮어쓰기). 이번 Task는 Jaison이 설계를 이미 확정해뒀으므로 별도 설계 의견 없이 스펙대로 구현하되, task file `[작업 결과]` 섹션 작성 시 기존 기록을 삭제하지 말 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
