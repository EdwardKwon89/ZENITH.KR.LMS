# TASK-148 — PR#7 반려 수정 (Baker 담당) — Issue 2·3·4·6

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-148 |
| **생성일** | 2026-06-16 |
| **할당 Agent** | Baker (Big Pickle) |
| **지시자** | Jaison (Team B) |
| **팀 리더** | JSJung |
| **우선순위** | P1 |
| **전제조건** | TASK-142 ❌ (Aiden PR#7 조건부 반려) |
| **관련 IMP** | IMP-114 |
| **브랜치** | `feature/ups-spr02-devteam-agency-ui` |
| **커밋 태그** | `[Baker]` |
| **상태** | ⬜ |

---

## [목표]

Aiden의 PR#7 조건부 반려(TASK-142 ❌) 중 Baker 담당 파일에 해당하는 Issue 2·3·4·6을 수정한다.

---

## [작업 범위]

### 🔴 Issue 2 — MUST FIX: `shipper-form.tsx` locale prefix 누락

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/shipper-form.tsx:35`

**현상**: `router.push('/agency/shippers')` — Next.js i18n 미들웨어에서 redirect loop 또는 404 유발

**수정**:
```typescript
// before
'use client';
import { useRouter } from 'next/navigation';
// ...
router.push('/agency/shippers');

// after
'use client';
import { useRouter, useParams } from 'next/navigation';
// ...
const params = useParams();
const locale = params.locale as string;
// ...
router.push(`/${locale}/agency/shippers`);
```

---

### 🟡 Issue 3 — SHOULD FIX: `shippers/page.tsx` RBAC 검사 누락

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/page.tsx`

**현상**: `AgencyShippersPage`에 `checkPermission` 후 redirect 없음 — 비AGENCY 인증 사용자 직접 접근 시 Page 레벨 차단 없음

**수정**: `AgencyDashboardPage`와 동일한 패턴 적용

```typescript
import { checkPermission } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

// requireAuth() 이후 추가:
if (!profile || !checkPermission(profile.role, '/agency/shippers')) {
  redirect('/');
}
```

---

### 🟡 Issue 4 — SHOULD FIX: `profile.org_id` null 미체크

**파일**:
- `src/app/[locale]/(dashboard)/agency/shippers/page.tsx` (`AgencyShippersPage`)
- `src/app/[locale]/(dashboard)/agency/shippers/new/page.tsx` (`NewAgencyShipperPage`)

**현상**: `zen_profiles.org_id` DB 타입 `string | null` — null 체크 없이 Server Action 호출 시 예기치 않은 오류

**수정** (두 파일 모두):
```typescript
const { profile } = await requireAuth();
if (!profile || !profile.org_id || !checkPermission(profile.role, '/agency/shippers')) {
  redirect('/');
}
```

---

### ⚪ Issue 6 — MINOR: `shippers-client.tsx` any[] 타입 제거

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/shippers-client.tsx:9`

**수정**: `shippers: any[]` → `shippers: AgencyShipper[]`

```typescript
import type { AgencyShipper } from '@/types/agency';
// ...
interface AgencyShippersClientProps {
  shippers: AgencyShipper[];
  t: (key: string) => string;
}
```

---

## [주의 사항]

- 수정 대상 파일 4종만 변경 (Issue 1·5·7은 Dave 담당 — 절대 수정 금지)
- 함수/컴포넌트 **50줄 이하 엄수 (ZEN_A4)**
- RBAC import는 `@/lib/auth/guards`에서 `checkPermission` 사용 (기존 패턴 동일)

---

## [R-17 커밋 순서]

```
1. 코드 커밋: [Baker] fix: TASK-148 PR#7 반려 수정 — locale·RBAC·null체크·타입 (Issue 2·3·4·6)
2. task file [작업 결과] + 🔔 상태 변경
3. ACTIVE_TASK.md 🔔 반영 (Team B 섹션만)
4. scratch/IMP_PROGRESS.md IMP-114 행 갱신
5. check-R17-DoD 실행 → 전항목 PASS 확인
6. 문서 커밋: [Baker] docs: TASK-148 완료 보고 — PR#7 반려 수정 🔔
```

---

## [DoD]

- [ ] `shipper-form.tsx` — `useParams()` locale 추출 + `/${locale}/agency/shippers` 리다이렉트
- [ ] `shippers/page.tsx` — `checkPermission('/agency/shippers')` + redirect 추가
- [ ] `shippers/page.tsx` + `shippers/new/page.tsx` — `profile.org_id` null 체크 추가
- [ ] `shippers-client.tsx` — `any[]` → `AgencyShipper[]` 타입 교체
- [ ] `npm run test:regression` 전체 PASS (회귀 수 기재)
- [ ] 코드 커밋 해시: _(작업 후 기재)_
- [ ] DoD 자가 검증 `check-R17-DoD` 실행 완료

---

## [작업 결과]

_(Baker 작업 후 기재)_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
