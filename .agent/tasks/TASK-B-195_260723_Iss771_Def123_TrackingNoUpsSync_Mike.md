# TASK-B-195: DEF-123 — zen_tracking_configs.tracking_no UPS 실제 운송장번호 동기화

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#771](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/771) (DEF-123) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-23 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 개요

UPS 오더가 실제 운송장번호를 부여받아도 `zen_tracking_configs.tracking_no`는 등록 시점 placeholder(`ZN-오더번호`)에 계속 머물러 있음. 상세: `.agent/defects/DEF-123_zen_tracking_configs_tracking_no_UPS미동기화.md`, Issue #771.

## 근본 원인 (진단 완료 — Jaison)

`registerUpsOrder()`([`src/app/actions/operations/ups-labels.ts:294-344`](src/app/actions/operations/ups-labels.ts#L294-L344))가 `orderResult.trackingNo`(실제 UPS 운송장번호)를 `saveInitialLabel()`로 `zen_ups_labels`에만 저장하고, `zen_tracking_configs.tracking_no`는 갱신하지 않음.

실측: `zen_tracking_configs.tracking_no`(`ZN-ZEN-2026-000001`) vs `zen_ups_labels.tracking_number`(`1ZJ443D30439798553`) — 실제 오더에서 두 값이 다름을 REST 쿼리로 직접 확인 완료.

## 조치안 (사용자 확정 지시)

`ups-labels.ts:326` (`saveInitialLabel()` 호출 직후, `revalidatePath` 이전)에 추가:
```ts
if (orderResult.trackingNo) {
  await supabase
    .from('zen_tracking_configs')
    .update({ tracking_no: orderResult.trackingNo, updated_at: new Date().toISOString() })
    .eq('order_id', order.id);
}
```

**범위 제한 — 중요**: `provider_type`/`provider_name` 갱신은 **본 Task에 포함하지 않는다**. 해당 결정은 Issue #770에서 Edward 협의가 아직 진행 중이며, 본 Task는 `tracking_no` 컬럼 갱신만 다룬다. `provider_type`을 임의로 함께 바꾸지 말 것.

## 담당자 위반 이력 사전 경고

- **Mike: `toContain` 소스 문자열 검사 유형 — 누적 3회**(할당 중단 기준 도달, JSJung 2026-07-15 결정에 따라 할당 지속). 반드시 실제 DB 적용 + 실제 함수 호출 기반 behavioral 테스트로 검증할 것 — 마이그레이션/코드 파일을 `readFileSync`+`toContain()`으로 문자열만 확인하는 방식 금지.
- 본 Task는 마이그레이션이 아니라 TS 코드 수정이므로, 회귀 테스트는 `registerUpsOrder()`를 mock supabase로 호출해 실제로 `zen_tracking_configs` update가 호출되는지(update 인자값 포함) 검증할 것.

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-195 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev`
- [ ] `feature/teamb-195-tracking-no-ups-sync` 브랜치 생성 (최신 TeamB_Dev에서 분기 확인)
- [ ] `registerUpsOrder()`에 `zen_tracking_configs.tracking_no` 갱신 코드 추가 (provider_type/provider_name 건드리지 않음)
- [ ] 회귀 테스트 추가 — mock 기반으로 update 호출·인자값 검증
- [ ] `npm run test:regression` **직접 재실행**하여 정확한 카운트 확인 후 기재
- [ ] `npm run build` **직접 실행**하여 타입 에러 없는지 확인 후 기재
- [ ] 로컬에서 UPS 오더 등록 → `/ko/tracking`에서 Tracking Number가 실제 운송장번호로 표시되는지 실기 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `gh issue edit 771 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 후 통과 확인
6. 문서 커밋
7. PR 생성 (`feature/teamb-195-... → TeamB_Dev`, `Closes #771`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
