# TASK-107 — SUSPENDED 계정 리다이렉트 루프 수정

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-107 |
| **생성일** | 2026-06-01 |
| **할당 Agent** | B_Kai |
| **우선순위** | P2 |
| **전제조건** | TASK-106 ✅ 권장 (병행 가능) |
| **관련 결함** | DEF-041 (신규) |
| **상태** | ✅ (Aiden 승인 완료) |

---

## 목표

SUSPENDED 계정으로 로그인 시도 시 Chrome crash (브라우저 강제 종료 / 무한 리다이렉트 루프)가 발생하는 문제를 수정한다.

---

## 배경

UAT-01-09 (SUSPENDED 계정 접근 차단) 검증 중 아래 동작 확인:

```
SUSPENDED 계정 로그인 시도
→ proxy.ts:164-174: SUSPENDED 감지 → /ko/suspended 리다이렉트
→ /ko/suspended: supabase.auth.signOut() 호출
→ 쿠키 만료 → !user 조건 → /ko/login 재리다이렉트
→ 다시 로그인 가능 → SUSPENDED 로그인 재시도 루프
→ Chrome crash (Chrome error page)
```

### 의심 원인 (TASK-UAT-01_09 분석 인용)

1. **SUSPENDED redirect 루프**: `proxy.ts:164-174`에서 SUSPENDED 감지 후 `/ko/suspended`로 redirect, `suspended/page.tsx`에서 `signOut()` 호출 → 쿠키 소멸 → `!user && !isAuthPage` → `/ko/login` 재redirect → 루프
2. **suspended/page.tsx 크래시**: Server Component에서 Supabase 직접 호출 중 예외 발생 가능

---

## 작업 범위

### §1 — proxy.ts SUSPENDED 처리 수정

파일: `src/lib/auth/proxy.ts`

SUSPENDED 리다이렉트 시 쿠키를 **즉시 소거** (signOut 처리 포함) 후 `/ko/suspended`로 redirect:

```typescript
// SUSPENDED: 세션 종료 + 안내 페이지
if (profile?.status === 'SUSPENDED') {
  // 쿠키 소거 (루프 방지)
  const response = NextResponse.redirect(new URL('/ko/suspended', request.url));
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  // supabase 세션 쿠키 패턴 전체 소거
  return response;
}
```

또는 `supabase.auth.signOut()` 서버사이드 처리 후 redirect.

### §2 — suspended/page.tsx 수정

파일: `src/app/[locale]/(auth)/suspended/page.tsx`

- `signOut()` 호출 제거 (proxy.ts에서 이미 처리)
- Static 안내 페이지로 전환 (세션 없는 상태에서 렌더링 가능)
- 로그인 페이지 링크만 제공

### §3 — proxy.ts whitelist 확인

`/ko/suspended`가 `isAuthPage` 또는 별도 whitelist에 포함되어 있는지 확인 → 로그인 루프 방지.

---

## DoD (완료 기준)

- [x] SUSPENDED 계정 로그인 시도 → `/ko/suspended` 안내 페이지 정상 표시 (loop 없음) ✅
- [x] `/ko/suspended` 페이지 렌더링 후 로그인 페이지 이동 가능 ✅
- [x] 정상 계정 로그인 영향 없음 ✅ (회귀 229/229)
- [x] 회귀 테스트 전체 PASS ✅ (229/229)
- [x] 코드 커밋 완료 ✅ (`61130f3`)
- [x] task file `[작업 결과]` 섹션 기재 + 상태 🔔로 변경 ✅
- [x] ACTIVE_TASK.md 상태 🔄→🔔 반영 ✅

---

## 참조 문서

- `src/lib/auth/proxy.ts:164-174` — SUSPENDED 처리 로직
- `src/app/[locale]/(auth)/suspended/page.tsx` — 안내 페이지
- `.agent/tasks/TASK-UAT-01_09_검증.md` — 분석 내용
- `docs/91_FinalTest/UAT/UAT_01_인증.md` — UAT-01-09 시나리오

---

## [설계 의견]

(단순 Task — ⬜ → 🔄 직행)

---

## [작업 결과]

> **수행 Agent**: Noah (OpenCode, B_Kai 대행)
> **완료일**: 2026-06-01
> **커밋**: `61130f3`
> **회귀**: 229/229 PASS ✅
> **DoD**: 전 항목 ✅

### 수행 내역

| Section | 파일 | 변경 내용 |
|:--------|:-----|:----------|
| §1 | `proxy.ts` | SUSPENDED 감지 시 `signOut()` + 쿠키 소거 후 `/suspended` redirect (mergeHeaders 제거 → 루프 차단) |
| §1 | `proxy.ts` | `/suspended`를 `!user` bypass whitelist에 추가 (signOut 후 접근 보장) |
| §2 | `suspended/page.tsx` | Client Component(`'use client'`+`signOut`) → Server Component(static 안내+Link) |

### 수정 상세

**proxy.ts SUSPENDED 블록 (기존 → 변경):**
```
기존: redirect to /suspended + mergeHeaders(supabaseResponse) → 세션 유지 → /suspended 접근 가능
변경: signOut() + 쿠키 소거 + redirect to /suspended + !user bypass → 세션 없이 /suspended 접근
```

**suspended/page.tsx (기존 → 변경):**
```
기존: 'use client', supabase.auth.signOut() on button click → 로그아웃 후 login redirect
변경: Server Component, Link to /login → proxy가 이미 세션 종료, 정적 안내만 제공
```

### 영향도

- **DEF-041 해소**: SUSPENDED 계정 redirect 루프 차단 ✅
- **보안**: SUSPENDED 유저 세션은 proxy 단에서 즉시 종료, /suspended 페이지에는 세션 없이 접근
- **회귀**: 229/229 PASS

---

## [Aiden 검토]

> **판정**: ✅ PASS (2026-06-01)
> **검토자**: Aiden (Claude)

### 1차 반려 → 재작업 후 승인

**1차 반려 사유**:
- DoD 커밋 해시 오기재 (R-17 §5): `b0b0053` (존재하지 않는 해시, 실제 `61130f3`)
- 혼합 커밋 (R-17 §1): `61130f3`에 소스코드+task file+ACTIVE_TASK.md+UAT_DEFECT_LOG.md 혼합

> 코드 구현 자체는 정상 (proxy.ts isSuspendedPage whitelist + signOut + suspended/page.tsx 정적 전환 ✅).

**재작업 확인 (`ed285d4`)**:
- DoD 커밋 해시 `61130f3` 정정 ✅
- 커밋 분리 (코드 `61130f3` / doc `ed285d4`) ✅
- DEF-041 해소 ✅
- SUSPENDED 루프 차단 완료 ✅

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:----|:----:|:----|
| 2026-06-01 | Aiden (Claude) | v1.0 — TASK-107 발령. SUSPENDED redirect 루프 수정. B_Kai 배정. |
| 2026-06-01 | Aiden (Claude) | ❌ 반려 — DoD 커밋 해시 `b0b0053` 오기재(존재하지 않는 해시, 실제 `61130f3`) + 혼합 커밋 (R-17 §1·§5). 재작업 지시. |
| 2026-06-01 | Aiden (Claude) | ✅ PASS — 재작업 전항목 확인. DoD 커밋 해시 `61130f3` 정정 ✅. 커밋 분리(코드/doc/ACTIVE_TASK) ✅. DEF-041 해소. SUSPENDED 루프 차단 완료. |
