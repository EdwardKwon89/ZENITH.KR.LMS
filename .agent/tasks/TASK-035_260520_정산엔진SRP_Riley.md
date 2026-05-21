# TASK-035 — 정산 엔진 단일 책임 원칙 (SRP) 분할

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-035 |
| IMP-ID | IMP-030 |
| 생성일 | 2026-05-20 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P3 |
| 전제조건 | TASK-027 완료 후 착수 권장 (트랜잭션 안정화 후 SRP 분할) |
| 상태 | ✅ 완료 |
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

- [x] `settlement/` 디렉토리 내 3개 클래스 + Facade + barrel 생성
- [x] 각 파일 200줄 이하 (ZEN_A4 기준)
- [x] 기존 `SettlementEngine` 외부 인터페이스 100% 유지
- [x] `gitnexus_impact` 결과 기록
- [x] `gitnexus_detect_changes()` 결과 확인
- [x] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [x] `[Gemini] refactor: IMP-030` 코드 커밋 완료 (해시 기재)
- [x] `[Gemini] docs: TASK-035` 문서 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] `scratch/IMP_PROGRESS.md` IMP-030 행 갱신

---

## 설계 의견 (Riley 작성)

> **복잡 Task — 설계 의견 제출 권장.**

| 항목 | 내용 |
|:---|:---|
| 클래스 분할 경계 | **1. SlabRateCalculator**: Chargeable Weight 기반 슬래브 구간 단가 산출 전담 (`calculateSlabRate` 유틸 및 DB 단가 매칭 처리).<br>**2. CostAggregator**: 오더 패키지 목록 분석을 통한 `Chargeable Weight` 집계 로직(`calculateChargeableWeight`) 및 총 정산 금액 합산 처리.<br>**3. SettlementValidator**: 오더 필수 데이터 검증(포트 코드, 운송 모드 존재 여부) 및 이미 인보이스가 발행된 비용에 대한 재계산 차단 제어. |
| Facade 인터페이스 | `SettlementEngine` 및 `InvoiceGenerator` 클래스를 Facade 컴포넌트로 두어 기존 외부 호출 인터페이스를 100% 동일하게 유지합니다 (`calculateOrderCosts(orderId)` 및 `generateInvoice(orderId)` 메서드 서명 불변). |
| 호출자 영향 범위 | `@/lib/finance/settlement` 경로를 barrel export(`index.ts`)를 통해 디렉토리 기반 모듈로 전환하므로, 기존 호출자(`src/app/actions/finance/settlement.ts`, `invoice.ts` 등)의 import 경로는 수정 없이 그대로 호환됩니다. (영향 범위 최소화) |
| 예상 리스크 | - 패키지 정보가 누락되어 `cargo_details` JSONB 필드를 파싱하는 예외 흐름에서의 타입 안전성 검증.<br>- 리팩토링 후 기존 단위/통합 테스트의 통과 보장 (회귀 테스트를 통한 세밀한 검증 필요). |

---

## 설계 확정 (Aiden 작성)

| 항목 | 내용 |
|:---|:---|
| 확정 분할 경계 | **SlabRateCalculator**: Chargeable Weight 기반 슬래브 구간 단가 산출 전담 — `calculateSlabRate` + DB 단가 매칭 처리. **CostAggregator**: 패키지 목록 분석 → `calculateChargeableWeight` 집계 + 총 정산 금액 합산 전담. **SettlementValidator**: 오더 필수 데이터 검증(포트 코드·운송 모드) + 인보이스 재계산 차단 전담. **SettlementEngine + InvoiceGenerator**: Facade 역할 — `calculateOrderCosts(orderId)` · `generateInvoice(orderId)` 메서드 서명 100% 불변 유지 |
| 수정·보완 사항 | ① 각 분리 파일은 **200줄 이하** 유지 필수 (ZEN_A4 기준) — DoD에 파일별 줄 수 기재 ② `cargo_details` JSONB 파싱 로직은 `CostAggregator` 내부에서 타입 가드 처리 (`z.object` 또는 `as unknown as Type` 대신 명시적 파싱) ③ `settlement/index.ts` barrel export — 기존 `@/lib/finance/settlement` import 경로 변경 없음 확인 필수 ④ `InvoiceGenerator`도 Facade 파일(`settlement.ts`)에 유지하거나 별도 `invoice-generator.ts` 분리 가능 — Riley 판단에 위임. 단, 외부 인터페이스(메서드 서명) 불변 필수 ⑤ 구현 착수 전 `gitnexus_impact({target: "SettlementEngine", direction: "upstream"})` 실행 + 결과 기재 의무 |
| 착수 승인 | ✅ 2026-05-21 Aiden 확정 — 즉시 🔄 착수 가능 |

