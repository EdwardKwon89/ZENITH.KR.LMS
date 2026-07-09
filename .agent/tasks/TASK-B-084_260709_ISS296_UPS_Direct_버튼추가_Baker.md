# TASK-B-084: ISS#296 UPS Direct 운송모드 노출

- **발령**: Jaison (Team B 총괄) · 2026-07-09
- **담당**: Baker
- **PR**: #??
- **브랜치**: `feature/teamb-issue-296-ups-mode-fix`

---

## 작업 내역

### 1. 운송모드 버튼 수정 (`OrderRegistrationForm.tsx:812-817`)
- EXP 라벨 복원: `"UPS Direct"` → `"특송"`
- 신규 5번째 버튼 추가: `{ code: 'UPS', icon: PackageCheck, label: 'UPS Direct' }`

### 2. content_type 게이팅 확장 (`OrderRegistrationForm.tsx:1240,1252`)
- `transportMode === 'EXP'` → `(transportMode === 'EXP' || transportMode === 'UPS')`
- CONTENT select, col-span 조건 모두 동일 패턴 확장

### 3. Chargeable Weight UPS case 추가 (`freight-calculator.ts:34`)
- `case 'UPS':` 추가 → AIR/EXP와 동일하게 IATA 용적중량(÷167) 계산 적용

### 4. 단위 테스트 보강 (`freight-calculator.test.ts`)
- UPS 모드 chargeable weight 2개 케이스 추가 (용적중량>실중량, 실중량>용적중량)

---

## 검증 결과

- `npm run build`: ✅ PASS
- `npm run test:regression`: ✅ 81/81 files, 489/489 → 491 tests PASS
