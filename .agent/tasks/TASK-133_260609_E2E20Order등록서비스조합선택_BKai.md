# TASK-133 — E2E-20 Order 등록 서비스 조합 선택 플로우 자동화 (Phase 6 통합)

> **발령일**: 2026-06-09
> **담당 Agent**: B_Kai (OpenCode)
> **우선순위**: P2
> **전제조건**: TASK-117 ✅ · TASK-120 ✅ · TASK-131 ✅
> **관련 IMP**: IMP-100(서비스 배정 Actions) · IMP-101(Order 등록 UI 개선)
> **상태**: ⬜

---

## 배경 및 목표

Phase 6에서 Order 등록 3-step Wizard에 **서비스 조합 선택 Step**이 신규 추가되었다 (TASK-117, IMP-101). 화주는 오더 등록 시 통관(CUSTOMS) + 배송(DELIVERY) 서비스를 조합 선택하고 요율을 확인한 뒤 제출한다.

로컬 DB에 CUSTOMS/DELIVERY 조직 4건 + 서비스 요율 17건이 시드되었으므로, 해당 플로우를 Playwright E2E로 자동화한다.

**목표**: E2E-20 — Order 등록 서비스 조합 선택 플로우 자동화 (시나리오 A·B)

---

## 설계 확정 (Aiden — 2026-06-09)

**직행 구현** (단순 Task — 설계 의견 단계 생략)

**시나리오 구성**:
- **시나리오 A**: SHIPPER 계정으로 오더 등록 — 통관(CUSTOMS) + 배송(DELIVERY) 서비스 선택 → 요율 표시 확인 → 제출 → `zen_order_services` 배정 레코드 검증
- **시나리오 B**: 서비스 미선택(통관/배송 없이 운송만) → 제출 시 제출 가능 여부 확인 (현재 선택 없이도 제출 가능 여부 확인)

**파일 위치**: `src/e2e/e2e-20-order-service-selection.spec.ts`

---

## 작업 범위

### §1 — 전제조건 확인

1. 로컬 DB 서비스 데이터 존재 확인:
   - CUSTOMS 조직 2건 (`zen_organizations` type='CUSTOMS', status='ACTIVE')
   - DELIVERY 조직 2건 (`zen_organizations` type='DELIVERY', status='ACTIVE')
   - CUSTOMS 요율 (`zen_customs_rates`) 최소 1건
   - DELIVERY 요율 (`zen_delivery_rates`) 최소 1건

2. 기존 E2E 시드 계정 확인 (`src/e2e/` seedOrders, SHIPPER 계정)

### §2 — E2E-20 spec 작성

파일: `src/e2e/e2e-20-order-service-selection.spec.ts`

**시나리오 A — 서비스 조합 선택 포함 오더 등록**:
```
1. SHIPPER 계정 로그인
2. 오더 등록 페이지 이동 (/orders/new 또는 해당 경로)
3. Step 1: 기본 정보 입력 (출발지·도착지·운송수단)
4. Step 2 (서비스 조합 선택):
   - 통관 서비스 드롭다운 표시 확인
   - CUSTOMS 조직 1건 선택 → 요율 표시 확인
   - DELIVERY 서비스 드롭다운 표시 확인
   - DELIVERY 조직 1건 선택 → 요율 표시 확인
5. Step 3 (또는 다음 Step): 화물 정보 입력 후 제출
6. 제출 성공 확인 (오더 목록 or 상세 페이지 이동)
7. DB 검증: zen_order_services에 CUSTOMS + DELIVERY 배정 레코드 존재
```

**시나리오 B — 서비스 미선택 오더 등록**:
```
1. SHIPPER 계정 로그인
2. 오더 등록 — Step 2에서 서비스 미선택
3. 제출 → 현재 시스템 동작 확인:
   - 필수 선택 검증 오류 표시 시: 오류 메시지 확인
   - 선택 없이 제출 가능 시: 오더 생성 후 zen_order_services 레코드 없음 확인
```

### §3 — 회귀 테스트 실행

```bash
rtk npm run test:regression
```

### §4 — R-17 완료 보고

R-17 v1.6 절차 전 단계 준수:
1. 코드 커밋: `[B_Kai] test: E2E-20 Order 등록 서비스 조합 선택 자동화`
2. task file [작업 결과] + **헤더 상태 🔄→🔔** 변경
3. ACTIVE_TASK.md 상태 반영
4. IMP_PROGRESS.md 해당 없음
5. `check-R17-DoD` 실행 — 전항목 ✅ 확인
6. 문서 커밋

---

## DoD (완료 정의)

- [ ] `src/e2e/e2e-20-order-service-selection.spec.ts` 파일 생성 확인
  - 증빙: 파일 경로 + 줄 수
- [ ] 시나리오 A: CUSTOMS + DELIVERY 서비스 선택 플로우 PASS 확인
  - 증빙: Playwright 실행 결과 (PASS)
- [ ] 시나리오 B: 서비스 미선택 동작 확인
  - 증빙: Playwright 실행 결과 (PASS)
- [ ] DB 검증: `zen_order_services` 배정 레코드 존재 확인 (시나리오 A 기준)
  - 증빙: DB 쿼리 결과 또는 assertion 로그
- [ ] 회귀 테스트 전체 PASS
  - 증빙: `N/N (PASS N, FAIL 0)` 수치
- [ ] 코드 커밋 해시: `(기재 필수 — TBD 금지)`

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| — | — | — | — |

---

## [설계 의견]

_(해당 없음 — 단순 Task 직행)_

---

## [설계 확정]

**2026-06-09 Aiden 확정**: 시나리오 A·B 구성 직행. E2E-20 spec 신규 작성.

---

## [작업 결과]

_(B_Kai 완료 후 작성)_

---

## [Aiden 검토]

_(Aiden 검토 후 작성)_
