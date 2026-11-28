# TASK-B-369 — Issue #1425: 청구서관리 ①-4 오더정산 화면 — S1 목록·S2 상세·메뉴

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1425](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1425) (에픽 #1364 / WBS 2.6 / 설계 `An_17` §6-1~§6-3·§6-5c) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-22 |
| **우선순위** | P2 (`priority:p2`, `type:feat`) |
| **상태** | 🔔 리뷰 대기 (`status:review`) |
| **브랜치** | `feature/teamb-task-b369-iss1425-order-settlement-ui` (base `origin/TeamB_Dev` 9763eecf0) |
| **채번 확인** | `find .agent/tasks -name "TASK-B-369*"` → 0건, `git ls-tree origin/TeamB_Dev` → 없음, 이슈 검색 → 본 이슈 1건. `next-task-number.sh B`는 이슈 제목 자체의 `TASK-B-369`를 최대값으로 읽어 370을 출력하는 자기참조 오탐이므로, 이슈가 못박은 **B-369**를 사용(기존 사용 이력 없음) |
| **선행 확인** | B-367(`unmarkOrderCostSettled`)·B-361(#1367 청구서 화면) 병합 확인. #1356(DEF-150)은 OPEN이나 `ups-actual-cost.ts` 서버 액션을 **수정하지 않고 import만** 하므로 충돌 없음 |

## 1. 구현 내용

| # | 파일 | 변경 |
|:--|:--|:--|
| 1 | `src/app/[locale]/(dashboard)/finance/order-settlement/page.tsx` (신규) | Admin 역할 서버 가드 + `getOrdersForCostSettlement` 초기 조회(이번 달 KST) |
| 2 | `src/app/[locale]/(dashboard)/finance/order-settlement/[orderId]/page.tsx` (신규) | Admin 가드 + 오더·조직명·DELIVERED 이력·출고확정일·HKD→KRW 환율·기존 원가·레거시 인보이스·요율 스냅샷 시스템 값 조회 |
| 3 | `src/components/finance/order-settlement/OrderSettlementList.tsx` (신규) | S1 기간/정산상태/오더번호 필터·미정산 배지·레거시 배지·행 [정산]/[보기] |
| 4 | `src/components/finance/order-settlement/OrderSettlementDetail.tsx` (신규) | S2 시스템 vs UPS 청구서값 입력, 300ms 디바운스 미리보기, 임시저장·정산 완료(확인 모달)·되돌리기(확인 모달), SETTLED 입력 잠금, 레거시/ KRW 저장 안내. **미저장 변경(dirty) 시 [정산 완료] 비활성 + 안내**(Jaison 리뷰 반영) |
| 5 | `src/components/finance/order-settlement/types.ts` (신규) | DTO·KRW/소수 포맷·KST 날짜·입력 파서 |
| 6 | `src/components/finance/order-settlement/index.ts` (신규) | 배럴 |
| 7 | `src/components/layout/NaviSidebar.tsx` | "정산/재무" 그룹 "수입 현황·비용 현황" 다음에 "오더정산" 링크 |
| 8 | `src/components/finance/statements/StatementCreate.tsx` | Admin 미정산 안내에 S1 링크 추가(대리점 문구 유지) |
| 9 | `messages/{ko,en,zh,ja}.json` | `OrderSettlement` 80키 × 4로케일 + `Navigation.order_settlement_nav` + `Statements.goOrderSettlement`·`excludedUnsettledAdmin` 갱신 |
| 10 | `tests/unit/components/order-settlement/*.test.tsx` (신규 3파일) | 목록 4 + 상세 8 + 메뉴 2 = **14 tests** (실제 컴포넌트 import·렌더) |
| 11 | `tests/unit/components/statements/statement-create.test.tsx` | TC-361-09를 S1 링크 단언으로 갱신 |
| 12 | `tests/e2e/e2e-27-order-settlement-ui.spec.ts` (신규) | R-10 실구동 — Admin 로그인 → S1 → S2 저장/정산/되돌리기 |
| 13 | `docs/99_Manual/E2E_27_Result/S1-목록.png` 외 3장 | R-10 스크린샷 증적 |
| 14 | `docs/08_Self_Audit/Checklists/regression-items/TASK-B-369_Issue1425_order-settlement-ui.md` | R-09 회귀 항목 1파일 |

**서버 액션·DB·마이그레이션 변경 없음.**

## 2. 테스트 (DoD)

| TC | 내용 | 결과 |
|:--|:--|:--|
| TC-369-01 | S1 행·미정산 배지·레거시 배지·행 작업 링크 | PASS |
| TC-369-02 | S1 필터 전달·결과 교체 | PASS |
| TC-369-03 | S1 기간 역전 → 서버 미호출·오류 | PASS |
| TC-369-04 | S1 조회 실패 → 오류 + 기존 행 유지 | PASS |
| TC-369-05 | S2 기존 저장값/시스템 값 프리필 | PASS |
| TC-369-06 | S2 300ms 디바운스·서버 합계 표시 | PASS |
| TC-369-07 | S2 저장 토스트 = 서버 `totalCostKrw` | PASS |
| TC-369-08 | S2 정산 완료 확인 모달·확인 후 호출 | PASS |
| TC-369-09 | S2 SETTLED 입력/저장 잠금·되돌리기 | PASS |
| TC-369-10 | S2 레거시 → [정산 완료] 비활성 | PASS |
| TC-369-11 | S2 되돌리기 실패 문구 표시 | PASS |
| TC-369-12 | S2 입력 없음 → 저장 미호출 | PASS |
| TC-369-13 | Admin 메뉴 링크 렌더 | PASS |
| TC-369-14 | 대리점 메뉴 링크 없음 | PASS |
| TC-369-15 | #1367 Admin 안내 S1 링크(TC-361-09 갱신) | PASS |
| TC-369-16 | R-10 실구동 (`page.goto`·정산/되돌리기) | **PASS (23.3s)** |
| TC-369-17 | S2 저장 후 입력 변경 → [정산 완료] 비활성 + 안내 | PASS |
| TC-369-18 | 변경 사항 임시저장 → [정산 완료] 재활성 | PASS |
| TC-369-19 | 미저장 변경 상태에서 클릭 → `markOrderCostSettled` 미호출 | PASS |

**되돌리기 검증 (실측)**:

| RST | 되돌린 구현 | 결과 | 복구 |
|:--|:--|:--|:--|
| RST-1 | S1 기간 역전 검사 제거 | **1 failed / 3 passed** (TC-369-03) | 4/4 PASS |
| RST-2 | S1 조회 실패 시 빈 목록으로 교체 | **1 failed / 3 passed** (TC-369-04) | 4/4 PASS |
| RST-3 | S2 SETTLED 입력/저장 비활성 제거 | **1 failed / 7 passed** (TC-369-09) | 8/8 PASS |
| RST-4 | 저장 토스트 합계를 클라이언트 값으로 변경 | **1 failed / 7 passed** (TC-369-07) | 8/8 PASS |
| RST-5 | 레거시 [정산 완료] 비활성 조건 제거 | **1 failed / 7 passed** (TC-369-10) | 8/8 PASS |
| RST-6 | #1367 Admin S1 링크 제거 | **1 failed / 8 passed** (TC-361-09) | 9/9 PASS |
| RST-7 | dirty 판정을 항상 false로 제거 | **3 failed / 8 passed** (TC-369-17~19) | 11/11 PASS |

## 3. 검증 (DoD)

- [x] R-10 실구동 — Playwright E2E-27 **1/1 PASS (23.3s)**: Admin 실제 로그인 → `/ko/finance/order-settlement` → S2 저장 → 정산 완료 → 되돌리기. 스크린샷 4장.
- [x] 컴포넌트 테스트 17건 — 실제 `OrderSettlementList`·`OrderSettlementDetail`·`NaviSidebar` import·렌더. `readFileSync`/source 문자열/`test.skip` **0건**
- [x] 되돌리기 검증 7종 — 위 표 실측값
- [x] `npm run test:regression` → **290 files / 2,220 tests 전부 PASS (exit 0)**
- [x] `npm run build` → **EXIT=0**
- [x] i18n `OrderSettlement` 81키 × 4로케일 키 세트 동일(차집합 0)
- [x] `node scripts/check-ds11-sync.mjs` → 허용 목록 밖 신규 미반영 0 (신규 서버 액션 없음)
- [x] `npm run check:lrtm` → 유령 경로 0·E2E 표기 누락 0
- [x] 로컬 `zen_error_logs` 최근 1일 `severity=ERROR` 신규 **0건**
- [x] `git status`/`git diff --stat` — 변경 파일이 이 Task 범위(화면·메뉴·문구·테스트·문서) 내
- [x] task file이 코드 커밋 이전에 생성됨

## 4. [발견 이슈]

1. **[범위 제약] S2 기타부가운임 다중행·항목별 KRW 분해 미구현** — 현 `recordUpsActualCost`는 단일 `otherChargesHkd`만 받고 `previewUpsActualCost`는 총액만 반환한다. 설계 §6-3의 `[+행추가]`·항목별 KRW 분해는 서버 액션 계약 변경이 필요해 이번 범위에서 제외. **IMP 제안 [#1431](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1431)**.
2. **[범위 제약] 시스템 등록값이 요율 스냅샷에만 의존** — `zen_order_rate_snapshots.metadata.platform`이 없는 과거 오더는 청구/부피중량이 `—`로 표시된다. 패키지·volumetric divisor 기반 fallback은 **IMP 제안 [#1432](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1432)**.
3. **[권고 반영] 관리자 역할 상수 중복** — S1·S2 페이지와 서버 액션의 `ADMIN_ROLES` 하드코딩을 공용 모듈로 분리하는 **IMP 제안 [#1433](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1433)** 등록.
4. **[선택 범위 미구현] UPS 청구서 PDF 첨부** — 이슈에서 "선택"으로 표기. **IMP 제안 [#1434](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1434)** 등록.
5. **[R-15] `scratch/post_launch_improvements.md` 직접 수정 되돌림** — IMP 번호는 Aiden 전속이므로 이 PR에서 추가한 22줄을 전부 되돌리고(`9e1617654`), 내용은 `[IMP 제안]` Issue #1431~#1434로 등록했다.
6. **[환경] worktree `node_modules` 노후로 `exceljs` 누락** — 최초 빌드/회귀에서 B-360 Excel 라우트가 module-not-found로 실패. `npm install` 후 정상(코드 문제 아님).
7. **[환경] 로컬 HKD→KRW 환율 행 없음** — S2는 `getExchangeRate` 폴백값을 표시하며, 저장·미리보기 금액은 서버 계산을 그대로 신뢰한다.
8. **[참고] #1356 OPEN** — 동일 파일(`ups-actual-cost.ts`)의 권한 가드 작업이 미병합이나, 본 Task는 서버 액션을 import만 하므로 병합 순서 충돌 없음.

## 5. [작업 결과]

- 리뷰 반영 커밋: `e09d19439` (dirty 가드·배지 문구), `9e1617654` (R-15 스크래치 되돌림)
- 코드 커밋: `ac4e4e5e4` (`[Dave] feat: TASK-B-369 …` — 화면·메뉴·문구·테스트·회귀항목·E2E 증적, 22 files)
- 문서 커밋: 본 task file (docs-only)
- PR: `feature/teamb-task-b369-iss1425-order-settlement-ui` → `TeamB_Dev` (`Closes #1425`)
