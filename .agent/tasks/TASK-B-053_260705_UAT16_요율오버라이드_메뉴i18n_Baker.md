# TASK-B-053: UAT-16 사전 수정 — 요율 오버라이드 사이드바 메뉴 i18n 누락 수정

> **태스크 ID**: TASK-B-053
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
git checkout -b feature/teamb-task-b-053-uat16-nav-i18n-baker
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상)

---

## 배경

UAT-16 수행 준비 중 사이드바의 **[요율 오버라이드]** 메뉴가 영어(`Rate Overrides`)로 표시되는 결함 발견.

**원인**: `NaviSidebar.tsx`가 `useTranslations("Navigation")`으로 `t("agency_rate_overrides_nav")` 호출하는데, 해당 키가 4개국어 모두 `Navigation` 네임스페이스에 없음.

| 파일 | root level | Navigation 네임스페이스 |
|:-----|:----------:|:----------------------:|
| `ko.json` | `요율 오버라이드` ✅ | ❌ 없음 |
| `en.json` | `Rate Overrides` ✅ | ❌ 없음 |
| `ja.json` | ❌ 없음 | ❌ 없음 |
| `zh.json` | ❌ 없음 | ❌ 없음 |

---

## 구현 범위

### §1 — 4개국어 `Navigation` 네임스페이스에 키 추가

**파일**: `messages/ko.json`, `messages/en.json`, `messages/ja.json`, `messages/zh.json`

각 파일의 `Navigation` 객체 내 agency 관련 키 그룹(예: `agency_settlements_nav` 근처)에 추가:

| 파일 | 추가할 키 | 값 |
|:-----|:---------|:---|
| `ko.json` | `agency_rate_overrides_nav` | `요율 오버라이드` |
| `en.json` | `agency_rate_overrides_nav` | `Rate Overrides` |
| `ja.json` | `agency_rate_overrides_nav` | `レート上書き` |
| `zh.json` | `agency_rate_overrides_nav` | `费率覆盖` |

> **참고**: root level에 이미 있는 ko.json, en.json의 기존 키는 삭제하지 않아도 되나, 
> Navigation 네임스페이스에 추가하는 것이 핵심.

---

## DoD (Definition of Done)

- [ ] `ko.json` `Navigation` 네임스페이스에 `agency_rate_overrides_nav: 요율 오버라이드` 추가
- [ ] `en.json` `Navigation` 네임스페이스에 `agency_rate_overrides_nav: Rate Overrides` 추가
- [ ] `ja.json` `Navigation` 네임스페이스에 `agency_rate_overrides_nav: レート上書き` 추가
- [ ] `zh.json` `Navigation` 네임스페이스에 `agency_rate_overrides_nav: 费率覆盖` 추가
- [ ] `dev` 서버에서 `/ko/agency/rate-overrides` 진입 시 사이드바 메뉴 **한글** 표시 확인
- [ ] TypeScript 빌드 오류 없음 (`npx tsc --noEmit --skipLibCheck` PASS)
- [ ] `npm run test:regression` — **전체 PASS**
- [ ] 코드 커밋 해시 기재: _(작업 완료 후 기재)_
- [ ] PR 생성 (`feature/teamb-task-b-053-... → develop`) 완료

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
| 2026-07-05 | Jaison | TASK-B-053 발령 — UAT-16 사전 수정, 요율 오버라이드 사이드바 메뉴 i18n 누락 (Baker 담당) |
