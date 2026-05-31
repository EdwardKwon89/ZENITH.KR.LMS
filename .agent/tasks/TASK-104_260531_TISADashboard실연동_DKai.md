# TASK-104 — TISA Dashboard 실 Rate Card 연동 (IMP-093)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-104 |
| **생성일** | 2026-05-31 |
| **할당 Agent** | D_Kai |
| **우선순위** | P1 |
| **전제조건** | TASK-103 ✅ |
| **관련 IMP** | IMP-093 |
| **관련 DEF** | DEF-032 |
| **상태** | 🚫 |

---

## 목표

Order Detail 페이지의 TISA Rate Snapshot을 **하드코딩 Mock에서 DB 실 데이터 연동**으로 전환한다.

- `page.tsx` Mock 객체(`rateCardId:'RC-STD-01'`, `baseAmount:1250.00`) 제거
- `zen_order_rate_snapshots` 테이블 실조회 서버 액션 구현
- 경로 선택 완료(route_option_id 설정) 후 스냅샷 자동 생성
- CORPORATE/INDIVIDUAL 역할 RLS 정책 추가

---

## 배경

현재 `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx:91-103`에 다음 Mock이 하드코딩되어 있다:

```typescript
// Mock initial TISA state (액션 통합 전 브릿지용)
const snapshot = {
  rateCardId: 'RC-STD-01',   // 모든 오더에 동일한 가짜 ID
  baseAmount: 1250.00,        // 모든 오더에 동일한 가짜 금액
  status: 'AUTO' as const,
  ...
};
```

이로 인해:
- 경로 최적화 미수행 오더에도 `$1,250` 표시 — 논리적 모순
- Rate Card 매칭 여부와 무관하게 항상 "Auto Matched" 표시
- TISA 아키텍처(Temporal Invariant)의 불변성 보장이 의미 없음

---

## 설계 확정 사항 (Aiden)

> TISA 스냅샷 캡처 시점: **경로 선택 완료(route_option_id 설정) 이후**

- 경로 미선택 오더: "No rate snapshot applied yet." 표시 (기존 UI fallback 활용)
- 경로 선택 완료 오더: `zen_order_rate_snapshots` 실조회, 결과 없으면 자동 생성 trigger

---

## 작업 범위

### §1 — 서버 액션 구현 (`src/app/actions/orders.ts` 또는 신규 파일)

```typescript
// getOrderRateSnapshot(orderId: string): TisaSnapshot | null
// 1. zen_order_rate_snapshots WHERE order_id = orderId 조회
// 2. 결과 있으면 반환
// 3. 결과 없고 route_option_id 있으면 fn_get_best_matching_rate 호출 → INSERT
// 4. 결과 없고 route_option_id 없으면 null 반환
```

### §2 — page.tsx Mock 제거

```typescript
// 변경 전 (제거)
const snapshot = { rateCardId: 'RC-STD-01', baseAmount: 1250.00, ... };

// 변경 후
const snapshot = await getOrderRateSnapshot(orderId);
```

### §3 — TisaSnapshot 타입 확장 (TASK-103 연계)

`OrderTisaDashboard.tsx`의 `TisaSnapshot` 인터페이스에 TASK-103에서 추가된 필드 반영:
- `carrierCostAmount?: number`
- `platformFeeAmount?: number`

UI에 운송사 원가 / 플랫폼 수수료 / 합계 3줄 표시 (breakdown).

### §4 — RLS 정책 추가

```sql
-- zen_order_rate_snapshots: CORPORATE/INDIVIDUAL 조회 허용 (주문 소유자 기준)
CREATE POLICY "order_members_can_view_own_rate_snapshots"
ON public.zen_order_rate_snapshots
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders o
    WHERE o.id = order_id
      AND public.is_org_member(o.shipper_id)
  )
);
```

### §5 — OrderTisaDashboard UI 보완

경로 미선택 시 fallback 메시지 개선:
```
"경로 최적화를 완료하면 요율이 자동으로 매칭됩니다."
```

---

## DoD (완료 기준)

- [ ] `getOrderRateSnapshot(orderId)` 서버 액션 구현 — DB 실조회 + 자동 생성 로직
- [ ] `page.tsx` Mock 객체 제거 — `getOrderRateSnapshot()` 호출로 전환
- [ ] `TisaSnapshot` 타입에 carrier_cost_amount / platform_fee_amount 추가
- [ ] `OrderTisaDashboard` UI — breakdown 표시 (운송사 원가 / 플랫폼 수수료 / 합계)
- [ ] RLS 정책 마이그레이션 — CORPORATE/INDIVIDUAL 접근 추가
- [ ] 경로 미선택 시 fallback 메시지 개선
- [ ] ZEN-2026-000002 Order Detail에서 경로 미선택 → "No snapshot" 표시 확인
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (커밋 해시 포함)
- [ ] task file `[작업 결과]` 섹션 기재 (커밋 해시 포함) + 상태 🔔로 변경
- [ ] ACTIVE_TASK.md 상태 🚫→🔔 반영
- [ ] `scratch/IMP_PROGRESS.md` IMP-093 행 🔔 갱신

---

## 참조 문서

- `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx` — Mock 위치 (line 91-103)
- `src/components/orders/OrderTisaDashboard.tsx` — UI 컴포넌트
- `supabase/migrations/20260418135000_create_order_rate_snapshots.sql` — 테이블 구조
- `docs/03_Design/De_07_Rate_Governance_TISA.md` — TISA 원칙
- TASK-103 완료 결과 (carrier_cost_amount 컬럼)

---

## [설계 의견]

*(착수 시 D_Kai 기재)*

---

## [설계 확정]

*(Aiden 기재)*

---

## [작업 결과]

*(D_Kai 기재)*

---

## [Aiden 검토]

*(Aiden 기재)*

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:----|:----:|:----|
| 2026-05-31 | Aiden (Claude) | v1.0 — TASK-104 발령. IMP-093 · DEF-032 연계. 전제조건: TASK-103 ✅. UAT 진행 전 필수 처리 항목 |
