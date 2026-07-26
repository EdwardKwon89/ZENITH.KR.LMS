# TASK-B-209: DEF-B-004 — zen_tracking_configs provider_type 값 정정 (UPS→API)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#851](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/851) 후속 (DEF-B-004) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

상세: `.agent/defects/DEF-B-004_zen_tracking_configs_provider_type_CHECK위반_UPS값오류.md`

**본인(Baker) 귀책 아닙니다** — TASK-B-207에서 지시받은 스펙(`provider_type: 'UPS'`)을 정확히 그대로 구현했는데, 그 스펙 자체가 Jaison의 실수였습니다(`zen_tracking_configs.provider_type`은 `CHECK (provider_type IN ('VIRTUAL','MANUAL','API'))` 제약이 있어 `'UPS'`는 애초에 저장 불가). 원 설계 문서(`An_13_Phase8_UPS직접API연동_설계.md:217`)에 이미 `provider_type='API', provider_name='SHXK_UPS'`로 명시돼 있었는데 Jaison이 확인을 놓쳤습니다. 죄송합니다 — 정정 스펙 그대로 구현 부탁드립니다.

## 조치안 (정정된 확정 스펙)

### 1. `src/app/actions/operations/orders.ts` (PR#853에서 추가된 블록 값만 수정)
```ts
if (validated.transport_mode === 'UPS') {
  const { error: trackingConfigError } = await supabase
    .from('zen_tracking_configs')
    .update({ provider_type: 'API', provider_name: 'SHXK_UPS' })  // 'UPS' → 'API'/'SHXK_UPS'로 정정
    .eq('order_id', orderId);
  if (trackingConfigError) {
    logger.error('[TRACKING_CONFIG] Failed to set UPS provider_type:', trackingConfigError);
  }
}
```

### 2. 신규 백필 마이그레이션 추가 (기존 `20260726110000_...` 파일은 수정하지 말 것 — 이미 병합된 마이그레이션 히스토리 변경 금지, 새 타임스탬프로 추가)
```sql
UPDATE public.zen_tracking_configs tc
SET provider_type = 'API', provider_name = 'SHXK_UPS'
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.provider_type = 'VIRTUAL';
```

### 3. 테스트 수정
`tests/unit/orders/tracking-configs-provider-type.test.ts`의 기대값을 `provider_type: 'API', provider_name: 'SHXK_UPS'`로 수정하고, **mock 테스트와 별개로 로컬 DB에 마이그레이션을 실제 적용해 CHECK 제약을 통과하는지 직접 확인**(`docker exec ... psql`) — 이번 사고가 "mock만으로는 스키마 제약 위반을 못 잡는다"는 교훈이라 실측 검증 필수입니다.

### 4. UI 배지
`TrackingDashboard.tsx`는 이미 `provider_type === "API"`일 때 파란 배지를 표시하도록 되어 있어 수정 불필요.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `orders.ts` 값 정정
- [ ] 신규 백필 마이그레이션 추가 + 로컬 DB 실제 적용해 CHECK 통과 확인(`SELECT COUNT(*) FROM zen_tracking_configs tc JOIN zen_orders o ON o.id=tc.order_id WHERE o.transport_mode='UPS' AND tc.provider_type='API'`로 실제 갱신 건수 확인)
- [ ] 테스트 파일 기대값 수정
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋 → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**)+🔔 → 3. ACTIVE_TASK.md 반영 → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR (`→ TeamB_Dev`)

## [작업 결과]

- **커밋 해시**: `7879bda3`
- **브랜치**: `feature/teamb-b209-defb004-provider-type-fix` (base: TeamB_Dev)
- **변경 파일**: `orders.ts` + 신규 마이그레이션 + 테스트 설명
- **빌드**: PASS
- **회귀 테스트**: 129 files / 837 tests ALL PASS
- **PR**: TeamB_Dev 머지 대기

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
