# SAR - ROU-02 RouteSegment 인터페이스 필드명 불일치 (BUG-09-A)

**문서번호:** SAR-2026-04-24-004  
**날짜:** 2026-04-24  
**작성자:** Aiden (AI Agent)  
**심각도:** MINOR (Mock 단계 기능 영향 없음 — R-12 위반)

---

## 1. 현상 (What)

`src/lib/logistics/routing.ts`의 `RouteSegment` 인터페이스 필드명이 `Ds_11_DETAIL_ROUTING.md` 명세와 불일치하였습니다.

| 필드 | 명세 (`Ds_11`) | 구현 (수정 전) |
|:---|:---|:---|
| 운송 수단 | `transport_mode: 'AIR' \| 'SEA' \| 'LAND'` | `mode: 'SEA' \| 'AIR' \| 'LAND'` |
| 출발지 | `from_port_id: uuid` | `from: string` |
| 도착지 | `to_port_id: uuid` | `to: string` |
| 운송사 | `carrier: string` | `carrier_name?: string` (Optional) |
| 통화 | `currency: string` | 누락 |

---

## 2. 원인 (Why)

- **직접 원인**: `RouteSegment` 인터페이스를 Ds-11 명세 확정 이전에 임시로 정의하고, 명세 확정 후 동기화를 누락함.
- **근본 원인**: R-11(API-First) 원칙에서 인터페이스 타입 정의도 명세 확정 후 작성해야 하나, 구현 편의상 선정의가 발생.
- **탐지 경위**: Aiden의 ROU-02 Sprint A 심사(2026-04-24) — `Ds_11` Architecture 섹션 `Interface RouteSegment`와 코드 비교 중 발견.

---

## 3. 조치 (How)

Aiden이 직접 수정 완료하였습니다.

- **인터페이스 갱신** (`src/lib/logistics/routing.ts:9-17`):
  ```typescript
  export interface RouteSegment {
    transport_mode: 'SEA' | 'AIR' | 'LAND';
    from_port_id: string;
    to_port_id: string;
    carrier: string;
    transit_days: number;
    cost: number;
    currency: string;
  }
  ```
- **MockMapAdapter 갱신** (`routing.ts:43-64`): 새 필드명으로 Mock 시나리오 3종 업데이트, `currency: 'USD'` 추가
- **테스트 Mock 갱신** (`tests/integration/rou-01.test.ts`): `mockRouteOption.segments` 필드명 동기화

---

## 4. 검증 (Verification)

- 전체 회귀 테스트 99/99 PASS 확인 (2026-04-24, `rtk npm run test:regression`)

---

## 5. 예방 (Prevention)

- **R-11 체크리스트 강화**: "구현 전 인터페이스/타입 정의가 Ds-11 명세와 일치하는가" 항목 추가
- **선정의 금지 원칙**: Mock 단계라도 임시 타입을 먼저 정의하지 말고, 명세 확정 후 타입을 작성할 것
