# TASK-B-289 — DEF-B-059 오더 화주 주소 영문 컬럼 추가

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-B-289 |
| Issue-ID | #1079 / DEF-B-059 |
| 생성일 | 2026-08-12 |
| 담당 Agent | Mike (MiMo V2.5) |
| 우선순위 | High (P1) |
| 상태 | ✅ 완료 |

---

## 배경

JSJung — UPS 등록 시 화주 주소가 한글로 전달되어 라벨 표출이 깨진다고 보고

---

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:----------|
| `20260812010000_iss1079_shipper_address_english_columns.sql` | 신규: zen_orders에 영문 주소 컬럼 추가 |
| `src/lib/validation/order.ts` | shipper_address_english, shipper_address_detail_english 필드 추가 |
| `src/app/actions/operations/orders.ts` | createOrder/updateOrder에 필드 포함 |
| `src/lib/ups/label-mapping.ts` | resolveShipperStreet() 폴백 우선순위 수정 |
| `tests/unit/ups/shipper-address-english.test.ts` | 회귀 테스트 9개 |

---

## [작업 결과]

**커밋**: `60d46b04` — `[Mike] fix: DEF-B-059 오더 화주 주소 영문 컬럼 추가 (Issue #1079)`

**PR**: #1081 (TeamB_Dev base) — https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1081

**변경 내용**:
- zen_orders에 shipper_address_english, shipper_address_detail_english 컬럼 추가
- orderRegistrationSchema에 필드 추가
- createOrder/updateOrder에 필드 포함
- resolveShipperStreet() 폴백 우선순위 수정 (order-level english 우선)

**회귀 테스트 9개**:
- resolveShipperStreet 실제 함수 검증 (5건)
- 되돌리기 검증 (2건)
- 마이그레이션 SQL 검증 (2건)

**검증**: TypeScript 타입 체크 통과, 핵심 단위 테스트 53개 + 회귀 테스트 9개 전부 통과
