# DEF-B-055 — SHXK createorder 수취인 도시(consignee_city) 필드 미검증

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — MASTER AIR 계정으로 실제 UPS createorder 시도, "또 UPS등록 실패했어" 보고 |
| **긴급도** | High — 실사용자 UPS 등록이 반복적으로 막힘(DEF-B-054에 이은 3번째 연속 SHXK 필수항목 실패) |
| **현재 상태** | 원인 확정, 미수정 |

## 근본 원인

`zen_shxk_api_logs` 확인 결과 SHXK `createorder` 실패:
```json
{ "success": 0, "cnmessage": "收件人城市不能为空", "enmessage": "收件人城市不能为空" }
```
"수취인 도시가 비어있을 수 없습니다" — 실제 request_params에 `"consignee_city": ""`(빈 문자열)로 전송됨. `shipper_company`는 이전 TASK-B-282 수정이 정상 반영되어 "MASTER AIR"로 확인됨(연쇄 실패 아님, 별개 필드 갭).

**2곳 모두 미비**:
1. `src/lib/validation/order.ts:67` — `recipient_city: z.string().optional()`, TASK-B-277(Issue #1052)의 UPS 조건부 필수 블록(`recipient_country_code`/`recipient_zipcode`/`shipper_contact_phone`)에 `recipient_city`가 포함되지 않음. 당시 분석에서 "consignee_province/city/district — 조건부(국가별)"로 명시적으로 범위 밖 처리했던 항목(TASK-B-277 task file 49행 참고)이 이번에 실제로 발현됨.
2. `src/lib/shxk/validate-payload.ts` — `validateShxkPayload()`의 consignee 체크 목록(name/countrycode/street/postcode/telephone)에 `consignee_city`가 빠져있음.

## 참고 — City 입력 UI 자체의 한계와는 별개 이슈

이번 세션에서 별도로 논의된 대로, 중국 성 선택 시 City select 옵션이 `country-state-city` 라이브러리 한계로 매우 부실합니다(상하이는 4개뿐: Shanghai/Songjiang/Zhabei/Zhujiajiao). 이 갭은 "필수 검증이 없어서 빈 값으로 제출 가능했다"는 게 근본 원인이며, City select 옵션 부실 문제 자체는 사용자 결정으로 현행 유지(수정 안 함)로 이미 정리됨 — 이번 DEF는 **검증 부재**만 다룬다. "Shanghai"가 select 옵션에 실제로 존재하므로, 필수화만 해도 사용자가 선택 가능.

## 수정 방향 (제안)

TASK-B-277과 동일 패턴:
1. `order.ts`의 `transport_mode === 'UPS'` 조건부 필수 블록에 `recipient_city` 추가
2. `validateShxkPayload()`의 consignee 체크에 `consignee_city` 추가

## 회귀 테스트 요구사항

- UPS + `recipient_city` 누락 → 폼 검증 실패 확인(TASK-B-277 패턴과 동일)
- 비UPS 오더는 여전히 `recipient_city` 없어도 통과(회귀 방지)
- `validateShxkPayload()`에 `consignee_city` 누락 케이스 테스트 추가
- 되돌리기 검증 필수
