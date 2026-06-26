# TASK-B-027 — IMP-138: DB 마이그레이션 (zen_ups_labels + zen_ups_tracking_events)

> **Task-ID**: TASK-B-027
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: JSJung (리더·검토) / Baker (구현)
> **우선순위**: P1
> **상태**: ⬜
> **GitHub Issue**: [#108](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/108)
> **연관 IMP**: IMP-138
> **전제조건**: 없음 — IMP-136과 병행 가능
> **설계 참조**: [An-13 v2.0](../../docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md) §3

---

## 업무 개요

Phase 8 UPS 연동용 DB 테이블 2개 신규 마이그레이션 (IMP-138).
IMP-136과 독립적으로 병행 작업 가능.

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

## DoD (Definition of Done)

- [ ] `zen_ups_labels` 테이블 마이그레이션 생성
- [ ] `zen_ups_tracking_events` 테이블 마이그레이션 생성
- [ ] `reference_no UNIQUE` 제약 적용
- [ ] RLS 정책 적용 (ADMIN/MANAGER 접근)
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
