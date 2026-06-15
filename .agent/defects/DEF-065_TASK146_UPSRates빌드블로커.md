# DEF-065: B_Kai TASK-146 UPS 요율 Admin UI 빌드 블로커 (stub 미존재)

| 항목 | 내용 |
|:---|:---|
| **DEF#** | DEF-065 |
| **제목** | B_Kai TASK-146 UPS rates UI 빌드 블로커 (stub 미존재) |
| **관련 TASK** | TASK-146 (B_Kai) |
| **유형** | 빌드 오류 (Build Blocker) |
| **블로킹** | Y |
| **상태** | 발견 보고 |
| **제보자** | Riley (Gemini) |

---

## 현상

`develop` 또는 `feature/imp109-riley-exchange-rate` 브랜치 빌드(혹은 로컬 구동) 시, B_Kai가 TASK-146 코드 커밋(`3dbad68`)에 적용한 `UpsRatesAdminPage` 컴포넌트와 관련 코드들에서 다음과 같은 에러가 발생하며 컴파일이 불가능해지는 현상:

1. `src/app/actions/ups/rates.ts` 및 `src/types/ups.ts` 누락으로 인한 모듈 Import 실패
2. `src/components/ui/dialog.tsx`, `table.tsx`, `tabs.tsx` stub 컴포넌트 부재로 인한 모듈 Import 실패
3. `ZenButton`, `ZenInput`, `ZenBadge` 컴포넌트에 `size`, `label`, `onClick`, `outline`, `secondary` 등 추가로 사용하는 prop 속성이 정의되지 않아 TypeScript 타입 에러 및 컴파일 실패

## 원인

TASK-146 (B_Kai) 작업 진행 중, Admin UI 마이그레이션 및 신규 탭 구성을 위해 import 한 공통 UI 및 UPS 요율 관련 액션/타입 파일들이 미완성 혹은 로컬 작업 공간에만 존재하고 레포지토리에 커밋되지 않은 상태에서 `feat` 커밋이 먼저 적용되어 발생하였습니다.

## 영향 범위

| 영역 | 내용 |
|:-----|:-----|
| 빌드 및 컴파일 | UPS 요율 페이지 및 ZenUI 컴포넌트 타입 오류로 인해 플랫폼 빌드 전면 중단 (블로킹) |
| 타 에이전트 작업 | 빌드 차단으로 인해 회귀 테스트 실행 및 로컬 검증 불가 |

## 권장 조치

1. B_Kai가 담당하는 TASK-146 완료 보고 시, 누락된 `dialog.tsx`, `table.tsx`, `tabs.tsx` stub 파일 및 `ZenButton`, `ZenInput`, `ZenBadge` 확장 prop 정의를 포함하여 제출해야 합니다.
2. 혹은 UPS 요율 관련 Actions (`src/app/actions/ups/rates.ts`)와 타입 파일 (`src/types/ups.ts`)의 본 명세를 B_Kai 파트에서 정상 구현하여 머지해야 빌드 차단이 영구 해소됩니다.

## 검증 (Riley Revert 후)

| 항목 | 결과 |
|:-----|:----:|
| 범위 외 파일 Revert | ✅ (Dialog, Table, Tabs stub 삭제 및 ZenButton 등 컴포넌트 롤백) |
| 빌드 | ⚠️ (TASK-146 stub 누락으로 인한 빌드 차단 상태 재현됨) |
