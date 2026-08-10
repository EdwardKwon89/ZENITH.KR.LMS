# TASK-B-262: Issue #1018 — UPS 할인율에 DOC/NONDOC 축 추가 (Express/Saver 한정)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1018](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1018) |
| **배경** | JSJung 요구사항: 현재 Zone별로만 등록되는 UPS 할인율에 DOC/NONDOC 축 추가 — Express/Saver 한정(Expedited/Flight는 DOC/NONDOC 구분 없는 단일 판매가라 제외, JSJung 확정 2026-08-10) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-08-10 |
| **우선순위** | P2 |
| **상태** | 🔄 (착수 배정) |

## 개요

Issue #1018 본문 전체(설계 상세) 참조. 요약:

1. `zen_agency_pricing_policies`(Admin→Agency)·`zen_agency_shipper_zone_discounts`(Agency→Shipper) 두 할인율 테이블 모두 현재 Zone 단위로만 UNIQUE — DOC/NONDOC 구분 없음.
2. Express/Saver는 DOC/NONDOC이 별도 상품(별도 판매가)으로 존재하므로 할인율도 그에 맞춰 세분화 필요. Expedited/Flight는 DOC/NONDOC 구분 없는 단일 판매가라 이번 범위 제외 — 계속 Zone 단일 할인율.
3. 설정 경로는 전부 `createPricingSchedule()`(예약)→익일 자정 cron(`pricing-schedule-apply`) 경유.

## 구현 스펙 (설계 확정 — Issue #1018 본문 전문 참조)

### 1. 마이그레이션 — cargo_type 컬럼 추가

```sql
ALTER TABLE zen_agency_pricing_policies
  ADD COLUMN cargo_type text NOT NULL DEFAULT 'ALL'
    CHECK (cargo_type IN ('DOC','NON_DOC','ALL'));
ALTER TABLE zen_agency_pricing_policies
  DROP CONSTRAINT uq_agency_org_zone,
  ADD CONSTRAINT uq_agency_org_zone_cargo UNIQUE (agency_org_id, zone_id, cargo_type);

ALTER TABLE zen_agency_shipper_zone_discounts
  ADD COLUMN cargo_type text NOT NULL DEFAULT 'ALL'
    CHECK (cargo_type IN ('DOC','NON_DOC','ALL'));
ALTER TABLE zen_agency_shipper_zone_discounts
  DROP CONSTRAINT zen_agency_shipper_zone_disco_agency_org_id_shipper_org_id__key,
  ADD CONSTRAINT uq_agency_shipper_zone_cargo UNIQUE (agency_org_id, shipper_org_id, zone_id, cargo_type);
```

**주의**: 정확한 기존 제약 이름은 `\d zen_agency_pricing_policies` / `\d zen_agency_shipper_zone_discounts`로 재확인 후 DROP CONSTRAINT에 사용할 것(문서 작성 시점 이름: `uq_agency_org_zone`, `zen_agency_shipper_zone_disco_agency_org_id_shipper_org_id__key`).

`'ALL'`은 sentinel 값(NULL 아님) — Postgres UNIQUE 제약에서 NULL은 서로 다른 값으로 취급돼 유일성이 깨지므로 반드시 NOT NULL + 'ALL' 방식 유지. 기존 행은 마이그레이션으로 자동 `cargo_type='ALL'`이 채워져 하위 호환(기존 Zone 단일 할인율 그대로 유지).

### 2. 조회 로직 — `src/app/actions/ups/freight.ts`

Admin→Agency, Agency→Shipper 할인율 조회 두 곳 모두에 cargo_type 필터 추가:

```ts
const policyCargoType = product.cargo_type === 'BOTH' ? 'ALL' : product.cargo_type;
// 기존 .eq('zone_id', zone.id) 다음에 추가
.eq('cargo_type', policyCargoType)
```

`product.cargo_type`은 이미 `zen_ups_products`에서 조회된 값 사용(DOC/NON_DOC/BOTH). Expedited/Flight(`cargo_type='BOTH'`)는 자동으로 `'ALL'`로 매핑되어 기존 동작 그대로 유지.

