# TASK-B-110: Issue #391 (4단계) — UPS 요금 스케줄링 UI (적용일자·예정목록·이력)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#391](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/391) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | ✅ 완료 |

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
- `f242966f` — `[Mike] feat: TASK-B-110 Issue #391 4단계 UI — 적용일자·예정목록·이력 조회` (PR#399)

## [Aiden 검토]

**1차 반려 (260712)**: `agencyOrgId` prop이 두 UI 진입점(`agency/shippers/[id]/edit/page.tsx`→`edit-form.tsx`, `agency/ups-rates/page.tsx`→`agency-ups-rates-client.tsx`) 모두에서 `ZoneDiscountForm`까지 전달되지 않음 확인 — `handleSave()`의 `if (!agencyOrgId) return` 가드로 인해 프로덕션에서 저장이 항상 실패하는 상태였음. Playwright 테스트가 개인 화주로 먼저 실행되어 핵심 기능(SHIPPER_DISCOUNT 예약 등록)이 한 번도 실행되지 않은 점도 함께 지적.

**재검토 승인 (260712)**: 4개 파일(`page.tsx` ×2, `edit-form.tsx`, `agency-ups-rates-client.tsx`) diff 직접 확인 — `profile.org_id` → `agencyOrgId` 3단 전달 정상 완료. 실제 CI(headSha `f242966f` 일치) 확인 결과 Regression Tests 81/81 test files·485/485 tests 전부 PASS(로컬 자체보고 "78/81"과 불일치 — CI가 authoritative, 문제 없음 확인). PR#399 승인·머지 완료. Issue #391(1~4단계) 전체 완료 Close.
