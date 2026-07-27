# TASK-B-195: DEF-123 — zen_tracking_configs.tracking_no UPS 실제 운송장번호 동기화

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#771](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/771) (DEF-123) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-23 |
| **우선순위** | P3 |
| **상태** | 🔔 |

## [작업 결과]

### 변경 내용

#### `src/app/actions/operations/ups-labels.ts`

`registerUpsOrder()`의 `saveInitialLabel()` 호출 직후 `zen_tracking_configs.tracking_no` 갱신 로직 추가:

```ts
if (orderResult.trackingNo) {
  const { error: updateErr } = await supabase
    .from('zen_tracking_configs')
    .update({ tracking_no: orderResult.trackingNo, updated_at: new Date().toISOString() })
    .eq('order_id', order.id as string);
  if (updateErr) {
    logger.error('registerUpsOrder: tracking_configs update failed', updateErr);
  }
}
```

### 검증
- 테스트: **2/2 PASS** (behavioral 테스트 — mock supabase로 update 호출 검증)
- 빌드: ✅ PASS
- 회귀: **116/116 파일 PASS, 775/775 테스트 PASS**
- 커밋 해시: `f3be6ebc`
- PR: [#775](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/775)

### [발견 이슈]

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
