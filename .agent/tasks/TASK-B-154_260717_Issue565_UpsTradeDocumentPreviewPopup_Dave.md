# TASK-B-154 — Issue #565 무역서류 관리 버튼 + JSON 확인 팝업

**생성일:** 2026-07-17
**담당:** Dave (DeepSeek V4 Flash Free)
**태그:** `[Dave]`

---

## 완료 조건 (DoD)

- [x] `buildCreateOrderPayload` 순수 함수 `label-mapping.ts`로 추출
- [x] `placeShxkOrder`가 추출된 함수를 재사용하도록 리팩터링
- [x] `previewShxkPayload` 서버 액션 신설 (실제 API 호출 없이 payload만 구성)
- [x] `triggerCreateOrderTest` 서버 액션 신설
- [x] `UpsTradeDocumentActions.tsx` 구조 개편 — `hasActiveLabel` 게이트 제거 + createorder 버튼 항상 노출
- [x] 모든 5개 버튼에 JSON 미리보기 팝업 게이트 추가
- [x] i18n 키 `createorder_test` ko/en 추가
- [x] 단위 테스트 12종 추가 (TC-P8-TD-01~07 + resolveShipperStreet 4종 + buildCreateOrderPayload 5종)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 업데이트
- [x] `npm run build` PASS
- [x] `npx vitest run tests/unit/ups/` 121/121 PASS

---

## 변경 파일

| 파일 | 변경 | 설명 |
|:-----|:----|:-----|
| `src/lib/ups/label-mapping.ts` | 추가 | `buildCreateOrderPayload` 순수 함수 + `resolveShipperStreet` export |
| `src/app/actions/operations/ups-labels.ts` | 수정 | `placeShxkOrder` 리팩터링 + `previewShxkPayload`, `triggerCreateOrderTest` 신설 |
| `src/components/orders/UpsTradeDocumentActions.tsx` | 수정 | createorder 버튼 + PreviewPopup 추가, hasActiveLabel 게이트 조건부 전환 |
| `messages/en.json` | 수정 | `createorder_test` 키 추가 |
| `messages/ko.json` | 수정 | `createorder_test` 키 추가 |
| `tests/unit/ups/ups-labels-mapping.test.ts` | 수정 | `resolveShipperStreet` + `buildCreateOrderPayload` 테스트 12종 추가 |
| `tests/unit/ups/ups-trade-documents.test.ts` | 수정 | `previewShxkPayload`/`triggerCreateOrderTest`/`buildCreateOrderPayload` 존재 검증 3종 추가 |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | 수정 | TC-P8-TD-01~07 등록 |

---

## 설계 요약

### 1. `buildCreateOrderPayload` 추출 (`label-mapping.ts`)

기존 `placeShxkOrder`의 payload 객체 리터럴 생성을 순수 함수로 분리.
- `shipperDefaults: { name: string; country: string }` 파라미터로 SHXK_SHIPPER_NAME/COUNTRY 전달받음 (server-only 프리)
- `CreateOrderRequest` 타입 의존 없이 `Record<string, unknown>` 반환

### 2. `previewShxkPayload` (서버 액션)

- `action` 파라미터에 따라 payload 구성만 하고 API 호출은 하지 않음
- `CREATEORDER`: `buildCreateOrderPayload` 호출
- `WAYBILL`/`INVOICE`/`CUSTOMS`: `configInfo` + `listorder` 객체 구성
- `VOID`: `reference_no` 객체 구성

### 3. `triggerCreateOrderTest` (서버 액션)

- `placeShxkOrder` 직접 호출, DB 저장은 하지 않음
- 중복 호출 시 SHXK `success === 2` 응답 처리

### 4. UI (`UpsTradeDocumentActions.tsx`)

- `hasActiveLabel` 조건부 게이트를 최상단 return → 각 버튼 그룹으로 이전
- createorder 버튼은 항상 노출 (UPS 오더인 경우)
- 모든 버튼 → `handlePreview` → `PreviewPopup` → 취소/확인
