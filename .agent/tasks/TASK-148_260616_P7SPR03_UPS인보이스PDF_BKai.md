# TASK-148 — [P7-SPR-03] 간이 UPS 인보이스 PDF 출력

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-148 |
| **생성일** | 2026-06-16 |
| **할당 Agent** | B_Kai |
| **우선순위** | P2 |
| **전제조건** | TASK-138 ✅ (zen_order_packages 컬럼 존재) · TASK-146 ✅ (UPS 제품/구조 참고) |
| **관련 IMP** | IMP-117 |
| **브랜치** | `feature/ups-spr03-bkai-invoice-pdf` (신규 독립 브랜치) |
| **커밋 태그** | `[B_Kai]` |
| **상태** | ⬜ |

---

## [목표]

UPS 국제 특송 오더에 대해 세관 신고용 **간이 상업 송장(Simplified Commercial Invoice) PDF**를 생성하고 다운로드할 수 있는 기능을 구현한다.  
기존 PDF 인프라(IMP-061)를 재활용하여 최소 범위로 완성한다.

---

## [작업 범위]

### 1. 간이 인보이스 PDF 생성 API

`src/app/api/orders/[id]/ups-invoice/route.ts` 신규 (또는 Server Action 방식 선택)

**PDF 포함 내용**:
- **헤더**: 회사 로고/명칭, 발행일, 인보이스 번호 (오더 ID 기반)
- **발송인 (Shipper)**: 화주 조직명, 주소, 연락처
- **수취인 (Consignee)**: 수하인 성명, 주소, 연락처, 국가코드
- **패키지 목록** (zen_order_packages):
  - PKG 순번 (ref_seq), domestic_ref_no, intl_ref_no (있을 경우)
  - 실중량 (actual_weight_kg), 부피중량 계산값
  - 품목명, 수량, 신고가격 (USD)
- **UPS 서비스**: 제품명 (product_code), Zone, 배송방법 (delivery_method)
- **합계**: 총 중량, 총 신고가격
- **서명란**: 발송인 서명 (공란)
- **주의사항**: "For Customs Purposes Only" 문구

**구현 방식**: 기존 `@react-pdf/renderer` 또는 `jspdf` 활용 (프로젝트 내 기존 방식 확인 후 선택)

### 2. 오더 상세 페이지 버튼 추가

대상: `src/app/[locale]/(dashboard)/orders/[id]/` 페이지 또는 창고 출고 화면

- "간이 인보이스 출력" 버튼 추가
- 클릭 시 PDF 다운로드 (파일명: `UPS_INVOICE_{orderId}_{YYYYMMDD}.pdf`)
- UPS 오더가 아닌 경우 버튼 비표시 (zen_orders의 UPS 관련 필드 확인)

### 3. 권한 제어

- ADMIN / MANAGER / SHIPPER (본인 오더) / AGENCY (관리 화주 오더): 출력 허용
- 타 역할: 버튼 미표시

### 4. i18n

`messages/ko.json`, `messages/en.json`:
- `orders.ups_invoice.title`
- `orders.ups_invoice.download_button`
- `orders.ups_invoice.shipper`
- `orders.ups_invoice.consignee`

### 5. 테스트

`tests/unit/orders/ups-invoice.test.ts` — TC-UPS-INV 신규:
- TC-UPS-INV-01: PDF 생성 — 필수 필드 전체 포함 여부 확인
- TC-UPS-INV-02: RBAC — SHIPPER 본인 오더 출력 가능, 타 오더 403

---

## [DoD]

- [ ] 간이 인보이스 PDF 생성 기능 구현 (필수 필드 전체 포함)
- [ ] 오더 상세/출고 화면 다운로드 버튼 추가 + RBAC 제어
- [ ] i18n ko/en 키 추가
- [ ] `npm run test:regression` 전체 PASS
- [ ] LIVE_REGRESSION_TEST_MAP.md TC-UPS-INV 등재
- [ ] 빌드 0 Errors
- [ ] 코드 커밋 해시: `________`
- [ ] 문서 커밋 해시: `________`
- [ ] `check-R17-DoD` 실행 완료 — 전항목 ✅

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[B_Kai] feat: TASK-148 IMP-117 UPS 간이 인보이스 PDF 출력`
2. **본 파일 `[작업 결과]` 작성** + 헤더 상태 🔔 변경 + 코드 커밋 해시 기재
3. **ACTIVE_TASK.md** ⬜→🔔 반영
4. **IMP_PROGRESS.md** IMP-117 행 🔔 갱신
5. **`check-R17-DoD` 실행** — 전항목 통과 확인
6. **[문서 커밋]** `[B_Kai] docs: TASK-148 완료 보고 — IMP-117 UPS 인보이스 PDF 🔔`
   - 포함: task file + ACTIVE_TASK.md + IMP_PROGRESS.md + LIVE_REGRESSION_TEST_MAP.md

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## [Aiden 검토]

_(Aiden 검토 후 기재)_

---

## [작업 결과]

_(B_Kai가 작성 — 완료 후 기재)_

TBD
