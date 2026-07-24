# TASK-B-200: 통합 트래킹 Detail 링크를 운송요청목록과 동일하게 UPS 분기 처리

| 항목 | 내용 |
|:-----|:------|
| **연결 이슈** | [#812](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/812) (DEF-126, 같은 결함군의 4번째 발견 지점) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

사용자 요청: "물류관리 → 통합트랙킹 → View Detail" 기능을 "운송요청목록 → View Detail"(TASK-B-199에서 방금 구현한 것)과 동일하게 동작하도록 교체.

`TrackingDashboard.tsx`의 Detail 링크가 TASK-B-199 적용 전 `OrderDataTable.tsx`와 동일하게 `transport_mode`와 무관하게 항상 범용 상세 페이지로 고정되어 있음 — DEF-126과 같은 근본 원인(UPS 오더 상세화면 도달 불가)이 통합 트래킹 화면에도 동일하게 존재.

## 조치안 (Jaison 진단 완료)

### 1. 백엔드 — transport_mode 조회 추가

`src/app/actions/operations/tracking.ts:202-207` `getGlobalTrackingOverview()`의 `order:zen_orders(...)` select에 `transport_mode` 추가:
```ts
order:zen_orders(
  id,
  order_no,
  shipper_id,
  recipient_name,
  transport_mode
)
```

### 2. 프론트엔드 — Detail 링크 분기

`src/components/tracking/TrackingDashboard.tsx:259-267`
```tsx
<Link
  href={`/${safeLocale}/orders/${track.order_id}`}
  ...
>
  Detail
  <ExternalLink size={14} />
</Link>
```
→ `OrderDataTable.tsx`(TASK-B-199)와 동일한 패턴으로 변경:
```tsx
<Link
  href={`/${safeLocale}/orders/${track.order_id}${track.order?.transport_mode === 'UPS' ? '/ups-detail' : ''}`}
  ...
>
```

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조(stale 브랜치 4회·채번 절차 누락 5회·빌드 미확인 1회 누적, JSJung 결정에 따라 할당 지속). 브랜치 생성 전 `git pull origin TeamB_Dev` + `next-task-number.sh` 재확인 + `npm run build` 직접 실행 필수.
- 직전 TASK-B-199(PR#821)에서 처음으로 실제 컴포넌트를 직접 렌더링하는 정상 테스트를 작성했음 — 그 방식 그대로 유지할 것(그림자 컴포넌트 금지).

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-200 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `tracking.ts` select에 `transport_mode` 추가
- [ ] `TrackingDashboard.tsx` Detail 링크 분기 적용
- [ ] 실제 `TrackingDashboard` 컴포넌트 렌더링 기반 회귀 테스트 추가(UPS/non-UPS 각각 href 검증, mock `getGlobalTrackingOverview` 응답에 transport_mode 포함)
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 통합 트래킹 화면 → UPS 오더 Detail 클릭 → `/ups-detail` 이동, 비UPS 오더는 기존 경로 유지 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `check-R17-DoD` 실행 후 통과 확인
5. 문서 커밋
6. PR 생성 (`feature/teamb-200-... → TeamB_Dev`, `Refs #812`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
