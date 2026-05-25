# TASK-092 — 303 복합 운임 Stage 1+2 구현 (Route Decomposer + TISA)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-092 |
| IMP-ID | IMP-086 |
| 생성일 | 2026-05-25 |
| 담당 Agent | Riley |
| 우선순위 | P2 |
| 전제조건 | TASK-088 ✅ (Hub 경로 탐색 완료) |
| 상태 | 🔍 |
| 파급 효과 | CompositePricingEngine, getRouteOptions(), 오더 비용 정산 |

---

## 배경

Phase J(TASK-076, IMP-082)에서 303 Composite Pricing Engine Stage 3+4(Slab Rate Calculator + Surcharge Overlay)만 구현되었다. Hub 경로를 지원하려면:

- **Stage 1 (Route Decomposer)**: 선택된 경로를 세그먼트별로 분해하고, 각 레그의 담당 캐리어를 식별한다
- **Stage 2 (TISA — Tariff and Interline Settlement Agreement)**: 각 레그에 해당하는 캐리어 + 운송 모드 + 유효 기간에 맞는 rate_card를 매핑한다

**현재 구조**: `CompositePricingEngine`이 단일 route option 전체에 단일 rate_card를 적용.
**목표 구조**: 레그별로 개별 캐리어의 rate_card를 조회·적용하여 합산.

**참고 파일**:
- `docs/03_Design/303_COMPOSITE_PRICING_ENGINE.md` — 4-stage 파이프라인 원본 설계
- `src/lib/logistics/pricing/` — 기존 Stage 3+4 구현 위치
- `src/app/actions/operations/routing.ts` L115-135 — 이미 세그먼트 비용 집계 코드 존재

---

## 작업 지시

1. **본 파일 상태 → 📝, ACTIVE_TASK.md TASK-092 → 📝 반영** (TASK-088 ✅ 후 착수)

2. **설계 의견 제출 필수** (알고리즘 결정 필요):

   검토 필요 사항:
   - Stage 1 구현 위치: `CompositePricingEngine` 내부 vs 별도 `RouteDecomposer` 클래스
   - Stage 2 캐리어 매핑: 세그먼트 carrier_id → `zen_rate_cards` 조회 방식
   - TISA 우선순위 적용 기준 (구간별 계약 요율 vs 공시 요율)
   - 특정 레그에 rate_card 없을 경우 fallback 처리

3. **설계 확정 후 구현**:

   **a. `RouteDecomposer` (Stage 1)**
   ```typescript
   // 입력: RouteOption (segments[])
   // 출력: { segment, carrierId, transportMode }[] (레그별 캐리어 식별)
   ```

   **b. `TISARateMatcher` (Stage 2)**
   ```typescript
   // 입력: { carrierId, transportMode, cargo_type, weight, volume }
   // 출력: 해당 rate_card (zen_rate_cards 조회)
   // 기존 Stage 3+4와 연결
   ```

   **c. `CompositePricingEngine` 통합**
   - Stage 1→2→3→4 파이프라인 완성
   - 레그별 개별 비용 + 할증 합산
   - 기존 `getRouteOptions()` action 호환성 유지

4. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

5. **신규 테스트 추가**: 레그별 요율 매핑 + 합산 단위 테스트

6. **코드 커밋**: `[Riley] feat: IMP-086 303 Stage1+2 Route Decomposer + TISA 캐리어별 요율 매핑`

7. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

8. **ACTIVE_TASK.md TASK-092 → 🔔 반영**

9. **`scratch/IMP_PROGRESS.md` IMP-086 행 🔔 갱신**

