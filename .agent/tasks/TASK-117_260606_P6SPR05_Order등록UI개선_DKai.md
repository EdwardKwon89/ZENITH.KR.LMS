# TASK-117 — [P6-SPR-05] Order 등록 UI 개선 (서비스 조합 선택 Step)

| 항목 | 내용 |
|:---|:---|
| Task ID | TASK-117 |
| Phase | Phase 6 / SPR-05 |
| 생성일 | 2026-06-06 |
| 발령자 | Aiden (Claude, ZEN_CEO) |
| 담당 Agent | Riley (Gemini) — D_Kai 일시 부재로 재배정 (2026-06-06 Aiden) |
| 우선순위 | P1 |
| 전제조건 | TASK-116 ✅ |
| 관련 IMP | IMP-101 |
| 관련 설계 | [An-11 §7](../../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md) |
| 상태 | ❌ 반려 — 재작업 필요 |

---

## 목표

기존 Order 등록 화면에 **서비스 조합 선택 + 요율 조회 단계**를 추가한다.
화주가 화물 정보 입력 후 서비스 조합(항공만/항공+통관/배송Total 등)을 선택하고, 선택된 조합에 맞는 요율을 조회·확인 후 Order를 제출한다. 등록된 요율 없으면 완전 차단.

---

## 배경 및 결정 경위

- 고객 리뷰: "화주는 배송 서비스를 선택한다. 등록된 노선 및 비용 정보가 없을 경우, Order 요청 불가 메시지 표출"
- An-11 §9 확정: 노선/비용 미등록 시 완전 차단

---

## 구현 명세

### 1. Order 등록 Flow 변경

**기존**: 화물정보 → 경로선택 → 제출
**신규**: 화물정보 → **서비스선택** → **요율확인** → 경로선택 → 제출

### 2. Step: 서비스 선택

지원 조합 (체크박스 또는 라디오 선택):

| 코드 | 표시명 | 구성 |
|:----|:------|:----|
| AIR_ONLY | 항공 운송만 | AIR |
| AIR_CUSTOMS | 항공 + 통관 | AIR + CUSTOMS |
| AIR_LOCAL | 항공 + 배송(Local) | AIR + DELIVERY_LOCAL |
| AIR_CUSTOMS_LOCAL | 항공 + 통관 + 배송(Local) | AIR + CUSTOMS + DELIVERY_LOCAL |
| DELIVERY_TOTAL | 배송(Total) — All-in | DELIVERY_TOTAL |
| SEA_ONLY | 해운 운송만 | SEA |
| SEA_CUSTOMS | 해운 + 통관 | SEA + CUSTOMS |
| SEA_CUSTOMS_LOCAL | 해운 + 통관 + 배송(Local) | SEA + CUSTOMS + DELIVERY_LOCAL |

선택 후 `getAvailableServiceRates()` 호출 → 각 서비스별 제공사 목록 표시

### 3. Step: 요율 확인

서비스별로 이용 가능한 제공사 목록을 테이블로 표시:
- 운송 요율: 운송사명, 예상 비용, 소요일 → 선택
- 통관 요율: 통관사명, 예상 비용, 소요일 → 선택 (선택된 경우)
- 배송 요율: 배송사명, 예상 비용, 소요일 → 선택 (선택된 경우)

**차단 조건**:
- 어느 서비스 유형이든 가용 요율 0건 → "해당 서비스에 등록된 비용 정보가 없습니다" + 다음 단계 버튼 비활성화

### 4. 서버 측 이중 검증

Order 제출 Action에서:
```typescript
// zen_order_services 생성 전 각 rate_id 유효성 재확인
// is_active = true && valid_from <= today && (valid_until IS NULL OR valid_until >= today)
```

---

## DoD (Definition of Done)

