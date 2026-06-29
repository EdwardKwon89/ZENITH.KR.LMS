# UAT_19 — UPS 인보이스 PDF

> **문서번호**: UAT-19
> **작성일**: 2026-06-19
> **작성자**: Riley (Gemini)
> **버전**: v1.0
> **담당 문서**: [UAT_MASTER.md](UAT_MASTER.md)
> **관련 Task**: TASK-161 — Phase 7 UPS 특송 UAT 시나리오 작성

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
| 2 | /ko/orders/[id] | 화면 내 [인보이스 PDF 출력] 또는 [출력] 버튼 확인 및 클릭 | — | 인보이스 PDF 파일이 브라우저의 PDF 뷰어로 새 창 또는 모달 형식으로 정상 미리보기 렌더링됨 | ☐ |
| 3 | PDF 미리보기 화면 | 출력 양식 및 금액 일치 확인 | — | PDF 문서 본문에 오더 번호, 화주 정보, UPS 운송 정보 및 청구 금액이 정상 렌더링됨을 확인 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] PDF 출력 버튼 클릭 시 깨진 텍스트나 레이아웃 왜곡 없이 브라우저 PDF 뷰어가 실행됨
- [ ] 500 에러 없음

### 예상 DB 결과값 (UAT §4 체크리스트)

| 검증 포인트 | SQL | 예상 결과 |
|:-----------|:----|:---------|
| 인보이스 생성 확인 | `SELECT id, order_id, status, total_amount, created_at FROM zen_invoices WHERE order_id = '[오더ID]'` | 1 row, `status` = `'ISSUED'`, `total_amount` = 오더 정산 금액과 일치 |
| PDF 생성 이력 | `SELECT id, invoice_id, file_name, file_size, created_at FROM zen_invoice_files WHERE invoice_id = '[인보이스ID]' ORDER BY created_at DESC LIMIT 1` | `file_name` = `'Invoice_UPS_[오더번호].pdf'`, `file_size` > 0 |
| 오더 금액 정합성 | `SELECT o.order_no, o.total_freight, i.total_amount FROM zen_orders o JOIN zen_invoices i ON i.order_id = o.id WHERE o.id = '[오더ID]'` | `o.total_freight` = `i.total_amount` (정합) |
| 스냅샷 데이터 존재 | `SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | > 0 (PDF 내 금액 표기용 데이터 존재) |

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |

---

## [UAT-19-02] 인보이스 PDF 다운로드 파일명 및 물류 상세 항목 무결성 검증

| 항목 | 내용 |
|:----|:----|
| 역할 | SHIPPER (화주) 또는 ADMIN |
| 화면 URL | /ko/orders/[id] |
| 예상 소요 시간 | 5분 |
| 사전 조건 | UAT-19-01의 PDF 미리보기 화면이 정상 실행 가능할 것 |

### 테스트 절차

| 순서 | 화면·URL | 수행 액션 | 입력 데이터 | 기대 결과 | 확인 |
|:---:|:---------|:---------|:-----------|:---------|:----:|
| 1 | /ko/orders/[id] | PDF 미리보기 윈도우 또는 상세 페이지에서 [PDF 다운로드] 클릭 | — | 로컬 디바이스에 PDF 파일 다운로드 실행 | ☐ |
| 2 | 로컬 다운로드 폴더 | 다운로드된 파일명 규칙 검증 | — | 파일명이 `Invoice_UPS_[오더번호].pdf` 형태로 매핑되어 저장됨을 확인 | ☐ |
| 3 | 로컬 PDF 리더 | PDF 문서 상세 내용 검증 | — | PDF 파일 내부의 표기 항목(송하인/수하인 정보, 패키지 상세 중량, 볼륨, 마크업된 최종 Selling Price 금액 등)이 DB 스냅샷 데이터와 완전히 일치하는지 검증 | ☐ |

### 합격 기준
- [ ] 전 단계 ☑ 완료
- [ ] 다운로드된 파일명 형식이 규격에 맞게 생성됨
- [ ] PDF 내 기재 금액 및 패키지 사양이 실제 오더 데이터와 정확히 1:1 일치함
- [ ] 500 에러 없음

### 예상 DB 결과값 (UAT §4 체크리스트)

| 검증 포인트 | SQL | 예상 결과 |
|:-----------|:----|:---------|
| 파일명 규격 | `SELECT file_name FROM zen_invoice_files WHERE invoice_id = '[인보이스ID]'` | `'Invoice_UPS_[오더번호].pdf'` 패턴 일치 (예: `Invoice_UPS_ORD-20260629-001.pdf`) |
| 패키지 정보 정합성 | `SELECT pkg_seq, weight_kg, volume_cbm, description FROM zen_order_packages WHERE order_id = '[오더ID]' ORDER BY pkg_seq` | PDF 내 패키지 목록과 1:1 일치 (seq·중량·볼륨·품명) |
| Selling Price 정합성 | `SELECT applied_unit_price, override_type, override_value FROM zen_order_rate_snapshots WHERE order_id = '[오더ID]'` | `applied_unit_price` = PDF Selling Price 필드값과 일치 |
| 송하인/수하인 정합성 | `SELECT shipper_name, consignee_name, origin_code, dest_code FROM zen_orders WHERE id = '[오더ID]'` | PDF 내 송하인·수하인·출발지·도착지 정보와 일치 |
| 통화 일치 | `SELECT currency FROM zen_orders WHERE id = '[오더ID]'` | PDF 금액 표기 통화와 일치 (예: `USD`) |

### 결함 기재란

| 결함-ID | 단계 | 현상 | 심각도 |
|:-------:|:---:|:-----|:------:|
| | | | |
