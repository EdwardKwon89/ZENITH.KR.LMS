# UAT_19 — UPS 인보이스 PDF

> **문서번호**: UAT-19
> **작성일**: 2026-07-15
> **작성자**: Riley (Gemini)
> **버전**: v3.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-185 — [Team A] UPS 급증 긴급 수수료 반영 — UAT-17/19 시나리오 갱신 (Issue #496)

> [!IMPORTANT]
> **v3.0 개정 사항 (2026-07-15, Riley)**
> - **급증 긴급 수수료(Surge Emergency Fee) 표출 검증 반영**: 인보이스 PDF 출력 시 급증 긴급 수수료가 정상적으로 포함되어 표출되는지 검증하기 위한 시나리오 추가 검토 및 절차 기술. (UAT-19-02 시나리오 내에 다운로드된 PDF 문서 내 급증 긴급 수수료 라인 확인 절차 및 DB 정합성 대조 항목 보강)
> - (참고: 기존 v2.0의 클라이언트 사이드 PDF 다운로드 특성 반영 및 파일명 정규식 패턴 `/UPS_INVOICE_.+\.pdf/` 기준도 함께 유지됩니다.)

---

## [UAT-19-01] UPS 오더 상세 화면에서 간이 인보이스 PDF 출력(미리보기) 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER (화주) 또는 ADMIN |
| 화면 URL | /ko/orders/[id] |
| 예상 소요 시간 | 5분 |
| 사전 조건 | 정산 완료 단계 또는 인보이스가 생성된 UPS 오더 1건 이상 존재 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders | 오더 목록에서 해당 UPS 오더의 [상세] 아이콘 또는 번호 클릭 | — | 오더 상세 페이지 진입 | ☐ |
| 2 | /ko/orders/[id] | 화면 내 우측 무역 서류 섹션에서 [인보이스 (UPS)] 버튼 클릭 | — | 인보이스 PDF 파일이 브라우저에서 동적으로 생성되어 다운로드 완료됨 | ☐ |
| 3 | 다운로드된 PDF 파일 | 출력 양식 및 금액 일치 확인 | — | PDF 문서 본문에 오더 번호, 화주 정보, UPS 운송 정보 및 청구 금액이 정상 렌더링됨을 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] PDF 출력 버튼 클릭 시 깨진 텍스트나 레이아웃 왜곡 없이 PDF 다운로드가 실행됨
- [ ] 500 에러 없음

### 예상 DB 결과값 (UAT §4 체크리스트)

| 검증 포인트 | SQL | 예상 결과 |
|:-----------|:----|:---------|
| 인보이스 생성 확인 | `SELECT id, order_id, status, total_amount, created_at FROM zen_invoices WHERE order_id = '[오더ID]'` | 1 row, `status` = `'ISSUED'` 또는 `'PAID'`, `total_amount` = 오더 정산 금액과 일치 |
| 오더 금액 정합성 | `SELECT o.order_no, o.total_freight, i.total_amount FROM zen_orders o JOIN zen_invoices i ON i.order_id = o.id WHERE o.id = '[오더ID]'` | `o.total_freight` = `i.total_amount` (정합) |
| 스냅샷 데이터 존재 | `SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | > 0 (PDF 내 금액 표기용 데이터 존재) |
| PDF 파일 생성 이력 | — | (클라이언트 브라우저 생성 방식이므로 `zen_invoice_files` DB 레코드는 생성되지 않음) |

---

## [UAT-19-02] 인보이스 PDF 다운로드 파일명 및 물류 상세 항목 무결성 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER (화주) 또는 ADMIN |
| 화면 URL | /ko/orders/[id] 또는 /ko/finance/invoices |
| 예상 소요 시간 | 7분 |
| 사전 조건 | UAT-19-01의 PDF 파일 다운로드가 정상 실행 가능하며, 정산 프로세스를 통해 금융 정산용 인보이스가 발행된 상태일 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | 상세 페이지에서 [인보이스 (UPS)] 다운로드 클릭 | — | 로컬 디바이스에 PDF 파일 다운로드 실행 | ☐ |
| 2 | 로컬 다운로드 폴더 | 다운로드된 파일명 규칙 검증 | — | 파일명이 `UPS_INVOICE_[오더ID]_[날짜].pdf` 형태로 생성되어 매핑됨을 확인 (예: `UPS_INVOICE_7e12f3e8-8888-4444-9999-bbbbccccdddd_20260713.pdf` 등, 정규식 `/UPS_INVOICE_.+\.pdf/` 패스) | ☐ |
| 3 | 로컬 PDF 리더 | PDF 문서 상세 내용 검증 | — | PDF 파일 내부의 표기 항목(송하인/수하인 정보, 패키지 상세 중량, 볼륨, 통관용 신고가액 등)이 DB 스냅샷 데이터와 일치하는지 확인 | ☐ |
| 4 | /ko/finance/invoices | 발행된 금융 정산용 인보이스 PDF를 다운로드하여 운임 반영 여부 검증 | — | 다운로드된 금융 인보이스 PDF 내 비용 청구 테이블(Charges)의 **FREIGHT** 항목 총액이 [기본운임 × (1 - 0.10) + 유류할증료 + 급증 수수료]가 모두 올바르게 합산된 최종 Selling Price 금액과 일치하는지 검증 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 다운로드된 파일명 형식이 `/UPS_INVOICE_.+\.pdf/` 정규식 규격에 맞게 생성됨
- [ ] 간이 통관 인보이스 PDF 내 기재 사양이 실제 오더 패키지와 정확히 1:1 일치함
- [ ] 금융 정산 인보이스 PDF 내의 FREIGHT 운임 항목에 급증 긴급 수수료를 포함한 전체 최종 운임이 누락 없이 합산되어 정확히 출력됨
- [ ] 500 에러 없음

### 예상 DB 결과값 (UAT §4 체크리스트)

| 검증 포인트 | SQL | 예상 결과 |
|:-----------|:----|:---------|
| 패키지 정보 정합성 | `SELECT packing_unit, packing_count, gross_weight, volume, intl_ref_no FROM zen_order_packages WHERE order_id = '[오더ID]' ORDER BY created_at` | PDF 내 패키지 목록과 1:1 일치 (개수·중량·체적·송장번호) |
| Selling Price 정합성 | `SELECT applied_unit_price, applied_currency, applied_rule FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | `applied_unit_price` = 간이 인보이스 PDF Selling Price 필드값과 일치 |
| 급증 긴급 수수료 정산 데이터 정합성 | `SELECT metadata->'shipper'->>'surgeFeeSellingAmount' FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | `10000.00` (또는 유류할증료가 적용된 경우 유류할증료 포함 계산값) |
| FREIGHT 운임 정산 데이터 정합성 | `SELECT cost_type, total_amount, currency FROM zen_order_costs WHERE order_id = '[오더ID]' AND cost_type = 'FREIGHT'` | `total_amount` = 금융 인보이스 PDF 내 FREIGHT 항목 총액과 일치 |
| 송하인/수하인 정합성 | `SELECT shipper_id, recipient_name, recipient_address, transport_mode, ups_product_code, incoterms FROM zen_orders WHERE id = '[오더ID]'` | PDF 내 송하인·수하인·출발지·도착지 정보와 일치 |
| 통화 일치 | `SELECT currency FROM zen_orders WHERE id = '[오더ID]'` | PDF 금액 표기 통화와 일치 (예: `USD` 또는 `KRW`) |
