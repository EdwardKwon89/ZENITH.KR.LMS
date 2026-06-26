# TASK-B-028 — IMP-139: UpsTrackingProvider + zen_ups_tracking_events 저장

> **Task-ID**: TASK-B-028
> **생성일**: 2026-06-26
> **발령자**: Aiden (ZEN_CEO) — An-13 v2.0 Edward 승인 (2026-06-26)
> **담당**: JSJung (리더·검토) / Dave (구현)
> **우선순위**: P1
> **상태**: ⬜
> **GitHub Issue**: [#109](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/109)
> **연관 IMP**: IMP-139
> **전제조건**: TASK-B-025 (IMP-136) ✅ + TASK-B-027 (IMP-138) ✅
> **설계 참조**: [An-13 v2.0](../../docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md) §5·§7

---

## 업무 개요

shxk `gettrack` API 기반 트래킹 폴링 Provider 구현 및 이벤트 저장 (IMP-139).
An-13 v2.0 §7 폴링 전략 기준 적용.

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| TASK-B-025 ✅ (shxk client) | ✅ |
| TASK-B-027 ✅ (DB 마이그레이션) | ✅ |

---

## 구현 범위

### 신규 파일

```
src/lib/shxk/tracking.ts     — gettrack 래퍼 + ITrackingProvider 구현
```

### tracking.ts 핵심

```typescript
export async function pollTracking(trackingNumber: string) {
  const res = await shxkRequest('gettrack', { tracking_number: trackingNumber });
  return res.data;
}

// ITrackingProvider 구현 (gettrack 기반)
export function isDelivered(trackStatus: string): boolean {
  return trackStatus === 'DL'; // 완료 코드 시 폴링 중단
}
```

### 폴링 전략 (An-13 v2.0 §7)

| 구간 | 주기 |
|:-----|:----:|
| 출고 후 48시간 | 30분 |
| 48시간 ~ 7일 | 2시간 |
| 7일 초과 | 6시간 |
| `DL` 상태 | 폴링 중단 (`zen_tracking_configs.is_active = false`) |

### 이벤트 저장

- `pollTracking()` 결과를 `zen_ups_tracking_events` 테이블에 upsert
- `raw_payload`: gettrack 응답 전체 JSONB 저장
- 중복 방지: (label_id, event_time) 기준

---

## DoD (Definition of Done)

- [x] `src/lib/shxk/tracking.ts` 생성 — `pollTracking()` + `isDelivered()` 구현
- [x] `zen_ups_tracking_events` 저장 로직 구현
- [x] `DL` 상태 시 `is_active = false` 처리
- [x] ZEN_A4 함수 50줄 이하 준수 (pollTracking 14줄, isDelivered 3줄, storeTrackingEvents 22줄)
- [x] `rtk npm run test:regression` — build ✅ + 381/387 PASS (6건 pre-existing p6-transport-policy)
- [x] 코드 커밋 해시 기재: `1f2e2e8`

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

| 항목 | 내용 |
|:-----|:-----|
| 코드 커밋 | `1f2e2e8` |
| 회귀 결과 | 381/387 PASS (6건 pre-existing p6-transport-policy — local Supabase seed data, R-14) |

### 구현 완료

| 파일 | 내용 |
|:-----|:------|
| `src/lib/shxk/tracking.ts` (신규) | `pollTracking()`: `gettrack` API 호출 · `isDelivered()`: `DL` 코드 체크 · `storeTrackingEvents()`: 이벤트 upsert + `DL` 시 `is_active=false` |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | TASK-B-028 신규 발령 — An-13 v2.0 IMP-139 |
| 2026-06-26 | Jaison (JSJung) | 담당 Baker → Dave 재배정 (TASK-B-026과 병렬 진행) · 전제조건 ✅ 확인 |
| 2026-06-26 | Dave (DeepSeek V4) | **§1 구현** — `src/lib/shxk/tracking.ts` · `pollTracking()` + `isDelivered()` + `storeTrackingEvents()` · build ✅ · 회귀 381/387 |
