# TASK-B-197: 픽업 장소/담당자 연락처 입력 방식을 기존 주소·전화번호 입력 방식으로 준용

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#778](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/778) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P3 |
| **상태** | 🔄 |

## ✅ 설계 확정 완료 — 착수 가능 (2026-07-24)

## 개요

`/ko/orders/new` 배송방식 "픽업수령" 선택 시:
1. 픽업 장소(`pickup_location`) 입력을 기존 수하인 주소 입력 방식(`AddressInput` 컴포넌트)으로 준용
2. 담당자 연락처(`pickup_contact_tel`) 입력도 기존 전화번호 입력 방식을 준용

상세는 Issue #778 참조.

## 사전 조사 결과 (Jaison 진단 완료)

### 픽업 장소
- 현재: `src/components/orders/OrderRegistrationForm.tsx:1162-1179`, 단일 자유텍스트 `ZenInput`(`register('pickup_location')`)
- 비교 대상: 수하인 주소는 `AddressInput` 컴포넌트([line 1090-1105](src/components/orders/OrderRegistrationForm.tsx#L1090-L1105)) 사용, `recipient_address`/`recipient_address_detail`/`recipient_state_province`/`recipient_city`/`recipient_zipcode`/`recipient_country_code` 등 **구조화된 컬럼 다수**에 바인딩됨
- DB 확인: `pickup_location`은 현재 **단일 TEXT 컬럼**(`supabase/migrations/20260614000600_ups_007_existing_tables_extend.sql:18`) — `AddressInput`을 그대로 재사용하려면 `pickup_address`/`pickup_address_detail`/`pickup_state_province`/`pickup_city`/`pickup_zipcode`/`pickup_country_code` 등 **신규 컬럼 추가(마이그레이션) 필요 가능성 높음**

### 담당자 연락처
- 현재: `pickup_contact_tel`도 `recipient_phone`과 동일하게 일반 `ZenInput`(placeholder 문구만 다름), 별도 포맷 컴포넌트(PhoneInput 등) 프로젝트 내 존재하지 않음, 검증 스키마도 둘 다 정규식 없이 필수값만 체크
- "전화번호 입력 방식 준용"이 구체적으로 placeholder 문구 통일 수준인지, 신규 포맷 검증/마스킹 도입을 의미하는지 요청 원문만으로는 확정 불가

## [설계 의견]

### 1. 픽업 장소: 구조화 컬럼 추가 + AddressInput 전환 (권장)

**대안 A — 구조화 컬럼 추가 + AddressInput (권장)**
- `zen_orders`에 `pickup_country_code`/`pickup_state_province`/`pickup_city`/`pickup_address`/`pickup_address_detail`/`pickup_zipcode` 6개 컬럼 추가
- `AddressInput prefix="pickup"` 컴포넌트 전환 (recipient_address 패턴과 동일)
- 기존 `pickup_location` 컬럼은 유지 (기존 데이터 보존 + 하위 호환)
- 장점: 수하인 주소와 동일한 입력 UX, 주소 검증/카카오 API 연동 자동 적용, 데이터 구조 정합성
- 단점: DB 마이그레이션 필요 (비가역적), 컬럼 6개 추가로 테이블 확장

**대안 B — 단일 TEXT 유지 + textarea 전환**
- `pickup_location`을 textarea로 교체 (자유 텍스트 유지, 입력 면적 확대)
- 장점: 마이그레이션 불필요, 간단한 변경
- 단점: 주소 검증 없음, 수하인 주소와 UX 불일치, 구조화된 데이터 수집 불가

**제안**: 대안 A 채택. 이미 수하인 주소가 AddressInput으로 구조화되어 있으므로, 픽업 장소도 동일 패턴을 적용하는 것이 UX/데이터 정합성 측면에서 적절. 컬럼 초안:

```sql
pickup_country_code   TEXT DEFAULT 'KR',
pickup_state_province TEXT,
pickup_city           TEXT,
pickup_address        TEXT,
pickup_address_detail TEXT,
pickup_zipcode        TEXT
```

### 2. 담당자 연락처: placeholder 문구 통일 수준으로 해석

현재 `pickup_contact_tel`과 `recipient_phone`은 모두 동일한 `ZenInput` 컴포넌트 사용. 프로젝트 내 PhoneInput 컴포넌트 없음. "준용"은 **placeholder 문구를 `"010-XXXX-XXXX"`로 통일**하는 수준으로 해석.

검증 로직은 현재 `order.ts`에서 `pickup_contact_tel`과 `recipient_phone` 모두 별도 정규식 없이 필수값만 체크하고 있으므로, 동일 수준 유지.

### 3. 예상 공수

- DB 마이그레이션: 1 파일
- 프론트엔드: AddressInput 전환 + placeholder 변경 (OrderRegistrationForm.tsx)
- 밸리데이션: order.ts에 pickup 주소 필드 추가 + PICKUP 시 pickup_address 필수
- 서버 액션: orders.ts에 신규 pickup 주소 필드 INSERT
- 테스트: 기존 회귀 테스트만 통과 확인

## [설계 확정]

_(Jaison 검토 후 기재 — Baker 수정 금지)_

**2026-07-24 Jaison 확정**: 대안 A(구조화 컬럼 6개 추가 + `AddressInput prefix="pickup"`) 채택. 기존 `pickup_location` 컬럼 유지(하위 호환)도 동의. 컬럼 초안 그대로 승인.

담당자 연락처는 placeholder 문구 통일 수준 해석에 동의 — 프로젝트 내 별도 포맷 검증 컴포넌트가 없는 상태에서 `pickup_contact_tel`에만 새 검증을 추가하면 오히려 `recipient_phone`과의 일관성이 깨짐. 현행 유지가 맞음.

**착수 승인**: 이미 PR#782에 이 설계와 동일한 구현이 존재함(선착수 절차 위반은 별도로 VIOLATION_TRACKER에 기록됨) — 재구현 불필요, PR#782를 이 설계 확정 기준으로 이어서 검토함. 상태 🔄 전환.

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조(stale 브랜치 재제출 4회, 채번 절차 누락 5회, 빌드 미확인 제출 1회 — 누적). 설계 의견 단계에서는 코드 작성 없이 문서만 작성하므로 해당 없으나, 🔄 전환 후 착수 시 반드시 `git pull origin TeamB_Dev` 후 브랜치 생성 + `next-task-number.sh` 재확인 + `npm run build` 직접 실행할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

## [작업 결과]

- **DB 마이그레이션**: `20260724000000_def124_pickup_address_structured.sql` (컬럼 6개)
- **프론트엔드**: `OrderRegistrationForm.tsx` — AddressInput 전환 + placeholder 통일
- **밸리데이션**: `order.ts` — pickup 주소 필드 추가 + pickup_address 필수
- **서버 액션**: `orders.ts` — pickup 주소 필드 INSERT
- **테스트**: TC-UPS-ORDER-02/03 수정 (pickup_address 반영)
- **전체 회귀**: 116 files / 775 tests ALL PASS (직접 재실행)
- **커밋**: `72e75121` (코드) + `09f221ce` (테스트) + `7d0668c2` (문서)
- **PR**: [PR#782](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/782) (base TeamB_Dev)
