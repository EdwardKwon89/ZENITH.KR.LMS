# TASK-B-330: Issue #1232 — UPS 오더 등록·상세 화면 Item 총금액(수량×단가) 통화별 소계 표시

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1232](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1232) |
| **요청자** | 정정윤 차장 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-10-11 |
| **우선순위** | P3 (Low) |
| **상태** | 🔔 리뷰 대기 |

## 목표

UPS 오더의 품목별 단가 정보를 오더 단위로 집계하여 **통화별 소계**를 등록 화면과 상세 화면에 표시한다.
- 등록/수정 화면(`OrderRegistrationForm`): SHIPMENT SUMMARY 바에 "품목 총금액" 표시 (UPS 모드일 때만)
- 상세 화면(`ups-detail`): 운임 및 화물 구성 영역에 "품목 총금액" 요약 줄 표시
- 품목 정보 모달(`UpsPackageItemsModal`): 기존 `$ USD` 고정 합계 표기를 통화별 표기로 수정 (결함)

## 확정 사양 (Jaison 설계 확정, 2026-10-10)

- ① 통화별 소계 표시 (**환산 없음** — USD/KRW 등을 각각 별도 합산)
- ② 합계 = Σ(수량 × 단가)
- 범위: **화면 표시만 추가**. DB·API·Server Action 변경 없음 (R-11/R-12 명세 변경 대상 아님)

## DoD

- [x] 신규 유틸 `src/lib/orders/item-totals.ts` — `sumItemAmountByCurrency(packages)` → `Record<string, number>`
- [x] 신규 컴포넌트 `src/components/orders/ItemsTotalSummary.tsx` — 통화별 소계 표시
- [x] `OrderRegistrationForm.tsx` — SHIPMENT SUMMARY 바에 추가 (증가분 import 1줄 + 사용 1줄)
- [x] `ups-detail/page.tsx` — 운임 및 화물 구성 영역에 요약 줄 추가
- [x] `UpsPackageItemsModal.tsx` — `$ USD` 하드코딩 → 통화별 표기로 수정
- [x] 단위 테스트 `tests/unit/orders/item-totals.test.ts` (behavioral, vacuous 금지)
- [x] `LIVE_REGRESSION_TEST_MAP.md` §63 갱신 (R-09)
- [x] `npm run test:regression` 전체 PASS (R-08)
- [x] R-04 LIVE 체크리스트 자가 점검
- [x] 신규 코드 R-15 실패 관측성 원칙 준수 (판단 근거 기재)

## 전제조건

- DB·API·Server Action 변경 없음 → R-11/R-12 대상 아님
- 순수 계산/표시 코드이므로 R-15 로깅 대상 아님 (순수 함수, 실패 반환값 없음)

## 착수 체크리스트

- [x] 워크트리 `ZENITH_LMS-worktrees/baker` 재사용, `origin/TeamB_Dev`(f8ca7c3bb)에서 `feature/teamb-330-iss1232-ups-item-total` 생성
- [x] 채번 재확인: `next-task-number.sh B` = TASK-B-330, 기존 파일 없음
- [x] 라벨 `status:in-progress` 전환

## [작업 결과]

### 수정 요약

| 구분 | 내용 |
|:-----|:------|
| **이슈** | Issue #1232 |
| **브랜치** | `feature/teamb-330-iss1232-ups-item-total` (워크트리 `ZENITH_LMS-worktrees/baker` 격리, `origin/TeamB_Dev` f8ca7c3bb 기반) |
| **신규 파일** | `src/lib/orders/item-totals.ts`, `src/components/orders/ItemsTotalSummary.tsx`, `tests/unit/orders/item-totals.test.ts` |
| **수정 파일** | `OrderRegistrationForm.tsx`(+2), `ups-detail/page.tsx`, `UpsPackageItemsModal.tsx`, `LIVE_REGRESSION_TEST_MAP.md` |

### 구현 내용

