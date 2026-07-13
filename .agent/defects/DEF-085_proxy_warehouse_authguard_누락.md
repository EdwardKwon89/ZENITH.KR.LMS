# DEF-085 — `src/lib/auth/proxy.ts` authGuard allowlist `/warehouse` 누락

> **발견일**: 2026-06-29
> **발견자**: Baker (Team B)
> **연관 Task**: TASK-B-036 (IMP-140), IMP-003 Low
> **우선순위**: P3 — E2E 테스트 차단 (IMP-003 Low)
> **상태**: 🚫

## 증상

E2E-26-01("창고 출고 화면 → UPS 레이블 미발급 상태 확인")이 `/ko/warehouse/outbound` 경로에서 지속적으로 로그인 페이지로 리다이렉트되어 테스트 실패.

## 원인

`src/lib/auth/proxy.ts` middleware `authGuard` allowlist에 `/warehouse` 경로가 누락되어 있음. warehouse 페이지 접근 시 인증 가드에 차단되어 로그인 페이지로 리다이렉트됨.

```typescript
// proxy.ts allowlist — `/warehouse` 누락
const ALLOWED_PATHS = [
  '/_next',
  '/api',
  '/auth',
  '/ko',
  '/en',
  '/images',
  '/favicon.ico',
  '/warehouse',  // ← 누락
];
```

## 영향
- E2E-26-01/05/06: `/warehouse` 경로 접근 필요 테스트 차단
- IMP-003 (Next.js middleware.ts → proxy.ts 마이그레이션) Low 항목과 연관
- Production: warehouse 페이지 접근 자체는 정상이었으나 (authGuard 미적용 시 정상), proxy.ts 도입 후 allowlist 누락으로 접근 차단

## 임시 조치

`proxy.ts` ALLOWED_PATHS에 `/warehouse` 추가 (TASK-B-036 E2E 디버깅 중 적용 완료, 커밋 `0320f1f`).

## 근본 해결

IMP-003 (proxy.ts authGuard allowlist 정리)에서 `/warehouse`를 포함한 전체 경로 감사 수행 예정. 현재는 allowlist에 추가하여 우회.

## 참조

- `src/lib/auth/proxy.ts` — allowlist 정의 라인
- `scratch/post_launch_improvements.md` — IMP-003 (Low) 추적
- TASK-B-036 — 발견 경위, E2E-26 디버깅 중 확인
