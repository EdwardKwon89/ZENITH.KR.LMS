# TASK-111 — Route Network 자동 생성 + UAT-02 Seed Fix

| 항목 | 내용 |
|:---|:---|
| Task ID | TASK-111 |
| 생성일 | 2026-06-04 |
| 할당 Agent | D_Kai (OpenCode) |
| 우선순위 | P1 |
| 관련 IMP | — (DEF-040) |
| 전제조건 | 없음 |
| 상태 | ✅ |

---

## 배경 — 문제 재정의

UAT-02 CORPORATE shipper (`uat02_corp_shipper@zenith.kr`)가 `#ZEN-2026-000002` Order Detail에서 "최적 경로 조회" 시 경로 및 비용이 조회되지 않음.

### 근본 원인

경로 최적화는 **두 테이블이 모두 필요**하지만 Rate Card 등록만으로 Route Network가 생성되지 않는 설계 문제:

| 계층 | 역할 | Admin 등록 경로 |
|:-----|:-----|:----------------|
| `zen_rate_cards` | 요금 정의 (carrier, mode, tiers, origin_port, dest_port) | `/admin/rates` UI ✅ |
| `zen_route_network` | 경로 가용성 (carrier가 어떤 port 간 서비스하는지) | **SQL 전용 ❌** — 관리 UI 없음 (DEF-040) |

→ Rate Card에 origin_port / dest_port가 포함되어 있으므로, **Rate 등록 시점에 route network도 자동 생성되어야 함**.

## 수정 내역

### 🔵 수정 1: `createRateCard()` — Route Network 자동 생성 (D_Kai)

**파일**: `src/app/actions/admin/rates.ts`

`createRateCard` 서버 액션에 `autoCreateRouteNetwork()` 헬퍼 추가:

```
Rate Card 저장 성공 → surcharges 저장 완료
  └── origin_port_id && dest_port_id 모두 있음?
        ├── YES → zen_ports 조회 (UUID → CODE 매핑, e.g. UUID → "ICN"/"JFK")
        ├        → zen_route_network UPSERT (ON CONFLICT: carrier_id+from+to+mode)
        ├        → transit_days 기본값: AIR/EXP=1, SEA=7, LAND=3
        └── NO  → skip (port 미지정 요금 = 글로벌 요금으로 간주)
```

**설계 원칙**:
- **Non-fatal**: route network 생성 실패해도 Rate Card 등록은 유지 (`logger.warn`만 출력)
- **Idempotent**: 동일 (carrier + from + to + mode) 조합이 이미 있으면 `ON CONFLICT`로 transit_days만 업데이트
- **Port 미지정**: origin_port_id / dest_port_id가 없으면 route network 생성 건너뜀 (글로벌 요금)
- **AFTER surcharges**: rate card + surcharges 저장 완료 후 마지막에 실행

**효과**: Rate Card 등록만으로 경로 최적화가 정상 동작. 별도 Route Network 관리 UI 불필요.

### 🔵 수정 2: `seedRouteNetwork()` — 시드 보강 (D_Kai, `ea1c5cb`)

**파일**: `scripts/seed-local.ts`

`seedRouteNetwork()`:

- ICN↔JFK (AIR/SEA) 2개 루트 추가
- ICN↔LAX (AIR/SEA), ICN↔SIN (AIR/SEA/LAND), PVG↔ICN (AIR/SEA) 유지
- Skip-if-exists 제거 → `ON CONFLICT DO NOTHING` 기반 idempotent upsert
- 에러 메시지 하드코딩 → 동적 route pair 표시

### DB 직접 조치

```
INSERT INTO zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days, is_active)
SELECT c.id, 'ICN', 'JFK', 'AIR', 12, true FROM zen_carriers c WHERE c.code = 'ZENITH_AIR';

INSERT INTO zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days, is_active)
SELECT c.id, 'ICN', 'JFK', 'SEA', 18, true FROM zen_carriers c WHERE c.code = 'ZENITH_SEA';
```

중복 데이터 정리 (5건 삭제).

## 검증

| 검증 항목 | 결과 |
|:----------|:----:|
| 회귀 테스트 | **236/236 PASS** ✅ |
| rates.ts type error | 0건 ✅ |
| DB `zen_route_network` | 9 routes, 중복 없음 ✅ |

## DoD (완료 기준)

