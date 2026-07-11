# TASK-B-093: Issue #329 Agency 기준요금 원가 표시 스타일 통일 + NAVI 메뉴명 오류 정정

**담당:** Baker
**생성일:** 2026-07-11
**상태:** 🔔 검토 요청

## 개요
JSJung 요청 3건:
1. Agency 기준요금 화면 원가 표시 스타일 Admin과 통일
2. NAVI 메뉴명 `agency_other_charges_nav` 정정 ("관리" → "조회")
3. "UPS 요율 조회" vs "UPS 운임 조회" 용어 통일 검토

## 변경 사항

### 1. UpsBaseRateMatrix.tsx Agency 원가 표시 스타일 통일
- `renderCellPrice` case 'agency': `text-xs text-slate-500` → `text-[10px] text-slate-400` 괄호 형태 (Admin full mode와 동일)

### 2. i18n NAVI 메뉴명 정정
- ko: "부가요금 관리" → "부가요금 조회" (Navigation + root level)
- zh: "附加费管理" → "附加费查看"
- ja: "諸掛管理" → "諸掛照会"
- en: "Other Charges" — 변경 불필요 (중립적)

### 3. 용어 통일 검토
- agency_ups_rates_nav = "UPS 요율 조회" / shipper_ups_rates_nav = "UPS 운임 조회"
- Agency는 요율표(rate table) 조회, Shipper는 실제 운임(freight charge) 조회 — 의도된 구분이므로 유지

## 검증
- **Build: ✅**
- **회귀: 81 files / 489 tests ALL PASS ✅**

## 결과
- **PR:** https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/331
- **상태:** 🔔 Aiden 검토 대기
