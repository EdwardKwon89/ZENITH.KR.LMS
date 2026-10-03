# TASK-1147: Issue #1222 — /admin/error-logs Control 컬럼 잘림 수정 (DEF-140)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1222](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1222) |
| **DEF** | [DEF-140](.agent/defects/DEF-140_에러로그화면_Control컬럼_잘림.md) |
| **담당** | B_Kai (Team A — TASK-1138/1140 소관) |
| **생성일** | 2026-10-03 |
| **우선순위** | P2 (defect) |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1147-error-logs-layout` (origin/develop 기준) |

> GitNexus impact `ZenDataGrid` LOW 확인 후 수정. 작업 시작 2026-10-03 16:03:32 KST (#1221과 연속 작업).

## 수정 (레이아웃만 — 데이터·쿼리 변경 없음)

- `admin/error-logs/page.tsx`: 루트 `p-6 md:p-10` 제거 → `space-y-8` 유지
  (orders 등 타 화면과 좌측 정렬 일치, 40px 이중 패딩 해소).
- `ErrorLogsTable.tsx`: Error Message `max-w-[400px]` → `max-w-[300px]`,
  Control 컬럼 `meta: {nowrap:true}` + 셀 `whitespace-nowrap`.
- `ZenDataGrid.tsx` (공용): th `whitespace-nowrap` (전역·안전),
  `meta.nowrap` 옵트인 td 보호 (미지정 컬럼 동작 불변 — 타 화면 영향 없음).

## 착수 체크리스트

- [x] 브랜치 생성 + `gh issue edit 1222 --add-label status:in-progress`
- [x] GitNexus impact (LOW) + DEF-140·실측 일치 확인
- [x] ① 패딩 제거 / ② 폭 축소 / ③ 그리드 보호 구현
- [x] 회귀 테스트 신설 (5건 — DOM behavioral)
- [x] R-10 해상도별(1280/1440/1920) before·after (admin 실로그인, 샘플 3행)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1222 원문 대비)

- [x] 루트 `p-6 md:p-10` 제거
- [x] Error Message `max-w` 축소 (400→300px)
- [x] 그리드 액션 컬럼 보호 (`meta.nowrap` + Control 적용)
- [x] 해상도별 재현 확인 (1280/1440/1920 — after 샷)
- [x] 회귀 테스트 + 맵 갱신
- [x] R-10 전/후 비교 스크린샷 6종

## [작업 결과]

- 코드 커밋: `0f24161526787a843fedae868375985b97915b1a`
- `npm run build`: PASS (EXIT=0, Next.js 16.2.4 Turbopack)
- `npm run test:regression`: Test Files 220 passed (220), Tests 1534 passed (1534)
  (본 브랜치 기준 develop에는 PR #1223 미포함 — TASK-1146 5건 합산 시 221/1539 상당)
- DoD 항목별 증거:
  - 테스트: `tests/unit/admin/error-logs-layout.test.tsx` TC-ERRLOG-01~05 5/5 PASS.
    jsdom은 overflow/clip 미지원이라 구조(패딩·폭·nowrap) 검증 + 실화면 갈음 (파일 주석 명시).
  - 실화면: before(1280) STATUS·CONTROL 잘림 vs after(1280) STATUS 표시·CONTROL 근접,
    after(1440) CONTROL·Resolve 버튼 완전 표시. 1280 최소폭에서는 테이블이
    뷰포트보다 넓어 내부 스크롤이 남음 — 정직 기재 (완전 해소는 1440+).
  - 촬영용 샘플 3행·임시 스펙은 사용 후 삭제 (DB·레포 잔류 없음).
- 병합 주의: 본 PR의 맵 추가 위치가 PR #1223(#1221)의 맵 편집과 인접 — #1223 선병합 시
  rebase 충돌 가능, Aiden 병합 시 해소 필요.

## [발견 이슈] (R-18)

- (작업 중 발견 시 기재)

## [Aiden 검토]

- **판정**: ✅ 승인
- **근거**: CI(Regression/Type Check) PASS, diff 직접 확인 — `page.tsx` 이중패딩 제거, `ErrorLogsTable.tsx` 폭 축소, `ZenDataGrid.tsx` 공용 보호(th 전역 + td `meta.nowrap` 옵트인, 타 화면 회귀 없음 확인)가 DEF-140 확정 원인과 정확히 일치. 신규 테스트 5건(TC-ERRLOG-01~05) 실동작 검증.
- 1280px 최소폭 잔여 스크롤을 숨기지 않고 정직하게 기재한 점 긍정 평가 — 추가 개선 필요 시 후속 IMP로 분리 가능(현 상태로 승인에 지장 없음).
- 병합 주의(LIVE_REGRESSION_TEST_MAP.md 인접 편집) 확인 결과 실제 삽입 위치가 달라 충돌 없이 순차 머지됨.
- PR#1224 머지 완료(develop), Issue #1222 Close 완료.
- 작업 지시: 2026-10-03 16:03 KST / 작업 완료(승인): 2026-10-03 16:45 KST
