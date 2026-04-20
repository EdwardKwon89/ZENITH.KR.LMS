# [SAR] 미들웨어 무한 리다이렉션 장애 보고 (SAR_2026-04-18_001)

> **일시:** 2026-04-18 19:22
> **작성자:** Antigravity (CTO)
> **심각도:** High (화면 로딩 불능)

## 1. 문제 개요 (Issue)
WBS 1.3 가입 로직 적용 후, 가입 승인 대기 상태(`PENDING`)인 사용자가 대시보드 접근 시 화면이 로드되지 않고 무한 리다이렉션 되는 현상 발생.

## 2. 원인 분석 (Root Cause)
- **경로 불일치**: `src/config/routes.ts`에 정의된 `PENDING` 경로(`/pending`)와 실제 파일 시스템 경로(`/register/pending`)가 불일치함.
- **루프 로직**: `middleware.ts`에서 `!purePath.startsWith('/pending')` 조건을 체크했으나, 실제 접속 경로는 `/register/pending`이었으므로 조건이 항상 참이 되어 무한 리다이렉션 발생.

## 3. 조치 결과 (Resolution)
- [x] **Config 수정**: `DEFAULT_REDIRECTS.PENDING` 값을 `/register/pending`으로 업데이트.
- [x] **Middleware 보정**: 상수값을 사용하여 리다이렉션 타겟과 체크 경로를 일치시킴.

## 4. 재발 방지 대책 (Prevention)
- **경로 무결성 검사**: 향후 경로 관련 설정 변경 시 `find` 명령어를 통해 실제 파일 존재 여부를 자동 확인하는 루틴 도입. (체크리스트 Phase 3에 추가)
- **Redirect Limit 점검**: 개발 환경 미들웨어에 최대 리다이렉트 횟수를 제한하는 디버깅 코드 도입 고려.

---
**Audit Agent 확인:** 본 보고서는 실제 장애 상황과 조치 내용을 정확히 반영하고 있으며, 재발 방지 대책이 유효함을 확인합니다.
