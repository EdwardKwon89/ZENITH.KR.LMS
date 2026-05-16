# TASK-005 — Phase F 사전 GitNexus 분析

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-005 |
| IMP-ID | ANA-IMP-DK-F (IMP-012/017/023/024/029/049/060/061/063) |
| 생성일 | 2026-05-16 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |

---

## 배경

Phase F(Type/UI/Test Quality) IMP 9건에 대해 구현 착수 전 GitNexus 기반 사전 분析이 필요합니다.
각 IMP의 영향 범위, 의존성, 수정 위치를 사전에 특정하여 구현 에이전트(B_Kai·Ring·D_Kai·Riley)가
분析 없이 즉시 착수할 수 있는 컨텍스트를 제공하는 것이 목표입니다.

참조: `scratch/ANA_PhaseE_DKai_20260516.md` (Phase E 분析 형식 참고)

---

## 분析 대상

| IMP | 내용 | 담당(구현) |
|:---:|:-----|:-----:|
| 012 | Master/Admin 코드 중복 — 공통 컴포넌트 추출 | D_Kai |
| 017 | Error Boundary 4개 추가 | B_Kai |
| 023 | i18n 번역 키 타입 안정성 | D_Kai |
| 024 | 공통 UI 컴포넌트 라이브러리화 | Ring |
| 029 | TS 타입 안전성 (any 퇴출) | D_Kai |
| 049 | 이중 프로필 테이블 정리 | D_Kai |
| 060 | RETURNED 상태 전이 확장 | Ring |
| 061 | PDF 경로 충돌 방지 | B_Kai |
| 063 | ZenUI.tsx 7개 분할 | B_Kai |

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-005 → 🔄 동시 반영**
2. 각 IMP별 GitNexus 분析 수행:
   - `gitnexus_query({query: "IMP 관련 개념"})` → 관련 심볼·실행 흐름 탐색
   - `gitnexus_context({name: "symbolName"})` → 핵심 심볼 상세 컨텍스트
   - `gitnexus_impact({target: "symbolName", direction: "upstream"})` → 영향 범위
3. 결과 저장: `scratch/ANA_PhaseF_DKai_20260516.md`
   - 형식: Phase E 분析 파일(`scratch/ANA_PhaseE_DKai_20260516.md`)과 동일
   - 각 IMP별 §IMP-NNN 섹션 필수
4. 커밋: `[D_Kai] docs: ANA-IMP-DK-F Phase F GitNexus 사전 분析 완료`
5. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
6. **ACTIVE_TASK.md TASK-005 → 🔔 반영**

---

## 완료 기준 (DoD)

- [ ] IMP-012/017/023/024/029/049/060/061/063 전 9건 분析 완료
- [ ] `scratch/ANA_PhaseF_DKai_20260516.md` 생성 (§IMP-NNN 섹션 9개)
- [ ] 각 IMP별 수정 대상 파일·라인·패턴 명시
- [ ] 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 분析 파일 | — |
| 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | — |
| 판정 | — |
| 검토 의견 | — |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 |
