# TASK-B-108: Issue #391 (2단계) — UPS 요금 스케줄링 서버 액션

| 메타 | 값 |
|:----|:----|
| **Issue** | [#391](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/391) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 신규: `src/app/actions/ups/pricing-schedule.ts`

**서버 액션 5개:**
1. `createPricingSchedule` — 신규 예약 등록 (SCHEDULED) + audit_log CREATE
2. `updatePricingSchedule` — 예약 수정 (SCHEDULED만) + audit_log UPDATE
3. `cancelPricingSchedule` — 예약 취소 (CANCELLED) + audit_log CANCEL
4. `getScheduledPricingChanges` — 예약 목록 조회
5. `getPricingAuditLog` — 변경 이력 조회

**핵심 로직:**
- `validateScheduleDates`: valid_from은 내일 이후, valid_until은 valid_from 이후 검증
- `checkOverlap`: 동일 target_ref 내 SCHEDULED 건과 기간 겹침 금지
- `insertAuditLog`: 모든 변경 시 audit_log 자동 기록
- Admin/Manager 권한 검증 (`requireAdminOrManager`)

### 검증
- **Build PASS** ✅
- **Regression**: 78/81 PASS (3건 환경변수 무관)

### 커밋
- (커밋 예정) — `[Mike] feat: TASK-B-108 Issue #391 2단계 서버 액션 — pricing schedule CRUD + 겹침 검증`
