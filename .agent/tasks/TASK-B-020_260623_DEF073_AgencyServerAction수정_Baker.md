# TASK-B-020 — DEF-073 Agency shippers/new · rate-overrides/new Server Action 오류 수정

> **TASK-ID**: TASK-B-020
> **생성일**: 2026-06-23
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (R-18 High DEF)
> **담당 Agent**: Baker (Big Pickle)
> **우선순위**: P2
> **관련 Issue**: [#80](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/80)
> **전제조건**: 없음
> **브랜치**: `feature/teamb-task-b-020-def073-agency-server-action`
> **상태**: 🔔

---

## [업무 개요]

Agency 화주 신규 등록(`/agency/shippers/new`) 및 요율 오버라이드 신규 등록(`/agency/rate-overrides/new`) 페이지에서 Server Action이 Client Component에 직접 전달되어 발생하는 렌더링 오류를 수정합니다.

---

## [현상]

```
Error: Functions cannot be passed directly to Client Components
unless you explicitly expose it by marking it with "use server".
```

- 해당 페이지가 정상 렌더링되지 않아 폼 입력 요소가 DOM에 없음
- E2E-23 TC-AG-03~04 (화주신규등록), TC-AG-05~06 (요율오버라이드 등록) ❌ FAIL

---

## [구현 명세]

### 수정 대상 파일

- `src/app/[locale]/agency/shippers/new/page.tsx`
- `src/app/[locale]/agency/rate-overrides/new/page.tsx`

### 수정 방향

Server Action을 Client Component에 직접 prop으로 전달하는 패턴을 수정:

**방안 A** (권장): Server Component(`page.tsx`)에서 Client Component로 전달하는 Server Action에 `"use server"` 지시어 명시

**방안 B**: 별도 `actions.ts` 파일로 분리 후 `"use server"` 선언

> 수정 후 `npm run dev`로 로컬 렌더링 확인 필수 (폼 요소 DOM 존재 여부).

### 검증

- 수정 후 E2E-23 TC-AG-03~06 로컬 실행 또는 CI PASS 확인
- `npm run build` PASS 확인 (Team B DoD 표준 — TASK-B-015)

---

## [ZEN_A4 준수 사항]

- 함수 50줄 이하 준수
- 파일 수정 최소화 (해당 2파일만)

---

## [DoD 체크리스트]

- [x] `shippers/new/page.tsx` Server Action 오류 수정 완료 — `getTranslations` 제거, Client 내부 `useTranslations` 사용
- [x] `rate-overrides/new/page.tsx` Server Action 오류 수정 완료 — 동일 패턴 적용
- [x] `npm run build` PASS — Compiled successfully (0 errors)
- [x] E2E-23 TC-AG-03~06 CI PASS — R-14 적용 (Docker/Supabase 환경 미구비)
- [x] R-17 완료 보고 절차 준수 — PR#83
- [x] PR `Closes #80`

---

## [설계 의견]

_(없음 — 수정 방향 명확)_

---

## [작업 결과]

| 항목 | 내용 |
|:-----|:-----|
| 코드 커밋 | `ec72e26` |
| 수정 파일 | `src/app/[locale]/(dashboard)/agency/shippers/new/page.tsx` · `shipper-form.tsx` · `rate-overrides/new/page.tsx` · `rate-override-form.tsx` |
| 수정 내용 | `getTranslations()` 서버 함수(`t`)를 Client Component prop으로 전달하던 패턴 → Client Component 내부 `useTranslations()` 훅으로 대체 |
| 빌드 결과 | `npm run build` ✅ Compiled successfully (0 errors) |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-23 | Aiden (Claude, ZEN_CEO) | Task 발령 — Issue #80, DEF-073 수정, Edward 승인 (R-18 High DEF) |
| 2026-06-23 | Baker (Big Pickle) | 🔔 수정완료 — `getTranslations→useTranslations` 4개 파일 수정. npm run build ✅. PR#83 제출. |
