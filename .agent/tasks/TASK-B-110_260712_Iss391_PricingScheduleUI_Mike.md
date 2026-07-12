# TASK-B-110: Issue #391 (4단계) — UPS 요금 스케줄링 UI (적용일자·예정목록·이력)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#391](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/391) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. 수정: `ups-rates-client.tsx`
- **AgencyPolicyForm**: 적용일자/종료일자 입력 필드 추가 (blue-50 배경)
- **handleSubmit**: valid_from이 있으면 createPricingSchedule로 예약 등록, 없으면 기존 즉시 적용
- **AgencyPolicyTable**: 예정된 변경(scheduledChanges) 표시 영역 + 취소 버튼
- **상태 관리**: scheduledChanges 상태 + fetchScheduledChanges 콜백 + useEffect

#### 2. 수정: `ZoneDiscountForm.tsx`
- **적용일자/종료일자** 입력 필드 추가
- **agencyOrgId** prop 추가 (schedule 등록에 필요)
- **handleSave**: valid_from이 있으면 createPricingSchedule로 예약 등록
- **예정 목록 표시** + 취소 버튼

### 검증
- **Build PASS** ✅
- **Regression**: 78/81 PASS (3건 환경변수 무관)

### 커밋
- (커밋 예정) — `[Mike] feat: TASK-B-110 Issue #391 4단계 UI — 적용일자·예정목록·이력 조회`
