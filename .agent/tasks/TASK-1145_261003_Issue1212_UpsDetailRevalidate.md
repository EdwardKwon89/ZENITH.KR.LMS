# TASK-1145: Issue #1212 — UPS 등록 확정 후 ups-detail 캐시 미갱신 (DEF-138)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1212](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1212) |
| **DEF** | [DEF-138](.agent/defects/DEF-138_UPS등록후_상세화면_캐시미갱신.md) |
| **담당** | B_Kai (Team A — Team B→Team A 재배정, Edward·Aiden 협의) |
| **생성일** | 2026-10-03 |
| **우선순위** | P2 (defect) |
| **상태** | 🔄 진행 중 |
| **브랜치** | `feature/teama-1145-ups-detail-revalidate` (origin/develop `30c0c8d4f` 기준) |

> 워크트리 노트: 전용 워크트리(`b_kai`)에서 `origin/develop` 기준 브랜치 직접 생성
> (기존과 동일한 동등 조치). GitNexus impact `confirmUpsRegistration` LOW
> (직접 호출 1건 `UpsReceiveProcessForm.handleConfirmRegistration`) 확인 후 수정.
> `warehouse.ts`는 Team B 주력 파일이나 Issue 코멘트 재배정 + 1줄 추가 수준이라 충돌 리스크 낮음.

## 수정 (2줄 — 캐시 갱신만, 데이터 로직 변경 없음)

- `confirmUpsRegistration()`: `revalidatePath('/(dashboard)/orders/[orderId]/ups-detail', 'page')` 추가
  (bracket 표기는 주변 4줄·tracking.ts가 아닌 warehouse.ts 기존 스타일 준수 —
  tracking.ts는 `${orderId}` 실값 보간이나 warehouse.ts 일괄이 `[orderId]` 플레이스홀더라 일관성 유지).
- `undoUpsRegistration()`: 대칭 추가.

## 착수 체크리스트

- [x] `git fetch origin` + `origin/develop` 기준 브랜치 생성
- [x] `./scripts/next-task-number.sh A` → TASK-1145 확인
- [x] `gh issue edit 1212 --add-label status:in-progress`
- [x] GitNexus impact (LOW) + DEF-138·tracking.ts 선례 확인
- [x] 양쪽 함수에 ups-detail revalidate 추가
- [x] 회귀 테스트 신설 (mock behavioral 4건)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [x] `npm run build` PASS
- [x] `npm run test:regression` PASS (수치 기재)

## DoD (Issue #1212 원문 대비)

- [x] `confirmUpsRegistration()`·`undoUpsRegistration()` 양쪽 추가
- [x] 회귀 테스트 (revalidatePath ups-detail 포함 mock 검증)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신

## [작업 결과]

- 코드 커밋: `6eb91471284a15868089e6e03aa19b040e892e7b`
- `npm run build`: PASS (EXIT=0, Next.js 16.2.4 Turbopack)
- `npm run test:regression`: Test Files 219 passed (219), Tests 1529 passed (1529)
- DoD 항목별 증거:
  - 테스트: `tests/unit/warehouse/def138-ups-detail-revalidate.test.ts`
    TC-UPSRV-01~04 — 실제 서버 액션 호출 + revalidatePath mock 검증
    (DEF-B-057 `defb057-...test.ts` 패턴 재사용).
  - 맵 갱신: TC-UPSRV-01~04.

## [발견 이슈] (R-18)

- (작업 중 발견 시 기재)

## [Aiden 검토]

- (반려 시 사유 기재)
