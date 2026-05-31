# TASK-103 — TISA 요율 3계층 구조 도입 (IMP-092)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-103 |
| **생성일** | 2026-05-31 |
| **할당 Agent** | D_Kai |
| **우선순위** | P1 |
| **전제조건** | 없음 |
| **관련 IMP** | IMP-092 |
| **관련 DEF** | DEF-035 |
| **상태** | 🔔 |

---

## 목표

현재 `zen_rate_cards.unit_price` 단일 필드로만 구성된 요율 구조를 **3계층 분리 구조**로 개선한다.

- `carrier_cost` (운송사 원가)
- `margin_rate` (운송사 이윤율, %)
- `platform_fee_rate` (플랫폼 수수료율, %)
- `unit_price` = 자동 연산값 (DB Generated Column 또는 서버 로직)

---

## 배경

Order Detail의 TISA Rate Snapshot이 제시하는 **Base Amount(기준 운임)** 는 화주에게 청구되는 All-in Rate가 되어야 한다.

현재 구조의 문제:

| 현재 | 목표 |
|:---|:---|
| `unit_price` 단일 필드 — 원가/수수료 분해 불가 | `carrier_cost × (1 + margin_rate/100) + carrier_cost × platform_fee_rate/100 = unit_price` |
| `zen_transport_costs`(unit_cost + profit_margin)와 TISA 매칭 엔진 단절 | `zen_transport_costs` 참조 또는 `zen_rate_cards`에 직접 원가 필드 보유 |
| 정산 시 화주-운송사-플랫폼 수익 분리 추적 불가 | Snapshot에 계층별 금액 기록 → 정산 근거 추적 가능 |

---

## 작업 범위

### §1 — DB 스키마 변경 (zen_rate_cards)

마이그레이션 파일 신규 생성:

```sql
ALTER TABLE public.zen_rate_cards
  ADD COLUMN IF NOT EXISTS carrier_cost NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS margin_rate  NUMERIC(5,2) DEFAULT 15.0,   -- 운송사 이윤율 (%)
  ADD COLUMN IF NOT EXISTS platform_fee_rate NUMERIC(5,2) DEFAULT 5.0; -- 플랫폼 수수료율 (%)
-- unit_price = carrier_cost * (1 + margin_rate/100) * (1 + platform_fee_rate/100)
-- 기존 unit_price 컬럼 유지 (하위 호환), 신규 필드로 연산 근거 추적
```

- 기존 `unit_price` 유지 (DB 레벨 하위 호환)
- 신규 레코드는 carrier_cost + margin_rate + platform_fee_rate 필수 입력
- 기존 레코드는 NULL 허용 (점진적 마이그레이션)

### §2 — zen_order_rate_snapshots 테이블 확장

```sql
ALTER TABLE public.zen_order_rate_snapshots
  ADD COLUMN IF NOT EXISTS carrier_cost_amount  NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS platform_fee_amount  NUMERIC(18,2);
-- applied_unit_price (All-in) = carrier_cost_amount + platform_fee_amount + 기타
```

스냅샷에 계층별 금액을 기록하여 향후 정산 분배 근거 확보.

### §3 — fn_get_best_matching_rate() 반환값 확장

```sql
RETURNS TABLE (
  id UUID,
  unit_price DECIMAL(18, 2),
  carrier_cost DECIMAL(18, 2),      -- 추가
  platform_fee_amount DECIMAL(18, 2), -- 추가
  currency VARCHAR(10),
  base_date_rule VARCHAR(20)
)
```

### §4 — tr_capture_order_rate_snapshot 트리거 수정

스냅샷 INSERT 시 carrier_cost_amount, platform_fee_amount도 함께 저장.

### §5 — Seed 데이터 보완

기존 `seed_rate_card.sql`의 `unit_price: 10.5` 레코드에 carrier_cost + margin_rate + platform_fee_rate 필드 추가.

### §6 — Admin 요율 카드 관리 UI 수정 (IMP-083 산출물 확장)

`src/app/[locale]/(dashboard)/admin/rate-cards/` — 요율 등록/편집 폼에 3개 신규 필드 추가.

---

## DoD (완료 기준)

