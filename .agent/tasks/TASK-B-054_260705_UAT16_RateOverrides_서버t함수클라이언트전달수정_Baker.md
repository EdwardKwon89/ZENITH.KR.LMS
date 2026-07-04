# TASK-B-054: UAT-16 블로커 수정 — rate-overrides 페이지 서버 `t` 함수 클라이언트 전달 오류

> **태스크 ID**: TASK-B-054
> **생성일**: 2026-07-05
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: ⬜
> **선행 Task**: 없음

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-054-uat16-rate-overrides-fix-baker
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상)

---

## 배경

UAT-16 수행을 위해 개발 서버 기동 중 `/ko/agency/rate-overrides` 500 에러 발견.

```
Error: Functions cannot be passed directly to Client Components unless you explicitly expose it
by marking it with "use server". Or maybe you meant to call this function rather than return it.
<RateOverridesClient overrides={[...]} t={function translateFn}>
```

**원인**: `page.tsx`(서버 컴포넌트)가 `getTranslations()`로 생성한 `t` 함수를 클라이언트 컴포넌트인 `RateOverridesClient`에 prop으로 직접 전달 — Next.js 금지 패턴.

**수정 방향**: 각 클라이언트 컴포넌트가 직접 `useTranslations()` 호출하도록 변경.

---

## 구현 범위

### §1 — `page.tsx` 수정

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/page.tsx`

- `getTranslations` import 제거
- `const t = await getTranslations()` 제거
- `<RateOverridesClient overrides={overrides} t={t} />` → `<RateOverridesClient overrides={overrides} />`

```typescript
// Before
import { getTranslations } from 'next-intl/server';
const t = await getTranslations();
return <RateOverridesClient overrides={overrides} t={t} />;

// After
return <RateOverridesClient overrides={overrides} />;
```

### §2 — `rate-overrides-client.tsx` 수정

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/rate-overrides-client.tsx`

- `useTranslations` import 추가 (`'next-intl'`)
- props interface에서 `t` 제거
- 컴포넌트 내 `const t = useTranslations()` 추가
- `<RateOverridesHeader t={t} />` → `<RateOverridesHeader />`
- `<RateOverridesTable ... t={t} />` → `<RateOverridesTable ... />`

### §3 — `rate-overrides-header.tsx` 수정

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/rate-overrides-header.tsx`

- `useTranslations` import 추가
- props `{ t }` 제거
- 컴포넌트 내 `const t = useTranslations()` 추가

### §4 — `rate-overrides-table.tsx` 수정

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/rate-overrides-table.tsx`

- `useTranslations` import 추가
- interface에서 `t` 제거
- 컴포넌트 내 `const t = useTranslations()` 추가
- `<RateOverrideTableRow ... t={t} />` → `<RateOverrideTableRow ... />`

### §5 — `rate-override-table-row.tsx` 수정

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/rate-override-table-row.tsx`

- `useTranslations` import 추가
- interface에서 `t` 제거
- 컴포넌트 내 `const t = useTranslations()` 추가

> **참고**: `new/rate-override-form.tsx`는 이미 클라이언트 컴포넌트에서 `useTranslations()`를 직접 호출하므로 수정 불필요.

---

## DoD (Definition of Done)

- [ ] `page.tsx`: `getTranslations` import 제거, `t={t}` prop 전달 제거
- [ ] `rate-overrides-client.tsx`: `t` prop 제거, `useTranslations()` 직접 호출
- [ ] `rate-overrides-header.tsx`: `t` prop 제거, `useTranslations()` 직접 호출
- [ ] `rate-overrides-table.tsx`: `t` prop 제거, `useTranslations()` 직접 호출
- [ ] `rate-override-table-row.tsx`: `t` prop 제거, `useTranslations()` 직접 호출
- [ ] `/ko/agency/rate-overrides` 500 에러 해소 (정상 페이지 렌더링 확인)
- [ ] TypeScript 빌드 오류 없음 (`npx tsc --noEmit --skipLibCheck` PASS)
- [ ] `npm run test:regression` — **전체 PASS**
- [ ] 코드 커밋 해시 기재: _(작업 완료 후 기재)_
- [ ] PR 생성 (`feature/teamb-task-b-054-... → develop`) 완료

---

## [설계 의견]

_(Baker 기재)_

---

## [설계 확정]

_Jaison 전속_

---

## [작업 결과]

_(Baker 작업 완료 후 기재)_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-05 | Jaison | TASK-B-054 발령 — UAT-16 블로커: rate-overrides 서버 t 함수 클라이언트 전달 500 에러 수정 (Baker 담당) |
