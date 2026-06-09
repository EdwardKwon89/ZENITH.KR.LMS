# UAT-02-04 운송 요율 Supersede 조건 Gap 보고서

| 항목 | 내용 |
|:---|:---|
| 문서 ID | RPT-UAT-02-04-SUPERSEDE |
| 작성일 | 2026-06-09 |
| 작성자 | D_Kai (OpenCode) |
| 검토 대상 | Aiden (ZEN_CEO) |
| 관련 DEF | DEF-054 |
| 상태 | Aiden 협의 필요 |

---

## 1. Executive Summary

요율 카드 등록 시 **동일 조건의 기존 활성 카드만 supersede되어야 하나**, 현재 `carrier_id + transport_mode`만 기준으로 supersede하여 **출발지/도착지가 다른 별개 경로의 요율까지 비활성화**됩니다. 경로별 요율 공존이 불가능한 구조적 문제입니다.

---

## 2. 현황 분석

### 2.1 현재 Supersede 조건

```
createRateCard()
  → findExistingActiveRateCards(carrierId, transportMode)   ← carrier + mode ONLY
  → supersedeRateCards(ids)                                  ← 조건 불문 일괄 is_active=false
  → insertRateCard({ carrier_id, transport_mode, origin_port_id, dest_port_id, ... })
```

**Supersede 쿼리** (`admin.repository.ts:297-303`):
```typescript
this.db.from('zen_rate_cards')
  .select('id, tiers')
  .eq('carrier_id', carrierId)
  .eq('transport_mode', transportMode)
  .eq('is_active', true);
```

### 2.2 문제 케이스

| 시나리오 | Carrier | Mode | 출발지 | 도착지 | 예상 동작 | 실제 동작 |
|:---|:---:|:---:|:---:|:---:|:---|:---|
| A 등록 | CarrierA | AIR | ICN | JFK | 활성화 | ✅ 활성 |
| B 등록 | CarrierA | AIR | ICN | LAX | A 유지, B 활성 | ❌ A supersede됨 |
| C 등록 | CarrierA | AIR | ICN | SIN | A,B 유지, C 활성 | ❌ A,B 모두 supersede됨 |

**결과**: CarrierA의 AIR 요율은 항상 최신 1건만 활성 — 경로를 추가할수록 기존 경로 요율이 모두 비활성화되어 Order에서 자동 매칭 불가.

### 2.3 영향 범위

| 영향 | 설명 |
|:---|:---|
| Order Rate Matching | `fn_get_best_matching_rate`가 port 기반 우선순위 매칭하지만, 대부분의 활성 카드가 port=NULL → 전체 supersede로 소멸되어 항상 최신 1건만 매칭 |
| 경로별 요율 관리 | ADMIN이 경로(ICN→JFK, ICN→LAX)별로 다른 요율을 설정할 수 없음 |
| Fallback 요율 | port=NULL fallback 요율이 존재해도 다른 경로 등록 시 supersede되어 소멸 |

---

## 3. 수정 방안

### 3.1 Supersede 조건에 port 추가 (제안)

`findExistingActiveRateCards`에 `origin_port_id`, `dest_port_id`를 추가 인자로 전달:

```typescript
async findExistingActiveRateCards(
  carrierId: string,
  transportMode: string,
  originPortId?: string | null,
  destPortId?: string | null,
) {
  let query = this.db
    .from('zen_rate_cards')
    .select('id, tiers')
    .eq('carrier_id', carrierId)
    .eq('transport_mode', transportMode)
    .eq('is_active', true);

  // origin_port_id 매칭 (null 허용)
  if (originPortId === null || originPortId === undefined) {
    query = query.is('origin_port_id', null);
  } else {
    query = query.eq('origin_port_id', originPortId);
  }

  // dest_port_id 매칭 (null 허용)
  if (destPortId === null || destPortId === undefined) {
    query = query.is('dest_port_id', null);
  } else {
    query = query.eq('dest_port_id', destPortId);
  }

  return query;
}
```

**서버 액션 호출부** (`rates.ts:116-124`):
```typescript
const { data: existingRates } = await adminRepo.findExistingActiveRateCards(
  payload.card.carrier_id,
  payload.card.transport_mode,
  payload.card.origin_port_id,
  payload.card.dest_port_id,
);
```

### 3.2 supersede 대상 조건 (3안 비교)

| 안 | supersede 조건 | 장점 | 단점 |
|:---|:---|---:|:---|
| **A안 (제안)** | carrier + mode + origin + dest **정확히 일치** | 경로별 요율 공존 가능 | 동일 경로 중복 활성 방지 |
| B안 | carrier + mode + origin + dest **중 null은 와일드카드** | null=모든경로 fallback 보호 | 로직 복잡, 예상치 못한 supersede |
| C안 | 현행 유지 + DB UNIQUE 제약 추가 | DB 정합성 보장 | 경로별 공존 불가 (현행과 동일) |

### 3.3 영향도

| 항목 | 영향 |
|:---|:---|
| 변경 파일 | `admin.repository.ts` (1 file) + `rates.ts` (server action) |
| 테스트 영향 | 기존 TC-RATES는 동일 carrier+mode+port 조합만 등록 → supersede 동작 변화 없음 |
| 기존 데이터 | 이미 supersede된 카드는 `is_active=false` 유지, 재활성화 필요 시 별도 조치 |
| 회귀 위험 | LOW — supersede 조건이 좁아질 뿐(기존보다 덜 supersede함) |

---

## 4. 추가 검토: Order 요금 보존 및 개정 이력 (Pri/Snd 설계)

### 4.1 현재 문제