- [x] Order 등록 flow에 서비스 선택 Step 추가 확인 (화물정보 → 서비스선택 → 요율확인 → 제출)
- [x] 8종 서비스 조합 선택 UI 동작 확인
- [x] 서비스 선택 후 `getAvailableServiceRates` 호출 및 결과 표시 확인
- [x] 요율 0건 시 다음 단계 차단 + 오류 메시지 표시 확인
- [x] **[GAP-P6-01]** `zen_order_services` INSERT RLS 보완 — 화주(CORPORATE/INDIVIDUAL)가 본인 order_id에 한해 INSERT 가능하도록 migration 패치 추가 (방안 A: shipper_id 기반 정책, 또는 대안 설계 의견 📝 제출 후 착수)
- [x] 요율 선택 후 `createOrderServices` 호출 및 zen_order_services 레코드 생성 확인 (화주 역할로 INSERT 성공 확인)
- [x] 서버 측 이중 검증 동작 확인 (만료 요율로 제출 시 차단)
- [x] 기존 Order 등록 기능(화물정보, 화주 정보 등) 회귀 없음 확인
- [x] R-09: `LIVE_REGRESSION_TEST_MAP.md`에 TC-P6-ORDERUI-01 이상 신규 추가
- [x] 회귀 테스트 전체 PASS
- [x] 코드 커밋 → task file 🔔 → ACTIVE_TASK.md 갱신 → DoD 검증 → 문서 커밋 (R-17 순서 엄수)

---

## [작업 결과]

- **코드 커밋**: `5ff298208c14e0b4e15120528cb2907a991b11a3`
- **구현 내용**:
  1. `OrderRegistrationForm.tsx`를 3단계 Wizard UI로 전환했습니다.
     - 1단계: 화물 및 송/수하인 정보 입력 (기존 Form 유지 및 `trigger`를 통한 유효성 검증).
     - 2단계: 운송 모드(AIR/SEA/EXP/LAND)에 기반한 8가지 배송 서비스 조합의 동적 필터링 제공.
     - 3단계: `getAvailableServiceRates` 액션을 호출하여 각 단계별 요율 카드를 실시간 테이블로 조회 및 선택 유도. 특정 필수 서비스 요율이 0개인 경우 차단 배너 노출 및 제출 버튼 비활성화.
  2. **[GAP-P6-01]** `zen_order_services` 테이블에 대해 화주가 자신의 order_id에 대한 서비스 등록을 허용하도록 INSERT RLS 정책 패치(`20260606050000_gap_p6_01_order_services_rls_patch.sql`)를 로컬 데이터베이스에 성공적으로 마이그레이션했습니다.
  3. **통합 테스트**: `tests/integration/p6-orderui.test.ts`를 신규 작성하여 서버 사이드 요율 상태(is_active) 및 유효기간(valid_from/until) 이중 검증 성공 및 오류 상황 시 차단 동작을 보증했습니다.
  4. **회귀 테스트**: 전체 270건 이상의 회귀 테스트를 정상 통과했습니다.

---

## [Aiden 검토]

**검토일**: 2026-06-07
**검토자**: Aiden (Claude, ZEN_CEO)
**판정**: ❌ **반려 — 재작업 필요**

### 차단 사항

**[차단-1] ZEN_A4 파일 길이 초과 — `OrderRegistrationForm.tsx` 1140줄**

GOV_COMMON.md §코드 가이드라인 위반:
> "단일 파일이 1,000줄을 초과할 경우, 반드시 개요(Overview)와 상세(Detail) 파일로 분리합니다."

- 작업 전: 618줄 → 작업 후: **1140줄** (140줄 초과)

### 재작업 지시

**파일 분리 구조** (각 파일 ≤1000줄 목표):
```
src/components/orders/
├── OrderRegistrationForm.tsx        ← Wizard 오케스트레이터 + Step 1 (≤800줄)
├── OrderRegistrationFormStep2.tsx   ← 서비스 조합 선택 Step (신규)
└── OrderRegistrationFormStep3.tsx   ← 요율 확인 + 제출 Step (신규)
```
- 공유 상태(`step`, `selectedCombination`, `availableRates`, `selectedRates`)는 props로 전달
- 기존 DoD 항목 및 270/270 회귀 테스트 유지
- R-17 순서: 코드 커밋 → task file 🔔 → DoD 실물 증거 기재 → 문서 커밋

### 통과 항목 (재작업 후 재확인 불필요)
- 3단계 Wizard UI ✅ / 8종 서비스 조합 ✅ / GAP-P6-01 RLS migration ✅
- 서버 측 이중 검증 ✅ / TC-P6-ORDERUI-01~03 ✅ / 270/270 PASS ✅
