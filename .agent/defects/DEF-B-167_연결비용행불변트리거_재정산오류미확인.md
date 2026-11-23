# DEF-B-167: 인보이스 연결 비용 행 불변 트리거 + 재정산 오류 미확인 → ADJ 행 분절·실비 재등록 실패

| 항목 | 내용 |
|:--|:--|
| **긴급도** | High (금전·감사) |
| **발견일/발견자** | 2026-11-23 / Dave (TASK-B-381 설계 실측 중) |
| **관련** | Issue #1459, TASK-B-381, TASK-B-377(#1451), DEF-B-166, Task #1463(MANAGER 정책) |

## 현상

`zen_order_costs`에 아래 트리거가 있다(실DB 확인).

```sql
BEFORE DELETE OR UPDATE ON public.zen_order_costs
  IF OLD.invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify order costs after invoice has been issued (invoice_id: %)', OLD.invoice_id;
  END IF;
```

- 인보이스에 연결된 비용 행은 **UPDATE·DELETE 불가**(INSERT는 허용).

### (a) `recordUpsActualCost` — 삭제 오류 무시 + ADJ 행 분절

- 재정산 시 `UPS_ACTUAL_COST_ADJ`를 삭제한 뒤 델타를 재생성한다(`ups-actual-cost.ts:400~421`).
- 연결된 ADJ 행이 있으면 DELETE가 트리거에 막히지만 **반환 오류를 확인하지 않아 무시**된다.
- 실측:
  - 같은 입력 2회: 2회차 델타 0 → 삭제 실패(무시) + 신규 미생성 → 총액 220 유지(외형상 문제 없음).
  - 목표 변경(220 → 250): 삭제 실패(무시) 후 델타 30을 추가 삽입 → ADJ 행이 `140 + 30`으로 **분절**. 총액 250(수치상 정상).
- 총액이 수치상 맞는 이유는 "이전 총액 + 델타"를 다시 총액으로 쓰기 때문이다. **인보이스 총액에 부가운임·기타 조정이 포함되면 다음 델타가 그 금액을 상쇄해 총액에서 사라질 수 있다**(TASK-B-381 설계에서 확인한 위험).

### (b) `recordUpsActualCharges` — 2회차 실패

- 기존 `UPS_ACTUAL_ADJUSTMENT` 행이 인보이스에 연결된 뒤 다시 호출하면 UPDATE를 시도한다(`ups-actual-charges.ts:170~200`).
- 트리거에 막혀 **`ADJUSTMENT_UPDATE` 오류로 실패**한다(실측). 사용자에게는 일반 오류 문구로 보인다.

## 영향

- 재정산을 반복하면 ADJ 행이 분절·누적되어 감사·표시가 왜곡된다(총액은 우연히 맞을 수 있음).
- 인보이스 총액에 다른 조정이 섞이면 **금액이 유실**될 수 있다.
- 실비 재등록이 실패하는데 원인(불변 트리거)이 사용자·로그에 명확히 드러나지 않는다.
- 정산 해제 후 재마감에서도 기존 연결 행을 정리할 수 없다.

## 권장 조치 (별도 Task, 이번 Task에서는 수정 금지)

1. `recordUpsActualCost`의 DELETE/INSERT/UPDATE **오류를 모두 확인**하고, 실패 시 `success:false` 반환.
2. 삭제·재생성 대신 **append-only 델타**(기준선에서 ADJ·부가운임 제외)로 전환.
3. 전환 전 임시로는 "이미 연결된 ADJ가 있으면 재정산 불가(마감 취소 안내)"처럼 **명시적 차단**.
4. 실DB 테스트: 같은 입력 2회, 목표 변경 2회, 실비 2회 등록, 각 단계 행 수·총액 검증.

## 참고

- TASK-B-381 설계 의견은 이 제약을 전제로 **RPC 1회 트랜잭션 + append-only 델타**를 제안한다(`.agent/tasks/TASK-B-381_261123_Issue1459_SettlementChargeDesign.md` §1-6·§1-7·§2-2(3)).
- 로컬 DB의 기존 `UPS_ACTUAL_ADJUSTMENT`/`UPS_ACTUAL_COST_ADJ` 행은 0건(2026-11-23). 운영 데이터는 미조회.
