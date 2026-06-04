# TASK-111 — Route Network 자동 생성 + UAT-02 Seed Fix

> **생성일**: 2026-06-04
> **담당**: Noah (Codex) / D_Kai
> **상태**: 🔔 (Aiden 검토 요청)
> **커밋**: `ea1c5cb` + `(미커밋, rates.ts)`

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

### 🔵 수정 1: `createRateCard()` — Route Network 자동 생성 (Noah)

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

- **236/236 PASS** ✅ (rates.ts type error 0건 확인)
- DB `zen_route_network`: 9 routes, 중복 없음

## UAT 복구 절차

```bash
# 재시드 (route network 확보)
SUPABASE_SERVICE_ROLE_KEY=REDACTED npx tsx scripts/seed-local.ts
```

## Aiden 확인 필요 사항

- [ ] **설계 방향 검토**: Rate Card 등록 시 route network 자동 생성 방식으로 DEF-040 해결. 별도 Route Network Admin UI 불필요.
- [ ] `autoCreateRouteNetwork()` non-fatal 처리 방식 적절한지
- [ ] Route optimization 정상 동작 확인 (uat02_corp_shipper → ZEN-2026-000002 → 경로 계산하기)
- [ ] 추가 UAT scenario 필요 여부

## 관계 문서

| 문서 | 링크 |
|:-----|:------|
| DEF-040 | [UAT_DEFECT_LOG.md](../../docs/91_FinalTest/UAT/UAT_DEFECT_LOG.md#L90) |
| `createRateCard()` | `src/app/actions/admin/rates.ts:132-140` |
| `autoCreateRouteNetwork()` | `src/app/actions/admin/rates.ts:17-62` |

---

## 개정 이력

| 날짜 | 작성자 | 설명 |
|:-----|:-------|:-----|
| 2026-06-04 | D_Kai (OpenCode) | v1.0 — 최초 작성 (seed fix) |
| 2026-06-04 | Noah (Codex) | v2.0 — 설계 보강: Route Network 자동 생성 + DEF-040 해소 |
