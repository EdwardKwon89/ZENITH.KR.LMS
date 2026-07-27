# TASK-B-234: Issue #917 — zen_invoices billed_org_id/invoice_tier 마이그레이션 (2단계 인보이스 스키마)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#917](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/917) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

Issue #916(2단계 인보이스 체계)의 1/4 단계. `zen_invoices`에 `billed_org_id`와 `invoice_tier` 컬럼을 추가하고, 기존 인보이스를 백필하며, AGENCY용 billed_org_id 기반 SELECT RLS 정책을 추가합니다.

## 조치안

### DB 마이그레이션 (`20260728100000_iss917_invoices_billed_org_id_tier.sql`)
- `billed_org_id UUID REFERENCES zen_organizations(id)` — 청구 대상 조직
- `invoice_tier TEXT CHECK (IN ('ADMIN_TO_AGENCY','AGENCY_TO_SHIPPER','ADMIN_TO_SHIPPER'))` — 청구 단계
- 인덱스 2개: `idx_zen_invoices_billed_org`, `idx_zen_invoices_tier`
- 백필: `billed_org_id = shipper_id`, `invoice_tier` = source_order_id의 agency_org_id 존재 여부로 분류
- AGENCY SELECT RLS: `billed_org_id = 본인 org_id`인 인보이스 조회 허용

### 로컬 DB 실측 검증 (psql)
- 컬럼 존재: `billed_org_id`, `invoice_tier` ✅
- 인덱스 존재: `idx_zen_invoices_billed_org`, `idx_zen_invoices_tier` ✅
- 백필 결과: 기존 인보이스 1건 → `billed_org_id=shipper_id`, `invoice_tier=AGENCY_TO_SHIPPER` ✅
- RLS 정책 5개 확인 (기존 4 + 신규 1) ✅

### 테스트 (`iss917-invoices-billed-org-tier-rls.test.ts`)
- 구조 검증 5건 (컬럼·인덱스·RLS·백필 SQL 포함 여부)
- 컬럼/인덱스 존재 확인 4건 (실제 DB 쿼리)
- AGENCY 세션 RLS 시뮬레이션 5건 (본인 조회 성공 / 타 org 조회 불가 / tier/billed_org_id 값 확인)
- 총 **14건 ALL PASS**

## 테스트 결과
- 회귀: **138/138 files · 934/934 tests ALL PASS**
- 빌드: 해당사항 없음 (스키마 변경만)

## 변경 파일
- `supabase/migrations/20260728100000_iss917_invoices_billed_org_id_tier.sql`
- `tests/unit/migrations/iss917-invoices-billed-org-tier-rls.test.ts`

## 후속 Issue
- #918 (인보이스 생성 로직), #919 (추가부가요금 반영), #920 (daily-billing UI) — 이 Task 머지 후 착수

## 완료보고 절차
1. 코드 커밋 ✅
2. task file 🔔 전환
3. ACTIVE_TASK.md 반영
4. PR 생성 (`Closes #917`)
