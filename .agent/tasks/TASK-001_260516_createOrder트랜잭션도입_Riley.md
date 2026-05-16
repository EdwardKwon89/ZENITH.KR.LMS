# TASK-001 — createOrder() 트랜잭션 도입

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-001 |
| IMP-ID | IMP-019 |
| 생성일 | 2026-05-16 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P2 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | 🔄 진행 중 |
| 파급 효과 | ✅ TASK-001 완료 시 TASK-003 · TASK-004 블로커 자동 해제 |

---

## 배경

`createOrder()` 내 오더 생성 + 재고 차감 + 알림 발송이 단일 트랜잭션 없이 순차 실행됨.
중간 단계 실패 시 오더는 생성됐으나 재고는 미차감, 또는 오더 없이 알림만 발송되는 데이터 불일치 발생 가능.

참조 분석: `scratch/ANA_PhaseB_DKai_20260515.md §IMP-019`

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-001 → 🔄 동시 반영**
2. `src/app/actions/orders.ts` → `createOrder()` 전체 흐름 파악
3. `src/app/actions/inventory.ts` → 재고 차감 함수 확인
4. 구현 방식 결정 (택일):
   - **방식 A (권장)**: DB RPC 함수 `create_order_atomic(...)` — 원자적 처리
   - **방식 B**: 보상 트랜잭션 — rollback 전략 명시 필수
5. `gitnexus_impact({target: "createOrder", direction: "upstream"})` — 영향 범위 확인, HIGH/CRITICAL 시 Aiden 보고 후 대기
6. 구현 후 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/` (R-13)
8. 커밋: `[Gemini] fix: IMP-019 createOrder 트랜잭션 도입`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
10. **ACTIVE_TASK.md TASK-001 → 🔔 반영**

---

## 완료 기준 (DoD)

- [ ] `createOrder()` 트랜잭션 래핑 완료 (방식 A 또는 B)
- [ ] 구현 방식 선택 근거 본 파일 [작업 결과]에 명시
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[Gemini] fix: IMP-019` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-16 |
| 완료일 | — |
| 구현 방식 | — |
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
| 2026-05-16 | Aiden (Claude) | Task 생성 — 신규 오케스트레이션 체계 도입 |
