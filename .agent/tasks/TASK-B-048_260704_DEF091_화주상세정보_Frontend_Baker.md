# TASK-B-048: DEF-091 화주 상세 정보 Frontend — 등급 드롭다운·상세 편집 버튼·/edit 편집 페이지

> **태스크 ID**: TASK-B-048
> **생성일**: 2026-07-04
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: 🔔
> **관련 Issue**: [#159](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/159)
> **관련 DEF**: DEF-091
> **선행 Task**: TASK-B-047 (Backend) — Baker가 통합 구현
> **후행 Task**: 없음

---

## ⚠️ 착수 전 필독 — R-17 브랜치/PR 절차

1. `git fetch origin && git checkout develop && git pull origin develop`
2. `git checkout -b feature/teamb-task-b-048-def091-frontend-baker`
3. 완료 보고: 코드 커밋 → task file 🔔 기재 → ACTIVE_TASK 반영 → PR 생성 (`Closes #159`)
4. **develop 직접 커밋 절대 금지 — 위반 즉시 기록됨**

---

## 구현 범위

### §1 — `editable-cell.tsx` EditableGradeCell input → select

`GRADE_OPTIONS = ['', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']`을 `<select>` 드롭다운으로 제공

### §2 — `editable-cell.tsx` ActionCell "상세 편집" 버튼

`router.push(\`/${locale}/agency/shippers/${shipperId}/edit\`)` 버튼 추가

### §3 — `shipper-table-row.tsx` shipperId 전달

`ActionCell`에 `shipperId={shipper.id}` prop 전달

### §4 — 편집 페이지 신규 생성

- `src/app/[locale]/(dashboard)/agency/shippers/[id]/edit/page.tsx`
- `src/app/[locale]/(dashboard)/agency/shippers/[id]/edit/edit-form.tsx`

### §5 — Backend (TASK-B-047 통합)

`getAgencyShipperById` + `updateAgencyShipper` + `UpdateAgencyShipperSchema` + migration

### §6 — i18n 4개국어

`edit_title`, `edit_description`, `edit_submit` 번역 추가

---

## DoD (Definition of Done)

- [x] `EditableGradeCell` — `<select>` 드롭다운 (4개 등급)
- [x] `ActionCell` — "상세 편집" 버튼 (locale-aware URL)
- [x] `ShipperTableRow` — `shipperId` prop 전달
- [x] `/agency/shippers/[id]/edit/page.tsx` + `edit-form.tsx`
- [x] Backend (TASK-B-047): migration + Server Actions
- [x] i18n 4개국어 완비
- [x] TypeScript 빌드 오류 없음
- [x] `npm run test:regression` — 388/388 PASS
- [x] 코드 커밋 해시: `8d5b497`
- [x] PR 생성 (`Closes #159`): PR #168

---

## [작업 결과]

2026-07-04 Baker 구현 완료

- **코드 커밋**: `8d5b497`
- **브랜치**: `feature/teamb-task-b-048-def091-frontend-baker`
- **PR**: #168 OPEN (`feature/teamb-task-b-048-def091-frontend-baker → develop`)
- **회귀**: 388/388 PASS
- **추가 수정**: Jaison이 edit-form.tsx locale 누락 링크 2곳 수정 (DEF-092)

---

## [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-092 | edit-form.tsx locale 누락 하드코딩 링크 (`/agency/shippers`) | Medium | Jaison 직접 수정 — PR #168에 포함 |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-04 | Jaison | TASK-B-048 소급 생성 — 커밋 `8d5b497` 검토 완료 + DEF-092 수정 반영 |
