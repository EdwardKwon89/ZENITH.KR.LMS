# TASK-B-099: Issue #347 할인율/할증률 부동소수점 오차 수정

**담당:** Mike
**생성일:** 2026-07-11
**상태:** 🔔 검토 요청

## 개요
퍼센트(%) ↔ 소수(rate) 왕복 변환 시 JS 부동소수점 연산 오차가 그대로 노출됨 (예: 7.4 → 7.400000000000001).

## 변경 사항

### 반올림 공식 (소수점 1자리 기준)
- **저장**: `Math.round(Number(v) * 10) / 1000` (% → 소수 3자리)
- **표시**: `Math.round(rate * 1000) / 10` (소수 → %)
- **input step**: `0.1`

### 수정 파일 (3파일 5지점)
| 파일 | 위치 | 내용 |
|:-----|:-----|:-----|
| `ups-rates-client.tsx` | 390행 | 판매 할증률 (step 0.001→0.1) |
| `ups-rates-client.tsx` | 391행 | 원가 할증률 (step 0.001→0.1) |
| `ups-rates-client.tsx` | 448행 | Agency Zone별 할인율 |
| `shipper-form.tsx` | 64행 | 화주 신규 등록 할인율 저장 |
| `edit-form.tsx` | 65행 | 화주 할인율 표시 (initialValues) |
| `edit-form.tsx` | 84행 | 화주 할인율 저장 |

## 검증
- **Build: ✅**
- **회귀: 81 files / 489 tests ALL PASS ✅**

## 결과
- **PR:** https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/356
- **상태:** 🔔 Aiden 검토 대기

## 반려 수정 이력
- 1차 반려 (PR#353): 브랜치에 Issue #294 무관 변경 섞임 → fresh 브랜치 재구현 (PR#356)
- 2차 반려 (PR#356): LAST_REGRESSION_RESULT FAIL, R-17 누락, 소수점 2자리→1자리 정밀도 수정
