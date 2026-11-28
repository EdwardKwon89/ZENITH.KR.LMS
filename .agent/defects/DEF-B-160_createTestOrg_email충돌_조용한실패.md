# DEF-B-160 | 실DB 헬퍼 `createTestOrg()`가 email 충돌 시 원인 없이 "org_id 불일치"로 실패 — 진단성 결함

| 항목 | 내용 |
|:-----|:-----|
| **발견 경위** | TASK-B-360(#1366) 통합 테스트 최초 실행에서 `createTestOrg`가 `[TASK-1161] 프로필 org_id 불일치: DB=, expected=...`로 실패. 원인 추적에 상당 시간 소요 — 실제 원인은 `zen_profiles.email` UNIQUE 충돌이 `on_auth_user_created` 트리거를 조용히 실패시킨 것 |
| **발견자 / 날짜** | Mike (Team B) / 2026-11-21 |
| **대상 파일** | `tests/integration/helpers/db.ts` (TASK-1161 / Issue #1347, B_Kai) — **본 Task 범위 밖** |
| **긴급도** | **Low** (테스트 인프라 진단성 — 런타임 영향 없음, CI는 fresh DB라 발병 가능성 낮음) |
| **상태** | OPEN — 본 Task에서는 workaround로 우회(랜덤 prefix + 선행 purge), 근본 수정은 별도 배정 |

## 현상 (재현)

`createTestOrg({ prefix: 'b360_agency' })` 처럼 **고정 prefix**를 쓰고, 이전 실행이 `afterAll` 실패로 정리하지 못한 채 남은 경우:

1. 이전 실행의 `zen_profiles` 행(`email = 'b360_agency@test.kr'`)이 잔존 — `zen_profiles.email`은 **UNIQUE**(`zen_profiles_email_key`).
2. 이번 실행의 `INSERT INTO auth.users`가 `on_auth_user_created` 트리거를 발화 → 트리거의 `INSERT INTO zen_profiles (email=동일)` 이 **unique 위반**으로 실패.
3. 헬퍼의 `psql()`은 **`ON_ERROR_STOP` 없이** `docker exec ... psql -f -`를 실행하므로:
   - psql이 오류를 출력하고 **종료 코드 0** 반환 → `execFileSync`이 throw하지 않음
   - `INSERT INTO auth.users`를 포함한 **암묵적 트랜잭션이 전부 롤백** → 프로필이 만들어지지 않음
4. 이어서 `UPDATE public.zen_profiles ... WHERE id = <새 id>`가 0행 → 최종 검증 `SELECT org_id ... WHERE id = <새 id>`가 빈 값 → **`[TASK-1161] 프로필 org_id 불일치: DB=`** 로 보고됨.

즉 **실제 원인(email unique 위반) 대신 결과만 보고**되어 원인 추적이 어려움.

## 영향 범위

- 동일 prefix를쓰는 실DB 테스트(`policy_*`, `trk_qa`, `b360_*` 등)에서 **직전 실행이 비정상 종료하면 다음 실행이 원인 불명으로 실패**.
- CI는 매번 fresh DB라 발병하지 않음 → 로컬 반복 실행에서만 발현.
- 본 Task의 통합 테스트는 **랜덤 suffix prefix + 선행 purge(참조 FK 순서대로)** 로 우회하여 2회 연속 18/18 PASS를 확보함.

## 권장 조치

1. **`createTestOrg`의 psql 호출에 `-v ON_ERROR_STOP=1` 추가** → 실패 시 실제 DB 오류(unique 위반 등)가 그대로 throw되어 원인이 노출된다. (가장 작은 수정)
2. **선행 정리 자동화**: `createTestOrg` 시작 시 동일 prefix의 잔존 `zen_profiles`/`auth.users`/`zen_organizations`를 FK 순서대로 정리 (멱등).
3. **안내**: `docs/08_Self_Audit/TestCoverage_231/231_실DB_헬퍼_사용가이드.md`에 "고정 prefix 사용 시 이전 실행 잔여물 purge 필수" 또는 "랜덤 suffix 권장" 명기.

- **관련 파일**: `tests/integration/helpers/db.ts`, `docs/08_Self_Audit/TestCoverage_231/231_실DB_헬퍼_사용가이드.md`
- **예상 공수**: 0.2 MD (ON_ERROR_STOP + purge 헬퍼 + 가이드 1줄)
- **우선순위**: Low — 단, "org_id 불일치"라는 오해를 부르는 진단성이 떨어져 반복 비용이 크다
