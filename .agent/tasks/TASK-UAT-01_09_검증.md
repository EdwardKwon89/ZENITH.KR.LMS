# TASK-UAT-01-09: SUSPENDED 계정 접근 차단 검증 (미해결)

## 담당
D_Kai (Noah/OpenCode)

## 상황
DEF-017 코드 수정 완료 (`37e8bca`): `changeMemberStatus`가 `app_metadata.status` 동기화.
회귀 227/227 PASS. Playwright 검증 중단.

## 해결된 문제
- [x] DEF-017: DB(`zen_profiles`) + JWT(`app_metadata`) 동기화 코드 수정
- [x] DEF-018 데이터만 조정: `test_uat01@zenith.kr` role ADMIN→CARRIER (직접 수정)

## 미해결 문제 (코드 미수정)
- [ ] DEF-018 **원인**: `login/actions.ts:146` `role: isNewOrg ? USER_ROLES.ADMIN : ...` — org_type과 무관하게 신규 조직 생성자는 항상 ADMIN으로 설정됨. 회원가입 시 org_type에 따른 role 매핑 로직 개선 필요. **Aiden 검토 필요** (IMP 별도 등록).

## 미해결 문제
**UAT-01-09 STEP 3 검증 실패**: SUSPENDED 계정 로그인 시도 → `chrome-error://chromewebdata/` (Chrome crash)

### 의심 원인
1. **SUSPENDED redirect 루프** (가장 유력)
   - middleware `proxy.ts:164-174`: SUSPENDED 감지 → 쿠키 유지한 채 `/ko/suspended`로 리디렉트
   - `/ko/suspended` 접근 시 `proxy.ts:54`: `!user && !isAuthPage` → session 있으므로 통과 (`user`는 존재)
   - 하지만 `/ko/suspended` 페이지 내 `createClient()` → `supabase.auth.signOut()` → 재로그인 시도...
   - 또는 middleware가 session 쿠키를 유지한 상태로 redirect → `/ko/suspended`는 `isAuthPage`가 아님 → 다른 제약(orgType, route map)에 걸릴 가능성

2. **suspended/page.tsx 크래시**
   - `SupabasePage`가 `createClient()` 호출 → session이 SUSPENDED user인데, middleware를 통과하지 않고 직접 Supabase API 호출 → 예외 발생 가능

### 재현
```bash
npx playwright test uat01-09-status-sync.spec.ts -g "STEP 3"
```

### 참고
- `src/lib/auth/proxy.ts:54` — `!user && !isAuthPage && purePath !== '/'` → 비인증 시 login redirect
- `src/lib/auth/proxy.ts:164-174` — SUSPENDED 처리: `/ko/suspended` whitelist
- `src/app/[locale]/(auth)/suspended/page.tsx` — SUSPENDED 안내 페이지

## 요청 사항
**Aiden 검토 필요**: SUSPENDED redirect 시 middleware-suspended page 간 루프 가능성 분석 및 수정 방향 결정.
