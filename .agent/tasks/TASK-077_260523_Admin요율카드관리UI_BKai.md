# TASK-077 — Admin 요율 카드 관리 UI (zen_rate_cards CRUD)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-077 |
| IMP-ID | IMP-083 |
| 생성일 | 2026-05-23 |
| 담당 Agent | B_Kai |
| 우선순위 | P3 |
| 전제조건 | TASK-076 ✅ (Composite Pricing 구현 완료) |
| 상태 | 📝 설계 의견 — B_Kai 제안 |
| 파급 효과 | /ko/admin/rates 기존 화면 확장 또는 신규 탭 추가 |

---

## 배경

Composite Pricing Engine이 DB에서 요율 카드를 조회하려면 ADMIN이 관리 UI를 통해 데이터를 등록·수정·삭제할 수 있어야 한다. 기존 `/ko/admin/rates` 화면을 확장하거나 신규 탭을 추가하여 `zen_rate_cards`·`zen_surcharges` CRUD를 제공한다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-077 → 🔄 반영**

2. **설계 의견 제출 필수** (복잡도 중):
   - 기존 `/ko/admin/rates` 확장 vs 신규 `/ko/admin/rates/cards` 분리
   - 유효기간 중첩 방지 UX (즉시 오류 vs 저장 시 검증)

3. **설계 확정 후 구현**:

   **화면 구성 (ADMIN 전용)**:
   - 요율 카드 목록 테이블 (carrier·mode·유효기간·통화·슬랩 요약)
   - 신규 요율 카드 등록 폼 (carrier 선택·중량 슬랩 다건 입력·유효기간)
   - 수정·삭제 기능
   - 할증(zen_surcharges) 탭 또는 섹션 (type·rate_type·amount·유효기간)

   **Server Actions**:
   - `createRateCard(data)` — `zen_rate_cards` INSERT + `validateRateOverlap` 검사
   - `updateRateCard(id, data)` — UPDATE
   - `deleteRateCard(id)` — DELETE (soft delete: is_active=false 권장)
   - 할증 CRUD 동일 패턴

4. **회귀 테스트 실행**: `rtk npm run test:regression` — 전체 PASS 확인

5. **코드 커밋**: `[B_Kai] feat: IMP-083 Admin 요율 카드 관리 UI`

6. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔**

7. **ACTIVE_TASK.md TASK-077 → 🔔 반영**

8. **`scratch/IMP_PROGRESS.md` IMP-083 행 🔔 갱신**

9. **문서 커밋**: `[B_Kai] docs: TASK-077 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] 요율 카드 목록 조회 UI 동작 (carrier·mode·유효기간 표시)
- [ ] 신규 요율 카드 등록 + 저장 확인
- [ ] 기존 요율 카드 수정 + 저장 확인
- [ ] 요율 카드 삭제 (확인 모달 포함)
- [ ] 유효기간 중첩 방지 유효성 검사 동작
- [ ] 할증 CRUD 동작 확인
- [ ] ADMIN 전용 접근 확인 (타 역할 차단)
- [ ] 회귀 테스트 전체 PASS
- [ ] 코드 커밋 완료 (해시 기재)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] IMP_PROGRESS.md IMP-083 🔔 갱신
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (Agent 작성)

### 방안 A (제안) — 신규 페이지 + 내부 탭 분리

**1. 페이지 구성: 신규 `/ko/admin/rate-cards`**

기존 `/ko/admin/rates` 페이지(legacy schema)와 독립. Legacy 페이지는 유지, 신규 라우팅 Phase 전용 UI는 별도 페이지로 분리.

**2. 내부 탭 (Client Component)**

| 탭 | 내용 | DB 테이블 |
|:---|:-----|:----------|
| Rate Cards | carrier·mode·currency·tiers 요약 테이블 + 등록/수정 폼 | `zen_rate_cards` (IMP-080 schema) |
| Surcharges | type·rate_type·amount·유효기간 CRUD | `zen_surcharges` (IMP-080 schema) |

**3. Rate Cards 탭 상세**

- 목록: carrier(zen_carriers.name) + transport_mode + currency + 유효기간(valid_from~valid_until) + is_active
- 등록 폼: carrier dropdown, mode select, 통화, 중량 슬랩(tiers JSON) 다건 입력, 유효기간
- tiers 입력: weight_min + unit_price 쌍 N건 — 하단 "추가" 버튼으로 동적 Row 추가
- tiers: 기존 `RateTierEditor` 컴포넌트 재사용 (rate_card_id 없이 독립 tiers JSON 직접 조립)

**4. Server Actions (신규)**

`src/app/actions/admin/rate-cards.ts`:
- `createRateCard(data)` — `zen_rate_cards` INSERT + `validateRateOverlap` 검사
- `updateRateCard(id, data)` — UPDATE (tiers JSONB 교체)
- `deleteRateCard(id)` — soft delete (`is_active = false`)

`src/app/actions/admin/surcharges.ts`:
- `createSurcharge(data)` — `zen_surcharges` INSERT
- `updateSurcharge(id, data)` — UPDATE
- `deleteSurcharge(id)` — soft delete

**5. 유효기간 중첩 방지 UX: 하이브리드 (즉시 오류 + 서버 검증)**

- Client: carrier+mode 선택 시 기존 유효기간 범위 표시 (inline 힌트)
- Server: `validateRateOverlap` — `carrier_id + transport_mode` 기준 `valid_from~valid_until` 교집합 검증
- Conflict 시: "YYYY-MM-DD~YYYY-MM-DD 기간에 이미 등록된 요율이 있습니다" 반환 → form inline error

**6. RBAC**

- ADMIN: 전체 CRUD
- MANAGER: 조회 + 수정 (생성/삭제 제한)
- 타 역할: 접근 차단 (403 or redirect)

**7. 파일 목록**

| 파일 | 설명 |
|:----|:------|
| `src/app/[locale]/(dashboard)/admin/rate-cards/page.tsx` | 메인 페이지 (Client Component) |
| `src/app/actions/admin/rate-cards.ts` | Rate Cards Server Actions |
| `src/app/actions/admin/surcharges.ts` | Surcharges Server Actions |
| (기존 `RateCardList`/`RateTierEditor` 컴포넌트 재사용) | |

---

## 설계 확정 (Aiden 작성)

> 착수 시 작성 예정.

---

## 작업 결과

> 이 섹션은 완료 후 B_Kai가 작성합니다.

---

## Aiden 검토

> 이 섹션은 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-23 | Aiden (Claude) | Task 생성 — 지능형 라우팅 Phase-III Admin 요율 카드 관리 UI 구현 지시 |
| 2026-05-24 | B_Kai (OpenCode) | 📝 설계 의견 제출 — 방안 A: 신규 `/ko/admin/rate-cards` + 내부 탭(cards/surcharges) + 유효기간 중첩 하이브리드 검증 |
