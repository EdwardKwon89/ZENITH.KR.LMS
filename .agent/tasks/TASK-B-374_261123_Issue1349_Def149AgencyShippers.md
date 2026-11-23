# TASK-B-374 — DEF-149 §1.1 `agency/shippers.ts` 대리점 소유권 검증 누락(교차 테넌트 IDOR) 수정 (#1349)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1349](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1349) (Aiden 발령 2026-11-17 · Jaison 배정 2026-11-22) |
| 담당 | **Mike (Worker)** / Auditor: **Jaison** · Aiden 발령 → **PR은 `Refs #1349` (Close는 Jaison 수동)** |
| 브랜치 | `feature/teamb-task-b374-iss1349-def149-agency-shippers` (base: `origin/TeamB_Dev` `83bb486f1`) |
| 상태 | 🔔 완료 (PR 검토 대기) |
| 긴급도 | **p1 / defect:high** — 대리점 계정이 service_role 경유로 타 대리점 화주 열람·변조 가능 |
| 환경 | 로컬 Supabase 한정 (R-14) |

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "TASK-B-374"   # → 없음 (신규 생성)
# next-task-number.sh는 쓰지 않음 (이슈 지시: 371~374 task file 부재로 낮은 값 출력 가능 → 확정번호 TASK-B-374 사용)
```

## [목표]

`src/app/actions/agency/shippers.ts`의 export 액션 **5개**에 **호출자 대리점 소유권 검증**을 추가해 교차 테넌트 IDOR를 차단한다. 동일 폴더 `zone-discounts.ts`의 정상 구현(`agencyOrgId !== profile.org_id` 거부)을 대조 기준으로 삼는다.

## [범위]

**수정**: `getAgencyShippers` · `createAgencyShipper` · `updateAgencyShipperGrade` · `getAgencyShipperById` · `updateAgencyShipper` (5개)에 소유권 가드 + 거부 메시지 `trError` 전환(4로케일 신규 키) + `logger.warn`.

**점검(수정 여부는 실측 후 결정)**: `agency/shipper-link.ts`의 `getAgencyOrgIdByShipper` — 호출처 전수 + RLS 정합 확인.

**하지 않는 것**: DEF-149 §1.2·§1.3(Team A 파일) · 로케일 전면 전환 · `ZenDataGrid` 등 공용 컴포넌트 · `scratch/`(R-15).

## [지켜야 할 것]

- **R-09 (핵심)**: 대리점 A 세션이 **대리점 B**의 `agencyOrgId`/`shipperId`로 **5개 전부** 호출 → 거부, 자기 대리점·`ZENITH_SUPER_ADMIN`은 성공. 거부 케이스는 **DB 변경 없음**(행 수·값 불변)까지 단언. **mock·소스 문자열 검사·`test.skip` 금지** → `grep -rnE "readFileSync|toContain\(.*source|typeof .* === 'function'|test\.skip|\.skip\(" <신규테스트>` **0건**
- **되돌리기 실측**: 5개 함수 각각을 **개별적으로** 되돌려(로컬만, 커밋 금지) 해당 테스트가 FAIL하는 것을 표로 기재. "한 함수만 검증하는 구조"는 불가
- **R-20**: 호출처 `grep` 전수(명령·건수 기재, GitNexus 미연결 시 명시)
- **R-12**: 같은 PR에서 Ds-11 갱신(Riley TASK-1159가 "가드 없음"으로 기재한 부분과 일치)
- **R-10**: 대리점 화주 화면 구동 증적 + `/admin/error-logs` 신규 ERROR 無
- 거부 반환 전 `logger.warn()`

## [R-20 영향도] — GitNexus 미연결 → `grep` 전수 (실측)

`grep -rn "<함수명>" src tests --include=*.ts --include=*.tsx | grep -v "actions/agency/shippers.ts" | wc -l`:

| 함수 | 호출처(파일 제외) | src 내 호출부 | 정상 흐름 영향 |
|:--|:-:|:--|:--|
| `getAgencyShippers` | 11건 | `agency/{page,settlements,ups-rates,shippers}/page.tsx`, `agency/statements/new/page.tsx` — **전부 `profile.org_id` 전달** | 무영향 (가드 통과) |
| `createAgencyShipper` | 4건 | `shippers/new/shipper-form.tsx` (`agencyOrgId` prop = 부모가 `profile.org_id` 전달), `actions/agency/index.ts` 재export, 단위테스트 mock | 무영향 |
| `updateAgencyShipperGrade` | 1건 | `actions/agency/index.ts` 재export — **UI 호출처 없음**(서버 액션 직접 호출 공격면) | 무영향 |
| `getAgencyShipperById` | 2건 | `shippers/[id]/edit/page.tsx` (URL id, 자기 화주) | 무영향 |
| `updateAgencyShipper` | 4건 | `shippers/[id]/edit/edit-form.tsx` (`shipper.id`), 재export, 단위테스트 mock | 무영향 |
| `getAgencyOrgIdByShipper` | 14건 | `shipper/ups-rates/page.tsx`(자기 org), `UpsFreightEstimateSection.tsx`, Orders 단위테스트 mock — **액션 내 가드 없음 → RLS로 방어 확인(TC-374-06)** | 무영향 |

- **GitNexus 미연결(stale)** → 위 grep 전수으로 대체했음을 명시한다.
- 실제 화면 구동까지 **R-10 E2E(TC-374-08)** 로 확인 — 목록·등록·수정 3화면 정상 렌더(스크린샷 실측).

## [DoD] (이슈 [요청 사항]·요구 조건 기준)

- [x] 5개 함수에 소유권 검증 + `ZENITH_SUPER_ADMIN` 예외(근거 task file 기재)
- [x] 거부 메시지 `trError` 4로케일 신규 키 + `errors-key-sync` 키 수 갱신
- [x] R-09: 5개 함수 전부 거부/허용 실측 + **DB 변경 없음** 단언 (mock·소스 검사 0건)
- [x] 되돌리기 조건별 실측표 (5개 함수 각각 FAIL)
- [x] `shipper-link.ts` 점검 결과 기재
- [x] R-12 Ds-11 갱신 + `check:ds11` OK
- [x] R-10 UI 구동 증적 + error-logs 신규 無
- [x] `npm run test:regression` 전체 PASS + `npm run build` PASS
- [x] `git diff origin/TeamB_Dev...HEAD -- scratch` 빈 출력

## [작업 결과]

### 착수 절차 실측 (R-17)
```bash
① pwd                                  → /Users/am/Documents/workspace/SNTL_LMS/ZENITH_LMS-worktrees/mike
② git branch --show-current            → feature/teamb-task-b374-iss1349-def149-agency-shippers
   (origin/TeamB_Dev `83bb486f1` = PR #1445 병합본에서 생성)
③ ls .agent/tasks | grep -i TASK-B-374 → 없음 (신규 생성 · next-task-number 미사용 — 이슈 확정번호 TASK-B-374)
④ ./scripts/check-db-freshness.sh      → OK (pending 0)
⑤ 라벨 status:open → status:in-progress → (완료 시) status:review
```

### 구현 (`src/app/actions/agency/shippers.ts` + 오류 키 4로케일)

| 항목 | 내용 |
|:--|:--|
| **소유권 가드** `ownAgencyError(profile, targetAgencyOrgId, where)` | 쿼리 전(또는 조직 UPDATE 전)에 `targetAgencyOrgId === profile.org_id` 확인 → 불일치 시 **`logger.warn` + `trError('own_agency_only')`** |
| **5개 함수 적용** | `getAgencyShippers`(인자 검증) · `createAgencyShipper`(생성 부수효과 **전**) · `updateAgencyShipperGrade`(행 `agency_org_id` 조회 후 검증) · `getAgencyShipperById`(조회 후 검증) · `updateAgencyShipper`(link select에 `agency_org_id` 추가 → 조직 UPDATE **전**) |
| **`ZENITH_SUPER_ADMIN` 예외 근거** | `rbac.ts` `checkPermission()`: "ZENITH_SUPER_ADMIN (Bypass) - 모든 권한 허용"(`:75-78`) — **기존 `/agency` 권한 정책과 정합**하기 위해 동일하게 예외 처리 (task file 근거 기재 지시 준수) |
| **오류 메시지** | 신규 키 **`own_agency_only`** 4로케일(ko `본인 소속 대리점만 처리할 수 있습니다.` / en / zh / ja) + 기존 영문 `Unauthorized access` **3곳을 `trError('permission_denied')`로 전환**(수정 함수에 한해) → `Errors` **110 → 111키**, `errors-key-sync` baseline 갱신 **7/7 PASS** |
| **역마진 가드(미적용 — 범위 명시)** | `validateAgencyReverseMargin()`은 **`zone_id` 인자 필수**(zone 요율 전용)인데 등급·할인율 액션엔 zone 컨텍스트가 없어 그대로 적용 불가 → 본 Task 미적용 · **IMP 제안 #1467**로 추적 |
| **`shipper-link.ts` 점검 결과** | 액션 내 소유권 가드는 없으나 **일반 세션 클라이언트라 `zen_agency_shippers` RLS가 적용됨을 실측** — 대리점·화주 각각 자기 연결만 반환, 타 대상은 `null` → **수정 불필요** (Ds-11에도 기재, TC-374-06) |

### 테스트 (실제 서버 액션 + 실JWT 세션 + 실DB, mock 금지 대상은 DB가 아닌 가드·email만)

`tests/integration/task-b374-shipper-ownership.test.ts` **6/6 PASS**

| TC | 내용 |
|:--|:--|
| TC-374-01~05 | **5개 함수 전부**: 대리점A → 대리점B 대상 = 거부 · 자기 = 성공 · `ZENITH_SUPER_ADMIN` = 성공. 거부 시 **DB 불변**(연결 행 수·조직명·할인율·등급·Auth 계정 수)까지 단언 |
| TC-374-06 | `getAgencyOrgIdByShipper`: RLS 방어 실측(자기 반환 / 타 대상 `null`) |
| TC-374-07 | `errors-key-sync` 111키 **7/7 PASS** |
| TC-374-08 | **R-10 E2E** `tests/e2e/e2e-32-b374-shipper-ownership-ui.spec.ts` **1/1 PASS** — 목록(`화주 관리`)·등록(`화주 등록`)·수정(이름 값 채워짐) 3화면 + **신규 `zen_error_logs` 0건** |

- **위반 패턴 grep 0건** (`readFileSync`·소스 `toContain`·함수 타입 단언·테스트 생략)
- 증적: `docs/99_Manual/E2E_B374_Result/` — 스크린샷 3(공백 아님을 직접 확인) + `R10_에러로그_확인.json`(`delta: 0`)
- `admin/error-logs` 원천인 `zen_error_logs`: 흐름 전후 **count 동일(delta 0)** · 최근 10분 행도 기록

### 되돌리기 검증 (조건별 — 가드를 **하나씩** 무효화, 로컬만·커밋 금지 → 원복)

| 조건 | 되돌리기 | 결과 (failed / passed) |
|:--|:--|:--|
| **R1** | `getAgencyShippers` 가드 무효화 | **1 failed / 5 passed** (TC-374-01만) |
| **R2** | `createAgencyShipper` 가드 무효화 | **1 failed / 5 passed** (TC-374-02만) |
| **R3** | `updateAgencyShipperGrade` 가드 무효화 | **1 failed / 5 passed** (TC-374-03만) |
| **R4** | `getAgencyShipperById` 가드 무효화 | **1 failed / 5 passed** (TC-374-04만) |
| **R5** | `updateAgencyShipper` 가드 무효화 | **1 failed / 5 passed** (TC-374-05만) |
| (기준선) | 원복 후 재실패 없음 + `grep 되돌리기` **0건** | **6/6 PASS** |

> **측정 정확성 보정(실측 과정 기록)**: 초판 측정에서는 (a) 정리 쿼리의 `LIKE 'b374_%'`가 **대소문자를 구분**해 대문자 조직명이 남아 잔여 오염으로 추가 실패가 났고, (b) 실패한 런이 연결·조직 상태를 복원하지 않아 다음 런에 **연쇄 실패**가 났다. → `ILIKE` 정리 + `afterEach` 기본값 복원을 추가한 뒤 재측정에서 **각 조건 정확히 1건 FAIL**을 확보했다.

### C. 검증 (전부 재실행)
- `npm run test:regression` → **296 files / 2,267 tests 전부 PASS**
- `npm run build` → **exit 0** (`✓ Compiled successfully in 15.0s`)
- `check:ds11` OK(Ds-11_11B 5개 함수 권한·오류 항목 갱신) · `check:lrtm` OK(TC-374-08 등재) · `check:doc-links` OK · `check:audit` OK · `tsc` 관련 **0건**
- `git diff origin/TeamB_Dev...HEAD -- scratch` → **출력 없음** (R-15)

### 발견 이슈
**없음** (범위 밖 결함 미발견 — DEF-149 §1.2·§1.3은 Team A 범위, `shipper-link.ts`는 RLS로 방어 확인되어 수정 불필요).

### 개선 제안
- **IMP 제안 #1467** — `updateAgencyShipperGrade`의 역마진(정책 할인율) 가드 검토 (위 "역마진 가드" 항목 근거)

## [발견 이슈]

없음 (범위 밖 결함 미발견 · `shipper-link.ts`는 RLS 방어 확인으로 수정 불필요). 개선 제안은 **IMP 제안 #1467** 등록.
