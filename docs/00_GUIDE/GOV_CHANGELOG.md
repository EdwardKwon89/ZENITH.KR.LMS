# GOV_COMMON.md 개정 이력

> GOV_COMMON.md의 전체 개정 이력. 최신 버전 정보는 [GOV_COMMON.md](../../GOV_COMMON.md) 참조.

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-05-12 | Aiden (Claude, ZEN_CEO) | CLAUDE.md·AGENTS.md·GEMINI.md 공통 규칙 통합. GitNexus MUST 예외 조항 추가 (SAR-2026-05-12-001 반영). |
| v1.1 | 2026-05-13 | D_Kai (OpenCode) | GOV-004 수동 호출 보완 조항 추가. GOV-006 질문 유형별 분석 범위 추가. GOV-007 R-16 상태 파일 일관성 검증 신설. |
| v1.2 | 2026-05-16 | Aiden (Claude, ZEN_CEO) | R-16 확장 (ACTIVE_TASK.md 기반으로 전환). R-17 신설 — Active Task 관리 체계 (TASK_BOARD·ACTIVE_AGENT·HANDOFF_BOX 통합 대체). 주요 참조 문서에 ACTIVE_TASK.md 추가. |
| v1.3 | 2026-05-16 | Aiden (Claude, ZEN_CEO) | R-17 v1.3 — 설계 의견(📝)·설계 검토(🔍) 단계 신설. Agent 자율 판단 원칙. R-16 신규 상태 반영. |
| v1.4 | 2026-05-20 | Aiden (Claude, ZEN_CEO) | R-17 v1.4 — 완료 보고 절차 재구조화(코드 커밋 선행 → task file 업데이트 → 문서 커밋). 반복 위반 페널티 조항 신설(3회 이상 시 할당 중단). |
| v1.5 | 2026-05-25 | Aiden (Claude, ZEN_CEO) | R-17 v1.5 — 완료 보고 절차 5단계 신설: 문서 커밋 전 DoD 실물 검증 의무화(DoD 미체크·증거값 미기재 시 커밋 보류). 반복 위반 유형에 DoD 미체크 추가. D_Kai R-17 개선 제안(R17_DoD_검증_강화_검토_보고서.md) Option A 반영. |
| v1.6 | 2026-06-07 | Aiden (Claude, ZEN_CEO) | ZEN_A4 파일 길이 기준 개정 — 소스코드/문서 파일 차등 적용. 문서(.md): Hard Limit 1,000줄. 소스코드(.ts/.tsx): Advisory 1,000~1,500줄, Hard Limit 1,500줄 초과. 함수 50줄 엄격 유지. (Edward 검토 의견 반영) |
| v1.7 | 2026-06-09 | Aiden (Claude, ZEN_CEO) | R-17 v1.6 — 완료 보고 step 5 자가 검증 강화(`check-R17-DoD` 실행 의무화 + 자가 수정 루프). 반복 위반 유형에 자가 검증 미실행 추가. R-18 신설 — 발견 이슈 보고 절차. |
| v1.8 | 2026-06-09 | Aiden (Claude, ZEN_CEO) | R-18 개정 — ISS 트랙 폐지, DEF 단일 트랙으로 통합. 긴급도 `즉시`·`High` DEF는 Edward 보고 후 TASK 발령 의무화. (Edward 지시) |
| v1.9 | 2026-06-14 | Aiden (Claude, ZEN_CEO) | R-19 신설 — 다중팀 거버넌스. 팀 리더 자율 Task 발령·에이전트 배정 권한 부여. ACTIVE_TASK.md 팀별 섹션 분리. 브랜치 전략. 파일 소유권 원칙. Edward 승인 — 2팀 병행 프로세스 검증 착수. |
| v2.0 | 2026-06-16 | Aiden (Claude, ZEN_CEO) | R-19 §TASK 번호 채번 규칙 v2.0 — 팀 접두사 체계 도입 (Edward 승인). Team A: `TASK-NNN`, Team B: `TASK-B-NNN`, Team C+: `TASK-C-NNN`. |
| v2.1 | 2026-06-17 | Aiden (Claude, ZEN_CEO) | R-17 v2.0 — 완료 보고 7단계 신설: PR 생성 필수화. GitHub Issue 연결 의무. `.github/` Foundation 구축. |
| v2.2 | 2026-06-18 | Aiden (Claude, ZEN_CEO) | R-17 v2.1 — 착수 절차 §0 신설: Git 동기화 필수화. 공유 workspace 교차 오염 방지. pre-commit hook 불일치 차단 추가. |
| v2.3 | 2026-06-24 | Aiden (Claude, ZEN_CEO) | 컨텍스트 윈도우 최적화 — 개정 이력 GOV_CHANGELOG.md 분리, 위반 카운터 VIOLATION_TRACKER.md 이전, R-19 상세 내용 105_MULTITEAM_GOVERNANCE.md 분리. (Issue #85) |
