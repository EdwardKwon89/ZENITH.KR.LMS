# TASK-B-156 — Issue #569 createorder 버튼 issueUpsLabel 연결

**생성일:** 2026-07-17
**담당:** Dave (DeepSeek V4 Flash Free)
**태그:** `[Dave]`

---

## 완료 조건 (DoD)

- [x] `UpsTradeDocumentActions.tsx` import `triggerCreateOrderTest` → `issueUpsLabel` 교체
- [x] `handleConfirmPreview` CREATEORDER 분기 → `issueUpsLabel(orderId)` 호출 + `router.refresh()` + 반환 타입 필드명 수정
- [x] 테스트 갱신 — `triggerCreateOrderTest` → `issueUpsLabel` 참조, `triggerCreateOrderTest` 미참조 확인
- [x] `npm run build` PASS
- [x] `npx vitest run tests/unit/ups/` 121/121 PASS
- [x] PR 생성 (base: `integration/teamb-260716`)
- [x] Jaison 보고

---

## 변경 파일

| 파일 | 변경 | 설명 |
|:-----|:----|:-----|
| `src/components/orders/UpsTradeDocumentActions.tsx` | 수정 | import 교체 + handler 수정 |
| `tests/unit/ups/ups-trade-documents.test.ts` | 수정 | `triggerCreateOrderTest` → `issueUpsLabel` 참조 갱신 |

---

## 참고

- `triggerCreateOrderTest` 서버 액션은 dead code로 남겨둠 (Jaison 설계)
- `zen_ups_labels.reference_no` UNIQUE 제약은 의도된 동작 (재발급은 VOID 후 필요)
