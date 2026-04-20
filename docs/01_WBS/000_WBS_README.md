# 📚 000_WBS_README (작업 분할 구조 인덱스)

> **문서 ID**: 000  
> **분류**: 📋 절차 & 규칙  
> **목적**: WBS 및 ROADMAP 초기 설계 기준 및 개정 이력 관리  
> **대상**: 모든 팀원, PM, ZEN_CEO  
> **작성일**: 2026-04-18  
> **최종 수정**: 2026-04-20  
> **작성자**: CIO (AI Agent), Edward Kwon  
> **버전**: v2.0 (Master/LIVE 분리 및 문서 구조 정리)

---

[← 상위 목록으로 돌아가기](../000_GUIDE/000_GUIDE_README.md)

---

## 📌 개요

이 폴더는 ZENITH_LMS 프로젝트의 **초기 설계 기준** 및 **개정 이력**을 관리합니다.

### 문서 구조 (Master/LIVE 분리)

```text
📁 .planning/
├── detailed_WBS.md         ← LIVE (현재 진행 현황, 실시간 업데이트)
└── ROADMAP.md             ← LIVE (현재 로드맵, 실시간 업데이트)

📁 docs/01_WBS/
├── WBS_BASELINE.md         ← 초기 설계 기준 (v1.0, 불변)
├── ROADMAP_BASELINE.md     ← 초기 로드맵 기준 (v1.0, 불변)
├── WBS_REVISION_HISTORY.md ← 개정 이력 (누적 기록)
└── 000_WBS_README.md       ← 이 문서
```

### 각 문서의 역할

| 문서 | 위치 | 용도 | 업데이트 주기 | 관리 주체 |
| :--- | :--- | :--- | :--- | :--- |
| **detailed_WBS.md** | `.planning/` | 현재 공정 상황 추적 (LIVE) | 매일 | PM, 개발팀 |
| **ROADMAP.md** | `.planning/` | 현재 로드맵 추적 (LIVE) | 주단위 | PM |
| **WBS_BASELINE.md** | `docs/01_WBS/` | 초기 설계 기준 | 변경 없음 | CIO |
| **ROADMAP_BASELINE.md** | `docs/01_WBS/` | 초기 로드맵 기준 | 변경 없음 | CIO |
| **WBS_REVISION_HISTORY.md** | `docs/01_WBS/` | 모든 개정 사항 기록 | 변경 시마다 | PM |

---

## 📄 문서 목록

### ✅ 기준 문서 (Baseline)

| # | 문서명 | 링크 | 설명 |
| :--- | :--- | :--- | :--- |
| **01** | WBS 초기 설계 기준 | [WBS_BASELINE.md](./WBS_BASELINE.md) | Phase 1~4 초기 설계 (v1.0, 2026-04-16) |
| **02** | ROADMAP 초기 설계 기준 | [ROADMAP_BASELINE.md](./ROADMAP_BASELINE.md) | 프로젝트 초기 로드맵 (v1.0, 2026-04-20) |

### 📊 이력 관리

| # | 문서명 | 링크 | 설명 |
| :--- | :--- | :--- | :--- |
| **03** | WBS & ROADMAP 개정 이력 | [WBS_REVISION_HISTORY.md](./WBS_REVISION_HISTORY.md) | 모든 변경사항 누적 기록 |

### 📋 기존 문서 (아카이브)

| # | 문서명 | 링크 | 상태 |
| :--- | :--- | :--- | :--- |
| **[ARCH]** | WBS_01_상세_공정표.md | [WBS_01_상세_공정표.md](./WBS_01_상세_공정표.md) | 아카이브 (현재는 .planning/detailed_WBS.md 참고) |

---

## 🔄 업데이트 가이드

### LIVE 문서 업데이트 (매일)

현재 공정 상황을 실시간으로 반영하려면:

1. `.planning/detailed_WBS.md` 업데이트 (공정 진행 상황)
2. `.planning/ROADMAP.md` 업데이트 (일정 변경 사항)

### 개정 이력 기록 (변경 발생 시)

주요 변경사항이 발생하면:

1. `.planning/` LIVE 문서에 변경 반영
2. `WBS_REVISION_HISTORY.md`에 변경사항 기록
   - 날짜, 작성자, 변경 항목, 영향도, 사유

### 기준 문서는 변경 불가

- `WBS_BASELINE.md` / `ROADMAP_BASELINE.md`는 초기 설계를 기록하므로 **변경하지 않음**
- CIO 승인 시에만 업데이트 가능

---

## 🎯 주요 변경사항 요약

Phase 1 개발 과정에서의 주요 변경:

- **초기 설계 (v1.0)**: 25 MD → **현재 (v2.2)**: 29 MD (추가 작업)
- **완료도**: 97% (거의 완료)
- **추가된 항목**: 
  - 파일 스토리지 (1.1.3)
  - 다국어 지원 (1.1.4)
  - TISA 거버넌스 (1.2.2.3)
  - 품질 거버넌스 (1.5)

자세한 변경사항은 [WBS_REVISION_HISTORY.md](./WBS_REVISION_HISTORY.md) 참고

---

[← 상위 목록으로 돌아가기](../000_GUIDE/000_GUIDE_README.md)
