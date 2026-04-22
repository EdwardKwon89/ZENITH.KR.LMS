# SAR-2026-04-22-001: 테스트 환경 오류 및 i18n 라우팅 결함

## 1. 문제 발생 개요
- **날짜**: 2026-04-22
- **발견자**: Antigravity (AI Agent)
- **대상**: 항공 물류 고도화 작업 중 테스트 및 라우팅 모듈

## 2. 문제 상세 (Description)
1. **단위 테스트 실패**: 신규 생성한 `aviation-master.test.ts` 실행 시 `cookies()`가 request scope 밖에서 호출되었다는 에러와 함께 Supabase 환경 변수가 로드되지 않아 테스트가 중단됨.
2. **라우팅 오류**: `NaviSidebar` 및 `OrderDataTable`에서 상세 페이지 이동 시 `locale` 접두사가 누락되어 `/undefined/orders/...`와 같은 잘못된 경로가 생성됨.

## 3. 원인 분석 (Root Cause)
1. **테스트 환경**: Next.js 서버 액션이 `cookies()`에 의존하고 있으나, Vitest 환경은 이를 모킹하지 않은 상태로 실재 DB 연결을 시도함.
2. **i18n 누락**: 사이드바 및 테이블 컴포넌트에서 Link 생성 시 현재 `locale`을 명시적으로 주입하지 않거나, `useParams`를 활용하지 않고 하드코딩함.

## 4. 대응 조치 (Corrective Action)
- **테스트 보완**: `next/headers`를 모킹하고, `getAirlines` 액션의 반환값을 모킹하여 환경 독립적인 테스트 환경 구축.
- **라우팅 수정**: `NaviSidebar`, `OrderDataTable` 등에 `useParams`를 도입하여 현재 언어 정보를 기반으로 경로를 생성하도록 수정.

## 5. 재발 방지 대책 (Prevention)
- **체크리스트 강화**: `LIVE_PHASE_2_EXECUTE.md`에 "모든 Link 및 Redirect 경로에 locale 포함 여부 확인" 항목 추가.
- **테스트 템플릿**: 서버 액션 테스트 시 `cookies()` 및 `Supabase` 모킹을 기본 패턴으로 정착.

---
**보고 주체: Antigravity**
**검증 주체: User**
