# TASK-B-207: zen_tracking_configs provider_type을 UPS 오더 기준으로 정합화

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#851](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/851) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | 🔄 |

## 개요

통합트래킹 화면에서 UPS 오더도 캐리어 배지가 항상 "VIRTUAL"로 표시되는 문제. Jaison이 원인·수정 위치를 코드 레벨로 확정했으므로 **설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 근본 원인 (Jaison 분석 완료)

`create_order_atomic` RPC(`supabase/migrations/20260715000001_iss489_ups_order_schema_v5.sql:130-134`)가 `transport_mode` 무관하게 무조건:
```sql
INSERT INTO public.zen_tracking_configs (order_id, tracking_no, provider_type, provider_name)
VALUES (v_order_id, 'ZN-' || v_order_no, 'VIRTUAL', 'ZSim (Virtual)');
```
UPS 라벨 발급(DEF-123 패치)도 `tracking_no`만 갱신하고 `provider_type`은 안 건드림.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

**RPC 함수 자체는 건드리지 않습니다** (대형 트랜잭션 함수 재정의는 리스크 큼). 대신 오더 생성 서버 액션에서 RPC 호출 직후 후속 UPDATE로 처리합니다.

### 1. 신규 오더 — `src/app/actions/operations/orders.ts`

`createOrder()` 함수 내 `const orderId = (order as any)?.id; if (!orderId) throw new Error("Order creation returned no ID");` (99-100행) 바로 다음에 추가:

```ts
if (validated.transport_mode === 'UPS') {
  const { error: trackingConfigError } = await supabase
    .from('zen_tracking_configs')
    .update({ provider_type: 'UPS', provider_name: 'UPS Express' })
    .eq('order_id', orderId);
  if (trackingConfigError) {
    logger.error('[TRACKING_CONFIG] Failed to set UPS provider_type:', trackingConfigError);
  }
}
```
(실패해도 오더 생성 자체는 막지 않도록 에러는 로깅만 — 기존 함수 내 다른 후속 처리 패턴과 동일하게)

### 2. 기존 UPS 오더 — 신규 마이그레이션(백필)

`./scripts/next-def-number.sh B`는 필요 없음(결함 아닌 정합화 작업, DEF 채번 불필요) — 파일명은 `supabase/migrations/<timestamp>_iss851_tracking_configs_ups_provider_backfill.sql`:
```sql
UPDATE public.zen_tracking_configs tc
SET provider_type = 'UPS', provider_name = 'UPS Express'
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.provider_type = 'VIRTUAL';
```
적용 후 로컬 DB에서 실제 UPS 오더 건수와 UPDATE된 행 수가 일치하는지 직접 확인(`SELECT COUNT(*) FROM zen_orders WHERE transport_mode='UPS'` vs 마이그레이션 로그의 `UPDATE N`).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성 (`feature/teamb-207-...`)
- [ ] `orders.ts` createOrder()에 UPS provider_type 갱신 로직 추가
- [ ] 백필 마이그레이션 추가 + 로컬 DB 적용 후 실측 확인
- [ ] 회귀 테스트 추가: (1) UPS 오더 생성 시 `zen_tracking_configs.provider_type === 'UPS'` 확인(behavioral, mock supabase 호출 검증 — `toContain` 금지), (2) 비-UPS(AIR/SEA/LAND) 오더는 기존처럼 'VIRTUAL' 유지 확인(회귀 방지)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋 → 2. task file `[작업 결과]`+🔔 → 3. ACTIVE_TASK.md 반영 → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR (`→ TeamB_Dev`, `Closes #851`은 이 PR 단독으로는 걸지 말 것 — TASK-B-208과 함께 Issue #851을 구성하므로 PR body에 "Part of #851"로만 기재)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조. 이번 건은 마이그레이션 파일명·채번 실수가 반복 이력의 다수를 차지하므로 파일명 정확히 지킬 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

## [작업 결과] 🔔

| 항목 | 내용 |
|:-----|:------|
| **커밋** | `8455e060` |
| **PR** | [#853](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/853) (→ TeamB_Dev, Part of #851) — 2026-07-26 병합 완료 |
| **변경 파일** | `src/app/actions/operations/orders.ts`, `supabase/migrations/20260726110000_iss851_tracking_configs_ups_provider_backfill.sql`, `tests/unit/orders/tracking-configs-provider-type.test.ts` |
| **테스트** | 3건 (UPS 오더 provider_type UPS 확인, AIR/SEA/VIRTUAL 미갱신 확인) |
| **전체 회귀** | 129 files / 837 tests ALL PASS |
| **빌드** | ✅ PASS |

### ⚠️ 후속 정정 필요 (DEF-B-004)

병합 후 Jaison이 로컬 DB에 마이그레이션 적용 중 발견: `provider_type='UPS'`는 `zen_tracking_configs_provider_type_check` CHECK 제약(`VIRTUAL`/`MANUAL`/`API`만 허용) 위반으로 **실제로는 항상 실패**(트랜잭션 롤백, 신규 오더 생성 시에도 조용히 실패 후 로깅만 됨) — **Jaison의 설계 스펙 오류**(Baker 귀책 아님). `provider_type='API', provider_name='SHXK_UPS'`로 정정 필요. 상세: `.agent/defects/DEF-B-004_...md`, 수정 담당: `TASK-B-209`(Baker).
