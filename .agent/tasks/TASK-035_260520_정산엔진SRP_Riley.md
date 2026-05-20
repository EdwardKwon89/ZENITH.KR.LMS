# TASK-035 — 정산 엔진 단일 책임 원칙 (SRP) 분할

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-035 |
| IMP-ID | IMP-030 |
| 생성일 | 2026-05-20 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P3 |
| 전제조건 | TASK-027 완료 후 착수 권장 (트랜잭션 안정화 후 SRP 분할) |
| 상태 | ⬜ 미착수 |
| 파급 효과 | 없음 (독립 Task) |

---

## 배경

`src/lib/finance/settlement.ts` 288줄 — `SettlementEngine`(L22~L186)과 `InvoiceGenerator`(L188~L288) 혼재.
`calculateOrderCosts` 단일 메서드 120+줄 — 슬래브 요율 계산·비용 집계·정산 검증 혼재.
단일 책임 위반으로 단위 테스트 작성이 어렵고 변경 시 회귀 위험 높음.

- **목표**: `SlabRateCalculator`, `CostAggregator`, `SettlementValidator` 3개 클래스 분리
- `SettlementEngine`은 Facade 역할로 전환 (기존 호출자 인터페이스 유지)

참조: `scratch/post_launch_improvements.md §IMP-030` · `src/lib/finance/settlement.ts`

> **⚠️ 복잡도 높음 (2~3 MD)**: 분할 경계 결정이 필요하므로 📝→🔍 설계 의견 절차 권장.
> 단, 구현 방향이 자명하다고 판단 시 ⬜→🔄 직행 가능.

---

## 작업 지시 (설계 의견 제출 시)

1. **본 파일 상태 → 📝, ACTIVE_TASK.md TASK-035 → 📝 동시 반영**
2. `src/lib/finance/settlement.ts` 전체 구조 분석
3. `gitnexus_context({name: "SettlementEngine"})` — 의존 관계 파악
4. **[설계 의견] 섹션 작성**:
   - 3개 클래스 분할 경계 제안 (각 클래스 책임 명시)
   - Facade 인터페이스 유지 전략
   - 기존 호출자(`finance.ts` 등) 영향 범위
   - 분할 후 예상 파일 구조
5. **본 파일 상태 → 🔍** — Aiden 설계 확정 대기

## 작업 지시 (🔄 착수 후)

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-035 → 🔄 동시 반영**
2. `gitnexus_impact({target: "SettlementEngine", direction: "upstream"})` — 영향 범위 확인
3. `src/lib/finance/settlement/` 디렉토리 신설:
   - `slab-rate-calculator.ts` — 슬래브 요율 계산 전담
   - `cost-aggregator.ts` — 비용 집계 전담
   - `settlement-validator.ts` — 정산 검증 전담
   - `settlement.ts` — Facade (기존 인터페이스 유지)
   - `index.ts` — barrel export
4. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
5. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
6. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-035.log`
7. **코드 커밋**: `[Gemini] refactor: IMP-030 SettlementEngine SRP 분할 — 3클래스+Facade`
8. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
9. **ACTIVE_TASK.md TASK-035 → 🔔 반영**
10. **`scratch/IMP_PROGRESS.md` IMP-030 행 🔔 갱신**
11. **문서 커밋**: `[Gemini] docs: TASK-035 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `settlement/` 디렉토리 내 3개 클래스 + Facade + barrel 생성
- [ ] 각 파일 200줄 이하 (ZEN_A4 기준)
- [ ] 기존 `SettlementEngine` 외부 인터페이스 100% 유지
- [ ] `gitnexus_impact` 결과 기록
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[Gemini] refactor: IMP-030` 코드 커밋 완료 (해시 기재)
- [ ] `[Gemini] docs: TASK-035` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-030 행 갱신

---

## 설계 의견 (Riley 작성)

> **복잡 Task — 설계 의견 제출 권장.**

| 항목 | 내용 |
|:---|:---|
| 클래스 분할 경계 | — |
| Facade 인터페이스 | — |
| 호출자 영향 범위 | — |
| 예상 리스크 | — |

---

## 설계 확정 (Aiden 작성)

> **이 섹션은 📝 보고 후 Aiden이 작성합니다. 확정 전 구현 코드 작성 금지.**

| 항목 | 내용 |
|:---|:---|
| 확정 분할 경계 | — |
| 수정·보완 사항 | — |
| 착수 승인 | — |

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 생성 파일 목록 | — |
| 각 파일 줄 수 | — |
| gitnexus_impact 결과 | — |
| 회귀 결과 | — |
| 코드 커밋 해시 | — |
| 문서 커밋 해시 | — |

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
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령 |
