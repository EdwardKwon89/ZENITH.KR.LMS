# TASK-B-197: 픽업 장소/담당자 연락처 입력 방식을 기존 주소·전화번호 입력 방식으로 준용

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#778](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/778) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-24 |
| **우선순위** | P3 |
| **상태** | 📝 |

## ⚠️ 착수 금지 — 설계 확정 대기 중

본 Task는 구현 방향에 실제 대안이 존재해 R-17 📝→🔍→🔄 절차를 따른다. 아래 `[설계 의견]` 섹션을 작성해 Jaison 확인을 받은 후 🔄 전환 시점부터 코드 작성을 시작할 것.

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

_(Baker 작성 — 착수 전 필수)_

아래 항목 포함해 작성:
1. 픽업 장소: 신규 컬럼 추가(마이그레이션) 후 `AddressInput prefix="pickup"` 방식으로 갈지, 혹은 단일 TEXT 컬럼을 유지하면서 다른 방식으로 "준용"할지 — 대안별 장단점·예상 공수
2. 담당자 연락처: 정확히 어떤 수준의 "준용"이 필요한지에 대한 해석(placeholder 통일만 할지, 검증 로직 추가할지) 및 제안
3. 마이그레이션이 필요하다고 판단될 경우 컬럼명·타입 초안

## [설계 확정]

_(Jaison 검토 후 기재 — Baker 수정 금지)_

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조(stale 브랜치 재제출 4회, 채번 절차 누락 5회, 빌드 미확인 제출 1회 — 누적). 설계 의견 단계에서는 코드 작성 없이 문서만 작성하므로 해당 없으나, 🔄 전환 후 착수 시 반드시 `git pull origin TeamB_Dev` 후 브랜치 생성 + `next-task-number.sh` 재확인 + `npm run build` 직접 실행할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
