# SAR_2026-05-08_001_QA-02_Tracking_SQL_Ambiguity.md: 트래킹 로직 SQL 모호성 및 제약 조건 누락

| 항목 | 내용 |
|------|------|
| **발견일** | 2026-05-08 |
| **발견자** | Claude (QA-02 통합 테스트 중) |
| **심각도** | HIGH |
| **상태** | CLOSED (수정 완료) |

## 1. 문제 요약

`QA-02` 트래킹 비즈니스 로직 검증 중 두 가지 주요 결함 발견:
1. `fn_get_best_matching_rate` 함수 호출 시 `column reference "id" is ambiguous` 오류 발생.
2. `zen_tracking_configs` 테이블에 `order_id` UNIQUE 제약이 활성화되지 않아 중복 데이터 적재 시 `.single()` 쿼리 실패.

## 2. 근본 원인

1. **SQL 모호성**: PL/pgSQL 함수의 리턴 테이블 컬럼명(`id`)과 조인 대상 테이블의 컬럼명(`id`)이 중복되어 PostgreSQL 엔진이 어떤 컬럼을 참조해야 할지 판단 불가.
2. **제약 조건 누락**: 이전 SAR-2026-04-26-011에서 제약 조건 추가가 시도되었으나, 로컬 환경 재구축 또는 마이그레이션 순서 이슈로 인해 실제 DB에 반영되지 않은 상태로 방치됨.

## 3. 재현 경로

1. `tests/integration/tracking-business-qa.test.ts` 실행.
2. 오더 등록 후 트래킹 동기화 트리거 발생 시 `fn_get_best_matching_rate` 호출 → SQL Error 42702 발생.
3. 수동으로 중복 데이터를 `zen_tracking_configs`에 삽입 후 `TrackingManager.getConfig()` 호출 → `.single()` 에러 반환.

## 4. 수정 내역

**마이그레이션:** `supabase/migrations/20260508140000_fix_sql_ambiguity_and_unique_constraints.sql`

1. **SQL 모호성 해결**: 
   - 함수의 리턴 컬럼명을 `id`에서 `rate_id`로 변경.
   - 쿼리 내 모든 컬럼 참조에 테이블 에일리어스(`rc.id`, `p.code` 등)를 명시적으로 부여.
2. **데이터 무결성 강화**:
   - 중복 레코드 자동 정리 로직(Latest record 보존) 추가.
   - `zen_tracking_configs_order_id_unique` UNIQUE 제약 조건 강제 적용.

## 5. 재발 방지

- [x] PL/pgSQL 함수 작성 시 리턴 컬럼명에 `out_` 접두사 또는 고유 명칭(`rate_id`) 사용 의무화.
- [x] 모든 SQL 쿼리에서 테이블 에일리어스 사용을 표준화하여 컬럼 충돌 방지.
- [x] `LIVE_PHASE_3_VERIFY.md`에 DB 제약 조건 실구동 확인 항목 추가.
