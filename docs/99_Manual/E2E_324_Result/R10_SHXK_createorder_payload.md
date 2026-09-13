# TASK-B-324 / Issue #1190 — R-10 검증 증적: SHXK createorder payload 화주명 수기입력 반영

- **검증일:** 2026-09-13
- **담당:** Dave (Team B)
- **결함:** DEF-B-144 — 오더 화주명 수기입력값이 SHXK(UPS) 실제 배송 등록에 미반영

## 검증 방법 (실제 UI 경로)

| 단계 | 내용 | 증적 |
| :--- | :--- | :--- |
| 1 | `admin@zenith.kr`(ADMIN, PLATFORM)로 로그인 | 로그: `logged in: http://localhost:3000/ko/orders` |
| 2 | 오더 수정 화면에서 "수기입력" 모드 진입 → 화주명 입력 UI 확인 | `01-order-edit-manual-shipper-name.png` |
| 3 | 대상 오더 `ZEN-2026-000007` — 조직명(`zen_organizations.name`) = `Master Air`, 수기입력 화주명(`zen_orders.shipper_name`) = `Test Shipper XYZ` | DB fixture |
| 4 | `/ko/warehouse/ups-receive`에서 해당 오더 선택 → **UPS 등록 확정** 클릭 | `03-ups-receive-selected.png` |
| 5 | 서버 액션 체인: `confirmUpsRegistration` → `registerUpsOrder` → `buildCreateOrderPayload` → `createorder`(SHXK, `SHXK_TEST_MOCK=true`) | `04-ups-receive-after-confirm.png` |
| 6 | 오더 상태 `WAREHOUSED` → `PACKED`, "오늘의 UPS 접수 이력"에 표시 | `04-ups-receive-after-confirm.png` |

> 화주명(`shipper_name`) fixture는 로컬 DB에 직접 세팅했다. **폼 → DB 저장 경로는 TASK-B-295(Issue #1100)에서 이미 검증 완료**된 범위이며, 본 결함/수정은 그 이후 단계인 `buildCreateOrderPayload()`가 `order.shipper_name`을 읽지 않는 문제다. 따라서 본 R-10은 수정이 실제로 고치는 경로(등록 UI → createorder payload 생성·전송)를 그대로 통과시켜 검증했다.

## 실제로 SHXK로 전송된 payload (`zen_shxk_api_logs`)

`method = createorder`, `reference_no = ZEN2026000007`, `success = true`, `is_mock = true`

```json
{
  "shipper": {
    "shipper_name": "James",
    "shipper_company": "Test Shipper XYZ",
    "shipper_countrycode": "KR",
    "shipper_province": "11",
    "shipper_city": "Gangseo-gu",
    "shipper_street": "461-5 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea",
    "shipper_postcode": "07570",
    "shipper_telephone": "010-1234-5678"
  },
  "consignee": {
    "consignee_name": "james bonds",
    "consignee_countrycode": "SG",
    "consignee_province": "03",
    "consignee_city": "Woodlands",
    "consignee_street": "it venture tower",
    "consignee_postcode": "02750",
    "consignee_telephone": "+8639383020288",
    "consignee_email": "jungjs72@gmail.com",
    "consignee_tariff": "P393920202"
  },
  "reference_no": "ZEN2026000007",
  "shipping_method": "PK0035",
  "order_status": "P",
  "order_pieces": 2,
  "order_weight": 2.55,
  "cargotype": "W",
  "mail_cargo_type": "4"
}
```

## 판정

- ✅ `shipper.shipper_company` = **`Test Shipper XYZ`** (수기입력 오버라이드 값) — 조직명 `Master Air`가 아님.
  - 수정 전이라면 `shipper_company`가 조직명 `Master Air`로 나갔을 값이다(단위 테스트 되돌리기 검증에서 재현 확인).
- ✅ `shipper.shipper_name`(담당자명) = `James` — 수기입력 화주명에 의해 오염되지 않음(이번 수정 대상 아님).
- ✅ 실제 배송 등록 경로(`registerUpsOrder`)와 미리보기 경로(`previewShxkPayload`) 모두 `buildCreateOrderPayload()`를 통과하므로 동일하게 반영된다.
