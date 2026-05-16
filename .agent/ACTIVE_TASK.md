# ACTIVE_TASK — ZENITH_LMS 작업 인덱스

> **프로젝트**: ZENITH_LMS
> **문서 역할**: 모든 Agent의 단일 작업 인덱스 (Single Source of Truth)
> **참조 규칙**: GOV_COMMON.md R-17
> **아카이브**: 완료 Task는 주 단위로 `.agent/archive/TASK_LOG_YYMMWW.md`로 이관

---

## 운영 규칙

| 규칙 | 내용 |
|:---|:---|
| 착수 선언 | 상세 파일 생성 + 본 인덱스 상태 ⬜→🔄 동시 반영 |
| 완료 선언 | 상세 파일 완료 증적 기록 + 본 인덱스 상태 🔄→🔔 반영 |
| 최종 완료 | Aiden 승인 후 ✅ — Agent 자체 선언 절대 불가 |
| 파일 조작 | 상세 파일은 담당 Agent만 수정 가능 |
| 착수 충돌 방지 | 상세 파일 존재 여부 확인 후 착수 (파일 선점 = 착수권 확보) |
| 상태 동기화 | 본 인덱스 ↔ 상세 파일 상태 불일치 시 즉시 Aiden 보고 |

---

## 상태 범례

| 심볼 | 의미 | 전환 주체 |
|:----:|:---|:---:|
| ⬜ | 미착수 — 착수 대기 | Aiden |
| 🚫 | 블로커 — 전제조건 미충족 | 자동 (전제조건 ✅ 시 해제) |
| 🔄 | 진행 중 — 상세 파일 생성됨 | 담당 Agent |
| 🔔 | 검토 요청 — Aiden 검토 대기 | 담당 Agent |
| ❌ | 반려 — 재작업 필요 | Aiden |
| ✅ | 완료 — Aiden 승인 확정 | **Aiden 단독** |
| ➖ | 취소/병합 | Aiden |

---

## 우선순위 기준

| 등급 | 기준 |
|:----:|:---|
| P1 | 시스템 장애 · 보안 · 블로커 해제 |
| P2 | 데이터 정합성 · 트랜잭션 안전성 |
| P3 | 관찰성 · 성능 · 아키텍처 개선 |
| P4 | 품질 · 테스트 · 문서 |

---

## 활성 Task 목록

| Task-ID | 생성일 | 업무개요 | 우선순위 | 전제조건 | 할당Agent | 상태 | 상세파일 | 비고 |
|:-------:|:------:|:--------|:--------:|:--------:|:---------:|:----:|:--------|:-----|
| TASK-001 | 260516 | createOrder() 트랜잭션 도입 | P2 | 없음 | Riley | ⬜ | [TASK-001](tasks/TASK-001_260516_createOrder트랜잭션도입_Riley.md) | IMP-019 · IMP-047/052/053 블로커 해제 |
| TASK-002 | 260516 | N+1 쿼리 7곳 수정 | P2 | 없음 | B_Kai | ⬜ | [TASK-002](tasks/TASK-002_260516_N+1쿼리7곳수정_BKai.md) | IMP-054 · ANA-DK-E 분석 완비 |
| TASK-003 | 260516 | 정산 이중 실행 방지 | P2 | TASK-001 | Riley | 🚫 | [TASK-003](tasks/TASK-003_260516_정산이중실행방지_Riley.md) | IMP-039 |
| TASK-004 | 260516 | WAREHOUSED→CANCELED 재고 복구 | P2 | TASK-001 | Riley | 🚫 | [TASK-004](tasks/TASK-004_260516_WAREHOUSED재고복구_Riley.md) | IMP-040 |

---

## Agent별 즉시 착수 가능 Task

| Agent | 착수 가능 | 비고 |
|:------|:--------:|:-----|
| Riley | **TASK-001** | TASK-003/004는 TASK-001 완료 후 블로커 해제 |
| B_Kai | **TASK-002** | D_Kai ANA-IMP-DK-E 분석 완비 (`scratch/ANA_PhaseE_DKai_20260516.md`) |
| D_Kai | — | 현재 할당 Task 없음 |
| Ring | — | 현재 할당 Task 없음 |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-16 | Aiden (Claude) | 신규 오케스트레이션 체계 도입 — ACTIVE_TASK.md v1.0 초기 작성. TASK_BOARD+ACTIVE_AGENT+HANDOFF_BOX 통합 대체 |
