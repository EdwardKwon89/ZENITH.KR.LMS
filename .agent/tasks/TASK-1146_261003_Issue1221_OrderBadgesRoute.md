# TASK-1146: Issue #1221 — 오더목록 배지 개행 + UPS ROUTE 폴백 (DEF-139)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1221](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1221) |
| **DEF** | [DEF-139](.agent/defects/DEF-139_오더목록_STATUS배지_개행_및_UPS오더_ROUTE공백.md) |
| **담당** | B_Kai (Team A) |
| **생성일** | 2026-10-03 |
| **우선순위** | P2 (defect) |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1146-order-badges-route` (origin/develop 기준) |

> GitNexus impact `ZenStatusBadge` LOW (직접 호출 3건) 확인 후 수정. 작업 시작 2026-10-03 16:03:32 KST.

## 수정 (렌더링만 — 데이터 로직 변경 없음)

- `ZenStatusBadge.tsx` 2개 span에 `whitespace-nowrap` (미매칭 폴백 포함).
- `OrderDataTable.tsx` BILLING 배지에 `whitespace-nowrap`, ROUTE 셀에 `whitespace-nowrap`.
- `resolveRouteCodes()` 헬퍼 export: 항구 코드 우선, 둘 다 없고 UPS면
  `pickup/recipient_country_code` 폴백, 非-UPS 무항구는 기존 동작 유지.

## 착수 체크리스트

- [x] 브랜치 생성 + `gh issue edit 1221 --add-label status:in-progress`
- [x] GitNexus impact (LOW) + DEF-139·컬럼 실측 확인
- [x] 배지 nowrap 3곳 + ROUTE 폴백 구현
- [x] 회귀 테스트 신설 (5건 — DOM behavioral + 클래스 한계 명시)
- [x] R-10 스크린샷 (실데이터 KR→PH 폴백 확인)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1221 원문 대비)

- [x] 배지 span `whitespace-nowrap` 추가
- [x] UPS ROUTE 국가 코드 폴백
- [x] 회귀 테스트 (TC-ORDLIST-07~11)
- [x] R-10: `docs/99_Manual/E2E_NN_Result/TASK-1146_orders_after.png`
  (before는 TASK-1144 after 샷과 동일 화면 — 당시는 ROUTE 공백·배지 개행 상태)
- [x] 맵 갱신

## [작업 결과]

- 코드 커밋: `5dd390a602e2d707dcddaa9245d56c3a543f9993`
- `npm run build`: PASS (EXIT=0, Next.js 16.2.4 Turbopack)
- `npm run test:regression`: Test Files 220 passed (220), Tests 1534 passed (1534)
- DoD 항목별 증거:
  - 테스트: `tests/unit/orders/order-badges-route.test.tsx` 5/5 PASS.
    jsdom은 computed style 불가라 nowrap은 클래스 존재로 검증 + R-10 실화면으로 갈음 (파일 주석 명시).
  - after 샷에서 KR→PH 폴백·배지 정상 노출 실측 확인.

## [발견 이슈] (R-18)

- (작업 중 발견 시 기재)

## [Aiden 검토]

- (반려 시 사유 기재)
