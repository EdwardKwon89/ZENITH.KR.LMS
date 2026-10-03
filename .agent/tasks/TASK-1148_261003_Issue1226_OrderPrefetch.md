# TASK-1148: Issue #1226 — 오더목록 페이지전환 5초+ 지연 수정 (DEF-141)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1226](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1226) |
| **DEF** | [DEF-141](.agent/defects/DEF-141_오더목록_페이지전환_지연_Link프리페치_폭주.md) |
| **담당** | B_Kai (Team A) |
| **착수** | 2026-10-03 17:16:40 KST (Issue #1226 코멘트 기재済) |
| **우선순위** | P1 (defect, High) |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1148-order-prefetch` (origin/develop `7399acf65` 기준) |

> GitNexus impact `OrderDataTable` LOW 확인 후 수정.

## 수정 (1 prop — 데이터·쿼리 변경 없음)

- `OrderDataTable.tsx` 행별 "View Details" `<Link>`에 `prefetch={false}`.
- 페이지네이션 Link는 기본값 유지 (결정 근거: 목록 쿼리 0.1~0.6초로 가벼워
  prefetch가 1→2 전환을 오히려 빠르게 함. TC-PREF-04로 결정 고정).

## 착수 체크리스트

- [x] 브랜치 생성 + `status:in-progress` + Issue 착수 코멘트
- [x] GitNexus impact (LOW) + DEF-141 원인 확인
- [x] 상세 Link `prefetch={false}` (페이지네이션 유지 결정)
- [x] 회귀 테스트 신설 (Link prop behavioral 5건)
- [x] R-10 네트워크 실측 시도 (아래 정직 기재)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1226 원문 대비)

- [x] 상세 `<Link>`에 `prefetch={false}`
- [x] 페이지네이션 검토 (유지 결정 + TC-PREF-04)
- [x] 회귀 테스트 (TC-PREF-01~05)
- [x] R-10: 로컬 Playwright 요청 캡처 시도 — 결과: 수정 전·후 모두 상세 `_rsc`
  0건 (로컬 dev에서 동적 라우트 prefetch 미발동 — 재현 불가).
  **production 실측 재확인은 배포 후 필요** (Aiden production 캡처가 원인 확정 근거).
  임시 스펙·캡처 파일은 삭제, 과장 없음.
- [x] 맵 갱신

## [작업 결과]

- 코드 커밋: `50af787ed6e1886b9a18b88d4911dbf340888e6a`
- `npm run build`: PASS (EXIT=0, Next.js 16.2.4 Turbopack)
- `npm run test:regression`: Test Files 222 passed (222), Tests 1544 passed (1544)
- DoD 항목별 증거:
  - 테스트: `tests/unit/orders/order-prefetch.test.tsx` 5/5 PASS
    (next/link prop 캡처 스텁 — 20행 전수 차단 + href 유지).

## [발견 이슈] (R-18)

- (작업 중 발견 시 기재)

## [Aiden 검토]

- (반려 시 사유 기재)