`updateRateCard`가 **in-place UPDATE** (`rates.ts:211-214`)로 동작 — Order 발행 후 요율을 수정하면 snapshot이 참조하는 rate card의 tiers/costs가 **변경되어** Order 당시 요금과 달라집니다. `createRateCard`의 supersede 방식은 새 row를 INSERT하지만, `updateRateCard`는 기존 데이터를 덮어씁니다.

### 4.2 Pri/Snd 설계 제안

| 구분 | Pri (논리적 ID) | Snd (물리적 ID, = 현재 `id`) |
|:---|:---|---|
| 최초 등록 | 신규 UUID 생성 | 신규 UUID 생성 (Pri = Snd) |
| 수정 (updateRateCard) | Pri 유지 | **신규 UUID 생성** (INSERT, 새 row) |
| supersede로 인한 개정 | Pri 유지 | 신규 UUID 생성 (현행과 동일) |
| Order snapshot `rate_card_id` | 미참조 | **Snd 참조** → 수정 전 버전의 요금 영구 보존 |

### 4.3 개정 이력 순서 추적

`pri_id` + `version_no` 조합으로 전체 개정 이력 추적 가능:

```sql
-- 보강 컬럼
ALTER TABLE public.zen_rate_cards
  ADD COLUMN pri_id UUID NOT NULL DEFAULT gen_random_uuid(),   -- 논리적 식별자
  ADD COLUMN superseded_at TIMESTAMPTZ,                        -- supersede 시각 (NULL=현재 활성)
  ADD COLUMN version_no INT;                                   -- pri_id 그룹 내 순번
```

```sql
-- 특정 요율의 전체 개정 이력 조회
SELECT id AS snd_id, pri_id, version_no, created_at, superseded_at, is_active
FROM zen_rate_cards
WHERE pri_id = 'abc-def-...'
ORDER BY version_no;

-- 결과 예시:
-- snd_id=A1 | pri_id=X | version_no=1 | 2026-06-01 | 2026-06-10 | false
-- snd_id=A2 | pri_id=X | version_no=2 | 2026-06-10 | 2026-06-15 | false
-- snd_id=A3 | pri_id=X | version_no=3 | 2026-06-15 | NULL        | true
```

### 4.4 updateRateCard → supersede + INSERT 전환

`updateRateCard`를 in-place UPDATE에서 supersede + INSERT로 변경:

```typescript
// before: in-place UPDATE (요금 소급 변동 위험)
// await supabase.from('zen_rate_cards').update(data).eq('id', cardId);

// after: supersede + INSERT (버전별 row 분리)
await adminRepo.supersedeRateCard(cardId);                    // 기존 is_active=false
const { data: newCard } = await adminRepo.insertRateCard({    // 새 버전 INSERT
  ...payload,
  pri_id: existing.pri_id,                                    // 동일 pri_id 유지
  version_no: existing.version_no + 1,                        // 순번 증가
});
```

### 4.5 Order 요금 불변성 보장 흐름

```
① 최초 등록
   pri_id=X, snd_id=A1, version_no=1, is_active=true
   → Order-001 snapshot: rate_card_id=A1 (운송요금 100)

② 요율 수정 (5% 인상)
   A1 supersede (is_active=false, superseded_at=now())
   pri_id=X, snd_id=A2, version_no=2, is_active=true (운송요금 105)
   → Order-001 snapshot: rate_card_id=A1 (운송요금 100) ← 변동 없음 ✅
   → Order-002 신규: rate_card_id=A2 (운송요금 105)

③ 요율 개정 (다른 조건 supersede)
   A2 supersede
   pri_id=X, snd_id=A3, version_no=3, is_active=true
   → Order-001: rate_card_id=A1 (100) ✅
   → Order-002: rate_card_id=A2 (105) ✅
   → Order-003 신규: rate_card_id=A3 (신규요금)
```

### 4.6 변경 범위

| 항목 | 영향 |
|:---|:---|
| DB | `zen_rate_cards`에 `pri_id`, `superseded_at`, `version_no` 컬럼 추가 (migration 1건) |
| `admin.repository.ts` | `supersedeRateCard(id)` 단건 메서드 추가, `findExistingActiveRateCards` port 조건 추가 |
| `rates.ts` | `createRateCard`에 pri_id/version_no 할당 로직 추가, `updateRateCard` → supersede+INSERT 전환 |
| `tisa.ts` | `getOrderRateSnapshot` — rate_card_id로 Snd 조회, 변경 없음 |
| `fn_get_best_matching_rate` | 변경 없음 (여전히 `is_active=true` & port 조건으로 매칭) |
| Order snapshot | `rate_card_id`는 Snd 참조 — 영향 없음 |

---

## 5. 결론

**A안 채택 권장** (3.1항): supersede 조건에 `origin_port_id` + `dest_port_id`를 추가하여 경로별 요율 공존.

**추가 권장** (4.2항): Pri/Snd + `version_no` 도입으로 Order 요금 불변성 및 개정 이력 추적 보장.

두 수정은 독립적 — A안은 즉시 적용 가능, Pri/Snd는 별도 Task 분리 가능. 변경 범위 LOW-MEDIUM, 회귀 위험 LOW.

Aiden 검토 후 방향 확정 바랍니다.

---

## 6. 참조

- 관련 코드: `src/lib/repositories/admin.repository.ts:297-311`
- 서버 액션: `src/app/actions/admin/rates.ts:116-124`
- Rate 매칭 함수: `fn_get_best_matching_rate` (`20260603010000_imp095_port_based_rate_matching.sql`)
- Order snapshot: `20260418135000_create_order_rate_snapshots.sql`
- DEF-054: UAT_DEFECT_LOG.md 참조
