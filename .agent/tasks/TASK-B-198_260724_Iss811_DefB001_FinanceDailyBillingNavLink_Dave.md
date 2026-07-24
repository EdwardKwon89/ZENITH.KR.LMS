# TASK-B-198: DEF-B-001 — /finance/daily-billing 사이드바 메뉴 링크 추가

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#811](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/811) (DEF-B-001) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 개요

`/finance/daily-billing`(Team A TASK-204/Riley 구현, 최종 운임 확정 및 화주별 일별 청구 집계) 페이지가 정상 구현되어 있으나 사이드바 메뉴에 연결되지 않아 URL 직접 입력 외에는 접근 불가. 상세: `.agent/defects/DEF-B-001_finance_daily_billing_사이드바메뉴누락.md`, Issue #811.

## 조치안 (Jaison 진단 완료)

`src/components/layout/NaviSidebar.tsx` 114-124행 `finance_group` children 배열에 추가:
```tsx
{ title: t("finance_daily_billing"), href: "/finance/daily-billing" },
```
`messages/ko.json`·`en.json`·`ja.json`·`zh.json` 4개 언어 전체에 `finance_revenue` 키 근처(58행 부근, ko.json 기준)에 신규 키 `finance_daily_billing` 추가:
- ko: "화주별 일별 청구"
- en/ja/zh는 기존 `finance_revenue` 등 인접 키의 번역 스타일 참고해 자연스럽게 작성

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수(task file/ACTIVE_TASK 미생성 유형 13회, 이미 완료된 번호 재사용 1회 누적 — 반드시 `./scripts/next-task-number.sh B`로 TASK-B-198 재확인, 브랜치 생성 전 `git pull origin TeamB_Dev` 필수).
- **DEF 번호는 신규 체계**(R-19 v2.6, 2026-07-24부) — Team B는 이제 `DEF-B-NNN`을 사용. 본 건은 이미 `DEF-B-001`로 채번 완료(재채번 불필요).

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-198 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `NaviSidebar.tsx`에 메뉴 항목 추가
- [ ] 4개 언어 메시지 파일에 `finance_daily_billing` 키 추가
- [ ] 회귀 테스트 추가(실제 렌더링 기반 메뉴 항목 존재 검증 — toContain 소스 문자열 검사 금지)
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 사이드바 재무 메뉴에 새 항목이 보이고 클릭 시 정상 이동하는지 실기 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `gh issue edit 811 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 후 통과 확인
6. 문서 커밋
7. PR 생성 (`feature/teamb-198-... → TeamB_Dev`, `Closes #811`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
