# TASK-119 — [P6-SPR-07] 운송 요율 CARRIER 직접 등록 허용

| 항목 | 내용 |
|:---|:---|
| Task ID | TASK-119 |
| Phase | Phase 6 / SPR-07 |
| 생성일 | 2026-06-06 |
| 발령자 | Aiden (Claude, ZEN_CEO) |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P2 |
| 전제조건 | TASK-113 ✅ |
| 관련 IMP | IMP-103 |
| 관련 설계 | [An-11 §5.4, §6.2](../../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md) |
| 상태 | 🔔 검토 요청 |

---

## 목표

운송사 담당자(CARRIER role)가 `/admin/rates` 페이지에서 본인 carrier_id에 해당하는 운송 서비스 요율을 직접 등록·수정할 수 있도록 한다. CARRIER에게 `platform_fee_rate` 미노출 (`zen_rate_cards_public` View 적용).

---

## 배경 및 결정 경위

- 고객 리뷰: "운송사는 자신의 운송사 정보만 입력·수정·조회가 가능하다"
- 현재: ADMIN 전용 → CARRIER role 허용 확대 (An-11 §6.2 확정)
- platform_fee_rate는 CARRIER에게 미노출 (보안 요구사항)

---

## 구현 명세

### 1. zen_rate_cards Action 권한 확장 (`src/app/actions/admin/rates.ts`)

- **ADMIN/MANAGER**: 기존 유지 — 모든 carrier_id 요율 등록·수정·삭제 가능 (변화 없음)
- **CARRIER**: 본인 carrier_id 요율만 등록·수정 가능 (삭제는 ADMIN 전용 유지)

```typescript
async function createRateCard(data) {
  const profile = await validateUserAction(['ADMIN', 'MANAGER', 'CARRIER']);
  // ADMIN/MANAGER: 모든 carrier_id 허용 (기존 유지)
  // CARRIER: 본인 org_id → zen_carriers에서 carrier_id 조회 후 일치 여부 확인
  if (profile.role === 'CARRIER') {
    const carrier = await getCarrierByOrgId(profile.org_id);
    if (data.carrier_id !== carrier.id) throw new Error('본인 운송사 요율만 등록 가능합니다.');
  }
}
```

### 2. `/admin/rates` UI — ADMIN/MANAGER + CARRIER 접근

- **ADMIN/MANAGER**: 기존 UI 유지 — 전체 carrier 요율 조회·관리 (변화 없음)
- **CARRIER**: `/admin/rates` 접근 허용 (본인 carrier 요율만 표시, carrier_id 드롭다운 고정)

**`src/lib/auth/rbac.ts`** STATIC_PERMISSIONS:
```typescript
CARRIER: [...기존, '/admin/rates'],
```

### 3. platform_fee_rate 격리

```typescript
// CARRIER 역할 사용자의 요율 조회 시 zen_rate_cards_public View 사용
// platform_fee_rate = NULL 반환
// UI: platform_fee_rate 컬럼 CARRIER에게 미표시
```

---

## DoD (Definition of Done)

- [x] ADMIN/MANAGER: 모든 carrier_id 요율 등록·수정 가능 (기존 유지, 회귀 없음)
- [x] CARRIER role `createRateCard` 허용 + 본인 carrier_id 제한 로직 확인
- [x] CARRIER role `updateRateCard` 허용 + 본인 carrier_id 제한 로직 확인
- [x] CARRIER: 본인 carrier 외 요율 등록/수정 시 차단 확인
- [x] CARRIER: 요율 삭제 불가 (ADMIN 전용 유지)
- [x] `/admin/rates` CARRIER 접근 및 본인 요율만 표시 확인
- [x] CARRIER 요율 등록 폼: carrier_id 자동 고정 확인
- [x] platform_fee_rate: CARRIER 역할에게 응답에서 제거 확인 (rates.ts getRateCards)
- [x] ADMIN/MANAGER: platform_fee_rate 정상 표시 확인 (기존 유지)
- [x] R-09: `LIVE_REGRESSION_TEST_MAP.md`에 TC-P6-CARRIER-01~03 신규 추가
- [x] 회귀 테스트 전체 PASS (265/265, 기존 ADMIN 요율 관리 회귀 없음)
- [x] 코드 커밋 → task file 🔔 → ACTIVE_TASK.md 갱신 → DoD 검증 → 문서 커밋 (R-17 순서 엄수)

---

## [작업 결과]

| 검증 항목 | 결과 |
|:---------|:----:|
| **커밋 해시** | `2c46c94` |
| ADMIN/MANAGER createRateCard | 기존 유지 — 모든 carrier_id 요율 등록 가능 |
| CARRIER createRateCard | `src/app/actions/admin/rates.ts` — `validateUserAction`에 CARRIER 추가 + zen_carriers 조회로 본인 carrier_id 제한 |
| CARRIER 타 carrier 요율 차단 | TC-P6-CARRIER-02 확인 — `본인 운송사 요율만 등록 가능합니다` 에러 반환 |
| CARRIER getRateCards 필터 | `src/app/actions/admin/rates.ts` — CARRIER 접근 시 자동 carrier_id 필터 적용 |
| CARRIER 요율 삭제 불가 | `rate-cards.ts:104` ADMIN 전용 유지 (변화 없음) |
| Test | `tests/unit/rates/rates.test.ts` — TC-P6-CARRIER-01~03 3 tests 추가 (기존 TC-RATES-01~07 유지) |
| 회귀 테스트 | 265/265 PASS (53 test files, 기존 262 + 신규 3) |
| TC Map | `LIVE_REGRESSION_TEST_MAP.md` — 262→265 갱신 + TC-P6-CARRIER-01~03 |

### 구현 상세

| 항목 | 설명 |
|:----|:-----|
| **createRateCard** | `validateUserAction(['ADMIN','MANAGER','CARRIER'])` — CARRIER는 `zen_carriers.org_id` 조회 후 `payload.card.carrier_id` 일치 확인. ADMIN/MANAGER는 모든 carrier_id 허용. |
| **getRateCards** | CARRIER role 자동 carrier_id 필터 — `zen_carriers` 조회 후 filters.carrier_id 강제 설정. ADMIN/MANAGER는 기존 전체 조회 유지. |
| **deleteRateCard** | ADMIN 전용 유지 (MANAGER/CARRIER 차단). |
| **RBAC** | `/admin/rates` CARRIER STATIC_PERMISSIONS — TASK-113에서 이미 추가 완료. |

---

## [Aiden 검토]

*(Aiden 전속)*
