# TASK-B-261: Issue #1016 / DEF-B-037 — UPS base_rates 상품별 잔재 데이터 정리

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1016](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1016) |
| **DEF** | [DEF-B-037](../defects/DEF-B-037_UPS_base_rates_상품별_잔재_데이터.md) |
| **배경** | JSJung 지적("express/saver 30kg 표출, expedited 0.5단위 표출, flight 정의 안 된 값 표출") → Jaison DB 확인으로 확정 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-10 |
| **우선순위** | P2 — 실제 요금 계산에는 영향 없음(조회 화면 표시 데이터만 오염) |
| **상태** | 🔄 (착수 배정) |

## 현상 (재확인 필요 없음 — Jaison이 이미 DB 직접 조회로 확정)

`zen_ups_base_rates`에 각 상품의 비즈니스 규칙 범위를 벗어난 레거시 잔재 행 270건:

| 상품 | 정상 범위 | 이상 weight_kg | 건수 |
|---|---|---|---|
| WW_EXPRESS_NONDOC | 0.5~20kg | `{25.0, 30.0}` | 20건(10 Zone×2) |
| WW_SAVER_NONDOC | 0.5~20kg | `{25.0, 30.0}` | 20건(10 Zone×2) |
| WW_EXPEDITED | 1~20kg 정수단위 | `{0.5,1.5,2.5,3.5,4.5,25.0,30.0}` | 70건(10 Zone×7) |
| WW_FLIGHT | base_rates 미사용 | 전체(0.5~30kg, 16개 지점) | 160건(10 Zone×16) — 전량 |

실제 요금 계산 엔진(`computeUpsFreight`/`estimateUpsFreight`)은 이 행들을 전혀 조회하지 않음(20kg 초과는 `weight_tier_rates` 구간요율 공식, Flight는 base_rates 자체를 안 씀) — **청구 금액에는 영향 없는 순수 표시 데이터 오염**. `src/app/actions/ups/rates-public.ts:getPublicBaseRates()`가 weight 필터 없이 테이블 전체를 그대로 반환해 조회 화면에 노출됨.

## 수정 방향 (설계 확정 — 착수 승인됨)

### 1. 데이터 정리 (필수) — 마이그레이션으로 DELETE

```sql
-- WW_EXPRESS_NONDOC, WW_SAVER_NONDOC: 20kg 초과 잔재
DELETE FROM zen_ups_base_rates
WHERE product_id IN (SELECT id FROM zen_ups_products WHERE product_code IN ('WW_EXPRESS_NONDOC','WW_SAVER_NONDOC'))
  AND weight_kg > 20;

-- WW_EXPEDITED: 0.5kg 단위 잔재 + 20kg 초과 잔재
DELETE FROM zen_ups_base_rates
WHERE product_id = (SELECT id FROM zen_ups_products WHERE product_code = 'WW_EXPEDITED')
  AND (weight_kg != FLOOR(weight_kg) OR weight_kg > 20);

-- WW_FLIGHT: base_rates 전량 (계산 엔진이 이 테이블을 아예 사용하지 않음)
DELETE FROM zen_ups_base_rates
WHERE product_id = (SELECT id FROM zen_ups_products WHERE product_code = 'WW_FLIGHT');
```

DELETE 전후 정확한 행 수(270건 삭제, 삭제 후 EXPRESS_NONDOC/SAVER_NONDOC 400건씩·EXPEDITED 200건·FLIGHT 0건)를 마이그레이션 내 DO-block 검증으로 확인할 것(이번 세션의 다른 UPS 데이터 마이그레이션들과 동일 패턴 — `20260809060000_ups_saver_nondoc_500kg_tier_fix_and_expedited_z5_typo.sql` 등 참고).

### 2. 재발 방지 (권장, 선택 — 시간 허용 시)
- `zen_ups_products.max_weight_kg`를 EXPRESS_NONDOC/SAVER_NONDOC/EXPEDITED에도 20으로 설정
- `getPublicBaseRates()`에 상품별 상한 방어 필터 추가 검토

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-261-ups-base-rates-cleanup` 브랜치 생성(worktree)
- [ ] 위 DELETE 3개 문을 담은 마이그레이션 작성 + DO-block으로 삭제 전/후 행 수 검증
- [ ] `npx supabase db reset` 실제 적용 + DB 직접 조회로 결과 재확인(각 상품 weight_kg 범위가 정상 범위 내로 들어왔는지)
- [ ] **회귀 테스트**: 이 변경은 순수 데이터 정리이고 계산 엔진 코드 변경이 없으므로 신규 유닛 테스트는 불요. 단, 마이그레이션 DO-block 검증(삭제 후 행 수 정확성)이 실질적 검증 역할을 함 — 결과를 task file에 기재할 것.
- [ ] 기존 UPS 관련 회귀 테스트(`tests/unit/ups/*.test.ts`)가 이 데이터 변경으로 깨지지 않는지 확인(이론상 mock 기반이라 영향 없어야 하나 반드시 실행해서 확인)
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10 대체) `/admin/ups-rates`(또는 shipper/agency ups-rates 조회 화면)에서 EXPRESS/SAVER/EXPEDITED/FLIGHT 실측 확인 — 정상 범위 내 데이터만 표시되는지 스크린샷 첨부. 순수 데이터 정리라 실브라우저 스크린샷 대신 DB 직접 조회 결과(before/after 행 수·범위)로 대체 가능.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-261 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1016 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1016`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①task file/ACTIVE_TASK.md 커밋 누락 ②채번 절차 미준수(`./scripts/next-task-number.sh B` 직접 실행 후 확인할 것) ③무관한 과거 task file 오염(워크트리 미격리 혼입 — 본인 전용 워크트리에서만 작업할 것). 이번 Task는 순수 데이터 정리라 코드 로직 위험은 낮으나, **DELETE 대상 범위를 정확히 지켜야 함** — 위 SQL 3개 문 외 다른 weight_kg나 product_code를 건드리지 않도록 주의(특히 WW_EXPRESS_DOC/WW_SAVER_DOC은 이미 정상 상태이므로 손대지 말 것).

## [작업 결과]

_(착수 시 Dave가 작성)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
