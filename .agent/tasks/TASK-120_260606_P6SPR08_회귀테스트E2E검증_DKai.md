# TASK-120 — [P6-SPR-08] Phase 6 회귀 테스트 확장 + E2E 검증

| 항목 | 내용 |
|:---|:---|
| Task ID | TASK-120 |
| Phase | Phase 6 / SPR-08 |
| 생성일 | 2026-06-06 |
| 발령자 | Aiden (Claude, ZEN_CEO) |
| 담당 Agent | D_Kai (주담당) + Riley (E2E 시나리오 확정·UAT 절차서) |
| 우선순위 | P2 |
| 전제조건 | TASK-114 ✅ · TASK-115 ✅ · TASK-116 ✅ · TASK-117 ✅ · TASK-118 ✅ · TASK-119 ✅ |
| 관련 IMP | IMP-104 |
| 관련 설계 | [An-11 §8](../../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md) |
| 상태 | 🚫 블로커 |

---

## 목표

Phase 6 전 구간 회귀 테스트 케이스 확장 및 E2E 시나리오 검증을 완료한다.
- D_Kai: 회귀 테스트 케이스 추가 (각 SPR별 누락 케이스 보완)
- Riley: Phase 6 E2E 시나리오 확정 및 UAT 절차서 작성

---

## 구현 명세

### 1. D_Kai — 회귀 테스트 확장

**대상 파일**: `tests/integration/`

| 테스트 파일 | 커버 대상 |
|:-----------|:---------|
| `p6-db-01.test.ts` | DB 스키마 (테이블 존재·RLS 정책·마이그레이션 데이터) |
| `p6-customs-rates.test.ts` | 통관 요율 CRUD + 역할별 접근 제어 |
| `p6-delivery-rates.test.ts` | 배송 요율 CRUD + LOCAL/TOTAL 유효성 |
| `p6-service-rates.test.ts` | 통합 요율 조회 + 차단 로직 |
| `p6-order-services.test.ts` | 오더-서비스 배정 CRUD + 역할별 격리 |

`LIVE_REGRESSION_TEST_MAP.md` TC-P6-DB-01 ~ TC-P6-E2E-01 전량 등재

### 2. Riley — E2E 시나리오 확정 및 UAT 절차서

**E2E 시나리오 (Playwright)**:

| 시나리오 | 설명 |
|:---------|:----|
| E2E-P6-01 | CARRIER 운송 요율 등록 → 화주 Order 등록(서비스 선택) → 요율 조회 → Order 제출 |
| E2E-P6-02 | CUSTOMS_BROKER 통관 요율 등록 → 화주 Order 등록(항공+통관 선택) → 제출 |
| E2E-P6-03 | DELIVERY_AGENT 배송 요율 등록(LOCAL+TOTAL) → 화주 서비스 선택 → Order 제출 |
| E2E-P6-04 | 역할별 Order 목록 조회 격리 (화주/운송사/통관사/배송사/ADMIN 각 역할) |
| E2E-P6-05 | 노선 미등록 시 Order 요청 불가 메시지 확인 |

**UAT 절차서**: `docs/91_FinalTest/UAT/UAT_P6_서비스요율_멀티배정.md`

---

## DoD (Definition of Done)

- [ ] [D_Kai] Phase 6 회귀 테스트 케이스 전량 추가 — `LIVE_REGRESSION_TEST_MAP.md` 반영
- [ ] [D_Kai] 회귀 테스트 전체 PASS (Phase 1~6 누적)
- [ ] [Riley] E2E 시나리오 5종 Playwright spec 작성 + 실행 PASS
- [ ] [Riley] `UAT_P6_서비스요율_멀티배정.md` 절차서 작성 완료
- [ ] [Riley] `UAT_MASTER.md` Phase 6 시나리오 인덱스 갱신
- [ ] 코드 커밋 (D_Kai) → task file 🔔 → ACTIVE_TASK.md 갱신 → DoD 검증 → 문서 커밋 (R-17 순서 엄수)
- [ ] Riley 산출물은 Riley 담당 커밋으로 별도 제출

---

## [작업 결과]

*(D_Kai 작성)*

---

## [Aiden 검토]

*(Aiden 전속)*
