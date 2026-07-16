# TASK-B-149: Issue #553 — SHXK createorder 응답메시지 저장

**담당**: Dave
**생성일**: 2026-07-16
**우선순위**: P2
**상태**: 🔔

---

## [작업 결과]

### 변경 파일
1. `supabase/migrations/20260716110000_iss553_shxk_response_message.sql`
   - `zen_ups_labels.shxk_response_message` 컬럼 추가
   - `zen_ups_label_errors` 테이블 신규 (admin-only RLS, 의도적)
2. `src/app/actions/operations/ups-labels.ts`
   - `placeShxkOrder`: 성공/실패 반환에 `message` 필드 추가
   - `saveInitialLabel`: `responseMessage` 파라미터 추가
   - `issueUpsLabel`: 실패 시 `zen_ups_label_errors` INSERT
   - 데드코드 `getShxkResponseMessage()` 제거
3. `tests/unit/ups/ups-labels-errors.test.ts` (신규)

### CI
Regression ✅ PASS

### 커밋
- `1cd47738` — `[Dave] feat: Issue #553 — SHXK 응답메시지 저장 + 에러 테이블`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/555
