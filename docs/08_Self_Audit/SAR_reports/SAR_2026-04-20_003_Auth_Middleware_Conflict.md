# [SAR] 권한 가드-미들웨어 상충 및 참조 오류 장애 보고 (SAR_2026-04-20_003)

> **일시:** 2026-04-20 13:30
> **작성자:** Antigravity (CIO)
> **심각도:** High (대시보드 진입 원천 차단 및 런타임 에러)

## 1. 문제 개요 (Issue)
1. **Redirect Loop**: `OrdersPage` 접근 시 미들웨어(`proxy.ts`)와 보안 가드(`guards.ts`)가 서로 다른 목적지로 사용자를 튕겨내며 무한 리다이렉션 발생 (ERR_TOO_MANY_REDIRECTS).
2. **ReferenceError**: 보안 가드 교체 작업 중 `replace_file_content` 도구의 과도한 범위 적용으로 인해 필수 임포트(`getTranslations` 등)가 삭제되어 런타임 에러 발생.

## 2. 원인 분석 (Root Cause)
- **장애 요인 1 (Policy Conflict)**: 
    - 미들웨어는 SHIPPER 역할을 `/orders`로 안내했으나, 페이지 가드(`requireAdmin`)는 SHIPPER를 미인증자로 간주하여 `/login`으로 쫓아냄. 
    - `/login` 도달 시 미들웨어가 다시 `/orders`로 리다이렉트하며 핑퐁 발생.
- **장애 요인 2 (Tooling Error)**: `replace_file_content` 사용 시 파일 상단을 전체 교체하면서 서버 컴포넌트의 생명선인 외부 라이브러리 참조를 보존하지 못함.

## 3. 조치 결과 (Resolution)
- [x] **가드 계층화**: 일반 인증용 `requireAuth` 가드를 신설하여 SHIPPER 권한을 정상 수용.
- [x] **단일 주권 원칙**: 가드의 리다이렉트 타겟을 루트(`/`)로 통일하여 미들웨어가 최종 경로를 결정하도록 설계 변경.
- [x] **임포트 복구**: `getTranslations`, `ZenUI` 등 누락된 모든 의존성을 수동 복구하여 런타임 안정성 확보.
- [x] **에러 UI 도입**: `ZenErrorView` 및 전역 에러 경계를 구축하여 비정상 상황에 대비.

## 4. 재발 방지 대책 (Prevention)
- **보안 테스트 시나리오 강화**: 새로운 역할(Role) 정의 시 '미들웨어-가드 정합성'을 테스트하는 브라우저 자동화 스크립트 작성 필수.
- **편집 도구 안전 수칙**: `replace_file_content` 대신 `multi_replace_file_content`를 우선 사용하고, 코드 변경 후 반드시 `npm run build` 또는 린트 검사 수행.
- **체크리스트 박제**: `LIVE_PHASE_2_EXECUTE.md`에 '미들웨어-가드 정합성' 및 '임포트 무결성' 항목 강제화.

---
**Audit Agent 확인:** 본 보고서는 실제 장애 상황과 고난의 과정을 정확히 투영하고 있으며, 수립된 재발 방지 대책이 제니스 플랫폼의 향후 안정성에 기여할 것임을 보증합니다.
