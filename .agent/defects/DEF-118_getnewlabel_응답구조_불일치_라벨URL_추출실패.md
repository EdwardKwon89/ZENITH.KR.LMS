# DEF-118: getnewlabel 응답구조 불일치 — 실제 환경에서 라벨 URL 추출 상시 실패

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-22 |
| **보고자** | jungjs (Jaison) |
| **긴급도** | Critical |
| **우선순위** | P1 |
| **연결 이슈** | [#680](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/680) |

## 현상

`getnewlabel` 호출은 `success:1`로 성공하지만, 라벨 URL 추출이 항상 실패.

## 근본 원인

코드 가정 (`GetNewLabelResponse`): `data`가 단일 객체, 필드명 `label_url`

실제 SHXK 응답:
```json
{ "success": 1, "data": [
  { "lable_file": "https://...", "lable_file_type": "2", "lable_content_type": "1" }
]}
```

`data`는 **배열**, 필드명은 **`lable_file`**(벤더 API 오타 그대로). `label_url` 필드 자체가 없음.

Mock 응답이 우연히 `{label_url: ...}` 형태라 `SHXK_TEST_MOCK=true` 테스트에서만 동작하고, 실제 호출에서 항상 실패.

## 영향 범위

| 함수 | 파일 | 증상 |
|:-----|:-----|:------|
| `fetchAndSaveLabel()` | ups-labels.ts:154 | label_url null → storage_path='' |
| `fetchAndIssueUpsLabel()` | ups-labels.ts:272-275 | `!res.data?.label_url` → "문서 조회 실패" |
| `fetchShxkTradeDocument()` | ups-labels.ts:574-577 | `!res.data?.label_url` → "문서 조회 실패" |

## 조치

| 파일 | 변경 |
|:-----|:------|
| `src/lib/shxk/order.ts` | `GetNewLabelResponse`: `lable_file`로 필드명 변경, array 처리 |
| `src/lib/shxk/client.ts` | mock 응답: 배열+`lable_file`로 수정 |
| `src/app/actions/operations/ups-labels.ts` | 3개 함수 `label_url`→`lable_file` |

## 검증

- TypeScript: 0 error
- unit tests: 70/70 PASS
- Build: ✅
