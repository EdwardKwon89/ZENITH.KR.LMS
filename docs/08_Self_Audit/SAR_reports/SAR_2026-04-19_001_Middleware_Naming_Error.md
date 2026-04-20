# SAR - Middleware Naming Error & Login Loop (ZEN-20260419-001)

> **상태**: 작성 완료 (보고용)
> **에이전트**: ZEN CEO (Antigravity)
> **날짜**: 2026-04-19

## 1. 개요
로그인 성공 후 `/ko/orders` 경로로 이동했으나, 화면에 로그인 폼이 여전히 출력되는 현상 발생. 분석 결과, 인증 가드를 전담하는 파일이 `src/proxy.ts`라는 비표준 명칭으로 명명되어 Next.js 엔진이 이를 인식하지 못함.

## 2. 발생 원인 (Root Cause)
- **파일 명칭 오판**: Next.js App Router는 `middleware.ts`를 특정 위치에서만 인식하나, 본 프로젝트는 `src/proxy.ts`로 관리되고 있었음.
- **가드 무력화**: 미들웨어가 작동하지 않으면서 `handleI18nRouting`과 `Supabase` 세션 갱신 로직이 실행되지 않았고, 서버 컴포넌트는 세션 쿠키를 인지하지 못한 채 로그인 페이지를 'Rewrite' 처리함.

## 3. 대응 조치 (Corrective Actions)
- `src/proxy.ts`를 `src/middleware.ts`로 정위치시키고 엔트리 포인트(`middleware`)를 표준화함.
- 서버 액션(`login`) 단계에서 `revalidatePath`를 추가하여 즉각적인 세션 동기화 보장.

## 4. 재발 방지 대책
- 향후 파일명 변경 시 프레임워크 표준(Reserved Files) 준수 여부를 자동 체크하도록 `Self-Audit` 체크리스트 업데이트 예정.
- 프로젝트 초기화 시 `middleware.ts`의 존재 여부를 필수 검증 항목에 추가.

## 5. 결론
본 결함은 시스템 설계의 오류가 아닌 프레임워크 규격 미준수로 인한 단순 장애이며, 표준화 작업을 통해 완벽히 복구 가능함.
