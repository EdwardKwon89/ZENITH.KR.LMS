# UAT-2.1-LOGISTICS: 초정밀 통합 물류 비즈니스 및 엔진 검증 시나리오

**작성일**: 2026-04-20 (v2.0 Revision)
**작성자**: Antigravity (CEO Agent)
**검증 도메인**: 고도화 요율 엔진, 오더 트랜잭션, RBAC 보안 거버넌스

---

## 🏛️ 그룹 R: 지능형 요율 엔진 및 슬랩(Slab) 관리 (Rate Engine)

### TC-R.1: 중량 등급별 슬랩 요율 및 버전 거버넌스
- **목표**: 구간별 요율이 올바르게 등록되고, TISA 버전 관리 규칙(V1 -> V2)이 작동하는지 입증
- **사전 조건**: 포트 마스터(ICN, LAX)가 `zen_ports`에 활성 상태로 존재할 것
- **검증 시나리오**:
  1. **[UI]** `admin/rates` 메뉴 진입
  2. **[Input]** 출발: ICN, 도착: LAX, 모드: AIR, 단위: KG로 신규 Rate Card 생성
  3. **[Input]** Slab Tier 입력:
     - 0 ~ 45kg: $10.00
     - 45kg ~ 100kg: $8.50
     - 100kg+ : $7.00
  4. **[Action]** '저장' 후 '승인(ACTIVE)' 상태로 변경
  5. **[Expected UI]** 성공 Toaster 메시지 확인 및 목록에서 `Status: ACTIVE`, `Version: 1` 확인
  6. **[SQL Assertion]** 
     ```sql
     -- 부모 카드와 자식 티어가 정확히 연결되었는가?
     SELECT a.origin_code, a.dest_code, b.weight_min, b.unit_price 
     FROM zen_rate_cards a JOIN zen_rate_tiers b ON a.id = b.rate_card_id
     WHERE a.origin_code = 'ICN' AND a.status = 'ACTIVE';
     ```

### TC-R.2: 요율 유효기간 가드 및 중첩 방지 (Negative Test)
- **목표**: 유효기간이 중첩되는 동일 구간 요율 등록 시 시스템 경고 발생 확인
- **검증 시나리오**:
  1. **[Action]** TC-R.1과 동일 구간(ICN-LAX)에 대해 동일한 유효기간으로 신규 등록 시도
  2. **[Expected UI]** "기존 요율과 유효기간이 중첩됩니다" 에러 팝업 및 저장 차단 확인

---

## 🏛️ 그룹 O: 오더 라이프사이클 및 지능형 매칭 (Order Pipeline)

### TC-O.1: 오더 생성 및 실시간 요율 스냅샷 고착화
- **목표**: 오더 등록 시 무게에 맞는 요율이 자동으로 스냅샷 테이블에 박제되는지 확인
- **검증 시나리오**:
  1. **[UI]** `orders/new` 진입
  2. **[Input]** 출발: ICN, 도착: LAX, 화물 중량: **55kg** 입력
  3. **[UI Reaction]** 요율 미리보기 영역에서 $8.50 (TC-R.1의 45~100구간)이 자동 노출되는지 확인
  4. **[Action]** 오더 저장 버튼 클릭
  5. **[SQL Assertion]** 
     ```sql
     -- 오더 생성 시점의 요율이 독립적으로 저장(Snapshotted) 되었는가?
     SELECT b.applied_unit_price, b.applied_currency 
     FROM zen_orders a JOIN zen_order_rate_snapshots b ON a.id = b.order_id
     WHERE a.order_no = '[생성된_번호]'; -- 기대값: 8.50
     ```

### TC-O.2: B2C 모달 및 복수 아이템 관리 (B2C Extension)
- **목표**: `order_type = B2C_ECOM` 시 복수 SKU 아이템 등록 기능 검증
- **검증 시나리오**:
  1. **[Input]** 오더 타입 'B2C E-commerce' 선택
  2. **[Action]** 아이템 추가 버튼 클릭 -> SKU1(의류, 2개), SKU2(화장품, 1개) 입력
  3. **[Expected UI]** 아이템 리스트 그리드에 합계 수량(3) 및 중량 합산이 정상 표기되는지 확인

---

## 🏛️ 그룹 C: 관제 대시보드 및 고밀도 그리드 (Control Plane)

