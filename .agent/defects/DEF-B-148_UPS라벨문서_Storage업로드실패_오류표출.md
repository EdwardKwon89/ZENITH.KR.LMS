# DEF-B-148: UPS 라벨/무역서류 PDF Storage 업로드 실패 시 오류 표출 + 오진단성 메시지 + 재시도 없음

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1201](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1201) |
| **발견 경위** | Edward가 원격(Vercel) 운영 확인 중 UPS 출고 처리 화면에서 오류 메시지 목격 → Aiden이 `get_runtime_errors`로 원인 추적(2026-09-30) → Jaison이 코드 심층 분석(2026-10-01) |
| **긴급도** | Medium (배송 처리 자체는 정상 — UX/오류 메시지 정확성 문제) |
| **발견일** | 2026-09-30 |

## 현상

오더 `ZEN-2026-000019` 처리 중 2026-09-30 15:54 KST경, UPS 라벨 PDF를 SHXK에서 받아 Supabase Storage에 저장하는 단계에서 `StorageApiError: <none>` 발생 → `"PDF 업로드 실패: <none>"` 오류가 화면에 표출됨. 다만 SHXK 등록/트래킹 자체는 이미 성공한 뒤였고, 같은 오더가 이후 17:08 출고확정 → 17:09 "운송 중" 전환까지 정상 진행되어 **실제 배송 처리는 문제없이 완료**됨.

## 근본 구조 분석 (Jaison)

### 1. 왜 "배송 처리는 정상"인데 오류가 뜨는가 — 두 단계가 독립적으로 분리되어 있음

