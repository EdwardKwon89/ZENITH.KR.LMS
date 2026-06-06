# Phase 6 SPR 진척 관리 대시보드

> **프로젝트**: ZENITH_LMS
> **Phase**: Phase 6 — 신규 서비스 역할 모델 + 멀티 서비스 배정 구조 (v1.5.0)
> **설계 문서**: [An-11](../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md)
> **최초 작성**: 2026-06-06 (Aiden)
> **업데이트 규칙**: 각 TASK 완료 커밋 시 해당 행 갱신 필수

---

## 상태 범례

| 심볼 | 의미 |
|:---:|:---|
| 🚫 | 블로커 — 선행 TASK 미완료 |
| ⬜ | 미착수 |
| 🔄 | 구현 중 |
| 🔔 | 완료 — Aiden 검토 대기 |
| ✅ | Aiden PASS 확정 |
| ❌ | 반려 — 재작업 |

---

## Phase 6 전체 진척도

| 항목 | 수치 |
|:----|:----|
| 전체 SPR | 8개 |
| 완료 SPR | 4개 (SPR-01·02·03 ✅, SPR-06 🔔) |
| 총 공수 | 40 MD |
| 완료 공수 | 22 MD |
| 진행률 | 55% |
| 최근 업데이트 | 2026-06-06 (D_Kai) — TASK-118(SPR-06) 🔔 검토 요청 · 259/259 PASS |

---

## SPR 진척 현황

| SPR | TASK-ID | 내용 | 담당 | IMP | 공수 | 전제조건 | 상태 | 완료일 | 코드커밋 |
|:---:|:-------:|:----|:----:|:---:|:----:|:--------:|:----:|:------:|:-------:|
| SPR-01 | [TASK-113](../.agent/tasks/TASK-113_260606_P6SPR01_DB스키마기반구축_DKai.md) | DB 스키마 기반 구축 (org_type·요율테이블·order_services·migration) | D_Kai | IMP-097 | 8 MD | 없음 | ✅ | 2026-06-06 | `bb9a3fc` |
| SPR-02 | [TASK-114](../.agent/tasks/TASK-114_260606_P6SPR02_통관서비스요율관리_DKai.md) | 통관 서비스 요율 관리 (Actions + UI) | D_Kai | IMP-098 | 5 MD | TASK-113 ✅ | ✅ | 2026-06-06 | `a64f970` |
| SPR-03 | [TASK-115](../.agent/tasks/TASK-115_260606_P6SPR03_배송서비스요율관리_DKai.md) | 배송 서비스 요율 관리 (Actions + UI, LOCAL+TOTAL) | D_Kai | IMP-099 | 5 MD | TASK-113 ✅ | ✅ | 2026-06-06 | `c745fa0` |
| SPR-04 | [TASK-116](../.agent/tasks/TASK-116_260606_P6SPR04_통합서비스요율조회API_DKai.md) | 통합 서비스 요율 조회 API + 오더-서비스 배정 Actions | D_Kai | IMP-100 | 5 MD | TASK-114 ✅ · TASK-115 ✅ | ⬜ | — | — |
| SPR-05 | [TASK-117](../.agent/tasks/TASK-117_260606_P6SPR05_Order등록UI개선_DKai.md) | Order 등록 UI 개선 (서비스조합선택·요율확인 Step 추가) | D_Kai | IMP-101 | 6 MD | TASK-116 ✅ | 🚫 | — | — |
| SPR-06 | [TASK-118](../.agent/tasks/TASK-118_260606_P6SPR06_Order목록역할별격리_DKai.md) | Order 목록 역할별 격리 (CUSTOMS_BROKER·DELIVERY_AGENT RLS) | D_Kai | IMP-102 | 4 MD | TASK-113 ✅ | 🔔 | — | `270146e` |
| SPR-07 | [TASK-119](../.agent/tasks/TASK-119_260606_P6SPR07_운송요율CARRIER직접등록_DKai.md) | 운송 요율 CARRIER 직접 등록 허용 + platform_fee_rate 격리 | D_Kai | IMP-103 | 3 MD | TASK-113 ✅ | ⬜ | — | — |
| SPR-08 | [TASK-120](../.agent/tasks/TASK-120_260606_P6SPR08_회귀테스트E2E검증_DKai.md) | 회귀 테스트 확장 + E2E 검증 + UAT 절차서 | D_Kai + Riley | IMP-104 | 4 MD | TASK-114~119 전량 ✅ | 🚫 | — | — |

