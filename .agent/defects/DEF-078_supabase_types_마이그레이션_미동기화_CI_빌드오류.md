# DEF-078 — supabase.ts 타입 재생성 누락으로 인한 CI 빌드 오류

> **DEF-ID**: DEF-078
> **발견일**: 2026-06-24
> **발견자**: Aiden (Edward 이메일 수신 후 조사)
> **긴급도**: 즉시
> **상태**: 수정 완료 (PR #100 제출)

---

## 발견 경위

Edward가 GitHub Actions 실패 이메일을 수신:
> "[EdwardKwon89/ZENITH.KR.LMS] PR run failed: PR Checks - [OpenCode] feat: TASK-165 E2E-26 UPS Invoice PDF 텍스트 추출 검증 자동화 (UAT-19) (3b73e9b)"

PR #96 (TASK-165, D_Kai) 머지 직후 `develop` 브랜치 CI가 FAILURE 상태가 됨.

---

## 현상

```
./src/app/actions/operations/orders.ts:108:35
Type error: Property 'id' does not exist on type
'SelectQueryError<"column 'domestic_ref_no' does not exist on 'zen_order_packages'.">'.
```

Supabase TypeScript 클라이언트가 `zen_order_packages.domestic_ref_no`를 알 수 없는 컬럼으로 인식하여 `SelectQueryError` 타입을 반환 → `id` 프로퍼티 접근 불가.

---

## 근본 원인

마이그레이션 `20260614000600_ups_007_existing_tables_extend.sql`에서 `zen_order_packages`에 `domestic_ref_no`, `intl_ref_no` 컬럼이 추가됐으나, `src/types/supabase.ts` 파일이 재생성되지 않아 타입-스키마 불일치 발생.

TASK-165(D_Kai)에서 DEF-076으로 `order.repository.ts` SELECT에 컬럼을 추가했으나, 타입 파일 미갱신 상태로 PR이 제출·머지됨.

---

## 영향 범위

- `develop` 브랜치 전체 CI (Regression Tests) FAILURE
- 빌드 실패로 인해 `npm run build` 불가 상태

---

## 수정 내용

`supabase gen types typescript --local 2>/dev/null > src/types/supabase.ts`로 전체 타입 재생성.

- **수정 PR**: [#100](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/100)
- **수정 브랜치**: `fix/supabase-types-regen-zen-order-packages`
- **커밋**: [Claude] fix: supabase.ts 타입 재생성 — zen_order_packages domestic/intl_ref_no 누락

---

## 재발 방지 권장 조치

1. **R-09 확장**: 마이그레이션 추가 시 `supabase gen types typescript --local > src/types/supabase.ts` 실행을 필수 체크리스트 항목으로 추가
2. **pr-checks.yml 개선**: CI에 `supabase gen types` 결과와 커밋된 `supabase.ts` 일치 여부 검증 단계 추가 (선택적)
3. **IMP 등록**: IMP-136으로 "supabase.ts 타입 자동 동기화 개선" 등록 권고

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | 결함 발견 및 핫픽스 PR #100 제출 |
