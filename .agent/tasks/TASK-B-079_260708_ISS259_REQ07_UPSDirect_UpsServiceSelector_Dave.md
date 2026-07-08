# TASK-B-079 — Issue #259 REQ-07 UPS Direct 운송 모드 추가 + UpsServiceSelector

> **발령일**: 2026-07-08
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Dave (D_Kai)
> **우선순위**: P1
> **상태**: 🔔 검토 요청
> **선행 Task**: TASK-B-076 ✅
> **연관 이슈**: [Issue #259](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/259)

---

## DoD

- [x] DB migration: zen_orders transport_mode CHECK에 'UPS' 추가
- [x] orderRegistrationSchema transport_mode 'UPS' + ups_service_family 필드
- [x] 운송 모드 버튼 'UPS Direct' 추가 (PackageCheck icon)
- [x] UpsServiceSelector 컴포넌트 (4개 서비스 카드)
- [x] Step 2 분기: UPS → UpsServiceSelector
- [x] onSubmit ups_product_code 자동 결정 (content_type 기반)
- [x] 포트 필터 UPS → AIR 매핑
- [x] 회귀 PASS + build PASS

---

## [작업 결과]

| # | 항목 | 파일 |
|:-:|:-----|:-----|
| ① | migration | `supabase/migrations/20260708000300_ord_002_ups_transport_mode.sql` |
| ② | schema | `validation/order.ts` — transport_mode UPS + ups_service_family |
| ③ | 버튼 | `OrderRegistrationForm.tsx` — UPS Direct 버튼 추가 |
| ④ | 컴포넌트 | `UpsServiceSelector.tsx` — 4개 서비스 카드 |
| ⑤ | 분기 | Step 2 UPS → UpsServiceSelector |
| ⑥ | submit | ups_product_code content_type 기반 자동 결정 |
| ⑦ | 포트 | UPS → AIR 매핑 |

### 검증
- **코드 커밋**: `{hash}`
- **회귀**: 489/489 PASS (81 files)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-08 | Jaison | TASK-B-079 발령 — REQ-07 UPS Direct |
| 2026-07-08 | Dave | TASK-B-079 🔔 구현 완료 |
