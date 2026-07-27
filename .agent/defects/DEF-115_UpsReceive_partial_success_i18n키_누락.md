# DEF-115: `WarehouseUpsReceiving.partial_success` i18n 키 누락 — UPS접수 일부실패 시 콘솔 에러

| 항목 | 내용 |
|:----|:----|
| **발견 경위** | JSJung 실사용 중 브라우저 콘솔 에러 보고 |
| **긴급도** | Low (기능 차단은 아님, 토스트 메시지 미표시) |
| **발견자** | Jaison |
| **발견일** | 2026-07-22 |

## 현상

```
[browser] Error: MISSING_MESSAGE: Could not resolve `WarehouseUpsReceiving.partial_success` in messages for locale `ko`.
    at handleConfirmRegistration (src/components/warehouse/UpsReceiveProcessForm.tsx:103:23)
```

## 근본 원인

`src/components/warehouse/UpsReceiveProcessForm.tsx:103`에서 `t("partial_success", { success: successCount, fail: failCount })`를 호출하지만, `messages/ko.json`(및 en/ja/zh 전부)의 `WarehouseUpsReceiving` 블록에 `partial_success` 키가 정의되어 있지 않음. Issue #635 Task C(PR#646, Baker)에서 컴포넌트 작성 시 누락된 것으로 추정.

**참고**: 동일한 목적의 키가 `WarehouseDeparture` 블록에는 이미 존재함(`messages/ko.json:693`):
```json
"partial_success": "출고확정 완료: {success}건 성공, {fail}건 실패",
```

## 영향 범위

UPS접수(`/warehouse/ups-receive`)에서 여러 오더를 선택해 일괄 등록했을 때 **일부만 성공한 경우**(전부 성공/전부 실패는 정상) 토스트 메시지 렌더링이 `MISSING_MESSAGE` 에러로 실패. 사용자에게는 어떤 오더가 실패했는지 안내가 안 나가는 UX 결함이며, 기능 자체(등록 처리)는 정상 동작.

## 목표 구현

`messages/ko.json`, `en.json`, `ja.json`, `zh.json`의 `WarehouseUpsReceiving` 블록에 `partial_success` 키 추가. `WarehouseDeparture`의 동일 키(`{success}`/`{fail}` 인터폴레이션)를 참고해 4개 로케일 전부 채울 것.

## 관련 파일

- `messages/ko.json`, `messages/en.json`, `messages/ja.json`, `messages/zh.json`
- `src/components/warehouse/UpsReceiveProcessForm.tsx:103`

## 예상 공수

Very Low (4개 JSON 파일에 키 1개씩 추가)

## 우선순위

Low — UX 결함, 기능 차단 아님
