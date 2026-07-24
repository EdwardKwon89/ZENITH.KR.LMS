# TASK-B-198: /finance/daily-billing 사이드바 메뉴 추가 (Issue #811, DEF-B-001)

| 항목 | 내용 |
|:-----|:------|
| **작성일** | 2026-07-26 |
| **담당자** | Dave |
| **연결 이슈** | [#811](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/811) |
| **우선순위** | P3 |
| **상태** | 🔔 PR #??? |

## 개요

`/finance/daily-billing` 페이지가 사이드바에서 누락되어 URL 직접 입력 외 접근 불가

## 변경 파일

| 파일 | 변경 |
|:-----|:------|
| `src/components/layout/NaviSidebar.tsx` | finance_group children에 `"/finance/daily-billing"` 항목 추가 |
| `messages/ko.json` | `"finance_daily_billing": "화주별 일별 청구"` |
| `messages/en.json` | `"finance_daily_billing": "Daily Billing by Shipper"` |
| `messages/ja.json` | `"finance_daily_billing": "荷主別日次請求"` |
| `messages/zh.json` | `"finance_daily_billing": "按货主每日结算"` |

## 검증

- TypeScript: 0 error
- Build: ✅

## 브랜치

- `fix/teamb-def-b-001-daily-billing-sidebar` (base `TeamB_Dev`)
