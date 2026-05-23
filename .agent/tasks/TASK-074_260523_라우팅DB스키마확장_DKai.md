# TASK-074 — 지능형 라우팅 DB 스키마 확장

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-074 |
| IMP-ID | IMP-080 |
| 생성일 | 2026-05-23 |
| 담당 Agent | D_Kai |
| 우선순위 | P2 |
| 전제조건 | TASK-070 ✅ · TASK-071 ✅ · TASK-072 ✅ · TASK-073 ✅ (누락 기능 4건 전량 완료 후) |
| 상태 | 🚫 블로커 — 전제조건 미충족 |
| 파급 효과 | 신규 테이블 4개 마이그레이션, 기존 zen_route_options 무변경 |

---

## 배경

지능형 라우팅 & Composite Pricing Engine 구현 Phase-I. 현재 `RoutingEngine`은 `MockMapAdapter`(하드코딩 3개 후보)에 의존하며, `freight-calculator.ts`는 `DUMMY_RATES`를 사용한다. 실제 운송사 데이터·요율 카드를 DB 기반으로 전환하기 위해 스키마 확장이 선행되어야 한다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-074 → 🔄 반영** (전제조건 충족 후 착수)

2. **신규 마이그레이션 파일 4개 생성** (`supabase/migrations/`):

   **a. `zen_carriers` 테이블** — 운송사 마스터
   ```sql
   CREATE TABLE zen_carriers (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     code TEXT NOT NULL UNIQUE,          -- 'ZENITH_AIR', 'ZENITH_SEA' 등
     name TEXT NOT NULL,
     transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

   **b. `zen_route_network` 테이블** — 가용 루트·구간
   ```sql
   CREATE TABLE zen_route_network (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     carrier_id UUID REFERENCES zen_carriers(id) ON DELETE CASCADE,
     from_port_id TEXT NOT NULL,
     to_port_id TEXT NOT NULL,
     transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
     transit_days INTEGER NOT NULL,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(carrier_id, from_port_id, to_port_id, transport_mode)
   );
   ```

   **c. `zen_rate_cards` 테이블** — 요율 카드 (유효기간·중량 슬랩)
   ```sql
   CREATE TABLE zen_rate_cards (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     carrier_id UUID REFERENCES zen_carriers(id) ON DELETE CASCADE,
     transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
     currency TEXT NOT NULL DEFAULT 'USD',
     tiers JSONB NOT NULL,               -- RateTier[] [{weight_min, unit_price}]
     valid_from DATE NOT NULL,
     valid_until DATE,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

   **d. `zen_surcharges` 테이블** — 할증 유형별 요율
   ```sql
   CREATE TABLE zen_surcharges (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     carrier_id UUID REFERENCES zen_carriers(id) ON DELETE CASCADE,
     surcharge_type TEXT NOT NULL,       -- 'FSC', 'SSC', 'PICKUP', 'DELIVERY' 등
     transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
     rate_type TEXT NOT NULL CHECK (rate_type IN ('FLAT','PERCENT','PER_KG')),
     amount NUMERIC NOT NULL,
     currency TEXT NOT NULL DEFAULT 'USD',
     valid_from DATE NOT NULL,
     valid_until DATE,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

3. **RLS 정책 적용**: 전 테이블 ADMIN 전체·MANAGER/SHIPPER SELECT만 허용

4. **시드 데이터 삽입** (테스트용 최소 데이터):
   - zen_carriers 2건 (AIR·SEA)
   - zen_route_network 3건 (ICN→SIN SEA·AIR·LAND+SEA)
   - zen_rate_cards 2건 (AIR·SEA 기본 요율)
   - zen_surcharges 2건 (FSC·SSC)

5. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

6. **코드 커밋**: `[D_Kai] feat: IMP-080 지능형 라우팅 DB 스키마 확장 (4 테이블 마이그레이션)`

7. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

8. **ACTIVE_TASK.md TASK-074 → 🔔 반영**

9. **`scratch/IMP_PROGRESS.md` IMP-080 행 🔔 갱신**

10. **문서 커밋**: `[D_Kai] docs: TASK-074 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `zen_carriers` 마이그레이션 + RLS 적용
- [ ] `zen_route_network` 마이그레이션 + RLS 적용
- [ ] `zen_rate_cards` 마이그레이션 + RLS 적용
- [ ] `zen_surcharges` 마이그레이션 + RLS 적용
- [ ] 시드 데이터 4종 삽입 확인
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (해시 기재)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] IMP_PROGRESS.md IMP-080 🔔 갱신
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (Agent 작성)

> 착수 전 작성 예정.

---

## 설계 확정 (Aiden 작성)

> 착수 시 작성 예정.

---

## 작업 결과

> 이 섹션은 완료 후 D_Kai가 작성합니다.

---

## Aiden 검토

> 이 섹션은 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-23 | Aiden (Claude) | Task 생성 — 지능형 라우팅 Phase-I DB 스키마 확장 지시 (TASK-070~073 완료 후 착수) |