---

## 작업 결과

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-20 |
| 완료일 | 2026-05-21 |
| 생성 파일 목록 | - `src/lib/finance/settlement/slab-rate-calculator.ts`<br>- `src/lib/finance/settlement/cost-aggregator.ts`<br>- `src/lib/finance/settlement/settlement-validator.ts`<br>- `src/lib/finance/settlement/invoice-generator.ts`<br>- `src/lib/finance/settlement/settlement.ts`<br>- `src/lib/finance/settlement/index.ts` |
| 각 파일 줄 수 | - `slab-rate-calculator.ts`: 22줄<br>- `cost-aggregator.ts`: 63줄<br>- `settlement-validator.ts`: 21줄<br>- `invoice-generator.ts`: 98줄<br>- `settlement.ts`: 152줄<br>- `index.ts`: 5줄 (전체 ZEN_A4 200줄 이하 기준 충족) |
| gitnexus_impact 결과 | Target: `SettlementEngine`, Direction: `upstream`, Risk: `CRITICAL`<br>Direct Callers: `calculateSettlementAction`, `generateInvoicesForOrder`, `generateInvoice`<br>Affected Processes: `handleScan` (InventoryScanner.tsx), `handleUpdate` (StatusChangeModal.tsx), `generateInvoiceAction` (invoice.ts) |
| 회귀 결과 | 전체 209개 테스트 통과 PASS ([REGRESSION_2026-05-20_TASK-035.log](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-20_TASK-035.log)) |
| 코드 커밋 해시 | `965690356359d0f456205bae8ff9d519d8c3ccfa` |
| 문서 커밋 해시 | `2c4f0cfd44dafab52c1a9664ed8ce1409c3ba9fc` |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-21 |
| 판정 | ✅ PASS |
| 검토 의견 | 코드 커밋 `9656903` 실측: settlement/ 디렉토리 신설(slab-rate-calculator·cost-aggregator·settlement-validator·invoice-generator·settlement·index 6파일) + 기존 settlement.ts 대체 ✅. 각 파일 200줄 이하(최대 152줄) ✅. doc commit `2c4f0cf`: task file ✅ + ACTIVE_TASK.md ✅ + IMP_PROGRESS.md ✅. 209/209 PASS ✅. 기존 `@/lib/finance/settlement` import 경로 barrel export 유지 ✅. **Advisory**: gitnexus_impact CRITICAL(3 direct callers) 결과에도 Aiden 사전 보고 없이 착수 — 설계 확정 지시에 명시적 중단 요건 미포함이었으므로 수용 가능. Facade 패턴으로 외부 인터페이스 100% 유지·회귀 0건 확인. `9656903`에 TASK-028 regression log 혼입(경미, 내용 정합성 문제 없음). IMP-030 완료. |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-20 | Aiden (Claude) | Task 생성 — Phase G 작업 지시 발령 |
| 2026-05-20 | Riley (Gemini) | 설계 의견 제출 — SlabRateCalculator·CostAggregator·SettlementValidator 3클래스+Facade 분할 제안. 📝→🔍 |
| 2026-05-21 | Aiden (Claude) | 설계 확정 — 3클래스+Facade 승인. 파일 200줄 이하·JSONB 타입가드·barrel export 확인·gitnexus_impact 필수 조건 추가. 🔍→🔄 착수 승인 |
| 2026-05-21 | Riley (Gemini) | SRP 분할 구현 및 회귀 테스트 완료 보고. 🔄→🔔 |
| 2026-05-21 | Aiden (Claude) | ✅ PASS — 코드 9656903(6파일 분할)·문서 2c4f0cf. 각 파일 200줄 이하. 209/209. IMP-030 완료 |
