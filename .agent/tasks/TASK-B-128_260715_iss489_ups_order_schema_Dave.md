# TASK-B-128: Issue #489 — UPS createorder payload 매핑 전면 결함 수정 (스키마+RPC+라벨매핑)

**담당**: Dave
**생성일**: 2026-07-15
**우선순위**: P1 (Critical)
**상태**: 🔔

---

## [설계 의견]

결함 4·5번(패키지 레벨 필드, invoice 실제 품목 매핑)은 후속 Task로 분리. 이번 Task는 A(스키마)+B(RPC)+C(라벨매핑)만 처리.

---

## [작업 결과]

### 변경 파일
1. `supabase/migrations/20260715000000_iss489_ups_order_schema_v5.sql` (신규)
   - A: zen_orders에 10컬럼 추가 (recipient_country_code/state/city, shipper_address/country_code/state/city/address_detail/zipcode/biz_no)
   - B: create_order_atomic RPC v5 — INSERT 목록에 신규 10컬럼 + ups_product_code/incoterms 통합 + cargo_details 하드코딩 유지(TODO 주석)
2. `src/app/actions/operations/ups-labels.ts` — shipper.* 하드코딩 제거 + consignee.* 필드 보강 + recipient_country_code 직접 사용
3. `src/app/actions/operations/orders.ts` — ups_product_code/incoterms 조건부 UPDATE 제거 (RPC v5로 통합)

### 검증
- **CI Regression Tests**: ✅ PASS (4m50s, headSha: `331fcd8f`)
- **Task File Check**: ✅ PASS
- **Vercel**: ✅ PASS

### 커밋
- `331fcd8f` — `[Dave] feat: TASK-B-128 Issue #489 — UPS 스키마+RPC v5+라벨매핑 전면 수정`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/490

---

## [DoD Checklist]

- [x] A: zen_orders 10컬럼 추가 마이그레이션
- [x] B: create_order_atomic RPC v5 (INSERT 통합 + cargo_details TODO)
- [x] C: placeShxkOrder 수정 (shipper* 실제 order 필드, consignee* 보강, recipient_country_code 사용)
- [x] orders.ts ups_product_code/incoterms 조건부 UPDATE 제거
- [x] CI 회귀 테스트 PASS 확인
- [x] task file + ACTIVE_TASK.md 반영
- [x] check-R17-DoD 전항목 통과

---

## [발견 이슈]

없음