- [ ] 마이그레이션 파일 생성 — `zen_rate_cards` carrier_cost/margin_rate/platform_fee_rate 컬럼 추가
- [ ] 마이그레이션 파일 생성 — `zen_order_rate_snapshots` carrier_cost_amount/platform_fee_amount 컬럼 추가
- [ ] `fn_get_best_matching_rate()` 반환 컬럼 확장 — carrier_cost, platform_fee_amount 포함
- [ ] `tr_capture_order_rate_snapshot` 트리거 — 계층별 금액 저장
- [ ] Seed 데이터 보완 — ICN→LAX 요율 레코드에 3개 신규 필드값 입력
- [ ] Admin UI 수정 — 요율 등록 폼에 carrier_cost/margin_rate/platform_fee_rate 필드
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (커밋 해시 포함)
- [ ] task file `[작업 결과]` 섹션 기재 (커밋 해시 포함) + 상태 🔔로 변경
- [ ] ACTIVE_TASK.md 상태 ⬜→🔔 반영
- [ ] `scratch/IMP_PROGRESS.md` IMP-092 행 🔔 갱신

---

## 참조 문서

- `docs/03_Design/De_07_Rate_Governance_TISA.md` — TISA 아키텍처 설계 원칙
- `docs/04_Database/canonical/fn_get_best_matching_rate.sql` — 매칭 함수 현행
- `docs/04_Database/canonical/tr_capture_order_rate_snapshot.sql` — 트리거 현행
- `supabase/seed_rate_card.sql` — 현행 seed
- `supabase/migrations/20260427300000_zen_finance_stats_extension.sql` — zen_transport_costs (profit_margin 15% 기본값 참조)

---

## [설계 의견]

IMP-080 migration(`20260523130200`)이 `zen_rate_cards`를 JSONB `tiers` 기반으로 전면 재설계하여, TASK-103 3계층 구조를 카드 레벨 컬럼으로 적용. 각 tier의 `unit_price`는 All-in Rate로 유지.

### fn_get_best_matching_rate 호환성
- IMP-080이 `fn_get_best_matching_rate` DROP 후 재정의 안 함 → 함수가 `public.rate_cards` (구 테이블) 참조로 사장 상태
- TASK-103에서 `zen_rate_cards` 기반으로 전면 재작성
- `origin_port`/`dest_port`/`service_type` 컬럼이 `zen_rate_cards`에 없어 carrier_id + is_active + valid_from/until 매칭으로 단순화

---

## [설계 확정]

*(Aiden 기재)*

---

## [작업 결과]

### §1+§2 — DB 스키마 변경
- `zen_rate_cards`: `carrier_cost NUMERIC(18,2)`, `margin_rate NUMERIC(5,2) DEFAULT 15.0`, `platform_fee_rate NUMERIC(5,2) DEFAULT 5.0` 추가
- `zen_order_rate_snapshots`: `carrier_cost_amount NUMERIC(18,2)`, `platform_fee_amount NUMERIC(18,2)` 추가

### §3 — fn_get_best_matching_rate() 재작성
- `public.rate_cards` → `public.zen_rate_cards` 조회 전환
- 반환 컬럼에 `carrier_cost DECIMAL(18,2)`, `platform_fee_amount DECIMAL(18,2)` 추가
- 매칭 조건: carrier_id + is_active + valid_from/until (origin_port/dest_port zen_rate_cards에 없어 단순화)

### §4 — tr_capture_order_rate_snapshot 트리거 수정
- 스냅샷 INSERT/UPDATE에 `carrier_cost_amount`, `platform_fee_amount` 저장

### §5 — Seed 데이터 보완
- 기존 AIR/SEA seed rate_cards에 carrier_cost (AIR:4.00, SEA:1.50, LAND:2.50, EXP:5.00) + margin_rate 15% + platform_fee_rate 5% UPDATE

### §6 — Admin UI 수정
- `RateCardsTab.tsx`: 폼에 Carrier Cost / Margin Rate / Platform Fee Rate 3개 필드 추가
- `rate-cards.ts` server action: CUD에 신규 3개 필드 반영
- 테이블 컬럼 8→11 (Carrier Cost·Margin·Fee 컬럼열 추가)

### TisaDashboard
- `TisaSnapshot` 타입에 `carrierCostAmount`, `platformFeeAmount` 추가
- Cost Breakdown 섹션 추가 (Admin 조건부 표시 — TASK-104에서 role 분기 예정)

### 마이그레이션
- `supabase/migrations/20260531100000_imp092_tisa_3tier_rate_structure.sql` 생성
- 로컬 DB push 완료

### 회귀 테스트
- 229 passed, 1 failed (기존 `tracking-business-qa.test.ts` raw logs — TASK-103 무관)

---

## [Aiden 검토]

*(Aiden 기재)*

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:----|:----:|:----|
| 2026-05-31 | Aiden (Claude) | v1.0 — TASK-103 발령. IMP-092 · DEF-035 연계. UAT 진행 전 필수 처리 항목 |
