# DEF-136: requestId 컨텍스트 전파 미동작 — Edge Middleware/Node Server Action 런타임 분리로 AsyncLocalStorage 단절

**발견일**: 2026-08-19
**발견자**: Aiden — Edward 요청으로 프로덕션 실사용(james@sntl.co.kr) 로그 직접 확인 중 발견
**긴급도**: Medium — 장애/오류는 없으나, TASK-1130이 완료 보고한 핵심 기능(요청 단위 로그 추적)이 실제로는 동작하지 않음. 진단 도구로서의 신뢰성 문제.

## 현상

프로덕션 런타임 로그(Vercel)에서 실제 사용자(james@sntl.co.kr) 활동을 직접 확인한 결과:

```json
{"level":"info","timestamp":"2026-08-19T08:59:11.708Z","message":"[DEBUG] validateUserAction: getUser result","data":[{"hasUser":true,"email":"james@sntl.co.kr","error":null}]}
```

정상 요청·실제 에러(Resend 발송 실패) 로그 전부 확인했으나 **`requestId`/`userId`/`orgId`/`route` 필드가 단 하나도 찍히지 않음**. 반면 `x-request-id` 응답 헤더는 정상적으로 붙어 있음(`curl` 실측 확인).

## 원인

- `middleware.ts`는 Next.js **Edge 런타임**에서 실행되고, Server Action(`validateUserAction()` 등)은 **별도의 Node.js 서버리스 함수**에서 실행됨 — 두 실행환경은 완전히 분리되어 있어 `AsyncLocalStorage` 컨텍스트가 서로 이어지지 않음.
- `src/lib/logging/request-context.server.ts`의 `withRequestContext()`(Node.js `AsyncLocalStorage`로 `x-request-id` 헤더 값을 다시 컨텍스트에 심어주는 함수)가 **정확히 이 문제를 풀기 위해 만들어져 있으나, 코드베이스 어디에서도 호출되지 않음**(`grep -rn "withRequestContext(" src/` 결과 정의부 외 호출부 0건).
- 결과적으로 `middleware.ts`의 `runWithRequestContext()` 호출은 Edge 쪽에서만 컨텍스트를 여는 것이라 실질적 효과가 없고(Edge에서 `setRequestContextStore()`가 호출된 적이 없어 `activeStore`가 `null`인 채로 fallback), Server Action 쪽은 컨텍스트를 여는 코드가 아예 실행되지 않아 `getRequestContext()`가 항상 `undefined`를 반환함.
- `x-request-id` 응답 헤더는 미들웨어가 직접 `response.headers.set()`으로 붙이는 것이라 이 문제와 무관하게 정상 동작 — 겉보기엔 "작동하는 것처럼" 보이는 원인.

## 영향 범위

- 구조화 로깅(JSON 포맷) 자체는 정상 동작(2026-08-19 실측 확인) — 이 부분은 문제 없음.
- 그러나 **요청 단위로 로그를 묶어서 추적**하는 것(TASK-1130의 핵심 목적)은 실제로 불가능한 상태 — 여러 동시 요청의 로그가 뒤섞여도 `requestId`로 구분할 방법이 없음.
- `Sentry.setUser()` 연결(middleware.ts에서 `updateSession()` 직후 호출)은 이 문제와 무관하게 별도 경로라 영향 없을 것으로 추정(별도 확인 필요).

## 권장 조치 (TASK-1132로 처리)

1. Server Action/Route Handler 계층에 `withRequestContext()`를 실제로 연결 — 가장 실용적인 방법은 `validateUserAction()`(모든 Server Action의 공통 진입점, `src/lib/auth/guards.ts`) 내부에서 `withRequestContext()`로 나머지 로직을 감싸는 것. 이렇게 하면 개별 Server Action 320여 곳을 건드리지 않고 공통 진입점 1곳만 수정.
2. 수정 후 실제 프로덕션(또는 최소 Vercel Preview)에서 로그를 다시 확인해 `requestId` 필드가 실제로 찍히는지 재검증 — **vitest 단위테스트 통과만으로 완료 처리하지 말 것**(이번 결함이 정확히 그 함정으로 발생함).
3. Server Component 렌더링 경로는 기존에도 "의도적 비전파"로 알려져 있었으므로 범위 밖.
4. `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`에 "실제 배포 환경 로그 실측 확인" 항목 추가 검토 — 유닛테스트만으로는 Edge/Node 런타임 분리 이슈를 잡을 수 없음.

## 재발 방지 관점

TASK-1130 완료 보고("PoC 4경로 검증, 192파일·1320테스트 ALL PASS")는 전부 vitest(단일 Node 프로세스) 기준이라 Edge/Node 런타임 분리라는 실제 배포 구조의 문제를 원천적으로 잡을 수 없었음. Aiden이 이 PR을 리뷰·승인·병합했으나 이 부분을 놓침 — 코드 리뷰 시 "테스트가 실제 배포 토폴로지를 반영하는가"를 확인하는 절차 필요.
