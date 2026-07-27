# TASK-B-225: Issue #901 — zen_order_costs AGENCY SELECT RLS 누락

## 기본 정보
| 항목 | 값 |
|------|-----|
| **태스크 ID** | TASK-B-225 |
| **관련 이슈** | Issue #901 (DEF-B-019) |
| **기여자** | Baker |
| **시작일** | 2026-07-27 |
| **완료일** | 2026-07-27 |
| **우선순위** | P1 |
| **브랜치** | `feature/teamb-225-defb019-order-costs-agency-select-rls` |

## 결함 분석

### DEF-B-019: zen_order_costs AGENCY SELECT RLS 누락
- **원인**: zen_order_costs 테이블에 AGENCY용 SELECT RLS 정책 없음
- **증상**: `/admin/ups-actual-charges`에서 AGENCY 계정으로 오더 조회 시 "예상 청구액(Estimated)"이 항상 0으로 표시
- **실증**: REST API 직접 조회 시도 → ADMIN은 정상 조회, AGENCY는 0건 반환

## 수정 내용

### 마이그레이션
- 파일: `supabase/migrations/20260727110000_defb019_order_costs_agency_select_rls.sql`
- AGENCY SELECT 정책: `Agency can view shipper order costs`
- 패턴: DEF-114 AGENCY RLS 패턴 (agency_org_id 매칭)
- GRANT: 기존 authenticated 권한 확인 후 조건부 추가

### 테스트
- 파일: `tests/unit/migrations/defb019-order-costs-agency-select-rls.test.ts`
- 총 6건 테스트 (구조 검증 3건 + DB 검증 3건)

## 검증 결과
| 항목 | 결과 |
|------|------|
| **빌드** | PASS |
| **단위 테스트** | 6/6 ALL PASS |
| **회귀 테스트** | 136 files / 901 tests ALL PASS |
| **로컬 DB 실검증** | AGENCY SELECT RLS 정책 동작 확인 |

## 커밋
| 구분 | 해시 | 설명 |
|------|------|------|
| 코드 | TBD | DEF-B-019 수정 |
| 문서 | TBD | 완료 보고 |
