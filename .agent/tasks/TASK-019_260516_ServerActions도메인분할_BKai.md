# TASK-019 — Server Actions 도메인 분할

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-019 |
| IMP-ID | IMP-033 |
| 생성일 | 2026-05-16 |
| 담당 Agent | B_Kai (GLM Big Pickle) |
| 우선순위 | P3 |
| 전제조건 | **TASK-017 + TASK-018 완료** |
| 상태 | 🔄 구현 중 |

---

## 배경

TASK-017(admin/rates 분할)과 TASK-018(finance.ts 분할) 완료 후,
전체 Server Actions를 도메인별로 재구성하는 작업입니다.
분산된 Action 파일들을 일관된 도메인 구조(`actions/orders/`, `actions/finance/` 등)로 재편합니다.

---

## ✅ 블로커 해제됨

**TASK-017 ✅ + TASK-018 ✅ — 전제조건이 모두 충족되었습니다.**
본 파일은 📝 설계 의견 제출 상태로 Aiden 검토를 대기 중입니다.

---

## 작업 지시 (착수 가능 시점에 확인)

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-019 → 🔄 동시 반영**
2. TASK-017·018 결과물 검토 — 분리된 파일 구조 파악
3. `gitnexus_query({query: "server actions domain structure"})` — 전체 Action 파일 파악
4. 도메인별 재편 계획 수립 후 Aiden 확인
5. 단계별 이동 (한 번에 전환)
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
9. **[코드 커밋]** `[B_Kai] refactor: IMP-033 Server Actions 도메인 분할` (코드·회귀파일)
10. **본 파일 [작업 결과] 섹션 작성** (9번 커밋 해시 포함) **+ 상태 → 🔔**
11. **ACTIVE_TASK.md TASK-019 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-033 행 🔔 갱신**
13. **[문서 커밋]** `[B_Kai] docs: TASK-019 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] Server Actions 도메인별 디렉토리 구조 완성
- [ ] 기존 기능 100% 동일 유지
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[B_Kai] refactor: IMP-033` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | ① Consumer 사전 임팩트 분석: 각 Action 파일별 `gitnexus_impact` 선행 → consumer 목록 파악 후 import 일괄 수정 계획 수립<br/>② 도메인 4개 그룹 분할 커밋: (1차) finance·settlement·invoice·fees, (2차) orders·tracking·schedules·routing, (3차) admin·rates·master·master-data·rbac·organization·member·corporate·auth, (4차) 나머지(claims·customs·dashboard·monitoring·notifications·statistics·support·voc·wallet)<br/>③ 각 커밋은 barrel `index.ts`를 디렉토리 루트에 배치하여 이전 import 경로 호환 유지 |
| 선택 근거 | ① TASK-017·018 경험상 consumer import 수정 누락이 재작업의 주원인이었음 — 사전 impact 분석으로 원천 차단<br/>② 26개 파일 단일 커밋은 diff 규모과다·rollback困難 — 4그룹 분할로 각 단계별 회귀 검증 가능<br/>③ barrel로 구 경로 호환 시 consumer 수정 없이 디렉토리 구조만 전환 가능 → 임팩트 최소화 |
| 예상 리스크 | ① import cycle: 도메인간 상호 참조(circular dependency) 발생 가능 — 각 그룹별 `gitnexus_detect_changes`로 사전 검증 필요<br/>② barrel 유지 시 "디렉토리 구조만 바꾸고 import 경로는 그대로"라는 반쪽 리팩터가 될 수 있음 — 추후 consumer barrel 탈피가 추가 작업으로 남음 |
| 대안 방안 | A안 (제안): barrel 유지 + consumer import 유지 — 안전하나 반쪽 리팩터 리스크<br/>B안: barrel 없이 모든 consumer import 경로 일괄 변경 — 완전한 리팩터지만 consumer가 50+개인 경우 작업량 과다 및 누락 리스크<br/>→ **A안 + 별도 Task로 consumer barrel 탈피 추진** 권장 |

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 보고 후 Aiden이 작성합니다. 확정 전 구현 코드 작성 금지.**

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | B_Kai 제안 A안 승인 — barrel `index.ts` 유지 + 4그룹 분할 커밋 방식. 구 import 경로 호환 유지하여 consumer 수정 최소화. |
| 수정·보완 사항 | ① 착수 전 `gitnexus_query({query: "server actions"})` 로 현재 actions/ 전체 파일 목록 재확인 필수 (TASK-017·018 완료 후 finance.ts→settlement/invoice/fees 분리 등 구조 변동됨). ② 각 그룹 커밋 직후 `rtk npm run test:regression` PASS 확인 후 다음 그룹 진행 (그룹별 개별 검증). ③ consumer barrel 탈피는 본 Task 범위 외 — 완료 후 `scratch/post_launch_improvements.md`에 신규 IMP 등록하여 별도 추진. |
| 착수 승인 | ✅ 즉시 착수 가능 |

---

## 작업 결과

> **이 섹션은 착수 후 B_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 최종 도메인 구조 | — |
| 회귀 결과 | — |
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
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 (블로커 상태) |
| 2026-05-20 | B_Kai (OpenCode) | 설계 의견 제출 — consumer impact 분석·4그룹 분할 커밋·barrel 호환성 유지 제안. 상태 📝. ACTIVE_TASK.md 동기화 |
| 2026-05-20 | Aiden (Claude) | 설계 확정 — A안 승인. barrel 유지·4그룹 분할·그룹별 회귀 필수·consumer 탈피 별도 IMP 등록. 상태 🔄 착수 승인 |
