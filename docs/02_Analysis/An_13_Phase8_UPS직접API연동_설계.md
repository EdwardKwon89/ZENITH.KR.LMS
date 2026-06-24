# An-13 — Phase 8 설계: UPS 직접 API 연동

> **문서번호**: An-13
> **작성일**: 2026-06-24
> **작성자**: Aiden (Claude, ZEN_CEO)
> **기반**: An-12(Phase 7 설계) + TASK-B-022 리서치 결과 (`docs/80_RawData/Phase8_UPS_API_리서치_결과.md`)
> **승인 상태**: ✅ **Edward 승인 완료 (2026-06-24) — 구현 Team B 배정 확정**
> **관련 Phase**: Phase 8 (UPS 직접 API 연동)

---

## 1. 설계 배경 및 목적

### 1-1. Phase 7 → Phase 8 전환 사유

| 결정 | 내용 | 결정자·일자 |
|:----|:----|:----|
| IBC/Pactrak Interface 영구 제외 | 중간 브로커 없이 UPS REST API 직접 연동으로 전환 | Edward, 2026-06-17 |
| UPS 직접 API 사용 확정 | Spec 동일, IP·Key값만 테스트/운영 환경별 상이 | Edward, 2026-06-24 |
| Phase 8 착수 결정 | UAT 전 UPS 레이블 발급·트래킹·인보이스 우선 개발 | Edward, 2026-06-24 |

### 1-2. An-12 대비 변경 범위

| 항목 | An-12 (Phase 7) | An-13 (Phase 8) |
|:----|:----|:----|
| 국제 운송번호 발부 | IBC Pactrak Manifest API | **UPS Ship API** (직접) |
| 트래킹 | IBC eTrack REST 폴링 | **UPS Track API** (직접) |
| 레이블 | 미구현 (수동) | **UPS Ship API** PDF/ZPL 반환 |
| 인보이스 | 기존 `UpsInvoicePDF.tsx` (UI용) | **UPS Paperless Invoice** (Ship API 내 포함) |
| MVP 번호 입력 | 수동 입력 | **UPS API 자동 발급 → 자동 채움** |

---

## 2. 연동 아키텍처

### 2-1. 전체 흐름

```
[ZENITH 플랫폼]
      │
      ├─► [UPS OAuth 2.0]  ──────────────► access_token 발급 (만료: 15분~2시간)
      │     POST /security/v1/oauth/token
      │
      ├─► [UPS Ship API]   ──────────────► 레이블(PDF/ZPL) + 운송장번호 발부
      │     POST /api/shipments/v1/ship      └─► zen_ups_labels 저장
      │                                      └─► zen_order_packages.intl_ref_no 자동 채움
      │
      ├─► [UPS Track API]  ──────────────► 배송 이벤트 폴링
      │     GET /api/track/v1/details        └─► zen_ups_tracking_events 저장
      │                                      └─► zen_tracking_events 정규화
      │
      └─► [UPS Paperless Invoice] ───────► Ship API 호출 시 자동 제출
            (Ship API payload에 포함)
```

### 2-2. 환경 분기

| 환경 | Base URL | 인증 |
|:-----|:---------|:-----|
| **테스트 (Sandbox)** | `https://wwwcie.ups.com` | 별도 Client ID/Secret |
| **운영 (Production)** | `https://onlinetools.ups.com` | 운영 Client ID/Secret |

```bash
# .env.local (개발/테스트)
UPS_ENVIRONMENT=sandbox
UPS_CLIENT_ID=<sandbox_client_id>
UPS_CLIENT_SECRET=<sandbox_client_secret>
UPS_ACCOUNT_NUMBER=<test_account_number>

# .env.production (운영)
UPS_ENVIRONMENT=production
UPS_CLIENT_ID=<prod_client_id>
UPS_CLIENT_SECRET=<prod_client_secret>
UPS_ACCOUNT_NUMBER=<prod_account_number>
```

> **미결 사항 ①**: UPS Sandbox Client ID/Secret 발급 여부 확인 필요 (Edward → UPS 담당자).

---

## 3. DB 스키마 설계

### 3-1. 신규 테이블: `zen_ups_labels`

```sql
CREATE TABLE public.zen_ups_labels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  package_id       UUID NOT NULL REFERENCES public.zen_order_packages(id) ON DELETE CASCADE,
  tracking_number  TEXT NOT NULL,          -- UPS 운송장번호 (= intl_ref_no)
  label_format     VARCHAR(10) NOT NULL CHECK (label_format IN ('PDF','ZPL','GIF')),
  storage_path     TEXT NOT NULL,          -- Supabase Storage: ups_labels/{YYYY}/{MM}/{orderId}/{pkgId}_label.pdf
  file_size_bytes  INTEGER,
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  generated_by     UUID REFERENCES public.zen_profiles(id),
  is_voided        BOOLEAN DEFAULT FALSE,  -- 레이블 폐기 여부
  voided_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ups_labels_order_id   ON public.zen_ups_labels(order_id);
CREATE INDEX idx_ups_labels_tracking   ON public.zen_ups_labels(tracking_number);
CREATE INDEX idx_ups_labels_package    ON public.zen_ups_labels(package_id);
```

