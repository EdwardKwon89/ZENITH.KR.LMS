# TASK-008 — middleware.ts → proxy.ts 마이그레이션

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-008 |
| IMP-ID | IMP-003 |
| 생성일 | 2026-05-16 |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P3 |
| 전제조건 | 없음 (즉시 착수 가능) |
| 상태 | ⬜ 미착수 |

---

## 배경

현재 `middleware.ts`가 라우팅 프록시 + 인증 + 기능 플래그 로딩 등 다중 책임을 담당합니다.
Next.js 미들웨어는 Edge Runtime에서 실행되므로 DB 직접 호출이 부적절하며,
인증 관련 로직을 `lib/proxy.ts` 또는 전용 모듈로 분리하여 역할 분리(SRP)를 달성해야 합니다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-008 → 🔄 동시 반영**
2. `gitnexus_context({name: "middleware"})` — 현재 middleware.ts 전체 컨텍스트 파악
3. `gitnexus_impact({target: "middleware", direction: "upstream"})` — 영향 범위 확인
   - HIGH/CRITICAL 시 Aiden 보고 후 대기
4. 분리 전략 설계:
   - `middleware.ts`: 라우팅 매처 + 경량 프록시 위임만 유지
   - `lib/auth/proxy.ts` (신규): 인증 토큰 검증·세션 갱신 로직
   - Edge Runtime 호환 코드만 미들웨어에 잔류
5. 단계별 구현 (한 번에 전환, 불완전한 중간 상태 커밋 금지)
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/`
9. 커밋: `[D_Kai] refactor: IMP-003 middleware→proxy.ts 마이그레이션`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**
11. **ACTIVE_TASK.md TASK-008 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-003 행 🔔 갱신**

---

## 완료 기준 (DoD)

- [ ] `middleware.ts` 경량화 — DB 직접 호출 0건
- [ ] 분리된 프록시 모듈(`lib/auth/proxy.ts` 또는 동등 경로) 생성
- [ ] `gitnexus_impact` 결과 기록
- [ ] 회귀 테스트 전체 PASS 증적
- [ ] `[D_Kai] refactor: IMP-003` 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화

---

## 설계 의견 (Agent 작성)

> **사용 기준**: 구현 방향이 복수이거나 설계 결정이 필요한 경우에만 작성합니다.
> 단순 Task는 이 섹션을 생략하고 바로 🔄 착수 가능합니다.

| 항목 | 내용 |
|:---|:---|
| 제안 방안 | — |
| 선택 근거 | — |
| 예상 리스크 | — |
| 대안 방안 | — |

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 보고 후 Aiden이 작성합니다. 확정 전 구현 코드 작성 금지.**

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | — |
| 수정·보완 사항 | — |
| 착수 승인 | — |

---

## 작업 결과

> **이 섹션은 착수 후 D_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 분리 전략 | — |
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
