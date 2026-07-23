# TASK-B-195: Issue #778 — 픽업 주소 구조화 (AddressInput 전환)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#778](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/778) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P3 |
| **상태** | 🔔 |

## 변경 요약

- **DB 마이그레이션**: zen_orders에 pickup_country_code/state_province/city/address/address_detail/zipcode 컬럼 추가
- **프론트엔드**: pickup_location ZenInput → AddressInput 전환 (recipient_address 패턴 준용), pickup_contact_tel placeholder 통일
- **밸리데이션**: pickup 주소 필드 추가 + PICKUP 시 pickup_address 필수 검증
- **서버 액션**: 신규 pickup 주소 필드 INSERT 포함

## 검증

- 116 files / 775 tests ALL PASS
- 빌드: PASS

## 커밋

- `72e75121`

## PR

- [PR#782](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/782) (base TeamB_Dev)
