# TASK-126 — Phase 6 + IMP-107/108 반영 UAT 시나리오 보완

> **발령일**: 2026-06-09
> **담당 Agent**: B_Kai (OpenCode)
> **우선순위**: P2
> **전제조건**: TASK-125 ✅ (IMP-107 완료), TASK-124 ✅ (IMP-108 완료)
> **관련 IMP**: IMP-107 · IMP-108 · Phase 6 (IMP-097~105)
> **상태**: ⬜

---

## 목표

Phase 6 완료(신규 서비스 역할 모델 + 멀티 서비스 배정) 및 IMP-107/108(TISA 스냅샷 강화 + max_charge 상한선) 완료 이후, UAT 절차서에 누락된 시나리오를 추가하여 Edward의 UAT 전체 실행(TASK-127 예정)을 준비한다.

---

## 작업 범위

### §1 — IMP-108 (max_charge 상한선) UAT 시나리오 추가

**대상 파일**: `docs/99_Manual/UAT/UAT_10_지능형라우팅.md` 또는 신규 `UAT_12_요율Slab및상한선.md`

추가할 시나리오:
- **UAT-XX-01**: Weight Slab 요율 max_charge 적용 검증
  - 시나리오: 실제 운임이 max_charge 초과 시 상한선(max_charge)으로 capping되는지 확인
  - `applied_pricing_basis = 'MAX_CHARGE'` 반환 확인
- **UAT-XX-02**: CBM Slab 요율 max_charge 적용 검증
  - 시나리오: 부피 기준 운임이 max_charge 초과 시 상한선으로 capping 확인
- **UAT-XX-03**: max_charge 미설정 시 정상 운임 적용 확인
  - 시나리오: max_charge = NULL일 때 계산된 운임 그대로 적용 확인

### §2 — IMP-107 (TISA 스냅샷 강화) UAT 시나리오 추가

**대상 파일**: 위와 동일 파일

추가할 시나리오:
- **UAT-XX-04**: TISA 스냅샷 저장 검증 (slab 이력 + pricing_basis)
  - 시나리오: 오더 등록 및 요율 적용 후 `zen_order_rate_snapshots` 테이블에 8개 신규 컬럼 저장 확인
  - 검증 항목: `weight_slab_min`, `weight_slab_max`, `cbm_slab_min`, `cbm_slab_max`, `tiers_snapshot`, `pricing_basis`, `applied_weight_kg`, `applied_cbm`

### §3 — Phase 6 신규 역할 시나리오 커버리지 확인

**대상**: 기존 UAT_MASTER 목록 점검

확인 항목:
- `CUSTOMS_BROKER` 역할로 로그인 후 통관 서비스 요율 조회/관리 시나리오 존재 여부
- `DELIVERY_AGENT` 역할로 로그인 후 배송 서비스 요율 조회/관리 시나리오 존재 여부
- 신규 역할로 Order 목록 RLS 격리 확인 시나리오 존재 여부
- 누락 시 간략 시나리오 추가 (기존 UAT 파일에 삽입)

### §4 — UAT_MASTER 업데이트

- 신규 추가 시나리오 목록을 `docs/91_FinalTest/UAT/UAT_MASTER.md`에 반영 (※ 실제 파일 경로는 `docs/99_Manual/UAT/UAT_MASTER_CHECKLIST.md`가 아닌 `docs/91_FinalTest/UAT/UAT_MASTER.md`임)
- 전체 시나리오 카운트 갱신

---

## DoD (완료 정의)

- [x] §1: IMP-108 max_charge 관련 UAT 시나리오 최소 2개 이상 추가 ✅ (UAT-10-08~10, 3개) + 파일 커밋 해시 기재
- [x] §2: IMP-107 스냅샷 관련 UAT 시나리오 최소 1개 추가 ✅ (UAT-10-11, 1개) + 파일 커밋 해시 기재
- [x] §3: Phase 6 신규 역할 시나리오 커버리지 확인 완료 ✅ (UAT-12-01~05 커버리지 양호, 추가 불필요)
- [x] §4: UAT_MASTER.md 갱신 완료 ✅ + 총 시나리오 수: 89개
- [x] 회귀 테스트 전체 PASS ✅ (`316 passed, 60 files`)
- [ ] 코드 커밋: `[B_Kai] docs: TASK-126 UAT 시나리오 보완 — IMP-107/108 + Phase6 역할`
- [ ] 문서 커밋: `[B_Kai] docs: TASK-126 완료 보고 — task file 🔔`

---

## R-17 완료 보고 절차

1. **[코드 커밋]** UAT 시나리오 파일 커밋 (UAT 문서 파일)
2. **본 파일 `[작업 결과]` 섹션 작성** — 1번 커밋 해시 포함 + 상태 🔔 변경
3. **ACTIVE_TASK.md 상태 동시 반영** — 🔄→🔔
4. **`scratch/IMP_PROGRESS.md` — 해당 없음 (UAT 문서 작업)**
5. **DoD 실물 검증** — 모든 [ ] → [x] 체크 + 증거값 기재 확인
6. **[문서 커밋]** task file·ACTIVE_TASK 포함

---

## [설계 의견]

_(B_Kai 작성 시 기재)_

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

- **Commit hash**: `380ac25` (1차 — UAT 문서), `[TBD]` (2차 — task 파일)
- **UAT_10.md**: v5.0 — UAT-10-08~10 (max_charge 3종) + UAT-10-11 (TISA snapshot) 추가, 310→602 lines
- **UAT_MASTER.md**: 인덱스 4행 추가, 총계 85→89개 갱신, 개정 이력 기재
- **Phase 6 커버리지**: UAT-12-01~05로 CUSTOMS_BROKER/DELIVERY_AGENT/CARRIER 전 역할 커버리지 확인 완료 (추가 불필요)
- **회귀 테스트**: 60 files · 316 tests ✅ all PASS
- **DoD**: §1~§4 전항 완료

---

## [Aiden 검토]

_(Aiden 전속)_
