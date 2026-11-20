# [TASK-B-365] 오더정산 상태·UPS 원가 스냅샷 컬럼 마이그레이션 (Issue #1375 / TASK-B-365, 에픽 #1364)

> 구 단일 맵 §92에서 이관(2026-11-20 develop 동기화, R-09 v3.10 — 내용 변경 없음).

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-365 / [#1375](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1375) |
| **팀** | Team B |

**2026-11-18, Mike** — `zen_orders`에 정산 상태 3컬럼(`cost_settlement_status`/`cost_settled_at`/`cost_settled_by`) + CHECK 2종(값 집합·`SETTLED⇒at/by NOT NULL`) + 부분 인덱스 `idx_zen_orders_cost_settlement`, `zen_ups_actual_cost`에 규칙 스냅샷 5컬럼(`cost_surcharge_rate`/`cost_surcharge_amount_krw`/`calc_version` DEFAULT 1/`applied_exchange_rates`/`cost_legacy_snapshot`) 추가. **컬럼 추가만(서비스 영향 0), 백필 없음.** 기존 `*_hkd`·`*_currency`·`applied_exchange_rate`·`other_charges_hkd`는 COMMENT로 의미 고정.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-365-1 | `cost_settlement_status` 기본값 | 명시 없이 INSERT → `NOT_SETTLED` | `tests/unit/migrations/taskb365-cost-settlement-columns.test.ts` |
| TC-365-2 | 허용 안 되는 값 INSERT 거부 | `BOGUS_STATUS` → `zen_orders_cost_settlement_status_check` 위반 에러 | 동일 |
| TC-365-3 | `SETTLED`인데 `cost_settled_at` NULL → CHECK 거부 | `zen_orders_cost_settled_complete_check` 위반 에러 | 동일 |
| TC-365-3b | `SETTLED`인데 `cost_settled_by` NULL → CHECK 거부 | 동일 CHECK 위반 에러 | 동일 |
| TC-365-4 | `SETTLED` + at/by 모두 있으면 허용 | INSERT 성공·상태 `SETTLED` 확인 | 동일 |
| TC-365-4b | 정산자 프로필 DELETE 거부 (**DEF-B-158 (A)안 `ON DELETE RESTRICT`**) | SETTLED 오더 존재 시 프로필 DELETE → `zen_orders_cost_settled_by_fkey` 위반 에러, 프로필·오더 행 모두 불변 | 동일 |
| TC-365-5 | 부분 인덱스 존재 | `pg_indexes`에 `idx_zen_orders_cost_settlement`, `WHERE (transport_mode = 'UPS')` + `(cost_settlement_status, transport_mode)` 확인 | 동일 |
| TC-365-6 | `zen_ups_actual_cost` 신규 5컬럼 + 기본값 | INSERT 시 `calc_version=1`, 나머지 4컬럼 NULL | 동일 |
| TC-365-7 | 마이그레이션 재실행(멱등) = 기존 행 변경 0 | 재실행 전후 `count(*)`·`sum(total_cost_krw)`·정산 상태 집계 동일 | 동일 |
| TC-365-8 | 기존 컬럼 의미 고정 COMMENT | `other_charges_hkd` COMMENT에 `KRW 합계` 포함 | 동일 |

**회귀 검증 (2026-11-18)**: `npm run test:regression` **263 test files / 1,956 tests 전부 PASS** · `supabase db reset --yes` 통과(번호 충돌 없음) · `check-db-freshness` OK.
**되돌리기 검증 (테스트 유효성)**: 신규 3+5컬럼·인덱스·CHECK 일괄 DROP(롤백 SQL 실행) → **9 failed / 1 passed** (COMMENT 존재 검증 1건만 생존) → 마이그레이션 재적용 → **10/10 PASS**.
**DEF-B-158 (해소)**: `cost_settled_by`의 `ON DELETE SET NULL`와 `SETTLED⇒settled_by NOT NULL` CHECK 상호 모순 — 정산자 프로필 삭제가 항상 실패. **2026-11-18 Jaison (A)안 확정 → PR #1392에서 FK를 `ON DELETE RESTRICT`로 정정**(정산자 프로필 하드 삭제 차단 = 감사값 보존). 현재 미사용 컬럼이라 영향 0.
