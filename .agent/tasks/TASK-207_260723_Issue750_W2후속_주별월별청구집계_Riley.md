# TASK-207 — W2 후속: 화주별 주별/월별 청구 집계

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-207 |
| **GitHub Issue** | [#750](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/750) (SNTL 회의록 [#718](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/718) W2 2순위) |
| **생성일** | 2026-07-23 |
| **할당 Agent** | Riley |
| **우선순위** | P3 |
| **전제조건** | TASK-204(W2 일별 집계) ✅ 완료 |
| **커밋 태그** | `[Gemini]` |
| **상태** | ✅ |

---

## [배경]

TASK-204(W2 1순위, PR#738/#740)로 화주별 **일별** 청구 집계는 완료됨. SNTL 회의록 W2 2순위 항목인 **주별/월별** 집계를 이어서 진행.

## [설계 방향]

- `src/app/actions/finance/daily-billing.ts`의 기존 로직(`getShipperDailyBillingSummary` 등)을 그대로 재사용 — 날짜 버킷 단위만 일(day)→주(week)/월(month)로 확장
- 신규 재계산 로직 작성 금지 — 기존 `ShipperDailyBillingGroup` 집계 결과를 상위 기간 단위로 합산(또는 쿼리 단의 GROUP BY 단위 변경)하는 방향으로 설계
- UI(`/finance/daily-billing`)에 기간 단위 선택(일/주/월) 토글 추가 완료

---

## DoD

- [x] 화주별 주별 집계 로직+UI 구현(기존 일별 집계 로직 재사용)
- [x] 화주별 월별 집계 로직+UI 구현(기존 일별 집계 로직 재사용)
- [x] 기간 단위 선택 UI(일/주/월) 적용
- [x] 신규 회귀 테스트 추가 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09, Section 49 TC-W2-04~05)
- [x] R-10 스크린샷 첨부
- [x] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [x] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [x] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `ecf5d7fc` (1차) / `e35a6b96` (2차 재작업) / `dc815c4e` (task file 갱신) |
| 회귀 결과 | 격리 워크트리 재실행: 단위 테스트 7/7 PASS, 전체 회귀 115 files/789 tests ALL PASS |
| 빌드 | 빌드 성공 (`npx tsc --noEmit` 0 error) |
| 특이사항 | SNTL 회의록 W2 2순위 요구사항 완수 — 기존 일별 청구 집계 로직을 확장하여 일/주/월 기간별 집계 토글 UI 및 서버 집계 구축. |
| PR | #755 |

## [Aiden 검토]

### 1차 반려 (2026-07-23)

**판정**: ❌ 반려

**양호한 점**: 주별/월별 집계 로직이 기존 엔진(`formatPeriodKey`로 버킷 키만 확장)을 재사용 — 중복 구현 없음. CI 3항목 SUCCESS, 워크트리 격리 준수.

**반려 사유**:
1. **실제 UI 회귀** — `ShipperDailyBillingClient.tsx`에서 기존 클라이언트 사이드 날짜 필터링(`if (startDate && g.date < startDate)...`)이 제거되었으나, 대체용 서버 재조회는 `handlePeriodTypeChange()`(같은 기간탭 재클릭 시 즉시 return) 안에만 있어, 같은 기간 탭에 머문 채 날짜를 입력해도 필터가 적용되지 않음("초기화" 버튼도 동일 이유로 무효).
2. **테스트 커버리지 축소** — TASK-204 시점 대비, 기존 일별 집계 테스트(FUEL_SURCHARGE/SURGE_FEE 합산, finalized/unfinalized 카운트 검증)와 빈 상태 테스트, `getShipperDailyOrdersDetails`의 OTHER_CHARGE 상세행/invoiceNo 검증이 신규 주별/월별 테스트로 **대체**되어 사라짐. 신규 케이스는 기존 케이스에 추가되어야 함.

**요구사항**: 날짜/화주 필터가 기간탭 전환 없이도 재조회되도록 수정, 삭제된 기존 테스트 케이스 복원 후 그 위에 신규 케이스 추가.

### 최종 승인 (2026-07-23, 재작업 커밋 `e35a6b96`)

**판정**: ✅ 승인 — '조회' 버튼 신설 + `handleReset` stale-state 수정으로 날짜필터 회귀 해소 확인, 삭제됐던 기존 테스트 4건 전부 복원 확인(그 위에 주별/월별 신규 케이스 유지, 총 7개). 격리 워크트리 재검증(7/7 + 115/789 PASS) 완료. develop 병합 진행.