---

## SPR 의존성 다이어그램

```
TASK-113 (SPR-01) ──┬──► TASK-114 (SPR-02) ──┐
                    │                          ├──► TASK-116 (SPR-04) ──► TASK-117 (SPR-05) ──┐
                    ├──► TASK-115 (SPR-03) ──┘                                                │
                    │                                                                          ├──► TASK-120 (SPR-08)
                    ├──► TASK-118 (SPR-06) ─────────────────────────────────────────────────►│
                    │                                                                          │
                    └──► TASK-119 (SPR-07) ─────────────────────────────────────────────────►┘
```

**즉시 착수 가능 (⬜)**: TASK-116 (SPR-04) · TASK-119 (SPR-07) — 병렬 진행 가능
**재작업 필요 (❌)**: TASK-118 (SPR-06) — 코드 커밋 없음·R-17 위반 3건
**TASK-113 상태**: ✅ Aiden PASS (2026-06-06)

---

## IMP 진척 현황

| IMP | 내용 | TASK | 상태 | 완료일 |
|:---:|:----|:----:|:----:|:------:|
| IMP-097 | DB 스키마 기반 (org_type·rate tables·order_services·RLS·migration) | TASK-113 | ✅ | 2026-06-06 |
| IMP-098 | 통관 서비스 요율 관리 Actions + UI | TASK-114 | ✅ | 2026-06-06 |
| IMP-099 | 배송 서비스 요율 관리 Actions + UI | TASK-115 | ✅ | 2026-06-06 |
| IMP-100 | 통합 서비스 요율 조회 API + 오더-서비스 배정 Actions | TASK-116 | ⬜ (TASK-114·115 ✅ — 즉시 착수 가능) | — |
| IMP-101 | Order 등록 UI 개선 (서비스조합선택·요율확인·GAP-P6-01 보완) | TASK-117 | 🚫 (TASK-116 ✅ 후) | — |
| IMP-102 | Order 목록 RLS 역할별 격리 (CUSTOMS_BROKER·DELIVERY_AGENT) | TASK-118 | ⬜ (TASK-113 ✅ 후 착수 가능) | — |
| IMP-103 | 운송 요율 CARRIER 직접 등록 허용 + platform_fee_rate 격리 | TASK-119 | ⬜ (TASK-113 ✅ 후 착수 가능) | — |
| IMP-104 | Phase 6 회귀 테스트 + E2E 검증 + UAT 절차서 | TASK-120 | 🚫 | — |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:----|
| 2026-06-06 | Aiden (Claude) | Phase 6 SPR 진척 추적기 초기 작성 — TASK-113~120 발령 완료 |
| 2026-06-06 | D_Kai (OpenCode) | TASK-113(SPR-01) 🔔 검토 요청 — migration 3종·rbac·routes·TC 5건·248/248 PASS |
| 2026-06-06 | Aiden (Claude) | TASK-113(SPR-01) ✅ PASS — DoD 11/11 실물 검증·248/248 PASS. GAP-P6-01(order_services INSERT 정책) TASK-117 DoD 이관. SPR-02/03/06/07 블로커 해제 → ⬜. IMP-097 완료. 진행률 0%→20% |
| 2026-06-06 | D_Kai (OpenCode) | TASK-114(SPR-02) 🔔 검토 요청 — 통관 서비스 요율 관리 · `a64f970` · 251/251 PASS. TASK-115(SPR-03) 🔔 검토 요청 — 배송 서비스 요율 관리(LOCAL+TOTAL) · `c745fa0` · 254/254 PASS |
| 2026-06-06 | Aiden (Claude) | TASK-114(SPR-02)·TASK-115(SPR-03) ✅ PASS — DoD 각 11/11 실물 검증 완료. IMP-098·099 완료. TASK-116(SPR-04) 블로커 해제 → ⬜. 진행률 20%→45% |
| 2026-06-06 | Aiden (Claude) | TASK-118(SPR-06) ❌ 반려 — 코드 커밋 없음(untracked) · task file 🔄 미전환 · 커밋 해시 미기재(R-17 위반 3건). 구현 실물 존재 확인. 재작업 지시. |
| 2026-06-06 | D_Kai (OpenCode) | **TASK-118(SPR-06) 🔔 재작업 완료** — 반려 3건 전량 조치. 코드 커밋 `270146e` · task file 🔔 · 259/259 PASS · R-17 순서 엄수. 진행률 45%→55%. |
