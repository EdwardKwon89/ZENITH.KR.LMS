# TASK-105 — UAT 절차서 보완: TISA 3계층·Dashboard 역할별 표시

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-105 |
| **생성일** | 2026-06-01 |
| **할당 Agent** | B_Kai |
| **우선순위** | P3 |
| **전제조건** | TASK-103 ✅ · TASK-104 ✅ |
| **관련 IMP** | IMP-092 · IMP-093 |
| **상태** | 🔔 |

---

## 목표

TASK-103(IMP-092, TISA 3계층 구조)·TASK-104(IMP-093, TISA Dashboard 실 연동)의 구현 변경 사항을 UAT 절차서에 반영한다.

---

## 배경

TASK-103·104 완료로 다음 기능이 추가/변경되었으나, 기존 UAT 절차서에 반영되지 않았다:

| 구분 | 변경 내용 |
|:----|:---------|
| TASK-103 | `zen_rate_cards`에 `carrier_cost` · `margin_rate` · `platform_fee_rate` 3개 필드 추가 → Admin Rate Card 폼에 신규 필드 표시 |
| TASK-104 | Order Detail TISA Dashboard — Admin: 전체 필드 / Shipper: Base Amount + Currency 만 표시 (역할별 분기) |
| TASK-104 | 경로 미선택 fallback 메시지: "경로 최적화를 완료하면 요율이 자동으로 매칭됩니다." |
| TASK-104 | 경로 선택 완료 후 자동 Rate Snapshot 생성 |

---

## 작업 범위

### §1 — UAT_DEFECT_LOG.md 상태 갱신

파일: `docs/91_FinalTest/UAT/UAT_DEFECT_LOG.md`

| 결함 ID | 현행 상태 | 수정 후 | 수정 커밋 |
|:--------|:--------:|:------:|:---------|
| DEF-032 | 미수정 | 수정완료 | TASK-104 `6a0dbab` |
| DEF-035 | 미수정 | 수정완료 | TASK-103 `8132d98` |

- 각 결함 행의 `상태` 컬럼: `미수정` → `수정완료`
- 각 결함 행의 `수정 커밋` 컬럼: 커밋 해시 기재
- 파일 상단 현황 요약의 "기능오류 미수정" 수치 조정 (현행 -2)
- 개정 이력 추가

### §2 — UAT_10_지능형라우팅_운임.md: Rate Card 폼 필드 보완

파일: `docs/91_FinalTest/UAT/UAT_10_지능형라우팅_운임.md`

UAT-10-06 Rate Card 관리 시나리오의 신규 등록 폼 검증 항목에 3개 필드 추가:

```
변경 전:
| 3 | ... | 신규 등록 폼 오픈 (Carrier·Mode·Currency·Tiers·Valid From·Valid Until) |

변경 후:
| 3 | ... | 신규 등록 폼 오픈 (Carrier·Mode·Currency·Tiers·Carrier Cost·Margin Rate·Platform Fee Rate·Valid From·Valid Until) |
```

Carrier Cost / Margin Rate / Platform Fee Rate 입력 후 저장 검증 항목 추가 (step 4 또는 5에 항목 삽입):
```
| X | 신규 폼 | Carrier Cost: 4.00, Margin Rate: 15, Platform Fee Rate: 5 입력 | 숫자 입력값 | 3개 필드 정상 입력 가능 | ☐ |
```

### §3 — TISA Dashboard 역할별 표시 시나리오 신규 추가

`docs/91_FinalTest/UAT/UAT_10_지능형라우팅_운임.md` 또는 `UAT_02_오더관리.md` 말미에 신규 시나리오 추가:

**시나리오 A — Admin 뷰 (전체 필드 표시)**
1. Admin 로그인 → 경로 최적화 완료 오더의 Order Detail 진입
2. TISA Rate Snapshot 패널 확인: Rate Card ID / Version / Priority / Validity Period / Cost Breakdown (Carrier Cost · Platform Fee · Total) / Auto Match 배지 표시
3. Override Rate 버튼 표시 확인

**시나리오 B — Shipper 뷰 (기본 정보만)**
1. CORPORATE 계정 로그인 → 본인 오더 Order Detail 진입
2. TISA Rate Snapshot 패널 확인: **Base Amount + Currency 만** 표시
3. Rate Card ID / Version / Cost Breakdown / Auto Match 배지 **비표시** 확인

