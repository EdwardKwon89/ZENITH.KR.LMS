# TASK-B-015 — Team B DoD 표준화 (PR 제출 전 빌드 검증 + i18n 중복 방지)

> **TASK-ID**: TASK-B-015
> **생성일**: 2026-06-22
> **발령자**: Jaison (Team B 총괄, Issue #71 Edward 지시)
> **담당 Agent**: Jaison (Claude)
> **우선순위**: P2
> **관련 Issue**: [#71](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/71)
> **브랜치**: `develop` (직접 반영)
> **상태**: ✅

---

## [업무 개요]

PR#66/67 CI `npm run build` 실패 근본 원인 분석 결과, Team B 내부 DoD에 빌드 검증 항목이 누락되어 있었음. Edward(Issue #71) 지시에 따라 Team B 모든 Agent의 PR 제출 전 DoD에 아래 항목을 표준으로 의무화하고 관련 문서를 갱신.

### 배경
- Baker(TASK-B-011) `t` prop 타입 설계 오류 + i18n 키 copy-paste 중복
- Aiden이 PR#70 핫픽스로 직접 수정 (260622)
- PR#66/67 rebase develop 후 CI 재실행 완료 (Jaison, 260622)

---

## [전제조건]

없음 (절차 문서화 작업)

---

## [구현 명세]

### Team B PR 제출 전 표준 DoD 항목 (전 Agent 공통 의무)

```
[ ] npm run build — TypeScript 컴파일 PASS (오류 0건)
[ ] i18n 신규 키 추가 시: ko/en/ja/zh 4개 언어 파일 중복 여부 확인
[ ] npm run test:regression — 전체 PASS (pre-existing Supabase 2건 제외)
[ ] 코드 커밋 해시 기재 (task file [작업 결과] 섹션)
[ ] PR 생성 완료 (Closes #이슈번호)
```

### 반영 파일
1. `.agent/TEAM_B_DOD_STANDARD.md` — Team B 공통 DoD 표준 신규 작성
2. `ACTIVE_TASK.md` 개정 이력 — DoD 표준화 기록

---

## [ZEN_A4 준수 사항]

- 문서 작업만 — 소스코드 변경 없음

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 커밋 | `(이번 커밋에 포함)` |
| 생성 파일 | `.agent/TEAM_B_DOD_STANDARD.md` |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-22 | Jaison (Claude, Team B) | Task 발령 및 즉시 완료 — Issue #71 Edward 지시 반영, TEAM_B_DOD_STANDARD.md 신규 작성 |