### TC-C.1: 지능형 필터바 및 실시간 상태 동기화
- **목표**: 대량 데이터 상황에서 오더 상태별 필터링의 즉각적 반응성 확인
- **검증 시나리오**:
  1. **[UI]** `orders` (대시보드) 진입
  2. **[Action]** 필터바에서 Status: 'REGISTERED' 선택
  3. **[Expected UI]** 하단 그리드에서 해당 상태가 아닌 오더가 즉시 사라지는지 확인 (속도 300ms 이내)
  4. **[Action]** 특정 오더의 상세 페이지 진입 후 상태를 'CONFIRMED'로 변경
  5. **[Expected UI]** 대시보드 복귀 시 해당 오더의 배지가 실시간(Real-time)으로 파란색(Confirmed)으로 변경되었는지 확인

---

## 🏛️ 그룹 S: 통합 보안 거버넌스 (Security Shield)

### TC-S.1: RBAC 기반 메뉴 및 데이터 접근 페리미터
- **목표**: 권한에 따른 메뉴 노출 및 API 접근 차단 검증
- **검증 시나리오**:
  1. **[User]** `SHIPPER` 권한 계정으로 로그인
  2. **[Expected UI]** 사이드바에서 `Settings`, `Organizations` 등 관리 메뉴가 숨김 처리되었는지 확인
  3. **[Action]** 주소창에 직접 `/admin/organizations` 입력하여 강제 진입 시도
  4. **[Expected UI]** 403 Forbidden 페이지 혹은 홈으로 리다이렉트 되는지 확인

---

## 🏛️ [ZEN 통합 검증 보드] 시나리오 및 실행 매핑

### TC-R.1: 중량 등급별 슬랩 요율 및 버전 거버넌스
- **Phase 1 (Logic)**: `tests/unit/logistics/rate-engine.test.ts` (Slab Mapping Logic)
- **Phase 2 (Screen)**: [UI] `admin/rates` -> 요율 등록 및 활성화 프로세스

### TC-R.2: 요율 유효기간 중첩 방지 (Negative)
- **Phase 1 (Logic)**: `tests/unit/logistics/rate-engine.test.ts` (Validity Overlap Check)
- **Phase 2 (Screen)**: [UI] 동일 기간 등록 시 Toaster 빨간색 에러 노출 확인

### TC-O.1: 오더 생성 및 실시간 요율 스냅샷 고착화
- **Phase 1 (Logic)**: `tests/unit/logistics/order-matching.test.ts` (Order-to-Rate Matching)
- **Phase 2 (Screen)**: [UI] `orders/new` -> 55kg 입력 시 $8.50 실시간 자동 노출 확인

### TC-C.1: 지능형 필터바 및 실시간 상태 동기화
- **Phase 1 (Logic)**: `tests/unit/logistics/dashboard.test.ts` (Filter Logic)
- **Phase 2 (Screen)**: [UI] 대시보드 상태 필터 조작 및 리얼타임 배지 업데이트 확인

### TC-S.1: RBAC 기반 메뉴 및 데이터 접근 페리미터
- **Phase 1 (Logic)**: `tests/unit/auth/rbac.test.ts` (Role Permission Guard)
- **Phase 2 (Screen)**: [UI] Shipper 계정 로그인 시 관리자 메뉴 접근 차단(403) 확인

---

## 📊 [Total Audit Matrix] 통합 검증 결과 기록지

| ID | 도메인 | Phase 1 (Logic) | Phase 2 (Screen) | 최종 결과 | 특기 사항 (Dev Remark) |
|:---:|:---:|:---:|:---:|:---:|:---|
| **R.1** | Rate | **PASSED** | **PASSED** | **COMPLETED** | Slab matching & UI integration verified |
| **R.2** | Rate | **PASSED** | **PASSED** | **COMPLETED** | Overlap check & Error toast verified |
| **O.1** | Order | **PASSED** | **PASSED** | **COMPLETED** | Auto-rate matching UI verified |
| **C.1** | Control | **N/A** | **N/A** | **BYPASSED** | Handled in Phase 3 roadmap |
| **S.1** | Security | **PASSED** | **PASSED** | **COMPLETED** | RBAC Sidebar filtering verified |

> [!IMPORTANT]
> 본 매트릭스의 '최종 결과'가 모두 PASSED가 되기 전까지는 운영 환경 배포를 엄격히 금지합니다.

