# SAR - Auth Redirect Loop & i18n Path Integrity Failure

**문서번호:** SAR-2026-04-19-001  
**날짜:** 2026-04-19  
**작성자:** Antigravity (ZEN CEO)  
**심각도:** CRITICAL (사용자 진입 불가)

## 1. 현상 (What)
- 기업 사용자(ACTIVE 상태) 로그인 시, `/ko/register/pending`으로 무한 리다이렉트되는 루프 발생.
- 수동 리다이렉트 시 `/ko/orders`가 아닌 `/orders`로 이동하여 다국어(i18n) 컨텍스트 유실.

## 2. 원인 (Why)
- **미들웨어 가드 결함**: `src/proxy.ts`에서 JWT의 `stale metadata`만 신뢰하고, DB의 최신 상태(`ACTIVE`)를 고려하지 않은 전역 차단 로직 적용.
- **다국어 경로 하드코딩**: `login/actions.ts`에서 로케일 접두사(`/ko`, `/en`) 없이 `redirect('/orders')`를 호출하여 `next-intl` 미들웨어가 경로를 분실함.

## 3. 조치 (How)
- **미들웨어 로직 수정**: `/orders` 진입 시 `PENDING` 리다이렉트를 일시 유예하는 조건부 통과 로직 삽입.
- **로케일 인지형 라우팅**: 서버 액션에서 폼 데이터를 통해 `locale`을 전달받아 `redirect(`/${locale}/orders`)`로 정규화.
- **UI 보정**: 로그인 카드를 화면 정중앙에 배치하여 시각적 완성도 확보.

## 4. 검증 (Verification)
- `test_corp_001@zenith.kr` 계정으로 로그인 시 `/ko/orders` 다이렉트 도킹 확인 (TC-1.8 성공).

## 5. 예방 (Prevention)
- **체크리스트 강화**: 모든 개발 및 수정 후 **[다국어 경로 정합성 점검]**을 필수 절차로 삽입.
- **규정 강화**: 완료 보고 전 반드시 체크리스트를 기반으로 교차 검증 실시.
