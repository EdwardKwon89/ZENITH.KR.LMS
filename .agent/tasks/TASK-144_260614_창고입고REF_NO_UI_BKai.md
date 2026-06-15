# TASK-144 — Phase 7 SPR-02: 창고 입고 화면 REF_NO 입력 UI

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-144 |
| **생성일** | 2026-06-14 |
| **할당 Agent** | B_Kai (OpenCode) |
| **우선순위** | P1 |
| **전제조건** | TASK-138 ✅ (zen_order_packages REF_NO 5종 컬럼 완비) |
| **관련 IMP** | IMP-112 (일부) |
| **브랜치** | `feature/ups-spr02-bkai-warehouse-ref` (독립 브랜치) |
| **커밋 태그** | `[B_Kai]` |
| **상태** | 🔔 |

---

## [목표]

An-12 §3.2 기준 창고 입고 화면(`/warehouse/inbound`)에 PKG 별 REF_NO 입력 UI를 추가한다.  
대리점 운영자가 입고 시 국내 운송장(domestic_ref_no)과 UPS 국제번호(intl_ref_no)를 직접 입력할 수 있게 한다.

> DB 컬럼(domestic_ref_no, intl_ref_no, intl_ref_locked 등)은 TASK-138 `ups_007`에서 완료.  
> 본 Task는 UI 레이어만 구현 — DB 스키마 변경 없음.

---

## [작업 범위]

### 1. 입고 화면 수정 (`src/app/[locale]/(dashboard)/warehouse/inbound/page.tsx`)

패키지 카드 / 입력 영역에 아래 필드 추가:

| 필드 | 컬럼 | 표시 조건 | 편집 가능 |
|:----|:----|:--------|:--------|
| 국내 운송장번호 | `domestic_ref_no` | 항상 표시 | 항상 편집 가능 |
| UPS 국제번호 | `intl_ref_no` | 항상 표시 | `intl_ref_locked = false` 시만 편집 가능 |

**UI 처리 규칙** (An-12 §3.2):
- `intl_ref_locked = true` → intl_ref_no 필드 `readOnly` + 잠금 아이콘 표시
- `intl_ref_locked = false` → 수동 입력 허용 (MVP: 수동 — SPR-05에서 API 자동화)
- 저장 버튼 클릭 시 `updateInboundPackageRefs(pkgId, domesticRef, intlRef)` Server Action 호출

### 2. Server Action (`src/app/actions/warehouse/inbound.ts` 또는 기존 파일에 추가)

```typescript
// 기존 파일이 있으면 추가, 없으면 신규 생성
export async function updatePackageRefs(
  packageId: string,
  domesticRefNo: string | null,
  intlRefNo: string | null,
): Promise<{ success: boolean; error?: string }>
```

- `intl_ref_locked = true` 상태에서 intl_ref_no 변경 시도 → 서버 측 거부 + 에러 반환
- Zod 검증: packageId UUID, ref 문자열 최대 100자

### 3. i18n 키 추가

`messages/ko.json`, `messages/en.json` (최소):
- `warehouse.inbound.domestic_ref_no`
- `warehouse.inbound.intl_ref_no`
- `warehouse.inbound.intl_ref_locked`

---

## [DoD]

- [x] `/warehouse/inbound` 화면 domestic_ref_no 입력 필드 추가
- [x] `/warehouse/inbound` 화면 intl_ref_no 입력 필드 추가
- [x] `intl_ref_locked = true` 시 intl_ref_no 필드 readOnly + 잠금 아이콘 처리
- [x] `updatePackageRefs()` Server Action 구현 (Zod 검증 포함)
- [x] 서버 측 `intl_ref_locked` 보호 처리
- [x] i18n 키 추가 (ko/en 6건)
- [x] `npm run test:regression` — TC-WH-REF-01~04 PASS (4/4), 전체 351/357 PASS (6건 기존 p6-transport-policy 실패 — TASK-144 무관)
- [x] 신규 TC: `tests/unit/logistics/inbound.test.ts` TC-WH-REF-01~04 (4건)
  - TC-WH-REF-01: `updatePackageRefs()` — 정상 업데이트 ✅
  - TC-WH-REF-02: `intl_ref_locked = true` 상태에서 intl_ref_no 변경 → 거부 ✅
  - TC-WH-REF-03: ref 문자열 100자 초과 → Zod 에러 ✅
  - TC-WH-REF-04: 패키지 미존재 → 거부 ✅
- [x] 코드 커밋 해시: `b315d49` (코드), `6870271` (테스트 수정)
- [x] DoD 자가 검증 `check-R17-DoD` 실행 완료

---

## [R-17 완료 보고 절차]

1. **코드 커밋**: ✅ `b315d49` `[B_Kai] feat: TASK-144 IMP-112 창고 입고 화면 REF_NO 입력 UI`
2. **테스트 수정**: ✅ `6870271` `[B_Kai] test: TASK-144 TC-WH-REF mock chain 수정 — select/update 분리`
3. **본 파일 `[작업 결과]` 작성** + 상태 🔔 변경 ✅
4. **ACTIVE_TASK.md** 🔄→🔔
5. **IMP_PROGRESS.md** IMP-112 행 비고 갱신
6. **`check-R17-DoD` 실행** ✅ — TC-WH-REF-01~04 4/4 PASS, 전체 351/357 PASS
7. **문서 커밋**: `[B_Kai] docs: TASK-144 완료 보고 — IMP-112 창고입고UI 🔔`

> **PR 대상**: `feature/ups-spr02-bkai-warehouse-ref` → `feature/ups-spr02-aiden-pricing-engine`  
> (TASK-141 코어 완료 후 Aiden이 통합 머지)

---

## [설계 확정]

An-12 §3.2 스펙 확정 (Edward 승인, 2026-06-14). 추가 설계 결정 불요.

---

## [작업 결과]

| 파일 | 변경 내용 |
|:----|:---------|
| `src/app/actions/operations/warehouse.ts` | `updatePackageRefs` Server Action — Zod 검증, `intl_ref_locked` 보호, `revalidatePath` |
| `src/app/actions/warehouse.ts` | barrel export에 `updatePackageRefs` 추가 |
| `src/app/actions/operations/orders.ts` | `getOrderByBarcodeOrNo`에 `zen_order_packages` SELECT 추가 |
| `src/types/supabase.ts` | `zen_order_packages` Row/Insert/Update에 3개 필드 추가 |
| `src/components/warehouse/InboundProcessForm.tsx` | packages 카드에 REF_NO 입력 UI + state + handlers + locked 처리 |
| `messages/ko.json`, `messages/en.json` | i18n 키 6건 추가 |
| `tests/unit/logistics/inbound.test.ts` | TC-WH-REF-01~04 추가 (Mock chain 분리 패턴) |

**코드 커밋**: `b315d49` `[B_Kai] feat: TASK-144 IMP-112 창고 입고 화면 REF_NO 입력 UI`  
**테스트 수정**: `6870271` `[B_Kai] test: TASK-144 TC-WH-REF mock chain 수정 — select/update 분리`  
**회귀 테스트**: 351/357 PASS (6건 실패는 기존 `p6-transport-policy.test.ts` — TASK-144 무관)  
**TC-WH-REF**: 4/4 PASS ✅

---

## [Aiden 검토]

_(🔔 제출 후 Aiden 기재)_

---

## [발견 이슈]

_(없음)_
