# TASK-B-152: Issue #559 — 무역서류 관리 UPS 문서 조회/취소 버튼

**담당**: Dave
**생성일**: 2026-07-17
**우선순위**: P2
**상태**: 🔔

---

## [작업 결과]

### 변경 파일
1. `src/app/actions/operations/ups-labels.ts` — `getUpsLabelStatus` + `fetchShxkTradeDocument` 추가
2. `src/components/orders/UpsTradeDocumentActions.tsx` (신규) — 4개 버튼 컴포넌트
3. `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx` — `isUpsOrder` 수정 + 컴포넌트 배치
4. `messages/en.json`, `messages/ko.json` — i18n 4개 키
5. `tests/unit/ups/ups-trade-documents.test.ts` (신규) — content_type 매핑 + 함수 존재 검증

### CI
Regression ✅ PASS

### 커밋
- `5a525ca6` — `[Dave] feat: Issue #559 — 무역서류 관리 UPS 문서 조회/취소 버튼`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/561
