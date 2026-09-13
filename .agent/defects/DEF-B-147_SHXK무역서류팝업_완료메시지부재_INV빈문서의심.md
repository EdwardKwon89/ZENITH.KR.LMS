# DEF-B-147: SHXK 무역서류(운송장/INV/세관신고서) 처리 완료 메시지 부재 + INVOICE 문서유형 매핑 의심

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward가 원격(Vercel/Supabase) 운영 확인 중 James(SNTL)로부터 "운송장/INV 처리 시 팝업만 뜨고 처리가 안 되는 것 같다"는 신고를 전달, Aiden이 코드 추적으로 원인 분석(2026-09-09) |
| **긴급도** | Medium (백엔드 처리 자체는 정상 — UX/신뢰도 문제. 단, INVOICE 문서유형 매핑은 실물 확인 전까지 실제 데이터 결함 가능성 배제 못 함) |
| **발견일** | 2026-09-09 |

## 현상 1 — 정상 처리 완료 메시지 부재 (확정)

오더 상세의 "무역서류 관리" 버튼(운송장/INVOICE/세관신고서)을 클릭하면 SHXK API 호출 → PDF 다운로드 → Storage 저장까지는 **매번 정상 성공**하지만(스크린샷의 `success:true` + 유효 signed URL, James 재현 시도로도 확인), 사용자에게는 **원시 JSON 응답을 그대로 보여주는 디버그용 팝업**(`SHXK Response — WAYBILL` 등)만 뜨고 별도 완료 안내가 없어 "처리가 안 된 것 같다"는 오인을 유발한다.

## 현상 2 — INVOICE 문서가 빈 문서로 표출 (의심, 실물 확인 필요)

James 신고에 따르면 INVOICE 문서를 열었을 때 내용이 비어 보인다고 함. 아래 매핑 의심 지점 확인 필요.

## 원인

### 현상 1
[`src/components/orders/UpsTradeDocumentActions.tsx:106-139`](../../src/components/orders/UpsTradeDocumentActions.tsx#L106-L139) `handleConfirmPreview()`:
- `VOID` 액션만 `toast.success(...)` + `router.refresh()` 호출
- WAYBILL/INVOICE/CUSTOMS 액션은 `fetchShxkTradeDocument()` 결과를 그대로 `ResultPopup`(raw JSON)에 넘기고 끝 — 완료 토스트·페이지 리프레시 코드 자체가 없음(2026-07-17 Issue #565/#582에서 디버그용으로 최초 도입된 것이 그대로 남아있음)

같은 파일 [`src/app/actions/operations/ups-labels.ts:759`](../../src/app/actions/operations/ups-labels.ts#L759) `fetchShxkTradeDocument()`도 성공 후 `revalidatePath()`를 호출하지 않음 — 동일 파일의 `registerUpsOrder`/`fetchAndIssueUpsLabel`/`voidUpsLabel`/`cancelUpsRegistration`은 전부 호출하는 것과 대비됨.

### 현상 2 (의심, 미확정)
[`ups-labels.ts:16`](../../src/app/actions/operations/ups-labels.ts#L16) `DOC_TYPE_CONTENT_MAP.INVOICE = '3'`인데, SHXK 공식 API 스펙([`docs/80_RawData/Phase8_UPS_API_리서치_결과.md:230`](../../docs/80_RawData/Phase8_UPS_API_리서치_결과.md#L230))상 `lable_content_type=3`은 **"배송물류"** 문서이지 상업송장(Invoice)이 아니다. SHXK API에는 별도의 "인보이스" 문서 유형 자체가 없다 — 버튼 내부 key도 `logistics_invoice`([`UpsTradeDocumentActions.tsx:20`](../../src/components/orders/UpsTradeDocumentActions.tsx#L20))로 되어 있어 개발 당시에도 이 차이를 인지한 흔적이 있음. "배송물류" 문서가 원래 품목/금액 정보를 담지 않는 서식이라면 정상 발급되어도 고객이 기대하는 인보이스 내용은 애초에 없을 수 있음 — 실제 반환 PDF를 열어 확인 필요.

## 인접 참고 (동일 건 아님, 혼동 주의)

- Issue #946(DEF-B-023, 아직 OPEN)이 있으나 이건 **다른 페이지**(`orders/[orderId]/ups-detail/page.tsx`가 자체 렌더링하는 CI/PL/UPS Invoice PDF)의 번역키 누락 건 — 이번 건(`UpsTradeDocumentActions.tsx`/`fetchShxkTradeDocument` 경로)과 코드 경로가 다름. 별개로 처리하되 "인보이스 문서가 비어 보인다" 증상 계열이 두 곳에서 동시에 존재한다는 점은 참고.
- Issue #163(UAT-19)도 아직 미착수 — 인보이스 PDF 자체가 Team B UAT 검증을 거친 적이 없음.

## 권장 조치

1. **현상 1** (확정 버그, 바로 수정 가능): `fetchShxkTradeDocument()`에 `revalidatePath` 추가, `handleConfirmPreview()`의 WAYBILL/INVOICE/CUSTOMS 분기에 `toast.success` + `router.refresh()` 추가. 가능하면 raw JSON 팝업을 사용자 친화적 확인창(문서 링크/다운로드 버튼)으로 교체.
2. **현상 2** (확인 우선): 실제 INVOICE(content_type=3) 문서를 발급해 PDF를 열어 완전 공백인지, 일부만 비었는지 먼저 확인. 배송물류 문서 자체가 품목/금액을 안 담는 서식이 맞다면 "잘못된 문서 유형을 인보이스로 노출"하는 설계 문제로 재정의(고객에게 실제 상업송장이 필요하면 별도 문서 유형/자체 PDF 생성 필요 — #946과의 통합 검토 권장), 데이터 누락이 원인이면 별도 버그로 재분류.

## 파일 소유권 확인

`git log --follow`로 확인 — `UpsTradeDocumentActions.tsx`·`ups-labels.ts` 전 커밋이 Dave/Mike/Baker(Team B) 태그, Team A 이력 없음 → **Team B 담당**. → **TASK-B-327로 배정**
