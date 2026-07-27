# TASK-B-202: 범용 오더 상세 페이지 — UPS 오더는 빈 TrackingTimeline 숨김

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#770](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/770) (3번째 안, jungjs 확정 — 원래 Team A 몫이었으나 jungjs 지시로 Team B 이관) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 배경 및 정정 사항 (Jaison 직접 확인)

Aiden이 Issue #770에서 "`ups-detail/page.tsx`에 정상 작동하는 `UpsTrackingEventsList` 바로 옆에 항상 비어있는 구식 `TrackingTimeline`이 같이 렌더링되고 있을 가능성이 높다"고 제안했으나, **직접 코드를 확인한 결과 위치가 다릅니다**:

- `ups-detail/page.tsx`에는 `TrackingTimeline`이 전혀 없음 — `UpsTrackingEventsList`(zen_ups_tracking_events, 정상 작동)만 있음
- 실제로 조건 없이 `TrackingTimeline`이 렌더링되는 곳은 **범용 상세 페이지** `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx:363`:
  ```tsx
  <TrackingTimeline events={events} />
  ```
  `isUpsOrder` 플래그가 이 페이지에 이미 존재(91행)하지만 이 렌더링에는 전혀 쓰이지 않음 — UPS 오더든 아니든 무조건 표시됨.

TASK-B-199/200(DEF-126) 이후 UPS 오더는 목록·통합트래킹 화면에서 "View Details" 클릭 시 이제 `/ups-detail`로만 이동하므로 이 범용 페이지에 UPS 오더로 도달하는 경우는 줄었지만, **직접 URL 접근·북마크 등으로는 여전히 도달 가능**하고, 그 경우 UPS 오더는 `provider_type='VIRTUAL'` 고정이라 `events`가 항상 빈 배열 — 빈 트래킹 타임라인이 그대로 노출됨.

## 조치안

`src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx:363`을 `isUpsOrder`(91행에 이미 존재) 조건으로 감싸기:
```tsx
{!isUpsOrder && <TrackingTimeline events={events} />}
```
UPS 오더는 실제 트래킹 데이터가 `/ups-detail`에 정상 표시되므로, 이 범용 페이지에서는 (항상 비어있는) 섹션 자체를 숨기는 것으로 충분 — DEF-126 Option B/C(전체 redirect)처럼 페이지 구조를 크게 손대지 않는 최소 변경.

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수(task file/ACTIVE_TASK 미생성 유형 13회, 배정 번호 미사용 후 미래날짜 파일 생성 1회, 회귀 테스트 미추가 2회 — 전부 오늘 발생. 반드시 `./scripts/next-task-number.sh B` 직접 재확인, 배정된 파일 그대로 사용, 회귀 테스트 실제 추가할 것).
- 최근 Baker의 TASK-B-199/200에서 실제 컴포넌트 렌더링 기반 테스트로 좋은 평가를 받았음 — 동일한 방식(그림자 컴포넌트 금지) 참고 권장.

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-202 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `orders/[orderId]/page.tsx:363` `isUpsOrder` 조건 분기 적용
- [ ] 실제 페이지/컴포넌트 렌더링 기반 회귀 테스트 추가(UPS 오더는 TrackingTimeline 미노출, 비UPS는 노출 검증)
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 UPS 오더 상세 페이지(URL 직접 접근) → TrackingTimeline 섹션 사라졌는지, 비UPS 오더는 그대로 보이는지 실기 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `check-R17-DoD` 실행 후 통과 확인
5. 문서 커밋
6. PR 생성 (`feature/teamb-202-... → TeamB_Dev`, `Refs #770`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
