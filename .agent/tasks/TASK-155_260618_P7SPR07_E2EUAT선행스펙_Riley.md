# TASK-155 — [P7-SPR-07] E2E·UAT 선행 스펙 작성 (주소록 / 일마감)

> **생성일**: 2026-06-18
> **발령자**: Aiden (ZEN_CEO) (GitHub Issue #28)
> **담당**: Riley
> **우선순위**: P4 (품질 · 테스트 · 문서)
> **전제조건**: 없음
> **관련 IMP**: 없음
> **브랜치**: `feature/ups-spr07-riley-e2e-uat-spec`
> **GitHub Issue**: #28

---

## [목표]

주소록(TASK-151) 및 일마감(TASK-152) 기능 구현 전, 선행 테스트 설계(UAT 시나리오 및 Playwright E2E Spec 초안)를 작성하여, 머지 즉시 검증이 가능하도록 준비한다.

---

## [작업 범위]

### §1 — UAT 시나리오 작성
- **UAT-13: 주소록 절차서 (TC-P7-ADDR-01~05)**
  - `docs/91_FinalTest/UAT/UAT_13_주소록.md` 생성
  - 신규 주소록 등록, 조회, 수정, 삭제 및 기본 배송지 설정 관련 시나리오 포함.
- **UAT-14: 일마감 절차서 (TC-P7-CLOSE-01~05)**
  - `docs/91_FinalTest/UAT/UAT_14_일마감.md` 생성
  - 일일 출고 내역 집계, 매출/매입/마진 집계 및 기간별 마감 이력 조회 관련 시나리오 포함.

### §2 — Playwright E2E Spec 초안 작성 (`test.skip` 적용)
- **E2E-21: 주소록 Playwright Spec**
  - `playwright/e2e-21-address-book.spec.ts` 생성
  - `test.skip`을 적용하여 구현 완성 후 실행할 수 있도록 함.
- **E2E-22: 일마감 Playwright Spec**
  - `playwright/e2e-22-daily-close.spec.ts` 생성
  - `test.skip`을 적용하여 구현 완성 후 실행할 수 있도록 함.

### §3 — 마스터 문서 갱신
- `docs/91_FinalTest/UAT/UAT_MASTER.md`에 UAT-13, UAT-14 시나리오 추가 및 총 UAT 케이스 수 갱신.
- `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`에 신규 추가된 TC 목록 추가 및 전체 회귀 테스트 총 개수 갱신.

---

## [DoD — Definition of Done]

- [x] `docs/91_FinalTest/UAT/UAT_13_주소록.md` 작성 완료 (TC-P7-ADDR-01~05)
- [x] `docs/91_FinalTest/UAT/UAT_14_일마감.md` 작성 완료 (TC-P7-CLOSE-01~05)
- [x] `playwright/e2e-21-address-book.spec.ts` 초안 작성 완료 (`test.skip`)
- [x] `playwright/e2e-22-daily-close.spec.ts` 초안 작성 완료 (`test.skip`)
- [x] `UAT_MASTER.md` 갱신 및 케이스 추가 반영
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신 및 총 개수 반영
- [x] 회귀 테스트 전체 PASS (기존 + 신규 TC)
- [x] ZEN_A4 준수 (함수 ≤50줄, 파일 ≤1000줄-문서/1500줄-코드)
- [x] 자가 검증(`check-R17-DoD`) PASS
- [x] 문서 커밋 해시 기재

---

## [회귀 TC 기준] TC-P7-ADDR-01~05, TC-P7-CLOSE-01~05

| TC | 내용 |
|:--:|:----|
| TC-P7-ADDR-01 | 주소록 항목 신규 등록 |
| TC-P7-ADDR-02 | 등록된 주소록 목록 조회 및 기본 정렬(기본 배송지 우선, 가나다순) |
| TC-P7-ADDR-03 | 주소록 항목 수정 |
| TC-P7-ADDR-04 | 주소록 항목 삭제 |
| TC-P7-ADDR-05 | 기본 배송지 설정 및 자동 단일화(다른 배송지는 false로 자동 해제) |
| TC-P7-CLOSE-01 | 일일 출고 내역 집계(RELEASED 상태 오더 패키지 수 및 총 중량) |
| TC-P7-CLOSE-02 | 일일 매출/매입/마진 집계 및 마진율 계산 정확도 |
| TC-P7-CLOSE-03 | 기간별 마감 이력 조회 및 일자별 그룹핑 정확도 |
| TC-P7-CLOSE-04 | 출고 데이터가 없는 날의 집계 (0으로 정상 리턴) |
| TC-P7-CLOSE-05 | 일마감 데이터 권한 검증 (ADMIN/MANAGER 등급만 접근 허용) |

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Gemini] feat: TASK-155 E2E·UAT 선행 스펙 초안 및 UAT 절차서 추가`
2. 상세 파일 `[작업 결과]` 섹션 작성 (커밋 해시 포함) + 상태 🔔 변경
3. ACTIVE_TASK.md 🔄→🔔 반영
4. `scratch/IMP_PROGRESS.md` IMP-120/121 행 🔔 갱신 (또는 TASK-155 관련)
5. **`check-R17-DoD` 자가 검증** — 전항목 통과까지 반복
6. **[문서 커밋]** `[Gemini] docs: TASK-155 완료 보고 — E2E·UAT 선행 스펙 🔔`
7. **[PR 생성]** `feature/ups-spr07-riley-e2e-uat-spec → develop` + `Closes #28`

---

## [발견 이슈]

없음

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | 0cf3adb |
| 회귀 결과 | PASS / 374 PASS |
| 빌드 | PASS |
| 특이사항 | — |