### 3-2. 신규 테이블: `zen_ups_tracking_events`

```sql
CREATE TABLE public.zen_ups_tracking_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  label_id         UUID REFERENCES public.zen_ups_labels(id),
  tracking_number  TEXT NOT NULL,
  event_code       VARCHAR(10) NOT NULL,   -- UPS 상태 코드 (OR, D, X, P, M, ...)
  event_desc       TEXT,
  event_type       VARCHAR(5),             -- I(In Transit), D(Delivered), X(Exception), ...
  event_date       DATE NOT NULL,
  event_time       TIME,
  location_city    TEXT,
  location_country VARCHAR(3),
  gmt_offset       VARCHAR(6),
  raw_response     JSONB,                  -- UPS API 원본 (감사 추적)
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ups_tracking_order    ON public.zen_ups_tracking_events(order_id);
CREATE INDEX idx_ups_tracking_no       ON public.zen_ups_tracking_events(tracking_number);
CREATE INDEX idx_ups_tracking_code     ON public.zen_ups_tracking_events(event_code);
CREATE INDEX idx_ups_tracking_date     ON public.zen_ups_tracking_events(event_date);

ALTER TABLE public.zen_ups_labels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_ups_tracking_events ENABLE ROW LEVEL SECURITY;
```

### 3-3. 기존 테이블 연계

| 테이블 | 연계 방식 |
|:-------|:---------|
| `zen_order_packages.intl_ref_no` | 레이블 발급 시 `tracking_number`로 **자동 채움** (Phase 7 수동 입력 대체) |
| `zen_order_packages.intl_ref_locked` | 레이블 발급 완료 시 `TRUE` 자동 전환 |
| `zen_tracking_configs` | `provider_type='API'`, `provider_name='UPS_TRACKING'`으로 신규 생성 |
| `zen_tracking_events` | `zen_ups_tracking_events` → 정규화 변환 후 저장 (기존 표준 이벤트 구조 유지) |
| `zen_tracking_raw_logs` | UPS API 원본 응답 저장 (디버깅·감사) |

### 3-4. Supabase Storage 구조

```
버킷: ups_labels
  └── {YYYY}/
      └── {MM}/
          └── {orderId}/
              ├── {packageId}_label.pdf   (필수)
              └── {packageId}_label.zpl   (선택 — 라벨 프린터)
```

RLS: ADMIN·MANAGER·AGENCY(소속 오더만) 읽기.

---

## 4. 모듈 구조 (신규 파일 목록)

| 파일 경로 | 유형 | 역할 |
|:---------|:----:|:----|
| `src/lib/ups/config.ts` | 신규 | 환경변수 + Base URL + OAuth 설정 |
| `src/lib/ups/client.ts` | 신규 | UPS HTTP Client (fetch wrapper, 토큰 자동 갱신) |
| `src/lib/ups/shipment.ts` | 신규 | 레이블 발급 API (`POST /api/shipments/v1/ship`) |
| `src/lib/ups/tracking.ts` | 신규 | 트래킹 폴링 API (`GET /api/track/v1/details`) |
| `src/lib/logistics/providers/ups-tracking-provider.ts` | 신규 | `ITrackingProvider` 구현체 |
| `src/types/ups-api.ts` | 신규 | UPS Request/Response 타입 (ShipRequest, TrackResponse 등) |
| `src/types/ups.ts` | **확장** | `UpsLabel`, `UpsTrackingEvent` 타입 추가 |
| `src/app/actions/operations/ups-labels.ts` | 신규 | 레이블 발급 Server Action |
| `supabase/migrations/ups_008_labels.sql` | 신규 | `zen_ups_labels` + `zen_ups_tracking_events` DDL |
| `.env.example` | **수정** | UPS API 환경변수 항목 추가 |

> **미결 사항 ②**: UI 화면 범위 확정 필요.
> - 레이블 발급 버튼: 창고 출고 화면 내 위치? 별도 페이지?
> - 레이블 미리보기/다운로드 UI: 인라인 PDF 뷰어 vs 다운로드 링크?

---

## 5. UPS OAuth 토큰 관리

```typescript
// src/lib/ups/client.ts — 핵심 로직
class UpsApiClient {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60_000) {
      return this.tokenCache.token;   // 만료 1분 전까지 캐시 사용
    }
    const res = await fetch(`${getBaseUrl()}/security/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${SECRET}`,
    });
    const { access_token, expires_in } = await res.json();
    this.tokenCache = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
    return access_token;
  }
}
```

