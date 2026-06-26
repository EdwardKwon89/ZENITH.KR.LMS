# SAR_2026-06-26_001 — Phase 7 UPS 스키마 설계 갭: zen_orders 인코텀즈·제품코드 누락

> **문서번호**: SAR_2026-06-26_001
> **카테고리**: Design
> **심각도**: HIGH
> **발견일**: 2026-06-26
> **발견자**: Aiden (Claude, ZEN_CEO) — Edward 지적으로 확인
> **보고자**: Aiden
> **수정완료일**: 2026-06-26
> **수정 커밋**: `2f57b73`

---

## 1. 문제 현상

Phase 8 UPS 연동(shxk.rtb56.com) 설계 중 Edward가 "DDU/DDP를 유저가 주문 시 선택하고, 요금 산정·정산이 달라진다"는 요구사항을 제시하였다.

검토 결과, Phase 7에서 Aiden이 설계한 `zen_orders` 스키마에 다음 두 컬럼이 누락된 것을 확인:

| 누락 컬럼 | 용도 |
|:---------|:-----|
| `ups_product_code VARCHAR(20)` | 주문 시 고객이 선택한 UPS 제품 (WW_EXPRESS_DOC 등) |
| `incoterms VARCHAR(3)` | 주문 시 고객이 선택한 인코텀즈 (DDU / DDP) |

현재 `zen_orders`에는 `delivery_method`(DIRECT/PICKUP — 국내 배송방식)만 존재하며, UPS 제품 선택 및 DDU/DDP 선택을 오더 레코드에 저장하는 구조가 없었다.

---

## 2. 영향 범위

| 구분 | 영향 |
|:-----|:-----|
| UPS 레이블 발급 (TASK-B-024) | `incoterms` 없이 shxk_ddu_code / shxk_ddp_code 선택 불가 |
| 요금 산정 | DDU ≠ DDP 운임 → 정산 금액 오차 발생 가능 |
| 정산 (Settlement) | DDU/DDP 구분 없이 단일 요금 처리 위험 |
| Phase 8 전체 | TASK-B-025~029 구현 전 컬럼 부재 시 런타임 오류 |

---

## 3. 근본 원인 분석

### 직접 원인
Phase 7 UPS 스키마 설계 시(TASK-138, `20260614000600_ups_007_existing_tables_extend.sql`) 주문 화면에서 고객이 UPS 제품과 인코텀즈를 직접 선택하는 흐름을 오더 모델에 반영하지 않음.

### 배경
- Phase 7 설계 시점: UPS 연동은 IBC/Pactrak 기반으로 진행 중이었고, shxk.rtb56.com 연동은 확정 전이었음
- `ddu_available` / `ddp_available` 컬럼을 `zen_ups_products`에 설계했으나, 이를 실제 오더에서 캡처하는 컬럼 추가를 간과

### 구조적 원인
- R-11(API 설계 우선 원칙)에 따라 데이터 모델을 설계했으나, **주문 생성 흐름에서 캐리어별 선택 필드가 오더 레코드에 영속화되어야 함**을 체크하는 항목이 체크리스트에 없었음

---

## 4. 수정 조치

**신규 migration 파일**: `supabase/migrations/20260626100000_phase8_ups_order_incoterms.sql`

```sql
ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS ups_product_code VARCHAR(20)
    REFERENCES public.zen_ups_products(product_code),
  ADD COLUMN IF NOT EXISTS incoterms VARCHAR(3)
    CHECK (incoterms IN ('DDU', 'DDP'));
```

- UPS 오더 외 NULL 허용 (기존 오더 호환성 유지)
- 부분 인덱스 2개 추가
- 회귀 테스트 387/387 PASS 확인 후 커밋 (`2f57b73`)

---

## 5. 재발 방지 대책

### 즉시 조치
- 아래 항목을 `docs/08_Self_Audit/Checklists/LIVE_DB_SCHEMA_CHECKLIST.md`에 추가:
  > **[캐리어 연동 스키마 체크]** 신규 캐리어 연동 시 반드시 확인:
  > - 오더 레코드에 캐리어 제품 선택(product_code) 컬럼 포함 여부
  > - 오더 레코드에 운임 조건(incoterms/서비스 옵션) 컬럼 포함 여부
  > - 해당 선택이 요금 산정·정산 로직에 연결되는지 확인

### 향후 캐리어 연동 설계 시
- 캐리어 요율 테이블 설계와 동시에 **오더 모델에서 해당 캐리어 선택 필드 설계**를 의무화
- R-11 설계 검토 체크리스트에 "오더 캡처 필드 완비" 항목 추가

---

## 6. 교훈

> 캐리어별 서비스 옵션(제품코드, 인코텀즈, 서비스 레벨)은 요율 테이블 설계 시 동시에 **오더 레코드 캡처 구조**까지 설계해야 한다.
> `ddu_available` 같은 플래그만 제품 테이블에 있고 실제 주문에서 선택값을 저장하지 않으면 런타임에서야 갭이 드러난다.

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | SAR 최초 작성 — Edward 지적으로 발견, 수정 완료 |
