# TASK-1161: Issue #1347 — 실DB 테스트 공용 fixture 헬퍼 신설 (설계 게이트)

| 항목 | 내용 |
|:----|:------|
| **Task** | TASK-1161 |
| **관련 Issue** | [#1347](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1347) |
| **발령** | Aiden / Edward 승인 — 2026-11-17 KST |
| **수행(Worker)** | B_Kai (Team A) · **검증(Auditor)**: Aiden (R-01) |
| **근거** | 문서 231 §10 #4 확정(Edward 2026-11-17), PoC 단계 1 보고서 §5.3·§8.5 |
| **상태** | **`[설계 의견]` 작성 완료 — Aiden `[설계 확정]` 대기 (`status:draft`)** (R-11) |
| **브랜치** | `feature/teama-task-1161-db-fixture-helper-design` (base `origin/develop` `2e5a9ba6`) |
| **작성일** | 2026-11-18 |
| **성격** | **설계 게이트 전용** — Aiden 확정 전 구현 금지. `src/`·`package.json`·lockfile 변경 없음. |

---

## 1. 목표 (Issue #1347 인용)

실DB 통합 테스트 33개 파일이 공용 fixture 헬퍼 없이 각자 셋업하는 문제를 해결하기 위해,
**신규 헬퍼 파일**을 만들고 신규 실DB 테스트가 이를 쓰도록 한다.
기존 33개 파일은 **일괄 이전하지 않고**, 파일럿 2~3건만 이전한다.
R-11에 따라 **위치·이름·최소 기능·파일럿 대상을 `[설계 의견]`으로 먼저 확정**받는다.

## 2. 조사 결과 — 기존 `tests/` 관례 (설계 근거)

| 항목 | 실측 |
|:--|:--|
| `tests/` 최상위 | `__mocks__/`, `e2e/`, `integration/`, `scratch/`, `test-results/`, `unit/`, `setup.ts` — **공용 `helpers/` 디렉터리 없음** |
| 헬퍼 유사 파일 | `tests/e2e/test-utils.ts` — 플랫 파일, `getServiceClient()`·`resetClient()` 노출. `tests/unit/support/`는 **헬퍼가 아니라 테스트 파일**(`order-qna.test.ts`, `support-actions.test.ts`) |
| integration 파일 수 | 33개, 전부 `tests/integration/*.test.ts` 플랫 배치 |
| 중복 패턴 | `psql()` + `docker exec -i supabase_db_ZENITH_LMS_001 psql …` **10개** / 수제 `makeJwt()` **4개** / `SUPABASE_SERVICE_ROLE_KEY` **11개** (보고서 §5.3, 277~288행과 일치) |
| `psql()` 결함 | SQL을 `"${escaped}"`로 셸 보간 → 따옴표·`$` 이스케이프에 의존. 컨테이너명 `supabase_db_ZENITH_LMS_001` 하드코딩 |
| `makeJwt()` 결함 | 4개 파일이 동일 코드 복붙. `app_metadata: { provider:'email', role:'SHIPPER' }` 만 포함 — **`org_id` 클레임 없음**(RLS가 조용히 실패하는 null 함정의 원인) |
| Vitest 설정 | `vitest.config.ts`: `setupFiles: ['./tests/setup.ts']`, `exclude: tests/e2e/**·scratch/**`, `fileParallelism: false` |
| 타입체크 범위 | `tsconfig.json` `include: ["**/*.ts"]`, `exclude: ["node_modules","scratch","scripts"]` → **`tests/**/*.ts`는 `npm run build` 타입체크 대상**(231 §8.5 격리 교훈 2와 일치) |
| 테스트 명령 | `test:regression` = `vitest run` (unit + integration 전부) |
| Team A 소유 integration | `p6-transport-policy`(D_Kai, 06-26), `p6-customs-rates`·`p6-delivery-rates`·`p6-service-rates`·`p6-db-01`·`p7-ups-schema`(D_Kai), `notifications`·`p6-order-services`·`p6-orderui`(B_Kai), `tracking`·`settlement-engine`·`rou-01~03`(D_Kai/Ring) |
| **실DB 패턴을 쓰는 Team A 파일** | **`p6-transport-policy.test.ts`**(service_role + seed 조직 의존) 1개뿐. 그 외 실DB 패턴 12개는 전부 Team B(jungjs: Dave/Baker/Mike) 소유 → 파일럿 이전 제약 대상 |

## 3. `[설계 의견]` — B_Kai 제안 (Aiden 확정 대기)

### 3.1 위치·이름

| 안 | 경로 | 장단 |
|:-:|:--|:--|
| **A (권장)** | `tests/integration/helpers/db.ts` | 소비처 33개가 전부 `tests/integration/` → import `./helpers/db`로 최단. `tests/unit/support/`가 테스트 파일임이 이미 확인돼 헬퍼와 혼동 없음. 소유권·리뷰 범위 명확. |
| B | `tests/helpers/db.ts` | 이슈 후보안. `tests/unit/`까지 확장 여지가 있으나 현재 실DB 소비처는 integration뿐 → 상위 배치 시 오히려 범위가 모호. |

**제안: A안 채택.** 동봉 파일:

| 파일 | 역할 |
|:--|:--|
| `tests/integration/helpers/db.ts` | 헬퍼 3종 + 정리 + `org_id` 단언 |
| `tests/integration/helpers/db.test.ts` | 헬퍼 단위 동작 테스트(DoD 필수) |
| `docs/08_Self_Audit/TestCoverage_231/231_실DB_헬퍼_사용가이드.md` | 짧은 사용 가이드(신규 실DB 테스트 작성 규칙). 헬퍼 상단 주석에서 이 문서를 참조. |

> R-09 의무화(가이드 규칙을 규정으로 승격)는 **Aiden이 별도 개정** — 본 Task에서는 가이드만 작성.

### 3.2 헬퍼 API 최소 기능

```ts
// tests/integration/helpers/db.ts (제안 시그니처)
export interface TestIdentity {
  sub: string; email: string; role: string; orgId: string; jwt: string;
  cleanup(): Promise<void>;
}

psql(sql: string): string                       // 동기(execFileSync), SQL은 stdin 전달
makeJwt(opts: {
  sub: string; email: string; role: string;
  orgId?: string | null; allowMissingOrgId?: boolean;
}): string                                      // HS256, app_metadata.org_id 클레임 포함
assertOrgIdClaim(token: string, expectedOrgId: string): void  // null 함정 단언
createTestOrg(opts?: {
  prefix?: string; role?: string; orgType?: string;
}): Promise<TestIdentity>                       // 조직·사용자·프로필 생성 + 고유 접두사 + cleanup
```

**(1) `psql` — 실행 경로 단일화 + 하드코딩 제거**
- `execFileSync('docker', ['exec','-i',container,'psql','-U','postgres','-d','postgres','-q','-t','-A','-f','-'], { input: sql, encoding:'utf-8' })`.
  → SQL을 **셸 보간하지 않고 stdin**으로 넘겨 기존 따옴표·`$` 이스케이프 취약성을 제거.
- 컨테이너명 결정 순서: ① `process.env.SUPABASE_DB_CONTAINER` ② `supabase/config.toml`의 `project_id`로 `supabase_db_<id>` 조성 ③ `docker ps --format '{{.Names}}'` 필터 결과가 **정확히 1개일 때만** 사용.
  → `supabase_db_ZENITH_LMS_001` 하드코딩 제거(R-14 로컬 전용 유지).

**(2) `makeJwt` + `assertOrgIdClaim` — org_id null 함정 차단**
- 로컬 시크릿 기본값은 기존 테스트와 동일(`super-secret-jwt-token-with-at-least-32-characters-long`), `SUPABASE_JWT_SECRET` 환경변수로 override.
- payload: `app_metadata: { provider:'email', role, org_id: orgId }`, `role:'authenticated'`, `aud:'authenticated'`, `iss:'supabase'`, `iat`/`exp`.
- **`orgId`가 null/undefined면 `allowMissingOrgId: true`가 아니면 throw** — 시드 계정의 `app_metadata.org_id = null`로 RLS가 조용히 실패하는 함정(이슈 본문 기재 DEF/IMP)을 생성 시점에 차단.
- `assertOrgIdClaim(token, expectedOrgId)`는 payload를 디코딩해 `app_metadata.org_id`가 기대값과 일치하는지 검증. `createTestOrg`가 반환 JWT에 내부적으로 호출하고, 파일럿 테스트에서도 명시적 단언 1건 추가.

**(3) `createTestOrg` — 자기완결**
- 고유 접두사 `test_<randomHex(8)>`를 조직명·이메일·order_no 등에 부여 → 병렬/연속 실행 충돌 방지.
- `auth.users` → `public.zen_organizations` → `public.zen_profiles` 순으로 FK 안전 삽입(`psql` 경유).
- 반환값에 `cleanup()` 포함 — 자식 → 부모 순서 `DELETE … IF EXISTS`로 멱등 구현. 공용 시드(`seed_data.sql` 등)에 **의존하지 않음**. 불가피한 의존은 옵션으로 명시 선언(기본 `false`).

**(4) service_role 사용 범위 최소화 지침**
- `getServiceClient()`는 **`createTestOrg` 픽스처 셋업 내부에서만** 사용.
- **동작·검증 클라이언트는 반드시 anon + 사용자 JWT**(`makeJwt` 결과)를 써서 RLS가 실제로 통과해야 함. 가이드에 "검증 쿼리에 service_role을 쓰면 테스트 무효" 규칙 명시.

### 3.3 자기완결 원칙 (Issue 범위 3)

- 헬퍼가 만든 데이터는 `cleanup()`으로 전량 제거, 시드 의존 0.
- `cleanup()`은 2회 호출해도 안전(멱등)하며, 헬퍼 테스트가 이를 검증.
- 기존 테스트의 `beforeAll`/`afterAll` 정리 블록은 파일럿 이전 시에만 헬퍼로 대체.

### 3.4 파일럿 이전 후보 (Issue 범위 4)

| # | 파일 | 선정 근거 | 비고 |
|:-:|:--|:--|:--|
| 1 | `tests/integration/p6-transport-policy.test.ts` | **유일한 Team A(D_Kai) 소유 실DB 패턴**. service_role 셋업 + 시드 조직(`Global Shipper Corp`·`Fast Carrier Ltd`) 의존 → 헬퍼 전환으로 자기완결화 효과가 큼 | D_Kai에게 사전 협의(같은 Team A, 변경 이력 2026-06-26) |
| 2 | `tests/integration/tracking-business-qa.test.ts` | **변경 이력이 가장 오래됨(2026-05-08, `[Gemini]` 태그)**. `.env.local` 수동 파싱 + 고정 order ID + service_role 혼용 → 헬퍼 적용 시 개선 폭이 큼 | Team A 소유는 아님(현 로스터상 Ring equiv) → 충돌 위험은 낮으나 Aiden 확인 후 진행 |
| (3, 선택) | 신규 `tests/integration/helpers/db.test.ts` | 헬퍼 단위 동작 검증(DoD 필수). "이전"은 아니지만 같은 커밋에 포함 | 필수 항목 |

- **Team B 소유 실DB 파일 12개는 이전하지 않음**(`iss1075`, `iss1070`, `iss1100-save`, `iss1100-docdata`, `iss1125`, `def-b151`, `defb052`, `task-b340`, `task-b346`, `task-b349`, `p71-ups-agency-pricing`, `ups-edit-before-registration`). 필요 시 Team B 협의 후 별도 Task.
- 전/후 **결과 동일·소요 시간 비교표**와 **연속 5회 flaky 0**을 task file에 기록.

### 3.5 검증 계획 (Issue '검증 (필수)' 대응)

1. 헬퍼 단위 테스트: `psql` stdin 전달·컨테이너 해석, `makeJwt`/`assertOrgIdClaim` 정상·null 거부, `createTestOrg` 생성·정리(멱등).
2. `npm run test:regression` 전체 PASS — **Test Files/Tests 수를 기준선(254 파일/1834 케이스, run 43991130327) 대비 기록**하고 증감 사유 설명(헬퍼 테스트 +1 파일, 파일럿 케이스 수 변화 없음).
3. 파일럿 전/후 소요 시간·결과 비교표, 연속 5회 실행 flaky 0(로컬 또는 CI).
4. `npm run build` PASS + **신규 타입 오류 0**(`tests/**/*.ts`가 타입체크 대상임을 확인).
5. `src/` 변경 0건, `package.json`·lockfile 변경 0건, 로컬 Supabase만 사용(R-14).
6. R-09(회귀맵 갱신 — freeze 공지 전 기존 방식), R-17 완료 보고·`check-R17-DoD` 준수.

## 4. 리스크 및 Aiden 확정 요청 사항

| # | 결정 사항 | B_Kai 권고 |
|:-:|:--|:--|
| 1 | 헬퍼 위치 | **A안 `tests/integration/helpers/db.ts`** (이슈 후보 `tests/helpers/db.ts` 대신) |
| 2 | `psql` 컨테이너 해석 | env override → `config.toml` `project_id` → 단일 `docker ps` 매칭 순. SQL stdin 전달로 보간 제거 |
| 3 | 파일럿 2건 | `p6-transport-policy` + `tracking-business-qa` (Team B 소유 12건 미이전). 2건 모두 승인 시 진행, 일부만 승인 시 승인분만 진행 |
| 4 | 사용 가이드 위치 | `docs/08_Self_Audit/TestCoverage_231/231_실DB_헬퍼_사용가이드.md` + 헬퍼 상단 주석 참조 |
| 5 | R-09 의무화 | 본 Task에서 하지 않음 — Aiden 별도 개정 확인 |

> 위 5건에 대한 **`[설계 확정]`**을 Issue #1347에 남겨 주시면 즉시 구현에 착수하겠습니다(R-11).
> 확정 전에는 헬퍼 파일·테스트 파일을 **생성하지 않습니다.**

## 5. `[설계 확정]` (Aiden 기재란)

_(대기 — Aiden이 Issue #1347에 `[설계 확정]`을 남기면 이 섹션에 원문 복사)_

## 6. DoD (완료 정의)

- [ ] `[설계 의견]` 작성(완료) → Aiden `[설계 확정]` 확인 후 구현 — **현재 이 단계(확정 대기)**
- [ ] 헬퍼 3종(+정리·org_id 검증)과 헬퍼 테스트, 사용 가이드
- [ ] 파일럿 이전 2~3건 전/후 비교(결과 동일·시간·flaky 0/5회)
- [ ] build·회귀 전체 PASS 수치, `src/`·`package.json`·lockfile 변경 0건
- [ ] R-09 갱신, R-17 완료 보고 절차·`check-R17-DoD` 준수

## 7. `[작업 결과]`

_(구현 완료 후 기재 — 커밋 해시는 `scripts/insert-commit-hash.sh`로 자동 삽입)_
