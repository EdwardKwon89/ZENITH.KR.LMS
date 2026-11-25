# [TASK-B-373 PR-2] 요율 조회 6종 역할 가드 + 견적 응답 DTO (Issue #1362)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-373 PR-2 / [#1362](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1362) |
| **팀 / 작성일** | Team B / 2026-11-25 |
| **대상 모듈 (231 연동)** | `src/app/actions/ups/rates.ts`, `rates-public.ts`, `rates-mutation.ts`, `pricing-schedule.ts`, `src/lib/auth/ups-rate-permissions.ts`, `src/lib/ups/estimate-core.ts`, `src/lib/ups/estimate-dto.ts`, `src/app/actions/ups/freight.ts` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-25, Dave** — 가드 C안(기본요율만 SUB_ADMIN, 나머지 5종은 ADMIN·MANAGER·ZENITH_SUPER_ADMIN)을 적용하고, 견적 응답을 세션 역할·소속 기반 DTO로 최소화했습니다. `/agency/other-charges`는 공개 판매가 조회로 전환했습니다. **DB 마이그레이션 없음**.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-373-10 | 기본요율 — SUB_ADMIN 포함 관리자 4역할 허용 | 조회 성공 | `tests/unit/auth/ups-rate-permissions.test.ts` |
| TC-373-11 | 기본요율 — 그 외 역할 | `permission_denied` 거부 | 동일 |
| TC-373-12 | 원가 5종(유류·부가·급증·구간·최소) — 비관리자 | `permission_denied` 거부 | 동일 |
| TC-373-13 | 원가 5종 — 관리자 3역할 | 조회 성공(양성 대조) | 동일 |
| TC-373-14 | 견적 DTO — 관리자 | 원가·판매가·단계 전체 포함 | `tests/unit/ups/freight-estimate-dto.test.ts` |
| TC-373-15 | 견적 DTO — 대리점 | 원가 미포함, 자기 단계 포함 | 동일 |
| TC-373-16 | 견적 DTO — 소속 화주 | 플랫폼 판매가·대리점 단계 미포함 | 동일 |
| TC-373-17 | 견적 DTO — 비소속 화주 | 플랫폼 판매가만 포함 | 동일 |
| TC-373-18 | 범위 결정 — 대리점 미소속 화주 요청 | 계산 범위에서 제외 | `tests/unit/ups/freight-action-scope.test.ts` |
| TC-373-19 | 범위 결정 — 화주 위장(타 org) 요청 | 세션 org로 고정 | 동일 |
| TC-373-20 | 공개 구간요율 — 만료 행 미반환 | 기준일(`valid_from`/`valid_until`) 필터 적용 | `tests/unit/ups/rates-public.test.ts` |
| TC-373-21 | `getAgencyPricingPolicies` — 비관리자 | 관리자급 가드 거부 | `tests/unit/auth/ups-rate-permissions.test.ts` |
| TC-373-22 | `getAgencyPricingPolicies` — ADMIN | 조회 성공(양성 대조) | 동일 |
| TC-373-23 | 소속 조회 오류 | 비소속 폴백 없이 예외(fail-closed) | `tests/unit/ups/freight-action-scope.test.ts` |
| TC-373-24 | 다중 소속 | 소속 미확정으로 예외 | 동일 |
| TC-373-25 | 대리점이 미소속 화주 지정 | `own_agency_only` 거부 | 동일 |
| TC-373-26 | OPERATOR | 입력 화주 기준·원가 미포함 | 동일 |
| TC-373-27 | 표시 동일성(소속/비소속 화주) | 총액·항목 행 동일 | `tests/unit/orders/ups-estimate-panel-dto-parity.test.tsx` |

**되돌리기 검증 (구현 유효성 — 테스트가 실제로 실패함을 증명)**:

| RST | 되돌린 구현 | 결과 | 복구 |
| :-- | :-- | :-- | :-- |
| RST-4 | 원가 조회 가드 1종 제거 | **4 failed** (TC-373-12) | 30/30 PASS |
| RST-5 | 소속 화주 DTO에 플랫폼 판매가 허용 | **1 failed** (TC-373-16) | 5/5 PASS |
| RST-6 | 소속 조회 오류를 비소속으로 폴백 | **1 failed** (TC-373-23) | 12/12 PASS |
| RST-7 | `getAgencyPricingPolicies` 가드 제거 | **1 failed** (TC-373-21) | 27/27 PASS |

**회귀**: `npm run test:regression` PASS · `npm run build` SUCCESS · `check:ds11`/`check:doc-links`/`check:lrtm` 통과. mock 경로 20개 분류는 task file §5 참조.
