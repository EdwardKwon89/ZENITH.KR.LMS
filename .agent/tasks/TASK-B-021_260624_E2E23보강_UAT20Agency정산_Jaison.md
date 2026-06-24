# TASK-B-021 — [SPR-09] E2E-23 보강: UAT-20 Agency 정산 CSV·Reconciliation 알림

> **TASK-ID**: TASK-B-021
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #87)
> **담당 Agent**: Jaison (총괄) · Baker (구현)
> **우선순위**: P2
> **관련 Issue**: [#87](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/87)
> **전제조건**: UAT-20 명세 공유 단계 완료 (Team B 자체 진행)
> **브랜치**: `feature/teamb-task-b-021-e2e23-uat20-agency-reconciliation`
> **상태**: ⬜

---

## [업무 개요]

UAT-20 (Agency 정산) 시나리오 중 기존 E2E-23에 미포함된 **CSV 검증 + Reconciliation 알림** 항목을 보강합니다.

**전제**: Team B가 UAT-20 상세 명세를 자체 확인 후 착수합니다 (Edward 지시).

---

## [구현 명세]

### 보강 대상 (UAT-20 미커버 항목)

| 시나리오 | 내용 |
|:--------|:----|
| UAT-20 CSV | Agency 정산 CSV 다운로드 + 내용 검증 |
| UAT-20 알림 | Reconciliation 완료 알림 발송 확인 |
| 기타 | 기존 E2E-23 PASS 여부 재확인 후 Gap 식별 |

### 착수 전 필수 절차

1. `docs/99_Manual/E2E_SCENARIOS.md` 및 UAT-20 시나리오 파일 확인
2. 기존 `playwright/e2e/e2e-23-agency-flow.spec.ts` 현재 커버리지 파악
3. 미커버 항목 목록화 후 보강 범위 확정

### 출력 파일

- `playwright/e2e/e2e-23-agency-flow.spec.ts` (기존 파일 보강)
- `docs/99_Manual/E2E_23_Result/` (실행 결과 갱신)

---

## [ZEN_A4 준수 사항]

- 함수 50줄 이하
- 기존 spec 파일 1,500줄 Hard Limit 초과 시 분리 필수

---

## [DoD 체크리스트]

- [ ] UAT-20 명세 공유 단계 완료 (Team B 자체 확인)
- [ ] 기존 E2E-23 현재 커버리지 파악 및 Gap 목록화
- [ ] CSV 다운로드 검증 시나리오 추가 완료
- [ ] Reconciliation 알림 검증 시나리오 추가 완료
- [ ] 로컬 실행 전 케이스 PASS
- [ ] 회귀 테스트 전체 PASS (`npm run test:regression`)
- [ ] R-17 완료 보고 절차 준수 (코드→task file 🔔→문서→PR `Closes #87`)

---

## [설계 의견]

_(없음 — Team B 자체 명세 확인 후 착수)_

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
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | Task 발령 — Issue #87 Edward 승인, SPR-09 E2E-23 보강, UAT-20 명세 공유 Team B 자체 진행 |
