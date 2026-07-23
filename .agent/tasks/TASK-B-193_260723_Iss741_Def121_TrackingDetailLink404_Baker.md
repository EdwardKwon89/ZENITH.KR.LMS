# TASK-B-193: DEF-121 — TrackingDashboard Detail 링크 로케일 프리픽스 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#741](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/741) (DEF-121) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-23 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

`/ko/tracking` 오더 목록에서 "Detail" 클릭 시 404. 상세: `.agent/defects/DEF-121_TrackingDashboard_Detail링크_로케일누락_404.md`, Issue #741.

## 근본 원인 (진단 완료 — Jaison)

`src/components/tracking/TrackingDashboard.tsx:257-263`
```tsx
<Link
  href={`/orders/${track.order_id}`}
  ...
>
```
`next/link`를 직접 import(18행)해서 로케일 프리픽스 없이 이동. 상세 페이지는 `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx`에 존재 — 페이지 자체는 있음, 링크 생성 로직만 결함.

## 조치안

`src/components/orders/OrderDataTable.tsx:34-36,130`의 기존 패턴 참고:
```tsx
const params = useParams();
const safeLocale = (params?.locale as string) || locale || 'ko';
...
href={`/${safeLocale}/orders/${order.id}`}
```
`TrackingDashboard.tsx`에도 동일 패턴 적용(또는 `src/i18n/routing.ts`의 `createNavigation(routing)` 로케일 인식 `Link`로 교체). 두 방식 중 택1, 판단은 담당자 재량.

## 담당자 위반 이력 사전 경고

- **Baker: stale 브랜치 재제출 유형 — 누적 4회** (PR#705·#709·#714, 3회 기준 이미 초과, JSJung 2026-07-15 결정에 따라 할당은 지속하되 매 Task마다 명시 경고). **반드시 브랜치 생성 직전** `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 실행 후 새 feature 브랜치를 분기할 것. 상세: `.agent/VIOLATION_TRACKER.md` 2026-07-22 항목 3건 참조.
- 기타: task file/ACTIVE_TASK 상태 전환 누락 이력(TASK-B-054, TASK-B-119) — 완료 보고 전 헤더 상태·ACTIVE_TASK.md 행이 실제로 🔔로 바뀌었는지 재확인할 것.

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-193 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev`
- [ ] `feature/teamb-193-tracking-detail-link-locale` 브랜치 생성 (최신 TeamB_Dev에서 분기 확인)
- [ ] `TrackingDashboard.tsx` 링크 수정
- [ ] 회귀 테스트 추가(로케일 프리픽스 포함 href 검증 — 단순 `toContain` 아닌 실제 렌더링/href 값 검증)
- [ ] `npm run test:regression` PASS
- [ ] 로컬에서 `/ko/tracking` → Detail 클릭 → 정상 이동 실기 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `gh issue edit 741 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 후 통과 확인
6. 문서 커밋
7. PR 생성 (`feature/teamb-193-... → TeamB_Dev`, `Closes #741`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
