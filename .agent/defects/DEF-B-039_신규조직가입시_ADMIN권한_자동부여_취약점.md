# DEF-B-039 — 신규 조직 자가가입 시 ADMIN(플랫폼 전역 관리자) 권한 자동 부여 취약점

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 로컬에서 "master air" 대리점을 `/register`로 직접 가입·생성한 뒤, 신규 계정(`james@sntl.co.kr`)으로 오더를 조회했더니 다른 화주·대리점의 오더까지 검색되는 것을 발견 |
| **긴급도** | **즉시(Critical)** — 공개 회원가입 경로를 통한 플랫폼 전체 관리자 권한 획득 가능 |
| **현재 상태** | 미수정 — 코드가 프로덕션에 배포된 상태라면 지금도 동일하게 재현됨 |

## 결함 체인 (2개 결함이 겹쳐 발생)

### 결함 A — 신규 조직 생성 가입자에게 무조건 ADMIN 역할 부여

`src/app/[locale]/(auth)/login/actions.ts:151`
```js
// New Org creators: CARRIER org → CARRIER, others → ADMIN; Joinees → MEMBER; Individuals → USER.
role: isNewOrg ? (orgType === 'CARRIER' ? USER_ROLES.CARRIER : USER_ROLES.ADMIN) : (orgId === null ? USER_ROLES.INDIVIDUAL : USER_ROLES.USER),
```
`/register`에서 "신규 조직 생성"을 선택하면, **CARRIER를 제외한 모든 조직 유형(AGENCY/SHIPPER/CORPORATE/CUSTOMS/DELIVERY)의 가입자에게 `USER_ROLES.ADMIN`(플랫폼 전역 관리자)이 그대로 부여**된다. `ADMIN`은 이 시스템에서 `/admin/*` 전 경로 접근 + 전체 조직 데이터 조회가 가능한 최상위 역할(`rbac.ts:46` ROUTE_ACCESS 참조)로, 대리점/화주가 자기 조직 범위를 벗어나 전체 플랫폼을 볼 수 있게 됨.

DB 트리거 `handle_new_user()`(`supabase/migrations/20260609230000_fix_handle_new_user_role_from_metadata.sql:25`)도 동일 결함을 갖고 있음:
```sql
final_role := COALESCE(new.raw_user_meta_data->>'role', 'ADMIN');
```
`role` 메타데이터가 어떤 이유로든 누락되면 **기본값 자체가 ADMIN**으로 폴백 — 이중으로 위험.

### 결함 B — 조직 승인(approve_organization) 시 역할 재검토 없이 프로필 활성화

`supabase/migrations/20260515235000_fix_security_definer_org_rpcs.sql`의 `approve_organization()` RPC:
```sql
-- [E] Update profile statuses
UPDATE public.zen_profiles
SET status = 'ACTIVE'
WHERE org_id = target_org_id;
```
관리자가 신규 조직의 **사업자 정보만 검토**하고 승인 버튼을 누르면, 결함 A로 인해 이미 `role='ADMIN'`으로 생성돼 있던 가입자 프로필이 **역할 재검토·수정 없이 그대로 활성화(status: PENDING→ACTIVE)**됨. 승인 화면에 가입자의 역할이 노출되지 않는다면, 관리자는 자신이 승인하는 계정이 이미 전역 관리자 권한을 갖고 있다는 사실을 인지할 방법이 없음.

## 실측 확인 (로컬 DB)

```
zen_organizations: "master air" (AGENCY) — status=ACTIVE
zen_profiles: james@sntl.co.kr — role=ADMIN, status=ACTIVE, org_id=<master air>
```
가입~승인 전 과정에서 `role`이 한 번도 AGENCY로 정정되지 않고 그대로 ADMIN 상태로 활성화됨을 확인.

## 심각도 판단

