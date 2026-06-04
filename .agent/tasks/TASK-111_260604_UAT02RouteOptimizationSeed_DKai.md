# TASK-111 — UAT-02 Route Optimization Seed Fix (ICN→JFK)

> **생성일**: 2026-06-04
> **담당**: D_Kai
> **상태**: 🔔 (Aiden 검토 요청)
> **커밋**: `ea1c5cb`

---

## 배경

`uat02_corp_shipper@zenith.kr` 로그인 후 `#ZEN-2026-000002` Order Detail에서 "최적 경로 조회" 시 경로 및 비용이 조회되지 않음.

## 원인

1. **Port mismatch**: ZEN-2026-000002의 도착지 port code는 **JFK**였음 (SQL dump상 LAX로 기록되었으나 실제 DB는 JFK UUID로 저장)
2. **Missing routes**: `zen_route_network`에 ICN→JFK 경로 0건
3. **Seed skip**: 기존 seedRouteNetwork는 데이터 존재 시 skip → 신규 경로 추가 불가

## 수정 내역

### `scripts/seed-local.ts`

- `seedRouteNetwork()`:
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

- **236/236 PASS** ✅
- DB `zen_route_network`: 9 routes, 중복 없음
- 커밋: `ea1c5cb`

## UAT 복구 절차

```bash
# 재시드 (route network 확보)
SUPABASE_SERVICE_ROLE_KEY=REDACTED npx tsx scripts/seed-local.ts
```

## Aiden 확인 필요 사항

- [ ] Route optimization 정상 동작 확인 (uat02_corp_shipper → ZEN-2026-000002 → 경로 계산하기)
- [ ] 추가 UAT scenario 필요 여부

---

## 개정 이력

| 날짜 | 작성자 | 설명 |
|:-----|:-------|:-----|
| 2026-06-04 | D_Kai (OpenCode) | v1.0 — 최초 작성 |
