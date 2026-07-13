# TASK-B-107: Issue #391 (1단계) — UPS 요금 스케줄링 DB 마이그레이션

| 메타 | 값 |
|:----|:----|
| **Issue** | [#391](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/391) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 신규: `supabase/migrations/20260712000000_iss391_pricing_schedule_migration.sql`

**테이블 1 — `zen_ups_pricing_schedule` (예약 대기열)**
- setting_type: AGENCY_DISCOUNT / SHIPPER_DISCOUNT / VOLUMETRIC_DIVISOR
- target_ref: JSONB (agency_org_id/zone_id/shipper_org_id 조합)
- new_value, valid_from, valid_until, status(SCHEDULED/APPLIED/CANCELLED)
- RLS: Admin 전체 CRUD, AGENCY는 본인 org_id 대상 CRUD
- 인덱스: status, valid_from, target_ref(GIN)

**테이블 2 — `zen_ups_pricing_setting_audit_log` (변경 이력)**
- action: CREATE / UPDATE / CANCEL / APPLY / EXPIRE
- old_data, new_data JSONB
- RLS: Admin SELECT, service_role INSERT
- 인덱스: setting_type+target_ref, changed_at

### 검증
- **Build PASS** ✅ (SQL 파일이므로 TypeScript 영향 없음)

### 커밋
- (커밋 예정) — `[Mike] feat: TASK-B-107 Issue #391 1단계 DB 마이그레이션 — pricing schedule + audit_log`
