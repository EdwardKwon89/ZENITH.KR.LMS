# 🕵️ SAR (Self Audit Report) - 2026-04-20_004

**문제명**: `guards.ts` 내 `checkPermission` 참조 오류 (ReferenceError)
**발생일**: 2026-04-20
**보고자**: Antigravity (AI Agent)

## 1. 개요 (Overview)
- **증상**: 서버 액션(`getOrganizations`) 호출 시 `ReferenceError: checkPermission is not defined` 발생 및 시스템 가동 중단.
- **영향**: 권한 기반의 모든 서버 사이드 검증 로직이 마비되어 관리자 기능 사용 불가.

## 2. 근본 원인 (Root Cause)
- **의존성 누락**: `src/lib/auth/guards.ts` 파일에서 내부 함수인 `validateAdminAction`이 `checkPermission`을 호출하고 있으나, 상단에 해당 함수의 임포트(Import) 구문이 누락됨.
- **검증 환경 역설**: 빌드 타임 린트(Lint)가 아닌 런타임 렌더링 단계에서 해당 조건이 트리거되면서 발견됨.

## 3. 해결 방안 (Solution)
- **즉각 조치**: `@/lib/auth/rbac` 경로에서 `checkPermission`을 명시적으로 임포트하여 참조 오류 해결.
- **정상화 확인**: 서버 액션 재호출 시 `AUTH_TRACE` 로그를 통해 인가 성공(`Allowed: true`) 확인.

## 4. 재발 방지 대책 (Prevention)
- **체크리스트 강화**: 서버 사이드 가드(Guards) 또는 미들웨어 수정 시, 활용하는 모든 유틸리티 함수의 임포트 정합성을 최우선으로 검토함.
- **도구 활용**: 수정 후 반드시 `rtk npm run lint`를 수행하여 정적 분석 단계에서의 참조 오류를 사전 포착함.
