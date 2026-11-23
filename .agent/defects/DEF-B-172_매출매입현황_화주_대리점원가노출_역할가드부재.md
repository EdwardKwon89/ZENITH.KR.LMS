# DEF-B-172: `getOrderRevenueCost`/`getOrderRevenueCostList` 역할 가드 없음·화주 응답에 대리점 원가 포함

| 항목 | 내용 |
|:--|:--|
| **긴급도** | High (원가 노출) |
| **발견일/발견자** | 2026-11-24 / Dave (TASK-B-373 PR-2 범위 확장 점검) |
| **관련** | Issue #1362, PR #1476, B-377(#1451), DEF-151 |

## 현상

- `src/app/actions/finance/order-revenue-cost.ts`의 `getOrderRevenueCost`·`getOrderRevenueCostList`는 **명시적 역할 가드가 없다**.
- 두 액션 모두 비관리자 분기에서 **대리점 매입 원가를 `cost`로 반환**한다.
- 실측(실DB·역할별 세션):
  - SHIPPER 세션: `cost`에 **대리점 원가**가 포함되고 `margin`·`marginRate`도 반환됨.
  - AGENCY 세션: 자기 대리점 원가가 포함됨(의도된 범위).
  - ADMIN: 실제 원가(정산 원가)가 포함됨(의도된 범위).
- `getOrderRevenueCostList`는 역할별 오더 스코프는 있으나, 응답 `cost`는 같은 규칙을 따른다.

## 영향

- 화주가 재무 액션을 직접 호출할 수 있는 경로에서 **대리점 매입 원가·마진**을 볼 수 있다.
- 화면 접근 권한과 무관하게 서버 액션 자체에는 가드가 없다.

## 권장 조치 (별도 Task, 이번 PR-2에서는 수정 금지)

1. 두 액션에 역할 가드(ADMIN·MANAGER·ZENITH_SUPER_ADMIN, 필요 시 AGENCY 자기 범위) 추가.
2. 비관리자 응답에서 `cost`·`margin`·`marginRate`를 제거하거나 판매가 계열 DTO로 정제.
3. 실DB 세션 매트릭스(화주·대리점·관리자)로 응답 키 집합 단언.
4. B-377(#1451)의 원가 노출 경계와 함께 정리할지, 별도 보안 Task로 분리할지 Jaison/Aiden 확인.

## 참고

- TASK-B-373 설계 §2-3A (5) 범위 확장 점검에서 발견. PR-2 구현 범위에는 포함하지 않는다.
