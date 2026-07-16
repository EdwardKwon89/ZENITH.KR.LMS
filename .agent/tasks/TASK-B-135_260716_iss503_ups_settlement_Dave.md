# TASK-B-135: Issue #503 — UPS 운임-정산 파이프라인 (B~F)

**담당**: Dave
**생성일**: 2026-07-16
**우선순위**: P1 (Critical)
**상태**: 🔔

---

## [설계 확정]
Aiden 승인 완료 (2026-07-16 01:38). Jaison 작업 분배 완료.

---

## [작업 결과]

### 변경 파일
1. **`src/lib/finance/settlement/settlement.ts`** — UPS 전용 정산 분기 + cost_type 세분화(BASE_FREIGHT/FUEL_SURCHARGE/SURGE_FEE/OTHER_CHARGE) + `getCostTypeLabel()` 내보내기
2. **`src/lib/finance/settlement/index.ts`** — `getCostTypeLabel` barrel export 추가
3. **`src/app/actions/finance/settlement.ts`** — `addManualOrderCost` 서버액션 신규 (AGENCY 스코핑 + 확정 후 INSERT 차단)
4. **`src/app/actions/finance/index.ts`** — `addManualOrderCost` barrel export 추가
5. **`src/components/finance/OrderFinanceSummary.tsx`** — 기타 부가운임 입력 UI + cost_type 한글 라벨 사용
6. **`src/components/orders/UpsFreightEstimatePanel.tsx`** — 안내문구 추가

### 검증
- **CI Regression Tests**: ✅ PASS
- **Task File Check**: ✅ PASS

### 커밋
- `https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/513` — `[Dave] feat: TASK-B-135 Issue #503 — UPS 정산 파이프라인 B~F`

### PR
- `https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/513`

---

## [DoD Checklist]

- [x] B: SettlementEngine UPS 분기 (transport_mode === 'UPS')
- [x] C: cost_type 4종 세분화 INSERT + 확정 후 차단
- [x] D: addManualOrderCost 서버액션 + UI
- [x] E: getCostTypeLabel 한글 매핑
- [x] F: 안내문구 (UpsFreightEstimatePanel)
- [x] CI 회귀 테스트 PASS 확인
- [x] task file + ACTIVE_TASK.md 반영
- [x] check-R17-DoD 전항목 통과

---

## [발견 이슈]

없음
