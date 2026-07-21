# TASK-B-170: Issue #635 Task C — UPS접수(PACKED) + UPS등록취소 + 출고처리(RELEASED) + 출고취소

- **Task ID**: TASK-B-170
- **Issue**: #635 (UPS Warehouse UI Split — Phase 2)
- **Date**: 260721
- **Agent**: Baker (Big Pickle)
- **Branch**: `feature/teamb-ups-logistics-c-packed-released`
- **Base**: `TeamB_Dev` (260721 최신 기준, Dave TASK-B-168 입고취소 전이 보존)

## Rebase 이력
- PR#646(TASK-B-169) 반려 → stale 브랜치, 문서유형 값 잘못됨, vacuous test, 채번 충돌
- `git reset --hard origin/TeamB_Dev` 후 재작업
- Dave의 WAREHOUSED→REGISTERED/SCHEDULED 입고취소 전이 규칙 보존 확인
- Dave 입고취소 보존 테스트 TC-DV-T1~T4 추가

## Scope

### 상태 전이 (status-machine.ts)
- PACKED → [WAREHOUSED, RELEASED, HELD] (UPS등록취소, 출고처리, 보류)
- RELEASED → [PACKED, IN_TRANSIT, HELD] (출고취소, 택배사인수, 보류)
- OPERATOR 권한 확장: WAREHOUSED, PACKED, RELEASED, IN_TRANSIT 추가
- Dave 기존 규칙 보존: WAREHOUSED→REGISTERED/SCHEDULED, REGISTERED→WAREHOUSED, SCHEDULED→WAREHOUSED

### 신규 서버 액션 (warehouse.ts)
- `getPackedOrders()`: PACKED 상태 오더 목록 조회
- `confirmUpsRegistration(orderId)`: WAREHOUSED → PACKED (UPS 등록 확정)
- `undoUpsRegistration(orderId)`: PACKED → WAREHOUSED (UPS 등록취소)
- `undoOutbound(orderId)`: RELEASED → PACKED (출고취소, voidUpsLabel 재사용)

### 신규 페이지
- `/warehouse/ups-receive`: UPS 접수 페이지 (WAREHOUSED → PACKED)
  - `page.tsx`: 페이지 레이아웃
  - `UpsReceiveProcessForm.tsx`: UPS 접수 폼

### 기존 화면 확장
- `OutboundProcessForm.tsx`:
  - PACKED + WAREHOUSED 오더 동시 조회
  - 문서유형 팝업 (WAYBILL/INVOICE/CUSTOMS) — PACKED 오더 출고 시
  - 출고취소 버튼 (RELEASED → PACKED)

### UI
- NaviSidebar: "UPS접수" 메뉴 추가
- i18n: ko/en/ja/zh WarehouseUpsReceiving 블록 + Navigation 키 + doc_type/undo_outbound 키

## Files Modified
- `src/lib/logistics/status-machine.ts` — PACKED/RELEASED 전이 + OPERATOR 권한
- `src/app/actions/operations/warehouse.ts` — 4개 신규 서버 액션
- `src/app/actions/warehouse.ts` — barrel export
- `src/app/actions/operations/index.ts` — barrel export
- `src/components/warehouse/OutboundProcessForm.tsx` — PACKED + 문서유형 팝업 + 출고취소
- `src/components/layout/NaviSidebar.tsx` — UPS접수 메뉴
- `messages/{ko,en,ja,zh}.json` — i18n

## Files Created
- `src/app/[locale]/(dashboard)/warehouse/ups-receive/page.tsx`
- `src/components/warehouse/UpsReceiveProcessForm.tsx`
- `tests/unit/warehouse/warehouse-actions.test.ts`

## Tests
- `tests/unit/logistics/status-machine.test.ts`: +12건 (PACKED 4건 + RELEASED 4건 + Dave 보존 4건) → 34건
- `tests/unit/warehouse/warehouse-actions.test.ts`: 5건 (confirmOutbound guard + confirmUpsRegistration + undoUpsRegistration 실제 동작 검증)
- **회귀: 19 files, 206 tests ALL PASS**

## 재검증 (260721 Mike 대행)
- 브랜치: TeamB_Dev 최신 기준 (`MERGEABLE` 확인)
- 문서유형 팝업: WAYBILL/INVOICE/CUSTOMS 3종 정상 (`OutboundProcessForm.tsx:738`)
- 테스트: 5/5 PASS, 회귀 672/672 PASS
- 빌드: ✅ PASS
- 3건 `server-only` 테스트 실패는 기존 이슈 (Baker 변경 무관)
- **추가 수정 불필요 — 검토 요청**
