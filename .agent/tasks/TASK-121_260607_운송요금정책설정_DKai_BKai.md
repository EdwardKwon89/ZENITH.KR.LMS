# TASK-121 — 운송수단별 요금 산정 정책 설정 기능

> **생성일**: 2026-06-07
> **발령자**: Aiden (Claude)
> **담당 Agent**: D_Kai (DB·엔진) + B_Kai (Admin UI)
> **우선순위**: P2
> **전제조건**: TASK-120 ✅ (Phase 6 회귀 안정 확인 후 착수 권장)
> **IMP 연계**: IMP-105 (신규)

---

## 배경 및 목적

현재 `zen_rate_cards.tiers`는 `weight_min` / `unit_price(per kg)` / `min_total_price` 만 존재하며, **부피(CBM) 기반 요금 산정이 불가**하다.

국제 화물 표준 운임 산정 방식:

| 운송수단 | 표준 방식 | 설명 |
|:-------|:---------|:----|
| AIR | VOLUMETRIC | 부피중량(CBM × 1,000,000 ÷ divisor) vs 실중량 중 높은 쪽으로 weight tier 적용. AIR divisor = 6,000 |
| EXP | VOLUMETRIC | 동일 방식. EXP divisor = 5,000 |
| SEA | WM | 중량단가(per kg) vs 용적단가(per CBM) 각각 산출 후 높은 쪽 채택 |
| LAND | WM | 동일 방식 |

본 태스크는 운송수단별 산정 정책을 **Admin이 DB에서 직접 설정·변경**할 수 있는 기능을 구현한다.

---

## 구현 범위

### 1. DB 마이그레이션

**신규 테이블 `zen_transport_pricing_policies`**:

```sql
CREATE TABLE zen_transport_pricing_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_mode  TEXT NOT NULL UNIQUE CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
  pricing_method  TEXT NOT NULL CHECK (pricing_method IN ('WEIGHT_ONLY','VOLUMETRIC','WM')),
  volumetric_divisor INTEGER,          -- VOLUMETRIC 방식 전용 (AIR=6000, EXP=5000)
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID REFERENCES zen_profiles(id)
);
```

**기본 데이터 (INSERT)**:

| transport_mode | pricing_method | volumetric_divisor | description |
|:----|:----|:----:|:----|
| AIR | VOLUMETRIC | 6000 | IATA 항공 부피중량 기준 (L×W×H cm³ ÷ 6,000) |
| EXP | VOLUMETRIC | 5000 | 특송 부피중량 기준 (L×W×H cm³ ÷ 5,000) |
| SEA | WM | null | 해운 W/M 방식 (중량 vs 용적 병산) |
| LAND | WM | null | 육상 W/M 방식 (중량 vs 용적 병산) |

**`zen_rate_cards.tiers` JSONB 확장** (WM 방식 전용):
- 기존: `{ weight_min, unit_price, min_total_price }`
- 확장: `{ weight_min, unit_price, cbm_price, min_total_price }`
- `cbm_price`: SEA/LAND 카드에만 입력. AIR/EXP는 null 허용.

RLS: ADMIN만 INSERT/UPDATE/DELETE, 전 역할 SELECT.

---

### 2. Admin 설정 화면

**경로**: `/admin/settings/transport-policies`

**화면 구성**:
- 페이지 제목: "운송 요금 산정 정책"
- 설명: "운송수단별 요금 산정 방식을 설정합니다. 변경 즉시 신규 오더 비용 산정에 적용됩니다."
- 4행 고정 테이블 (AIR / EXP / SEA / LAND — 행 추가/삭제 불가, 수정만 허용)

**테이블 컬럼**:

| 컬럼 | 내용 |
|:----|:----|
| 운송수단 | AIR / EXP / SEA / LAND (수정 불가) |
| 산정 방식 | WEIGHT_ONLY / VOLUMETRIC / WM select |
| 부피중량 제수 | VOLUMETRIC 선택 시만 활성화 (숫자 입력, 기본 AIR=6000 / EXP=5000) |
| 설명 | 자유 텍스트 |
| 마지막 수정 | 수정자 + 수정일시 |
| 저장 | 행별 "저장" 버튼 |

**디자인**: 운송 서비스 요율 목록과 동일 패턴 (ZenDataGrid 인라인 수정 또는 행별 모달)

