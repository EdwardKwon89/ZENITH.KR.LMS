# TASK-B-299 — UPS 오더 상세 운임 카드 Zone 오표시 + 통화 3자리 쉼표 미표시 수정

| 항목 | 내용 |
|:-----|:------|
| **생성일** | 2026-08-14 |
| **담당** | Baker (구현) · Jaison (검토) |
| **우선순위** | P2 |
| **GitHub Issue** | [#1113](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1113) |
| **관련 결함** | [DEF-B-065](../defects/DEF-B-065_UpsOrderBreakdownCard_Zone고정값_통화쉼표미표시.md) |
| **상태** | 🔄 착수 |

## 배경

JSJung이 ZEN-2026-000073 오더 상세(`ups-detail`) 화면에서 Zone이 "Zone 5"로 표시되는 것을 발견. Jaison 분석 결과 DB 원본(`zen_order_rate_snapshots.metadata`)은 "Zone 7"이며, `UpsOrderBreakdownCard.tsx`가 존재하지 않는 필드 경로를 참조해 하드코딩 fallback 값이 노출되는 구조적 버그로 확인. 추가로 JSJung이 같은 화면 금액 표기에 3자리 쉼표가 없는 점도 함께 수정 요청.

## 작업 범위

파일: `src/components/ups/UpsOrderBreakdownCard.tsx` (단일 파일)

### ① Zone 표시 버그 수정 (L26)

**현재**:
```js
const zoneId = snapshotMeta?.zoneId || snapshotMeta?.zoneCode || snapshotMeta?.zone_id || 'Zone 5';
```

**수정**:
```js
const zoneId =
  snapshotMeta?.platform?.breakdown?.zone?.zone_name
  ?? snapshotMeta?.platform?.breakdown?.zone?.zone_code
  ?? snapshotMeta?.zoneId ?? snapshotMeta?.zoneCode ?? snapshotMeta?.zone_id
  ?? '-';
```
- 실제 스냅샷 구조(`platform.breakdown.zone.zone_name`)를 최우선으로 참조
- 기존 최상위 필드 fallback은 회귀 방지 차원에서 유지
- **하드코딩된 특정 Zone 번호(`'Zone 5'`)를 최종 기본값으로 두지 않는다** — 못 찾으면 `'-'` (이번 결함의 핵심 원인 패턴이므로 절대 재도입 금지)

### ② 통화 3자리 쉼표 표시 (L107/111/116/122/127)

`baseFreight`, `fuelSurcharge`, `surgeFee`, `extraCharges`, `totalFreight` 5개 지점 전부:

**변경 전**: `{currencySymbol}{baseFreight.toFixed(2)}`
**변경 후**: `{currencySymbol}{baseFreight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

프로젝트 기존 컨벤션 참고: [OrderFinanceSummary.tsx:147](../../src/components/finance/OrderFinanceSummary.tsx#L147), [ShipperDailyBillingClient.tsx](../../src/components/finance/ShipperDailyBillingClient.tsx) — 이미 `.toLocaleString()` 패턴 사용 중. 이 파일만 예외였던 것을 통일.

과설계 금지 — 이 컴포넌트 외 다른 화면은 범위 밖(이미 대부분 정상).

## 회귀 테스트 방향

- `snapshotMeta.platform.breakdown.zone.zone_name = "Zone 7"` mock 시 카드에 "Zone 7" 표시 (ZEN-2026-000073 실데이터 재현 — 실제 컴포넌트 렌더링, mock 최소화 원칙 준수)
- `snapshotMeta`에 zone 정보 전혀 없을 때 `'-'` 표시 (하드코딩 회귀 방지 — `'Zone 5'`가 다시 나오면 FAIL)
- `baseFreight = 355100` 등 1,000 이상 금액 mock 시 "355,100.00" 형식으로 5개 항목 전부 쉼표 표시
- **되돌리기 검증 필수**: Zone 수정 되돌리면 "Zone 7" 케이스가 "Zone 5"로 오표시되는지, 쉼표 포맷 되돌리면 "355100.00"으로 되돌아가는지 직접 확인 후 복원

## R-10 (실 UI 검증)

이번엔 생략 불가 — Zone 뱃지·금액 포맷 둘 다 시각적 확인이 핵심이므로 반드시 실행 중인 개발 서버에서 ZEN-2026-000073(또는 유사 Zone 7 오더) 상세 화면을 열어 스크린샷으로 "Zone 7" 및 쉼표 포맷("₩355,100.00" 등)이 실제로 표시되는지 확인.

## [작업 결과]

_(Baker 작성 예정)_

## [Jaison 최종 검토]

_(PR 제출 후 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
