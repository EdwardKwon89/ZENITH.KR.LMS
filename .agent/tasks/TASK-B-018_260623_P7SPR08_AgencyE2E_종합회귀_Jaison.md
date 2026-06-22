# TASK-B-018 — [P7-SPR-08] Agency E2E 자동화 + Phase 7 종합 회귀 테스트

> **TASK-ID**: TASK-B-018
> **생성일**: 2026-06-23
> **발령자**: Aiden (ZEN_CEO)
> **담당 Agent**: Jaison (총괄) · Baker (E2E 자동화 코드)
> **우선순위**: P2
> **관련 Issue**: [#51](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/51)
> **전제조건**: SPR-07 ✅ (PR#66·67 머지 완료 — 2026-06-23)
> **브랜치**: `feature/teamb-task-b-018-agency-e2e-regression`
> **상태**: ⬜

---

## [업무 개요]

Phase 7 Agency 기능(화주관리·요율 오버라이드·정산 조회) 전체 흐름을 Playwright E2E로 자동화하고, Phase 7 전체 회귀 테스트를 통합 실행하여 SPR-08을 완료합니다.

---

## [작업 범위]

### §1. Agency E2E 시나리오 자동화 (Baker 담당)

**신규 파일**: `tests/e2e/e2e-23-agency-flow.spec.ts`

커버해야 할 시나리오 (UAT 기반):

| 시나리오 | 참조 UAT | 내용 |
|:---------|:--------:|:-----|
| Agency 로그인 + 대시보드 접근 | UAT-15 | AGENCY 계정 로그인 → `/agency` 접근 |
| 화주 신규 등록 | UAT-15-01 | `/agency/shippers/new` — 화주 등록 |
| 화주 목록 조회 | UAT-15-02 | `/agency/shippers` — 소속 화주 목록 |
| 화주 등급 수정 | UAT-15-03 | 등급 변경 저장 |
| 요율 오버라이드 등록 | UAT-16-01 | `/agency/rate-overrides` — 오버라이드 신규 |
| 요율 오버라이드 조회 | UAT-16-02 | 목록 + RLS 검증 |
| 정산 조회 + 오더번호 검색 | UAT-20-01~05 | `/agency/settlement` |
| Reconciliation 알림 | UAT-20-06~07 | 미가격 오더 존재/미존재 |

**참조 파일**:
- `docs/91_FinalTest/UAT/UAT_15_Agency화주관리.md`
- `docs/91_FinalTest/UAT/UAT_16_Agency요율오버라이드.md`
- `docs/91_FinalTest/UAT/UAT_20_Agency정산조회.md`
- 기존 E2E 패턴: `tests/e2e/e2e-21-address-book.spec.ts`, `tests/e2e/e2e-22-daily-close.spec.ts`

**테스트 계정**: `docs/00_GUIDE/103_AGENT_ROLES_SPEC.md` §5 AGENCY 계정 사용

### §2. Phase 7 종합 회귀 테스트 (Jaison 담당)

모든 Phase 7 E2E 스펙 통합 실행 및 결과 기록:

```bash
npm run test:e2e -- --grep "e2e-21|e2e-22|e2e-23"
npm run test:regression
```

기대 결과:
- e2e-21 (주소록) ✅
- e2e-22 (일마감) ✅
- e2e-23 (Agency 전체 흐름) ✅ (신규)
- 전체 회귀 PASS (pre-existing 제외)

### §3. 긴급 DEF 버퍼 (조건부)

E2E/회귀 실행 중 발견된 버그는 R-18 기준 DEF 보고서 작성 후 Aiden 보고. 즉각 수정 여부는 Aiden 판단.

---

## [ZEN_A4 준수 사항]

- 신규 spec 파일: 함수 50줄 이하 준수 (테스트 블록별 분리)
- 파일 길이: 1,500줄 Hard Limit (E2E는 소스코드 기준 적용)
- AGENCY 계정 하드코딩 금지 → `103_AGENT_ROLES_SPEC.md` 상수 참조

---

## [DoD 체크리스트]

- [ ] `e2e-23-agency-flow.spec.ts` 생성 — 8개 시나리오 커버
- [ ] e2e-23 로컬 실행 PASS
- [ ] e2e-21 + e2e-22 + e2e-23 통합 실행 PASS
- [ ] 전체 회귀 PASS (pre-existing 2건 제외)
- [ ] ZEN_A4: 함수 50줄 이하
- [ ] R-17 완료 보고 절차 준수 (코드 커밋 → task file 🔔 → 문서 커밋 → PR)
- [ ] PR `Closes #51`

---

## [설계 의견]

_(없음 — 기존 UAT 시나리오 기반 자동화, 설계 결정 불필요)_

---

## [작업 결과]

_(구현 완료 후 기재)_

| 항목 | 내용 |
|:-----|:-----|
| 코드 커밋 | TBD |
| E2E 파일 | TBD |
| 회귀 결과 | TBD |
| IMP | IMP-133 |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-23 | Aiden (Claude, ZEN_CEO) | Task 발령 — Issue #51 SPR-08, SPR-07 완료 전제조건 충족 |
