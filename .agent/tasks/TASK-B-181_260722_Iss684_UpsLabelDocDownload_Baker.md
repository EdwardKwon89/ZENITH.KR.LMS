# TASK-B-181: Issue #684 — UPS 라벨/무역서류 실제 다운로드 후 자체 스토리지 저장 (다중 문서 지원)

- **Task ID**: TASK-B-181
- **Issue**: #684
- **Date**: 260722
- **Agent**: Baker (Big Pickle)
- **Branch**: `feature/teamb-181-ups-label-doc-download`
- **Base**: `TeamB_Dev`

## Scope

### 신규 테이블
- `zen_ups_label_documents`: SHXK 외부 URL PDF를 다운로드하여 Supabase Storage에 보관 후 메타데이터 기록
  - order_id, label_id, reference_no, content_type, doc_type, storage_path, original_url, file_size_bytes
  - **AGENCY RLS 포함 (DEF-114/116/117 전례 반영)**: agency_org_id 기반 SELECT/INSERT 정책 처음부터 포함

### Storage RLS
- `invoices` 버킷에 AGENCY 역할 업로드/조회 정책 추가 (`ups-labels/` prefix)

### 공용 헬퍼 함수
- `downloadAndStoreLabelDoc()`: fetch → Supabase Storage 업로드 → zen_ups_label_documents insert → signed URL 반환
  - `invoice-files.ts`의 `generateInvoicePdf()` 패턴 재사용

### 호출부 3곳 수정
- `fetchAndSaveLabel()`: getnewlabel 응답 배열 각 항목을 다운로드+저장 후 signed URL 반환
- `fetchAndIssueUpsLabel()`: docType별 getnewlabel 호출 → 각 항목 다운로드+저장 → signed URL 반환
- `fetchShxkTradeDocument()`: 동일 패턴 적용

### UI 수정
- `OutboundProcessForm.tsx`: `handlePrintLabel` COMBINED 시 `urls[]` 처리 추가

## Files Modified
- `src/app/actions/operations/ups-labels.ts` — downloadAndStoreLabelDoc + 3개 호출부 수정
- `src/components/warehouse/OutboundProcessForm.tsx` — COMBINED urls 처리

## Files Created
- `supabase/migrations/20260722000003_iss684_ups_label_documents.sql`
- `supabase/migrations/20260722000004_iss684_invoices_bucket_agency_rls.sql`
- `tests/unit/ups/ups-labels-download-store.test.ts`

## PR#687 반려 재작업 (260722)

jungjs 리뷰 반영 — 3건 전량 수정 완료:

1. **[Required] Storage bucket INSERT RLS agency_org_id 스코프 강화**: `zen_orders.agency_org_id = caller org_id` 조건 추가 (`storage.foldername(name)` → order_id lookup)
2. **[Suggested] SHXK URL 폴백 제거**: `fetchAndSaveLabel`/`fetchAndIssueUpsLabel`에서 SHXK 원본 URL 폴백 삭제 — 다운로드 실패 시 signed URL null 반환 (UI에 SHXK 원본 노출 방지)
3. **[Suggested] 테스트 설명 한글화**: `it()` descriptions Japanese/Chinese → Korean 통일

### 재작업 후 추가 수정
- `ups-labels-split.test.ts`: `downloadAndStoreLabelDoc` mock 추가 (supabase.storage + globalThis.fetch), 2건 assertion signed URL 대응
- **회귀: 112 files, 742 tests ALL PASS**
- **커밋: `339343b9`**

## Tests
- `ups-labels-download-store.test.ts`: 8건 (다운로드+업로드, 메타데이터 저장, content_type별 doc_type 매핑, fetch/upload/insert 실패 시나리오)
- **회귀: 112 files, 742 tests ALL PASS**
- **CI: PASS** (Regression Tests + Task File Check + Vercel · [PR#687](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/687))
