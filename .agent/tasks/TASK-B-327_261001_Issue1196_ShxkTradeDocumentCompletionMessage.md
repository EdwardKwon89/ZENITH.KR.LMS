# TASK-B-327: Issue #1196 — SHXK 무역서류 처리 완료 메시지 부재 + INVOICE 문서유형 매핑 의심 (DEF-B-147)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1196](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1196) |
| **DEF** | [DEF-B-147](../defects/DEF-B-147_SHXK무역서류팝업_완료메시지부재_INV빈문서의심.md) |
| **배경** | Edward → James(SNTL) 신고 전달, Aiden 1차 분석(2026-09-09) — **18일간 task file 미생성 상태로 방치**돼 있던 것을 Jaison이 2026-10-01 재발견·정식화 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-10-01 |
| **우선순위** | P2 (Medium) |
| **상태** | 🔄 진행 중 |

## 현재 상태 (Jaison, TeamB_Dev 현재 코드로 재확인 완료)

[`UpsTradeDocumentActions.tsx:117-135`](../../src/components/orders/UpsTradeDocumentActions.tsx#L117-L135) `handleConfirmPreview()` 현재 코드 확인:
```ts
const res = await fetchShxkTradeDocument(orderId, action as 'WAYBILL' | 'INVOICE' | 'CUSTOMS');
setResultState({ action, result: res as Record<string, unknown> });
```
`VOID` 액션(위쪽 분기)은 `toast.success`/`toast.error` + `router.refresh()`가 있는데, WAYBILL/INVOICE/CUSTOMS는 **`res.success` 값과 무관하게 무조건 raw JSON을 `ResultPopup`으로만 보여주고 끝** — 성공해도 완료 안내 없고, **실패해도 에러 토스트 없이 그냥 JSON이 뜬다**(DEF 원문에 없던 추가 확인 사항: 실패 케이스도 사용자에게 안 보임).

`fetchShxkTradeDocument()`([ups-labels.ts:759](../../src/app/actions/operations/ups-labels.ts#L759))도 성공 후 `revalidatePath()` 미호출 확인됨 — 같은 파일의 `registerUpsOrder`/`fetchAndIssueUpsLabel`/`voidUpsLabel`은 전부 호출.

**현상 2(INVOICE 문서 의심)**는 미확인 상태 그대로 — 실제 PDF를 열어봐야 함.

**TASK-B-328과의 관계**: `downloadAndStoreLabelDoc()`(공통 헬퍼)을 TASK-B-328이 개선(재시도+구조화 로깅) 중일 수 있음 — 이 Task는 `fetchShxkTradeDocument()`와 `UpsTradeDocumentActions.tsx`만 수정하고 `downloadAndStoreLabelDoc()` 자체는 건드리지 않음. 착수 시 TeamB_Dev를 반드시 최신으로 동기화해 TASK-B-328의 변경사항과 충돌 없는지 확인.

## 수정 방향

### ① 현상 1 (확정 버그, 바로 수정)

`handleConfirmPreview()`의 WAYBILL/INVOICE/CUSTOMS 분기:
```ts
const res = await fetchShxkTradeDocument(orderId, action as 'WAYBILL' | 'INVOICE' | 'CUSTOMS');
if (res.success) {
  toast.success('문서 처리가 완료되었습니다.');
  router.refresh();
} else {
  toast.error(res.error || '문서 처리에 실패했습니다.');
}
setResultState({ action, result: res as Record<string, unknown> }); // 결과 팝업은 유지(디버그용 raw JSON, 필요시 개선은 ③)
```
`fetchShxkTradeDocument()`(`ups-labels.ts`)에 성공 시 `revalidatePath("/(dashboard)/orders/[orderId]", "page")` 등 추가 — 같은 파일 다른 함수들과 동일 패턴 맞출 것.

### ② 현상 2 (조사 우선, 수정은 결과에 따라 결정)

실제 SHXK 환경(`SHXK_TEST_MOCK=false`)에서 INVOICE(`content_type=3`) 문서를 실제로 발급해 PDF를 열어 확인:
- 완전 공백이면 → 데이터 누락 버그로 별도 분류, 원인 추적
- "배송물류" 서식이라 원래 품목/금액이 없는 게 맞다면 → "잘못된 문서 유형을 인보이스 버튼으로 노출"하는 설계 문제로 재정의. 이 경우 최소 수정(버튼 라벨을 "배송물류 문서"로 정정 등)만 하고, 실제 상업송장이 필요하면 Issue #946(DEF-B-023, CI/PL/UPS Invoice PDF 자체 렌더링 경로)과의 통합 여부는 Jaison에게 별도 보고(스코프 확대 승인 필요, 이 Task에서 임의로 확장 금지)

### ③ (선택, 과설계 금지) raw JSON 팝업 개선
DEF 원문의 "가능하면" 문구는 필수 아님 — 시간이 부족하면 스킵하고 ①·②만 완료해도 됨. 하되 최소한 문서 다운로드/열람 링크 정도는 추가할 여지가 있으면 반영.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-327-shxk-trade-document-completion-msg` 브랜치 생성(전용 워크트리, R-17 §0) — TASK-B-328과 동시 진행 중일 수 있으니 최신 동기화 특히 주의
- [ ] ① `handleConfirmPreview()` + `fetchShxkTradeDocument()` 수정
- [ ] ② INVOICE 실제 PDF 확인(SHXK_TEST_MOCK=false 실제 호출, Sandbox 없음 — 테스트 후 필요 시 `removeorder` 등 정리) 후 조치 방향 결정, 스코프 확대 필요 시 Jaison 보고 후 대기
- [ ] 회귀 테스트 신설(R-09): `fetchShxkTradeDocument` 성공/실패 각각에 대해 실제 `handleConfirmPreview` 호출 기반(RTL) 검증 — toast/router.refresh 호출 여부 확인, `toContain` 금지
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [ ] **독립 되돌리기 검증**
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 UI에서 WAYBILL/INVOICE/CUSTOMS 각각 클릭 → 완료 토스트 확인, INVOICE 실제 PDF 내용 확인 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-327 SHXK 무역서류 처리 완료 메시지 추가 + INVOICE 문서유형 확인 (DEF-B-147)` → 2. task file `[작업 결과]`(② 조사 결과 포함) + 상태 🔔 → 3. `gh issue edit 1196 --add-label status:review --remove-label status:in-progress` → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR(`feature/* → TeamB_Dev`, `Closes #1196`)

## 담당자 위반 이력 사전 경고

**Dave**: `.agent/VIOLATION_TRACKER.md` 참조. task file 미생성 13회(최다), 채번/CI인용 불일치 6회, 검증 무관 절차 대체 1회 — 누적에도 JSJung 2026-07-15 결정에 따라 할당 지속. 이번 Task는 ②(INVOICE 실물 확인)가 "요청된 검증을 무관한 절차로 대체"(Dave 기존 위반 패턴)에 특히 취약한 항목 — 실제 SHXK 응답으로 받은 진짜 PDF를 열어 확인할 것, DB 직접 조회나 추정으로 대체 금지.

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
