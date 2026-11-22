# [TASK-B-369] 오더정산 화면 S1·S2·메뉴 (Issue #1425 / TASK-B-369, 에픽 #1364)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-369 / [#1425](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1425) |
| **팀 / 작성일** | Team B / 2026-11-22 |
| **대상 모듈 (231 연동)** | `src/components/finance/order-settlement/*`, `src/app/[locale]/(dashboard)/finance/order-settlement/*`, `src/components/layout/NaviSidebar.tsx`, `src/components/finance/statements/StatementCreate.tsx` |
| **검증 차원 (231 D1~D9)** | D1, D3, D9 |

**2026-11-22, Dave** — 청구서관리 ①-4(WBS 2.6, 설계 `An_17` §6-1~§6-3·§6-5c). 서버 액션(`getOrdersForCostSettlement`·`previewUpsActualCost`·`recordUpsActualCost`·`markOrderCostSettled`·`unmarkOrderCostSettled`)은 B-365·B-366·B-367로 병합된 것을 **호출만** 하며, 서버 액션·DB·마이그레이션 변경은 없다. S1 목록(기간/상태/검색·미정산 배지·레거시 표시), S2 상세(시스템 vs UPS 청구서값 입력·300ms 디바운스 미리보기·임시저장·정산 완료/되돌리기 확인 모달), Admin 메뉴, #1367 임시 문구→S1 링크 교체를 추가했다. 신규 `OrderSettlement` 네임스페이스 80키 × 4로케일.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-369-01 | S1 행·미정산 배지·레거시 배지·행 작업 링크 렌더 | 레거시 오더는 미정산 집계에서 제외, 레거시는 [보기]만 | `tests/unit/components/order-settlement/order-settlement-list.test.tsx` |
| TC-369-02 | S1 조회 필터 전달 | `{status, from, to, q}` 정확 전달, 응답으로 목록 교체 | 동일 |
| TC-369-03 | S1 기간 역전 | 서버 미호출 + 로컬 오류 표시 | 동일 |
| TC-369-04 | S1 조회 실패 | 오류 표시 + 기존 행 유지(빈 목록 성공 위장 금지) | 동일 |
| TC-369-05 | S2 기존 저장값/시스템 값 프리필 | 청구서번호·HKD 원가·실측 중량, 시스템 청구/부피중량 표시 | `tests/unit/components/order-settlement/order-settlement-detail.test.tsx` |
| TC-369-06 | S2 미리보기 디바운스 | 변경 후 300ms 뒤 `previewUpsActualCost` 호출, 서버 `totalCostKrw` 표시 | 동일 |
| TC-369-07 | S2 임시저장 토스트 합계 | 서버 응답 `totalCostKrw` 사용(클라이언트 합계 금지), `router.refresh` | 동일 |
| TC-369-08 | S2 정산 완료 확인 모달 | 확인 전 액션 미호출, 확인 후 `markOrderCostSettled`·상태 갱신 | 동일 |
| TC-369-09 | S2 정산 완료 상태 | 입력·임시저장 비활성, 되돌리기 액션 호출·상태 복귀 | 동일 |
| TC-369-10 | S2 레거시 인보이스 | [정산 완료] 비활성 + 안내 | 동일 |
| TC-369-11 | S2 되돌리기 실패 | 서버 오류 문구를 모달에 그대로 표시, 모달 유지 | 동일 |
| TC-369-12 | S2 입력 없음 | 저장 미호출 + 입력 안내 | 동일 |
| TC-369-13 | Admin 메뉴 | `/ko/finance/order-settlement` 링크 렌더 | `tests/unit/components/order-settlement/navi-sidebar.test.tsx` |
| TC-369-14 | 대리점 메뉴 | 오더정산 링크 없음 | 동일 |
| TC-369-15 | #1367 문구 교체 | Admin 안내에서 S1 링크 렌더(href `/ko/finance/order-settlement`), 대리점 링크 없음 | `tests/unit/components/statements/statement-create.test.tsx` (TC-361-09 갱신) |
| TC-369-16 | R-10 실구동 (수동, **CI 미실행**) | Admin 실제 로그인 → S1 `page.goto` → S2 저장 → 정산 완료 → 되돌리기 | `tests/e2e/e2e-27-order-settlement-ui.spec.ts` |
| TC-369-17 | S2 저장 후 입력 변경 | [정산 완료] 비활성 + "먼저 저장" 안내 렌더 | `tests/unit/components/order-settlement/order-settlement-detail.test.tsx` |
| TC-369-18 | S2 변경 사항 임시저장 | 성공 후 [정산 완료] 재활성 | 동일 |
| TC-369-19 | S2 미저장 변경 상태 클릭 | `markOrderCostSettled` 미호출·모달 미표시 | 동일 |

**되돌리기 검증 (구현 유효성 — 테스트가 실제로 실패함을 증명)**:

| RST | 되돌린 구현 | 결과 | 복구 |
| :-- | :-- | :-- | :-- |
| RST-1 | S1 기간 역전 검사 제거 | **1 failed / 3 passed** | 4/4 PASS |
| RST-2 | S1 조회 실패 시 빈 목록으로 교체 | **1 failed / 3 passed** | 4/4 PASS |
| RST-3 | S2 SETTLED 입력/저장 비활성 제거 | **1 failed / 7 passed** | 8/8 PASS |
| RST-4 | S2 저장 토스트 합계를 클라이언트 값으로 변경 | **1 failed / 7 passed** | 8/8 PASS |
| RST-5 | 레거시 오더 [정산 완료] 비활성 조건 제거 | **1 failed / 7 passed** | 8/8 PASS |
| RST-6 | #1367 Admin S1 링크 제거 | **1 failed / 8 passed** | 9/9 PASS |
| RST-7 | dirty 판정을 항상 false로 제거 | **3 failed / 8 passed** | 11/11 PASS |

**회귀 검증**: `npm run test:regression` → **290파일 / 2,220케이스 전부 PASS (exit 0)**. `npm run build` → **성공 (exit 0)**. 신규 Vitest 17건 + 갱신 1건 + E2E 1건(수동).
**R-10 실구동**: Playwright E2E-27 1/1 PASS (23.3s) — 스크린샷 `docs/99_Manual/E2E_27_Result/S1-목록.png`·`S2-임시저장.png`·`S2-정산완료.png`·`S2-되돌리기.png`.
**발견 이슈**: S2 기타부가운임 다중행·항목별 KRW 분해 → **IMP 제안 #1431**, 스냅샷 없는 오더 시스템 값 fallback → **#1432**, `ADMIN_ROLES` 공용 상수 → **#1433**, UPS 청구서 PDF 첨부(선택) → **#1434**. R-15에 따라 `scratch/post_launch_improvements.md` 직접 수정은 되돌림.
