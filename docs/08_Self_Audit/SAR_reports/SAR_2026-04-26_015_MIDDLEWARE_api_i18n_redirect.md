# SAR_2026-04-26_015 — MW-API-01: /api 경로 i18n 미들웨어 리다이렉트 오류

## 1. 기본 정보

| 항목 | 내용 |
|------|------|
| 버그 ID | BUG-MW-API-01 |
| 발견일 | 2026-04-26 |
| 영향 범위 | TC-UAT-FIN.4 (Excel Export) — /api/finance/export 404 |
| 심각도 | High |
| 발견 경위 | UAT 브라우저 테스트 (Playwright) |

## 2. 문제 설명

`src/middleware.ts`의 `handleI18nRouting(request)` 가 `/api/finance/export` 요청을 `/ko/api/finance/export`로 리다이렉트함.  
Next.js App Router에서 `/api/*` 경로는 i18n 라우팅 대상이 아니므로 404 발생.

## 3. 에러 메시지

```
GET /api/finance/export => 307 Redirect → /ko/api/finance/export
GET /ko/api/finance/export => 404 Not Found
[FIN-02] Export Error: Error: Export failed: Not Found
```

## 4. 근본 원인

미들웨어 step 4에서 `isApi` 체크 없이 모든 요청에 `handleI18nRouting()` 호출:

```typescript
// 버그: API 경로도 i18n 라우팅 적용됨
return mergeHeaders(handleI18nRouting(request), supabaseResponse);
```

## 5. 수정 내용

**`src/middleware.ts`**:

```typescript
// 수정: API 경로는 i18n 라우팅 없이 조기 반환
if (isApi) {
  return mergeHeaders(supabaseResponse, supabaseResponse);
}
```

## 6. 검증 결과

- Excel Export: `settlement_export_20260426.xlsx` 다운로드 ✅
- 콘솔 에러 없음 ✅
- 회귀 테스트: 109/109 ✅

## 7. 재발 방지

미들웨어에서 `/api/*` 경로는 i18n 처리 전 반드시 조기 반환 처리.  
Next.js 16 `proxy.ts` 마이그레이션 시 동일 패턴 적용 필요.
