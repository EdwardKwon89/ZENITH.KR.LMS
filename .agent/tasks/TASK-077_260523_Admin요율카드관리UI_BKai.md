# TASK-077 — Admin 요율 카드 관리 UI (zen_rate_cards CRUD)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-077 |
| IMP-ID | IMP-083 |
| 생성일 | 2026-05-23 |
| 담당 Agent | B_Kai |
| 우선순위 | P3 |
| 전제조건 | TASK-076 ✅ (Composite Pricing 구현 완료) |
| 상태 | 🚫 블로커 — 전제조건 미충족 |
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

> 착수 전 작성 예정 (📝 단계 활용 권장).

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
