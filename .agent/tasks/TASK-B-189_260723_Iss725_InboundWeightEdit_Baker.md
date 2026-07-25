# TASK-B-189: 입고 처리 시 부피중량/중량 수정 기능 추가

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-23 |
| **담당자** | Baker |
| **연결 이슈** | [#725](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/725) |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

화주가 오더 생성 시 등록한 부피중량/중량 정보가 입고 시 실측 정보로 대체 가능해야 함(SNTL 2026-07-22 회의, Issue #718). 상세는 Issue #725 참조.

## ⚠️ 착수 금지 — 설계 확정 대기 중

Team A 정산 코드(`cost-aggregator.ts`)가 `zen_order_packages.gross_weight`를 원가 계산에 사용하며, 운임 스냅샷 트리거는 오더 등록 시점에만 발동합니다. **중량 수정 시 원가 재계산을 자동 트리거할지, 수동 재확정 버튼으로 처리할지**를 Aiden/Team A와 합의하기 전까지 구현 착수 금지입니다(R-17 📝→🔍→🔄 절차).

이 설계 의견 섹션에 제안 방안을 작성하고 Aiden 확정 대기하세요. 확정되면 상태가 🔄로 전환되고 착수 가능합니다.

## 요구사항 요약 (설계 확정 후, 상세는 Issue #725 참조)

1. `InboundProcessForm.tsx`에 부피중량/중량 수정 입력 필드 추가
2. `confirmInbound()` 또는 신규 액션에 `zen_order_packages.gross_weight` 업데이트 로직 추가
3. 원가 재계산 트리거 방식은 설계 확정 결과에 따름
4. 회귀 테스트 추가

## [설계 의견]

_(담당자 작성 — 제안 방안·근거·리스크)_

(미작성)

## [설계 확정]

_(Aiden 전속 — 확정 후 상태 🔄 전환)_

**JSJung 직접 확정(2026-07-26, Team B 내부 논의)**: 원가 재계산 방식은 **자동 트리거**로 채택 — 입고 시 부피/중량 실측값 수정이 확정되면 UPS 오더에 한해 `zen_order_rate_snapshots`를 즉시 재계산·갱신하고, 변경 시 화주에게 이메일로 통보(`sendFreightChangeEmail`). 수동 재확정 버튼 방식은 채택하지 않음. `order_status_history`에 변경 전/후 값·사유를 기록해 최소한의 이력 추적을 확보. (참고: 이 확정 절차가 task file에 즉시 반영되지 않아 Jaison이 PR#844을 절차 위반으로 오판·반려했다가 JSJung 확인 후 정정함 — `.agent/VIOLATION_TRACKER.md` 2026-07-26 Baker 행 참조.)

## [작업 결과]

- `confirmInbound()`(`src/app/actions/operations/orders.ts`)에 `packageUpdates` 파라미터 추가 — 패키지별 중량/치수 UPDATE, 변경 이력 `order_status_history` 기록
- `getOrderByBarcodeOrNo()`에 `order_packages` 조회 추가
- `InboundProcessForm.tsx`에 부피/중량 실측 입력 카드 신설
- UPS 오더는 변경 시 `estimateUpsFreight()` 재사용해 `zen_order_rate_snapshots` 자동 재계산
- `sendFreightChangeEmail()` 신규(`src/lib/notifications/email.ts`) — 운임 변경 시 화주 통보
- PR: [#844](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/844) — 커밋 `17e571ca`
- PR 자체보고: 회귀 127 files/833 tests ALL PASS, 빌드 PASS → **Jaison 재확인 결과 CI 실제로는 1건 FAIL**(`shipper-invoices-agency-rls.test.ts`, `zen_agency_shippers` GRANT 누락 — PR#844 자체 결함 아닌 PR#840 기존 마이그레이션의 사전 결함, 별도 후속 조치로 처리 예정)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. `./scripts/next-task-number.sh B` 직접 재확인, 브랜치 생성 전 `git pull origin TeamB_Dev` 필수, 코드+문서 커밋 모두 포함해서 PR 생성.

## 완료 보고 절차 (R-17 준수)

설계 확정(🔍→🔄) 이후 표준 절차 — 코드 커밋 → task file `[작업 결과]`+🔔 → ACTIVE_TASK.md 반영 → 문서 커밋 → PR (`Closes #725`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
