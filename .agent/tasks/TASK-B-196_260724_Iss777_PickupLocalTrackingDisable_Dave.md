# TASK-B-196: 배송방식 픽업수령 선택 시 Local Tracking No 필드 비활성화

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#777](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/777) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P3 |
| **상태** | ⬜ |

## 개요

`/ko/orders/new`에서 배송방식(delivery_method) → "픽업수령"(PICKUP) 선택 시, 패키지별 "Local Tracking No"(`domestic_ref_no`) 입력 필드가 비활성화되어야 함. 상세는 Issue #777 참조.

## 조치안 (Jaison 진단 완료)

`src/components/orders/OrderRegistrationForm.tsx:1292-1301`
```tsx
<ZenInput
  placeholder="지역 택배 운송장번호 입력 (선택)"
  {...register(`packages.${i}.domestic_ref_no`)}
  className="py-2 text-xs"
/>
```
`delivery_method === 'PICKUP'`일 때 `disabled` 처리. 같은 파일 [line 1310-1314](src/components/orders/OrderRegistrationForm.tsx#L1310-L1314)의 DOC 타입 치수 필드 비활성화 패턴 재사용 가능:
```tsx
const isPickup = watch('delivery_method') === 'PICKUP';
...
<ZenInput ... disabled={isPickup} className={`py-2 text-xs ${isPickup ? 'opacity-40 bg-slate-100' : ''}`} />
```

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수(task file/ACTIVE_TASK 미생성 유형 13회 누적 — 코드 커밋과 별도로 반드시 문서 커밋 포함할 것). `./scripts/next-task-number.sh B` 직접 재확인, 브랜치 생성 전 `git pull origin TeamB_Dev` 필수.

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인(TASK-B-196 맞는지)
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `domestic_ref_no` 필드 disabled 처리 (delivery_method === 'PICKUP')
- [ ] 회귀 테스트 추가(실제 렌더링/disabled 속성 검증 — toContain 소스 문자열 검사 금지)
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 픽업수령 선택 → Local Tracking No 필드 비활성화 실기 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `gh issue edit 777 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 후 통과 확인
6. 문서 커밋
7. PR 생성 (`feature/teamb-196-... → TeamB_Dev`, `Closes #777`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
