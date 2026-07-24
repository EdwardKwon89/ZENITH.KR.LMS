# TASK-B-199: DEF-126 — UPS Order Detail 화면 연결 누락 (OrderDataTable 링크 분기)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#812](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/812) (DEF-126) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 배경

Edward 지시로 Team A(TASK-210/Riley)에서 Team B로 이관됨(Issue #812 코멘트 참조). 원래 상세 결함 보고서는 Aiden이 작성: `.agent/defects/DEF-126_UPS_OrderDetail_화면연결누락_상세보기링크.md`.

TASK-189/TASK-209로 만든 UPS 전용 Order Detail 화면(`/orders/[orderId]/ups-detail`)이 오더 목록 "View Details" 클릭으로 도달 불가능 — `OrderDataTable.tsx`의 링크가 `transport_mode`와 무관하게 항상 범용 상세 페이지로 고정되어 있음.

## 조치 범위 (Jaison 판단 — Option A만 우선 진행)

원 결함 보고서는 A/B/C 3가지 안을 제시했으나(A: 목록 링크 분기, B: 범용 페이지 redirect, C: 병행), **B/C는 범용 상세 페이지(`orders/[orderId]/page.tsx`)에 이미 존재하는 UPS 부분 지원 섹션(라벨 상태·인보이스 출력 등, 91/217/219/543/588/596행)을 redirect로 죽은 코드화시켜 정리가 필요**해 범위가 커짐. P1 긴급도를 고려해 **Option A(목록 링크 조건 분기)만 우선 처리**하고, B/C(범용 페이지 redirect + 기존 UPS 섹션 정리)는 별도 후속 Task로 분리한다.

### 수정 대상

`src/components/orders/OrderDataTable.tsx:129-134`
```tsx
<Link 
  href={`/${safeLocale}/orders/${order.id}`}
  className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors border-b border-transparent hover:border-blue-600"
>
  View Details
</Link>
```
→ `order.transport_mode === 'UPS'`일 때 `/${safeLocale}/orders/${order.id}/ups-detail`로, 그 외에는 기존 경로 유지:
```tsx
<Link 
  href={order.transport_mode === 'UPS' ? `/${safeLocale}/orders/${order.id}/ups-detail` : `/${safeLocale}/orders/${order.id}`}
  className="..."
>
  View Details
</Link>
```
`orders` 배열에는 이미 `transport_mode`가 포함되어 있음(`OrderRepository.findList()`가 `select('*')`) — 별도 조회 불필요.

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조(stale 브랜치 4회·채번 절차 누락 5회·빌드 미확인 1회 누적, JSJung 결정에 따라 할당 지속). 브랜치 생성 전 `git pull origin TeamB_Dev` + `next-task-number.sh` 재확인 + `npm run build` 직접 실행 필수.
- **테스트는 실제 렌더링 기반으로 작성할 것** — 오늘 Dave가 2회 지적받은 "그림자 컴포넌트"(실제 컴포넌트 대신 로직만 재구현해 검증) 패턴 금지. 가능하면 실제 `OrderDataTable` 컴포넌트를 mock order 배열로 렌더링해 `transport_mode==='UPS'`인 행의 href가 `/ups-detail`로, 아닌 행은 기존 경로로 나오는지 직접 검증.

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-199 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `OrderDataTable.tsx` 링크 조건 분기 적용
- [ ] 실제 컴포넌트 렌더링 기반 회귀 테스트 추가(UPS/non-UPS 각각 href 검증)
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 UPS 오더 목록 → View Details 클릭 → `/ups-detail` 이동 확인, 비UPS 오더는 기존 경로 유지 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `gh issue edit 812 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 후 통과 확인
6. 문서 커밋
7. PR 생성 (`feature/teamb-199-... → TeamB_Dev`, `Closes #812`은 Option B/C 후속 Task가 남으므로 사용하지 말고 "Refs #812"로 남길 것 — 이슈는 후속 Task 완료 후 닫음)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음 — Option B/C(범용 페이지 redirect + 기존 UPS 섹션 정리)는 별도 후속 Task로 Jaison이 이어서 배정 예정.
