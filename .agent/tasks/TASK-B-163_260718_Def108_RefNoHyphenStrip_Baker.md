# TASK-B-163: Issue #586 — DEF-108 SHXK reference_no 하이픈 제거

| 메타 | 값 |
|:----|:----|
| **Issue** | [#586](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/586) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-18 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. `src/app/actions/operations/ups-labels.ts` 수정 (5곳)

**DEF-108 원인**: `getnewlabel`/`removeorder`에 전달되는 `reference_no`가 하이픈 포함 `order_no`(예: `ZEN-2026-000001`)인데, SHXK API는 하이픈 없는 값만 지원. 어제 DEF-107(`child_number`)과 동일 패턴.

- **3-1. `fetchAndSaveLabel()` (147행)**: `getnewlabel` 호출 시 `referenceNo.replace(/-/g, '')` 적용
- **3-2. `voidUpsLabel()` → `removeorder()` (302행)**: `label.reference_no.replace(/-/g, '')` 적용
- **3-3. `fetchShxkTradeDocument()` (443행)**: `getnewlabel` 호출 시 `label.reference_no.replace(/-/g, '')` 적용
- **3-4. `previewShxkPayload()` WAYBILL/INVOICE/CUSTOMS (368행)**: 미리보기 JSON도 실제 호출값과 일치하도록 적용
- **3-5. `previewShxkPayload()` VOID (372행)**: 미리보기 JSON도 실제 호출값과 일치하도록 적용

> `createorder` 호출부(`buildCreateOrderPayload` 내부)는 하이픈 포함 상태로 정상 동작 중이므로 수정 없음.

#### 2. 테스트 추가 (`tests/unit/ups/ups-trade-documents.test.ts`)

- `fetchAndSaveLabel`이 `getnewlabel` 호출 시 하이픈 제거 검증
- `voidUpsLabel`이 `removeorder` 호출 시 하이픈 제거 검증
- `fetchShxkTradeDocument`이 `getnewlabel` 호출 시 하이픈 제거 검증
- `previewShxkPayload` 미리보기도 하이픈 제거 검증
- `placeShxkOrder` 호출부는 하이픈 제거하지 않는 검증

### 검증
- **회귀 테스트**: 95개 파일, 620개 테스트 ALL PASS ✅
- **CI**: Vercel PASS ✅ (PR#592)

### 커밋
- 코드 커밋: `86b7dc1d`
- 문서 커밋: `38a7ddfd`

### PR
- PR#592 · base: `integration/teamb-260718` · `Closes #586`

### 발견 이슈
- 없음
