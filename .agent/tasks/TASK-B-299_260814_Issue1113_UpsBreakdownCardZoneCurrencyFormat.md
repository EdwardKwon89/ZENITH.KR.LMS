# TASK-B-299 — UPS 오더 상세 운임 카드 Zone 오표시 + 통화 3자리 쉼표 미표시 수정

| 항목 | 내용 |
|:-----|:------|
| **생성일** | 2026-08-14 |
| **담당** | Baker (구현) · Jaison (검토) |
| **우선순위** | P2 |
| **GitHub Issue** | [#1113](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1113) |
| **관련 결함** | [DEF-B-065](../defects/DEF-B-065_UpsOrderBreakdownCard_Zone고정값_통화쉼표미표시.md) |
| **상태** | 🔔 보고 완료 |

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

**커밋**: `d3b65f65` — `[Baker] fix: TASK-B-299 UPS 운임 카드 Zone 오표시 + 통화 3자리 쉼표 (Issue #1113 / DEF-B-065)`

| 검증 항목 | 결과 |
|:----------|:-----|
| ① Zone 표시 수정 | `UpsOrderBreakdownCard.tsx:26` — `snapshotMeta?.platform?.breakdown?.zone?.zone_name ?? zone_code ?? (기존 최상위 fallback) ?? '-'`로 수정. 하드코딩 `'Zone 5'` 기본값 완전 제거(ZEN_2026-000073 실제 구조 `platform.breakdown.zone` 우선 참조) |
| ② 통화 쉼표 | L107/111/116/122/127 5개 지점(기본/유류/급증/기타/총액) `.toFixed(2)` → `.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })` — 프로젝트 기존 컨벤션(`OrderFinanceSummary`·`ShipperDailyBillingClient`)과 통일 |
| 회귀 테스트 | `tests/unit/components/ups-order-breakdown-card.test.tsx` — 기존 3건 금액 포맷 갱신(쉼표 반영) + 신규 `DEF-B-065` 3건(Zone 7 표시 / zone 미존재 시 `-`·"Zone 5" 미출현 / 5개 항목 쉼표) — **6/6 PASS** |
| 독립 되돌리기 검증 | ①Zone 원복(`'Zone 5'`) 시 신규 2건 FAIL(Zone 7·`-` 케이스) 재현 → 복원 ②쉼표 원복(`toFixed`) 시 2건 FAIL(KRW·쉼표 케이스) 재현 → 복원, 복원 후 6/6 PASS |
| 전체 회귀 | `npm run test:regression` — **1318/1318 PASS** |
| 빌드 | `npm run build` — **SUCCESS** |
| R-10 실UI 검증 | 로컬 dev 서버에서 ZEN-2026-000073 `ups-detail` 실제 화면(admin 로그인 + `page.goto`) — `Zone: Zone 7` · `₩355,100.00` · `₩526,392.25 KRW` 표시 + `Zone 5` 미표시 확인, 스크린샷 `scratch/task-b-299-r10/01_ups-detail_zone7_currency.png` |
| 회귀 맵 | `LIVE_REGRESSION_TEST_MAP.md` 섹션 9에 `TC-DEF-B065-01/02` 등재(R-09 DoD) |

## [Jaison 최종 검토]

_(PR 제출 후 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
