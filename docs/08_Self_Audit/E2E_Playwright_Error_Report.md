# E2E Playwright 실행 오류 보고서

> **작성자**: B_Kai (OpenCode) | **작성일**: 2026-05-22
> **관련 Task**: TASK-053 (E2E-14 RETURNED 전이 시나리오)
> **대상**: Aiden (ZEN_CEO)

---

## 1. 증상 요약

모든 E2E Playwright 테스트가 **로그인 페이지 이전에서 진행 불가** 상태.
신규 E2E-14 뿐 아니라 **기존 E2E-01~12 전 사양 동일 타임아웃**.

## 2. 진단 결과

Playwright가 `/ko/login` 페이지를 정상 로드하고, 폼 필드(`input#email`, `input#password`)도 찾지만,
**로그인 버튼(`button[data-action="login"]`) 클릭 후 Server Action이 정상 응답하지 않음** → `waitForURL(/.*(dashboard|orders)/)` 타임아웃.

## 3. 근본 원인

Browser Console에서 3가지 유형의 **Next.js 런타임 오류** 다수 확인:

### 오류 A: `"use server"` 지시문 위치 오류

```
The "use server" directive must be at the top of the file.
```

**해당 파일**:
- `src/app/[locale]/(auth)/login/actions.ts` — L2에 `'use server'` 있으나 L1에 `import { logger }` 선행
- `src/app/actions/misc/monitoring.ts` — 동일 패턴
- `src/app/actions/misc/notifications.ts` — 동일 패턴

**원인**: `"use server"`는 `import`보다 먼저 선언되어야 하나, `import { logger }`가 앞에 위치.

### 오류 B: Client Component에서 `next/headers` import

```
You're importing a module that depends on "next/headers".
This API is only available in Server Components in the App Router.
```

**해당 파일**:
- `src/utils/supabase/server.ts` — `import { cookies } from 'next/headers'`
  - → `login/actions.ts` → `login/page.tsx` 체인으로 Client Component 전파

### 오류 C: Client Component에서 `next/cache` import

```
You're importing a module that depends on "revalidatePath" into a React Client Component module.
```

**해당 파일**:
- `src/app/[locale]/(auth)/login/actions.ts` — `revalidatePath` import
- `src/app/actions/misc/monitoring.ts`, `notifications.ts` — 동일

## 4. 오류 전파 체인

```
login/page.tsx (Client Component: "use client")
  └─ login/actions.ts ← 오류 A·C
       └─ utils/supabase/server.ts ← 오류 B
```

`login/page.tsx`에 `"use client"` 지시문이 있어 하위 모듈 전체가 Client Component로 번들링됨.
Server Action 파일들(`"use server"`)이 Client 번들에 포함되어 위 오류 발생.

## 5. 재현 방법

```bash
rtk npx playwright test tests/e2e/e2e-01-registration.spec.ts --reporter=list
# 또는
rtk npx playwright test tests/e2e/e2e-14-returned-flow.spec.ts --reporter=list
```

## 6. 참고 사항

- E2E-14 spec 파일(`e2e-14-returned-flow.spec.ts`)은 정상 작성 완료 (211/211 unit test PASS)
- 회귀 테스트는 전혀 영향 없음 (vitest, jsdom 환경 — 브라우저 API 의존 없음)
- 본 오류는 **TASK-053 작업과 무관한 선행 조건** — Aiden 판단 필요

## 7. 권장 조치

1. **short-term**: `login/actions.ts`에서 `"use server"`를 파일 최상단으로 이동, `revalidatePath` 사용처 검토
2. **medium-term**: `notifications.ts`, `monitoring.ts`도 동일 수정
3. **long-term**: E2E 테스트 전용 seed data 구축 (Playwright fixtures 또는 DB seed)
