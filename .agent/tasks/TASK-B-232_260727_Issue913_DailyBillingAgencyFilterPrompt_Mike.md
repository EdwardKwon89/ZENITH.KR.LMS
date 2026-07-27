# TASK-B-232: Issue #913 — daily-billing AGENCY 앱 레벨 필터 보강 + 일괄마감 모달 전환

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#913](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/913) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P3 |
| **상태** | 🔔 |

## 작업 결과

### 변경 내용

#### 백엔드: `src/app/actions/finance/daily-billing.ts`
- `getShipperDailyBillingSummary()`: AGENCY 역할 시 `zen_agency_shippers` 조회 → `.in("shipper_id", shipperIds)` 필터 추가
- `getShipperDailyOrdersDetails()`: AGENCY 역할 시 `zen_agency_shippers` 조회 → 허용된 shipperId 검증

#### 프론트엔드: `src/components/finance/ShipperDailyBillingClient.tsx`
- `window.prompt()` → ZenCard 기반 인라인 모달 (사유 입력 + 확인/취소)

### 테스트
- AGENCY 필터: `zen_agency_shippers` 조회 + `.in()` 호출 검증 3건

### 검증
- **빌드**: ✅ PASS
- **테스트**: `daily-billing-aggregation.test.ts` 14/14 PASS
- **회귀**: 137/137 파일, 920/920 테스트 ALL PASS
- **커밋 해시**: `0f9f0b13`