- **UPS 등록/트래킹번호 발급**: `registerUpsOrder()` → `placeShxkOrder()` → SHXK `createorder` 응답의 `shipping_method_no`를 `saveInitialLabel()`이 즉시 `zen_ups_labels.tracking_number`에 저장. **이 시점에 이미 배송 등록·트래킹은 완결**됨.
- **PDF 문서 발급/저장**: `fetchAndIssueUpsLabel()`(docType 없음) → `fetchAndSaveLabel()` → SHXK `getnewlabel` 호출(성공) → [`downloadAndStoreLabelDoc()`](../../src/app/actions/operations/ups-labels.ts#L34-L89)로 PDF를 우리 Supabase Storage(`invoices` 버킷)에 백업 저장 — **이 단계가 실패한 것**.

즉 Storage 저장은 "실제 배송 처리"와 무관한 **내부 문서 아카이빙 부가 기능**인데, 실패 시 사용자에게는 마치 전체 처리가 실패한 것처럼 보이는 오류가 뜬다.

### 2. 오류 메시지 자체가 오진단성(misleading) — 확정 버그

[`fetchAndIssueUpsLabel()`](../../src/app/actions/operations/ups-labels.ts#L427-L429):
```ts
const labelUrl = await fetchAndSaveLabel(supabase, label.reference_no, orderId, label.id);
if (!labelUrl) return { success: false, error: '라벨 발급 실패 (getnewlabel)' };
```
[`fetchAndSaveLabel()`](../../src/app/actions/operations/ups-labels.ts#L225-L273)은 **두 가지 서로 다른 실패**를 모두 `null` 하나로만 반환한다:
- (a) `getnewlabel` API 호출 자체가 실패(`labelRes.success !== 1`) — SHXK 쪽 라벨 발급 실패
- (b) `getnewlabel`은 성공했지만 그 결과 PDF를 Storage에 저장하는 `downloadAndStoreLabelDoc()`이 실패(catch 후 로깅만 하고 계속 진행, 전부 실패 시 `lastSignedUrl=null`)

**두 경우가 구분되지 않아** (b)(실제로는 이번 사례) 상황에서도 화면엔 "라벨 발급 실패 (getnewlabel)"라는 **사실과 다른 메시지**가 표출된다(실제로는 `getnewlabel`은 성공했음). 사용자가 "처리가 안 됐다"고 오인하는 직접적 원인.

### 3. 부수 영향 — `markAllPackagesIssued()` 스킵 여부 확인 필요

같은 함수([L431-432](../../src/app/actions/operations/ups-labels.ts#L431-L432)):
```ts
if (!labelUrl) return { success: false, error: `Failed to mark packages issued: ...` }; // 조기 반환
const pkgErr = await markAllPackagesIssued(supabase, orderId, label.tracking_number);
```
`labelUrl`이 없으면(Storage 실패 포함) **`markAllPackagesIssued()`(패키지 `intl_ref_no`/`intl_ref_locked` 설정) 자체가 호출되지 않고 조기 반환**된다. 이번 사례에서는 이후 출고확정이 정상 진행됐다고 보고됐으나, `confirmOutbound()`가 `intl_ref_locked`를 실제로 요구하는지, 아니면 이 오더가 별도 경로(예: 재시도 성공, 혹은 `UpsTradeDocumentActions.tsx`의 수동 문서요청 경로에서 실패한 것이라 패키지 마킹과 무관)로 이미 처리된 것인지 **확인되지 않음** — 착수 시 재현 필요.

### 4. `uploadError.message`가 빈 문자열인 이유 — 근본원인 미상

[`downloadAndStoreLabelDoc()` L61-64](../../src/app/actions/operations/ups-labels.ts#L61-L64):
```ts
if (uploadError) {
  logger.error('[downloadAndStoreLabelDoc] Storage upload failed:', uploadError);
  throw new Error(`PDF 업로드 실패: ${uploadError.message}`);
}
```
`uploadError` 객체 전체가 아니라 `.message`만 에러 텍스트에 포함되는데, 이번 사례에서 `.message`가 빈 값이었음(`<none>`). Supabase Storage SDK의 `StorageError` 타입이 특정 실패 유형(네트워크 중단, 타임아웃 등)에서 `.message`를 채우지 않는 것으로 추정되나, 로그에 객체 전체가 안 남아 있어 **실제 근본원인(용량/네트워크/권한/버킷 정책 등) 특정 불가** — 이게 이번 사건 자체보다 더 큰 문제(재발해도 계속 원인을 모름).

### 5. 동일 함수를 공유하는 다른 진입점 — DEF-B-147(TASK-B-327)과 겹침 주의

`downloadAndStoreLabelDoc()`은 아래 3곳에서 호출되며 전부 동일한 실패 패턴을 공유한다:
- `fetchAndSaveLabel()` → `fetchAndIssueUpsLabel()`(docType 없음) — **이번 DEF-B-148의 실제 사례**
- `fetchAndIssueUpsLabel()`(docType 있음, L404)
- `fetchShxkTradeDocument()`(L787) — **DEF-B-147(TASK-B-327)이 다루는 "무역서류 관리" 버튼 경로**

`downloadAndStoreLabelDoc()` 자체(재시도·로깅 개선)를 고치면 DEF-B-147에도 이득이 되지만, **개별 호출부의 오류 메시지 문구 개선은 TASK-B-327과 중복/충돌 소지**가 있음 — TASK-B-328은 `fetchAndSaveLabel`/`fetchAndIssueUpsLabel`(docType 없음) 경로만 다루고, `fetchShxkTradeDocument()`의 메시지 개선은 TASK-B-327에 맡길 것.

## 권장 조치 (DoD)

1. **`downloadAndStoreLabelDoc()` 공통 개선**(3개 호출부 전체에 이득):
   - 업로드 실패 시 `uploadError` 객체 전체를 구조화 로깅(`JSON.stringify` 또는 logger의 구조화 필드)으로 남겨 근본원인 진단 가능하게
   - 1회 재시도(짧은 backoff) 후에도 실패하면 그때 throw
2. **`fetchAndSaveLabel()`/`fetchAndIssueUpsLabel()`(docType 없음 경로) 오류 구분**:
   - `fetchAndSaveLabel()` 반환 타입을 `{ signedUrl, getNewLabelFailed }` 형태로 확장해 "SHXK 라벨발급 자체 실패" vs "Storage 저장만 실패"를 구분
   - 후자일 때 메시지를 "배송 처리는 완료되었으나 문서 저장에 실패했습니다(재시도 가능)"처럼 정확하게 변경
3. **`markAllPackagesIssued()` 스킵 여부 실제 확인**: Storage 실패로 조기 반환되는 현재 흐름이 출고확정 등 후속 처리에 실제 영향을 주는지 재현 테스트로 확인, 영향 있다면 순서 재조정(문서 저장 실패와 무관하게 패키지 마킹은 먼저 수행하는 방향 검토)
4. 회귀 테스트 추가(R-09) — Storage 업로드 mock 실패로 위 1~3 항목 검증
