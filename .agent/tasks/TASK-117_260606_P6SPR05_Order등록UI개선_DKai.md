# TASK-117 — [P6-SPR-05] Order 등록 UI 개선 (서비스 조합 선택 Step)

| 항목 | 내용 |
|:---|:---|
| Task ID | TASK-117 |
| Phase | Phase 6 / SPR-05 |
| 생성일 | 2026-06-06 |
| 발령자 | Aiden (Claude, ZEN_CEO) |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P1 |
| 전제조건 | TASK-116 ✅ |
| 관련 IMP | IMP-101 |
| 관련 설계 | [An-11 §7](../../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md) |
| 상태 | 🚫 블로커 |

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

- [ ] Order 등록 flow에 서비스 선택 Step 추가 확인 (화물정보 → 서비스선택 → 요율확인 → 제출)
- [ ] 8종 서비스 조합 선택 UI 동작 확인
- [ ] 서비스 선택 후 `getAvailableServiceRates` 호출 및 결과 표시 확인
- [ ] 요율 0건 시 다음 단계 차단 + 오류 메시지 표시 확인
- [ ] **[GAP-P6-01]** `zen_order_services` INSERT RLS 보완 — 화주(CORPORATE/INDIVIDUAL)가 본인 order_id에 한해 INSERT 가능하도록 migration 패치 추가 (방안 A: shipper_id 기반 정책, 또는 대안 설계 의견 📝 제출 후 착수)
- [ ] 요율 선택 후 `createOrderServices` 호출 및 zen_order_services 레코드 생성 확인 (화주 역할로 INSERT 성공 확인)
- [ ] 서버 측 이중 검증 동작 확인 (만료 요율로 제출 시 차단)
- [ ] 기존 Order 등록 기능(화물정보, 화주 정보 등) 회귀 없음 확인
- [ ] R-09: `LIVE_REGRESSION_TEST_MAP.md`에 TC-P6-ORDERUI-01 이상 신규 추가
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 → task file 🔔 → ACTIVE_TASK.md 갱신 → DoD 검증 → 문서 커밋 (R-17 순서 엄수)

---

## [작업 결과]

*(D_Kai 작성)*

---

## [Aiden 검토]

*(Aiden 전속)*
