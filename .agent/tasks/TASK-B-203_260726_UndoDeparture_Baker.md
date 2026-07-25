# TASK-B-203: 출고확정취소 버튼 UPS 라벨 무관 노출

| 항목 | 내용 |
|:-----|:------|
| **연결 이슈** | [#829](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/829) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 배경

`undoDeparture()` 백엔드 함수는 이미 구현 완료 상태 (IN_TRANSIT → RELEASED). 단 `DepartureConfirmForm.tsx`의 이력 패널에서 "출고확정취소" 버튼이 UPS 라벨이 있는 이력(`latestLabel` 존재)에만 노출되어, UPS 라벨이 없는 일반 출고오더에는 버튼이 보이지 않는 버그 존재.

## 변경 내용

- `DepartureConfirmForm.tsx:342-354`: `latestLabel &&` 조건 제거 — UPS 라벨 유무와 무관하게 모든 이력 행에 "출고확정취소" 버튼 노출

## 검증 결과

| 항목 | 결과 |
|:-----|:-----|
| 전체 회귀 | ✅ 125 files / 825 tests ALL PASS |
| 신규 테스트 | ✅ 1건 PASS |
| 커밋 | `bf191ee4` |
| PR | [PR#837](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/837) |

## [발견 이슈]

없음
