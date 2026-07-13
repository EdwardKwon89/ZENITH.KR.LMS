# TASK-163 — [SPR-09] E2E-24: UPS 오더 플로우 자동화 (UAT-17)

> **TASK-ID**: TASK-163
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #87)
> **담당 Agent**: B_Kai (Big Pickle)
> **우선순위**: P2
> **관련 Issue**: [#87](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/87)
> **전제조건**: TASK-161 ✅ (UAT-17 시나리오 존재)
> **브랜치**: `feature/teama-task-163-e2e24-ups-order-flow`
> **상태**: ⬜

---

## [업무 개요]

UAT-17 (UPS 오더 발송) 수동 시나리오 3종을 Playwright E2E 자동화 코드로 전환합니다.
완성된 E2E-24는 UAT-17 검증 증거 + 영구 회귀 테스트로 활용됩니다.

---

## [구현 명세]

### 대상 시나리오 (UAT-17)

| 시나리오 | 내용 |
|:--------|:----|
| UAT-17-01 | UPS DIRECT 오더 등록 및 발송 |
| UAT-17-02 | UPS PICKUP 오더 등록 및 발송 |
| UAT-17-03 | Rate Override 적용 오더 발송 |

### 출력 파일

- `playwright/e2e/e2e-24-ups-order-flow.spec.ts`
- `docs/99_Manual/E2E_24_Result/` (실행 결과 저장)

### 구현 기준

- 기존 Supabase admin fixture 패턴 재사용 (E2E-21/22/23 참조)
- 테스트 계정: [103_AGENT_ROLES_SPEC.md](../../docs/00_GUIDE/103_AGENT_ROLES_SPEC.md) 섹션 5 기준
- R-14: 로컬 Supabase 환경에서 실행

---

## [ZEN_A4 준수 사항]

- 함수 50줄 이하
- spec 파일 1,000줄 이하 (Advisory 기준)

---

## [DoD 체크리스트]

- [ ] `playwright/e2e/e2e-24-ups-order-flow.spec.ts` 생성 완료
- [ ] UAT-17-01 (DIRECT) Playwright 전환 PASS
- [ ] UAT-17-02 (PICKUP) Playwright 전환 PASS
- [ ] UAT-17-03 (Rate Override) Playwright 전환 PASS
- [ ] Supabase admin fixture 구성 완료
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
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | Task 발령 — Issue #87 Edward 승인, SPR-09 E2E-24 |
