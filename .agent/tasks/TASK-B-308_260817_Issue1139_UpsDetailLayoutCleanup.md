# TASK-B-308: UPS 상세페이지 레이아웃 정리 — 섹션 재배치/삭제/조건부 표출

- **GitHub Issue**: [#1139](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1139)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 요청)
- **담당**: Mike
- **우선순위**: P2
- **상태**: ✅ 완료 (PR#1140 머지, 2026-08-17, 병합 커밋 `5a899a9c`)

## [배경]

JSJung 요청 — UPS 오더 상세페이지(`ups-detail/page.tsx`) 레이아웃 정리 4건:
1. "배송 기본 정보" 섹션을 "운임 및 화물 구성" 섹션 하단으로 이동 + "주문 상태" 배지 삭제
2. "UPS 사후청구 요금 및 정산 조정 (Actual Charges)" 섹션 삭제
3. "UPS 트래킹 이벤트 상세 (SHXK API)" 섹션은 오더 상태가 IN_TRANSIT("UPS 배송중")일 때만 표출
4. "UPS 무역 및 발송 서류" 섹션에서 CI/PL/UPS Invoice PDF 다운로드 버튼 삭제, `UpsTradeDocumentActions`의 "CreateOrder 테스트" 버튼도 삭제

## [설계 확정] (JSJung 승인)

### 1. 배송 기본 정보 섹션 이동 + 주문 상태 삭제

현재 페이지는 `lg:grid-cols-3`(왼쪽 `lg:col-span-2` / 오른쪽 1칸) 구조이며, "배송 기본 정보" 카드는 오른쪽 컬럼의 유일한 콘텐츠(346-391행)입니다. 이동 후 오른쪽 컬럼이 완전히 비므로, **단일 컬럼(전체 폭) 레이아웃으로 전환**합니다 — 그리드 구조(`grid grid-cols-1 lg:grid-cols-3`) 제거하고 `flex flex-col gap-6` 단일 컬럼으로 통합.

새 순서 (왼쪽 컬럼이던 콘텐츠가 전체 폭 단일 컬럼이 됨):
1. Stepper
2. 운임 및 화물 구성 (Breakdown & Packages)
3. **배송 기본 정보 (Shipper / Consignee)** ← 이동 (346-391행 전체를 여기로)
4. ~~Actual Charges~~ (2번 항목에 따라 삭제)
5. UPS 트래킹 이벤트 상세 (3번 항목에 따라 조건부)
6. Order Edit History Panel
7. UPS 무역 및 발송 서류 (4번 항목에 따라 축소)

"배송 기본 정보" 카드 내 "주문 상태" 배지 행(386-389행) 삭제.

### 2. Actual Charges 섹션 삭제

`<UpsActualAdjustmentForm .../>` 렌더(293-298행) 삭제. 이에 따라 **`canManageFinance` 계산 로직 전체(68-78행)도 데드코드가 되므로 함께 삭제** — `zen_agency_shippers` 조회 쿼리도 불필요해져 페이지 로드 시 쿼리 1건 감소(부수 효과). `isAdmin`/`isAgency`는 Stepper의 `canManuallySetDelivered` prop(271행)에 계속 쓰이므로 유지.

### 3. SHXK 트래킹 이벤트 조건부 표출

`order.status === 'IN_TRANSIT'`일 때만 섹션(301-307행) 렌더링. (`OrderStatus.IN_TRANSIT` — UPS 전용 스테퍼에서 "UPS 배송중"으로 표기되는 상태, `src/components/ups/UpsOrderStatusStepper.tsx:39` 참조)

### 4. 무역 서류 섹션 축소

- 삭제: CI 다운로드 버튼(321-325행), PL 다운로드 버튼(326-330행), UPS Invoice PDF 다운로드 버튼(331-336행)
- 유지: `<UpsTradeDocumentActions .../>`(337행) — 단, 컴포넌트 내부의 **"CreateOrder 테스트" 버튼만 삭제**(운송장/Invoice(배송물류)/세관신고서/UPS등록취소는 유지). 이 컴포넌트는 `orders/[orderId]/page.tsx`(일반 오더 상세)에서도 공용으로 쓰이므로 컴포넌트 자체에서 삭제하면 그쪽에도 동일 적용됨(의도된 정리 — "테스트" 라벨의 디버그용 버튼이라 두 화면 모두에서 제거하는 게 맞음).
- 위 3개 버튼 제거로 `ciData`/`plData`/`upsInvoiceData`/`docLabels`/`upsInvoiceLabels` 변수 및 관련 import(`CommercialInvoicePDF`, `PackingListPDF`, `UpsInvoicePDF`, `DocumentDownloadButton`)가 이 페이지에서 데드코드가 되면 함께 정리. (단, `TradeDocumentClient.tsx`나 `orders/[orderId]/page.tsx` 등 다른 파일의 동일 컴포넌트/데이터 빌더는 이번 범위 밖 — 손대지 않음)

## [작업 범위]

파일: `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`
1. 그리드 레이아웃 → 단일 컬럼 전환, "배송 기본 정보" 섹션 위치 이동(운임 및 화물 구성 하단)
2. "배송 기본 정보" 카드의 "주문 상태" 배지 삭제
3. Actual Charges 렌더 + `canManageFinance`/`zen_agency_shippers` 조회 로직 삭제
4. SHXK 트래킹 섹션에 `order.status === 'IN_TRANSIT'` 조건 추가
5. CI/PL/UPS Invoice PDF 다운로드 버튼 3개 삭제 + 관련 데드코드(ciData/plData/upsInvoiceData/docLabels/upsInvoiceLabels, 미사용 import) 정리
6. `UpsTradeDocumentActions.tsx`에서 "CreateOrder 테스트" 버튼(및 관련 핸들러가 다른 곳에 안 쓰이면 함께) 삭제

## [회귀 테스트 방향]

- 레이아웃: "배송 기본 정보"가 "운임 및 화물 구성" 다음에 렌더링되는지(DOM 순서), 주문 상태 배지가 없는지
- Actual Charges 섹션이 어떤 role/status 조합에서도 렌더링되지 않는지
- SHXK 트래킹 섹션: `status='IN_TRANSIT'`일 때만 보이고 다른 상태(REGISTERED/DELIVERED 등)에서는 안 보이는지
- 무역서류 섹션: CI/PL/UPS Invoice 버튼이 없고 UpsTradeDocumentActions만 있는지, 그 안에 CreateOrder 테스트 버튼이 없는지(이 페이지 + `orders/[orderId]/page.tsx` 양쪽 다)
- 기존 `ups-detail-b300.test.tsx`/`ups-detail-b301.test.tsx` 등 관련 스냅샷/DOM 테스트가 이번 구조 변경으로 깨지지 않는지 확인 및 필요 시 갱신

## [R-10]

ZEN-2026-000007(또는 IN_TRANSIT 상태 오더 하나 추가로) UPS 상세페이지 스크린샷 — 재배치된 레이아웃, Actual Charges 미표출, 무역서류 섹션 축소 형태 확인.

## [작업 결과]

(Mike 작성, `.agent/tasks/TASK-B-308_ups_detail_layout_cleanup.md`에 별도 생성됐던 내용을 병합·정리 — 중복 파일은 삭제)

1. ✅ 배송 기본 정보 → 운임 및 화물 구성 하단으로 이동, 단일 컬럼 레이아웃 전환(1차 반려 후 재수정)
2. ✅ 주문 상태 배지 삭제
3. ✅ Actual Charges 섹션 + `canManageFinance` 데드코드 삭제
4. ✅ SHXK 트래킹 섹션 IN_TRANSIT 조건부 렌더링
5. ✅ CI/PL/UPS Invoice PDF 버튼 삭제, `UpsTradeDocumentActions`의 "CreateOrder 테스트" 버튼 + 관련 데드코드(`createLoading`/`CREATEORDER`/`Send` import) 삭제(1차 반려 후 추가 정리)
6. ✅ 신규 테스트 4건 추가(IN_TRANSIT 양방향, Actual Charges 미표출, CI/PL/UPS Invoice 버튼 미표출)

빌드 SUCCESS, 회귀 201 test files / 1406 tests ALL PASS(신규 4건 포함).

- 커밋: `3aebbafd`(구현) → `6b53614b`(반려 사유 2건 수정)
- PR: [#1140](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1140)

## [Jaison 최종 검토]

**PR#1140 반려 (2026-08-17)** — 상세: [PR#1140 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1140#issuecomment-5308511953)

섹션 이동·삭제·조건부 표출 로직 자체는 정확함(diff로 확인). 회귀 201/201·1402/1402 PASS, 빌드 성공. 다만 2건으로 반려:

1. **[Critical]** 바깥 그리드가 여전히 `grid grid-cols-1 lg:grid-cols-3`이고 콘텐츠 div가 `lg:col-span-2`로 남아있어, 오른쪽 컬럼 div만 삭제된 결과 데스크톱(lg+)에서 화면 오른쪽 1/3이 빈 공간으로 남는 시각적 결함. 설계 문서에 명시한 단일 컬럼 전환이 반영 안 됨.
2. **[Major]** 신규 회귀 테스트 없음 — Issue에 명시적으로 재요청했는데도 기존 테스트 assertion 1줄 삭제 외 신규 테스트 0건(R-09).

Minor(비차단): `UpsTradeDocumentActions.tsx`의 `createLoading`/`'CREATEORDER'` 케이스/`Send` import 데드코드 미정리.

GitHub Issue 라벨 `status:review` → `status:rework` 갱신 완료.

---

**PR#1140 최종 승인·머지 (2026-08-17)** — 병합 커밋 `5a899a9c`

레이아웃(단일 컬럼 전환, `lg:col-span-2` 제거) + 신규 테스트 4건 정확히 반영 확인. 격리 워크트리 재검증: 회귀 201/201·1406/1406 ALL PASS(신규 4건), 빌드 성공, CI 3종 PASS. `UpsTradeDocumentActions` 데드코드까지 추가로 정리한 점 확인. 승인 후 머지, Issue #1139 close 완료.

Minor(비차단): `ups-trade-documents.test.ts`의 `not.toContain('import.*issueUpsLabel')` 어서션이 문자열 부분일치라 정규식으로 동작하지 않음(항상 참) — 실제 코드는 정상 제거되어 결과에 영향 없으나 다음 기회에 정리 권장.

R-10(UPS 상세페이지 실구동, 특히 IN_TRANSIT 오더로 SHXK 섹션 표출 확인) 스크린샷 미첨부 — JSJung 라이브 확인 필요.

## [발견 이슈]

없음
