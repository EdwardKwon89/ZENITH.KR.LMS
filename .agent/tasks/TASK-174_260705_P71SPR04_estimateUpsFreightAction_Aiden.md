# TASK-174 — Phase 7.1 SPR-04: estimateUpsFreight Action 노출 (IMP-145)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-174 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | Aiden (Claude, ZEN_CEO) |
| **Worker / Auditor** | Aiden(구현) / Aiden(자가검증) |
| **우선순위** | P1 |
| **전제조건** | TASK-173 ✅ |
| **관련 IMP** | IMP-145 |
| **브랜치** | `feature/teama-phase71-ups-rate-management` |
| **커밋 태그** | `[Claude]` |
| **상태** | 🔔 |

---

## [목표]

An-14 §4·§11 기준 `estimateUpsFreight()` Server Action을 구현한다. **범위는 "계산 API 노출"까지이며, 오더 등록 화면 연동·`zen_orders.agency_org_id` 저장·`zen_order_rate_snapshots` 기록은 Team B 인계(GH #181)** — Edward 지시(2026-07-05)로 확정된 팀 경계 준수.

## [작업 범위]

`src/app/actions/ups/freight.ts` 신규:
1. 목적지 국가 → Zone 탐색 (기존 `zen_ups_zones`/`zen_ups_zone_countries` 조회 재사용)
2. 청구중량 산출(부피중량·대형포장물룰) → 해당 weight_kg 행의 기준요금 조회
3. 유류할증·부가요금(incoterms 기반 DDU/DDP 자동 포함 + OVERSIZE 강제포함) 조회
4. Platform 단계(`computeUpsFreight`) 계산
5. `agencyOrgId` 전달 시 Agency 단계(정책 할인율 + override 조회 → `computeAgencyFreight`) 계산
6. `shipperOrgId` 전달 시 Shipper 단계(`zen_agency_shippers.discount_rate` 조회 → `computeShipperFreight`) 계산
7. 3단계 결과를 `{ platform, agency, shipper }` 구조로 반환

## [API 계약 — Team B 인계용]

```ts
estimateUpsFreight(input: {
  productId: string; destCountryCode: string; actualWeightKg: number;
  dimL?, dimW?, dimH?, incoterms?, volumetricDivisor?, otherChargeIds?: string[];
  agencyOrgId?: string | null; shipperOrgId?: string | null; referenceDate?: string;
}): Promise<{ platform: UpsFreightResult; agency: UpsAgencyFreightResult | null; shipper: UpsShipperFreightResult | null }>
```

- `agencyOrgId` 미전달 → Platform 견적만 반환(일반 화주)
- `agencyOrgId`만 전달 → Agency 판매가까지 반환
- `agencyOrgId` + `shipperOrgId` 모두 전달 → 화주 최종 운송비(`shipper.finalFreight`)까지 반환
- TASK-177에서 `Ds_11_API_상세_명세서.md`에 정식 명문화 예정

## [DoD]

- [x] Platform 단계 견적 조회 정상 동작
- [x] Agency 단계(override 존재/미존재 분기) 정상 동작
- [x] Shipper 단계(화주 할인율) 정상 동작
- [x] Zone 미매핑·기준요금 미등록 시 명확한 에러 메시지
- [x] `tests/unit/ups/freight-actions.test.ts` 신규 5개 케이스 전량 PASS
- [x] `npm run test:regression` 전체 PASS — **412/412**
- [x] `npx tsc --noEmit` — 신규 코드 관련 오류 0건
- [x] `LIVE_REGRESSION_TEST_MAP.md` 등재
- [x] IMP_PROGRESS.md·ACTIVE_TASK.md 반영
- [x] 코드 커밋 해시 기재

## [작업 결과]

| 파일 | 변경 내용 |
|:----|:---------|
| `src/app/actions/ups/freight.ts` | 신규 — `estimateUpsFreight()` Platform/Agency/Shipper 통합 조회 Action |
| `tests/unit/ups/freight-actions.test.ts` | 신규 — TC-UPS-FREIGHT-01 (5개 케이스, 테이블별 디스패치 목 패턴) |
| `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` | §39 신규 등재 |

**검증 증적**: `npm run test:regression` → **412/412 PASS**.

**코드 커밋**: `2267c5b` `[Claude] feat: TASK-174 IMP-145 estimateUpsFreight 통합 Action`

---

## [발견 이슈]

없음.
