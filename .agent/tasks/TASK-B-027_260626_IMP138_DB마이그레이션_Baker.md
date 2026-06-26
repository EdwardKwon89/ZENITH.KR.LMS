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

### `zen_ups_shxk_country_map` 신규 테이블 (Issue #121 Aiden 확정 2026-06-26)

> Issue #120 방안 A(`shxk_ddu_code`/`shxk_ddp_code` 컬럼 추가)는 **취소**. 목적지 국가별 코드 분리 구조를 반영한 매핑 테이블로 대체.

```sql
CREATE TABLE public.zen_ups_shxk_country_map (
  product_code  VARCHAR(20) NOT NULL REFERENCES public.zen_ups_products(product_code),
  country_code  VARCHAR(3)  NOT NULL,
  incoterms     VARCHAR(3)  NOT NULL CHECK (incoterms IN ('DDU', 'DDP')),
  shxk_code     VARCHAR(20) NOT NULL,
  PRIMARY KEY (product_code, country_code, incoterms)
);

-- 한국(KOR) 초기 시드
INSERT INTO public.zen_ups_shxk_country_map VALUES
  ('WW_EXPRESS_DOC',   'KOR', 'DDU', 'KRUPSEXP'),
  ('WW_EXPRESS_DOC',   'KOR', 'DDP', 'PK0033'),
  ('WW_EXPRESS_NONDOC','KOR', 'DDU', 'KRUPSEXP'),
  ('WW_EXPRESS_NONDOC','KOR', 'DDP', 'PK0033'),
  ('WW_EXPEDITED',     'KOR', 'DDU', 'KRUPSWE'),
  ('WW_EXPEDITED',     'KOR', 'DDP', 'PK0034'),
  ('WW_SAVER_DOC',     'KOR', 'DDU', 'FXUPS'),
  ('WW_SAVER_DOC',     'KOR', 'DDP', 'PK0035'),
  ('WW_SAVER_NONDOC',  'KOR', 'DDU', 'FXUPS'),
  ('WW_SAVER_NONDOC',  'KOR', 'DDP', 'PK0035'),
  ('WW_FLIGHT',        'KOR', 'DDU', 'KRUPSWWEF'),
  ('WW_FLIGHT',        'KOR', 'DDP', 'PK0032');

ALTER TABLE public.zen_ups_shxk_country_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ADMIN full access"
  ON public.zen_ups_shxk_country_map FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'));

-- zen_ups_products ddu_available 전체 TRUE 업데이트 (Issue #121 Request ③ 유지)
UPDATE public.zen_ups_products SET ddu_available = TRUE;
```

> TASK-B-026 연계: createorder Server Action에서 `(product_code, country_code, incoterms)` → `shxk_code` 조회 (An-13 §6-1 참조)

---

## DoD (Definition of Done)

- [ ] `zen_ups_labels` 테이블 마이그레이션 생성
- [ ] `zen_ups_tracking_events` 테이블 마이그레이션 생성
- [ ] `reference_no UNIQUE` 제약 적용
- [ ] RLS 정책 적용 (ADMIN/MANAGER 접근)
- [ ] `zen_ups_shxk_country_map` 신규 테이블 생성 (Issue #121 Aiden 확정)
- [ ] KOR 초기 시드 12행 INSERT 완료
- [ ] `zen_ups_products.ddu_available = TRUE` 전 products 업데이트
- [ ] `rtk supabase db reset` 후 마이그레이션 PASS
- [ ] Supabase types 재생성 (`src/types/supabase.ts` 업데이트)
- [ ] `rtk npm run test:regression` 전체 PASS
- [ ] 코드 커밋 해시 기재: (미정)

---

## [Aiden 검토]

> ⚠️ **이 파일은 Aiden 원본 설계 파일입니다. Team B 작업 결과는 `TASK-B-027_260626_Phase8_UPS매핑DB마이그레이션_Dave_Baker.md`를 참조하십시오.**

**PR#122 반려 — 2026-06-26 Aiden**

| 사유 | 내용 |
|:-----|:-----|
| ① 기능 블로커 | `zen_ups_labels.reference_no TEXT NOT NULL UNIQUE` 누락 — gettrackingnumber/getnewlabel 호출 시 필수 |
| ② 거버넌스 | Task file 2개 중복 — 이 파일 `git rm` 후 Team B 신규 파일로 통합 필요 |

Baker 수정 지시: PR#122 리뷰 코멘트 참조.

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Baker 완료 후 기재 — Team B 실제 결과는 `TASK-B-027_260626_Phase8_UPS매핑DB마이그레이션_Dave_Baker.md` 참조_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-027 신규 발령 — An-13 v2.0 IMP-138 |
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | Issue #120 Aiden 확정 반영 — zen_ups_products shxk_ddu/ddp_code 컬럼 추가 + ddu_available=TRUE 업데이트 (방안 A) |
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | Issue #121 JSJung 설계 변경 수용 — 방안 A 취소, zen_ups_shxk_country_map 신규 테이블(방안 B)로 교체. DoD 체크리스트 갱신. |
