# TASK-075 — DatabaseRouteAdapter 구현 (MockMapAdapter 교체)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-075 |
| IMP-ID | IMP-081 |
| 생성일 | 2026-05-23 |
| 담당 Agent | B_Kai |
| 우선순위 | P2 |
| 전제조건 | TASK-074 ✅ (zen_carriers·zen_route_network 테이블 존재) |
| 상태 | 🔄 구현 중 |
| 파급 효과 | routing.ts MockMapAdapter 교체, RoutingEngine 인터페이스 무변경 |

---

## 배경

TASK-074로 `zen_carriers`·`zen_route_network` 테이블이 준비되면, `IVirtualMapAdapter` 인터페이스의 실제 DB 구현체를 작성한다. `MockMapAdapter`는 테스트 전용으로 유지하되, 프로덕션 엔진은 `DatabaseRouteAdapter`로 교체한다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-075 → 🔄 반영**

2. **설계 의견 제출 필수** (복잡도 중):
   - `IVirtualMapAdapter` 구현 전략 (DB 직접 조회 vs Cached)
   - `MockMapAdapter` 보존 방법 (테스트 격리 방안)

3. **설계 확정 후 구현**:

   **a. `src/lib/logistics/adapters/DatabaseRouteAdapter.ts` 신규 생성**
   ```typescript
   // IVirtualMapAdapter 구현체
   // zen_carriers + zen_route_network 조인 조회
   // 가능한 구간 조합으로 RouteOption 후보 생성
   ```

   **b. `src/lib/logistics/routing.ts` 수정**
   - `routingEngine` 기본 어댑터를 `DatabaseRouteAdapter`로 교체
   - `MockMapAdapter`는 파일 유지 (테스트 목적)

   **c. `src/app/actions/operations/routing.ts` — `getRouteOptions` 검증**
   - DB 기반 후보가 0건인 경우 처리 (fallback 또는 오류 메시지)

4. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

5. **코드 커밋**: `[B_Kai] feat: IMP-081 DatabaseRouteAdapter 구현 — MockMapAdapter 교체`

6. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

7. **ACTIVE_TASK.md TASK-075 → 🔔 반영**

8. **`scratch/IMP_PROGRESS.md` IMP-081 행 🔔 갱신**

9. **문서 커밋**: `[B_Kai] docs: TASK-075 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `DatabaseRouteAdapter.ts` 신규 구현 (IVirtualMapAdapter 구현)
- [ ] `routingEngine` 기본 어댑터 교체 확인
- [ ] `MockMapAdapter` 테스트 격리 유지 확인
- [ ] `getRouteOptions` 0건 케이스 처리 확인
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (해시 기재)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] IMP_PROGRESS.md IMP-081 🔔 갱신
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (Agent 작성)

### 방안 A (제안) — DatabaseRouteAdapter

**1. 인터페이스 준수**
- `IVirtualMapAdapter.getPotentialRoutes(origin, dest)` — origin·dest는 port code (TEXT)
- 반환 구조: `Omit<RouteOption, 'option_type' | 'score'>[]` — segments·total_cost·total_transit_days

**2. DB 조회 전략 — 직접 조회 (캐싱 불필요)**

`zen_route_network` 1회 쿼리로 전체 후보 조회:

```sql
SELECT r.*, c.name as carrier_name, c.code as carrier_code
FROM zen_route_network r
JOIN zen_carriers c ON r.carrier_id = c.id
WHERE r.is_active = true
  AND (r.from_port_id = origin AND r.to_port_id = dest)  -- 직항
```

멀티 레그(환적) 경로는 `from_port_id IN (hub ports of origin)` 조건으로 2차 쿼리.

**3. 운임 산정**

`zen_rate_cards`에서 carrier·transport_mode·유효기간 매칭:

- Simple 단일 구간: rate_card.tiers 첫 번째 티어 base_rate 사용
- 복수 구간: 각 구간 rate 합산
- Fallback: rate_card 미존재 시 carrier 기본 운임 0원, `total_cost = 0`으로 반환 (scoring에서 처리)

**4. 단일 파일 구성**

`src/lib/logistics/adapters/DatabaseRouteAdapter.ts`:
- `constructor(private supabase: SupabaseClient)`
- SupabaseClient는 action에서 validateUserAction()으로 획득 후 주입 (기존 Repository 패턴과 동일)

**5. MockMapAdapter 보존**
- `MockMapAdapter`는 파일 유지 (파일 삭제 금지)
- `routingEngine` 생성자 기본값을 `DatabaseRouteAdapter`로 교체
- 테스트에서만 명시적 `new RoutingEngine(new MockMapAdapter())` 사용

**6. 0건 처리**
- DB 조회 결과 0건 → 빈 배열 `[]` 반환 → `routingEngine.calculateOptions`에서 `[]` 체크 이미 존재 (L82)

---

## 설계 확정 (Aiden 작성)

**판정: 방안 A 채택** (2026-05-24, Aiden)

### 채택 내용

1. **구현 방식**: DB 직접 조회 (캐싱 불필요) — 방안 A 그대로 채택
2. **쿼리 범위 — Hub routing 제외**: Phase J에서는 **직항 루트만** 구현
   - `from_port_id = origin AND to_port_id = dest` 단일 조건만 사용
   - 멀티 레그(환적) 경로 조회는 Phase K로 유예
3. **운임 산정**: `zen_rate_cards.tiers[0].base_rate` 단순화 허용 (Phase J)
   - `rate_card` 미존재 시 `total_cost = 0` 반환 — scoring에서 처리
4. **MockMapAdapter 보존**: 파일 유지, 테스트에서만 명시적 사용
5. **0건 처리**: 빈 배열 `[]` 반환 — RoutingEngine L82 체크에 위임
6. **SupabaseClient 주입**: Repository 패턴 — action에서 `validateUserAction()` 획득 후 주입

### 착수 승인

📝→🔄: B_Kai 즉시 구현 착수 가능

---

## 작업 결과

> 이 섹션은 완료 후 B_Kai가 작성합니다.

---

## Aiden 검토

> 이 섹션은 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-23 | Aiden (Claude) | Task 생성 — 지능형 라우팅 Phase-II DatabaseRouteAdapter 구현 지시 |
| 2026-05-24 | B_Kai (OpenCode) | 📝 설계 의견 제출 — 방안 A: DB 직접 조회 + segments 합산 + rate_card 운임 |
| 2026-05-24 | Aiden (Claude) | 설계 확정 — 방안 A 채택, Hub routing 제외(직항만·Phase J), tiers[0] 단순화, 착수 승인 📝→🔄 |
