# DEF-077: CSP connect-src에 cdn.jsdelivr.net 미포함 — @react-pdf/renderer font fetch 차단

| 항목 | 내용 |
|:----|:-----|
| 발견일 | 2026-06-24 |
| 발견자 | D_Kai (TASK-165) |
| 관련 Task | TASK-165 (E2E-26) |
| 관련 Issue | #92 |
| 심각도 | Low (테스트 환경 한정) |
| 상태 | ✅ 우회 완료 |

## 증상
`@react-pdf/renderer`의 `Font.register()`가 `fetch()`로 CDN 폰트(SUIT) 로드 시도 → CSP `connect-src`에 `cdn.jsdelivr.net` 미포함 → `TypeError: Failed to fetch` → PDF blob URL 미생성 → download 이벤트 미발생.

콘솔 에러:
```
Connecting to 'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT-Regular.woff2'
violates the following Content Security Policy directive: "connect-src 'self' https://*.supabase.co ..."
```

## 원인
Next.js middleware 또는 next.config.js의 CSP 설정에서 `connect-src`에 `self`, `*.supabase.co`, `sentry.io`, localhost만 포함. `@react-pdf/renderer`가 폰트 로드에 사용하는 `cdn.jsdelivr.net`이 누락됨.

## 영향 범위
- **E2E 테스트 환경(headless Chrome)에서만 발생**
- 운영 환경(headless 모드 아님)에서는 CSP 정책이 다르거나 CDN 접근이 허용될 수 있음
- 모든 PDF 다운로드 관련 E2E 테스트에 영향

## 수정 내역 (테스트 우회)
- `page.route('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/*', ...)` — CDN font 요청 → 로컬 woff2 파일 반환
- `page.route('/ko/orders/{id}*', ...)` — order detail page 응답 CSP 헤더에 `cdn.jsdelivr.net` 허용 + `blob:` worker 활성화

## 재발 방지 (권장)
- `next.config.js`의 CSP 헤더 또는 middleware의 CSP에 `connect-src https://cdn.jsdelivr.net` 추가 검토
- `@react-pdf/renderer`의 `Font.register()`를 로컬 폰트 경로로 직접 지정하는 방법으로 전환 검토
