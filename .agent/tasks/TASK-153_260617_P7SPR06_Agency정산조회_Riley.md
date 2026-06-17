# TASK-153 — [P7-SPR-06] Agency 정산 조회

> **생성일**: 2026-06-17
> **발령자**: Aiden (ZEN_CEO)
> **담당**: Riley
> **우선순위**: P1
> **전제조건**: IMP-111 ✅ (Agency 역할 모델) · IMP-116 ✅ (Agency 요율 오버라이드)
> **관련 IMP**: IMP-122
> **브랜치**: `feature/ups-spr06-riley-agency-settlement`
> **GitHub Issue**: #25

---

## [목표]

Agency(대리점)가 자신의 하위 화주(Shipper)별 UPS 오더 정산 내역을 조회할 수 있는 화면을 구현한다.  
Agency 요율 오버라이드(zen_agency_rate_overrides)가 반영된 실제 정산 금액을 표시한다.

---

## [작업 범위]

### §1 — Server Actions: `src/lib/actions/agency-settlement.ts`

| 함수 | 설명 |
|:-----|:----|
| `getAgencySettlementSummary(agencyOrgId, from, to)` | Agency 전체 정산 요약 — 총 오더수·매출·매입·마진 |
| `getAgencyShipperSettlements(agencyOrgId, from, to)` | Agency 하위 화주별 정산 내역 목록 |
| `getAgencyOrderSettlements(agencyOrgId, shipperId?, from, to)` | 개별 오더 정산 상세 (화주 필터 선택) |

**조회 대상 테이블**:
- `zen_agency_shippers` — Agency 하위 화주 목록 (agency_org_id 기준)
- `zen_orders` — 오더 기본 정보
- `zen_order_rate_snapshots` — selling_price, cost_price (Agency 오버라이드 반영된 값)
- `zen_agency_rate_overrides` — Agency 요율 오버라이드 (참조용)
- `zen_order_packages` — PKG 개수·중량

Zod 스키마:
```ts
export const AgencySettlementQuerySchema = z.object({
  agency_org_id: z.string().uuid(),
  shipper_org_id: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

**RLS 주의**: Agency 사용자는 자신의 `agency_org_id` 하위 데이터만 접근 가능 (zen_agency_shippers 기반)

### §2 — Agency 정산 UI: `/[locale]/(dashboard)/agency/settlements/`

| 파일 | 내용 |
|:----|:----|
| `page.tsx` | 서버 컴포넌트 — 이번 달 기본 조회, AgencySettlementClient 렌더 |
| `AgencySettlementClient.tsx` | 기간 필터 + 요약 카드 + 화주별 정산 테이블 |
| `AgencySettlementSummary.tsx` | 총 오더수·매출·매입·마진 요약 카드 (4개) |
| `ShipperSettlementTable.tsx` | 화주별 정산 테이블 — 화주명·오더수·매출·매입·마진·마진율 |

**화면 구성**:
```
[기간 선택: from ~ to]  [조회]

┌─ 정산 요약 ──────────────────────────────────────┐
│ 총 오더수: NN   매출: NN,NNN   매입: NN,NNN   마진: NN,NNN │
└──────────────────────────────────────────────────┘

┌─ 화주별 정산 내역 ────────────────────────────────┐
│ 화주명 │ 오더수 │ 매출(KRW) │ 매입(KRW) │ 마진 │ 마진율 │ 상세 │
│  ...  │  ...  │    ...    │    ...    │ ... │  ...  │  [▼] │
└──────────────────────────────────────────────────┘
[CSV 내보내기]
```

NaviSidebar Agency 메뉴에 `정산 조회` 항목 추가 (AGENCY 역할) + i18n 키 추가

---

## [DoD — Definition of Done]

- [x] `getAgencySettlementSummary` — 기간 내 총 오더수·매출·매입·마진 정확도 확인
- [x] `getAgencyShipperSettlements` — Agency 하위 화주별 정산 내역 정확도 확인
- [x] Agency 요율 오버라이드(zen_agency_rate_overrides) 반영 여부 확인
- [x] RLS — Agency 사용자는 자신 하위 화주 데이터만 접근됨 확인
- [x] 정산 UI 페이지 렌더 정상 확인 (기간 선택 + 집계 결과 표시)
- [x] CSV 내보내기 동작 확인
- [x] NaviSidebar Agency 메뉴 `정산 조회` 추가 + i18n 키 추가
- [x] 회귀 테스트 전체 PASS (기존 + 신규 TC)
- [x] TC-P7-SETTLE-01~04 신규 회귀 TC 추가 + LIVE_REGRESSION_TEST_MAP.md 갱신
- [x] ZEN_A4 준수 (함수 ≤50줄, 파일 ≤1500줄)
- [x] 코드 커밋 해시 기재 (ce26adb)

---

## [회귀 TC 기준] TC-P7-SETTLE-01~04

| TC | 내용 |
|:--:|:----|
| TC-P7-SETTLE-01 | Agency 정산 요약 — 하위 화주 2개 오더 합산 정확 |
| TC-P7-SETTLE-02 | 화주별 정산 — 화주A vs 화주B 분리 집계 정확 |
| TC-P7-SETTLE-03 | Agency 오버라이드 반영 — override 있는 경우 override 금액 사용 |
| TC-P7-SETTLE-04 | RLS — Agency A 사용자가 Agency B 데이터 조회 불가 |

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Riley] feat: TASK-153 IMP-122 Agency 정산 조회 Server Actions + UI`
2. 상세 파일 `[작업 결과]` 섹션 작성 (커밋 해시 포함) + 상태 🔔 변경
3. ACTIVE_TASK.md 🔄→🔔 반영
4. `scratch/IMP_PROGRESS.md` IMP-122 행 🔔 갱신
5. **`check-R17-DoD` 자가 검증** — 전항목 통과까지 반복
6. **[문서 커밋]** `[Riley] docs: TASK-153 완료 보고 — Agency 정산 조회 🔔`
7. **[PR 생성]** `feature/ups-spr06-riley-agency-settlement → develop` + `Closes #<GitHub Issue>`

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-067 | `supabase/seed_data.sql` 내 `zen_rate_cards` 스키마 불일치로 인한 CI 실패 | 즉시 | `.agent/defects/DEF-067_시드데이터_zen_rate_cards_스키마불일치.md` |

---

## [작업 결과]

_(Riley 작성)_

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | ce26adb |
| 회귀 결과 | PASS / 374 PASS |
| 빌드 | PASS |
| 특이사항 | — |