- [x] `createRateCard()`에 `autoCreateRouteNetwork()` 헬퍼 + 호출부 추가 ✅ — `dc0e233`
- [x] `zen_ports` UUID→CODE 매핑 후 `zen_route_network` UPSERT ✅ — `dc0e233`
- [x] Non-fail 처리 (실패 시 `logger.warn`, rate card 등록은 유지) ✅
- [x] `scripts/seed-local.ts` — ICN↔JFK(AIR/SEA) 시드 추가 + idempotent upsert ✅ — `ea1c5cb`
- [x] DB 직접 조치: ICN→JFK AIR/SEA 2건 INSERT + 중복 5건 DELETE ✅
- [x] 회귀 테스트 전량 PASS ✅ — **236/236**
- [x] GitNexus impact analysis 실행 완료 — LOW risk ✅
- [x] DEF-040 UAT_DEFECT_LOG.md 수정완료 갱신 (커밋 `01786d3` → `25dd208` 분할) ✅
- [x] 코드 커밋 (`dc0e233`: code-only) + 문서 커밋 (`25dd208`: docs-only) 분리 ✅
- [x] 커밋 태그 `[D_Kai]` 통일 ✅
- [x] 신원 정정 (Noah→D_Kai) — `63d5ad1` ✅
- [x] Task file header 상태 🔔 + ACTIVE_TASK.md 🔔 ✅

## UAT 복구 절차

```bash
# 재시드 (route network 확보)
SUPABASE_SERVICE_ROLE_KEY=REDACTED npx tsx scripts/seed-local.ts
```

## [작업 결과]

### §1 — 코드 구현 ✅ (`dc0e233`)

**파일**: `src/app/actions/admin/rates.ts`

```
createRateCard() 성공 → surcharges 저장 완료
  └── origin_port_id && dest_port_id 모두 있음?
        ├── YES → autoCreateRouteNetwork()
        │          ├── zen_ports 조회 (UUID→CODE)
        │          └── zen_route_network UPSERT (ON CONFLICT carrier_id+from+to+mode)
        └── NO  → skip (port 미지정 요금)
```

- 헬퍼 함수 `autoCreateRouteNetwork()` 신규: 46줄
- `TRANSIT_DAYS_DEFAULT`: AIR/EXP=1, SEA=7, LAND=3
- Non-fatal: 실패 시 `logger.warn`, rate card 등록 유지
- 기존 코드 변경 없음 (추가만)

### §2 — 시드 보강 ✅ (`ea1c5cb`)

**파일**: `scripts/seed-local.ts`

- ICN↔JFK (AIR/SEA) 2개 route 추가 (기존 7개 유지 → 총 9개)
- `seedRouteNetwork()` skip-if-exists 제거 → `ON CONFLICT DO NOTHING` 기반 idempotent
- 에러 메시지 하드코딩 제거 → 동적 route pair 표시

### §3 — DB 직접 조치

```sql
INSERT INTO zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days, is_active)
SELECT c.id, 'ICN', 'JFK', 'AIR', 12, true FROM zen_carriers c WHERE c.code = 'ZENITH_AIR';

INSERT INTO zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days, is_active)
SELECT c.id, 'ICN', 'JFK', 'SEA', 18, true FROM zen_carriers c WHERE c.code = 'ZENITH_SEA';
```

중복 데이터 정리 (5건 DELETE).

### §4 — 문서 갱신 ✅ (`25dd208` · `63d5ad1`)

| 문서 | 갱신 내용 |
|:-----|:----------|
| `UAT_DEFECT_LOG.md` | DEF-040 미수정→수정완료 · 현황 요약 갱신 · 개정이력 추가 |
| `ACTIVE_TASK.md` | TASK-111 설명 확장 · Agent 신원 D_Kai 정정 |
| `TASK-111.md` | v2.0: auto-creation architecture fix 상세 · DoD · [작업 결과] |

### §5 — 초기 검증 ✅ (dc0e233)

- **236/236 PASS** (48 files, 43.01s)
- TypeScript `npx tsc --noEmit`: rates.ts error 0건
- DB `zen_route_network`: 9 routes, 중복 없음
- GitNexus impact analysis: LOW risk (upstream callers 0 · affected processes 0)

## [Aiden 검토]

### 1차 검토 (2026-06-04) — ❌ 반려

**설계 방향 승인**: Rate Card 등록 시 route network 자동 생성 방식 ✅. non-fatal 처리 ✅. DEF-040 해소 접근법 ✅.

**반려 사유 (2건)**:

1. **[R-09 미이행] TC-RATES-07 등록 없음**
   - `LIVE_REGRESSION_TEST_MAP.md` 실행 이력만 v18.1 갱신, TC 목록에 신규 항목 없음
   - `autoCreateRouteNetwork()` 로직 변경 시 회귀 탐지 불가

