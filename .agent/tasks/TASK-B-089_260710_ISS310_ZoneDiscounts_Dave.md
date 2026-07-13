# TASK-B-086: Issue #310 Zone별 할인율 체계 전환

**담당:** Dave (D_Kai → 사용자 지적으로 Dave 정정)
**생성일:** 2026-07-10
**상태:** ✅ 완료

## 개요
`zen_agency_rate_overrides` 폐기하고 Zone별 할인율 체계로 전환.

## 변경 사항

### DB 마이그레이션
- `zen_agency_pricing_policies`: `zone_id` 추가, `UNIQUE(agency_org_id,zone_id)`
- `zen_agency_shipper_zone_discounts` 신규 (화주 Zone별 할인율)
- `zen_agency_rate_overrides` 테이블/트리거/함수 완전 삭제
- 기존 단일 할인율 → 전체 Zone 자동 복제

### 코드
- `agency-pricing.ts`: override 로직 제거, 순수 할인율 계산
- `shipper-pricing.ts`: `platformSellingPrice` 직접 계산 (Agency 경유 안 함)
- `freight.ts`: Zone별 조회, shipper 직접 계산
- `rates-mutation.ts`: `upsertAgencyPricingPolicy` zone_id 파라미터
- Admin UPS 요율 페이지: Agency Policy Zone 매트릭스 UI
- `rate-overrides.ts` Server Actions + UI 8개 파일 삭제
- i18n 키, NaviSidebar 링크 제거

### 테스트 정합
- `freight-actions.test.ts`: rate_overrides 참조 제거, Zone별 mock으로 변경
- `pricing-engine-tier-dwb.test.ts`: DWB/freightMinApplied 필드 제거
- `pricing-engine.test.ts`: source 필드 제거, agencySellingPrice 정정

## 검증
- **492/492 ALL PASS** ✅
- TypeScript `src/` 에러 0건

## 반려 수정 (Jaison, 2026-07-10)
### 1차
1. ✅ 커밋 태그 `[D_Kai]` → `[Dave]` 수정 완료
2. ✅ Task 번호 `TASK-310` → `TASK-B-086` 수정 완료
3. ✅ 브랜치 오염 → `develop`에서 fresh branch 재생성 완료
4. ✅ `agency/ups-rates.ts`, `shipper/ups-rates.ts`: Baker PR#309 커밋으로 develop에 존재하지 않아 자연 제외됨
5. ✅ `.agent/LAST_REGRESSION_RESULT` → PASS로 갱신

### 2차
1. ✅ `tests/integration/p71-ups-agency-pricing.test.ts`: rate_overrides 테스트(AGPOL-01/02/03/05) 삭제, Zone별 할인율 테스트(AGPOL-06) 신규
2. ✅ 커밋 메시지 `TASK-B-310` → `TASK-B-086` rebase 정정
3. ✅ DB migration local DB 직접 적용 완료
4. ✅ Local 회귀: **81 files, 489/489 ALL PASS** ✅
5. ⏳ CI 검증 대기 (PR#314 checks)

## 최종 결과
- **Local: 489/489 ALL PASS** ✅
- **PR:** https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/314
- **상태:** Jaison 2차 재검토 대기 (🔔)
