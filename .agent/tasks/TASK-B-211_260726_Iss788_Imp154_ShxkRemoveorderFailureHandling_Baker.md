# TASK-B-211: IMP-154 — UPS 라벨 회수(removeorder) SHXK 실패가 조용히 삼켜짐

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#788](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/788) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

`cancelUpsRegistration()`/`voidUpsLabel()`(`src/app/actions/operations/ups-labels.ts`)이 SHXK `removeorder()` API를 호출하되, 실패(`success === 0`) 시 `logger.warn()`으로 로그만 남기고 그대로 내부 데이터(zen_ups_label_documents/Storage/zen_ups_labels)를 삭제·void 처리한 뒤 **무조건 `{success: true}`를 반환**합니다. UPS 측이 실제로 회수를 거부해도 화면에는 항상 성공으로 표시되어, 이미 배차된 UPS 화물이 그대로 나가는데 시스템상으로는 취소/폐기된 것으로 기록되는 불일치(중복/유령 배송)가 발생할 수 있습니다. 상세: `scratch/post_launch_improvements.md` IMP-154.

Issue #788 코멘트(jungjs)에서 범위가 "SHXK API 응답 처리 전체 점검(특히 실패 시 처리로직)"으로 확장 지시되어, **Jaison이 SHXK 함수 5종(`createorder`/`getnewlabel`/`removeorder`/`gettrackingnumber`/`gettrack`)의 모든 호출부를 전수 조사**했습니다. 아래 "조사 결과"를 참고해 **`removeorder` 2개 호출부만 수정**하면 됩니다(다른 함수들은 이미 정상).

## 조사 결과 (Jaison 완료 — 재조사 불필요)

| 함수 | 호출부 | 실패 처리 상태 |
|:-----|:-------|:--------------|
| `createorder` | `placeShxkOrder()` (ups-labels.ts:182-187) | ✅ 정상 — `success===0`/중복 시 `{error: ...}` 반환, 호출부가 확인 후 중단 |
| `getnewlabel` | `fetchAndSaveLabel()` (230) / `fetchAndIssueUpsLabel()` (387) / `fetchShxkTradeDocument()` (742) | ✅ 정상 — 3곳 모두 `success!==1 \|\| !data?.length` 체크 후 실패를 명확히 반환 |
| `gettrackingnumber` | 없음(호출부 자체가 없는 dead code) | 해당 없음 — 이번 작업 범위 아님 |
| `gettrack`(`pollTracking`) | `tracking.ts:322` / `ups-tracking-poll/route.ts:62` | ✅ 허용 가능 — 실패 시 `null` 반환, 폴링/재시도 가능한 읽기 전용 흐름이라 리스크 낮음. 이번 작업 범위 아님 |
| **`removeorder`** | **`cancelUpsRegistration()` (464-467) / `voidUpsLabel()` (603-606)** | ❌ **버그 — 실패해도 로그만 남기고 내부 삭제/void 그대로 진행, 항상 `{success:true}` 반환** |

**결론**: 문제는 `removeorder` 2개 호출부에 국한됩니다. 다른 4개 함수는 이미 실패를 정상적으로 전파하고 있어 추가 수정 불필요 — task file에 "SHXK 전체 점검했으나 removeorder 외 이상 없음"으로 기재해주세요.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `cancelUpsRegistration()` — `ups-labels.ts:463-467`

```ts
const referenceNo = labels[0].reference_no;
const removeRes = await removeorder(referenceNo.replace(/-/g, ''));
if (removeRes.success === 0) {
  logger.error(`removeorder failed for order ${orderId}: ${removeRes.message}`);
  return { success: false, error: `UPS 라벨 회수 실패(SHXK): ${removeRes.message}` };
}
```
`logger.warn` → `logger.error`로 격상하고, 실패 시 **즉시 return** — 이후의 `zen_ups_label_documents`/Storage/`zen_ups_labels` 삭제 블록(469행부터)이 전혀 실행되지 않도록 합니다.

### 2. `voidUpsLabel()` — `ups-labels.ts:602-606`

```ts
const removeRes = await removeorder(label.reference_no.replace(/-/g, ''));
if (removeRes.success === 0) {
  logger.error(`removeorder failed for order ${orderId}: ${removeRes.message}`);
  return { success: false, error: `UPS 라벨 회수 실패(SHXK): ${removeRes.message}` };
}
```
동일 패턴 — 실패 시 `markLabelVoidedByOrder()`/`unlockAllPackagesIntlRef()`(608행부터)가 실행되지 않도록 즉시 return.

### 3. `gettrack` 검증 단계 추가는 이번 범위 제외

Issue 요청 #2(회수 전/후 `gettrack`으로 실제 처리 상태 확인)는 **이번 Task 범위에서 제외**합니다 — SHXK 실물 Sandbox가 없어([Phase 8 UPS 테스트 제약] 참고) 검증이 어렵고, 위 #1 수정만으로 "성공 신호를 신뢰할 수 없는" 핵심 문제는 해소됩니다. 필요 시 별도 후속 IMP으로 남겨두세요(이번 task file `[발견 이슈]`에는 해당 없음 — 이미 Issue #788에 기록되어 있으므로 중복 등록 불필요).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-211-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 211 나와야 정상)
- [ ] `cancelUpsRegistration()` 위 스펙대로 수정
- [ ] `voidUpsLabel()` 위 스펙대로 수정
- [ ] 회귀 테스트 추가 — **반드시 behavioral 기반**(`toContain` 소스 문자열 검사 금지):
  - `removeorder` mock이 `{success: 0, message: '...'}`을 반환할 때, `cancelUpsRegistration()`이 `{success: false, error: ...}`를 반환하고 `zen_ups_labels`/`zen_ups_label_documents`의 `delete()`가 **호출되지 않았는지**(`expect(mockSupabase...delete).not.toHaveBeenCalled()` 등) 검증
  - 동일 패턴으로 `voidUpsLabel()`도 `markLabelVoidedByOrder`(update) 미호출 검증
  - `removeorder`가 `{success: 1}`인 기존 정상 케이스 회귀(기존 테스트 있으면 유지 확인)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Baker] fix: TASK-B-211 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 788 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #788`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 최근 이력: PR#844(🔍 설계확정 무시 착수), PR#837(타인 작업 기록 덮어쓰기). 이번 Task는 Jaison이 SHXK 전체 조사·설계를 이미 확정해뒀으므로 추가 조사·설계 판단 없이 스펙대로 구현.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
