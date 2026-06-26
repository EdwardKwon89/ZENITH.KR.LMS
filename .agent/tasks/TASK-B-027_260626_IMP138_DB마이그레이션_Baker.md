# TASK-B-027 — IMP-138: DB 마이그레이션 (zen_ups_labels + zen_ups_tracking_events + zen_ups_products 컬럼 추가)

> **Task-ID**: TASK-B-027
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: JSJung (리더·검토) / Baker (구현)
> **우선순위**: P1
> **상태**: ⬜
> **GitHub Issue**: [#108](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/108) · [#120](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/120)
> **연관 IMP**: IMP-138
> **전제조건**: 없음 — IMP-136과 병행 가능
> **설계 참조**: [An-13 v2.0](../../docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md) §3

---

## 업무 개요

Phase 8 UPS 연동용 DB 마이그레이션 (IMP-138). 3가지 포함:
1. `zen_ups_labels` 신규 테이블
2. `zen_ups_tracking_events` 신규 테이블
3. `zen_ups_products` 컬럼 추가 + `ddu_available` 업데이트 (Issue #120 Aiden 확정 2026-06-26)

---

## 구현 범위

### 신규 마이그레이션 파일

```
supabase/migrations/20260626XXXXXX_phase8_ups_labels_tracking.sql
```

### zen_ups_labels

```sql
CREATE TABLE public.zen_ups_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.zen_order_packages(id),
  order_id TEXT NOT NULL,                    -- shxk order_id
  tracking_number TEXT,
  label_url TEXT,
  reference_no TEXT UNIQUE,                  -- 중복 주문 방지 UNIQUE 제약
  shipping_method TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',    -- PENDING / ISSUED / VOIDED
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.zen_ups_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ADMIN full access"
  ON public.zen_ups_labels FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'));
```

### zen_ups_tracking_events

```sql
CREATE TABLE public.zen_ups_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id UUID NOT NULL REFERENCES public.zen_ups_labels(id),
  track_status TEXT NOT NULL,
  location TEXT,
  event_time TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.zen_ups_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ADMIN full access"
  ON public.zen_ups_tracking_events FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'));
```

### Supabase Types 재생성

```bash
rtk supabase gen types typescript --local > src/types/supabase.ts
```

---

### zen_ups_products 컬럼 추가 (Issue #120 Aiden 확정)

```sql
ALTER TABLE public.zen_ups_products
  ADD COLUMN shxk_ddu_code VARCHAR(20),
  ADD COLUMN shxk_ddp_code VARCHAR(20);

UPDATE public.zen_ups_products SET shxk_ddu_code = 'KRUPSEXP', shxk_ddp_code = 'PK0033', ddu_available = TRUE
  WHERE product_code IN ('WW_EXPRESS_DOC', 'WW_EXPRESS_NONDOC');
UPDATE public.zen_ups_products SET shxk_ddu_code = 'KRUPSWE',  shxk_ddp_code = 'PK0034', ddu_available = TRUE
  WHERE product_code = 'WW_EXPEDITED';
UPDATE public.zen_ups_products SET shxk_ddu_code = 'FXUPS',    shxk_ddp_code = 'PK0035', ddu_available = TRUE
  WHERE product_code IN ('WW_SAVER_DOC', 'WW_SAVER_NONDOC');
UPDATE public.zen_ups_products SET shxk_ddu_code = 'KRUPSWWEF',shxk_ddp_code = 'PK0032', ddu_available = TRUE
  WHERE product_code = 'WW_FLIGHT';
```

> TASK-B-026 연계: createorder Server Action에서 `incoterms === 'DDP' ? shxk_ddp_code : shxk_ddu_code` 조회

---

## DoD (Definition of Done)

- [ ] `zen_ups_labels` 테이블 마이그레이션 생성
- [ ] `zen_ups_tracking_events` 테이블 마이그레이션 생성
- [ ] `reference_no UNIQUE` 제약 적용
- [ ] RLS 정책 적용 (ADMIN/MANAGER 접근)
- [ ] `zen_ups_products` `shxk_ddu_code` / `shxk_ddp_code` 컬럼 추가 + 6개 products 값 채움
- [ ] `zen_ups_products` `ddu_available = TRUE` 전 products 업데이트
- [ ] `rtk supabase db reset` 후 마이그레이션 PASS
- [ ] Supabase types 재생성 (`src/types/supabase.ts` 업데이트)
- [ ] `rtk npm run test:regression` 전체 PASS
- [ ] 코드 커밋 해시 기재: (미정)

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Baker 완료 후 기재_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-027 신규 발령 — An-13 v2.0 IMP-138 |
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | Issue #120 Aiden 확정 반영 — zen_ups_products shxk_ddu/ddp_code 컬럼 추가 + ddu_available=TRUE 업데이트 (방안 A) |
