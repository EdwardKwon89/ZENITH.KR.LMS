# TASK-B-182: Issue #695 — UPS접수취소 시 zen_ups_labels/zen_ups_label_documents/Storage 파일 정리 누락

- **Task ID**: TASK-B-182
- **Issue**: #695
- **Date**: 260722
- **Agent**: Baker (Big Pickle)
- **Branch**: `feature/teamb-182-ups-cancel-cleanup`
- **Base**: `TeamB_Dev`

## Scope

### 원인 1 수정 — 다중 라벨 전체 삭제
- `cancelUpsRegistration()`: `.limit(1).maybeSingle()` 제거 → 해당 오더의 non-voided 라벨 전체 조회
- `removeorder()`는 reference_no 기반이므로 1회 호출 유지 (모든 라벨이 동일 reference_no 공유)
- 라벨 삭제: `.eq('id', label.id)` → `.eq('order_id', orderId).eq('is_voided', false)` (markLabelVoidedByOrder 패턴 일관)

### 원인 2 수정 — FK SET NULL → CASCADE
- `zen_ups_label_documents.label_id`: `ON DELETE SET NULL` → `ON DELETE CASCADE`
- DB가 자동으로 연결된 문서 행 삭제 — 단 Storage 파일은 앱 코드에서 별도 처리

### 원인 3 수정 — Storage 파일 삭제
- 라벨 삭제 전 `zen_ups_label_documents`에서 `storage_path` 조회 → `supabase.storage.from('invoices').remove(storagePaths)` 호출
- Storage 삭제 실패 시 로깅만 하고 계속 진행 (label delete는 진행)

### AGENCY DELETE 정책 추가
- `zen_ups_label_documents`: AGENCY DELETE 정책 추가 (agency_org_id 스코프)
- `invoices` 버킷: AGENCY DELETE 정책 추가 (ups-labels/ prefix)

## Files Modified
- `src/app/actions/operations/ups-labels.ts` — `cancelUpsRegistration()` 전면 재작성

## Files Created
- `supabase/migrations/20260722000005_iss695_ups_cancel_cleanup.sql` — FK CASCADE + AGENCY DELETE 정책 2건

## Tests
- `ups-labels-split.test.ts`: 기존 3건 + 신규 4건 = 7건 (다중라벨 삭제, 문서존재시 Storage삭제, 문서미존재시 건너뜀, Storage삭제실패 시나리오)
- **회귀: 112 files, 746 tests ALL PASS**
- **CI: PASS** (Regression Tests + Task File Check + Vercel · [PR#696](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/696))

## PR#696 반려 재작업 (260722)

jungjs 리뷰 반영 — 1건 수정:

1. **[Required] zen_ups_labels AGENCY DELETE 정책 누락**: `cancelUpsRegistration()`의 최종 삭제 대상인 `zen_ups_labels` 테이블에 AGENCY DELETE 정책이 없어 AGENCY 사용자에게는 `success: true`가 반환되지만 실제 삭제 0건 (Supabase PostgREST RLS로 인해 에러 없이 빈 배열 반환). `ups_labels_agency_delete` 정책 추가 (agency_org_id 스코프)