**시나리오 C — 경로 미선택 fallback**
1. 경로 미선택(route_option_id null) 오더 Order Detail 진입
2. TISA 패널: "No rate snapshot applied yet." + "경로 최적화를 완료하면 요율이 자동으로 매칭됩니다." 메시지 표시 확인

### §4 — UAT_MASTER.md 시나리오 수 갱신

신규 시나리오 추가 수만큼 UAT_MASTER.md 합계 반영.

---

## DoD (완료 기준)

- [x] UAT_DEFECT_LOG.md — DEF-032 상태 수정완료·커밋 해시 기재
- [x] UAT_DEFECT_LOG.md — DEF-035 상태 수정완료·커밋 해시 기재
- [x] UAT_DEFECT_LOG.md — 현황 요약 기능오류 미수정 수치 갱신
- [x] UAT_10 — Rate Card 폼 검증 항목에 carrier_cost / margin_rate / platform_fee_rate 3개 필드 추가
- [x] TISA Dashboard 시나리오 A (Admin 전체 필드) 추가
- [x] TISA Dashboard 시나리오 B (Shipper BaseAmount+Currency 만) 추가
- [x] TISA Dashboard 시나리오 C (경로 미선택 fallback) 추가
- [x] UAT_MASTER.md 합계 갱신
- [x] 회귀 테스트 전체 PASS (228/229, 1건 pre-existing — 문서와 무관)
- [x] 코드 커밋 완료 (`96e9a0f`)
- [x] task file `[작업 결과]` 섹션 기재 + 상태 🔔로 변경
- [x] ACTIVE_TASK.md 상태 🔄→🔔 반영
- [x] `scratch/IMP_PROGRESS.md` 해당 행 갱신 불필요 (문서 보완 전용)

---

## 참조 문서

- `docs/91_FinalTest/UAT/UAT_DEFECT_LOG.md` — 결함 로그
- `docs/91_FinalTest/UAT/UAT_10_지능형라우팅_운임.md` — Rate Card 관리 시나리오
- `docs/91_FinalTest/UAT/UAT_02_오더관리.md` — 오더 상세 시나리오
- `docs/91_FinalTest/UAT/UAT_MASTER.md` — 마스터 인덱스
- TASK-103 완료 결과 (carrier_cost/margin_rate/platform_fee_rate 컬럼)
- TASK-104 완료 결과 (isAdminView prop, fallback 메시지, 역할별 shape)

---

## [설계 의견]

(단순 Task — 설계 결정 불필요, ⬜ → 🔄 직행)

---

## [작업 결과]

### §1 — UAT_DEFECT_LOG.md 상태 갱신
- DEF-032: 상태 `미수정`→`수정완료`, 수정 커밋 `6a0dbab` (TASK-104) 기재, Aiden 확인 ✅
- DEF-035: 상태 `미수정`→`수정완료`, 수정 커밋 `8132d98` (TASK-103) 기재, Aiden 확인 ✅
- 현황 요약: 기능오류 미수정 5→3, 수정완료 6→8 (합계 35 유지)
- 개정 이력 추가 (2026-06-01 B_Kai)

### §2 — UAT_10_지능형라우팅_운임.md Rate Card 폼 필드 보완
- UAT-10-04 step 2·3: 목록 컬럼·폼 필드에 `Carrier Cost`·`Margin Rate`·`Platform Fee Rate` 추가
- UAT-10-04 step 5(신규): 3개 필드 입력 검증
- UAT-10-04 step 9: Edit 폼에 3개 필드 포함 확인
- 합격 기준에 3개 필드 입력·저장 추가

### §3 — TISA Dashboard 역할별 표시 (UAT-10-07)
- 시나리오 A: Admin 뷰 — 전체 필드 표시
- 시나리오 B: Shipper 뷰 — Base Amount + Currency 만
- 시나리오 C: 경로 미선택 fallback

### §4 — UAT_MASTER.md 갱신
- UAT-10-07 행 추가, 총 79→80개

- 커밋: `96e9a0f`

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:----|:----:|:----|
| 2026-06-01 | Aiden (Claude) | v1.0 — TASK-105 발령. TASK-103·104 변경 사항 UAT 절차서 반영. B_Kai 배정 |
