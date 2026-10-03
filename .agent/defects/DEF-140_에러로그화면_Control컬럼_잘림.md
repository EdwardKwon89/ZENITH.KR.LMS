# DEF-140: `/admin/error-logs` 화면 — Control 컬럼 잘림(가로 스크롤 체감 안 됨)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward가 배포된 `/admin/error-logs` 화면 스크린샷으로 지적(2026-10-03) — "CONTROL이 잘려서 보임, 좌측 SPAN이 다른 화면보다 넓음". Aiden이 production에서 Playwright 실측 재현 |
| **긴급도** | Medium (기능 장애 아님 — "Resolve" 버튼이 화면 밖으로 밀려 안 보이거나 스크롤해야만 보임, R-18/오늘 도입한 운영 모니터링 화면의 실사용성에 직결) |
| **발견일** | 2026-10-03 |

## 현상 (실측 재현)

`/ko/admin/error-logs`에서 테이블 마지막 컬럼 "Control"(Resolve 버튼·Sentry 링크)이 뷰포트 우측 밖으로 밀려 "CONTR"까지만 보임.

**실측(Playwright, windowInnerWidth=1470)**:
- 사이드바 고정폭 `280px`(다른 화면과 동일 — 사이드바 자체 폭 이상 없음)
- 테이블 렌더 폭 `1134px`, 스크롤 wrapper(`overflow-x-auto`) `clientWidth=1044px` → **90px 초과분이 스크롤 영역에만 담겨 있고 화면상 스크롤 가능하다는 시각적 단서(스크롤바 등)가 없어** 사용자는 "잘렸다"고 인지하게 됨.

## 원인

[`ErrorLogsTable.tsx`](../../src/components/admin/error-logs/ErrorLogsTable.tsx)의 "Error Message" 컬럼이 `max-w-[400px]`로 상당히 넓게 잡혀 있어, SEVERITY/CONTEXT/CREATED AT/STATUS/CONTROL 5개 컬럼을 합친 것보다 더 많은 폭을 혼자 사용 — 전체 테이블이 뷰포트보다 넓어지는 주원인. [`ZenDataGrid.tsx`](../../src/components/ui/ZenDataGrid.tsx)(공용 그리드 컴포넌트)는 `overflow-x-auto`만 있고 **컬럼별 `min-width`/`whitespace-nowrap` 보호 장치가 없어**, 폭이 부족한 컬럼(특히 버튼이 들어가는 CONTROL)이 눌리거나 밀려날 수 있음.

Edward가 언급한 "좌측 SPAN이 넓다"는 사이드바 자체 폭 이상(실측상 정상, 280px 고정)이라기보다, **Error Message 컬럼이 좌측~중앙을 과도하게 차지해 상대적으로 우측 컬럼들이 밀려나는 현상**을 가리킨 것으로 추정됨 — 단, 사용자 브라우저 폭에 따라 페이지 레벨 가로 스크롤(사이드바까지 함께 밀림)이 발생할 가능성도 배제 못 함(원격 재현 환경에서는 사이드바가 고정 위치로 정상 유지됨을 확인했으나, 실제 사용자 환경 폭은 다를 수 있음 — 담당자가 여러 해상도에서 재확인 필요).

## 권장 조치 (DoD)

1. "Error Message" 컬럼 `max-w-[400px]` → 더 보수적인 값(예: `max-w-[280~320px]`)으로 축소 검토
2. `ZenDataGrid.tsx`(공용 컴포넌트)에 CONTROL류 액션 컬럼을 위한 `whitespace-nowrap`/최소폭 보호 적용 — 다른 화면에서 이 컴포넌트를 재사용할 때도 동일 문제 재발 방지
3. 1280/1440/1920px 등 주요 해상도에서 실제 브라우저로 재현 — 페이지 레벨 가로 스크롤(사이드바까지 밀림)이 발생하는지, 테이블 내부 스크롤만으로 충분한지 확인
4. 스크롤이 더 필요한 경우, 스크롤 가능함을 시각적으로 알리는 장치(예: 우측 페이드 그라데이션, 테두리 그림자) 검토
5. 회귀 테스트: Control 컬럼이 항상 clip되지 않고 렌더링되는지(컴퓨티드 스타일 또는 스냅샷) 검증
6. R-10: 여러 해상도 스크린샷 첨부

## 파일 소유권 확인

`ErrorLogsTable.tsx`/`ZenDataGrid.tsx` — TASK-1138/1140(B_Kai, Team A) 소관 → **Team A 담당**
