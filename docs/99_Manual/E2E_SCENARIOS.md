# ZENITH_LMS 종합 E2E 테스트 시나리오 명세서

본 문서는 ZENITH_LMS 플랫폼의 전 구간(End-to-End) 비즈니스 프로세스 무결성을 검증하기 위한 상세 시나리오를 정의합니다.

> **검수 이력 v1**: Aiden 코드베이스 직접 대조 검증 완료 (2026-04-30) — URL·테이블·컬럼·상태값 11건 수정
> **검수 이력 v2**: E2E-09~12 추가 + E2E-01 권한 접근 제어 보강 (2026-04-30)

---

## 📋 시나리오 요약표

| ID | 시나리오 명칭 | 주요 타겟 | 커버 Phase |
|:---|:---|:---:|:---:|
| **E2E-01** | 법인 회원가입 및 관리자 승인 프로세스 | User/Admin | Phase 1 |
| **E2E-02** | B2C 단건 오더 접수 및 예상 운임 산출 | User | Phase 2 |
| **E2E-03** | 마스터 오더 편성 및 창고 입/출고 실무 | Admin/Oper | Phase 2 |
| **E2E-04** | 외부 API 연계 트래킹 동기화 및 알림 | Admin/System | Phase 3 |
| **E2E-05** | 서비스 정산, 인보이스 발행 및 세금계산서 | Admin | Phase 3 |
| **E2E-06** | 화주 VOC 등록 및 어드민 Quick Reply 상담 | User/Admin | Phase 4 |
| **E2E-07** | 통관(CCL) 신고 생성 및 상태 전환 관리 | Admin | Phase 5 |
| **E2E-08** | 화주용 통관 이력 조회 및 관리자 메모 확인 | User | Phase 5 |
| **E2E-09** | 개인회원 등급 승급 신청 및 Admin 심사 | User/Admin | Phase 4 |
| **E2E-10** | 클레임 접수 및 CI/PL 다국어 문서 발행 | Admin | Phase 4 |
| **E2E-11** | 오더 QnA 어드민 인라인 답변 | User/Admin | Phase 4 |
| **E2E-12** | 복합 경로 최적화 3종 선택 및 마일스톤 확인 | Admin | Phase 3 |

---

## 🧪 상세 시나리오 정의

### E2E-01: 법인 회원가입 및 관리자 승인
- **사전 조건**: 테스트 이메일(`test_e2e_01@zenith.kr`)이 시스템에 존재하지 않음.
- **수행 단계**:
    1. `/ko/auth/register` 페이지 접속
    2. 정보 입력 (이름: 홍길동, 구분: SHIPPER, 회사명: (주)제니스테스트)
    3. 가입 신청 버튼 클릭 → `/ko/auth/register/pending` 리다이렉트 확인
    4. 어드민 계정(`admin@zenith.kr`)으로 `/ko/auth/login` 접속 후 로그인
    5. `/ko/admin/organizations` 접속 → '승인 대기' 필터링 후 해당 사용자 '승인' 버튼 클릭
    6. 어드민 로그아웃 후 화주 계정(`test_e2e_01@zenith.kr`)으로 로그인
    7. `/ko/dashboard` 접속 및 오더 관리 메뉴 정상 활성화 확인
    8. **[권한 접근 제어]** 화주 계정 로그인 상태에서 `/ko/admin/customs` 직접 접근 → 403 또는 대시보드 리다이렉트 확인
- **기대 결과**: 사용자 상태가 `PENDING` → `APPROVED`로 변경되고, 화주 대시보드에 정상 접근 가능. 어드민 전용 URL은 권한 없음 처리됨.
- **검증 포인트**: `profiles.is_approved = true`, 어드민 URL 무단 접근 시 리다이렉트/차단 동작 확인.

---

### E2E-02: B2C 오더 접수 및 예상 운임 산출
- **사전 조건**: 승인된 일반 화주 계정으로 로그인 상태.
- **수행 단계**:
    1. `/ko/orders/new` 페이지 접속
    2. 화물 정보 입력 (중량: 10kg, 운송수단: SEA, 도착지: USA)
    3. '운임 계산' 버튼 클릭하여 TISA 엔진 구동 확인
    4. 산출된 예상 운임 확인 후 '오더 확정' 클릭
- **기대 결과**: 신규 오더 번호(Z-ORD-XXXX)가 생성되고 `/ko/orders` 목록에 표시됨.
- **검증 포인트**: `orders` 테이블에 `status='PENDING'`인 신규 레코드 생성 확인.

---

