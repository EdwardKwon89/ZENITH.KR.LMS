# TASK-B-068 — Issue #231 정산 분리: 화주→Agency, Agency→플랫폼 청구 구분

> **발령일**: 2026-07-07
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Dave (D_Kai)
> **우선순위**: P1
> **상태**: 🔔 검토 요청
> **선행 Task**: TASK-B-060 ✅ (PR#243)
> **연관 이슈**: [Issue #231](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/231)

---

## 배경

An-14 §11 항목4 — 화주→Agency 청구와 Agency→플랫폼 청구를 구분하는 정산 로직 구현.

데이터 출처: `zen_order_rate_snapshots.metadata` JSONB
- `metadata.shipper.finalFreight` → 화주 납부액
- `metadata.agency.agencySellingPrice` → Agency 납부액
- `applied_unit_price` → 플랫폼 원가

---

## 작업 범위

| § | 파일 | 내용 |
|:-:|:-----|:-----|
| §1 | `src/lib/actions/ups-daily-close.shared.ts` | `AgencySettlementRow` 타입 신규 |
| §2 | `src/lib/actions/ups-daily-close.ts` | `getDailyRevenueSummary` — metadata 조회 추가. `getDailyAgencySettlementSummary(date)` 신규 액션 |
| §3 | `src/app/.../daily-close/AgencySettlementCard.tsx` | 신규 — Agency별 청구 요약 카드 (50줄 이하) |
| §4 | `src/app/.../daily-close/DailyCloseClient.tsx` | AgencySettlementCard 연동 |

---

## DoD (완료 기준)

- [x] `AgencySettlementRow` 타입 정의 (shared)
- [x] `getDailyAgencySettlementSummary()` — agencyName/shipperRevenue/agencyRevenue/pgCount 집계
- [x] `AgencySettlementCard.tsx` — Agency별 정산 테이블
- [x] `DailyCloseClient.tsx` — AgencySettlementCard 렌더링
- [x] 기존 TC-P7-CLOSE-03 mock 보완 (metadata·zen_orders·zen_organizations)
- [x] 전체 회귀 PASS (489/489, 81 files)
- [x] R-17 커밋 분리: 코드 커밋 / 문서 커밋
- [x] PR 생성 (`Closes #231`, develop 대상)

---

## [작업 결과]

### 처리 완료

| § | 변경 파일 | 주요 변경 |
|:-:|:---------|:----------|
| §1 | `ups-daily-close.shared.ts` | `AgencySettlementRow` 인터페이스 6개 필드 추가 |
| §2 | `ups-daily-close.ts` | `getDailyRevenueSummary`에 `metadata`·`zen_orders`·`zen_organizations` 조인. `getDailyAgencySettlementSummary` 신규 (Agency별 합계 반환) |
| §3 | `AgencySettlementCard.tsx` | Agency명/패키지수/화주납부액/Agency납부액 테이블 + 합계 row |
| §4 | `DailyCloseClient.tsx` | `getDailyAgencySettlementSummary` 호출 + `AgencySettlementCard` 렌더링 추가 |

### 검증
- **코드 커밋**: `1c62b55`
- **회귀**: 489/489 PASS (81 files)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-07 | Jaison | TASK-B-068 발령 — Issue #231 정산 분리 |
| 2026-07-07 | Dave | TASK-B-068 🔔 구현 완료 — 코드 `1c62b55` · 회귀 489/489 PASS |