**사이드바 위치**: `기본정보` 하위 메뉴 → `{ title: "요금 산정 정책", href: "/admin/settings/transport-policies" }` (ADMIN only)

---

### 3. 비용 산정 엔진 수정

**대상 함수**: `calculate_order_costs(order_id UUID)` (PostgreSQL stored function)

**수정 로직**:
```
-- 운송 요율 산정 시
1. zen_transport_pricing_policies에서 transport_mode의 policy 조회
2. WEIGHT_ONLY → 기존 로직 유지 (실중량 × weight tier)
3. VOLUMETRIC → chargeable_weight = MAX(actual_weight_kg, cargo_cbm * 1,000,000 / divisor)
               → chargeable_weight로 weight tier 적용
4. WM → weight_cost = actual_weight_kg × tier.unit_price
        cbm_cost = cargo_cbm × tier.cbm_price
        → MAX(weight_cost, cbm_cost) 채택
```

**영향 함수**: `fn_get_best_matching_rate` 포함 검토 필요.

---

### 4. RateTierEditor UI 수정

**대상 파일**: `src/components/admin/RateTierEditor.tsx`

WM 방식 카드 등록 시 `cbm_price` 입력 필드 추가:
- `RateCardForm`이 현재 선택된 `serviceType`을 `RateTierEditor`에 전달
- SEA / LAND 선택 시 각 tier 행에 `CBM단가` 컬럼 표시
- AIR / EXP 선택 시 `CBM단가` 컬럼 숨김

---

### 5. 회귀 테스트 케이스 추가

`LIVE_REGRESSION_TEST_MAP.md` 에 아래 항목 추가:

| TC-ID | 시나리오 | 기대 결과 |
|:------|:--------|:---------|
| TC-POLICY-01 | AIR 오더 부피중량 > 실중량 시 비용 산정 | 부피중량 기준 tier 적용 |
| TC-POLICY-02 | AIR 오더 실중량 > 부피중량 시 비용 산정 | 실중량 기준 tier 적용 |
| TC-POLICY-03 | SEA 오더 중량단가 > 용적단가 시 | 중량단가 채택 |
| TC-POLICY-04 | SEA 오더 용적단가 > 중량단가 시 | 용적단가 채택 |
| TC-POLICY-05 | Admin 정책 VOLUMETRIC→WM 변경 후 오더 산정 | 변경된 방식 즉시 반영 |

---

## 착수 절차 (R-17)

- **복잡도 판단**: 복잡 Task (DB·엔진·UI 3영역 + 기존 함수 영향도 분석 필요)
- **권장 경로**: ⬜ → 📝(설계 의견 제출) → 🔍(Aiden 확정) → 🔄

**D_Kai 착수 전 필수 확인**:
1. `calculate_order_costs` 현재 구현 전체 독해
2. `fn_get_best_matching_rate` 영향도 분석 (`gitnexus_impact` 실행)
3. WM 방식 시 `tier.cbm_price` null 처리 (기존 데이터 호환)

**B_Kai 착수 조건**: D_Kai `[설계 확정]` 이후 Admin UI 착수 (DB 스키마 확정 전 UI 착수 금지)

---

## DoD (완료 기준)

- [ ] `zen_transport_pricing_policies` 테이블 생성 + 기본 4행 seed 완료
- [ ] `zen_rate_cards.tiers` JSONB에 `cbm_price` 필드 지원 (기존 데이터 호환)
- [ ] `/admin/settings/transport-policies` 화면 구현 + ADMIN 권한 접근 확인
- [ ] `calculate_order_costs` VOLUMETRIC / WM 분기 처리 구현
- [ ] `RateTierEditor` SEA/LAND 시 `cbm_price` 입력 필드 표시
- [ ] TC-POLICY-01~05 회귀 테스트 추가 + 전체 PASS
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 업데이트
- [ ] 코드 커밋 해시 기재

---

## [설계 의견] — D_Kai 작성

*(착수 후 작성)*

---

## [설계 확정] — Aiden 전속

*(D_Kai 설계 의견 제출 후 Aiden 작성)*

---

## [작업 결과] — D_Kai / B_Kai 작성

*(구현 완료 후 작성)*

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:----|
| 2026-06-07 | Aiden (Claude) | TASK-121 신규 발령 |
