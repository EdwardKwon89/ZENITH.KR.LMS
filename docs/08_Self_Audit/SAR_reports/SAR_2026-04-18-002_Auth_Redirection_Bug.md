# [SAR-2026-04-18-002] 회원가입 완료 후 Locale 리다이렉션 누락 오류

> **작성일**: 2026-04-18
> **보고자**: Antigravity (CEO - Agentic Management)
> **대상 기능**: WBS 1.3 사용자 인증 및 리다이렉션 로직

## 1. 문제 개요
UAT-1.3 수행 중, 회원가입 신청(`signup`)이 성공한 직후 브라우저가 `/ko/login`이 아닌 `/login`으로 리다이렉트되어 404 오류 페이지가 노출됨. 서버 상의 데이터는 정상 생성되었으나 사용자는 가입 실패로 오인할 수 있는 심각한 UX 결함 발생.

## 2. 근본 원인 분석 (Root Cause)
- **i18n 미들웨어 정책 위반**: `next-intl`을 사용하는 프로젝트 구조에서 Server Action 내의 `redirect` 함수는 수동으로 Locale prefix를 포함해야 하나, 개발 단계에서 이를 간과함.
- **수행 주체 실수**: `actions.ts` 설계 시 서버 측에서 클라이언트의 현재 `locale` 정보를 동적으로 인지하지 못하는 한계에 대한 방어 로직(Parameter pass-through)이 누락됨.

## 3. 대응 및 해결 내역 (Solutions)
- **로직 수정**: `signup` 서버 액션에 `locale` 매개변수를 추가하고, 반환 시 리다이렉트 경로를 `/${locale}/login` 형식으로 생성하도록 수정.
- **UI 흐름 개선**: `RegisterPage.tsx`에서 서버 액션 완료 후 즉시 리다이렉트하지 않고 클라이언트 상태(`setStep('COMPLETE')`)를 우선 업데이트하여 안정적인 안내 화면을 제공함.

## 4. 재발 방지 대책 (Prevention)
- **개발 표준 강제**: 향후 모든 `use server` 액션 내 리다이렉션 시 반드시 `locale`을 인자로 받아 경로를 생성하도록 가이드 배포.
- **체크리스트 업데이트**: Phase 2 (Implement) 체크리스트에 'Redirection Locale Prefix' 확인 항목을 필수 추가하여 `Audit Agent`가 사전에 검증하도록 함.

## 5. 체크리스트 업데이트 여부
- [x] `docs/09_TEMPLATES/050_CHECKLISTS_TEMPLATE/PHASE_2_EXECUTE_CHECKLIST.md`에 i18n 경로 검증 항목 추가 완료.