10. **문서 커밋**: `[Riley] docs: TASK-092 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] 설계 의견 제출 (📝) + Aiden 설계 확정 (🔍→🔄)
- [ ] `RouteDecomposer` (Stage 1) 구현 — 레그별 캐리어 식별
- [ ] `TISARateMatcher` (Stage 2) 구현 — 캐리어별 rate_card 조회
- [ ] Stage 1→2→3→4 파이프라인 통합 동작 확인
- [ ] Hub 경로(2-leg) 세그먼트별 개별 비용 합산 확인
- [ ] rate_card 미존재 시 fallback 처리 확인
- [ ] 신규 단위 테스트 추가
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (해시 기재)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] IMP_PROGRESS.md IMP-086 🔔 갱신
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (Riley 작성)

303 복합 운임 Stage 1+2 구현을 위해 다음과 같이 설계를 제안합니다.

### 1. Stage 1 (RouteDecomposer) 구현
- **클래스 정의**: `RouteDecomposer` 클래스를 `src/lib/logistics/composite-pricing.ts` 내부에 설계합니다.
- **기능**: 입력으로 받은 `RouteOption`에서 `segments` 배열을 순회하여 각 세그먼트의 정보를 Leg 단위의 연산용 객체로 분해합니다.
- **인터페이스**:
  ```typescript
  export interface DecomposedLeg {
    segment: RouteSegment;
    carrierId?: string;
    transportMode: TransportMode;
  }
  
  export class RouteDecomposer {
    decompose(option: RouteOption): DecomposedLeg[] {
      return option.segments.map(seg => ({
        segment: seg,
        carrierId: seg.carrier_id,
        transportMode: seg.transport_mode as TransportMode
      }));
    }
  }
  ```

### 2. Stage 2 (TISARateMatcher) 구현
- **클래스 정의**: `TISARateMatcher` 클래스를 설계합니다.
- **기능**: 분해된 Leg의 `carrierId` 및 `transportMode`에 맞춰 `zen_rate_cards` 및 `zen_surcharges` 테이블에서 활성화된 유효 요율 정보를 조회합니다.
- **TISA 우선순위 적용**: 현재 DB 스키마에는 `customer_id` 필드가 마이그레이션 상에 존재하지 않으므로, `carrier_id`와 `transport_mode`를 기준으로 조회하되, 현재 날짜 기준 유효 기간 필터(`valid_from` <= YYYY-MM-DD, `valid_until` is null or >= YYYY-MM-DD)와 `is_active = true` 조건을 충족하는 카드를 매핑합니다. 여러 카드가 반환될 경우 `valid_from` 최신순으로 정렬하여 첫 번째 카드를 매핑하는 구조를 유지합니다.
- **인터페이스**:
  ```typescript
  export class TISARateMatcher {
    constructor(private supabase: SupabaseClient) {}
    
    async matchRateCard(carrierId: string, mode: TransportMode) {
      const today = new Date().toISOString().split('T')[0];
      let query = this.supabase
        .from('zen_rate_cards')
        .select('tiers, currency')
        .eq('carrier_id', carrierId)
        .eq('transport_mode', mode)
        .eq('is_active', true)
        .lte('valid_from', today)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order('valid_from', { ascending: false })
        .limit(1);
        
      const { data, error } = await query.maybeSingle();
      if (error || !data) return null;
      return data;
    }

    async matchSurcharges(carrierId: string, mode: TransportMode) {
      const today = new Date().toISOString().split('T')[0];
      let query = this.supabase
        .from('zen_surcharges')
        .select('surcharge_type, rate_type, amount, currency')
        .eq('carrier_id', carrierId)
        .eq('transport_mode', mode)
        .eq('is_active', true)
        .lte('valid_from', today)
        .or(`valid_until.is.null,valid_until.gte.${today}`);

      const { data, error } = await query;
      if (error || !data) return [];
      return data;
    }
  }
  ```

### 3. Composite Pricing Engine 통합 및 호환성 확장
- `calculateCompositePricing` 함수를 단일 세그먼트(`carrier_id`, `transport_mode` 제공)뿐만 아니라 `RouteOption` 다중 세그먼트 형태도 직접 수용할 수 있도록 시그니처를 유연하게 구성합니다.
- **입력 인터페이스 확장**:
  ```typescript
  export interface CompositePricingInput {
    weight: number;
    volume: number;
    supabase: SupabaseClient;
    // [호환용] 단일 세그먼트 direct input
    transport_mode?: TransportMode;
    carrier_id?: string;
    // [신규] 다중 세그먼트 pricing
    routeOption?: RouteOption;
  }
  ```
- **다중 세그먼트 파이프라인 연산 흐름**:
  1. `routeOption`이 주어지면, `RouteDecomposer`를 통해 각 레그를 분해합니다.
  2. 각 레그별로 `TISARateMatcher`를 통해 DB에서 `rate_card` 및 `surcharges`를 조회하여 Stage 3 (Slab Rate Calculator) 및 Stage 4 (Surcharge Overlay)를 실행합니다.
  3. 각 레그의 `baseFreight`와 `surcharges`를 하나의 `PricingBreakdown`으로 병합하여 합산하고, 세그먼트 각각의 `cost` 및 `currency` 필드를 계산된 값으로 업데이트합니다.
  4. 단일 세그먼트 호출 시에는 기존 로직을 통해 1개의 레그로 취급하여 단일 Breakdown을 반환합니다.

### 4. rate_card 미존재 시 Fallback 처리
- 특정 레그에 `carrier_id`가 지정되어 있으나 DB에서 유효한 `rate_card`를 찾지 못하는 경우, 요율을 `0원`으로 처리하면 운임이 낮게 나와 최적 경로 선택에 왜곡이 발생합니다.
- 따라서, DB 요율을 매칭할 수 없을 경우 기존 세그먼트에 명시되어 있던 기존 고정 비용(`segment.cost`)을 그대로 fallback으로 유지하고 경고 로그를 기록합니다.

### 5. API 및 서비스 레이어 (`routing.ts`) 연동 간소화
- 기존 `getRouteOptions` 내부에서 각 세그먼트마다 `calculateCompositePricing`을 개별 루프로 호출하여 합산하는 하드코딩된 로직을 제거하고, `calculateCompositePricing`에 `routeOption`을 통째로 전달하여 일관되게 요금을 산출하도록 교체합니다.
- 이를 통해 `routing.ts` 내의 계산 복잡성을 제거하고 요율 계산 파이프라인의 책임을 `CompositePricingEngine`으로 일원화합니다.

---

## 설계 확정 (Aiden 작성)

> ⬜ 설계 의견 수신 후 작성

---

## 작업 결과

> ⬜ 구현 완료 후 작성

---

## Aiden 검토

> ⬜ 🔔 보고 후 검토

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-25 | Aiden (Claude) | Task 생성 — Phase K 303 Stage 1+2 Route Decomposer + TISA (IMP-086) |
