# DEF-B-018: `/admin/ups-actual-charges` 오더 검색 500 에러 — `zen_orders.dest_country_code` 컬럼 부재

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | jungjs (Jaison) — `/ko/admin/ups-actual-charges`에서 `ZEN-2026-000001` 검색 중 지적 |
| **긴급도** | High |
| **우선순위** | P1 |
| **관련 Issue** | [#899](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/899) |

## 현상

`/admin/ups-actual-charges`에서 오더번호로 검색하면 500 에러 발생, 검색 자체가 불가능함.

## 원인 (로그 확인 완료)

```
⨯ Error: 오더 검색 실패: column zen_orders.dest_country_code does not exist
    at searchDeliveredUpsOrders (src/app/actions/finance/ups-actual-charges.ts:322:11)
 POST /ko/admin/ups-actual-charges 500 in 709ms
  └─ ƒ searchDeliveredUpsOrders("ZEN-2026-000001") in 91ms
```

`src/app/actions/finance/ups-actual-charges.ts`의 `searchDeliveredUpsOrders()` 함수 내 **2곳**(약 313행, 358행)에서 `zen_orders.dest_country_code`를 select — `zen_orders`에 이 컬럼은 존재한 적이 없음. **실제 컬럼명은 `recipient_country_code`.**

오늘 Aiden이 발견·수정한 **DEF-129**(`.agent/defects/DEF-129_agency_settlement_dest_country_code_컬럼부재.md`, `src/lib/actions/agency-settlement.ts`)와 **완전히 동일한 오타 패턴**입니다. DEF-129 수정 범위가 해당 파일 1개로 한정되어 이 파일(`ups-actual-charges.ts`)은 그때 함께 잡히지 않고 남아있던 것으로 보입니다 — 같은 실수가 서로 다른 두 파일에 독립적으로 존재했던 것.

## 조치안 (Jaison 확정 설계)

클라이언트(`ups-actual-charges-client.tsx`)가 이미 `order.dest_country_code`(타입 정의 16행, JSX 104행)라는 필드명으로 소비하고 있으므로, **서버 응답의 외부 계약(필드명)은 유지**하고 실제 select 대상 컬럼만 고치는 PostgREST 별칭(alias) 방식을 사용합니다 — 클라이언트 코드 변경 불필요:

```ts
// 변경 전 (2곳 동일)
.select(`
  id,
  order_no,
  status,
  transport_mode,
  shipper_id,
  dest_country_code,
  created_at,
  tracking_config:zen_tracking_configs(tracking_no)
`)

// 변경 후
.select(`
  id,
  order_no,
  status,
  transport_mode,
  shipper_id,
  dest_country_code:recipient_country_code,
  created_at,
  tracking_config:zen_tracking_configs(tracking_no)
`)
```

DEF-129에서 지목한 재발방지 제안(mock 기반 "integration test" 네이밍이 실제 DB 미검증을 은폐할 수 있음)도 동일하게 적용 — 이번 수정은 **실제 로컬 DB 기반 검증**을 반드시 포함할 것.

## 관련 Task
- `TASK-B-224` (배정)

## 관련 파일
- `src/app/actions/finance/ups-actual-charges.ts` (`searchDeliveredUpsOrders()`, 약 297~375행)
