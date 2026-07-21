# TASK-B-177: DEF-116 — checkLabelPermission에 AGENCY 누락

| 메타 | 값 |
|:----|:----|
| **Issue** | [#667](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/667) (DEF-116) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-22 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. `src/app/actions/operations/ups-labels.ts`
- `checkLabelPermission()` `allowed` 배열에 `USER_ROLES.AGENCY` 추가
- 권한 거부 시 `logger.warn()` 추가 (침묵 실패 방지)

#### 2. `tests/unit/ups/ups-labels-agency-permission.test.ts` (신규)
- AGENCY 역할 checkLabelPermission 통과 검증
- ADMIN/MANAGER 역할 통과 검증
- CORPORATE 역할 거부 검증
- fetchAndIssueUpsLabel AGENCY 동작 검증

### 파일 목록
- `src/app/actions/operations/ups-labels.ts` — checkLabelPermission 수정
- `tests/unit/ups/ups-labels-agency-permission.test.ts` — 신규 테스트

### 검증
- 테스트: **5/5 PASS**
- 빌드: ✅ PASS
- 회귀: **110/110 파일 PASS, 730/730 테스트 PASS**
- 커밋 해시: `5c16f45b`
- PR: [#668](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/668)
