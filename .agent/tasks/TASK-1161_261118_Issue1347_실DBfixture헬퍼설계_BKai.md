# TASK-1161: Issue #1347 — 실DB 테스트 공용 fixture 헬퍼 신설 (설계 게이트)

| 항목 | 내용 |
|:----|:------|
| **Task** | TASK-1161 |
| **관련 Issue** | [#1347](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1347) |
| **발령** | Aiden / Edward 승인 — 2026-11-17 KST |
| **수행(Worker)** | B_Kai (Team A) · **검증(Auditor)**: Aiden (R-01) |
| **근거** | 문서 231 §10 #4 확정(Edward 2026-11-17), PoC 단계 1 보고서 §5.3·§8.5 |
| **상태** | **`[설계 확정]` 완료(2026-11-18 11:50 KST) — 구현 중 (`status:in-progress`)** (R-11) |
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

## [설계 확정] TASK-1161 — Aiden, 2026-11-18 11:50 KST (Edward 승인 하에 진행)

`[설계 의견]`(커밋 `9b0025f0`) 검토 결과 **5건 모두 승인**하되, 아래 **필수 조건 7건**을 구현 DoD에 추가한다. 조사 근거(tsconfig 타입체크 범위, `psql` 셸 보간 결함, `makeJwt` org_id 부재, Team A 실DB 파일 1개뿐)는 독립 확인했고 타당하다.

### 결정 5건
1. **위치**: A안 `tests/integration/helpers/db.ts` 확정(+ `db.test.ts`). 이슈 후보 `tests/helpers/db.ts`는 채택하지 않는다.
2. **`psql`**: stdin 전달(`execFileSync`) + 컨테이너 해석 순서(env override → `config.toml` project_id → `docker ps` 단일 매칭) 승인. **0개 또는 2개 이상 매칭이면 추측하지 말고 throw**(어느 DB인지 모호한 상태로 실행 금지).
3. **파일럿**: `p6-transport-policy.test.ts` 승인(Team A·D_Kai — 착수 전 #1386 진행 중인 D_Kai에게 이 Issue 코멘트로 통지만, 별도 협의 불필요). `tracking-business-qa.test.ts`는 **조건부 승인**(조건 ⑥). Team B 소유 12건 미이전 승인.
4. **가이드**: `docs/08_Self_Audit/TestCoverage_231/231_실DB_헬퍼_사용가이드.md` 승인(`check-doc-links` 신규 0건).
5. **R-09 의무화**: 이 Task에서 하지 않는다. Aiden이 별도 개정.

### 필수 조건 7건 (설계 의견에 없던 리스크)
① **로컬 전용 가드(R-14)**: 헬퍼(`getServiceClient`·`createTestOrg`·`cleanup`)는 Supabase URL의 호스트가 `127.0.0.1`/`localhost`가 아니면 **즉시 throw**한다. 근거: `tracking-business-qa.test.ts`가 `.env.local`을 직접 파싱해 **고정 order ID를 `zen_orders`에서 delete 후 insert**하는데, `.env.local`이 원격(Pilot 실데이터)을 가리키면 그대로 실DB를 지운다. 헬퍼는 이를 구조적으로 막아야 한다. 가드 동작 테스트(원격 URL → throw) 포함.
② **`handle_new_user` 트리거 확인**: `auth.users`에는 `on_auth_user_created` 트리거(`20260418002000_expand_identity_auth.sql:70-86`, `20260418184000_sync_auth_metadata.sql`)가 있다. `auth.users` → `zen_organizations` → `zen_profiles` 직접 삽입 시 **트리거가 프로필을 자동 생성해 중복·충돌**할 수 있다. 트리거 본문을 확인해 설계(트리거 의존/억제/충돌 회피)를 task file에 기술하고, 필요하면 GoTrue admin API 대안과 비교한다.
③ **org_id 출처 일치**: RLS가 JWT `app_metadata.org_id`를 읽는지 `zen_profiles.org_id`를 읽는지 확인하고, 헬퍼가 만드는 JWT 클레임과 DB 프로필 값이 **항상 일치**하도록 한다(`assertOrgIdClaim`이 DB 값과도 대조).
④ **정리 확장 훅**: `cleanup()`은 헬퍼가 만든 3종만 지우므로, 테스트가 그 조직 아래 만드는 오더·패키지 등은 FK로 삭제를 막는다. `addCleanup(fn)`(등록 역순 실행, 멱등) 같은 훅을 제공하고, 파일럿에서 실제로 사용해 검증한다.
⑤ **회귀 등재 방식 정정**: DoD의 "R-09 갱신 — freeze 공지 전 기존 방식"은 **폐기**(#1347 정정 코멘트 참조). `regression-items/TASK-1161_Issue1347_*.md` 1개 등재 + `npm run check:lrtm`(미등재 Vitest 래칫) 통과. `helpers/db.test.ts`는 신규 Vitest 파일이므로 등재 누락 시 래칫에 걸린다.
⑥ **`tracking-business-qa` 파일럿 조건**: 착수 시 `git log`로 **소유 팀을 먼저 확정**한다(설계 의견의 "Ring equiv" 추정은 근거가 약함). Team B 소유로 확인되면 제외하고 **파일럿 1건 + 헬퍼 테스트**로 DoD를 충족한 뒤 Aiden에게 보고한다. 이전 시 **단언(assertion)은 한 줄도 바꾸지 않고** 셋업·정리만 헬퍼로 교체해 "결과 동일"을 증명한다(고정 order ID 의존은 `createTestOrg`로 대체하되 테스트 의미 불변).
⑦ **검증 수치 갱신**: 기준선은 설계 의견의 254/1834가 아니라 **착수 시점 develop 최신 CI**(현재 263파일 안팎, #1387·#1384 머지 후 달라짐) 기준으로 기록한다. flaky는 **파일럿 파일 + `db.test.ts`를 연속 5회**(CI 또는 로컬) 실행해 0건 + 전체 회귀 1회 통과로 입증한다.

### 진행 방식
- 위 확정 내용을 task file `[설계 확정]` 섹션에 **원문 그대로 옮겨 기재**(가감 금지, R-17 — 해당 섹션은 Aiden 전속).
- `status:draft` 제거, `status:in-progress` 부여(R-17).
- 구현 착수 전 `git fetch` + 최신 develop 기준(#1387이 머지되면 `regression-items/` 구조가 develop에 있음). 머지 전이면 구현은 진행하되 등재(⑤)만 머지 후로 미룬다.
- 설계 브랜치(`feature/teama-task-1161-db-fixture-helper-design`)는 구현 브랜치로 이어 써도 되나, **develop 직접 커밋 금지**·PR 필수.


## 5.1 `[설계 확정]` 필수 조건 7건 — 이행 계획 (B_Kai 정리)

| # | 조건 | 조사·이행 방안 |
|:-:|:--|:--|
| ① | 로컬 전용 가드(R-14) | `getServiceClient`·`createTestOrg`·`cleanup` 진입 시 `SUPABASE_URL` 호스트가 `127.0.0.1`/`localhost`가 아니면 즉시 throw. `db.test.ts`에 원격 URL → throw 케이스 포함. `psql`은 docker 로컬 컨테이너만 대상으로 해석. |
| ② | `handle_new_user` 트리거 | **확인 완료**: `20260418002000_expand_identity_auth.sql:70-86`의 `AFTER INSERT ON auth.users` 트리거가 `20260418184000_sync_auth_metadata.sql`에서 고도화됨 — `raw_user_meta_data.org_id`로 조직을 찾아 `zen_profiles`를 **자동 INSERT**하고 `raw_app_meta_data`에 `org_type·role·status`만 동기화(`org_id`는 넣지 않음 → null 함정의 구조적 원인). 설계: `auth.users` INSERT 시 `raw_user_meta_data`에 `org_id`를 넣어 **트리거가 프로필을 생성하도록 두고**, 직후 `UPDATE zen_profiles SET role/status/org_id`로 원하는 값으로 정정. 트리거 억제·직접 이중 INSERT는 하지 않음. GoTrue admin API 대안은 service 키 HTTP 호출이 추가되어 불채택. |
| ③ | org_id 출처 일치 | RLS는 대부분 `zen_profiles.org_id`(auth.uid() 조인)를 읽고, JWT의 `app_metadata.org_id`는 미들웨어·일부 정책에서 사용. 헬퍼가 만드는 JWT 클레임과 DB 프로필 `org_id`가 항상 같도록 `assertOrgIdClaim(token, profileOrgId)`가 DB 값과도 대조. |
| ④ | 정리 확장 훅 | `addCleanup(fn)` 제공 — 등록 **역순(LIFO)** 실행, 멱등. 헬퍼가 만든 3종 외에 테스트가 만든 오더·패키지까지 정리하도록 파일럿 2건에서 실제 사용. |
| ⑤ | 회귀 등재 방식 | **#1387 미머지 확인(2026-11-18)** → 구현은 진행, 등재는 머지 후 `docs/08_Self_Audit/Checklists/regression-items/TASK-1161_Issue1347_*.md` 1개(`_TEMPLATE_item.md`) 추가 + `npm run check:lrtm` 통과. 머지 전에는 맵 본문에 섹션 번호를 임의 부여하지 않음. `db.test.ts`는 신규 Vitest 파일이므로 래칫 대상임을 인지. |
| ⑥ | `tracking-business-qa` 소유 확인 | `git log` 4건 전부 `EdwardKwon89`, 태그 `[Claude]`·`[Gemini]` → **Team B 소유 아님** 확인 → 파일럿 2건 진행. 이전 시 **단언은 한 줄도 변경하지 않고** 셋업·정리만 헬퍼로 교체해 "결과 동일" 증명. 고정 order ID 의존은 `createTestOrg`로 대체. |
| ⑦ | 검증 수치 갱신 | 기준선은 254/1834가 아니라 **착수 시점 develop 최신 CI**(실측 후 기록)로 갱신. flaky는 **파일럿 2건 + `db.test.ts` 연속 5회** + 전체 회귀 1회로 입증. |

- D_Kai 통지: 파일럿 1건 `p6-transport-policy.test.ts`에 대해 Issue #1347 코멘트로 통지(별도 협의 불필요 — Aiden 결정 3).
- 설계 브랜치 `feature/teama-task-1161-db-fixture-helper-design`를 구현 브랜치로 계속 사용. develop 직접 커밋 금지, PR 필수.

---

## 6. DoD (완료 정의)

- [x] `[설계 의견]` 작성 → Aiden `[설계 확정]` 완료(2026-11-18 11:50 KST, 5건 승인 + 조건 7건)
- [ ] 헬퍼 3종(+`addCleanup`·org_id 단언·로컬 가드)과 헬퍼 테스트, 사용 가이드
- [ ] 파일럿 이전 2건(`p6-transport-policy`·`tracking-business-qa`) 전/후 비교(결과 동일·시간·flaky 0/5회) — 조건 ⑥ 소유 확인 완료
- [ ] build·회귀 전체 PASS 수치, `src/`·`package.json`·lockfile 변경 0건, 기준선은 착수 시점 develop 최신 CI(조건 ⑦)
- [ ] 회귀 등재: #1387 머지 후 `regression-items/TASK-1161_Issue1347_*.md` + `check:lrtm`(조건 ⑤), R-17 완료 보고·`check-R17-DoD` 준수

## 7. `[작업 결과]`

_(구현 완료 후 기재 — 커밋 해시는 `scripts/insert-commit-hash.sh`로 자동 삽입)_
