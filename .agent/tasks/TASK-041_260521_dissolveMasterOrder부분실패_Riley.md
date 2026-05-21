# TASK-041 — dissolveMasterOrder 부분 실패 위험 수정

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-041 |
| IMP-ID | IMP-052 |
| 생성일 | 2026-05-21 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P2 |
| 전제조건 | IMP-047 ✅ 완료 → 즉시 착수 가능 |
| 상태 | ⬜ 미착수 |
| 파급 효과 | 없음 |

---

## 배경

`dissolveMasterOrder()` 함수가 다수의 House Order를 일괄 해체 시 단일 `.update().eq("master_order_id", masterId)` 쿼리를 사용한다.
Supabase JS 클라이언트의 bulk update는 부분 실패 감지가 불가능하여, 일부 row만 업데이트되는 데이터 불일치 위험이 있다.

- **현재 코드**: `src/app/actions/orders.ts` — `dissolveMasterOrder()` 내 순차 쿼리 무보호 상태
- **위험 시나리오**: 네트워크 단절 또는 DB 오류 시 일부 House Order는 해체되고 나머지는 마스터 참조 유지 → 데이터 정합성 파괴

참조: `scratch/post_launch_improvements.md §IMP-052`

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-041 → 🔄 동시 반영**
2. `gitnexus_impact({target: "dissolveMasterOrder", direction: "upstream"})` — 영향 범위 확인, HIGH/CRITICAL 시 Aiden 보고 후 대기
3. **구현 방안 (권장: 방식 A)**
   - **방식 A (권장)**: Supabase RPC `dissolve_master_order_atomic(p_master_order_id UUID)` 신규 작성
     - 트랜잭션 내에서 모든 House Order의 `master_order_id = NULL` 처리
     - `zen_master_order_history`에 해체 이력 INSERT (IMP-051에서 이미 생성된 테이블 활용)
     - 실패 시 전체 롤백
   - **방식 B**: 개별 House Order 순차 업데이트 + 실패 감지 후 수동 롤백 (방식 A 구현 어려울 경우)
4. Supabase 마이그레이션 파일 작성 (`supabase/migrations/YYYYMMDDHHMMSS_imp052_dissolve_master_atomic.sql`)
5. `dissolveMasterOrder()` — 신규 RPC 호출로 교체
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-041.log`
8. **코드 커밋**: `[Gemini] fix: IMP-052 dissolveMasterOrder 원자적 RPC 래핑`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
10. **ACTIVE_TASK.md TASK-041 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-052 행 🔔 갱신**
12. **문서 커밋**: `[Gemini] docs: TASK-041 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `dissolveMasterOrder()` 트랜잭션 래핑 완료 (RPC 또는 명시적 롤백)
- [ ] Supabase 마이그레이션 파일 커밋 포함
- [ ] 구현 방식 선택 근거 본 파일 [작업 결과]에 명시
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[Gemini] fix: IMP-052` 코드 커밋 완료 (해시 기재)
- [ ] `[Gemini] docs: TASK-041` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-052 행 갱신

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 제출 후 Aiden이 작성합니다.**

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 구현 방식 | — |
| gitnexus_impact 결과 | — |
| 회귀 결과 | — |
| 코드 커밋 해시 | — |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 Riley 🔔 제출 후 Aiden이 작성합니다.**

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — Sprint H-II 작업 지시 발령 |
