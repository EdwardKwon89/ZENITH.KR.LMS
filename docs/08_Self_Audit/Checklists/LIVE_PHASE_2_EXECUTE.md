# LIVE 체크리스트 - PHASE 2: EXECUTE

본 문서는 Phase 2(실행) 단계에서 준수해야 할 정교한 검증 항목들을 축적(Cumulative)하는 진실의 근거(Source of Truth)입니다. 가이드 템플릿을 기반으로 현장 피드백을 실시간으로 반영합니다.

## 🛡️ 미들웨어 및 프록시 거버넌스 (Middleware & Proxy) [CRITICAL]
- [x] **Next.js 16.2.4+ 규격**: `src/proxy.ts` 엔트리 포인트 유효성 및 `proxy` 함수 익스포트 여부 (SAR-2026-04-20-002)
- [ ] **Physical Route Check**: 미들웨어 리다이렉트 대상이 `src/app/` 하위에 물리적으로 존재하는가? (ls 명령 검증 필수)
- [ ] **Loop Guard**: 리다이렉트 조건문에 `!purePath.startsWith(target)` 배타적 가드가 포함되어 무한 루프를 방지하는가?
- [ ] **Guard-Middleware Sync**: 페이지 내의 보안 가드(`requireAuth/Admin`)와 미들웨어의 리다이렉트 정책이 충돌하지 않는가? (SAR-2026-04-20-003)

## 🟢 환경 및 동기화 (Environment & Sync)
- [ ] **PATH 검증**: `npm`, `supabase` 등 필수 도구가 현재 세션에서 인식되는가? (SAR-2026-04-20-001)
- [ ] **세션 초기화**: `export PATH=$PATH:/opt/homebrew/bin` 절차를 수행했는가? (SAR-2026-04-20-001)
- [ ] **인증 확인**: `rtk supabase login`을 통해 원격 저장소 접근 권한을 확보했는가? (R-02)

## 🔵 구현 표준 (Implementation Standard)
- [ ] **불변성**: 데이터 구조가 불변(Immutable) 상태로 설계/구현되었는가?
- [ ] **길이 제한**: 개별 함수가 50줄 이하로 유지되고 있는가?
- [ ] **파일 무결성**: 단일 파일이 1,000줄을 초과하지 않는가? (넘을 경우 Overview/Detail 분리)
- [ ] **Import Guard**: 코드 수정 시 `import` 구문이 우발적으로 삭제되지 않았으며, 런타임 `ReferenceError`가 없는가? (SAR-2026-04-20-003)

## 🔴 보안 및 권한 (Security & Permission)
- [ ] **ADMIN 가드**: 마스터 데이터 엔드포인트에 `requireAdmin` 보호가 적용되었는가?
- [ ] **RBAC UI**: 사이드바 및 네비게이션이 사용자 역할에 따라 동적으로 필터링되는가?
- [ ] **Sensitive Data**: 환경 변수나 API 키가 클라이언트 코드에 노출되지 않았는가?

## 🟡 검증 및 빌드 (Verification & Build)
- [ ] **Turbopack Build**: `npm run build` 결과가 오류 없이 완료되는가?
- [ ] **Server Action**: 서버 액션의 예외 처리(try-catch)가 유저 피드백과 연동되는가?
- [ ] **i18n**: 모든 신규 메뉴와 레이블이 다국어 파일(`ko.json`)에 등록되었는가?

---
*마지막 업데이트: 2026-04-20*
*작성자: Antigravity (AI Agent)*
