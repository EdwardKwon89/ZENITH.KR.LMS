# TASK-B-173: DEF-114 ROLE_PERMISSIONS AGENCY 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-22 |
| **담당자** | Dave |
| **연결 이슈** | [#655](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/655) |
| **우선순위** | P1 (Critical) |
| **상태** | 🔔 PR #656 (재작업 반영) |

## 개요

`ROLE_PERMISSIONS`에 `USER_ROLES.AGENCY` 항목이 없어 AGENCY 역할의 모든 창고관리 기능이 500 에러로 차단됨.

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:---------|
| `src/lib/logistics/status-machine.ts` | ROLE_PERMISSIONS에 AGENCY 추가 (REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/IN_TRANSIT) |
| `tests/unit/logistics/status-machine.test.ts` | TC-AG-T1~T9 AGENCY 권한 검증 9종 추가 |
| `tests/unit/warehouse/ups-pickup-inbound.test.ts` | TC-AG-INT-01~03 통합 검증 3종 추가 + attachOperatorNames mock 보강 |
| `tests/setup.ts` | server-only mock 추가 |
| `tests/__mocks__/server-only.ts` | vitest alias용 빈 모듈 |
| `vitest.config.ts` | server-only alias 추가 |
| `.agent/defects/DEF-114_AGENCY_ROLE_PERMISSIONS_누락_창고기능전체차단.md` | 결함 보고서 (OPERATOR 판단 포함) |

## OPERATOR 권한 판단

**현행 유지** (추가 권한 부여하지 않음)
- OPERATOR는 `WAREHOUSE_ROLES`에 포함되지 않아 warehouse 액션 게이트에서 차단됨
- PR#646에서 제안된 OPERATOR 확장(WAREHOUSED/PACKED/RELEASED/IN_TRANSIT)은 실효성 없음
- AGENCY에 창고 상태 권한을 추가하는 것으로 충분

## DB RLS 추가 발견 (2차)

Application 레벨(ROLE_PERMISSIONS) 수정만으로는 `update_order_status_atomic` RPC의
`SELECT ... FOR UPDATE` 락이 DB RLS에서 차단됨 (SECURITY INVOKER).

### 추가 마이그레이션
- `supabase/migrations/20260722000000_def114_agency_warehouse_rls.sql`
  - `zen_orders`: AGENCY UPDATE 정책 (`get_my_role()=AGENCY AND agency_org_id=profile.org_id`)
  - `zen_inventory_history`: INSERT 정책에 AGENCY 역할 추가

### RPC 실사용 검증
- `agency@zenith.kr` → `update_order_status_atomic('303f3ee1-...', 'REGISTERED', 'WAREHOUSED')` → **204 성공** ✅
- 오더 `ZEN-2026-000001` → REGISTERED로 복구 완료

## 검증

| 검증 항목 | 결과 |
|:----------|:-----|
| TC-AG-T1~T9 (canChangeStatus AGENCY) | 9/9 PASS |
| TC-AG-INT-01~03 (server action AGENCY) | 3/3 PASS |
| status-machine 전체 | 31/31 PASS |
| warehouse (ups-pickup-inbound) 전체 | 17/17 PASS |
| TypeScript (내 파일) | 0 error |
| `update_order_status_atomic` RPC (AGENCY) | 204 성공 ✅ |
| `ZEN-2026-000001` REGISTERED→WAREHOUSED 전이 | 성공 후 복구 완료 ✅ |

## 브랜치

- `feature/teamb-def-114-agency-role-permissions` (base `TeamB_Dev`)
- PR #656

## 반려 사항 재작업 내역

### 1차 반려 (Jaison, PR#656 review)
- **브라우저 검증 누락**: `ZEN-2026-000001` 오더로 AGENCY RPC 직접 호출 검증 완료. 204 성공 확인
- **OPERATOR 판단 누락**: DEF-114 문서 §OPERATOR 권한 관련 검토에 분석 및 판단 기재 완료
- **테스트 보강**: AGENCY 통합 테스트(TC-AG-INT-01~03) 추가

### 2차 반려 — DB RLS 레이어 추가 발견
- `zen_orders` UPDATE 정책 없음 → AGENCY `SELECT ... FOR UPDATE` 차단
- `zen_inventory_history` INSERT 정책에 AGENCY 미포함
- 마이그레이션 추가 + RPC 실사용 검증 완료
