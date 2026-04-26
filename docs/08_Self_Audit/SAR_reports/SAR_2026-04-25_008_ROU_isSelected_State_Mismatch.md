# SAR-008: `RouteOptimizationSection` — 경로 선택 후 카드 isSelected 상태 미반영

> **보고서 번호:** SAR_2026-04-25_008  
> **발견일:** 2026-04-25  
> **발견자:** Aiden (UAT-03 정적 검증)  
> **심각도:** 🟡 Medium  
> **상태:** ✅ CLOSED — Aiden 직접 수정 완료 (2026-04-25, 회귀 108/108 PASS)

---

## 1. 문제 요약

`RouteOptimizationSection.tsx`에서 사용자가 경로 옵션 카드의 "이 경로 선택" 버튼을 클릭해도 해당 카드가 "선택됨(isSelected)" 상태로 전환되지 않는 UI 피드백 결함.

---

## 2. 재현 경로

1. 오더 상세 페이지 → Route Optimization 섹션 접근 (기존 선택 없음, `initialAppliedRouteId = null`)
2. "경로 계산하기" 클릭 → 3종 카드 렌더링 확인
3. BALANCED 카드 하단 "이 경로 선택" 버튼 클릭
4. **기대**: BALANCED 카드 버튼이 "선택됨" 으로 전환 + 파란 테두리(ring)
5. **실제**: 카드 상태 변화 없음. 단, 하단 타임라인과 "최종 확정된 경로입니다" 메시지는 정상 노출

---

## 3. 근본 원인 분석

### 타입 불일치 (UUID Scope Mismatch)

| 변수 | 값 | 출처 |
|:---|:---|:---|
| `appliedRouteId` (state, 초기) | `zen_route_options.id` (option UUID) | `initialAppliedRouteId` prop |
| `appliedRouteId` (state, 선택 후) | `zen_order_routes.id` (route record UUID) | `selectRoute()` 반환값 |
| `opt.id` (isSelected 비교 대상) | `zen_route_options.id` | `getRouteOptions()` 반환 데이터 |

```tsx
// RouteOptimizationSection.tsx:46-56
const handleSelect = async (optionId: string) => {
  const result = await selectRoute(orderId, optionId);
  if (result.success) {
    setAppliedRouteId(result.appliedRouteId);  // ← zen_order_routes.id 로 덮어씌워짐
  }
};

// RouteOptionCard 호출 시:
isSelected={appliedRouteId === opt.id ...}
// → zen_order_routes.id === zen_route_options.id → 항상 false
```

`selectRoute` Server Action이 `appliedRouteId`로 `zen_order_routes.id`를 반환하는 것은 명세(Ds-11 BUG-10-A 수정)에 따라 정상이나, 이를 카드 선택 상태 비교에 재사용한 것이 문제.

---

## 4. 영향 범위

| 항목 | 영향 |
|:---|:---|
| DB 데이터 저장 | ✅ 정상 (zen_order_routes 레코드 정상 생성) |
| 타임라인 렌더링 | ✅ 정상 (`appliedRouteId` truthy 조건으로 트리거) |
| 카드 선택 시각 피드백 | ❌ 미반영 |
| 페이지 리로드 후 상태 | ✅ 정상 (`initialAppliedRouteId = selected_option_id` 로 복원) |

운영 데이터 무결성에는 영향 없음. 인터랙티브 선택 흐름에서 UX 피드백 결여.

---

## 5. 수정 방안

**방안 A (권장): `selectRoute` 반환값에 `selectedOptionId` 추가**

```tsx
// routing.ts (Server Action) — 반환값 보완
return { 
  success: true, 
  appliedRouteId: routeRecord?.id ?? orderId,
  selectedOptionId: optionId  // ← zen_route_options.id 추가 반환
};

// RouteOptimizationSection.tsx — 별도 state 관리
const [selectedOptionId, setSelectedOptionId] = useState<string | null>(initialAppliedRouteId || null);

const handleSelect = async (optionId: string) => {
  const result = await selectRoute(orderId, optionId);
  if (result.success) {
    setAppliedRouteId(result.appliedRouteId);
    setSelectedOptionId(result.selectedOptionId);  // ← 별도 추적
  }
};

// isSelected 조건 수정
isSelected={selectedOptionId === opt.id}
```

**방안 B (간단)**: `handleSelect` 내에서 `optionId`를 직접 별도 state에 저장

```tsx
const [selectedOptionId, setSelectedOptionId] = useState<string | null>(initialAppliedRouteId || null);

const handleSelect = async (optionId: string) => {
  const result = await selectRoute(orderId, optionId);
  if (result.success) {
    setAppliedRouteId(result.appliedRouteId);
    setSelectedOptionId(optionId);  // ← 선택 시 option UUID 별도 추적
  }
};
```

---

## 6. 재발 방지 대책

- 반환값의 UUID 의미론적 구분 명시: `appliedRouteId` (route record) vs `selectedOptionId` (option record)
- UI isSelected 비교 시 동일 도메인의 ID를 사용하는지 코드 리뷰 체크

---

## 7. 체크리스트 업데이트

→ `LIVE_PHASE_3_VERIFY.md` [Vault] 섹션에 "경로 선택 후 isSelected 피드백 일치 여부" 항목 추가 예정

---

*작성: Aiden (2026-04-25) | UAT-03 정적 검증 결과*