---

## 6. 트래킹 폴링 전략

| 배송 구간 | 폴링 주기 | 비고 |
|:---------|:--------:|:-----|
| 출고 후 48시간 | 30분 | 초기 경로 진입 확인 |
| 48시간 ~ 7일 | 2시간 | 장거리 이동 |
| 7일 초과 | 6시간 | 지연 감지 |
| 최종 배송 완료 (`D`) | 폴링 중단 | `zen_tracking_configs.is_active = false` |

`ITrackingProvider` 인터페이스(`tracking-adapters.ts:8`)를 구현하여 기존 `TrackingManager`에 등록:
```typescript
this.providers.set('UPS_TRACKING', new UpsTrackingProvider());
```

---

## 7. 구현 순서 및 Phase 8 Task 계획

| Task ID | 담당 | 내용 | 의존 | Issue |
|:--------|:----:|:----|:-----|:-----:|
| **IMP-136** | Dave (Team B) | UPS OAuth Client + config + HTTP Client | - | [#106](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/106) |
| **IMP-137** | Dave (Team B) | UPS Ship API (레이블 발급) + zen_ups_labels Server Action | IMP-136 | [#107](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/107) |
| **IMP-138** | Dave (Team B) | DB 마이그레이션 (`zen_ups_labels` + `zen_ups_tracking_events`) | - | [#108](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/108) |
| **IMP-139** | Dave (Team B) | UpsTrackingProvider + zen_ups_tracking_events 저장 | IMP-136·138 | [#109](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/109) |
| **IMP-140** | Baker (Team B) | E2E 테스트 (레이블 발급 + 트래킹 폴링) | IMP-136~139 | [#110](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/110) |

> UI 범위 미결 사항 ② 확정 후 UI 구현 Task(IMP-141~) 별도 발령 예정.

---

## 8. 리스크 및 완화 방안

| 리스크 | 영향 | 완화 |
|:-------|:------|:-----|
| UPS OAuth 토큰 만료 | API 호출 실패 | 만료 1분 전 Pre-fetch + 자동 갱신 |
| Sandbox 계정 미발급 | 개발 차단 | Edward → UPS 담당자 확인 선행 (미결 ①) |
| Rate Limit (`429`) | 트래킹 폴링 중단 | `Retry-After` 준수 + 지수 백오프 |
| 레이블 재발급 | 기존 번호 폐기 필요 | `is_voided` 플래그 + UPS Void API |
| IP 허용 목록 | 해당 없음 | **비블로커 확정** — UPS REST API는 OAuth 인증 방식, IP 허용 목록 불필요. Vercel Server Actions 직접 호출 가능. |

---

## 9. 승인 요청 사항

| # | 항목 | 담당 | 현재 상태 |
|:-:|:----|:----:|:---------|
| **①** | UPS Sandbox Client ID/Secret 발급 여부 | **JSJung** | JSJung이 고객사 확인 중. **개발 착수 전 선행 조건.** |
| **②** | 레이블 발급 UI 위치 및 형태 | **JSJung** | JSJung에게 확인 및 방향 결정 요청 — 창고 출고 화면 내 vs 별도 페이지, PDF 인라인 vs 다운로드 링크. UI Task(IMP-141~) 발령은 결정 후 진행. |
| **③** | ~~운영 서버 IP UPS 허용 목록 등록~~ | — | **비블로커 확정** — UPS REST API는 OAuth 인증, IP 허용 목록 불필요. Vercel 직접 호출 가능. 인프라 추가 작업 없음. |

> **설계 승인 조건**: ① Sandbox 계정 확보 후 IMP-136~140 발령 진행.
> ② UI 방향은 JSJung 회신 후 IMP-141~ 별도 발령.

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | 초안 작성 — TASK-B-022 리서치 결과 반영, An-12 IBC 제거 반영 |
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | §8·§9 갱신 — ② JSJung 확인 요청으로 전환, ③ 즉시 불필요(Go Live 전 확인) 반영 (Edward 지시) |
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | §8·§9 최종 갱신 — ③ 비블로커 확정. UPS REST API OAuth 인증 방식, IP 허용 목록 불필요. Vercel 호스팅으로 충분. Supabase Remote 기존 연결 재사용. |
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | **Edward 승인 완료** — 승인 상태 ✅ 전환. §7 구현 담당 Team B(Dave·Baker)로 전환. §9 ① 담당 Edward→JSJung(고객사 확인 중). |
| 2026-06-25 | Aiden (Claude, ZEN_CEO) | §7 Issue 번호 추가 — IMP-136~140 GitHub Issue #106~#110 생성 완료. |
