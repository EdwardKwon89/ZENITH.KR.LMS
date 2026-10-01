# TASK-B-327 R-10 — 무역서류 처리 완료 메시지 실제 UI 검증

- **검증일:** 2026-10-01
- **대상 오더:** `ZEN-2026-000007` (`5007d8bc-3059-4443-a0c5-c2bd7782ca4d`, 활성 라벨 보유)
- **계정:** `admin@zenith.kr` (ADMIN)
- **환경:** 로컬 dev + `SHXK_TEST_MOCK=true` (mock `lable_file`을 로컬 PDF 서버로 반환하도록 하여 다운로드/저장 성공 경로 재현)

## 검증 (실제 UI)

오더 상세 → 우측 "무역서류 관리" → 각 버튼 클릭 → 미리보기 팝업 "확인" → 결과 확인.

| 버튼 | 완료 토스트 ("문서 처리가 완료되었습니다.") | "문서 열기" 링크 | 결과 팝업 |
| :--- | :---: | :---: | :--- |
| 운송장 (WAYBILL) | ✅ 표시 | ✅ 표시 | `SHXK Response — WAYBILL`, `success:true`, signed URL |

증적: `1-waybill-after-confirm.png`

- 수정 전: 완료 토스트·refresh 없이 raw JSON 팝업만 뜸 → "처리가 안 된 것 같다"는 오인 유발(DEF-B-147 현상 1).
- 수정 후: `success:true` 시 완료 토스트 + `router.refresh()` 호출 → 결과 팝업에도 "문서 열기" 버튼 노출.

### INVOICE 버튼 (현상 2 관련 UI 증거)

증적: `1-invoice-after-confirm.png`

- UI 버튼 라벨: **"Invoice (배송물류)"** (`logistics_invoice` → `lable_content_type=3`)
- 결과 팝업 제목: **"SHXK Response — INVOICE"**
- 실제 SHXK가 `content_type=3`에 대해 반환하는 문서는 **운송장(배송물류)**이며, 상업 인보이스가 아니다 → 상세는 `R10_INVOICE_content_type3_finding.md` 참조.

## ② 조사 요약 (실제 SHXK 발급)

`R10_INVOICE_content_type3_finding.md` 참조 — 실 API로 발급한 결과 `content_type=1`(운송장)과 `content_type=3`(INVOICE 버튼)이 **SHA-256 동일 파일**(운송장 라벨)로 확인됨. 데이터 누락이 아니라 문서 유형 매핑/설계 문제로 확정.
