# TASK-B-176: zen_shxk_api_logs RLS 정책 확대 (Issue #664)

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-22 |
| **담당자** | Dave |
| **연결 이슈** | [#664](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/664) |
| **우선순위** | P3 |
| **상태** | 🔔 PR #??? |

## 개요

`zen_shxk_api_logs`(SHXK API 통합 감사 로그)의 RLS 정책 확대:
1. SELECT: ADMIN/MANAGER/SUPER_ADMIN 전용 → 전체 인증 사용자
2. INSERT: AGENCY 역할 명시 허용 (기존엔 admin류만 가능)

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:---------|
| `supabase/migrations/20260722000002_iss664_shxk_logs_rls_expand.sql` | SELECT + INSERT 정책 신규 |

## 신규 정책

| 정책 | CMD | 대상 | 조건 |
|:-----|:-----|:-----|:------|
| `authenticated_select_zen_shxk_api_logs` | SELECT | authenticated | true (전체) |
| `agency_insert_zen_shxk_api_logs` | INSERT | authenticated | `get_my_role() = 'AGENCY'` |

기존 `admin_all_zen_shxk_api_logs`(FOR ALL, admin류)는 유지.

## 검증

| 검증 항목 | 결과 |
|:----------|:-----|
| AGENCY INSERT (`agency@zenith.kr`) | ✅ |
| OPERATOR SELECT (`operator@zenith.kr`, 비관리자) | ✅ |
| TypeScript | 0 error (변경 없음) |

## 브랜치

- `fix/teamb-shxk-logs-select-all` (base `TeamB_Dev`)
- PR #???
