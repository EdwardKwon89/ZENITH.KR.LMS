# TASK-006 — Supabase 클라이언트 중복 제거

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-006 |
| IMP-ID | IMP-059 |
| 생성일 | 2026-05-16 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |

---

## 배경

프로젝트 전반에 Supabase 클라이언트 생성 코드가 중복 분산되어 있습니다.
`createClient()` 또는 유사 초기화 코드가 여러 파일에서 각자 인스턴스를 생성하여
연결 풀 낭비 및 설정 불일치 위험이 존재합니다.
단일 팩토리 함수 또는 싱글턴 패턴으로 통합이 필요합니다.

참조 분析: `scratch/ANA_PhaseD_DKai_20260516.md §IMP-059` (존재 시)

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-006 → 🔄 동시 반영**
2. `gitnexus_query({query: "supabase client createClient"})` — 중복 생성 위치 전수 파악
3. `gitnexus_impact({target: "createClient", direction: "upstream"})` — 영향 범위 확인
   - HIGH/CRITICAL 시 Aiden 보고 후 대기
4. 단일 클라이언트 팩토리 함수 설계 및 구현:
   - Server Component용: `lib/supabase/server.ts`
   - Client Component용: `lib/supabase/client.ts`
   - 기존 중복 코드 → 통합 함수로 교체
5. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
8. 커밋: `[D_Kai] refactor: IMP-059 Supabase 클라이언트 중복 제거`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-006 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-059 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] Supabase 클라이언트 생성 코드 중복 전량 단일 팩토리로 통합
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[D_Kai] refactor: IMP-059` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-059 행 갱신

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 통합 위치 | — |
| 중복 제거 수 | — |
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
| 2026-05-16 | Aiden (Claude) | Task 생성 — 작업 지시 발령 |
