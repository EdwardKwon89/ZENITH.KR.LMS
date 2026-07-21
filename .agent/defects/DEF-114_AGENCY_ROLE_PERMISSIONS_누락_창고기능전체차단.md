# DEF-114: ROLE_PERMISSIONS에 AGENCY 누락 — 창고관리 기능 전체 500 에러

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-22 |
| **보고자** | jungjs (Jaison) |
| **긴급도** | Critical |
| **우선순위** | P1 |
| **연결 이슈** | [#655](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/655) |

## 현상

`agency@zenith.kr`(AGENCY 역할)로 창고관리 기능(입고확정, 출고확정, 픽업완료 등) 실행 시 500 에러 발생.

```
Error: AGENCY 역할은 WAREHOUSED 상태로 변경할 권한이 없습니다.
    at updateOrderStatus (src/app/actions/operations/orders.ts:395:11)
```

## 근본 원인

`src/lib/logistics/status-machine.ts`의 `ROLE_PERMISSIONS`에 `USER_ROLES.AGENCY` 항목이 없음.

- `canChangeStatus()`는 `ROLE_PERMISSIONS[role]` 조회 → AGENCY 미등록 → `undefined` → `[]` (빈 배열)
- 모든 상태 변경이 `!allowedByRole.includes(target)` 통과 실패 → 권한 없음 오류

## 영향 범위

AGENCY 역할에서 다음 전액션 차단:

| 기능 | target 상태 |
|:-----|:-----------|
| confirmInbound (입고확정) | WAREHOUSED |
| confirmOutbound (출고확정) | RELEASED |
| confirmPickup (픽업완료) | SCHEDULED |
| cancelPickup (픽업취소) | REGISTERED |
| confirmUpsRegistration (UPS접수) | PACKED |
| undoUpsRegistration (UPS등록취소) | WAREHOUSED |
| confirmDeparture (출고확정처리) | IN_TRANSIT |
| undoOutbound (출고취소) | PACKED |
| cancelInbound (입고취소) | REGISTERED/SCHEDULED |

## 조치

`ROLE_PERMISSIONS`에 AGENCY 항목 추가 (6개 상태 권한):

```typescript
[USER_ROLES.AGENCY]: [
  OrderStatus.REGISTERED,
  OrderStatus.SCHEDULED,
  OrderStatus.WAREHOUSED,
  OrderStatus.PACKED,
  OrderStatus.RELEASED,
  OrderStatus.IN_TRANSIT,
],
```

DELIVERED, CANCELED, CLAIMED 등은 AGENCY 권한 범위 밖으로 제외.

## 테스트

- TC-AG-T1~TC-AG-T9: AGENCY 역할 권한 검증 9개 케이스 추가
- status-machine 31/31 PASS + warehouse 14/14 PASS
- TypeScript: 내 파일 0 error (e2e pre-existing errors만 존재)
