# DEF-B-054 — SHXK createorder 발송인 회사명(shipper_company) 필드 미전달, FXUPS 경로 실패

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — MASTER AIR 계정으로 실제 UPS 오더 createorder 시도, "방금 createorder가 실패했어" 보고 |
| **긴급도** | Medium — 특정 SHXK `shipping_method`(`FXUPS`)에서만 발현 확인, 이전 세션 `PK0035`에서는 미발현. 발현 범위 미확정 |
| **현재 상태** | 원인 확정, 미수정 |

## 근본 원인 (확정)

`zen_shxk_api_logs` 조회 결과, `createorder` 호출이 SHXK 서버로부터 실패 응답을 받음:
```json
{ "success": 0, "cnmessage": "发件人公司不能为空", "enmessage": "发件人公司不能为空" }
```
"발송인 회사명이 비어있을 수 없습니다" — `shipping_method: "FXUPS"`(이번 오더가 사용한 SHXK 코드, 이전 성공 사례들은 `PK0035` 사용).

**2곳 모두 미비**:
1. `src/app/actions/operations/ups-labels.ts:117-124`의 `lookupOrderPackages()` — `zen_orders` 조회 시 `shipper_org:zen_organizations!shipper_id(...)` join에 `name`(조직명/회사명) 컬럼이 select 목록에서 빠짐(`address/address_detail/.../zipcode`만 포함).
2. `src/lib/ups/label-mapping.ts:88-96`의 `buildCreateOrderPayload()` — `shipper` 객체에 `shipper_company` 키 자체가 아예 없음(어떤 소스로도 채워지지 않음).

`docs/80_RawData/Phase8_UPS_API_리서치_결과.md:117`에 `shipper.shipper_company`가 필드로 문서화되어 있으나 **필수 표시가 없음(공란)** — 그러나 실제 SHXK 서버는 최소 `FXUPS` 경로에서 이를 필수로 검증함. DEF-103~107/DEF-118 계열과 동일 패턴(정적 스펙 문서와 실제 서버 검증 차이, `shipping_method`별로 다를 수 있음).

## 수정 방향 (제안)

1. `lookupOrderPackages()`의 `shipper_org` select에 `name` 추가
2. `buildCreateOrderPayload()`의 `shipper` 객체에 `shipper_company: (order.shipper_org as any)?.name || shipperDefaults.name || ''` 추가(정확한 폴백 순서는 구현자가 기존 `shipper_name`/`shipperDefaults` 패턴 참고해 결정)
3. **주의**: SHXK는 한 번에 하나의 검증 에러만 반환하는 경향이 이번 세션 내내 확인됨(TASK-B-277의 `recipient_zipcode` 사례와 동일) — 이 필드를 채운 뒤 재시도 시 또 다른 필드 누락이 새로 드러날 수 있음. 수정 후 반드시 실제(mock 아닌) `FXUPS` 경로로 재현 테스트 필요.

## 회귀 테스트 요구사항

- `buildCreateOrderPayload()` 단위 테스트에 `shipper_company` 값이 정확히 전달되는지 검증 추가(기존 `label-mapping.test.ts` 계열이 있다면 그쪽에)
- `lookupOrderPackages()`의 select 문에 `name`이 포함되는지 확인하는 테스트(가능하다면)
- 이번 Task 범위: `shipper_company`만 — 다른 잠재적 필드 누락은 재현 시 별도 DEF로
