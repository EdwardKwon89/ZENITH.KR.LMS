# DEF-118: `getnewlabel` 응답 구조가 코드 가정과 완전히 다름 — 실제 라벨 URL 추출 상시 실패

| 항목 | 내용 |
|:----|:----|
| **발견 경위** | JSJung이 SHXK 공식 API 문서(`https://shxk.rtb56.com/usercenter/manager/api_document.aspx#getnewlabel`) 재확인 요청 → `zen_shxk_api_logs`에 저장된 실제 응답과 코드 비교 |
| **긴급도** | **즉시(Critical)** |
| **발견자** | Jaison |
| **발견일** | 2026-07-22 |

## 현상

`getnewlabel` API를 호출하면 SHXK 응답 자체는 `success: 1`(성공)로 오는데, 코드가 라벨 URL을 추출하는 로직이 실제 응답 구조와 맞지 않아 **항상 URL 추출에 실패**한다. 그 결과 `zen_ups_labels.storage_path`가 이 세션 내내 확인한 모든 실제(mock 아닌) 레코드에서 빈 문자열(`""`)로 남아있었음.

## 근본 원인

**코드가 가정하는 응답 구조** (`src/lib/shxk/order.ts:30`):
```ts
export interface GetNewLabelResponse {
  label_url?: string
  label_data?: string
  label_type?: string
}
```
`data`를 단일 객체로 캐스팅(`assertData<GetNewLabelResponse>(res.data)`)하고, 호출부에서 `labelRes.data.label_url`로 접근.

**실제 SHXK 응답** (`zen_shxk_api_logs`에 저장된 실제 API 응답, 2026-07-21T23:16:15):
```json
{
  "success": 1,
  "cnmessage": "获取订单标签成功",
  "enmessage": "获取订单标签成功",
  "data": [
    { "lable_file": "https://api-pdf.oss-cn-shenzhen.aliyuncs.com/pdf/.../a6c7....pdf", "lable_file_type": "2", "lable_content_type": "1" },
    { "lable_file": "http://shxk.rtb56.com/api-lable/pdf/.../fc4e....pdf", "lable_file_type": "2", "lable_content_type": "2" }
  ]
}
```
- `data`는 **배열**(요청한 `lable_content_type`에 따라 1개 이상의 항목, 예: `content_type=6`(결합) 요청 시 2개 항목 반환된 사례 확인)
- 각 항목의 URL 필드명은 **`lable_file`**(요청 파라미터 명명 규칙 그대로 — "label"이 아니라 벤더 API 자체의 오타 "lable"을 응답에서도 일관되게 사용)
- `label_url`/`label_data`/`label_type`라는 필드는 **존재하지 않음**

**Mock 응답이 우연히 코드와 일치해서 지금까지 발견 안 됨** (`src/lib/shxk/client.ts:37-46`):
```ts
case 'getnewlabel':
  return { success: 1, ..., data: { label_url: `https://mock-shxk.test/labels/${refNo}.pdf`, label_type: 'PDF' } }
```
`SHXK_TEST_MOCK=true`(단위 테스트 전부, 로컬 개발 상당 시간)에서는 mock이 `label_url` 단일 객체를 반환해 코드와 맞았지만, `SHXK_TEST_MOCK=false`(실제 SHXK 호출)에서는 항상 어긋남.

## 영향 범위 (전부 동일한 `res.data.label_url`/`res.data?.label_url` 패턴 사용)

| 함수 | 파일:라인 | 영향 |
|:-----|:---------|:-----|
| `fetchAndSaveLabel()` | `ups-labels.ts:155` | `labelUrl = labelRes.data.label_url ?? null` → 배열엔 `.label_url` 없어 항상 `undefined` → `null` → `storage_path: ''` 저장 |
| `fetchAndIssueUpsLabel()` (docType 지정 시) | `ups-labels.ts:271-275` | `!res.data?.label_url` → 배열이라 항상 true → **`{success:false, error:'문서 조회 실패'}` 즉시 반환** (SHXK 호출 자체는 성공했는데 실패로 오판) |
| `fetchShxkTradeDocument()` | `ups-labels.ts:575-578` | 위와 동일 패턴, 동일하게 상시 실패 |

**즉 PR#675(방금 병합)에서 추가한 "운송장 출력"/"운송장+세관신고서+INVOICE 출력" 버튼은 실제 운영 환경(mock 아닌 실제 SHXK)에서 클릭하면 무조건 "문서 조회 실패"가 뜹니다.** 단위 테스트가 mock 기반이라 이 버그를 잡지 못하고 통과했습니다(PR#675 리뷰 시 저도 놓쳤습니다).

## 재현 근거

`zen_shxk_api_logs`에서 실제 성공한 `getnewlabel` 호출의 `response_body`를 직접 조회해 위 구조 확인(2026-07-21 17:56~23:16 사이 3건 모두 동일 구조).

## 목표 구현

1. `GetNewLabelResponse` 타입을 실제 구조에 맞게 수정 — 배열, 필드명 `lable_file`(예: `interface GetNewLabelItem { lable_file: string; lable_file_type: string; lable_content_type: string }`, `getnewlabel()`의 반환 타입도 `data: GetNewLabelItem[] | null`로 수정)
2. 3개 호출부(`fetchAndSaveLabel`/`fetchAndIssueUpsLabel`/`fetchShxkTradeDocument`) 전부 배열에서 `lable_file` 추출하도록 수정
3. **결합 요청(`content_type=6` 등) 시 배열에 항목이 여러 개 올 수 있음** — 어떤 항목을 택할지(또는 전부 반환할지) 설계 필요. 특히 PR#675의 "운송장+세관신고서+INVOICE 출력"(COMBINED) 버튼은 URL이 1개가 아니라 **여러 개**(요청한 문서 종류 수만큼) 나올 수 있으므로, `window.open(res.url, '_blank')` 한 곳만 여는 현재 UI로는 부족할 수 있음 — 이 부분 UI까지 함께 재검토 필요.
4. 이 버그를 다시 mock으로만 재검증하지 말고, **실제 SHXK 호출(`SHXK_TEST_MOCK=false`)로 최소 1회는 검증** — `zen_shxk_api_logs`에 남는 실제 응답과 최종 `storage_path`/UI에 표시되는 URL을 대조해서 확인 요청. Mock 응답 구조(`client.ts:37-46`)도 실제 구조에 맞게 함께 수정하는 것을 권장(그래야 앞으로 mock 기반 테스트가 실제 버그를 잡을 수 있음).

## 관련 파일

- `src/lib/shxk/order.ts` (`GetNewLabelResponse`, `getnewlabel()`)
- `src/lib/shxk/client.ts` (`buildMockResponse()`의 getnewlabel 분기)
- `src/app/actions/operations/ups-labels.ts` (`fetchAndSaveLabel`, `fetchAndIssueUpsLabel`, `fetchShxkTradeDocument`)

## 예상 공수

Medium (0.5~1일 — 타입 수정 + 3개 호출부 수정 + 결합요청 다중 URL UX 설계 + 실제 API 검증)

## 우선순위

**P1 — 즉시**: UPS 라벨/무역서류 실제 발급·출력 기능이 mock 환경 밖에서는 전부 동작 불능 상태로 추정됨(방금 병합된 PR#675 포함)
