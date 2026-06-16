# TASK-149 — [P7-SPR-04] 오더 등록 직접배송/픽업 선택 UI

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-149 |
| **생성일** | 2026-06-16 |
| **할당 Agent** | Riley |
| **우선순위** | P1 |
| **전제조건** | TASK-138 ✅ (zen_orders 컬럼 delivery_method/pickup_* 이미 추가됨) |
| **관련 IMP** | IMP-118 |
| **브랜치** | `feature/ups-spr04-riley-delivery-method` (신규 독립 브랜치) |
| **커밋 태그** | `[Riley]` |
| **상태** | 🔄 |

> ⚠️ **Scope 제한**: 본 Task는 오더 등록 UI에서 delivery_method 필드 연결에 한정된다.  
> 다른 기능/모듈 수정 절대 금지.

---

## [목표]

오더 등록 폼에 **직접배송(DIRECT) / 픽업(PICKUP) 선택** 기능을 추가한다.  
DB 컬럼은 TASK-138 (IMP-110)에서 이미 생성됨 — UI + Server Action 연결만 필요.

---

## [작업 범위]

### 1. DB 확인 (읽기 전용)

아래 컬럼이 `zen_orders` 테이블에 존재하는지 확인:
```sql
delivery_method VARCHAR(10) CHECK (delivery_method IN ('DIRECT','PICKUP'))
pickup_location TEXT
pickup_contact_name TEXT
pickup_contact_tel TEXT
```
> 존재하지 않으면 Aiden에게 즉시 보고 (착수 금지).

### 2. 오더 등록 폼 수정

대상 파일 확인 후 적절한 컴포넌트에 추가:
- `OrderRegistrationForm.tsx` 또는 관련 step 컴포넌트

**UI 구성**:
- delivery_method: Radio 또는 Select — `DIRECT` (직접배송) / `PICKUP` (픽업 수령)
- PICKUP 선택 시 조건부 표시:
  ```
  픽업 장소 *     [입력]
  담당자 이름 *   [입력]
  담당자 연락처 * [입력]
  ```
- DIRECT 선택 시 픽업 필드 숨김

**Zod 검증**:
```typescript
delivery_method: z.enum(['DIRECT', 'PICKUP']).optional(),
pickup_location: z.string().optional(),
pickup_contact_name: z.string().optional(),
pickup_contact_tel: z.string().optional(),
// PICKUP 선택 시 pickup_location 필수 refine
```

### 3. Server Action 수정

`createOrder` 또는 관련 Server Action에 delivery_method 필드 포함:
```typescript
delivery_method: formData.delivery_method ?? 'DIRECT',
pickup_location: formData.pickup_location ?? null,
pickup_contact_name: formData.pickup_contact_name ?? null,
pickup_contact_tel: formData.pickup_contact_tel ?? null,
```

### 4. i18n

`messages/ko.json`, `messages/en.json`:
- `orders.form.delivery_method.label`
- `orders.form.delivery_method.direct`
- `orders.form.delivery_method.pickup`
- `orders.form.pickup_location`
- `orders.form.pickup_contact_name`
- `orders.form.pickup_contact_tel`

### 5. 테스트

`tests/unit/orders/delivery-method.test.ts` — TC-UPS-ORDER 신규:
- TC-UPS-ORDER-01: DIRECT 선택 — pickup 필드 불필요, createOrder 정상 저장
- TC-UPS-ORDER-02: PICKUP 선택 + pickup_location 입력 — 정상 저장
- TC-UPS-ORDER-03: PICKUP 선택 + pickup_location 누락 — Zod 검증 에러 반환

---

## [DoD]

- [ ] `zen_orders` delivery_method/pickup_* 컬럼 존재 확인
- [ ] 오더 등록 폼 delivery_method 선택 UI 구현 (PICKUP 시 조건부 필드 표시)
- [ ] Server Action delivery_method 필드 포함
- [ ] Zod 검증 (PICKUP → pickup_location 필수)
- [ ] i18n ko/en 키 추가
- [ ] `npm run test:regression` 전체 PASS
- [ ] LIVE_REGRESSION_TEST_MAP.md TC-UPS-ORDER 등재
- [ ] 빌드 0 Errors
- [ ] 코드 커밋 해시: `________`
- [ ] 문서 커밋 해시: `________`
- [ ] `check-R17-DoD` 실행 완료 — 전항목 ✅

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Riley] feat: TASK-149 IMP-118 오더 직접배송/픽업 선택 UI`
2. **본 파일 `[작업 결과]` 작성** + 헤더 상태 🔔 변경 + 코드 커밋 해시 기재
3. **ACTIVE_TASK.md** ⬜→🔔 반영
4. **IMP_PROGRESS.md** IMP-118 행 🔔 갱신
5. **`check-R17-DoD` 실행** — 전항목 통과 확인
6. **[문서 커밋]** `[Riley] docs: TASK-149 완료 보고 — IMP-118 오더 직접배송/픽업 UI 🔔`
   - 포함: task file + ACTIVE_TASK.md + IMP_PROGRESS.md + LIVE_REGRESSION_TEST_MAP.md

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## [Aiden 검토]

_(Aiden 검토 후 기재)_

---

## [작업 결과]

_(Riley가 작성 — 완료 후 기재)_

TBD
