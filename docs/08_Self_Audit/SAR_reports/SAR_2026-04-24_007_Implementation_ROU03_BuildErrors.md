---
name: [Routing SprintB] TypeScript 빌드 오류 (BUG-11-A ~ BUG-14-A)
description: 라우팅 컴포넌트 구현 중 잘못된 Import 패턴 및 UI 컴포넌트 Prop 사용으로 인한 빌드 실패 해결
category: Implementation
severity: HIGH
date: 2026-04-24
author: Riley
---

## 현상 (What)

Phase 3.3 Routing Sprint B (ROU-03/04/05) 구현 후 `rtk npx tsc --noEmit` 실행 시 총 4건의 Critical TypeScript 오류가 발생하여 빌드가 중단됨.

**발생 위치 및 오류 메시지:**
1. **BUG-11-A**: `src/components/routing/RouteOptimizationSection.tsx:5`
   - `RouteOptionCard`를 default import 시도했으나, 실제 파일은 named export만 존재함.
2. **BUG-12-A**: `src/components/routing/RouteOptimizationSection.tsx:6`
   - `RouteMilestoneTimeline` 동일 패턴 오류 (default export 없음).
3. **BUG-13-A**: `src/components/routing/RouteOptimizationSection.tsx:7`
   - 존재하지 않는 모듈 `@/components/ui/button`으로부터 `Button` import 시도.
   - `ZenButton` 사용 시 `size="sm"` prop 사용 (ZenUI 스펙에 미존재).
4. **BUG-14-A**: `src/components/routing/RouteConsistencyBadge.tsx:2`
   - 존재하지 않는 모듈 `@/components/ui/badge`로부터 `Badge` import 시도.

## 원인 (Why)

### 직접적 원인
- 컴포넌트 Export 방식(Named)과 Import 방식(Default)의 불일치.
- 프로젝트 표준 UI 라이브러리(`ZenUI`)가 아닌 외부 shadcn/ui 경로(`@/components/ui/button`) 참조.
- `ZenButton` 컴포넌트 인터페이스에 정의되지 않은 `size` 속성 전달.

### 근본 원인
- **컴포넌트 스캐폴딩 실수**: 신규 컴포넌트 생성 시 프로젝트 표준(Named Export)을 인지하지 못하고 ad-hoc하게 import 구문을 작성함.
- **UI 라이브러리 혼선**: 프로젝트에서 `ZenUI`를 표준으로 사용함에도 불구하고, 관성적으로 일반적인 shadcn/ui 경로를 사용함.
- **API 명세 미준수**: `ZenUI.tsx`의 인터페이스를 확인하지 않고 props를 추정하여 사용함.

### 기여 요소
- 로컬 개발 환경(Vite/HMR)에서는 일부 린트 오류가 무시될 수 있으나, 전체 `tsc` 체크 단계에서 발견됨.

## 조치 (How)

### 수정 전 (예시: RouteOptimizationSection.tsx)
```typescript
import RouteOptionCard from "./RouteOptionCard";
import { Button } from "@/components/ui/button";

// ...
<Button size="sm">...</Button>
```

### 수정 후 (예시: RouteOptimizationSection.tsx)
```typescript
import { RouteOptionCard } from "./RouteOptionCard";
import { ZenButton } from "@/components/ui/ZenUI";

// ...
<ZenButton>...</ZenButton>
```

### 수정 범위
- [x] `RouteOptimizationSection.tsx`: Named Import로 변경, `ZenButton`으로 교체 및 `size` prop 제거.
- [x] `RouteConsistencyBadge.tsx`: `ZenBadge`로 교체.
- [x] `RouteMilestoneTimeline.tsx`: (필요시) Export 방식 확인 및 Import 정정.
- [x] `RouteOptionCard.tsx`: Named Export 유지 확인.

## 검증 (Verification)

### 테스트
```bash
# 1. TypeScript 빌드 체크 (Routing 관련 에러 0건 확인)
rtk npx tsc --noEmit

# 2. 회귀 테스트 실행 (기존 기능 파괴 여부 확인)
rtk npm run test:regression
# 결과: 106/106 PASS (Routing TC-R.1~7 포함)
```

### 수동 테스트
- [x] 오더 상세 페이지에서 `RouteOptimizationSection` 정상 렌더링 확인.
- [x] `RouteConsistencyBadge`가 Admin 권한에서 정상 노출 및 동작 확인.

## 예방 (Prevention)

### Check List에 추가할 항목
```
□ [R-04] 신규 컴포넌트 추가 시 Named Export 방식을 사용하며, Import 시 중괄호({})를 누락하지 않았는가?
□ [R-10] 모든 UI 요소는 ad-hoc 컴포넌트가 아닌 프로젝트 표준인 ZenUI(ZenButton, ZenBadge 등)를 사용하는가?
□ [R-08] 모든 커밋 전 반드시 'rtk npx tsc --noEmit'을 실행하여 빌드 무결성을 확인했는가?
```

### 설계 개선
- `ZenUI` 컴포넌트에 필요시 `size` props를 추가하는 방안 검토 (현재는 디자인 시스템 일관성을 위해 고정 크기 사용).
- CI 단계에서 `tsc` 체크 강제화.
