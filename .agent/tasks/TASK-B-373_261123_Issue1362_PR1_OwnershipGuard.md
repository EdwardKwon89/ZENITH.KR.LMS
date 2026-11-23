# TASK-B-373 PR-1 — 대리점 부가요금 소유권 가드 (Issue #1362 / Aiden 2026-11-23)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1362](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1362) — DEF-151 후속 (Aiden 신규 지시) |
| **Task** | TASK-B-373 **PR-1** (설계 의견 PR #1476과 분리) |
| **담당** | Dave (Team B) |
| **검증** | Jaison / Aiden |
| **브랜치** | `feature/teamb-task-b373-pr1-other-charges-ownership` (base `origin/TeamB_Dev` a4a6d3101) |
| **상태** | 🔔 구현 완료 (Aiden 병합·main 이식 검토) |
| **설계 의견** | PR #1476 (`Refs #1362`) — 전체 DEF-151 설계 |
| **마이그레이션** | **없음** |

## 1. 범위

`src/app/actions/agency/other-charges.ts` 3개 액션의 **대리점 소유권 검증**(교차 테넌트 접근 차단).

- `getAgencyOtherCharges(agencyOrgId)`: 조회 전 `agencyOrgId === profile.org_id` 검증
- `upsertAgencyOtherCharge(agencyOrgId, data)`: **쓰기 전** 검증(사후 재확인 없음)
- `deactivateAgencyOtherCharge(id)`: 선조회로 대상 행 `agency_org_id` 확인 + 조건부 UPDATE `.eq('id').eq('agency_org_id', row.agency_org_id)`
- `ZENITH_SUPER_ADMIN` 예외(#1469와 동일), 거부 시 `logger.warn` + `own_agency_only`(main 기존 키, 4로케일)
- **PR-1 최소 diff 조건 준수**: `shippers.ts` 미수정, 새 파일·새 오류 키 없음. `ownAgencyError`는 `other-charges.ts` **파일 내부 지역 헬퍼**(동일 로직 소규모 중복 허용) — Aiden main 이식성.
- `createAdminClient()`는 가드 통과 후 유지(#1469 패턴).
- **장기 IMP 제안**: 이 테이블의 DB 정책(`agency_own`/`admin_all`)을 활용해 세션 클라이언트로 전환하면 DB가 격리를 강제한다. 이번 PR-1은 Aiden 요청대로 #1469 패턴 유지.

## 2. 변경 파일

| 파일 | 변경 |
|:--|:--|
| `src/app/actions/agency/other-charges.ts` | 지역 `ownAgencyError` + 3개 액션 가드(쓰기 전/선조회+조건부 UPDATE) |
| `tests/integration/task-b373-other-charges-ownership.test.ts` | 실DB·실제 세션 3케이스(거부+DB 불변, 자기/SUPER 양성, 되돌리기) |
| `tests/unit/agency/other-charges-actions.test.ts` | 기존 mock 체인에 선조회·조건부 UPDATE 반영(레거시 단위 테스트 유지) |
| `docs/02_Analysis/ds11/Ds_11_11A_UPS_Rates.md` | 11.3 3개 액션 권한·소유권 검증 |
| `docs/08_Self_Audit/Checklists/regression-items/TASK-B-373_Issue1362_other-charges-ownership.md` | 회귀 항목 9건 + RST 3건 |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | `npm run build:lrtm` 자동 갱신 |

- `git diff --stat origin/TeamB_Dev...HEAD` — 최종 커밋 후 PR에 기재.

## 3. 테스트 (R-09)

| ID | 내용 | 결과 |
|:--|:--|:--|
| TC-373-01~03 | `get`: B 거부 / 자기 성공 / SUPER 성공 | PASS |
| TC-373-04~06 | `upsert`: B 거부 + **값·행 수·신규 행 불변** / 자기 성공 / SUPER 성공 | PASS |
| TC-373-07~09 | `deactivate`: B 거부 + **is_active 불변** / 자기 성공 / SUPER 성공 | PASS |

- 실행: `npx vitest run tests/integration/task-b373-other-charges-ownership.test.ts` → **3/3 PASS**.
- 실제 세션: `createTestOrg`(JWT) + `getUserClient` + 실제 `createAdminClient()`. `validateUserAction`만 모의, `checkPermission`은 실제 rbac.
- **되돌리기(함수별)**:

| RST | 되돌린 구현 | 결과 | 복구 |
|:--|:--|:--|:--|
| 1 | `get` 가드 제거 | **1 failed / 2 passed** | 3/3 PASS |
| 2 | `upsert` 가드 제거 | **1 failed / 2 passed** | 3/3 PASS |
| 3 | `deactivate` 가드 제거 | **1 failed / 2 passed** | 3/3 PASS |

## 4. 회귀·빌드·Ds-11

- `npm run test:regression`: **297파일 / 2,271케이스 전부 PASS** (exit 0, 683s).
- `npm run build`: **성공** (라우트 테이블 정상 출력).
- `npm run check:ds11`: **OK** — 허용 목록 밖 신규 미반영 0건.
- `npm run build:lrtm` / `check:lrtm`: **OK**(유령 경로 0, 허용 목록 밖 신규 미등재 0, 신규 항목 24건).

## 5. [작업 결과]

- 코드 커밋: `ed706a82d` (`[Dave] fix: TASK-B-373 PR-1 …`), 단위 테스트 보정 커밋은 아래 PR 참조.
- 구현·테스트·Ds-11·회귀 항목 완료. **DB 마이그레이션 없음**, `shippers.ts` 무변경, 새 키 없음.
- PR: (작성 후 갱신) — `Refs #1362`, base `TeamB_Dev`.
- `git diff --stat origin/TeamB_Dev...HEAD`: (최종 커밋 후 기재)
- **발견 이슈**: 없음.
- **주의**: PR-1은 `TeamB_Dev` 기준 최소 diff이며, Aiden이 211 런북 §7(main 기반 선반영)로 이식 검토.