코드가 프로덕션에 동일하게 배포돼 있다면, **공개 회원가입 페이지(`/register`)에서 누구든 "신규 조직 생성" + AGENCY/SHIPPER/CORPORATE 등 비-CARRIER 유형을 선택해 가입한 뒤, 관리자가 (역할을 알아채지 못한 채) 통상적인 사업자 승인만 해주면 즉시 플랫폼 전역 ADMIN 권한을 획득**하게 됨. 이미 운영 중인 프로덕션에 이 경로로 생성된 계정이 있는지 별도 감사(audit)가 필요할 수 있음.

## 수정 방향 (TASK-B-265에 배정)

### 1. `login/actions.ts` — org_type별 정확한 역할 매핑
```js
const ORG_TYPE_TO_ROLE: Record<string, string> = {
  CARRIER: USER_ROLES.CARRIER,
  AGENCY: USER_ROLES.AGENCY,
  SHIPPER: USER_ROLES.SHIPPER,
  CORPORATE: USER_ROLES.CORPORATE,
  CUSTOMS: USER_ROLES.CUSTOMS_BROKER,
  DELIVERY: USER_ROLES.DELIVERY_AGENT,
};
// ...
role: isNewOrg
  ? (ORG_TYPE_TO_ROLE[orgType ?? ''] ?? USER_ROLES.CORPORATE) // ADMIN 폴백 절대 금지
  : (orgId === null ? USER_ROLES.INDIVIDUAL : USER_ROLES.USER),
```
`PLATFORM` 조직 유형은 자가가입 대상에서 제외(애초에 UI 선택지에 없어야 함 — 있다면 함께 확인).

### 2. `handle_new_user()` DB 트리거 — ADMIN 폴백 제거
```sql
final_role := COALESCE(new.raw_user_meta_data->>'role', 'CORPORATE'); -- 'ADMIN' 폴백 금지
```
신규 마이그레이션으로 `CREATE OR REPLACE FUNCTION public.handle_new_user()` 재정의.

### 3. (방어 심화, 권장) `approve_organization()` RPC 하드닝
승인 시점에 해당 org의 프로필 중 `role`이 `ADMIN`/`MANAGER`/`ZENITH_SUPER_ADMIN`인 경우 승인을 막거나 경고하는 가드 추가 검토(결함 A가 재발해도 결함 B가 최후 방어선이 되도록). 필수는 아니나 강력 권장.

### 4. (별도 확인 필요, 이번 Task 범위 밖 — Aiden/JSJung 보고 필요) 프로덕션 기존 계정 감사
`SELECT id, email, role, org_id FROM zen_profiles WHERE role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')`로 프로덕션 DB에서 org_type이 PLATFORM이 아닌데 ADMIN 역할을 가진 계정이 있는지 확인 — 있다면 즉시 역할 재조정 필요. **이 항목은 TASK-B-265 구현자가 아니라 JSJung이 프로덕션 접근 권한으로 직접 확인해야 함.**

## 회귀 테스트 (필수)

- `signup()` 호출 시 `is_new_org=true` + 각 org_type(AGENCY/SHIPPER/CORPORATE/CUSTOMS/DELIVERY/CARRIER)별로 정확한 역할이 metadata에 담기는지(behavioral, `supabase.auth.signUp` 호출 인자 캡처)
- `is_new_org=true` + 알 수 없는/누락된 org_type일 때 ADMIN이 아닌 안전한 기본값(CORPORATE)으로 폴백하는지
- `handle_new_user()` 트리거: role 메타데이터 누락 시 ADMIN이 아닌 안전한 기본값으로 폴백하는지(로컬 DB 직접 트리거 실행 검증 — RLS 세션 시뮬레이션 패턴 재사용)
- **되돌리기 검증 필수** — 수정 전 상태로 되돌려서 "AGENCY 신규가입 시 role=ADMIN" 증상이 실제 재현되는지 확인 후 결과를 task file에 기재. 이번 Task의 핵심 안전장치이므로 반드시 실제 재현할 것.
