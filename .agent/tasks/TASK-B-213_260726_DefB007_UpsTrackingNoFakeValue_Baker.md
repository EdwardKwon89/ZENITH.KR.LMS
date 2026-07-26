# TASK-B-213: DEF-B-007 — UPS 오더 tracking_no 가짜 값("ZN-" 접두사) 정리

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#863](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/863) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

`/ko/tracking` 대시보드 Tracking Number 컬럼 실사용 확인 중 JSJung이 발견 — UPS 오더의 `zen_tracking_configs.tracking_no`에 실제 운송장번호가 아니라 AIR/SEA/LAND용 내부 가상 시뮬레이터 식별자(`'ZN-' || order_no`)가 그대로 노출됨. 로컬 DB 실측으로 재현·원인 확인 완료(`.agent/defects/DEF-B-007_...md` 참조).

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/app/actions/operations/orders.ts:107-115` — 향후 생성되는 UPS 오더

```ts
if (validated.transport_mode === 'UPS') {
  const { error: trackingConfigError } = await supabase
    .from('zen_tracking_configs')
    .update({ provider_type: 'MANUAL', provider_name: 'MANUAL', tracking_no: null })
    .eq('order_id', orderId);
  if (trackingConfigError) {
    logger.error('[TRACKING_CONFIG] Failed to set UPS provider_type:', trackingConfigError);
  }
}
```
기존 `.update({ provider_type: 'MANUAL', provider_name: 'MANUAL' })`에 `tracking_no: null` 필드만 추가. `zen_tracking_configs.tracking_no`는 `UNIQUE`이지만 `NOT NULL`이 아니라(원본 스키마 `20260422110000_zen_tracking_v1.sql:9`) NULL 여러 건 공존 가능 — 제약 위반 없음. 이후 `registerUpsOrder()`(ups-labels.ts, DEF-123 동기화 로직)가 실제 SHXK 등록 시 진짜 운송장번호로 갱신하는 기존 흐름은 그대로 유지됩니다(변경 불필요).

### 2. 신규 백필 마이그레이션 — 기존 UPS 오더 정리

새 파일 `supabase/migrations/<타임스탬프>_defb007_ups_tracking_no_backfill.sql`:
```sql
UPDATE public.zen_tracking_configs tc
SET tracking_no = NULL
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.tracking_no LIKE 'ZN-%';
```
`ZN-` 접두사는 가상 시뮬레이터 전용 포맷이라 실제 SHXK 운송장번호와 겹치지 않습니다 — 이미 실등록된 UPS 오더(진짜 번호 보유)와 AIR/SEA/LAND 오더는 건드리지 않습니다.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-213-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 213 나와야 정상)
- [ ] `orders.ts` UPS 분기에 `tracking_no: null` 추가
- [ ] 백필 마이그레이션 신규 파일 생성
- [ ] **로컬 DB에 마이그레이션 실제 적용 후 직접 SQL로 검증**(toContain 소스 문자열 검사 금지 — 이런 유형은 실측 없이는 못 잡는다는 게 이 프로젝트에서 반복 확인된 교훈):
  - UPS + `tracking_no LIKE 'ZN-%'`였던 행 → 적용 후 `tracking_no IS NULL` 확인
  - AIR/SEA/LAND 행 → `tracking_no` 그대로 유지되는지 확인(회귀)
- [ ] 회귀 테스트 추가 — **반드시 behavioral 기반**: `createOrder()`를 UPS payload로 호출했을 때 `.update()` 호출 인자에 `tracking_no: null`이 포함되는지 mock 기반 검증(`expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ tracking_no: null }))` 형태)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Baker] fix: TASK-B-213 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 863 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋(DEF-B-007 문서에도 검증 결과 갱신) → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #863`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 최근 이력: PR#844(🔍 설계확정 무시 착수), PR#837(타인 작업 기록 덮어쓰기). 이번 Task는 Jaison이 설계를 이미 확정해뒀으므로 추가 조사·설계 판단 없이 스펙대로 구현하되, **마이그레이션 실측 검증은 반드시 로컬 DB 직접 적용으로** 확인할 것(mock 테스트만으로는 스키마/데이터 수준 문제를 못 잡는다는 게 DEF-B-004 사고의 교훈).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
