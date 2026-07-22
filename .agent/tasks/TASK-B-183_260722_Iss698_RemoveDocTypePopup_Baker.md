# TASK-B-183: Issue #698 — 출고확정 시 문서(운송장 등) 선택 팝업 삭제

- **Task ID**: TASK-B-183
- **Issue**: #698
- **Date**: 260722
- **Agent**: Baker (Big Pickle)
- **Branch**: `feature/teamb-183-remove-doctype-popup`
- **Base**: `TeamB_Dev`

## Scope

출고처리 화면(`OutboundProcessForm.tsx`)에서 PACKED 상태 오더 선택 시 뜨는 문서유형 선택 팝업 제거.
PACKED 오더는 개별 행의 "운송장 출력" 버튼으로 라벨 발급 가능하므로 중복 기능.

### 수정 상세
1. `docTypePopup` state 제거
2. `handleConfirmOutbound`에서 PACKED 오더 필터링 → `setDocTypePopup` 블록 제거
3. `handleDocTypeConfirm` 함수 전체 삭제
4. `docTypePopup` 관련 JSX 팝업 블록 삭제
5. `fetchAndIssueUpsLabel` import는 `handlePrintLabel`에서 계속 사용하므로 유지
6. 미사용 i18n 키 정리 (`doc_type_title`/`doc_type_desc`/`doc_type_waybill`/`doc_type_invoice`/`doc_type_customs` — ko/en/ja/zh 4개 언어)

## Files Modified
- `src/components/warehouse/OutboundProcessForm.tsx` — 107줄 삭제
- `messages/ko.json` — doc_type_* 키 5건 삭제
- `messages/en.json` — doc_type_* 키 5건 삭제
- `messages/ja.json` — doc_type_* 키 5건 삭제
- `messages/zh.json` — doc_type_* 키 5건 삭제

## Tests
- **회귀: 112 files, 746 tests ALL PASS**
- 기존 테스트 영향 없음 (docTypePopup 관련 단위 테스트 미존재)
- **CI: Regression Tests PASS, Task File Check PASS** (Vercel rate limited — 플랫폼 이슈)
