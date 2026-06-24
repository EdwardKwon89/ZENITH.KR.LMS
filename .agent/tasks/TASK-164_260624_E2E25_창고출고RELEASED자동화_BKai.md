# TASK-164 — [SPR-09] E2E-25: 창고 출고 RELEASED 자동화 (UAT-18)

> **TASK-ID**: TASK-164
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #87)
> **담당 Agent**: B_Kai (Big Pickle)
> **우선순위**: P2
> **관련 Issue**: [#87](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/87)
> **전제조건**: TASK-161 ✅ (UAT-18 시나리오 존재)
> **브랜치**: `feature/teama-task-164-e2e25-warehouse-release`
> **상태**: ⬜

---

## [업무 개요]

UAT-18 (창고 출고 연계) 수동 시나리오 2종을 Playwright E2E 자동화 코드로 전환합니다.
`intl_ref_no` 국제 참조번호 연동을 포함한 출고 플로우를 검증합니다.

---

## [구현 명세]

### 대상 시나리오 (UAT-18)

| 시나리오 | 내용 |
|:--------|:----|
| UAT-18-01 | UPS 오더 창고 입고 → RELEASED 상태 전이 |
| UAT-18-02 | intl_ref_no 국제 참조번호 생성 및 연동 확인 |

### 출력 파일

- `playwright/e2e/e2e-25-warehouse-release.spec.ts`
- `docs/99_Manual/E2E_25_Result/` (실행 결과 저장)

### 구현 기준

- 기존 Supabase admin fixture 패턴 재사용
- seed 데이터 보강: UPS 오더 → 창고 입고 상태 픽스처
- R-14: 로컬 Supabase 환경에서 실행

---

## [ZEN_A4 준수 사항]

- 함수 50줄 이하
- spec 파일 1,000줄 이하 (Advisory 기준)

---

## [DoD 체크리스트]

- [ ] `playwright/e2e/e2e-25-warehouse-release.spec.ts` 생성 완료
- [ ] UAT-18-01 (RELEASED 전이) Playwright 전환 PASS
- [ ] UAT-18-02 (intl_ref_no 연동) Playwright 전환 PASS
- [ ] seed 데이터 보강 완료 (창고 입고 fixture)
- [ ] 로컬 실행 전 케이스 PASS
- [ ] 회귀 테스트 전체 PASS (`npm run test:regression`)
- [ ] R-17 완료 보고 절차 준수 (코드→task file 🔔→문서→PR `Closes #87`)

---

## [설계 의견]

_(없음 — 방향 확정)_

---

## [작업 결과]

_(미착수)_

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | Task 발령 — Issue #87 Edward 승인, SPR-09 E2E-25 |
