# TASK-B-106: Issue #386 — UPS 모드 오더등록 항구 선택 스킵 + 예상운임 표시

| 메타 | 값 |
|:----|:----|
| **Issue** | [#386](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/386) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. 수정: `src/lib/validation/order.ts`
- `origin_port_id`, `dest_port_id`를 optional로 변경
- `recipient_country_code` 필드 추가 (optional)
- superRefine에 UPS가 아닌 모드에서 port 필수 검증 추가

#### 2. 수정: `src/components/orders/UpsFreightEstimateSection.tsx`
- `onEstimateChange` 콜백 prop 추가
- estimate 변경 시 부모 컴포넌트에 상태 전달

#### 3. 수정: `src/components/orders/OrderRegistrationForm.tsx`
- UPS 모드일 때 Port Selection 영역 숨김 (`transportMode !== 'UPS'`)
- `handleNextToStep2`에서 UPS 모드 시 `origin_port_id`/`dest_port_id` validation 제외
- `destCountryCode`를 `destPort?.country_code`에서 `watch('recipient_country_code')`로 교체
- HS_lookup API 호출 시 `recipient_country_code` 우선 사용
- Shipment Summary에 UPS 모드일 때 예상운임 표시 (shipper.finalFreight || platform.totalSellingPrice)

### 검증
- **Build PASS** ✅ (Next.js 16.2.4, TypeScript 통과)
- **Regression**: 78/81 passed (3건 환경변수 미설정 무관)
- **변경파일**: 3개 (order.ts, UpsFreightEstimateSection.tsx, OrderRegistrationForm.tsx)

### 커밋
- (커밋 예정) — `[Mike] fix: TASK-B-106 Issue #386 UPS 모드 오더등록 항구 선택 스킵 + 예상운임 표시`
