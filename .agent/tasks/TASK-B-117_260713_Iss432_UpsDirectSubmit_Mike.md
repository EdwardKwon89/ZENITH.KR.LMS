# TASK-B-117: Issue #432 — UPS Direct 1단계 직접 제출 기능

| 메타 | 값 |
|:----|:----|
| **Issue** | [#432](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/432) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-13 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 수정: `src/components/orders/OrderRegistrationForm.tsx`

1. **handleUpsDirectSubmit 핸들러 신규** (라인 ~582)
   - trigger로 필수값 검증
   - ups_product_code 미선택 시 토스트 에러
   - handleSubmit(onSubmit, onError)() 직접 호출

2. **Step 1 버튼 UPS Direct 전환** (상단 837행 + 하단 1599행)
   - `transportMode === 'UPS'`일 때 "오더 등록" 버튼 표시
   - non-UPS는 기존 "다음 단계 (서비스 선택)" 유지

3. **onSubmit UPS 분기 정리** (679행~)
   - ups_service_family 기반 ups_product_code 재계산 로직 제거
   - Step 1에서 설정된 data.ups_product_code 그대로 사용
   - estimated_cost: `upsEstimate?.shipper?.finalFreight ?? upsEstimate?.platform?.totalSellingPrice ?? totals.freight`

### 검증
- **Build PASS** ✅
- **Regression**: 81/81 ALL PASS (485 tests)

### 커밋
- (커밋 예정) — `[Mike] feat: TASK-B-117 Issue #432 UPS Direct 1단계 직접 제출 기능`
