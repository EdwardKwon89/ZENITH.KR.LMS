# TASK-B-215: DEF-B-009 — 입고처리 화면 크래시(package.id undefined) 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#867](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/867) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P1 (즉시) |
| **상태** | ⬜ |

## 개요

DEF-B-008(PR#866, TASK-B-214) 머지 후 `/ko/warehouse/inbound`에서 오더 조회 시 크래시 발생 — `pkg.id.substring(...)`에서 `pkg.id`가 undefined. 원인은 `getOrderByBarcodeOrNo()`의 package select 필드 목록에 `id`가 빠져있는 **기존부터 있던 결함**(DEF-B-008 이전엔 테이블명 오타로 쿼리가 항상 실패해 드러나지 않았을 뿐). 상세: `.agent/defects/DEF-B-009_...md`.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다. 코드 변경은 한 단어뿐입니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

`src/app/actions/operations/orders.ts:660`:
```ts
// 변경 전
order_packages:zen_order_packages(order_id, packing_unit, packing_count, length, width, height, gross_weight, volume)

// 변경 후
order_packages:zen_order_packages(id, order_id, packing_unit, packing_count, length, width, height, gross_weight, volume)
```
`id,` 필드 하나 추가가 전부입니다. `InboundProcessForm.tsx`는 이미 `pkg.id`를 참조하므로 프론트엔드 변경 불필요 — 부가 영향(패키지 중량/부피 편집 시 packageId 충돌)도 이 필드 추가만으로 자동 해결됩니다(별도 조치 불필요).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-215-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 215 나와야 정상)
- [ ] `orders.ts:660` select 절에 `id` 필드 추가
- [ ] **로컬 Supabase에 실제 REST 호출 또는 함수 직접 실행으로 `id` 필드가 응답에 포함되는지 실측 확인 필수**(mock만으로는 이번 DEF-B-008과 동일하게 select 필드 누락을 못 잡습니다)
- [ ] 회귀 테스트 추가 — **반드시 behavioral 기반**: `getOrderByBarcodeOrNo()` 결과의 `packages[].id`가 실제로 값을 갖는지 mock 기반 검증 + 가능하면 `InboundProcessForm` 렌더링 테스트로 패키지 카드가 크래시 없이 렌더링되는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/warehouse/inbound`로 접속해 패키지 있는 오더 조회 시 크래시 없이 정상 렌더링되는지 스크린샷 확인(R-10) — 이번엔 필수, 생략 시 반려

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Dave] fix: TASK-B-215 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 867 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-009 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #867`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 이전 TASK-B-214는 D_Kai(Team A, 사용자 직접 지시)가 대리 처리했고 실측 검증·R-10 스크린샷이 누락된 채 제출됐습니다(Jaison이 직접 보완) — 이번엔 Dave 본인이 실측 검증과 R-10 스크린샷을 반드시 직접 완료할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
