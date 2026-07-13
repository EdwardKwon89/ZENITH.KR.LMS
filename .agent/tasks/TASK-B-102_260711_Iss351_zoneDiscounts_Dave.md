# TASK-B-102: Issue #351 — Agency → 화주 Zone별 할인율 설정 기능 신설

| 메타 | 값 |
|:----|:----|
| **Issue** | [#351](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/351) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-11 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. 신규: `src/app/actions/agency/zone-discounts.ts`
- `getShipperZoneDiscounts(shipperOrgId)` — 기존 zone별 할인율 조회
- `upsertShipperZoneDiscounts(shipperOrgId, zoneRates)` — zone별 할인율 일괄 저장 (onConflict: agency_org_id,shipper_org_id,zone_id)

#### 2. 신규: `zone-discount-form.tsx` (edit 페이지)
- AgencyPolicyForm과 동일 UX의 Zone matrix UI (2열 그리드)
- 법인 화주(CORPORATE)만 표시
- 부피중량 기준값 설정 UI 미포함

#### 3. 수정: `required-fields.tsx` / `shipper-form.tsx`
- 단일 할인율(discount_rate) 입력 필드 제거
- FormValues 인터페이스에서 discount_rate 제거

#### 4. 수정: `edit-form.tsx` / `page.tsx`
- 단일 할인율 입력 필드 제거
- ZoneDiscountForm 추가 (법인 화주만 표시)
- Server-side에서 UpsZones fetch → EditShipperForm에 전달

#### 5. 화면 높이 최적화
- 필드 제거에 따른 레이아웃 자동 정리 (불필요 여백 제거)

### 검증
- **build PASS** ✅

### 커밋
- `커밋해시` — `[Dave] feat: TASK-B-102 Issue #351 — Agency→화주 Zone별 할인율 설정 기능`
