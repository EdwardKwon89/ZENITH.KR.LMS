# TASK-B-086: ISS#305 Agency 원가 조회 + 화주 UPS 운임조회

- **발령**: Jaison (Team B 총괄) · 2026-07-10
- **담당**: Baker
- **PR**: #299
- **브랜치**: `feature/teamb-issue-305-ups-rate-inquiry`

---

## 작업 내역

### REQ-A | Agency 원가 조회 (`/agency/ups-rates`)

- Server action `getAgencyUpsRatesData()` — base rates + weight tier rates + discount rate 통합 조회
- Client page with 4 tabs: Base Rates / Weight Tier Rates / Fuel Surcharge / Other Charges
- Base Rates: Zone×Product×Weight 매트릭스, Platform Selling 대비 Agency Cost(discount 적용) 표시
- 필터: Zone / Product / 텍스트 검색

### REQ-B | Agency 유류할증료·부가요금 조회

- Fuel Surcharge 탭: effective_week, selling_rate, cost_rate 표시
- Other Charges 탭: platform selling/cost price 표시, `/agency/other-charges` 링크

### REQ-C | 화주(AGENCY_SHIPPER) UPS 운임조회 (`/ups-rates`)

- Server action `getShipperUpsRatesData()` — `computeShipperFreight()`로 최종 운임 계산
- Zone/Product 필터 + 검색
- Platform Selling Price + Final Freight(할인 적용) 표시 — 원가/할인율 미노출

### REQ-D | 화주 유류할증료·부가요금 조회

- Fuel Surcharge / Other Charges 정보는 추후 `/ups-rates` 탭 확장 (현재 base rates 우선)

### 공통
- NaviSidebar: Agency 하위 "UPS 요율 조회" + UPS 그룹 하위 "UPS 운임 조회" 추가
- i18n: en/ko nav 키 추가
- RBAC: AGENCY → `/agency`, AGENCY_SHIPPER → `/ups-rates` (기존 권한 활용)

---

## 검증 결과

- `npm run build`: ✅ PASS
- `npm run test:regression`: ✅ 81/81 files, 493/493 tests PASS
