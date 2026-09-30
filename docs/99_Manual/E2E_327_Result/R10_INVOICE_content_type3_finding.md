# TASK-B-327 ② — INVOICE(content_type=3) 실제 SHXK PDF 실물 확인 결과

- **조사일:** 2026-10-01
- **방법:** 실제 SHXK API(`SHXK_TEST_MOCK=false`) 직접 호출 — 테스트 오더 `createorder` → `getnewlabel`(content_type 1/2/3) → PDF 다운로드 → `removeorder` 정리 (실 화물 생성 후 즉시 반납)
- **테스트 오더:** `ZEN327853120` / SHXK `order_id=800929` / 운송장 `1ZJ443D30431880058`
- **정리:** `removeorder` → `{"success":1,"cnmessage":"订单移除成功"}` (반납 완료)

## 결과

| 버튼 | `lable_content_type` | SHXK 문서명 | 파일 크기 | SHA-256 | 내용 |
| :--- | :---: | :--- | :---: | :--- | :--- |
| 운송장 (WAYBILL) | 1 | 운송장 | 45,197 B | `cfcb1107…` | UPS SAVER **운송장(라벨)** |
| 세관신고서 (CUSTOMS) | 2 | 세관신고서 | 208,965 B | `1af8afe6…` | 4페이지 세관/상업 인보이스 |
| **INVOICE 버튼** | **3** | **"배송물류"** | **45,197 B** | **`cfcb1107…`** | **운송장(라벨) — WAYBILL과 완전 동일** |

### 결정적 증거

- `INVOICE_content_type_3.pdf`와 `INVOICE_WAYBILL_content_type_1.pdf`는 **SHA-256 해시가 완전히 동일**(`cfcb11070ac485af322edea9a67a57eacc4d41b4b08ab32c24088ae87c5d67dd`) — SHXK이 두 요청에 대해 **같은 PDF URL/파일을 반환**했다.
- `INVOICE_content_type_3.png`(PDF에서 추출한 실제 이미지) — 내용은 **운송장 라벨**(트래킹 번호·바코드·SHP#·UPS SAVER·1P)로, 품목 라인/단가/금액이 **전혀 없다**.
- CUSTOMS(content_type=2)는 4페이지 문서로 품목·수량·금액이 포함됨(`contact paper,T shirts` 등) — 상업 인보이스에 해당하는 실제 내용은 이쪽에 있음.

### 판정

DEF-B-147 현상 2는 **"데이터 누락 버그"가 아니라 문서 유형 매핑/설계 문제**로 확정된다:

- SHXK 공식 스펙상 `lable_content_type=3`은 **"배송물류"** 문서이며 상업송장(Invoice)이 아니다. SHXK API에는 별도의 "인보이스" 문서 유형이 존재하지 않는다.
- 그 결과 "INVOICE" 버튼이 실제로는 **운송장을 반환**하고 있어, 고객이 기대한 상업 인보이스 내용(품목·금액)이 없어 "빈 문서"로 보였다.
- **조치 제안:** 버튼 라벨을 "배송물류 문서"로 정정하거나, 상업 인보이스가 필요하면 CUSTOMS(content_type=2) 문서를 노출하는 방향. **스코프 확대(자체 상업송장 PDF 생성, Issue #946 연계)는 이 Task 범위를 넘으므로 Jaison 승인 필요.**
- 본 Task에서는 ①(완료 메시지)만 수정하고, ②는 조사 결과 보고 + Jaison 판단 대기로 마무리한다(task file 지침 §49 준수).

## 파일

- `INVOICE_content_type_3.pdf` / `INVOICE_content_type_3.png` — INVOICE 버튼이 실제 반환한 운송장
- `INVOICE_WAYBILL_content_type_1.pdf` — WAYBILL(동일 해시)
- `INVOICE_CUSTOMS_content_type_2.pdf` — CUSTOMS(4페이지, 실제 품목/금액 포함)
- `shxk_real_fetch_results.json` — 호출 결과 원문
