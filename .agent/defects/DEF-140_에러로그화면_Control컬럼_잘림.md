# DEF-140: `/admin/error-logs` 화면 — 좌측 여백 과다(이중 패딩) + Control 컬럼 잘림

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward가 배포된 `/admin/error-logs` 화면 스크린샷으로 지적(2026-10-03) — "CONTROL이 잘려서 보임, 좌측 SPAN이 다른 화면보다 넓음". 이후 "사이드바 폭이 아니라, 사이드바 오른쪽 끝~데이터 그리드/캡션 좌측 끝까지의 공간이 다른 화면(운송 목록)보다 넓다"고 정밀 재지적. Aiden이 production에서 Playwright 실측으로 두 화면을 직접 비교해 **확인(CONFIRMED)** |
| **긴급도** | Medium (기능 장애 아님 — 레이아웃 불일치 + 그 결과로 Control 컬럼이 밀려 잘림) |
| **발견일** | 2026-10-03 |

## 원인 ① — 좌측 여백 이중 패딩 (Edward 지적, 실측으로 확정)

**실측 비교(Playwright, production, 동일 세션 동일 뷰포트)**:

| 화면 | `asideRight` | `tableLeft`(데이터 그리드 좌측 끝) | 사이드바→그리드 Span |
|:---|:---:|:---:|:---:|
| `/ko/orders` (운송 목록) | 280px | 313px | **33px** |
| `/ko/admin/error-logs` | 280px | 353px | **73px** |

→ **40px 차이 확정**. Edward가 지적한 "좌측 SPAN이 다른 화면보다 넓다"는 체감이 아니라 실측으로 재현되는 실제 레이아웃 결함.

**원인(코드 비교)**:
- [`(dashboard)/layout.tsx`](../../src/app/[locale]/(dashboard)/layout.tsx) → `ZenShell`의 `<main>`이 공통으로 `padding-left: 32px`를 적용(모든 대시보드 화면 공통, 정상).
- 대부분의 화면은 이 32px에 얹는 자체 좌우 패딩이 없음 — 예) [`orders/page.tsx`](../../src/app/[locale]/(dashboard)/orders/page.tsx)의 루트 `<div className="space-y-4 ...">`, [`master-orders/page.tsx`](../../src/app/[locale]/(dashboard)/master-orders/page.tsx)의 루트 `<div className="space-y-8 ... pb-20">` — 둘 다 `p-*` 좌우패딩 없음 → `<main>`의 32px만 적용(실측 33px, Orders 기준).
- [`admin/error-logs/page.tsx`](../../src/app/[locale]/(dashboard)/admin/error-logs/page.tsx)만 루트 `<div className="p-6 md:p-10 space-y-8">`로 **자체 좌우 패딩을 추가로 얹음**(`md:p-10` = 40px) → `<main>`의 32px + 자체 40px = **72px**(실측 72~73px, 오차는 테이블 테두리 등 서브픽셀) — **다른 화면에 없는 이중 패딩이 이 화면에만 존재**.

## 원인 ② — Control 컬럼 잘림(①의 결과 + 컬럼 폭 배분 문제)

`/ko/admin/error-logs`에서 테이블 마지막 컬럼 "Control"(Resolve 버튼·Sentry 링크)이 뷰포트 우측 밖으로 밀려 "CONTR"까지만 보임.

**실측(Playwright, windowInnerWidth=1470)**:
- 테이블 렌더 폭 `1134px`, 스크롤 wrapper(`overflow-x-auto`) `clientWidth=1044px` → 90px 초과분이 스크롤 영역에만 담겨 있고 화면상 스크롤 가능하다는 시각적 단서(스크롤바 등)가 없어 사용자는 "잘렸다"고 인지하게 됨.
- 이 90px 중 상당 부분은 **원인①의 좌측 이중 패딩(40px)이 그만큼 콘텐츠 가용 폭을 깎아먹은 결과**이며, 나머지는 [`ErrorLogsTable.tsx`](../../src/components/admin/error-logs/ErrorLogsTable.tsx)의 "Error Message" 컬럼이 `max-w-[400px]`로 넓게 잡혀 SEVERITY/CONTEXT/CREATED AT/STATUS/CONTROL 5개 컬럼을 합친 것보다 더 많은 폭을 혼자 사용하는 데서 기인. [`ZenDataGrid.tsx`](../../src/components/ui/ZenDataGrid.tsx)(공용 그리드 컴포넌트)도 `overflow-x-auto`만 있고 컬럼별 `min-width`/`whitespace-nowrap` 보호 장치가 없어 CONTROL처럼 버튼이 들어가는 컬럼이 눌리거나 밀려날 수 있음.

→ **원인①(이중 패딩)을 제거하면 가용 폭이 40px 늘어나 Control 컬럼 잘림이 상당 부분 완화**될 것으로 예상되나, Error Message 컬럼 폭 자체도 과도하므로 ②도 별도로 조치 필요.

## 권장 조치 (DoD)

1. **[원인① 수정]** `admin/error-logs/page.tsx` 루트 `<div>`의 `p-6 md:p-10`을 다른 대시보드 화면과 동일하게 제거(또는 `<main>` 패딩과 중복되지 않는 값으로 조정) — 다른 화면과 좌측 정렬 일치 확인.
2. **[원인② 수정]** "Error Message" 컬럼 `max-w-[400px]` → 더 보수적인 값(예: `max-w-[280~320px]`)으로 축소 검토.
3. `ZenDataGrid.tsx`(공용 컴포넌트)에 CONTROL류 액션 컬럼을 위한 `whitespace-nowrap`/최소폭 보호 적용 — 다른 화면에서 이 컴포넌트를 재사용할 때도 동일 문제 재발 방지.
4. 1280/1440/1920px 등 주요 해상도에서 실제 브라우저로 재현 — ①②수정 후 Control 컬럼이 잘리지 않는지, 페이지 레벨 가로 스크롤 필요 여부 확인.
5. 회귀 테스트: ①좌측 패딩이 다른 대시보드 화면과 일치하는지(컴퓨티드 스타일), ②Control 컬럼이 항상 clip되지 않고 렌더링되는지 각각 검증.
6. R-10: 수정 전/후 비교 스크린샷 첨부(좌측 여백 변화 포함).

## 파일 소유권 확인

`admin/error-logs/page.tsx`/`ErrorLogsTable.tsx`/`ZenDataGrid.tsx` — TASK-1138/1140(B_Kai, Team A) 소관 → **Team A 담당**
