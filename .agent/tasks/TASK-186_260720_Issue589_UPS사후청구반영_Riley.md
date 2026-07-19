# TASK-186 — [Team A] UPS 사후청구(실제 추가요금) 반영 — Issue #589 An_16 구현 (Riley)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-186 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | Riley |
| **우선순위** | P2 |
| **전제조건** | 없음 (설계 확정 완료 — Issue #589 [설계 확정] 코멘트 참조) |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-186-ups-actual-charges-riley` |
| **커밋 태그** | `[Gemini]` |
| **상태** | 🔄 |

---

## [배경]

JSJung 요청("UPS 최종 배송 완료 후 UPS측 청구서를 바탕으로 오더별 추가 운임을 반영해야 함")에 대해 Jaison이 `docs/02_Analysis/An_16_예상운임_UPS사후청구_반영_설계.md` 설계안을 작성했고, Aiden이 Issue #589에 [설계 확정] 승인 완료(2026-07-19). 이후 Edward와의 논의를 거쳐 입력 시점/화면 구조에 대한 구체 방향도 확정됨(Issue #589·#607 코멘트 참조). 본 Task는 이 설계를 실제 코드로 구현한다.

**필독**: 착수 전 `docs/02_Analysis/An_16_예상운임_UPS사후청구_반영_설계.md` 전체와 GitHub Issue #589의 모든 코멘트(Aiden [설계 확정] + 화면/시점 권고)를 먼저 읽을 것.

---

## [작업 범위]

### 1. 신규 테이블 `zen_ups_actual_charges` (An_16 §2-1)
```sql
CREATE TABLE zen_ups_actual_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES zen_orders(id) ON DELETE CASCADE,
  ups_invoice_no text,
  charge_type text NOT NULL,              -- 자유 텍스트로 시작 (CHECK 제약 없음 — 실 UPS 청구서 샘플 축적 후 후속 마이그레이션에서 제약 추가 검토)
  charge_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  ups_invoice_date date,
  entered_by uuid REFERENCES zen_profiles(id),
  entered_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
```
- RLS: ADMIN/MANAGER 전체 CRUD, SHIPPER/AGENCY는 본인 오더 한정 SELECT만(`is_org_member` 패턴 재사용)
- 오더 1건에 여러 항목 가능(1:N) — **여러 차례에 걸쳐 추가 등록 가능해야 함**(UPS 청구서가 시차를 두고 여러 건 도착하는 경우가 실무상 흔함)

### 2. `zen_order_costs`에 신규 cost_type 추가 (An_16 §2-2)
- `'UPS_ACTUAL_ADJUSTMENT'` — `SUM(zen_ups_actual_charges.charge_amount) - (기존 BASE_FREIGHT+FUEL_SURCHARGE+SURGE_FEE+OTHER_CHARGE 합계)` 차액을 upsert. 음수(예상보다 실제가 적음) 허용.
- **이미 인보이스가 발행된 조정분은 잠금**(수정 불가) — `addManualOrderCost()`(`src/app/actions/finance/settlement.ts`)가 이미 쓰는 "인보이스 확정 후 잠금" 패턴 그대로 재사용할 것.

### 3. 신규 서버 액션 (`src/app/actions/finance/ups-actual-charges.ts`)
```ts
recordUpsActualCharges(orderId: string, charges: { chargeType: string; amount: number; currency: string; upsInvoiceNo?: string; notes?: string }[]): Promise<{ success: boolean; adjustmentAmount?: number; error?: string }>
getUpsActualCharges(orderId: string): Promise<UpsActualCharge[]>
getUpsChargeReconciliation(orderId: string): Promise<{ estimated: number; actual: number; variance: number; currency: string }>
```
- `recordUpsActualCharges`는 ADMIN/MANAGER 전용
- `DELIVERED` 상태 이전 오더에는 등록 불가하도록 서버 액션 내부에서 검증

### 4. UI — 하이브리드 구조 (Issue #589·#607 코멘트 확정 방향)
**(a) 신규 배치 처리 화면 — 주 입력 진입점** (예상 경로: `/admin/ups-actual-charges` 또는 유사)
- UPS 청구서 1장에 실무상 수십~수백 건이 한꺼번에 오는 특성 반영 — `DELIVERED` 상태 오더를 오더번호/운송장번호/UPS 청구서번호로 검색해 빠르게 여러 건을 순차 입력하는 목록형 화면
- 각 항목에 예상운임(estimated) vs 실제 청구액(actual) vs 차액(variance) 비교 표시

**(b) 기존 Order Detail 화면(`src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx`)에 표시 섹션 추가**
- `isUpsOrder` 조건부로, 실제 청구 내역 + 예상 대비 차액을 **읽기 위주로 표시**(단건 수정/추가 입력도 가능하게)
- **주의**: Issue #607(UPS 전용 Order Detail 화면 분리)은 아직 Team B 검토 중인 별개 사안 — 그 결정을 기다리지 말고, 지금 있는 기존 통합 Order Detail 화면의 `isUpsOrder` 조건부 섹션 안에 추가할 것. 나중에 #607이 확정되어 화면이 분리되면 이 섹션만 옮기면 되는 구조로 작성(컴포넌트 분리 권장).

두 화면 모두 동일 서버 액션(`recordUpsActualCharges`/`getUpsActualCharges`/`getUpsChargeReconciliation`)을 재사용할 것 — 중복 로직 작성 금지.

### 5. 입력 편의
- `charge_type`은 자유 텍스트 input이되, 자주 쓰이는 UPS surcharge 이름(연료할증·주거지배송·주소정정·성수기할증 등)을 `<datalist>` 자동완성으로 제공해 오타 방지

---

## [구현 시 참고 — 확인 필요했던 3개 항목의 처리 방향 (Aiden 권고, 착수를 막는 blocker 아님)]

1. `charge_type` enum — 위 §1대로 자유 텍스트로 시작
2. 화주 알림 트리거 — 다른 주문 상태 변경과 동일한 알림 관례 적용(기본 발송)
3. RLS 최종안 — 기존 `is_org_member` 패턴 재사용

---

## [DoD]

- [ ] `zen_ups_actual_charges` 테이블 + RLS 정책 마이그레이션 작성 및 적용
- [ ] `zen_order_costs`에 `UPS_ACTUAL_ADJUSTMENT` cost_type 정상 동작(차액 계산 정확성 단위 테스트 포함)
- [ ] 서버 액션 3종 구현 + 단위 테스트
- [ ] 배치 처리 화면 구현(DELIVERED 오더 검색 → 항목 입력 → 예상/실제/차액 표시)
- [ ] Order Detail 화면에 읽기 섹션(+ 단건 입력) 추가
- [ ] 인보이스 발행 후 잠금 로직 검증(테스트 포함)
- [ ] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [ ] `check-R17-DoD` 자가 검증 통과
- [ ] 문서 커밋 해시 기재

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Riley] feat: TASK-186 UPS 사후청구 반영 — Issue #589 An_16 구현`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 589 --add-label status:review --remove-label status:in-progress`
5. `scratch/IMP_PROGRESS.md` 해당 없음(IMP 미연동 Task)
6. `check-R17-DoD` 실행 통과 확인
7. **[문서 커밋]** `[Riley] docs: TASK-186 완료 보고 — task file 🔔`
8. **[PR 생성]** `feature/teama-task-186-ups-actual-charges-riley → develop`, `Closes #589`

---

## [발견 이슈]

없음

---

## [작업 결과]

_(착수 시 작성)_
