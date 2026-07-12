# TASK-B-109: Issue #391 (3단계) — UPS 요금 스케줄링 Vercel Cron 배치

| 메타 | 값 |
|:----|:----|
| **Issue** | [#391](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/391) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-12 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. 신규: `vercel.json`
- Vercel Cron 설정: 매일 자정 (0 0 * * *) 실행
- 경로: `/api/cron/pricing-schedule-apply`

#### 2. 신규: `src/app/api/cron/pricing-schedule-apply/route.ts`

**배치 로직:**
- **적용**: `valid_from <= 오늘 AND status='SCHEDULED'` → 설정 테이블 UPDATE + status APPLIED + audit_log APPLY
- **만료**: `valid_until < 오늘 AND status='APPLIED'` → status CANCELLED + audit_log EXPIRE

**적용 대상별 설정 테이블:**
- `AGENCY_DISCOUNT` → `zen_agency_pricing_policies.discount_rate`
- `SHIPPER_DISCOUNT` → `zen_agency_shipper_zone_discounts.discount_rate`
- `VOLUMETRIC_DIVISOR` → `zen_organizations.volumetric_divisor`

**인증:**
- Vercel Cron: `x-vercel-cron` 헤더 검증
- 수동 트리거: `x-api-key` 헤더로 `CRON_SECRET` 대체 가능
- GET: 상태 확인 엔드포인트

### 검증
- **Build PASS** ✅ (`/api/cron/pricing-schedule-apply` 라우트 확인)
- **Regression**: 78/81 PASS (3건 환경변수 무관)

### 커밋
- (커밋 예정) — `[Mike] feat: TASK-B-109 Issue #391 3단계 Vercel Cron 배치 — pricing schedule apply + expire`
