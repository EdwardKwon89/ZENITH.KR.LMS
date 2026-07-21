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

## OPERATOR 권한 관련 검토

**판단: 현행 유지 (추가 권한 부여하지 않음)**

### 배경
PR#646(Baker, TASK-B-170)에서 `ROLE_PERMISSIONS[OPERATOR]`에 WAREHOUSED/PACKED/RELEASED/IN_TRANSIT를 추가했었음.

### 분석
1. **OPERATOR는 `WAREHOUSE_ROLES`에 포함되지 않음** — `src/app/actions/operations/warehouse.ts:12`에서 `WAREHOUSE_ROLES = [ADMIN, MANAGER, ZENITH_SUPER_ADMIN, AGENCY]`로 정의되어 있으며 OPERATOR는 제외됨
2. **실효성 없음**: OPERATOR에 아무리 많은 전이 권한을 부여해도 `WAREHOUSE_ROLES.includes(profile.role)` 게이트에서 차단되어 warehouse 서버 액션에 접근할 수 없음
3. **현행 유지 사유**: OPERATOR의 기존 권한(SCHEDULED/HELD/CANCELED/CLAIMED)은 운영/지원 업무에 적합하며, 창고 업무(WAREHOUSED/PACKED/RELEASED/IN_TRANSIT)는 warehouse 역할(ADMIN/MANAGER/AGENCY)의 책임이므로 분리 유지

### 결론
- PR#646의 OPERATOR 확장은 미병합 상태(PR 반려)로 현재 코드에 반영되지 않음
- AGENCY에 창고 상태 권한을 추가하는 것으로 충분 — OPERATOR는 현행 유지

## 테스트

### 단위 테스트 (status-machine)
- TC-AG-T1~TC-AG-T9: AGENCY 역할 권한 검증 9개 케이스 추가
  - T1~T6: 허용 검증 (REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/IN_TRANSIT)
  - T7~T9: 거부 검증 (DELIVERED/CANCELED/CLAIMED)
- status-machine: 31/31 PASS

### 통합 테스트 (server action chain)
- TC-AG-INT-01: AGENCY confirmPickup → updateOrderStatus(SCHEDULED) 정상 호출 ✅
- TC-AG-INT-02: AGENCY cancelPickup → updateOrderStatus(REGISTERED) 정상 호출 ✅
- TC-AG-INT-03: AGENCY cancelInbound → WAREHOUSED→SCHEDULED 복구 정상 ✅
- warehouse (ups-pickup-inbound): 17/17 PASS

### TypeScript
- 0 error (e2e pre-existing errors만 존재)

### 테스트 계정 실사용 확인
- 로컬 Supabase(`http://127.0.0.1:54321`) + dev server(`:3001`) 구동 확인
- `agency@zenith.kr` 계정 로그인 성공 확인 (Supabase Auth)
- `warehouse/inbound` 페이지 정상 로드 확인 (Playwright page snapshot에서 sidebar "입고 처리" 메뉴 가시적 확인)
- Playwright E2E 테스트는 로컬 DB에 테스트 시드 데이터 부재로 전체 플로우(버튼 클릭까지) 실행 불가 — 대신 단위/통합 테스트로 서버 액션 체인 전체 검증 완료

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:---------|
| `src/lib/logistics/status-machine.ts` | ROLE_PERMISSIONS에 AGENCY 추가 |
| `tests/unit/logistics/status-machine.test.ts` | TC-AG-T1~T9 9종 추가 |
| `tests/unit/warehouse/ups-pickup-inbound.test.ts` | TC-AG-INT-01~03 3종 추가 (mock에 attachOperatorNames 보강) |
| `tests/setup.ts` | server-only mock 추가 |
| `tests/__mocks__/server-only.ts` | vitest alias용 빈 모듈 |
| `vitest.config.ts` | server-only alias 추가 |
