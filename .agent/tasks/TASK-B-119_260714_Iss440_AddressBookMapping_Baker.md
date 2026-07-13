# TASK-B-119: Issue #440 (잔여) — 주소록 전체정보 저장/불러오기 매핑 오류 수정

| 메타 | 값 |
|:----|:----|
| **Issue** | [#440](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/440) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-14 |
| **상태** | 🔄 진행 중 |

## 작업 내용

### 변경 파일

#### 1. DB 마이그레이션: `supabase/migrations/20260714000000_iss440_address_book_detail.sql`
- `zen_address_book` 테이블에 `recipient_address_detail` 컬럼 추가

#### 2. 검증 스키마: `src/lib/validation/address-book.ts`
- `recipient_address_detail` 필드 추가

#### 3. 검증 스키마: `src/lib/validation/order.ts`
- `recipient_address_detail` 필드 추가 (orderRegistrationSchema)

#### 4. 서버 액션: `src/app/actions/operations/address-book.ts`
- `ADDRESS_BOOK_SELECT`에 `recipient_address_detail` 추가

#### 5. AddressInput: `src/components/common/AddressInput.tsx`
- `defaultValues` prop 변경 시 내부 상태 동기화 `useEffect` 추가
- 외부 `setValue()`로 갱신된 값이 화면에 반영되도록 수정

#### 6. OrderRegistrationForm: `src/components/orders/OrderRegistrationForm.tsx`
- `handleConfirmSaveAddressBook`: `country_code`, `recipient_address_detail` 저장 추가
- `AddressBookSelector onSelect`: `recipient_country_code`, `recipient_address_detail` setValue 추가
- `<AddressInput>`에 `defaultValues` prop 전달

#### 7. AddressBookSelector: `src/components/address-book/AddressBookSelector.tsx`
- `AddressBookEntry` 인터페이스에 `recipient_address_detail` 추가

## DoD

- [x] 빌드 PASS
- [x] 회귀 테스트 통과 (485/485)
- [ ] CI PASS 확인
- [x] E2E 스크린샷 검증
