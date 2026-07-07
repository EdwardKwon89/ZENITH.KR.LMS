# TASK-B-067 — Issue #180 주소 검색 모달 iframe 잘림 수정

> **발령일**: 2026-07-07
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Kimi)
> **우선순위**: P2
> **상태**: ⬜ 미착수
> **선행 Task**: TASK-B-066 ✅ 권장 (CSP 수정 후 iframe 정상 렌더링 환경에서 확인)
> **연관 이슈**: [Issue #180](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/180)

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-067-address-overflow-baker
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상, `Closes #180`)

---

## 배경

TASK-B-063(PR#225)에서 `DaumPostcodeEmbed` 인라인 모달로 전환되었지만, 모달 컨테이너에 `overflow-hidden`이 적용되어 있어 주소 검색 iframe 일부가 잘리는 현상이 발생합니다.

`DaumPostcodeEmbed` 컴포넌트는 `style={{ height: 460 }}` 고정 높이로 렌더링되는데, 컨테이너의 `overflow-hidden`이 iframe 하단을 clip 처리합니다.

---

## 작업 범위

**파일**: `src/app/[locale]/(dashboard)/agency/shippers/new/address-input.tsx`

### §1 — 모달 컨테이너 overflow 수정

```tsx
// BEFORE
<div
  className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
  onClick={(e) => e.stopPropagation()}
>

// AFTER
<div
  className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-auto"
  onClick={(e) => e.stopPropagation()}
>
```

`overflow-hidden` → `overflow-auto`: 컨테이너가 iframe 콘텐츠를 clip하지 않고 스크롤 허용.

---

## DoD (Definition of Done)

- [ ] `address-input.tsx` 모달 컨테이너 `overflow-hidden` → `overflow-auto` 변경
- [ ] 로컬에서 주소 검색 모달 오픈 시 iframe이 잘리지 않고 전체 표시됨 확인
- [ ] TypeScript 빌드 오류 없음 (신규 오류 0건)
- [ ] `rtk npm run test:regression` — 전체 PASS
- [ ] 코드 커밋 해시: `<커밋 해시 기입>`
- [ ] PR 생성 완료 (`Closes #180`)

---

## [설계 의견]

_(Baker 기재)_

---

## [설계 확정]

_Jaison 전속_

---

## [작업 결과]

_(Baker 완료 후 기재)_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Jaison | TASK-B-067 발령 — Issue #180 주소 검색 모달 iframe 잘림 수정 (Baker 담당) |
