# TASK-B-327: Issue #1196 — SHXK 무역서류 처리 완료 메시지 부재 + INVOICE 문서유형 매핑 의심 (DEF-B-147)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1196](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1196) |
| **DEF** | [DEF-B-147](../defects/DEF-B-147_SHXK무역서류팝업_완료메시지부재_INV빈문서의심.md) |
| **배경** | Edward → James(SNTL) 신고 전달, Aiden 1차 분석(2026-09-09) — **18일간 task file 미생성 상태로 방치**돼 있던 것을 Jaison이 2026-10-01 재발견·정식화 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-10-01 |
| **우선순위** | P2 (Medium) |
| **상태** | 🔔 검토 대기 |

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

- [x] `git fetch origin` 후 `feature/teamb-327-shxk-trade-document-completion-msg` 브랜치를 `origin/TeamB_Dev` 최신(`57ac8c7f0`, TASK-B-328 병합 반영)에서 생성(전용 워크트리 `ZENITH_LMS-worktrees/dave`, R-17 §0) — TASK-B-328과 충돌 없음 확인
- [x] ① `handleConfirmPreview()` + `fetchShxkTradeDocument()` 수정
- [x] ② INVOICE 실제 PDF 확인(SHXK_TEST_MOCK=false 실제 호출) 후 조치 방향 결정 — **결과: 문서유형 매핑 문제로 확정, 스코프 확대 필요 → Jaison 판단 대기** (아래 [작업 결과] ② 참조)
- [x] 회귀 테스트 신설(R-09): RTL(컴포넌트 실제 렌더·상호작용) + 서버 액션 실제 호출 기반, `toContain` 미사용
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신 (§62 TC-TRDOC-01~06)
- [x] **독립 되돌리기 검증**: 수정 원복 시 신규 테스트 4건 정확히 FAIL(6건 중 4 FAIL/2 PASS) → 복원 후 6/6 PASS
- [x] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재 — **213 files / 1493 tests ALL PASS**
- [x] `npm run build` SUCCESS 확인 (TypeScript 0 errors)
- [x] (R-10) 실제 UI에서 WAYBILL/INVOICE/CUSTOMS 각각 클릭 → 완료 토스트 확인, INVOICE 실제 PDF 내용 확인 스크린샷 첨부 — `docs/99_Manual/E2E_327_Result/`

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-327 SHXK 무역서류 처리 완료 메시지 추가 + INVOICE 문서유형 확인 (DEF-B-147)` → 2. task file `[작업 결과]`(② 조사 결과 포함) + 상태 🔔 → 3. `gh issue edit 1196 --add-label status:review --remove-label status:in-progress` → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR(`feature/* → TeamB_Dev`, `Closes #1196`)

## 담당자 위반 이력 사전 경고

**Dave**: `.agent/VIOLATION_TRACKER.md` 참조. task file 미생성 13회(최다), 채번/CI인용 불일치 6회, 검증 무관 절차 대체 1회 — 누적에도 JSJung 2026-07-15 결정에 따라 할당 지속. 이번 Task는 ②(INVOICE 실물 확인)가 "요청된 검증을 무관한 절차로 대체"(Dave 기존 위반 패턴)에 특히 취약한 항목 — 실제 SHXK 응답으로 받은 진짜 PDF를 열어 확인할 것, DB 직접 조회나 추정으로 대체 금지.

## [작업 결과]

### 커밋

- 코드 커밋: **`aee50f033`** — `[Dave] fix: TASK-B-327 SHXK 무역서류 처리 완료 메시지 추가 + INVOICE 문서유형 확인 (DEF-B-147)`
  - `src/components/orders/UpsTradeDocumentActions.tsx`
  - `src/app/actions/operations/ups-labels.ts`
  - `tests/unit/ups/task-b327-trade-document-toast.test.tsx` (신규)
  - `tests/unit/ups/task-b327-fetch-trade-document.test.ts` (신규)
  - `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`

### ① 수정 내용 (확정 버그)

- `UpsTradeDocumentActions.tsx` `handleConfirmPreview()` — WAYBILL/INVOICE/CUSTOMS 분기:
  - `res.success` 시 `toast.success('문서 처리가 완료되었습니다.')` + `router.refresh()`
  - 실패 시 `toast.error(res.error || '문서 처리에 실패했습니다.')`
  - 기존 raw JSON `ResultPopup`은 유지
- ③ (선택 최소 반영): 성공 응답에 `url`이 있으면 `ResultPopup`에 **"문서 열기"** 링크 추가 (과설계 없이 다운로드/열람 링크만)
- `ups-labels.ts` `fetchShxkTradeDocument()` — 저장 성공 후 `revalidatePath('/(dashboard)/orders/[orderId]', 'page')` 추가 (동일 파일 다른 라벨 액션과 패턴 일치)

### ② INVOICE 문서유형 조사 결과 — **문서 매핑/설계 문제로 확정 (데이터 누락 아님)**

실제 SHXK API(`SHXK_TEST_MOCK=false`)로 테스트 오더를 `createorder` → `getnewlabel`(content_type 1/2/3) → PDF 다운로드 → `removeorder` 정리(`order_id=800929`, `removeorder` 성공)하여 실물 확인:

| 문서 | content_type | 파일크기 | SHA-256 | 내용 |
| :--- | :---: | :---: | :--- | :--- |
| 운송장(WAYBILL) | 1 | 45,197 B | `cfcb1107…` | 운송장 라벨 |
| 세관신고서(CUSTOMS) | 2 | 208,965 B | `1af8afe6…` | 4p 세관/상업 인보이스(품목·수량·금액 포함) |
| **INVOICE 버튼** | **3** | **45,197 B** | **`cfcb1107…` (동일)** | **운송장 라벨 — WAYBILL과 SHA-256 완전 동일** |

- SHXK 공식 스펙상 `lable_content_type=3`은 **"배송물류"** 문서이며 상업송장이 아니다. SHXK API에 별도 인보이스 유형은 없다.
- 결과적으로 "INVOICE" 버튼이 실제로는 **운송장을 반환** — 고객이 기대한 상업 인보이스 내용(품목/금액)이 없어 "빈 문서"로 보였다.
- **∴ 데이터 누락 버그가 아니라 설계(문서 유형 매핑) 문제.** task file 지침 §49대로 임의 스코프 확대는 하지 않고, 아래 조치안을 Jaison에게 보고 후 판단 대기한다.

  **조치안(택1):** (a) 버튼 라벨을 "배송물류 문서"로 정정, (b) 실제 상업 인보이스 내용은 CUSTOMS(content_type=2) 문서를 노출, (c) 자체 상업송장 PDF 생성(Issue #946/DEF-B-023 연계) — (c)는 별도 Task 필요.

### 검증

| 항목 | 결과 |
| :--- | :--- |
| 신규 회귀 테스트 | 6건 — **6/6 PASS** (RTL 컴포넌트 상호작용 4 + 서버 액션 revalidatePath 2) |
| 독립 되돌리기 검증 | 수정 원복 시 4건 FAIL(6건 중 4 FAIL/2 PASS), 복원 후 6/6 PASS |
| 전체 회귀 | `npm run test:regression` — **Test Files 213 passed / Tests 1493 passed** |
| 빌드 | `npm run build` SUCCESS (TypeScript 0 errors) |
| R-10 (실제 UI) | 오더 `ZEN-2026-000007`에서 운송장/INVOICE/세관신고서 버튼 클릭 → 결과 확인. WAYBILL 성공 시 완료 토스트 + "문서 열기" 링크 표시 확인. INVOICE 버튼 결과 팝업(`SHXK Response — INVOICE`) 및 실물 PDF(운송장) 확인 |

### 증적 경로

- `docs/99_Manual/E2E_327_Result/R10_UI_toast_verification.md` (실제 UI 토스트/링크 검증)
- `docs/99_Manual/E2E_327_Result/R10_INVOICE_content_type3_finding.md` (② 조사 결과)
- `docs/99_Manual/E2E_327_Result/0-waybill-preview-popup.png`, `1-waybill-after-confirm.png`
- `docs/99_Manual/E2E_327_Result/1-invoice-after-confirm.png`
- `docs/99_Manual/E2E_327_Result/INVOICE_content_type_3.pdf` / `.png` (실제 반환 운송장), `INVOICE_WAYBILL_content_type_1.pdf`, `INVOICE_CUSTOMS_content_type_2.pdf`

### R-10 방법 관련 고지 (자가검증 위조 금지 준수)

- ② 검증은 DB 조회·추정이 아니라 **실제 SHXK API를 직접 호출해 받은 진짜 PDF 파일**을 열어 판정했다(해시 비교 포함). 실 화물 생성 후 `removeorder`로 정리 완료.
- UI 검증은 로컬 dev + mock 모드로 진행했으며, mock의 다운로드 URL만 로컬 PDF 서버로 일시 변경해 "다운로드/저장 성공" 경로를 재현했다(해당 임시 변경은 커밋에서 제외·원복 완료). 실제 SHXK 실물 확인은 위 ②에서 별도 실호출로 완료.

## [발견 이슈]

없음