### E2E-03: 마스터 오더 편성 및 창고 입/출고
- **사전 조건**: 상태가 `PENDING`인 다수의 하우스 오더 존재.
- **수행 단계**:
    1. 어드민 `/ko/orders` 접속하여 복수 오더 선택
    2. '마스터 오더 생성(Packing)' 기능 실행 → `/ko/master-orders` 목록에서 신규 그룹 확인
    3. `/ko/inventory` 접속하여 입고 바코드 스캔 처리
    4. 출고(Outbound) 바코드 스캔 처리
- **기대 결과**: 오더 상태가 `IN_TRANSIT`으로 변경되고 마스터 번호와 매핑됨.
- **검증 포인트**: `order_groups` 테이블 매핑 및 오더 상태값 천이 확인.

---

### E2E-04: 트래킹 동기화 및 알림 엔진
- **사전 조건**: `IN_TRANSIT` 상태의 오더 및 어댑터 설정 완비.
- **수행 단계**:
    1. 어드민 `/ko/tracking` 접속
    2. '실시간 동기화' 또는 '배치 실행' 트리거 (ManualAdapter 연동)
    3. 트래킹 로그에 신규 마일스톤(예: Port Departure) 추가 확인
- **기대 결과**: 화주 타임라인 UI에 실시간 마일스톤이 배지와 함께 표시됨.
- **검증 포인트**: `tracking_logs` 테이블 레코드 및 화주 대시보드 UI 반영.

---

### E2E-05: 정산, 인보이스 발행 및 세금계산서
- **사전 조건**: 배송이 완료(`DELIVERED`)된 오더 존재.
- **수행 단계**:
    1. 어드민 `/ko/finance` 접속
    2. 대상 오더 선택 후 '정산 확정 및 인보이스 생성' 클릭
    3. `invoices` 테이블 신규 레코드 생성 확인
    4. `/ko/finance/documents` 접속 → '세금계산서 발행' 버튼 클릭
    5. `zen_tax_invoices` 테이블 레코드 생성 확인 (TX-XXXXXXXX 번호 채번)
    6. '엑셀 다운로드' 실행하여 `.xlsx` 파일 정상 생성 확인
- **기대 결과**: 확정된 비용 정보가 반영된 인보이스 및 세금계산서가 생성되고, 엑셀 파일 다운로드 완료.
- **검증 포인트**: `invoices` + `zen_tax_invoices` 테이블 데이터 및 엑셀 파일 유효성.

---

### E2E-06: VOC 상담 및 Quick Reply
- **사전 조건**: 화주가 로그인 상태이며 완료된 오더가 존재.
- **수행 단계**:
    1. 화주가 `/ko/support/qna/new` 접속하여 문의사항 작성 및 전송
    2. 어드민 `/ko/voc/admin`에서 신규 VOC 티켓 확인
    3. 'Quick Reply' 템플릿을 사용하여 답변 등록
- **기대 결과**: 화주가 `/ko/support/qna` 목록에서 즉시 답변 내용을 확인 가능.
- **검증 포인트**: `zen_voc` 테이블의 신규 레코드 및 `zen_voc_answers` 테이블의 `reply_content`, `is_resolved` 상태.

---

### E2E-07: 통관(CCL) 신고 및 상태 관리
- **사전 조건**: 어드민 계정으로 통관 관리 메뉴 접속.
- **수행 단계**:
    1. `/ko/admin/customs` 접속하여 특정 오더에 대한 '통관 신고 생성(createDeclaration)'
    2. 화물 설명 및 신고 금액 입력 후 '제출(Send)' 버튼 클릭 → `SUBMITTED` 상태 전환 확인
    3. 상세 모달(Eye)에서 처리 상태를 `APPROVED`로 수동 변경 후 저장
- **기대 결과**: 통관 상태 배지가 `PENDING` → `SUBMITTED` → `APPROVED`로 순차 변경됨.
- **검증 포인트**: `customs_declarations` 테이블의 `status` 값 변경 및 `resolved_at` 타임스탬프 설정 확인.

---

### E2E-08: 화주 통관 조회 및 관리자 메모
- **사전 조건**: E2E-07에서 통관 처리가 완료된 오더.
- **수행 단계**:
    1. 화주 계정으로 `/ko/orders/[orderId]` 접속
    2. 하단 '통관 정보' 섹션 확인 (OrderCustomsSection 컴포넌트)
    3. 신고 번호(`declaration_no`) 및 관리자 메모(`admin_note`) 표시 확인
    4. `/ko/mypage/customs` 접속하여 전체 통관 이력 조회
- **기대 결과**: 관리자가 입력한 메모 및 통관 상태가 화주에게 정확히 노출됨.
- **검증 포인트**: UI상에서 `admin_note` 필드 노출 및 다국어(i18n) 정합성 확인.

---

