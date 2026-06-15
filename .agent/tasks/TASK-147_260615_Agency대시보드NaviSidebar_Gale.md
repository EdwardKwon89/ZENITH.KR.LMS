# TASK-147 — SPR-02 Agency 대시보드 + NaviSidebar 메뉴 추가

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-147 |
| **생성일** | 2026-06-15 |
| **할당 Agent** | Gale (Gemini Code Assistance) |
| **지시자** | Jaison (Team B) |
| **팀 리더** | JSJung |
| **우선순위** | P1 |
| **전제조건** | TASK-145 ✅ (Server Actions 구현 완료) |
| **관련 IMP** | IMP-114 |
| **브랜치** | `feature/ups-spr02-devteam-agency-ui` (TASK-145·146과 동일 브랜치) |
| **커밋 태그** | `[Gale]` |
| **상태** | 🚫 |

---

## [목표]

An-12 §6-1 기준으로 대리점 대시보드 페이지를 구현하고, NaviSidebar에 AGENCY 역할 전용 메뉴를 추가한다.

---

## [작업 범위]

### 1. Agency 대시보드

**파일**: `src/app/[locale]/(dashboard)/agency/page.tsx`

- AGENCY role 접근 제어
- 간단한 요약 정보 표시:
  - 등록 화주 수 (`getAgencyShippers()` count)
  - 이번 달 오더 수 (추후 연동 — 현재는 placeholder)
  - 빠른 이동 링크: 화주 목록 / 요율 오버라이드(SPR-03 예정)

### 2. NaviSidebar Agency 메뉴 추가

**파일**: `src/components/layout/NaviSidebar.tsx`

> ⚠️ **공유 파일 수정 규칙 (An-12 §7)**: 현재 브랜치에서 수정 후 PR 머지 전까지 Team A는 이 파일 수정 금지. 동시 수정 절대 금지.

추가할 메뉴 항목 (AGENCY role 한정 노출):

```typescript
// AGENCY role 전용 메뉴
{ label: '대리점 관리', href: '/agency', icon: BuildingOffice2Icon, roles: ['AGENCY'] }
{ label: '화주 목록', href: '/agency/shippers', icon: UsersIcon, roles: ['AGENCY'] }
// SPR-03에서 추가 예정:
// { label: '요율 오버라이드', href: '/agency/rate-overrides', icon: ..., roles: ['AGENCY'] }
```

### 3. i18n 키 추가

**파일**: `messages/ko.json` (agency_* 접두사 키만 추가)

```json
{
  "agency_dashboard": "대리점 대시보드",
  "agency_shippers": "화주 목록",
  "agency_registered_shippers": "등록 화주",
  "agency_quick_links": "빠른 이동"
}
```

---

## [주의 사항]

- `NaviSidebar.tsx`는 **공유 파일** — Team A와 동시 수정 금지 (An-12 §7)
- 수정 전 반드시 `git log origin/develop -- src/components/layout/NaviSidebar.tsx`로 Team A 최신 수정 여부 확인
- `messages/ko.json`은 `agency_` 접두사 키만 추가 (기존 키 수정 금지)
- 대시보드 컴포넌트는 서버 컴포넌트로 구현 (데이터 fetching 포함)
- 함수 50줄 이하 (ZEN_A4)

---

## [R-17 커밋 순서]

```
1. 코드 커밋: [Gale] feat: TASK-147 Agency 대시보드 + NaviSidebar AGENCY 메뉴 추가
2. task file [작업 결과] + 🔔 상태 변경
3. ACTIVE_TASK.md 🔔 반영
4. scratch/IMP_PROGRESS.md IMP-114 행 갱신
5. check-R17-DoD 실행 → 전항목 PASS 확인
6. 문서 커밋: [Gale] docs: TASK-147 완료 보고 — task file 🔔
```

---

## [DoD]

- [ ] `src/app/[locale]/(dashboard)/agency/page.tsx` — 대시보드 페이지 구현 완료
- [ ] `src/components/layout/NaviSidebar.tsx` — AGENCY 메뉴 2종 추가 완료
- [ ] `messages/ko.json` — `agency_*` 키 추가 완료
- [ ] AGENCY role 한정 메뉴 노출 확인 (타 role에서 비노출)
- [ ] `npm run test:regression` 전체 PASS
- [ ] 코드 커밋 해시: _(작업 후 기재)_
- [ ] DoD 자가 검증 (`check-R17-DoD`) 완료

---

## [작업 결과]

_(Gale 작업 완료 후 기재)_

---

## [발견 이슈]

_(없음)_
