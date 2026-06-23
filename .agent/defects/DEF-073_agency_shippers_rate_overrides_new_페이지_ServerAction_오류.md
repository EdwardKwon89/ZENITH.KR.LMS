# DEF-073 — Agency 신규 등록 페이지 Server Action 오류 (shippers/new · rate-overrides/new)

> **DEF-ID**: DEF-073
> **발견일**: 2026-06-23
> **발견자**: Jaison (Claude, Team B)
> **발견 경위**: TASK-B-019 §1 E2E 통합 실행 중 TC-AG-03~04, TC-AG-05~06 실패
> **긴급도**: High
> **상태**: 🔔 Aiden 보고 대기

---

## 현상

Phase 7 E2E 로컬 실행 시 아래 두 페이지에서 공통 오류 발생:

- `/ko/agency/shippers/new`
- `/ko/agency/rate-overrides/new`

**콘솔 오류**:
```
Error: Functions cannot be passed directly to Client Components
unless you explicitly expose it by marking it with "use server".
Or maybe you meant to call this function rather than return it.
```

**E2E 오류**:
- TC-AG-03~04: `locator.fill` Timeout 90s — `input[name="name"]` 등 폼 요소 미발견
- TC-AG-05~06: `locator.selectOption` Timeout 90s — `select[name="base_rate_id"]` 미발견

---

## 원인 추정

Server Action 함수가 `use server` 지시어 없이 Client Component에 직접 prop으로 전달됨.
결과적으로 페이지가 정상 렌더링되지 않아 폼 입력 요소가 DOM에 없음.

---

## 영향 범위

| 기능 | 영향 |
|:-----|:-----|
| 화주 신규 등록 (UAT-15-01) | ❌ 페이지 렌더링 실패 |
| 요율 오버라이드 신규 등록 (UAT-16-01) | ❌ 페이지 렌더링 실패 |
| E2E-23 TC-AG-03~04 | ❌ FAIL |
| E2E-23 TC-AG-05~06 | ❌ FAIL |

---

## 재현 방법

```bash
# 로컬 환경에서
npm run dev
# 브라우저에서 /ko/agency/shippers/new 접속
# → 콘솔 오류 확인
```

---

## 권장 조치

해당 페이지 Server Action 바인딩 방식 점검:
- Server Action을 Client Component에 직접 전달하지 않고, `"use server"` 지시어 명시 또는 별도 server component로 래핑

---

## 관련 파일 (추정)

- `src/app/[locale]/agency/shippers/new/page.tsx`
- `src/app/[locale]/agency/rate-overrides/new/page.tsx`

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-23 | Jaison (Claude, Team B) | DEF 최초 등록 — TASK-B-019 E2E 실행 중 발견 |
