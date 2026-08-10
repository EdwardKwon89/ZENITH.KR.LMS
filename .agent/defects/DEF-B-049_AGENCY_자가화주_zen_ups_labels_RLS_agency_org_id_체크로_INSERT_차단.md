# DEF-B-049 (Critical) — AGENCY 자가화주 UPS 오더 등록 시 SHXK 성공 후 라벨 저장 RLS 차단(실사용 실패 발생)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — "shxk ups api 호출이 실패했어" 보고. MASTER AIR(AGENCY) 계정으로 실제 UPS 오더(`ZEN-2026-000008`) 등록 시도 |
| **긴급도** | Critical — SHXK 실제 API는 성공(주문 생성·운송장번호 발급)하지만 이후 우리 시스템의 라벨 저장이 RLS로 차단되어 사용자에게는 "실패"로 표시됨. **실제로는 SHXK 서버에 진짜 오더가 생성**되는 상태로 방치될 위험 |
| **현재 상태** | 원인 확정, 유출된 SHXK 오더는 Jaison이 `removeorder`로 즉시 정리 완료(정상적으로 재현/조사 목적이 아닌 실사용자의 실제 등록 시도였음) |

## 근본 원인 (확정)

`zen_shxk_api_logs` 조회 결과, `ZEN-2026-000008`의 `createorder` 호출은 **성공**(`success:true`, SHXK `order_id: 761342`, `tracking_number: 1ZJ443D30403394565`, `"订单创建成功"`). 그런데 `zen_ups_labels`에는 해당 오더의 라벨 레코드가 **전혀 저장되지 않음**(`registerUpsOrder()`가 `placeShxkOrder()` 성공 후 호출하는 `saveInitialLabel()`의 INSERT가 실패).

직접 재현 확인(MASTER AIR 계정으로 실제 로그인 후 동일 INSERT 시도):
```
error: {"code":"42501", "message":"new row violates row-level security policy for table \"zen_ups_labels\""}
```

`zen_ups_labels` 테이블의 AGENCY 관련 RLS 정책 4개(SELECT/INSERT/UPDATE/DELETE) 전부 동일 패턴:
```sql
EXISTS (
  SELECT 1 FROM zen_orders
  WHERE zen_orders.id = zen_ups_labels.order_id
    AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
)
```

**`ZEN-2026-000008`은 MASTER AIR가 자기 자신을 화주로 등록한 자가화주 오더**(`shipper_id` = MASTER AIR 본인 org_id) — 이 경우 `zen_orders.agency_org_id`는 `NULL`이다(자가화주는 `agency_org_id`를 채우지 않는 기존 설계, DEF-B-046과 동일 데이터 패턴). `NULL = 'MASTER AIR org_id'` → `NULL`(거짓) → RLS가 INSERT를 차단.

**DEF-B-046(TASK-B-274)과 동일 근본 원인 계열**이나 발현 위치가 다름:
- DEF-B-046: 앱 레벨 쿼리(`getAgencyShipperIds()`, `warehouse.ts`)가 하위 화주만 반환 → 조회/액션 화면 차단
- DEF-B-049(본 건): **DB RLS 정책 자체**가 `agency_org_id`만 체크 → SHXK API 호출까지는 성공하고 그 **직후 DB 저장 단계에서** 차단. 사용자 입장에서는 "API 호출 실패"로 보이지만 실제로는 SHXK 쪽에 진짜 오더가 생성된 상태로 남는 것이 더 위험함(정산/추적 불일치, 중복 등록 위험).

TASK-B-274 완료 시 `scratch/post_launch_improvements.md`에 IMP-162로 "동일 `zen_agency_shippers`/자가화주 패턴이 12개 파일에 더 있을 수 있음"으로 이미 경고해둔 항목 중 하나가 실제 프로덕션 유사 실패로 확인된 사례.

## 영향 범위

`zen_ups_labels` RLS 정책 4개(SELECT/INSERT/UPDATE/DELETE) 전부 자가화주 AGENCY를 차단:
- **INSERT** — `registerUpsOrder()`(오더 등록 시 라벨 최초 저장) 전면 차단 → 자가화주 AGENCY는 UPS 오더를 **등록조차 완료할 수 없음**(SHXK 측엔 orphan 오더만 계속 쌓임)
- **SELECT** — 자가화주 오더의 라벨 정보를 AGENCY 본인이 조회 불가
- **UPDATE/DELETE** — 라벨 갱신·취소도 차단

## 수정 방향 (제안, 확정 아님 — Baker 배정 후 논의)

DEF-B-046과 동일한 해법 방향: RLS 정책의 `agency_org_id` 단일 조건에 자가화주 케이스(`zen_orders.shipper_id = 본인 org_id`)를 OR로 추가.
```sql
AND (
  zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  OR zen_orders.shipper_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
)
```
4개 정책(SELECT/INSERT/UPDATE/DELETE) 전부 동일 패턴으로 수정 필요. 마이그레이션으로 `DROP POLICY` + `CREATE POLICY` 재생성.

## 참고 — 별도 발견(이번 Task 범위 아님, 즉시 보고)

DB 조회 중 `_profiles_grade_backup_20260521`, `zen_customs_history`, `zen_invoice_history`, `zen_master_order_history`, `zen_ups_shxk_country_map` 5개 테이블이 **RLS 자체가 비활성화** 상태임을 발견(도구 어드바이저리 자동 감지). anon/authenticated 키로 전체 노출 가능성 — 별도 확인 필요. 자동 수정 SQL은 정책 없이 RLS만 켜면 전체 접근이 막히므로 임의 적용하지 않았음. JSJung 확인 후 정책 설계와 함께 별도 조치 권장.
