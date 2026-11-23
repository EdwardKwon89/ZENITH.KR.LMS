# DEF-B-165: 일괄 마감 `finalizeDailyShipperInvoices` — AGENCY 허용·UPS 포함 가능·success true vs DB 미변경

| 항목 | 내용 |
|:--|:--|
| **긴급도** | High (금전·권한) |
| **발견일/발견자** | 2026-11-23 / Jaison (TASK-B-377 설계 조사 중), Dave 확인 |
| **관련** | Issue #1451, #1449 A, TASK-B-376(#1442 폐기), DEF-B-166 |

## 현상

- UPS 오더 정산마감은 JSJung 확정상 **admin(ZENITH_SUPER_ADMIN·ADMIN·MANAGER) 전용**이다.
- 그러나 `finalizeDailyShipperInvoices`(`src/app/actions/finance/daily-billing.ts:434~`)는 `profile.role !== AGENCY`만 추가 허용하고, 화면 `ShipperDailyBillingClient.tsx`는 `canFinalize={!isShipperView}`로 **AGENCY에게 마감 버튼을 노출**한다.
- 일괄 마감 루프는 개별 `finalizeInvoice()` 결과가 `success:true`면 `finalizedCount`를 증가시키고 최종 `{success:true}`를 반환한다. 그런데 `zen_invoices` UPDATE 정책이 ADMIN·SUPER_ADMIN(및 Admin ALL)뿐이라 **AGENCY 세션에서는 실제 UPDATE가 0행**이고 DB는 `is_finalized=false`로 남는다.
- 이 경로의 인보이스 조회는 tier 조건만 있고 **UPS/transport_mode 조건이 없어** UPS 인보이스도 대상에 포함될 수 있다(코드 확인).

## 영향

- AGENCY가 마감 버튼을 눌러도 DB는 바뀌지 않는데 서버는 success true, 화면은 "정산 마감 완료" 토스트를 띄운다(거짓 성공).
- 규칙 1(정산마감 admin 전용)과 직접 충돌.

## 권장 조치 (별도 Task, 규칙에 따라 AGENCY 권한 확대 금지)

1. `finalizeDailyShipperInvoices`에서 AGENCY 허용 제거 → admin 3역할만.
2. 화면 `canFinalize`를 admin 역할 기준으로 계산.
3. 개별 `finalizeInvoice`가 실제 갱신 행 수/`is_finalized` 상태를 반환하도록 정비(DEF-B-166과 함께).
4. 실DB 세션 테스트: AGENCY 호출 거부, ADMIN 호출 후 `is_finalized=true`, UPS 인보이스 포함 여부 명시.