### E2E-09: 개인회원 등급 승급 신청 및 Admin 심사
- **사전 조건**: `INDIVIDUAL` 등급 화주 계정 로그인 상태.
- **수행 단계**:
    1. `/ko/mypage/grade` 접속 → 현재 등급(IRON 등) 및 승급 기준 확인
    2. '등급 승급 신청' 버튼 클릭 → 신청 사유 입력 후 제출
    3. `grade_promotion_request` 테이블 신규 레코드 생성 확인 (`status = 'PENDING'`)
    4. 어드민 계정으로 `/ko/admin/upgrade-requests` 접속 → 신청 목록에서 해당 건 확인
    5. '심사하기' 모달 → 심사 코멘트 입력 후 '승인' 처리
    6. 화주 계정으로 재로그인 → `/ko/mypage/grade`에서 변경된 등급 확인
- **기대 결과**: 화주 등급이 승급되고, `profiles` 테이블의 등급 코드가 변경됨.
- **검증 포인트**: `grade_promotion_request.status = 'APPROVED'`, `profiles.grade_code` 상향 변경 확인.

---

### E2E-10: 클레임 접수 및 CI/PL 다국어 문서 발행
- **사전 조건**: `DELIVERED` 상태의 오더가 존재하며 어드민 계정으로 로그인.
- **수행 단계**:
    1. `/ko/admin/claims` 접속 → '클레임 등록' 버튼 클릭
    2. 오더 선택, 클레임 유형(파손), 사고 내용 입력 후 저장
    3. `zen_claims` 테이블 신규 레코드 생성 확인
    4. '사고비 추가' 기능으로 배상 금액 입력 → `zen_incident_fees` 레코드 생성 확인
    5. 해당 오더의 `/ko/orders/[orderId]` 접속 → '문서 관리' 섹션에서 **상업송장(CI)** PDF 다운로드
    6. `/ko/finance/documents` 에서 **포장명세서(PL)** 발행 및 PDF 다운로드
    7. 언어 전환(ko → en) 후 동일 문서 재다운로드 → 다국어 내용 확인
- **기대 결과**: 클레임 등록 완료, CI/PL PDF 문서가 한글·영문 양 언어로 정상 생성·다운로드됨.
- **검증 포인트**: `zen_claims` + `zen_incident_fees` 레코드, PDF 파일 생성 성공, 다국어 필드값 상이 확인.

---

### E2E-11: 오더 QnA 어드민 인라인 답변
- **사전 조건**: 화주 계정 로그인, 특정 오더가 존재.
- **수행 단계**:
    1. 화주가 `/ko/support/qna/new` 접속 → 오더 선택 + 문의 내용 작성 후 제출
    2. `zen_qna` 테이블 신규 레코드 생성 확인
    3. 어드민 계정으로 `/ko/voc/admin` 접속 → 신규 QnA 확인
    4. 해당 문의 선택 → 인라인 답변 입력 후 '답변 등록' 클릭
    5. `zen_qna_answers` 테이블 레코드 생성 확인
    6. 화주 계정으로 `/ko/support/qna/[id]` 접속 → 어드민 답변 내용 즉시 노출 확인
- **기대 결과**: 화주 질문에 어드민 인라인 답변이 즉시 표시됨.
- **검증 포인트**: `zen_qna_answers.content` 저장값, `zen_qna.is_answered = true` 상태 확인.

---

### E2E-12: 복합 경로 최적화 3종 선택 및 마일스톤 확인
- **사전 조건**: `PENDING` 상태 오더 존재 및 운송 구간별 요율 데이터 설정 완료.
- **수행 단계**:
    1. 어드민 `/ko/orders/[orderId]` 접속 → `RouteOptimizationSection` 패널 확인
    2. COST(최저비용) / TIME(최단시간) / BALANCED(균형) 3종 옵션의 점수(`score`) 비교 표시 확인
    3. `zen_route_options` 테이블에 3종 레코드(`option_type`: COST/TIME/BALANCED) 존재 확인
    4. 'BALANCED' 경로 선택 → '경로 확정' 버튼 클릭
    5. `zen_order_routes` 테이블에 선택 경로 저장 확인 (`selected_option_id` 설정)
    6. `RouteConsistencyBadge` 정합성 배지가 확정 상태로 변경 확인
    7. 마일스톤 타임라인(출발 → 경유 → 도착 예정일) 시각화 표시 확인
- **기대 결과**: 3종 스코어링 비교 후 선택 경로가 확정 적용되며 마일스톤 타임라인이 시각적으로 표시됨.
- **검증 포인트**: `zen_order_routes.selected_option_id`, `zen_route_options.score` 3종 비교값, `RouteConsistencyBadge` 배지 상태.
