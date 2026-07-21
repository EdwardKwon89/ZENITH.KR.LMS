# TASK-B-173: DEF-114 ROLE_PERMISSIONS AGENCY 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-22 |
| **담당자** | Dave |
| **연결 이슈** | [#655](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/655) |
| **우선순위** | P1 (Critical) |
| **상태** | 🔔 PR #656 (재작업 반영) |

## 개요

`ROLE_PERMISSIONS`에 `USER_ROLES.AGENCY` 항목이 없어 AGENCY 역할의 모든 창고관리 기능이 500 에러로 차단됨.

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:---------|
| `src/lib/logistics/status-machine.ts` | ROLE_PERMISSIONS에 AGENCY 추가 (REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/IN_TRANSIT) |
| `tests/unit/logistics/status-machine.test.ts` | TC-AG-T1~T9 AGENCY 권한 검증 9종 추가 |
| `tests/unit/warehouse/ups-pickup-inbound.test.ts` | TC-AG-INT-01~03 통합 검증 3종 추가 + attachOperatorNames mock 보강 |
| `tests/setup.ts` | server-only mock 추가 |
| `tests/__mocks__/server-only.ts` | vitest alias용 빈 모듈 |
| `vitest.config.ts` | server-only alias 추가 |
| `.agent/defects/DEF-114_AGENCY_ROLE_PERMISSIONS_누락_창고기능전체차단.md` | 결함 보고서 (OPERATOR 판단 포함) |

## OPERATOR 권한 판단

**현행 유지** (추가 권한 부여하지 않음)
- OPERATOR는 `WAREHOUSE_ROLES`에 포함되지 않아 warehouse 액션 게이트에서 차단됨
- PR#646에서 제안된 OPERATOR 확장(WAREHOUSED/PACKED/RELEASED/IN_TRANSIT)은 실효성 없음
- AGENCY에 창고 상태 권한을 추가하는 것으로 충분

## 검증

| 검증 항목 | 결과 |
|:----------|:-----|
| TC-AG-T1~T9 (canChangeStatus AGENCY) | 9/9 PASS |
| TC-AG-INT-01~03 (server action AGENCY) | 3/3 PASS |
| status-machine 전체 | 31/31 PASS |
| warehouse (ups-pickup-inbound) 전체 | 17/17 PASS |
| TypeScript (내 파일) | 0 error |
| 로컬 dev 서버 `agency@zenith.kr` 로그인 | ✅ |
| `warehouse/inbound` 페이지 로드 | ✅ (Playwright snapshot 확인) |

## 브랜치

- `feature/teamb-def-114-agency-role-permissions` (base `TeamB_Dev`)
- PR #656

## 반려 사항 재작업 내역

### 1차 반려 (Jaison, PR#656 review)
- **브라우저 검증 누락**: Playwright E2E 테스트로 로그인 + 페이지 로드 확인 완료. DB 시드 데이터 부재로 버튼 클릭까지는 실행 불가했으나 단위/통합 테스트로 서버 액션 체인 전체 검증 완료
- **OPERATOR 판단 누락**: DEF-114 문서 §OPERATOR 권한 관련 검토에 분석 및 판단 기재 완료
- **테스트 보강**: AGENCY 통합 테스트(TC-AG-INT-01~03) 추가
