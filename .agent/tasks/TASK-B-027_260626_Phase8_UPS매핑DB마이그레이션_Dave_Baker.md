# TASK-B-027 — [Phase 8] zen_ups_shxk_country_map DB migration + 레이블/트래킹 테이블 신설

> **TASK-ID**: TASK-B-027
> **생성일**: 2026-06-26
> **발령자**: Jaison (JSJung 지시 · Issue #121 Aiden 설계 재확정 ✅ 2026-06-26)
> **담당 Agent**: Baker (§1 migration SQL + §3 회귀) · Dave (§2 타입 업데이트)
> **우선순위**: P1
> **관련 Issue**: [#121](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/121) (Closes [#120](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/120))
> **전제조건**: Issue #121 Aiden 설계 재확정 ✅ (2026-06-26)
> **브랜치**: `feature/teamb-task-b-027-ups-shxk-mapping-migration`
> **상태**: 🔄

---

## [업무 개요]

An-13 v2.1 설계 기반으로 아래 3가지 작업을 단일 migration 파일로 처리한다.

1. **`zen_ups_labels`** 신규 테이블 생성 (UPS 레이블 발급 이력)
2. **`zen_ups_tracking_events`** 신규 테이블 생성 (UPS 트래킹 이벤트)
3. **`zen_ups_shxk_country_map`** 신규 테이블 생성 + KOR 시드 12행 INSERT

추가로:
- `zen_ups_products.ddu_available = TRUE` 전 products UPDATE (Phase 7 DDU 제한 해제)
- `src/types/ups.ts` 타입 확장 (Dave 담당)
- `src/types/supabase.ts` 재생성 (Dave 담당)

**배경**: shxk.rtb56.com `createorder` API에서 `shipping_method`는 필수 파라미터. 목적지 국가별·incoterms별로 코드가 분리되어 있으므로 `(product_code, country_code, incoterms) → shxk_code` 구조의 별도 매핑 테이블이 필요하다. (TASK-B-026 createorder Server Action에서 참조)

---

## [설계 확정 — Issue #121 Aiden (2026-06-26)]

### zen_ups_shxk_country_map 테이블 설계

```sql
CREATE TABLE public.zen_ups_shxk_country_map (
  product_code  VARCHAR(20) NOT NULL,
  country_code  VARCHAR(3)  NOT NULL,  -- ISO 3166-1 alpha-3 (KOR, USA, VNM...)
  incoterms     VARCHAR(3)  NOT NULL CHECK (incoterms IN ('DDU', 'DDP')),
  shxk_code     VARCHAR(20) NOT NULL,
  PRIMARY KEY (product_code, country_code, incoterms)
);
```

### KOR 초기 시드 12행

| product_code | country_code | incoterms | shxk_code |
|:-------------|:------------:|:---------:|:---------:|
| `WW_EXPRESS_DOC` | KOR | DDU | `KRUPSEXP` |
| `WW_EXPRESS_DOC` | KOR | DDP | `PK0033` |
| `WW_EXPRESS_NONDOC` | KOR | DDU | `KRUPSEXP` |
| `WW_EXPRESS_NONDOC` | KOR | DDP | `PK0033` |
| `WW_EXPEDITED` | KOR | DDU | `KRUPSWE` |
| `WW_EXPEDITED` | KOR | DDP | `PK0034` |
| `WW_SAVER_DOC` | KOR | DDU | `FXUPS` |
| `WW_SAVER_DOC` | KOR | DDP | `PK0035` |
| `WW_SAVER_NONDOC` | KOR | DDU | `FXUPS` |
| `WW_SAVER_NONDOC` | KOR | DDP | `PK0035` |
| `WW_FLIGHT` | KOR | DDU | `KRUPSWWEF` |
| `WW_FLIGHT` | KOR | DDP | `PK0032` |

> DOC/NON_DOC 동일 shxk 코드 허용 확정. shipping_method는 서비스 레벨 코드, 화물 유형은 createorder 페이로드 별도 필드 전달.

### 조회 예시 (TASK-B-026 createorder Server Action)

```typescript
const { data } = await supabase
  .from('zen_ups_shxk_country_map')
  .select('shxk_code')
  .eq('product_code', productCode)
  .eq('country_code', destinationCountry)  // ISO alpha-3
  .eq('incoterms', incoterms)              // 'DDU' | 'DDP'
  .single();
```

---

## [구현 범위]

### §1 Baker — migration SQL 작성 + DB reset 검증

**파일**: `supabase/migrations/<timestamp>_ups_008_labels_tracking_shxk_map.sql`

```sql
-- Phase 8: zen_ups_labels + zen_ups_tracking_events + zen_ups_shxk_country_map
-- An-13 v2.1 설계 확정 (2026-06-26) · Issue #121 Aiden 승인

-- 1. zen_ups_labels: UPS 레이블 발급 이력
CREATE TABLE public.zen_ups_labels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  package_id       UUID NOT NULL REFERENCES public.zen_order_packages(id) ON DELETE CASCADE,
  tracking_number  TEXT NOT NULL,
  label_format     VARCHAR(10) NOT NULL CHECK (label_format IN ('PDF','ZPL','GIF')),
  storage_path     TEXT NOT NULL,
  file_size_bytes  INTEGER,
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  generated_by     UUID REFERENCES public.zen_profiles(id),
  is_voided        BOOLEAN DEFAULT FALSE,
  voided_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ups_labels_order_id ON public.zen_ups_labels(order_id);
CREATE INDEX idx_ups_labels_tracking  ON public.zen_ups_labels(tracking_number);
CREATE INDEX idx_ups_labels_package   ON public.zen_ups_labels(package_id);

ALTER TABLE public.zen_ups_labels ENABLE ROW LEVEL SECURITY;

-- 2. zen_ups_tracking_events: UPS 트래킹 이벤트
CREATE TABLE public.zen_ups_tracking_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  label_id         UUID REFERENCES public.zen_ups_labels(id),
  tracking_number  TEXT NOT NULL,
  event_code       VARCHAR(10) NOT NULL,
  event_desc       TEXT,
  event_type       VARCHAR(5),
  event_date       DATE NOT NULL,
  event_time       TIME,
  location_city    TEXT,
  location_country VARCHAR(3),
  gmt_offset       VARCHAR(6),
  raw_response     JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ups_tracking_order ON public.zen_ups_tracking_events(order_id);
CREATE INDEX idx_ups_tracking_no    ON public.zen_ups_tracking_events(tracking_number);
CREATE INDEX idx_ups_tracking_code  ON public.zen_ups_tracking_events(event_code);
CREATE INDEX idx_ups_tracking_date  ON public.zen_ups_tracking_events(event_date);

ALTER TABLE public.zen_ups_tracking_events ENABLE ROW LEVEL SECURITY;

-- 3. zen_ups_shxk_country_map: shxk.rtb56.com shipping_method 매핑
-- shipping_method는 목적지 국가별·incoterms별로 분리된 코드 체계 (190건)
-- (product_code, country_code, incoterms) → shxk_code 조회
CREATE TABLE public.zen_ups_shxk_country_map (
  product_code  VARCHAR(20) NOT NULL,
  country_code  VARCHAR(3)  NOT NULL,  -- ISO 3166-1 alpha-3 (KOR, USA, VNM...)
  incoterms     VARCHAR(3)  NOT NULL CHECK (incoterms IN ('DDU', 'DDP')),
  shxk_code     VARCHAR(20) NOT NULL,
  PRIMARY KEY (product_code, country_code, incoterms)
);

-- KOR 초기 시드 12행 (An-13 v2.1 확정)
INSERT INTO public.zen_ups_shxk_country_map (product_code, country_code, incoterms, shxk_code) VALUES
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

-- 4. ddu_available 전체 TRUE (Phase 7 DDU 제한 해제)
UPDATE public.zen_ups_products
  SET ddu_available = TRUE
  WHERE ddu_available = FALSE;
```

**DB reset 검증**:
```bash
rtk supabase db reset
```

**SELECT 확인 쿼리**:
```sql
-- zen_ups_shxk_country_map KOR 12행 확인
SELECT product_code, incoterms, shxk_code
  FROM zen_ups_shxk_country_map
  WHERE country_code = 'KOR'
  ORDER BY product_code, incoterms;

-- ddu_available 전체 TRUE 확인
SELECT product_code, ddu_available, ddp_available
  FROM zen_ups_products
  ORDER BY sort_order;
```

### §2 Dave — 타입 업데이트

**파일 1**: `src/types/ups.ts`
- `UpsShxkCountryMap` 인터페이스 추가:
  ```typescript
  export interface UpsShxkCountryMap {
    product_code: string;
    country_code: string; // ISO alpha-3
    incoterms: 'DDU' | 'DDP';
    shxk_code: string;
  }
  ```

**파일 2**: `src/types/supabase.ts`
```bash
rtk supabase gen types typescript --local > src/types/supabase.ts
```

### §3 Baker — 회귀 테스트

```bash
rtk npm run test:regression
```

---

## [DoD 체크리스트]

### §1 Baker

- [x] migration 파일 생성 (`20260626000000_ups_008_labels_tracking_shxk_map.sql`)
- [x] `zen_ups_labels` 테이블 생성 확인
- [x] `zen_ups_tracking_events` 테이블 생성 확인
- [x] `zen_ups_shxk_country_map` KOR 12행 INSERT 확인 (SELECT 증적 기재)
- [x] `zen_ups_products` 전체 `ddu_available = TRUE` 확인 (SELECT 증적 기재)
- [x] `supabase db reset` 성공 확인
- [x] task file `[작업 결과]` §1 기재 + 코드 커밋 해시 포함

### §2 Dave

- [ ] `src/types/ups.ts` `UpsShxkCountryMap` 인터페이스 추가
- [ ] `src/types/supabase.ts` 재생성 (`rtk supabase gen types typescript --local`)
- [ ] task file `[작업 결과]` §2 기재 + 커밋 해시 포함

### §3 Baker

- [x] `npm run test:regression` PASS (387/387 ALL PASS)
- [x] task file `[작업 결과]` §3 기재 (회귀 결과 포함)
- [ ] ACTIVE_TASK.md 🔔 반영
- [ ] PR `feature/teamb-task-b-027-*` → `develop` 생성 (Closes #121, #120)

---

## [작업 결과]

### §1 Baker — Migration SQL 작성 + DB reset 검증

| 항목 | 결과 |
|:-----|:------|
| migration 파일 | `supabase/migrations/20260626000000_ups_008_labels_tracking_shxk_map.sql` |
| 코드 커밋 | `679c240` |
| `zen_ups_labels` | ✅ 생성 확인 (pg_tables) |
| `zen_ups_tracking_events` | ✅ 생성 확인 (pg_tables) |
| `zen_ups_shxk_country_map` + KOR 12행 | ✅ 12행 INSERT 확인 (SELECT 증적) |
| `ddu_available = TRUE` | ✅ 6개 product 전량 TRUE 확인 (SELECT 증적) |
| `supabase db reset` | ✅ 성공 (migration 1건 적용) |

### §2 Dave

_(착수 후 작성)_

### §3 Baker — 회귀 테스트

| 항목 | 결과 |
|:-----|:------|
| regression | ✅ 387/387 ALL PASS (69 test files) |

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:-----|
| 2026-06-26 | Jaison (JSJung) | Task 발령 — Issue #120 Aiden 설계 확정 반영, Dave(§1) · Baker(§2) 배정 |
| 2026-06-26 | Jaison (JSJung) | 설계 변경 — 방안 A(컬럼 추가) 취소, zen_ups_shxk_country_map 신규 테이블로 재설계. 상태 ⬜→🚫 (Issue #121 재승인 대기) |
| 2026-06-26 | Jaison (JSJung) | **Issue #121 Aiden 재확정 반영** — zen_ups_labels+zen_ups_tracking_events+zen_ups_shxk_country_map 3테이블 단일 migration. Baker(§1 migration+§3 회귀) · Dave(§2 타입). 상태 🚫→🔄 |
| 2026-06-26 | Baker (Big Pickle) | **§1 ✅ migration + §3 ✅ 회귀 완료** — migration SQL 생성, supabase db reset ✅, KOR 12행 SELECT 확인, ddu_available TRUE 확인, 회귀 387/387 ALL PASS. Dave §2 대기. |
