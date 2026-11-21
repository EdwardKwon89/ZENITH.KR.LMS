# DEF-B-161 | 실DB 헬퍼 `createTestOrg()`가 만든 사용자가 GoTrue `GET /user`에 노출되지 않음 — authenticated 세션 검증 불가

| 항목 | 내용 |
|:-----|:-----|
| **발견 경위** | TASK-B-360(#1366) ⒝-2 Excel 출력 테스트가 Route Handler를 **실제 authenticated 세션**으로 호출해야 하는데, `setSession`/`getUser`가 전부 `403 user_not_found`("User from sub claim in JWT does not exist")로 실패. 원인 추적에 다수 라운드 소요(테스트 파일 → GoTrue 로그 → 스키마 대조) |
| **발견자 / 날짜** | Mike (Team B) / 2026-11-22 |
| **대상 파일** | `tests/integration/helpers/db.ts` (TASK-1161 / Issue #1347, B_Kai) — **본 Task 범위 밖** |
| **긴급도** | **Medium** (실제 인증이 필요한 테스트를 작성할 때마다 재발 — RLS JWT 검증은 가능하나 GoTrue 세션 검증은 불가) |
| **상태** | OPEN — 본 Task에서는 **해당 테스트 파일 안에서만** `auth.users` 보완(`makeGoTrueVisible`)으로 우회, 근본 수정은 별도 배정 |

## 현상 (재현)

```ts
const identity = await createTestOrg({ prefix: 'probe', role: 'AGENCY', orgType: 'AGENCY' });
const client = getUserClient(identity.jwt);
await client.auth.setSession({ access_token: identity.jwt, refresh_token: 'x' });
// → { error: AuthApiError "User from sub claim in JWT does not exist" (403)
//     또는 500 unexpected_failure) }
```

## 원인 (실측)

`createTestOrg`의 `INSERT INTO auth.users (id, email, raw_user_meta_data)`는 **최소 3개 컬럼만** 채운다.
이 스키마(`auth.users`)의 해당 컬럼들은 **DEFAULT가 없고 nullable**이라 나머지가 전부 `NULL`로 남는다.

GoTrue `GET /user`가 이 행을 스캔할 때 발생하는 두 단계 오류(auth 로그 실측):

1. `403 user_not_found` — `instance_id = NULL`인 행은 조회에서 빠진다.
2. `500 unexpected_failure` — 로그: `sql: Scan error on column index 3, name "confirmation_token": converting NULL to string is unsupported` (그 밖의 token 컬럼도 동일).

즉 **세션/프로필(PostgRLS JWT) 검증은 되지만 GoTrue 사용자 검증은 안 되는 행**이 만들어진다.

## 영향 범위

- `auth.getUser()`·`setSession`·`signInWithPassword` 등 **GoTrue 엔드포인트를 쓰는 모든 테스트**가 이 헬퍼 사용자로는 불가.
- 기존 실DB 테스트는 `validateUserAction` mock 또는 JWT 헤더만 쓰므로 **미발견 상태로 방치**됐다.
- 프로덕션 영향 **없음**(테스트 인프라 한정). 단, "실제 authenticated 세션으로 검증"(이슈 DoD·R-09 계열 요구사항)을 붙일 때마다 재발한다.

## 우회 (본 Task에서 사용 — 이 테스트 파일 한정)

```ts
function makeGoTrueVisible(identity: Identity) {
  psql(`UPDATE auth.users SET
      instance_id = '00000000-0000-0000-0000-000000000000',
      aud = 'authenticated', role = 'authenticated',
      encrypted_password = COALESCE(encrypted_password, ''),
      confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = '',
      phone_change_token = '', phone_change = '', email_change_token_current = '', reauthentication_token = '',
      email_change_confirm_status = 0,
      created_at = COALESCE(created_at, now()), updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = '${identity.userId}';`);
}
```

**주의 2건 (실측으로 확인)**
- `phone = ''`로 채우면 **`users_phone_key` 유니크 위반**으로 두 번째 사용자부터 UPDATE 실패 → `phone`은 **NULL 유지**.
- `confirmed_at`은 **생성 컬럼(GENERATED)**이라 직접 UPDATE 불가 → `email_confirmed_at`만 설정.

## 권장 조치

1. `createTestOrg`가 `auth.users`를 GoTrue가 읽을 수 있는 상태로 INSERT/UPDATE 하도록 헬퍼 내부에서 보완한다(위 컬럼 세트를 헬퍼로 이관).
2. `psql()`에 `ON_ERROR_STOP=1` 적용(DEF-B-160 권장과 동일 — 조용한 실패 차단).
3. 보완 후 본 Task의 `makeGoTrueVisible`는 삭제한다(중복 우회 제거).

## 참조

- 발견: `.agent/tasks/TASK-B-360_*_설계의견.md` [작업 결과] ⒝-2 (Issue #1366)
- 관련: DEF-B-160 (`createTestOrg` email 충돌 조용한 실패 — 동일 헬퍼)
