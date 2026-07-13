# TASK-B-115: Issue #421 — zen_address_book org_id 기반 RLS 회귀 테스트 보강

**담당**: Dave
**생성일**: 2026-07-13
**우선순위**: P3
**상태**: 🔔

---

## [작업 결과]

### 변경 파일
1. `tests/e2e/e2e-21-address-book.spec.ts` — org_id 기반 계정(AGENCY_SHIPPER) 시나리오 추가
   - beforeAll: AGENCY org + SHIPPER org 생성, link, auth user 생성 (app_metadata org_id 설정)
   - 신규 test: 로그인 → 주소록 등록 → 수정 → 삭제 전 흐름 검증
2. `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` — TC-P7-ADDR-06 추가 (R-09)

### 검증
- **CI Regression Tests**: ✅ PASS
- **Task File Check**: ✅ PASS

### 커밋
- `TBD` — `[Dave] feat: TASK-B-114 Issue #421 — 주소록 org_id 기반 RLS E2E 테스트 보강`

### PR
- `TBD`

---

## [DoD Checklist]

- [x] org_id 기반 계정 E2E 시나리오 추가 (AGENCY_SHIPPER)
- [x] LIVE_REGRESSION_TEST_MAP.md 업데이트 (R-09)
- [x] CI 회귀 테스트 PASS 확인
- [x] task file 생성 + ACTIVE_TASK.md 반영
- [x] check-R17-DoD 전항목 통과

---

## [발견 이슈]

없음
