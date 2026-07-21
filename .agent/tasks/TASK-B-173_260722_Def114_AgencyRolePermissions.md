# TASK-B-173: DEF-114 ROLE_PERMISSIONS AGENCY 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-22 |
| **담당자** | Dave |
| **연결 이슈** | [#655](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/655) |
| **우선순위** | P1 (Critical) |
| **상태** | 🔔 PR #??? |

## 개요

`ROLE_PERMISSIONS`에 `USER_ROLES.AGENCY` 항목이 없어 AGENCY 역할의 모든 창고관리 기능이 500 에러로 차단됨.

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:---------|
| `src/lib/logistics/status-machine.ts` | ROLE_PERMISSIONS에 AGENCY 추가 (REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/IN_TRANSIT) |
| `tests/unit/logistics/status-machine.test.ts` | TC-AG-T1~T9 AGENCY 권한 검증 9종 추가 |
| `.agent/defects/DEF-114_AGENCY_ROLE_PERMISSIONS_누락_창고기능전체차단.md` | 결함 보고서 신규 |

## 검증

- status-machine 31/31 PASS (기존 22 + 신규 9)
- warehouse (ups-pickup-inbound) 14/14 PASS
- TypeScript: 0 error (e2e pre-existing errors only)

## 브랜치

- `feature/teamb-def-114-agency-role-permissions` (base `TeamB_Dev`)
