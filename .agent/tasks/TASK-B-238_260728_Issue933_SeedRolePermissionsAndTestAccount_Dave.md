# TASK-B-238: Issue #933 — seed-local.ts에 RBAC 데이터 + 테스트 계정 추가

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#933](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/933) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 개요

로컬 DB가 `supabase db reset`으로 초기화되면서 수동으로 만들었던 `jungjs72@gmail.com` shipper 테스트 계정이 사라진 것을 JSJung이 확인. RBAC 관련 데이터(`zen_role_permissions`)는 마이그레이션으로 이미 재현되지만 시드 스크립트 자체에는 명시적으로 들어있지 않음. JSJung 확정: 실행 가능한 seed 코드로 `scripts/seed-local.ts`에 추가.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `jungjs72@gmail.com` 테스트 계정 추가

`shipperOrg`(Global Shipper Corp, 기존 재사용)에 소속된 SHIPPER 역할 계정으로 추가. 비밀번호는 `createUser()` 헬퍼가 내부적으로 `password1234`로 고정 생성하므로 별도 처리 불필요.

`main()` 함수의 기존 계정 생성 블록(873~879행 근처, `shipper@zenith.kr` 생성 라인 바로 아래)에 추가:
```ts
await createUser(supabase, 'jungjs72@gmail.com', 'JSJung Shipper Test', 'CORPORATE', shipperOrg.id, 'CUSTOMER');
```

### 2. `zen_role_permissions` RBAC 데이터 명시적 시딩 추가

현재 마이그레이션(`20260727120000_defb017_ups_actual_charges_rbac.sql`)으로만 존재 — `db reset` 시엔 재현되지만 seed 스크립트 자체에는 없어서 한눈에 안 보임. 신규 함수 추가:

```ts
async function seedRolePermissions(supabase: any) {
  console.log('\nSeeding zen_role_permissions (RBAC, DEF-B-017 등)...');

  const permissions = [
    { role_code: 'MANAGER', menu_id: 'ups_actual_charges', path: '/admin/ups-actual-charges', is_allowed: true },
    { role_code: 'AGENCY', menu_id: 'ups_actual_charges', path: '/admin/ups-actual-charges', is_allowed: true },
  ];

  for (const p of permissions) {
    const { data: existing } = await supabase
      .from('zen_role_permissions')
      .select('id')
      .eq('role_code', p.role_code)
      .eq('path', p.path)
      .maybeSingle();
    if (existing) { console.log(`  - Exists: ${p.role_code} → ${p.path}`); continue; }
    const { error } = await supabase.from('zen_role_permissions').insert(p);
    if (error) console.error(`  - Failed: ${p.role_code} → ${p.path}`, error.message);
    else console.log(`  - Created: ${p.role_code} → ${p.path}`);
  }
}
```

`main()`에서 `seedAgencyRelationship(supabase);` 호출 이후 어딘가에 `await seedRolePermissions(supabase);` 추가.

**주의**: 이 함수의 목록이 실제 마이그레이션(`20260727120000_defb017_ups_actual_charges_rbac.sql`)의 INSERT 내용과 항상 일치하도록 유지할 것.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-238-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 238 나와야 정상)
- [ ] 위 스펙대로 `scripts/seed-local.ts` 수정
- [ ] `npm run db:seed`(또는 `supabase db reset --yes`) 실행 후 실측:
  - `auth.users`에 `jungjs72@gmail.com` 존재, `jungjs72@gmail.com`/`password1234`로 실제 로그인 가능한지 확인
  - `zen_role_permissions`에 두 행이 정확히 존재하는지(재실행 시 중복 삽입 안 되는지 멱등성도 확인)
  - 결과를 완료 보고에 정확히 기재
- [ ] `npm run test:regression` 직접 실행 후 정확한 결과 기재(시드 스크립트 자체는 회귀 테스트 대상 아님 — 기존 테스트에 영향 없는지만 확인)
- [ ] R-10 해당사항 없음(시드 스크립트) — 실측 로그인 성공 여부를 완료 보고에 기재하는 것으로 대체

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] chore: TASK-B-238 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 933 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #933`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 무관한 과거 task file을 건드리지 않도록 주의(과거 TASK-B-164 오염 사례 참고).

## [작업 결과]

| 항목 | 내용 |
|:-----|:------|
| **담당 실행자** | D_Kai (Dave 대리) |
| **커밋 해시** | `41a39d69` |
| **변경 파일** | `scripts/seed-local.ts` |
| **테스트 결과** | `vitest run` — 140 files · 943 tests **ALL PASS** (회귀 영향 없음) |
| **실측 검증** | `npm run db:seed` — jungjs72@gmail.com 생성 확인 · 로그인 OK · RBAC 중복 없음(멱등) |

### 체크리스트 완료 현황

- [x] 브랜치 생성
- [x] `scripts/seed-local.ts` 수정 — test account + seedRolePermissions 함수 + main() 호출
- [x] `npm run db:seed` 실행 후 실측:
  - `auth.users`에 `jungjs72@gmail.com` 존재 확인 ✅
  - `jungjs72@gmail.com` / `password1234` 로그인 성공 ✅
  - `zen_role_permissions`에 MANAGER/AGENCY 2행 존재 (재실행 중복 없음, 멱등) ✅
- [x] `npm run test:regression` — 943/943 ALL PASS (기존 테스트 영향 없음)