### 3. 예약 설정 경로 — `zen_ups_pricing_schedule` (스키마 변경 불요, target_ref JSONB 확장)

- `createPricingSchedule()` 호출부(UI)에서 `target_ref`에 `cargo_type` 키 추가해서 넘기기만 하면 `checkOverlap()`이 자동으로 겹침 검사에 포함(코드 변경 불요).
- `src/app/api/cron/pricing-schedule-apply/route.ts`의 `applySchedule()`/`expireSchedule()` — `zen_agency_pricing_policies`/`zen_agency_shipper_zone_discounts`에 대한 upsert/delete의 `eq`/`onConflict` 절에 `cargo_type` 추가 필요(`target_ref.cargo_type` 사용).

### 4. UI — Zone 선택 옆에 DOC/NONDOC 구분 추가

- `src/app/[locale]/(dashboard)/admin/ups-rates/ups-rates-client.tsx`: `createPricingSchedule({setting_type:'AGENCY_DISCOUNT', ...})` 호출 폼에 "전체(Expedited/Flight 포함) / DOC / NON_DOC" 선택 추가.
- `src/components/agency/ZoneDiscountForm.tsx`: 동일하게 추가(Agency→Shipper).
- 두 화면의 기존 할인율 이력·감사로그 표시(`getScheduledPricingChanges`, `getPricingAuditLog`)에도 cargo_type 컬럼 표시.
- Expedited/Flight는 DOC/NON_DOC 선택지를 고르더라도 적용 대상이 아님을 화면에 명확히 안내(혼동 방지).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-262-ups-discount-cargo-type` 브랜치 생성(worktree)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-262 확인
- [ ] 마이그레이션 작성(위 1번, 정확한 기존 제약명 재확인 후 DROP) + DO-block으로 기존 행 전부 `cargo_type='ALL'`로 이관됐는지 검증
- [ ] `freight.ts` 조회 로직 cargo_type 필터 추가(2곳: Admin→Agency, Agency→Shipper)
- [ ] `pricing-schedule.ts`/`pricing-schedule-apply/route.ts` cargo_type 포함 처리
- [ ] UI 2곳(admin ups-rates, agency ZoneDiscountForm) DOC/NONDOC 선택 추가
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - Express DOC용 할인율과 NON_DOC용 할인율을 각각 다르게 등록했을 때 `estimateUpsFreight()`가 상품에 맞는 cargo_type 할인율을 정확히 가져오는지(behavioral)
  - Expedited/Flight 주문은 cargo_type='ALL' 정책만 적용되고 DOC/NON_DOC 전용 정책의 영향을 받지 않는지(회귀 방지 — 핵심 케이스)
  - 기존(마이그레이션 이전부터 있던 zone 단일 정책, cargo_type='ALL') 하위호환 케이스
  - **되돌리기 검증 필수** — cargo_type 필터 추가 전/후로 되돌려서 DOC 전용 할인율이 무시되고 엉뚱한(또는 0%) 할인율이 적용되는지 재현 확인 후 결과를 task file에 기재할 것.
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 브라우저로 (1) Express DOC 전용 할인율 등록 → 익일 cron 대신 직접 트리거(`x-api-key`)로 적용 → DOC 상품 견적에서만 반영되고 NONDOC/Expedited는 영향 없음을 확인 (2) 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] feat: TASK-B-262 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1018 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1018`)

## 담당자 위반 이력 사전 경고

- **Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①R-10 실구동 증적 누락(다수, 대부분 JSJung 직접 검증으로 대체) ②재무 계산 관련 핵심 fix가 되돌리기 검증에서 실제로 FAIL하지 않는 vacuous 패턴(TASK-B-252/255, 이후 TASK-B-259는 정상적으로 되돌리기 검증 수행함 확인됨). **이번 Task도 할인율(재무) 계산 로직이므로 되돌리기 검증을 반드시 실제로 수행할 것** — 특히 "Expedited/Flight가 DOC/NONDOC 전용 정책의 영향을 받지 않는다"는 케이스가 이번 Task의 핵심 안전장치이므로 이 테스트만큼은 되돌려서 실패를 직접 재현할 것.

## [작업 결과]

_(착수 시 Mike가 작성)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
