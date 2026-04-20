# 🛡️ Self Audit Report: Server Action Redirect Exposure

> **ID:** SAR-2026-04-19-003  
> **Category:** Implementation / Auth  
> **Severity:** MEDIUM  
> **Reporter:** Antigravity (CEO)

## 1. 현상 (What)
- 로그인 성공 시 브라우저가 대시보드로 이동하지 않고, 빨간색 에러 박스에 **`NEXT_REDIRECT`**라는 기술적 메시지가 노출됨.
- 사용자는 로그인이 실패한 것으로 오해할 수 있으며, 시스템의 프리미엄 신뢰도가 저하됨.

## 2. 원인 (Why)
- Next.js의 `redirect()` 함수는 내부적으로 `Error`를 던져 제어 흐름을 리다이렉트로 넘김.
- 클라이언트의 `handleSubmit` 함수 내 `try-catch` 블록이 이 리다이렉트 신호(Internal Error)를 일반적인 비즈니스 로직 에러로 오해하여 `catch` 하고 에러 UI에 표시함.

## 3. 조치 (How)
- 클라이언트 `catch` 블록에 `NEXT_REDIRECT` 필터링 가드 로직을 삽입함.
- 에러 메시지에 `NEXT_REDIRECT`가 포함된 경우 에러를 표시하지 않고 함수를 조기 종료(return)하여 브라우저의 리다이렉트 수행을 방해하지 않도록 조치함.

## 4. 검증 (Verification)
- [x] 정상 계정으로 로그인 시 에러 박스 노출 없이 즉시 이동 확인.
- [x] 실제 비밀번호 불일치 등 비즈니스 에러 상황에서는 기존 에러 메시지가 정상 노출되는지 교차 검증 완료.

## 5. 예방 (Prevention)
- **Checklist 업데이트**: 모든 클라이언트 기반 서버 액션 호출부에는 반드시 'Redirect Guard' 로직을 포함시킨다.
- **UI 표준**: 서버 액션의 에러를 무조건 화면에 뿌리지 말고, 특정 프레임워크 신호는 걸러내는 공통 유틸리티 도입 검토.
