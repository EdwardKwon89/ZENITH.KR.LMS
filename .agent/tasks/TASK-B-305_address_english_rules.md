# TASK-B-305: 영문 주소 출력 규칙 통일

## 기본 정보
- **이슈**: #1133
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:fix)
- **착수일**: 2026-08-16

## 목표
화주/수하인 주소 영문 우선 표출 + 상세주소 영문전용 입력 통일

## DoD (Definition of Done)
- [ ] `recipient_address_detail` DB 컬럼 추가 마이그레이션 완료
- [ ] `createOrder()`/`updateOrder()`에 `recipient_address_detail` 저장 로직 추가
- [ ] `AddressInput.tsx` — 화주/수하인 프리픽스에서 `address_detail` 입력을 영문 전용으로 검증
- [ ] 영문 우선 표출 유틸(`resolveEnglishAddress`) 생성 및 적용
- [ ] CI/PL/UPS Invoice 주소 조합에 city/state/zipcode/country 포함
- [ ] 회귀 테스트 PASS
- [ ] R-10 스크린샷 첨부

## 작업 범위
1. **DB 마이그레이션**: `recipient_address_detail` 컬럼 추가 (DEF-B-134)
2. **서버 액션**: `createOrder()`/`updateOrder()`에 저장 로직 추가
3. **AddressInput.tsx**: 화주/수하인 `address_detail` 영문 전용 검증 (정규식)
4. **영문 우선 표출 유틸**: `resolveEnglishAddress` 함수 생성
5. **적용처**: 
   - `ups-detail/page.tsx`
   - `orders/[orderId]/page.tsx` (CI/PL/UPS Invoice)
   - `TradeDocumentClient.tsx` (CI/PL)

## 설계 확정 (JSJung 승인)
- 적용 범위: 전체 통일
- 상세주소 입력: 화주+수하인의 `address_detail`을 영문 전용으로 검증
- 폴백: 영문 필드 공란 시 한글 원본 자동 대체 표출

## 발견 이슈
없음

## 작업 결과

### 완료 항목 (반려 사유 수정)
1. ✅ **새 마이그레이션 파일 생성** (기존 마이그레이션 수정 금지)
   - 파일: `supabase/migrations/20260816110000_task_b305_create_order_atomic_v6.sql`
   - `create_order_atomic` RPC 함수를 `CREATE OR REPLACE`로 전체 재정의
   - recipient_address_detail 컬럼 INSERT에 포함

2. ✅ **화주 주소 영문 우선 표출 적용** (resolveShipperStreet)
   - 적용: `ups-detail/page.tsx`, `orders/[orderId]/page.tsx`, `TradeDocumentClient.tsx`
   - shipper + consignee 양쪽 모두 영문 우선 표출

3. ✅ **address_detail_english 필드 자동 반영 로직 추가**
   - 파일: `src/components/common/AddressInput.tsx`
   - 화주 상세주소 입력 시 `shipper_address_detail_english`에도 동일 반영

4. ✅ **신규 회귀 테스트 추가** (R-09)
   - 파일: `tests/unit/logistics/address-english-display.test.ts`
   - `resolveConsigneeStreet()`, `resolveShipperStreet()`, 영문 전용 검증 정규식 테스트

5. ✅ **CI/PL/UPS Invoice 주소에 city/state/zipcode/country 포함**
   - shipper + consignee 양쪽 모두 적용
   - PDF 컴포넌트 타입 업데이트: `CommercialInvoicePDF.tsx`, `PackingListPDF.tsx`

### 테스트 결과
- **회귀 테스트**: 201 test files, 1392 tests **ALL PASS** (신규 15건 추가)
- **빌드**: TypeScript compilation **SUCCESS**

## 커밋 이력
- 커밋 해시: `47628357`
- 브랜치: `feature/teamb-305-address-english-rules-mike`
- 메시지: `[Mike] fix: TASK-B-305 영문 주소 출력 규칙 통일 — 반려 사유 4건 수정 완료`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1134
