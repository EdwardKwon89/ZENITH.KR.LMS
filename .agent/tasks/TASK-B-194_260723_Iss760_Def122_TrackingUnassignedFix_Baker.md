# TASK-B-194: DEF-122 — getGlobalTrackingOverview is_unassigned 배열 인덱싱 오류 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#760](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/760) (DEF-122) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-23 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 개요

`/ko/tracking` 목록에서 shipper_id·recipient_name이 실제로 존재하는 정상 오더도 "Unassigned"로 오분류. 상세: `.agent/defects/DEF-122_getGlobalTrackingOverview_isUnassigned_배열인덱싱오류.md`, Issue #760.

## 근본 원인 (진단 완료 — Jaison)

`src/app/actions/operations/tracking.ts:230`
```js
const isUnassigned = !config.order?.[0]?.shipper_id && !config.order?.[0]?.recipient_name;
```
`order:zen_orders(...)` 임베딩은 N:1 관계라 **객체**로 반환되는데(배열 아님, 실측 REST 쿼리로 확인 완료), `?.[0]`으로 배열처럼 인덱싱해 항상 `undefined` → `isUnassigned`가 데이터 존재 여부와 무관하게 항상 `true`.

## 조치안

```js
const isUnassigned = !config.order?.shipper_id && !config.order?.recipient_name;
```
`TrackingDashboard.tsx:195,203`의 기존 정상 접근 패턴(`track.order?.order_no`, 배열 인덱싱 없음)과 일관되게 맞추면 됨.

## 담당자 위반 이력 사전 경고

- **Baker: stale 브랜치 재제출 유형 — 누적 4회**, **채번 절차 누락 유형 — 누적 5회**(직전 TASK-B-193/PR#746). 반드시 브랜치 생성 직전 `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 실행 후 새 feature 브랜치 분기, `./scripts/next-task-number.sh B`로 채번 재확인(본 Task는 TASK-B-194). 상세: `.agent/VIOLATION_TRACKER.md` 참조.
- 직전 TASK-B-193(PR#746)에서는 재작업 후 정확한 회귀 테스트·정확한 카운트 보고로 통과했음 — 그 방식 그대로 유지할 것.

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-194 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev`
- [ ] `feature/teamb-194-tracking-unassigned-fix` 브랜치 생성 (최신 TeamB_Dev에서 분기 확인)
- [ ] `tracking.ts:230` 수정
- [ ] 회귀 테스트 추가 — shipper_id/recipient_name이 있는 경우 `is_unassigned=false`, 둘 다 없는 경우 `true`가 되는지 실제 함수 호출 기반으로 검증(단순 소스 문자열 `toContain` 금지)
- [ ] `npm run test:regression` **직접 재실행**하여 정확한 카운트 확인 후 기재(구 수치 재사용 금지)
- [ ] 로컬에서 `/ko/tracking` 실기 확인 — ZEN-2026-000001/000002가 더 이상 Unassigned로 뜨지 않는지

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `gh issue edit 760 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 후 통과 확인
6. 문서 커밋
7. PR 생성 (`feature/teamb-194-... → TeamB_Dev`, `Closes #760`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
