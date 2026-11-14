# TASK-1144: Issue #1216 — 오더 목록 접수일자 + Shipper 소속/화주 병기 (IMP-170/171)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1216](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1216) |
| **IMP** | IMP-170 (접수일자 컬럼), IMP-171 (Shipper 소속/화주 병기) |
| **담당** | B_Kai (Team A — Issue 배정 기반, `src/` 공유 Zone) |
| **생성일** | 2026-10-03 |
| **우선순위** | P3 (feat) |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1144-order-list-display` (origin/develop `e0d8990ed` 기준) |

> 워크트리 노트: 전용 워크트리(`b_kai`)에서 `origin/develop` 기준 브랜치 직접 생성
> (TASK-1142/1143과 동일한 동등 조치). GitNexus impact `OrderDataTable` LOW 확인 후 수정.

## 구현 (렌더링만 — 데이터 로직 변경 없음)

- `OrderRepository.findList()`가 `*` 조회라 `created_at`·`shipper_name` 이미 포함 — 쿼리 수정 없음.
- `src/components/orders/OrderDataTable.tsx`:
  - `formatReceivedDate()` / `formatShipperCell()` 헬퍼 export (테스트 가능).
  - 접수일자 컬럼: Order No 다음, `toLocaleDateString('ko-KR')`, 비정상 시 `-`.
  - Shipper 셀: `소속/화주` 병기 — override가 소속과 다를 때만, 동일·미입력 시 중복 방지,
    소속 없고 override만 있으면 override 단독, 둘 다 없으면 `-` (Edward 확정안 그대로).
  - 빈 상태 `colSpan` 8→9.

## 착수 체크리스트

- [x] `git fetch origin` + `origin/develop` 기준 브랜치 생성
- [x] `./scripts/next-task-number.sh A` → TASK-1144 확인
- [x] `gh issue edit 1216 --add-label status:in-progress`
- [x] GitNexus impact (OrderDataTable, LOW) + 데이터 경로 확인
- [x] ① 접수일자 컬럼 / ② 소속·화주 병기 구현
- [x] 회귀 테스트 신설 (behavioral 렌더링 6건)
- [x] R-10 스크린샷 before/after
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1216 원문 대비)

- [x] 접수일자 컬럼 추가
- [x] Shipper "소속/화주" 병기 (중복 방지 포함)
- [x] 회귀 테스트 (behavioral 렌더링)
- [x] R-10 스크린샷: `docs/99_Manual/E2E_NN_Result/TASK-1144_orders_before.png` /
  `TASK-1144_orders_after.png` (shipper 계정 실로그인, `/ko/orders`)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신 (TC-ORDLIST-01~06)

## [작업 결과]

- 코드 커밋: `6023d7ab49f75b5ff77a75c7f0c4965d5d95cdc4`
- `npm run build`: PASS (EXIT=0, Next.js 16.2.4 Turbopack)
- `npm run test:regression`: Test Files 218 passed (218), Tests 1525 passed (1525)
- DoD 항목별 증거:
  - 렌더링 테스트: `tests/unit/orders/order-datatable-display.test.tsx`
    TC-ORDLIST-01~06 전량 실제 DOM 검증 — 단독 실행 `tests/unit/orders` 26파일 117 PASS에 포함.
  - after 샷에서 접수일자(`2026. 10. 1.`) 표시 확인. seed 오더에 `shipper_name` override가 없어
    Shipper 셀은 소속만 노출 — 병기 형태(`Master air/WOOWON CO.,LTD`)는 TC-ORDLIST-02로 커버.
  - 임시 스크린샷 스펙(`zz-task1144-screenshots.spec.ts`)은 사용 후 삭제, 산출물 PNG만 유지.

## [발견 이슈] (R-18)

- (작업 중 발견 시 기재)

## [Aiden 검토]

- (반려 시 사유 기재)
