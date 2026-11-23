# [TASK-B-373 PR-1] 대리점 부가요금 소유권 검증 (Issue #1362 / Aiden 2026-11-23)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-373 PR-1 / [#1362](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1362) |
| **팀 / 작성일** | Team B / 2026-11-23 |
| **대상 모듈 (231 연동)** | `src/app/actions/agency/other-charges.ts` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-23, Dave** — Aiden 지시(2026-11-23 20:02 KST). `getAgencyOtherCharges`·`upsertAgencyOtherCharge`·`deactivateAgencyOtherCharge`가 `checkPermission('/agency')`만 확인하고 `createAdminClient()`로 RLS를 우회해, 대리점 A가 대리점 B의 행을 조회·변경·비활성화할 수 있던 교차 테넌트 접근을 #1469와 동일 패턴으로 차단했습니다. **DB 마이그레이션 없음**, 새 오류 키 없음(`Errors.own_agency_only` 재사용), `shippers.ts` 미수정(파일 내부 지역 헬퍼).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-373-01 | A 세션 → `getAgencyOtherCharges(B)` | `own_agency_only` 거부 | `tests/integration/task-b373-other-charges-ownership.test.ts` |
| TC-373-02 | A 세션 → 자기 `getAgencyOtherCharges(A)` | 자기 행 포함, B 행 미포함 | 동일 |
| TC-373-03 | SUPER_ADMIN → `getAgencyOtherCharges(B)` | B 행 조회 성공(양성 대조) | 동일 |
| TC-373-04 | A 세션 → `upsertAgencyOtherCharge(B, …)` | `own_agency_only` 거부 + **B 행 값·행 수 불변**, 신규 행 0 | 동일 |
| TC-373-05 | A 세션 → 자기 `upsertAgencyOtherCharge(A, …)` | 성공 + 값 반영 | 동일 |
| TC-373-06 | SUPER_ADMIN → `upsertAgencyOtherCharge(B, …)` | 성공 + 값 반영(측정 후 복원) | 동일 |
| TC-373-07 | A 세션 → `deactivateAgencyOtherCharge(B_row)` | `own_agency_only` 거부 + **B `is_active` 불변** | 동일 |
| TC-373-08 | A 세션 → 자기 `deactivateAgencyOtherCharge(A_row)` | 성공 + `is_active=false` | 동일 |
| TC-373-09 | SUPER_ADMIN → `deactivateAgencyOtherCharge(B_row)` | 성공 + `is_active=false`(측정 후 복원) | 동일 |

**되돌리기 검증 (구현 유효성 — 테스트가 실제로 실패함을 증명)**:

| RST | 되돌린 구현 | 결과 | 복구 |
| :-- | :-- | :-- | :-- |
| RST-1 | `getAgencyOtherCharges` 소유권 가드 제거 | **1 failed / 2 passed** (TC-373-01) | 3/3 PASS |
| RST-2 | `upsertAgencyOtherCharge` 소유권 가드 제거 | **1 failed / 2 passed** (TC-373-04) | 3/3 PASS |
| RST-3 | `deactivateAgencyOtherCharge` 소유권 가드 제거 | **1 failed / 2 passed** (TC-373-07) | 3/3 PASS |

**회귀 검증**: `npm run test:regression` → **297파일 / 2,271케이스 전부 PASS** (exit 0). `npm run build` → **성공**. 신규 통합 3건 + 기존 단위 3건 PASS.
**Ds-11**: `docs/02_Analysis/ds11/Ds_11_11A_UPS_Rates.md` 11.3에 3개 액션 권한·소유권 검증 추가. `npm run check:ds11` → **OK** (허용 목록 밖 신규 미반영 0건).
**R-10 UI 증적**: `docs/02_Analysis/evidence/task-b373/r10-{list,after-edit,after-deactivate}.png` — 대리점 실제 로그인으로 목록·수정 저장·비활성화 확인, 변경 후 `zen_error_logs` ERROR 0.
**발견 이슈**: 없음.
