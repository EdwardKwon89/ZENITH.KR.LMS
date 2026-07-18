# TASK-B-164: DEF-109 오더 수정 페이지 신설 + updateOrder 필드 보완

## 메타 정보
| 항목 | 내용 |
|:-----|:------|
| **Task ID** | TASK-B-164 |
| **생성일** | 2026-07-18 |
| **담당 Agent** | Dave |
| **GitHub Issue** | [#587](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/587) |
| **원인 DEF** | DEF-109 |
| **브랜치** | `feature/teamb-def109-order-edit-page` |
| **PR** | [#593](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/593) |

## 업무 개요
`updateOrder()` Server Action은 존재하나 호출 UI가 없음. 오더 수정 페이지를 신규 생성하고, `updateOrder`의 미비된 필드를 보완.

## 수정 파일

| 파일 | 변경 유형 | 설명 |
|:-----|:---------|:------|
| `src/app/actions/operations/orders.ts` | 수정 | `updateOrder()` `updateHeader` 호출에 14개 필드(shipper_address, shipper_country_code, shipper_state_province, shipper_city, shipper_address_detail, shipper_zipcode, shipper_biz_no, recipient_country_code, recipient_state_province, recipient_city, recipient_address_local, ups_product_code, incoterms, ups_service_family) 추가 |
| `src/components/orders/OrderRegistrationForm.tsx` | 수정 | `orderId`·`defaultValues` props 추가, edit 모드 시 `updateOrder` 호출, `success_update` 번역키 사용 |
| `src/app/[locale]/(dashboard)/orders/[orderId]/edit/page.tsx` | **신규** | 오더 수정 페이지 — `getOrderDetails`로 기존 데이터 조회, `isOrderEditable` 가드, `OrderRegistrationForm`에 `defaultValues` 주입 |
| `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx` | 수정 | `isOrderEditable` true 시 "Edit" 버튼 노출 |
| `messages/en.json` | 수정 | `success_update`, `title_edit` 번역키 추가 |
| `messages/ko.json` | 수정 | `success_update`, `title_edit` 번역키 추가 |
| `tests/unit/logistics/order-update.test.ts` | **신규** | updateOrder 가드 테스트 + isOrderEditable 검증 (4 tests) |

## [작업 결과]

### 코드 커밋
- 코드 커밋 해시: `187c67ff`
- 문서 커밋 해시: (push 후 기재)

### 검증 결과
- 빌드: `npm run build` ✅ PASS
- 회귀 테스트: `npm run test:regression` ✅ 96 test files · 619 tests ALL PASS
- 신규 테스트: 4/4 PASS (TC-UPDATE-01 · TC-EDIT-PAGE-01/02/03)
- CI (PR #593): 아직 완료 전 - push 후 확인 예정

### 설계 결정
- `OrderRegistrationForm`은 기존 3-step wizard 구조를 유지, edit 모드에서는 `orderId` prop이 있을 때 `updateOrder` 호출로 분기
- 수정 페이지에서 서비스 선택(step 2) 및 요율 확인(step 3)은 기존 로직 유지 — 사용자가 필요 시 변경 가능
- `isOrderEditable`은 REGISTERED, SCHEDULED 상태만 허용 (기존 로직)

## [발견 이슈]
없음
