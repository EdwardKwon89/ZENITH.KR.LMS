# TASK-143 — Phase 7 SPR-02: UPS 요율 조회 Server Actions (`rates.ts` 5종)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-143 |
| **생성일** | 2026-06-14 |
| **할당 Agent** | D_Kai (OpenCode) |
| **우선순위** | P1 |
| **전제조건** | TASK-138 ✅ (zen_ups_* 테이블 7종 완비) |
| **관련 IMP** | IMP-112 (일부) |
| **브랜치** | `feature/ups-spr02-aiden-pricing-engine` (TASK-141과 동일 브랜치) |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ⬜ |

> **주의**: TASK-141(Aiden)과 동일 브랜치 사용. 착수 전 반드시 `git pull origin feature/ups-spr02-aiden-pricing-engine` 후 작업. 동일 파일 수정 시 Aiden에게 먼저 확인.

---

## [목표]

An-12 §5.1 기준 UPS 요율 데이터 조회 Server Actions 5종을 구현한다.  
`pricing-engine.ts`(Aiden)가 호출하는 데이터 레이어를 담당하며, 브랜치 내에서 Aiden과 병행 작업한다.

---

## [작업 범위]

### `src/app/actions/ups/rates.ts` (신규 파일)

An-12 §5.1 기준 5종 조회 함수:

| 함수 | 설명 | 조회 테이블 |
|:----|:----|:----|
| `getUpsZones()` | 전체 Zone 목록 + 국가 매핑 | `zen_ups_zones` + `zen_ups_zone_countries` |
| `getUpsProducts(cargoType?)` | UPS 제품 목록 (활성만) | `zen_ups_products` |
| `getUpsBaseRates(filters?)` | 기본 요금표 조회 | `zen_ups_base_rates` |
| `getUpsFuelSurcharge(productId?, referenceDate?)` | 유류할증료 (기준 주 기준) | `zen_ups_fuel_surcharges` |
| `getUpsOtherCharges()` | 기타 부가요금 목록 (활성만) | `zen_ups_other_charges` |

**함수 시그니처 예시**:
```typescript
export async function getUpsZones(): Promise<UpsZoneWithCountries[]>
export async function getUpsProducts(cargoType?: UpsCargoType): Promise<UpsProduct[]>
export async function getUpsBaseRates(filters?: {
  productId?: string;
  zoneId?: string;
  referenceDate?: string;  // ISO date — valid_from/until 기준 필터
}): Promise<UpsBaseRate[]>
export async function getUpsFuelSurcharge(
  productId?: string | null,
  referenceDate?: string  // 미전달 시 today
): Promise<UpsFuelSurcharge | null>
export async function getUpsOtherCharges(): Promise<UpsOtherCharge[]>
```

**공통 규칙**:
- `createClient()` (서버용) 사용
- 모든 함수 50줄 이하 엄수
- 에러는 throw 없이 `{ data, error }` 패턴 또는 빈 배열/null 반환
- `src/types/ups.ts` 기존 타입 사용 (UpsZoneWithCountries, UpsProduct, UpsBaseRate, UpsFuelSurcharge, UpsOtherCharge)

---

## [DoD]

- [ ] `src/app/actions/ups/rates.ts` 신규 파일 생성 (5종 함수 구현)
- [ ] 각 함수 50줄 이하 준수
- [ ] `src/types/ups.ts` 기존 타입 임포트 (신규 타입 불필요 시 추가 금지)
- [ ] `npx supabase db reset` 정상 완료 확인 (TASK-138 migration 기반)
- [ ] `npm run test:regression` 전체 PASS (기존 회귀 + 신규 TC 포함)
- [ ] 신규 TC: `tests/unit/ups/rates-actions.test.ts` — TC-UPS-R-01~05 (5건 이상)
  - TC-UPS-R-01: `getUpsZones()` — Zone 목록 + 국가 반환
  - TC-UPS-R-02: `getUpsProducts('DOC')` — cargoType 필터
  - TC-UPS-R-03: `getUpsBaseRates({ productId, zoneId })` — 복합 필터
  - TC-UPS-R-04: `getUpsFuelSurcharge()` — 기준일 기반 최신 조회
  - TC-UPS-R-05: `getUpsOtherCharges()` — 활성 항목만 반환
- [ ] 코드 커밋 해시: (작업 후 기재)
- [ ] DoD 자가 검증 `check-R17-DoD` 실행 완료

---

## [R-17 완료 보고 절차]

1. **코드 커밋**: `[D_Kai] feat: TASK-143 IMP-112 UPS 요율 조회 Server Actions 5종`
2. **본 파일 `[작업 결과]` 작성** + 상태 🔔 변경
3. **ACTIVE_TASK.md** 🔄→🔔
4. **IMP_PROGRESS.md** IMP-112 행 비고 갱신 (D_Kai rates.ts 🔔 기재)
5. **`check-R17-DoD` 실행** — 전항목 통과 확인
6. **문서 커밋**: `[D_Kai] docs: TASK-143 완료 보고 — IMP-112 rates.ts 🔔`

---

## [설계 확정]

An-12 §5.1 스펙 확정 (Edward 승인, 2026-06-14). 추가 설계 결정 불요.

---

## [작업 결과]

_(작업 후 기재)_

---

## [Aiden 검토]

_(🔔 제출 후 Aiden 기재)_

---

## [발견 이슈]

_(없음)_