1. **`sumItemAmountByCurrency(packages)`** — 품목별 `수량 × 단가`를 `currency`별로 합산해 `Record<string, number>` 반환. `null/undefined/NaN/음수`는 0 처리, `currency` 미지정·공백은 기존 동작과 동일하게 `USD`로 간주, 소문자/공백은 대문자 trim 정규화, 입력 불변(원본 미수정).
2. **`ItemsTotalSummary`** — 통화별 소계를 줄 분리 표시(소수 2자리 + 통화코드 병기). 부모 `text` 색상을 상속해 다크(SHIPMENT SUMMARY 바)/라이트(상세 화면) 양쪽에서 사용. 합계 없으면 `null` 반환.
3. **`OrderRegistrationForm`** — SHIPMENT SUMMARY 바에서 `TOTAL VOLUME` 블록 아래·`UPS 예상운임` 블록 옆에 `transportMode === 'UPS'`일 때만 렌더. 계산 로직은 폼에 넣지 않고 별도 컴포넌트로 분리(파일 1,892줄, 증가분 import+사용 2줄).
4. **`ups-detail/page.tsx`** — "운임 및 화물 구성" 헤더 우측(모달 버튼 옆)에 요약 표시 → 모달을 열지 않아도 총금액 확인 가능.
5. **`UpsPackageItemsModal`** — `$ USD` 고정 표기 결함 수정. 헤더 `단가 (USD)`/`합계 (USD)` → `단가`/`합계`, 각 행/푸터 합계를 품목 통화 기준 표기(`formatCurrencyAmount`)로 변경.

### 검증 결과

| 항목 | 결과 |
|:-----|:-----|
| 신규 테스트 | **7/7 PASS** (`tests/unit/orders/item-totals.test.ts`) |
| 전체 회귀 | **214 files / 1502 tests ALL PASS** (`npm run test:regression`, 로컬 Supabase fresh 상태) |
| 빌드/타입체크 | **SUCCESS** (`npm run build`) |
| 독립 되돌리기 검증 | 함수가 `{}`만 반환하도록 임시 손상 → 신규 테스트 **5/7 FAIL** (빈값·불변 케이스 제외) 확인 후 원복 → 7/7 PASS. 테스트가 실제 구현을 검증함(비-vacuous) 확인 |
| 실패 관측성(R-15) | **해당 없음** — 순수 계산/표시 코드로 실패 반환값·예외 catch 지점 자체가 없음. 핵심 지점 알림 기준 미충족(표시용 참고값이며 청구·정산 계산에 미사용 → ①금전영향·③침묵성 모두 비해당) |
| R-04 자가 점검 | `LIVE_REGRESSION_TEST_MAP.md` §63 반영 + 빌드·회귀 PASS로 확인. R-10 스크린샷은 Baker 미요구(2026-07-15 JSJung 결정 — 병합 후 JSJung이 라이브 UI 확인) |

### 테스트 설계 (vacuous 방지)

- `fs.readFileSync`+`toContain`, `typeof fn === 'function'` 류 금지 준수 — 실제 함수 호출 후 `toEqual`/`toBeCloseTo`로 반환값 검증.
- 케이스: ①단일 통화 합 ②USD+KRW 두 키 ③빈 packages/items → `{}` ④null·NaN·음수 무시 ⑤소수점(0.1×3) 오차 허용 ⑥통화 정규화 ⑦입력 불변.

### 커밋

- **코드 커밋**: `e67e6e308` — `[Baker] feat: TASK-B-330 UPS 품목 총금액 통화별 소계 표시 (Issue #1232)`
  - 포함: `src/lib/orders/item-totals.ts`, `src/components/orders/ItemsTotalSummary.tsx`, `src/components/orders/OrderRegistrationForm.tsx`, `src/components/ups/UpsPackageItemsModal.tsx`, `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`, `tests/unit/orders/item-totals.test.ts`, `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`
  - task file 은 포함하지 않음(`git show --stat HEAD` 확인).

## [발견 이슈]

없음.
