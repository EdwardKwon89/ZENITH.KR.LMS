# TASK-B-203: 출고확정처리 되돌리기 — IN_TRANSIT → RELEASED

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#829](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/829) |
| **담당** | Mike (1차 구현) / Baker (버그 수정) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## [작업 결과]

### 1차 구현 — Mike

#### 서버액션 (`src/app/actions/operations/warehouse.ts`)
- `undoDeparture(orderId)`: IN_TRANSIT → RELEASED 상태 전이
- AGENCY 스코프 검증 포함
- `undoOutbound` 패턴 미러링

#### 프론트 (`src/components/warehouse/DepartureConfirmForm.tsx`)
- 이력 패널에 "출고확정취소" 버튼 + 확인 팝업

#### i18n (4 로케일)
- `undo_btn`, `undo_title`, `undo_desc`, `undo_confirm`, `undo_success`, `undo_failed`

#### 파일 목록
- `src/app/actions/operations/warehouse.ts` — undoDeparture 함수 추가
- `src/app/actions/operations/index.ts` — export 추가
- `src/components/warehouse/DepartureConfirmForm.tsx` — 취소 버튼 + 팝업
- `messages/{ko,en,ja,zh}.json` — i18n 추가
- `tests/unit/warehouse/undo-departure.test.ts` — 신규 (3건)

#### 검증
- 테스트: **3/3 PASS** (정상 전이, 잘못된 상태 거부, AGENCY 스코프)
- 빌드: ✅ PASS
- 회귀: **124/124 파일 PASS, 823/823 테스트 PASS**
- 커밋 해시: `553519a5`
- PR: [#833](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/833)

---

### 후속 수정 — Baker (버그 수정)

#### 발견된 버그
`DepartureConfirmForm.tsx:342`의 `{latestLabel && (...)}` 안에 취소 버튼이 있어, UPS 라벨이 없는 이력 항목에는 "출고확정취소" 버튼이 아예 안 보이는 버그.

#### 변경 내용
- `DepartureConfirmForm.tsx:342-354`: `latestLabel &&` 조건 제거 — UPS 라벨 유무와 무관하게 모든 이력 행에 "출고확정취소" 버튼 노출

#### 파일 목록
- `src/components/warehouse/DepartureConfirmForm.tsx` — undo 버튼 조건 해제
- `tests/unit/orders/departure-undo-button.test.tsx` — 신규 (1건)

#### 검증
- 테스트: **1건 PASS** (UPS 라벨 없는 이력에도 버튼 노출 검증)
- 회귀: **125/125 파일 PASS, 825/825 테스트 PASS**
- 커밋 해시: `bf191ee4`
- PR: [#837](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/837)

### [발견 이슈]
없음
