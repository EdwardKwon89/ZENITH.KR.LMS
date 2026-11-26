# [TASK-B-381 PR-2] UPS 정산마감 서버 액션 (Issue #1459)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-381 PR-2 / [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) |
| **팀 / 작성일** | Team B / 2026-11-26 |
| **대상 모듈 (231 연동)** | `src/app/actions/finance/ups-settlement.ts`, `src/lib/ups/settlement/{types,build}.ts`, `src/app/actions/finance/index.ts` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-26, Dave** — UPS 정산마감(`previewUpsSettlement`·`saveUpsSettlementDraft`·`finalizeUpsSettlement`) 서버 액션을 추가했습니다. 원가는 출고확정일 환율로 계산하고, 정산마감은 `finalize_ups_settlement_run` RPC 1회로 run+amounts+charges+오더 `SETTLED`를 원자 처리합니다. **기존 액션·화면은 이 PR에서 제거하지 않습니다**(PR-4).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-381A-01 | 미리보기 — DB 쓰기 없이 2 tier 금액·부가항목 payload | `success`, amounts 2·charges 2, run 0·원가 0 | `tests/integration/task-b381-ups-settlement-actions.test.ts` |
| TC-381A-02 | 임시저장 — 원가만 저장 | 원가 1·부가항목 1, run 0, 상태 `NOT_SETTLED` | 동일 |
| TC-381A-03 | 정산마감 — run 양 tier·charges·오더 `SETTLED` | version 1, amounts 2·charges 2, `zen_order_costs`/`UPS_ACTUAL_COST_ADJ` 불변, **미리보기 금액 = run 금액 = `billing_items_amounts` 값** | 동일 |
| TC-381A-04 | 멱등 — 같은 입력 재호출 | `success`, 동일 version, run 1행 | 동일 |
| TC-381A-05 | SETTLED 잠금 — 다른 부가항목 재정산 | `success:false`(`already_settled`), run 1행 유지, 원가 합계 불변 | 동일 |
| TC-381A-06 | 인보이스 방어 — 비취소 인보이스 존재 | `success:false`(`ups_invoice_exists`), run 0 | 동일 |
| TC-381A-07 | 비관리자 거부 — SHIPPER | `success:false`(`permission_denied`) | 동일 |
| TC-381A-08 | 환율 실패 — 유효 환율 없는 통화 | `success:false`(`currency_conversion_failed`), run 0·원가 0 | 동일 |
| TC-381A-09 | 오더 가드 — 비UPS 오더 | `success:false`(`not_ups_order`) | 동일 |
| TC-381A-10 | 도착국 미확인 — estimate 불가 | `success:false`(`ups_estimate_unavailable`) | 동일 |
| TC-381A-11 | 금액 값 고정 fixture — 구성요소·음수 조정·2자리 반올림·agency 0 폴백 | 두 tier 7개 금액과 부가항목 값 일치 | `tests/unit/ups/settlement-build.test.ts` |

**자기완결형**: `beforeAll`에서 조직·GoTrue 계정(런타임 난수 비밀번호)·오더·스냅샷을 만들고 `afterAll`에서 정리합니다. 게이트/전용 환경변수 없이 CI에서 실행됩니다. **통합 10/10 · 단위 8/8 PASS**(로컬 실DB). 거부 사유는 `trError`를 키 반환으로 mock해 **오류 키로 단언**합니다.

**금액 불변식**: `freight_adjustment = target − (base+fuel+surge+other)`, `settlement_charges_total` = 항목별 2자리 반올림 합, `line_total` = 4개 합 + 조정 + 부가항목 합. 같은 부가항목을 양 tier에 적용하며 RPC가 동일 불변식을 재검증합니다. 단위 테스트는 고정 스냅샷·estimate·환율(3자리 소수)로 **7개 금액을 값으로** 단언하고, 대리점 `agencyCostPrice <= 0` 폴백과 음수 조정을 고정합니다.

**회귀**: `npm run test:regression` — **309 files passed · 1 skipped / 2,376 passed · 16 skipped**(skip은 B-373 세션 테스트), `npm run build` SUCCESS. Ds-11 `§11.20`·`§4.4` 갱신.
