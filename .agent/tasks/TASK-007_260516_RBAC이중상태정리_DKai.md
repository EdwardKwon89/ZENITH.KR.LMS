# TASK-007 — RBAC 이중 상태 정리

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-007 |
| IMP-ID | IMP-031 |
| 생성일 | 2026-05-16 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |

---

## 배경

RBAC(Role-Based Access Control) 권한 상태가 두 곳에 이중으로 관리되고 있습니다.
DB(`zen_role_permissions`)와 코드(`lib/permissions.ts` 등)에 각각 권한 정의가 분산되어
불일치 발생 시 보안 취약점으로 직결될 수 있습니다.
단일 출처(DB)로 통합하거나 코드 상수를 DB 기준으로 동기화하는 정리가 필요합니다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-007 → 🔄 동시 반영**
2. `gitnexus_query({query: "RBAC role permissions"})` — 권한 관련 심볼 전수 파악
3. `gitnexus_context({name: "zen_role_permissions"})` — DB 권한 테이블 컨텍스트
4. 이중 상태 현황 문서화:
   - DB 정의 위치와 코드 정의 위치 목록
   - 불일치 항목 식별
5. `gitnexus_impact({target: "권한관련심볼", direction: "upstream"})` — 영향 범위 확인
   - HIGH/CRITICAL 시 Aiden 보고 후 대기
6. 통합 전략 결정 후 구현:
   - DB를 Single Source of Truth로 유지
   - 코드 측 하드코딩 권한 → DB 조회 방식으로 교체 (또는 명시적 동기화 함수)
7. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
8. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
9. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
10. 커밋: `[D_Kai] refactor: IMP-031 RBAC 이중 상태 정리`
11. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
12. **ACTIVE_TASK.md TASK-007 → 🔔 반영**
13. **`scratch/IMP_PROGRESS.md` IMP-031 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] RBAC 이중 상태 현황 파악 및 문서화
- [ ] 단일 출처 기준 통합 완료 (불일치 항목 0)
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[D_Kai] refactor: IMP-031` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 이중 상태 현황 | — |
| 불일치 항목 수 | — |
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
