# [착수 지시서] PH14-E2E-07: 통관 신고 생성 UI 구현 및 E2E 검증

> **문서번호:** DIRECTIVE-PH14-E2E-07
> **발령일:** 2026-05-06
> **발령 주체:** Aiden (Claude)
> **수행 주체:** Riley (Gemini)
> **검증 주체:** Aiden (Claude)
> **상태:** 🔵 착수 지시

---

## 1. 배경 및 발령 사유

E2E-06 PASS 검증 후 E2E-07 착수 준비 과정에서 **블로커**가 발견되었습니다.

- `createDeclaration` 서버 액션은 `src/app/actions/customs.ts`에 구현되어 있으나,
- 이를 호출하는 **UI 컴포넌트가 전무**합니다.
- E2E-07 시나리오 Step 1 "통관 신고 생성"은 현재 UI 경로로 수행 불가능한 상태입니다.

**R-10 (기능-UI 결합 검증 의무)** 기준, 백엔드 로직만 완성된 상태는 미완성으로 간주합니다.  
본 지시서는 UI 구현을 선행한 후 E2E-07을 수행하도록 지시합니다.

---

## 2. 작업 범위

### Task A — `createDeclaration` UI 구현 (선행 필수)

**대상 파일:** `src/app/[locale]/(dashboard)/admin/customs/customs-client.tsx`

**구현 내용:**
1. 상단 "신고 생성" 버튼 추가 (`ZenButton` 사용)
2. 버튼 클릭 시 신고 생성 모달(`CreateDeclarationModal`) 오픈
3. 모달 내 필수 입력 폼:
   - **오더 번호 입력** (`orderId`: string) — 텍스트 입력
   - **화물 설명** (`cargoDescription`: string) — textarea
   - **신고 금액** (`declaredValue`: number) — 숫자 입력
   - **통화 코드** (`currencyCode`: string, default: `'KRW'`) — select 또는 input
4. '신고 생성' 제출 버튼 → `createDeclaration(payload)` 서버 액션 호출
5. 성공 토스트 ("신고가 생성되었습니다") 및 목록 자동 갱신
6. 실패 시 에러 토스트 처리

**참조 패턴:** 기존 `CustomsDetailModal` 구조 및 `VOC admin-client.tsx` 모달 패턴을 준용할 것.

---

### Task B — E2E-07 Playwright 테스트 작성 및 수행

**파일:** `tests/e2e/e2e-07-customs.spec.ts` (신규 생성)

**시나리오 (E2E_SCENARIOS.md E2E-07 기준):**

| Step | 동작 | 기대 결과 |
|:---:|:---|:---|
| 1 | 어드민 로그인 → `/ko/admin/customs` 접속 → "신고 생성" 버튼 클릭 | 신고 생성 모달 오픈 |
| 2 | orderId: `d197352a-ba9f-4640-9176-c50c852d8138` (Z-FIN-E2E05-01), cargo: `E2E Test Cargo`, value: `5000`, currency: `KRW` 입력 후 제출 | "신고가 생성되었습니다" 토스트, 목록에 PENDING 상태 신규 레코드 표시 |
| 3 | 해당 레코드의 Send(제출) 버튼 클릭 → confirm 팝업 확인 | 상태 PENDING → SUBMITTED 전환, 신고번호(DCL-XXXX) 자동 부여 |
| 4 | 해당 레코드의 Eye(상세) 버튼 클릭 → 모달에서 상태를 `APPROVED`로 변경, 신고번호/관리자 메모 입력 후 '상태 저장' | 상태 SUBMITTED → APPROVED 전환, `resolved_at` 설정 |

**계정 정보:**
```
ADMIN_EMAIL = 'admin@zenith.kr'
PASSWORD    = 'password1234'
TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138'
```

**스크린샷 저장 경로:** `docs/99_Manual/E2E_07_Result/`
- `e2e_07_01_declaration_created.png` — Step 2 완료 후
- `e2e_07_02_submitted.png` — Step 3 완료 후
- `e2e_07_03_approved.png` — Step 4 완료 후

---

## 3. 완료 기준 (Definition of Done)

- [ ] "신고 생성" 버튼 및 모달 UI 정상 렌더링
- [ ] `createDeclaration` 서버 액션 정상 호출 및 PENDING 레코드 생성
- [ ] PENDING → SUBMITTED → APPROVED 상태 전환 E2E 검증 완료
- [ ] 스크린샷 3종 지정 경로 저장
- [ ] `rtk npm run test:regression` 161/161 PASS
- [ ] `docs/08_Self_Audit/Walkthroughs/PH14_E2E07_CUSTOMS.md` Walkthrough 작성

---

## 4. 규정 체크리스트

| 규정 | 항목 | 확인 |
|:---:|:---|:---:|
| R-08 | 회귀 테스트 수행 (161/161 PASS) | □ |
| R-09 | 회귀 테스트 마스터 맵 업데이트 (신규 TC 없을 경우 사유 명시) | □ |
| R-10 | UI 구동 증적(스크린샷 3종) 포함 | □ |
| R-13 | 테스트 결과물 `docs/99_Manual/E2E_07_Result/` 저장 | □ |

---

## 5. 주의 사항

1. **오더 ID 재사용**: E2E-05/06에서 사용한 `Z-FIN-E2E05-01` 오더를 재사용합니다. 해당 오더가 통관 신고 연계 가능 상태인지 첫 실행 전 DB에서 확인하십시오.
2. **중복 신고 주의**: 테스트 재실행 시 동일 오더에 신고가 중복 생성될 수 있습니다. spec 내 신고 생성 후 완료 시까지 오더 기준 기존 신고 여부를 확인하는 로직 추가를 권장합니다.
3. **confirm 팝업**: `handleSubmit`에 `confirm()` 다이얼로그가 있습니다. Playwright의 `page.on('dialog', d => d.accept())` 처리가 필요합니다.
4. **R-03 위반 금지**: Aiden의 검증 완료 전 ROADMAP/WBS 완료 처리 절대 금지.
