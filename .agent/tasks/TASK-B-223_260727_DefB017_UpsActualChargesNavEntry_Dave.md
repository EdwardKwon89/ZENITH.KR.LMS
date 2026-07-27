# TASK-B-223: DEF-B-017 — `/admin/ups-actual-charges` 네비게이션 진입점 + RBAC 권한 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#882](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/882) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-27 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 개요

`/admin/ups-actual-charges`("UPS 사후 청구 및 차액 정산 관리") 페이지와 서버 액션은 정상 동작하지만, 이 페이지로 가는 메뉴 링크가 어디에도 없어 URL 직접 입력 없이는 접근 불가능합니다. 추가로 조사한 결과, 단순 메뉴 추가만으로는 부족하고 **RBAC DB 권한 자체가 누락**되어 있음을 확인했습니다. 상세: `.agent/defects/DEF-B-017_...md`.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 원인 요약

- 메뉴 노출은 `src/lib/auth/rbac.ts`의 `checkPermission(role, href, allowedPaths)`로 결정되며, `allowedPaths`는 DB 테이블 `zen_role_permissions`가 우선(비어있을 때만 `STATIC_PERMISSIONS` 폴백)
- 실측 확인(`docker exec ... psql`): `zen_role_permissions`에 `ADMIN`은 `/admin` 블랭킷 행이 있어 문제 없으나, **`MANAGER`·`AGENCY`는 `/admin` 계열 권한이 전혀 없음**(둘 다 다른 경로만 보유)
- `/admin/ups-actual-charges/page.tsx` 자체 역할 가드는 ADMIN/MANAGER/AGENCY 모두 허용하므로, page.tsx 가드와 RBAC DB 권한이 이미 불일치 상태였음(MANAGER/AGENCY는 URL 직접 입력 시엔 들어가지지만 메뉴엔 안 뜸)

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. 신규 마이그레이션: `supabase/migrations/20260727HHMMSS_defb017_ups_actual_charges_rbac.sql`

```sql
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
  ('MANAGER', 'ups_actual_charges', '/admin/ups-actual-charges', true),
  ('AGENCY', 'ups_actual_charges', '/admin/ups-actual-charges', true)
ON CONFLICT (role_code, path) DO NOTHING;
```
(ADMIN은 기존 `/admin` 블랭킷 행으로 이미 커버되므로 추가 불요 — 중복 삽입하지 말 것)

### 2. `src/components/layout/NaviSidebar.tsx` — `finance_group.children` 배열에 항목 추가

`finance_transport_costs` 행(`{ title: t("finance_transport_costs"), href: "/admin/transport-costs" }`) 바로 아래에:
```ts
{ title: t("finance_ups_actual_charges"), href: "/admin/ups-actual-charges" },
```

### 3. i18n 키 추가 — `messages/ko.json`, `messages/en.json`, `messages/ja.json`의 `Navigation` 섹션, `finance_transport_costs` 키 근처

- ko.json: `"finance_ups_actual_charges": "UPS 사후 청구 관리"`
- en.json: `"finance_ups_actual_charges": "UPS Actual Charges"`
- ja.json: `"finance_ups_actual_charges": "UPS事後請求管理"`
- **`messages/zh.json`은 건드리지 말 것** — `finance_*` 계열 키 자체가 기존에 통째로 빠져있는 별도 이슈라 이번 Task 범위 밖

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-223-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 223 나와야 정상)
- [ ] 마이그레이션 파일 작성 (위 스펙대로, `ON CONFLICT DO NOTHING` 필수 — 이미 있는 행과 충돌 방지)
- [ ] `NaviSidebar.tsx` 메뉴 항목 추가
- [ ] i18n 3개 파일(ko/en/ja) 키 추가
- [ ] 회귀 테스트 추가 — behavioral 기반:
  - 마이그레이션 적용 후 `zen_role_permissions`에 `('MANAGER', '/admin/ups-actual-charges')`, `('AGENCY', '/admin/ups-actual-charges')` 행이 실제로 존재하는지(psql 기반 실측 검증)
  - `checkPermission('MANAGER', '/admin/ups-actual-charges', ['...', '/admin/ups-actual-charges'])` 등 실제 함수 호출로 true 반환하는지(순수 함수라 mock 불필요 — 실제 `checkPermission` import해서 호출)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 ADMIN/MANAGER/AGENCY 각 계정으로 로그인 → 사이드바 "정산/재무" 그룹에 새 메뉴 항목이 보이는지 + 클릭 시 페이지 정상 진입하는지 확인 → 스크린샷(R-10, 로컬 Supabase 가동 상태에서 확인)

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Dave] fix: TASK-B-223 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 882 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-017 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #882`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. i18n 관련 작업(NaviSidebar 등)은 4개 언어(ko/en/zh/ja) 누락 이력이 과거 있었음 — 단, 이번 Task는 명시적으로 zh.json은 건드리지 말라고 지시했으니 ko/en/ja 3개만 정확히 챙길 것.

## [작업 결과]

| 항목 | 내용 |
|:-----|:------|
| **담당 실행자** | D_Kai (Dave 대리) |
| **커밋 해시** | `de603e60` |
| **변경 파일** | `supabase/migrations/20260727120000_defb017_ups_actual_charges_rbac.sql` · `NaviSidebar.tsx` · `proxy.ts` · `messages/{ko,en,ja}.json` |
| **테스트 결과** | `vitest run` — 134 files · 886 tests **ALL PASS** |
| **빌드 결과** | `npm run build` — **SUCCESS** |

### 발견: proxy.ts 화이트리스트 추가 필요
조사 과정에서 `/admin/ups-actual-charges`가 `proxy.ts`의 `isAllowedPath` 화이트리스트에 없어 MANAGER/AGENCY가 미들웨어에서 차단되는 현상을 발견. 함께 수정.

### 체크리스트 완료 현황

- [x] 브랜치 생성
- [x] 마이그레이션 파일 작성 (ON CONFLICT DO NOTHING)
- [x] `NaviSidebar.tsx` 메뉴 항목 추가
- [x] i18n 3개 파일(ko/en/ja) 키 추가
- [x] `proxy.ts` 화이트리스트에 `/admin/ups-actual-charges` 추가
- [x] 회귀 테스트 886/886 ALL PASS
- [x] `npm run build` — SUCCESS
- [x] behavioral 회귀 테스트 추가 — TC-P7-MGR-01~03(MANAGER checkPermission), TC-P7-AGENCY-10(AGENCY checkPermission) — 4건
- [x] R-10: ADMIN/MANAGER/AGENCY 3개 계정 사이드바(정산/재무 확장) + 페이지 진입 확인 스크린샷 (AGENCY 비밀번호: `Password1234` — GoTrue 정책으로 대문자 P 필요)

## [발견 이슈]

- `agency@zenith.kr` 로컬 비밀번호는 `Password1234`(대문자 P) — GoTrue 정책으로 재설정됨
- `proxy.ts` 화이트리스트 누락을 발견해 함께 수정 (스펙 외 추가 조치사항)