2. **[코드 미수정] `supabase: any` 타입**
   - `rates.ts:18` `autoCreateRouteNetwork(supabase: any, ...)` — IMP-029 TS any 퇴출 기조 위반
   - `dc0e233`에서 수정 없이 그대로 커밋됨

**재작업 지시** (2건 단일 커밋):
1. `rates.ts:18` `supabase: any` → 적절한 Supabase 클라이언트 타입으로 교체
2. `LIVE_REGRESSION_TEST_MAP.md` TC-RATES-07 신규 등록
   - 검증 항목: Rate Card 등록 시 `zen_route_network` 자동 생성 (origin/dest port 있을 때)
   - 검증 항목: Non-fatal — route network 실패 시에도 Rate Card 등록 유지
3. 코드+문서 커밋 후 🔔 재제출

### 2차 제출 (2026-06-04) — 🔔 재검토 요청

**조치 완료 (2건)**:

1. **`supabase: any` → `SupabaseClient`** ✅
   - `rates.ts:18` `async function autoCreateRouteNetwork(supabase: SupabaseClient, ...)`
   - `import { SupabaseClient } from '@supabase/supabase-js';` 추가

2. **TC-RATES-07 등록** ✅
   - `LIVE_REGRESSION_TEST_MAP.md` TC-RATES-07 신규 항목 추가
   - `tests/unit/rates/rates.test.ts` TC-RATES-07 (port 지정 시 auto-upsert) + 07b (port 미지정 시 skip) + 07c (upsert 실패해도 rate card 유지) — 3개 테스트 구현

**검증**:
- 단위 테스트: **7/7 PASS** (TC-RATES-01~04 + 07/07b/07c)
- 회귀 테스트: **239/239 PASS** (기존 236 + 신규 3)
- TypeScript: `npx tsc --noEmit` — rates.ts error 0건 (SupabaseClient 타입 적용)
- 커밋: 단일 커밋 (code + docs)

### 2차 검토 (2026-06-04) — ✅ PASS

**반려 사유 2건 전량 해소 확인**:
1. `rates.ts:18` `supabase: SupabaseClient` 타입 적용 ✅ + `import { SupabaseClient }` 추가 ✅
2. `LIVE_REGRESSION_TEST_MAP.md` TC-RATES-07 신규 등록 ✅ (07/07b/07c 3케이스 구현 포함)

**Advisory (비차단)**:
- `rates.ts:35` `(p: any)` 잔존 — 반려 명시 항목 외이므로 비차단. IMP-029 후속 작업 대상
- `0fd8b1d` 코드+문서 단일 커밋 — R-17 절차 위반. D_Kai Advisory 누적 경향 기록

**DEF-040 해소 확정**. TASK-111 ✅ 승인.

## 관계 문서

| 문서 | 링크 |
|:-----|:------|
| DEF-040 | [UAT_DEFECT_LOG.md](../../docs/91_FinalTest/UAT/UAT_DEFECT_LOG.md#L90) |
| `createRateCard()` | `src/app/actions/admin/rates.ts:132-140` |
| `autoCreateRouteNetwork()` | `src/app/actions/admin/rates.ts:17-62` |

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 내용 |
|:----:|:----:|:-------|:-----|
| v1.0 | 2026-06-04 | D_Kai (OpenCode) | 최초 작성 — seed fix (ICN→JFK 시드 보강) |
| v2.0 | 2026-06-04 | D_Kai (OpenCode) | 설계 보강 — Route Network 자동 생성 + DEF-040 해소 |
| v2.1 | 2026-06-04 | D_Kai (OpenCode) | DoD·[작업 결과] 보강 + 신원 정정 · 커밋 분할 (`dc0e233`+`25dd208`+`63d5ad1`) |
| v2.2 | 2026-06-04 | Aiden (Claude) | 1차 검토 ❌ 반려 — R-09 TC-RATES-07 미등록 · `supabase: any` 미수정 |
| v2.3 | 2026-06-04 | D_Kai (OpenCode) | 재작업 완료 — `supabase: any`→`SupabaseClient` · TC-RATES-07 등록+구현 · 239/239 PASS · 🔔 재제출 |
| v2.4 | 2026-06-04 | Aiden (Claude) | 2차 검토 ✅ PASS — 반려 사유 2건 해소 확인. Advisory 2건(p:any 잔존·단일커밋) 비차단. DEF-040 해소 확정. |
