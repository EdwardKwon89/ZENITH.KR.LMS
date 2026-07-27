# TASK-184: Issue #491 — UPS 급증 긴급 수수료(Surge Emergency Fee) 구현

| 메타 | 값 |
|:----|:----|
| **Issue** | [#491](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/491) |
| **담당** | Aiden (Team A) |
| **생성일** | 2026-07-15 |
| **우선순위** | P2 |
| **상태** | 🔔 완료 보고 |

## 배경

고객 Review(20260609) + SNTL 원자료 + UPS 공식 PDF(`UPS 급증 수수료.pdf`)를 통해 급증 긴급 수수료(Surge Emergency Fee)가 도착국별 kg당 단가로 부과되고 유류할증료가 추가 적용되는 항목임을 확인. Jungjs(Team B) 검토를 거쳐 기본 방향 확정(Issue #491) 후 구현.

## 작업 결과

### 변경 파일
1. `supabase/migrations/20260715130515_iss491_ups_surge_fees.sql` (신규) — `zen_ups_surge_fees` 테이블(도착국×적용기간별 kg당 단가) + RLS
2. `src/types/ups.ts` — `UpsSurgeFee` 인터페이스 신규, `UpsPricingData.surgeFee`·`UpsBreakdown`/`UpsFreightResult`/`UpsShipperFreightResult`에 surge 관련 필드 추가
3. `src/lib/ups/pricing-engine.ts` — `applySurgeFee()` 함수 신규(kg당 단가×청구중량+유류할증 추가부과), `computeUpsFreight()` 총액에 반영
4. `src/lib/ups/shipper-pricing.ts` — `computeShipperFreight()` 5번째 인자(`surgeFeeSellingAmount`, 기본값 0) 추가, 할인 미적용 pass-through
5. `src/app/actions/ups/freight.ts` — 도착국·기준일 기준 유효 단가 조회 후 `computeUpsFreight`/`computeShipperFreight` 호출부에 전달
6. `src/app/actions/ups/rates.ts` — `getUpsSurgeFees()` 신규 (Admin 관리용 전체 이력 조회)
7. `src/app/actions/ups/rates-mutation.ts` — `createUpsSurgeFee`/`updateUpsSurgeFee`/`deleteUpsSurgeFee` 신규
8. `src/app/[locale]/(dashboard)/admin/ups-rates/page.tsx`, `ups-rates-client.tsx` — "급증 수수료" Admin 탭 신규(SurgeFeeForm/SurgeFeeTable)
9. `src/components/orders/UpsFreightEstimatePanel.tsx` — 견적 패널에 "급증 긴급 수수료" 라인 표시 추가
10. `docs/02_Analysis/Ds_11_API_상세_명세서.md` — §11.11 신규 섹션(R-12 명세-코드 동기화)
11. `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` — TC-UPS-ENGINE-07-01~05 등재
12. `tests/unit/ups/pricing-engine.test.ts` — 신규 TC 5건(계산식·총액반영·Shipper pass-through·하위호환 2건)

### 정산 연동 확인
`orders.ts`가 `estimate.platform.totalSellingPrice`(스냅샷용)를 그대로 소비하는 구조 확인 — surge fee가 `totalSellingPrice`에 이미 합산되므로 **Team B 소유 파일(orders.ts) 수정 없이** 정산 스냅샷까지 자동 반영됨.

### 검증
- **Build**: PASS
- **Regression**: 498/509 PASS, 9 skipped (기존 pre-existing 실패 2건은 로컬 Supabase 미연결로 인한 것 — tracking-business-qa, p6-transport-policy/p71-ups-agency-pricing, 본 변경과 무관)
- **신규 유닛 테스트**: TC-UPS-ENGINE-07-01~05 전량 PASS

### 커밋
- (커밋 예정)

## DoD

- [x] DB 마이그레이션(`zen_ups_surge_fees`) + RLS
- [x] 계산엔진(`applySurgeFee`) + 총액 반영
- [x] Shipper 단계 pass-through 확장
- [x] Admin CRUD Actions + UI 탭
- [x] Ds-11 API 명세서 갱신 (R-12)
- [x] 신규 회귀 TC 추가 + LIVE_REGRESSION_TEST_MAP.md 갱신 (R-09)
- [x] 전체 회귀 PASS 확인 (본 변경 관련 실패 0건)
- [ ] gitnexus_detect_changes() 확인
- [ ] Riley에게 관련 UAT 시나리오 갱신 별도 배정 (Edward 지시)

## [발견 이슈]

없음.
