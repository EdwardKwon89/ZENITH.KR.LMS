# TASK-B-374 회귀 항목 — DEF-149 §1.1 대리점 소유권 검증 (Issue #1349)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | #1349 (Aiden 발령 2026-11-17 · Jaison 배정 Mike) |
| 담당 | Mike (Worker) / Auditor: Jaison |
| 변경 | `src/app/actions/agency/shippers.ts` — export 5개에 소유권 가드 `ownAgencyError()` + 거부 메시지 `trError` 4로케일 신규 키 `own_agency_only` |
| 검증 차원 (231 D1~D9) | `D1(정합성), D5(권한/RLS)` |

## 회귀 항목

| TC# | 시나리오 | 기대 | 테스트 파일 | 실행 |
|:----|:---------|:-----|:------------|:----:|
| TC-374-01 | **getAgencyShippers** — 대리점 A가 대리점 B의 `agencyOrgId` 조회 | 거부(`own_agency_only`) + 자기·`ZENITH_SUPER_ADMIN`은 성공 | `tests/integration/task-b374-shipper-ownership.test.ts` | CI (vitest) |
| TC-374-02 | **createAgencyShipper** — 타 대리점 명의 생성 | 거부 + **DB 불변**(연결 행 0 증가·Auth 계정 미생기·조직 미생성) / 자기 소속은 생성 성공(연결·할인율·계정 실측) | 동일 | CI (vitest) |
| TC-374-03 | **updateAgencyShipperGrade** — 타 대리점 연결 행 등급·할인율 수정 | 거부 + **값 불변** / 자기 성공(복원 포함) / SUPER_ADMIN 성공(원래 값 복원) | 동일 | CI (vitest) |
| TC-374-04 | **getAgencyShipperById** — 타 대리점 화주 상세 열람 | 거부 / 자기·SUPER_ADMIN 성공 | 동일 | CI (vitest) |
| TC-374-05 | **updateAgencyShipper** — 타 대리점 화주 정보·할인율 변조 | 거부 + **조직명·할인율 불변** / 자기 성공 / SUPER_ADMIN 성공 | 동일 | CI (vitest) |
| TC-374-06 | **getAgencyOrgIdByShipper**(`shipper-link.ts`) 점검 — 액션 내 가드 없음 → **RLS 방어 실측** | 대리점/화주 각각 자기 것은 반환, 타 대상은 `null` | 동일 | CI (vitest) |
| TC-374-07 | 오류 키 동기화 — `own_agency_only` 4로케일 | `errors-key-sync` 111키 PASS | `tests/unit/i18n/errors-key-sync.test.ts` | CI (vitest) |
| TC-374-08 | **R-10 UI 구동** — 대리점 화주 목록(`화주 관리`)·등록(`화주 등록`)·수정(이름 값 채워짐) 3화면 + **신규 `zen_error_logs` 0건** | 가드 추가 후 정상 경로 UI 회귀 없음 | `tests/e2e/e2e-32-b374-shipper-ownership-ui.spec.ts` | **CI 미실행/수동** (Playwright) |

**회귀 검증 (2026-11-23, 실측)**: 신규 통합 **6/6 PASS** · `errors-key-sync` **7/7 PASS** · R-10 E2E **1/1 PASS**(증적 `docs/99_Manual/E2E_B374_Result/` — 스크린샷 3 + 에러로그 JSON) · `npm run test:regression` → **296 files / 2,267 tests 전부 PASS** · `npm run build` → **exit 0** (`✓ Compiled successfully in 15.0s`) · `tsc` 관련 0건.

**되돌리기 검증 (조건별 — 가드를 하나씩 되돌려 각 테스트가 FAIL하는지 실측, 커밋 금지)**

| 조건 | 되돌리기 내용 | 결과 |
|:--|:--|:--|
| R1 | `getAgencyShippers` 가드 무효화 | **1 failed / 5 passed** (TC-374-01만 FAIL) |
| R2 | `createAgencyShipper` 가드 무효화 | **1 failed / 5 passed** (TC-374-02만 FAIL) |
| R3 | `updateAgencyShipperGrade` 가드 무효화 | **1 failed / 5 passed** (TC-374-03만 FAIL) |
| R4 | `getAgencyShipperById` 가드 무효화 | **1 failed / 5 passed** (TC-374-04만 FAIL) |
| R5 | `updateAgencyShipper` 가드 무효화 | **1 failed / 5 passed** (TC-374-05만 FAIL) |
| (기준선) | 원복 후 재실행 | **6/6 PASS** · `grep 되돌리기` **0건** |

> 각 런의 실패가 **해당 함수의 테스트 1건**에 한정됨을 실측했다("한 함수만 검증하는 구조" 아님). `afterEach`로 연결·조직 기본값을 복원해 런 간 상태 오염을 제거한 뒤 측정했다.

**주의 (R-09 v3.10)**: 회귀 맵 단일 파일에 `## N.` 추가 금지 — 본 파일이 등재 단위.

- **핫픽스 적용 메모(2026-11-23, main 기준)**: 이 변경은 TeamB_Dev 통합과 별개로 211 런북 §7 경로로 `main`에 선반영한다. main의 `Errors` 키 기준은 TeamB_Dev와 달라(**90 → 91**, TeamB_Dev는 110 → 111) `errors-key-sync` 기준값·키 목록을 main에 맞춰 조정했다. 나머지 변경(소스 1개·메시지 4개·테스트·증적)은 PR #1469와 동일.
