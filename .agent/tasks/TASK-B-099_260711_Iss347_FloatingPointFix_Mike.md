# TASK-B-099: Issue #347 할인율/할증률 부동소수점 오차 수정

**담당:** Mike
**생성일:** 2026-07-11
**상태:** 🔔 검토 요청

## 개요
퍼센트(%) ↔ 소수(rate) 왕복 변환 시 JS 부동소수점 연산 오차가 그대로 노출됨 (예: 7.4 → 7.400000000000001).

## 변경 사항

### 반올림 공식
- **저장**: `Math.round(Number(value) * 100) / 10000` (소수점 4자리 = % 소수점 2자리)
- **표시**: `Math.round(Number(rate) * 10000) / 100`

### 수정 파일
| 파일 | 위치 | 내용 |
|:-----|:-----|:-----|
| `ups-rates-client.tsx` | 390-391행 | 판매/원가 할증률 (Fuel Surcharge) — step 0.001→0.01 |
| `ups-rates-client.tsx` | 448행 | Agency Zone별 할인율 |
| `shipper-form.tsx` | 64행 | 화주 신규 등록 할인율 저장 |
| `edit-form.tsx` | 65행 | 화주 할인율 표시 (initialValues) — number→string |
| `edit-form.tsx` | 84행 | 화주 할인율 저장 |

## 검증
- **Build: ✅**
- **회귀: 81 files / 489 tests ALL PASS ✅**

## 결과
- **PR:** https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/353
- **상태:** 🔔 Aiden 검토 대기
