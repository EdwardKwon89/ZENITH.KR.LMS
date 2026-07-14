# TASK-B-122: Issue #462 — 주소록 전체 필드 저장/불러오기 + UPS transport_mode 드리프트

| 메타 | 값 |
|:----|:----|
| **Issue** | [#462](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/462) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-14 |
| **상태** | 🔔 완료 보고 |

## 작업 내용

### 변경 파일 (7건)

#### 1. DB 마이그레이션: `supabase/migrations/20260714000002_iss462_address_book_fullfields.sql`
- `zen_address_book`에 `state_province`, `city`, `zipcode`, `recipient_pccc` 컬럼 추가

#### 2. 검증 스키마: `src/lib/validation/address-book.ts`
- 4개 필드 추가

#### 3. 검증 스키마: `src/lib/validation/order.ts`
- `recipient_state_province`, `recipient_city` 추가

#### 4. 서버 액션: `src/app/actions/operations/address-book.ts`
- SELECT에 4개 필드 추가

#### 5. AddressBookSelector: `src/components/address-book/AddressBookSelector.tsx`
- 인터페이스에 4개 필드 추가

#### 6. OrderRegistrationForm: `src/components/orders/OrderRegistrationForm.tsx`
- `handleConfirmSaveAddressBook`: state_province, city, zipcode, pccc 저장
- `AddressBookSelector onSelect`: 4개 필드 매핑 추가
- `<AddressInput defaultValues>`: state_province, city 추가

### UPS transport_mode 드리프트
- 코드 수정 불필요 (마이그레이션은 이미 존재: `20260708000300_ord_002_ups_transport_mode.sql`)
- 로컬 DB 동기화 문제였음

## 작업 결과

| 항목 | 결과 |
|:-----|:-----|
| 빌드 | PASS |
| 회귀 테스트 | 81/81, 485/485 ALL PASS |
| CI (Regression Tests) | ✅ SUCCESS (run #29337529614) |
| 마이그레이션 적용 (CI) | ✅ `Apply migrations & seed` PASS |
| 마이그레이션 타임스탬프 | `20260714000002` (충돌 없음) |
| E2E 스크린샷 | ✅ 오더 등록 폼 + 주소록 선택기 확인 |
| 코드 커밋 | `574e46ed` |
| 문서 커밋 | `0d4fb582` |

## 발견 이슈

없음.

## DoD

- [x] 빌드 PASS
- [x] 회귀 테스트 통과 (485/485)
- [x] CI PASS 확인 (run #29337529614, headSha 일치)
- [x] E2E 스크린샷
