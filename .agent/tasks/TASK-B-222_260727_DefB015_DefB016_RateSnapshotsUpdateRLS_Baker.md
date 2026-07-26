# TASK-B-222: Issue #881 — zen_order_rate_snapshots AGENCY UPDATE/INSERT RLS + agencyOrgId 전달 누락

## 기본 정보
| 항목 | 값 |
|------|-----|
| **태스크 ID** | TASK-B-222 |
| **관련 이슈** | Issue #881 (DEF-B-015, DEF-B-016) |
| **기여자** | Baker |
| **시작일** | 2026-07-27 |
| **완료일** | 2026-07-27 |
| **우선순위** | P1 |
| **브랜치** | `feature/teamb-222-defb015-defb016-rate-snapshots-update-rls` |

## 결함 분석

### DEF-B-015: zen_order_rate_snapshots AGENCY UPDATE/INSERT RLS 누락
- **원인**: DEF-B-014(TASK-B-221)에서 SELECT RLS만 추가하고 UPDATE/INSERT 누락
- **증상**: agency@zenith.kr로 입고처리 화면에서 중량/부피를 변경해도 예상운임 재계산이 RLS에 의해 조용히 차단됨
- **실증**: REST API 직접 UPDATE 시도 → `[]` 응답, DB 값 불변 확인

### DEF-B-016: applyPackageMeasurements()에 agencyOrgId 전달 누락
- **원인**: `applyPackageMeasurements()`가 `estimateUpsFreightFn()` 호출 시 `agencyOrgId`를 전달하지 않음
- **증상**: 대행사별 "부피중량 기준값"(5000/5500/6000)이 항상 기본값 5000으로 계산됨
- **비대칭**: 신규 오더 등록 시점(`saveOrderRateSnapshot()`)은 정확히 전달하나 갱신 시점만 누락

## 수정 내용

### 1. 마이그레이션 (DEF-B-015)
- 파일: `supabase/migrations/20260727100000_defb015_rate_snapshots_agency_update_insert_rls.sql`
- AGENCY UPDATE 정책: `Agency can update shipper order rate snapshots`
- AGENCY INSERT 정책: `Agency can insert shipper order rate snapshots`
- 패턴: DEF-114 AGENCY RLS 패턴 (agency_org_id 매칭)

### 2. 코드 수정 (DEF-B-016)
- 파일: `src/app/actions/operations/orders.ts`
- 수정 1: order 쿼리에 `agency_org_id` 필드 추가 (라인 737)
- 수정 2: `estimateUpsFreightFn()` 호출 시 `agencyOrgId: orderMeta.agency_org_id` 전달 (라인 803)

### 3. 테스트
- 파일: `tests/unit/migrations/defb015-rate-snapshots-agency-update-insert-rls.test.ts`
- 총 10건 테스트 (구조 검증 5건 + DB 검증 5건)

## 검증 결과
| 항목 | 결과 |
|------|------|
| **빌드** | PASS |
| **단위 테스트** | 10/10 ALL PASS |
| **회귀 테스트** | 134 files / 889 tests ALL PASS |
| **로컬 DB 실검증** | AGENCY UPDATE/INSERT RLS 정책 동작 확인 |

## 커밋
| 구분 | 해시 | 설명 |
|------|------|------|
| 코드 | TBD | DEF-B-015 + DEF-B-016 수정 |
| 문서 | TBD | 완료 보고 |
