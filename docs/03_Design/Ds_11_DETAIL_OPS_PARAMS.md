# Ds-11 API 상세 명세 — OPS_PARAMS (운영 파라미터 & Feature Flag)

> **프로젝트:** ZENITH_LMS | **버전:** v1.0 | **최종 수정:** 2026-04-26
>
> **상위 목록:** [API 카탈로그 (INDEX)](Ds_11_INDEX.md)
>
> **WBS 연계:** 4.3.1~4.3.2 | **Sprint:** Phase 4 Sprint 5

---

## 16. 운영 파라미터 & Feature Flag

### 배경 및 범위

코드 내 하드코딩 상수(VAT_RATE, 스코어링 가중치 α/β, 지연 임계값 등)를 DB 기반 동적 체계로 전환. `getParam()` 유틸리티가 Next.js `revalidateTag` 캐시를 활용해 성능을 보장하며, Admin UI에서 런타임 변경이 가능하다. Feature Flag는 화주별·기능별 노출 제어를 위한 게이팅 레이어다.

### DB 스키마

```sql
-- 시스템 파라미터 테이블
CREATE TABLE zen_system_params (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL CHECK (category IN ('FINANCE','TRACKING','ROUTING','SYSTEM')),
  value_text      TEXT,
  value_numeric   NUMERIC(18,6),
  value_jsonb     JSONB,
  description     TEXT NOT NULL,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to    TIMESTAMPTZ,
  updated_by      uuid REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 파라미터 변경 감사 로그 테이블
CREATE TABLE zen_param_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  param_key   TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  uuid NOT NULL REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feature Flag 테이블
CREATE TABLE zen_feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT false,
  org_id      uuid REFERENCES zen_organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  updated_by  uuid REFERENCES profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, org_id)
);

-- RLS:
-- zen_system_params: Admin=전체 SELECT+UPDATE; System(서버 액션)=SELECT
-- zen_param_audit_log: Admin=SELECT; System=INSERT
-- zen_feature_flags: Admin=전체 CRUD; User=본인 org_id 행 SELECT
-- Trigger: update_timestamp_column on zen_system_params, zen_feature_flags
```

**초기 파라미터 시드 데이터 (migration 적재 필수):**

| key | category | value_numeric / value_jsonb | 설명 |
|:---|:---|:---|:---|
| `VAT_RATE` | FINANCE | 0.1 | 부가세율 (10%) |
| `EXCHANGE_RATE_USD_KRW` | FINANCE | 1350.000000 | USD/KRW 환율 스냅샷 기준값 |
| `TRACKING_DELAY_THRESHOLD_HOURS` | TRACKING | 48.0 | 지연 알림 임계값 (시간) |
| `ROUTING_WEIGHT_ALPHA` | ROUTING | 0.6 | 비용 스코어링 가중치 α |
| `ROUTING_WEIGHT_BETA` | ROUTING | 0.4 | 시간 스코어링 가중치 β |
| `INVOICE_DUE_DAYS` | FINANCE | 30.0 | 인보이스 기본 납기일 (일) |

---

### TypeScript 타입 정의

```typescript
type ParamCategory = 'FINANCE' | 'TRACKING' | 'ROUTING' | 'SYSTEM';

interface SystemParam {
  id: string;
  key: string;
  category: ParamCategory;
  value_text: string | null;
  value_numeric: number | null;
  value_jsonb: Record<string, unknown> | null;
  description: string;
  effective_from: string;
  effective_to: string | null;
  updated_by: string | null;
  updated_at: string;
}

interface ParamAuditLog {
  id: string;
  param_key: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_by_name: string;   // profiles.name 조인
  changed_at: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  is_enabled: boolean;
  org_id: string | null;     // null = 전역 플래그
  description: string;
  updated_at: string;
}
```

---

### 서버 사이드 유틸리티 (구현 대상)

```typescript
// src/lib/params.ts — 캐시 레이어
import { unstable_cache } from 'next/cache';

export const getParam = unstable_cache(
  async (key: string): Promise<SystemParam | null> => { ... },
  ['system-param'],
  { tags: ['system-params'], revalidate: 300 }
);

export const getParamsByCategory = unstable_cache(
  async (category: ParamCategory): Promise<SystemParam[]> => { ... },
  ['system-params-by-category'],
  { tags: ['system-params'], revalidate: 300 }
);
```

---

### 16.1 getSystemParam (Action)

- **설명**: 단건 파라미터 조회 (Admin 관리 화면용, 캐시 미적용 최신값)
- **권한**: Admin / ZENITH_SUPER_ADMIN
- **파라미터**: `key`: string
- **응답**: `SystemParam | null`

---

### 16.2 getParamsByCategory (Action)

- **설명**: 카테고리별 파라미터 일괄 조회. 서버 사이드 캐시 적용 (`tags: ['system-params']`)
- **권한**: System (서버 액션 내부 호출) / Admin (관리 화면)
- **파라미터**: `category`: ParamCategory
- **응답**: `{ params: SystemParam[] }`
- **비고**: `unstable_cache` 래퍼를 통해 300초 캐시. `updateSystemParam` 호출 시 `revalidateTag('system-params')` 자동 무효화

---

### 16.3 updateSystemParam (Action)

- **설명**: 파라미터 값 수정 + 감사 로그 기록 + 캐시 무효화
- **권한**: Admin / ZENITH_SUPER_ADMIN
- **파라미터**:
  - `key`: string (변경 대상 파라미터 키)
  - `value_text?`: string
  - `value_numeric?`: number
  - `value_jsonb?`: Record<string, unknown>
  - `effective_from?`: string (ISO8601, default now())
  - `effective_to?`: string (ISO8601, 유효기간 종료)
- **프로세스**:
  1. 기존값 조회 (감사 로그용)
  2. `zen_system_params` UPDATE
  3. `zen_param_audit_log` INSERT (old_value / new_value 직렬화)
  4. `revalidateTag('system-params')` 호출 → 서버 캐시 무효화
- **응답**: `{ success: true }`
- **에러**: `NOT_FOUND` — 존재하지 않는 key

---

### 16.4 getFeatureFlags (Action)

- **설명**: Feature Flag 목록 조회. Admin=전체, User=본인 org_id 플래그만
- **권한**: Admin / User
- **파라미터**:
  - `org_id?`: string (Admin이 특정 org 플래그 조회 시)
- **응답**: `{ flags: FeatureFlag[] }`

---

### 16.5 updateFeatureFlag (Action)

- **설명**: Feature Flag 활성화/비활성화. org_id 지정 시 org 전용 플래그, null 시 전역 플래그
- **권한**: Admin / ZENITH_SUPER_ADMIN
- **파라미터**:
  - `key`: string
  - `is_enabled`: boolean
  - `org_id?`: string (uuid, null=전역)
- **프로세스**:
  1. `zen_feature_flags` UPSERT (key + org_id 복합 UNIQUE)
  2. `updated_by` = 현재 세션 사용자
- **응답**: `{ success: true }`

---

### 미들웨어 게이팅 패턴 (구현 가이드)

```typescript
// src/middleware.ts — Feature Flag 체크 예시
const flagEnabled = await getFeatureFlagFromCache(key, orgId);
if (!flagEnabled) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

---

*작성: Aiden (ZEN_CEO) | 2026-04-26 | Sprint 5 사전 명세 (R-11 선행 설계)*
