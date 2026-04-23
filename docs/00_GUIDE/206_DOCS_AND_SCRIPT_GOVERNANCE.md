---
tags: ["procedure"]
---

# 206 문서 구조 및 스크립트 관리 거버넌스

[← 목록으로 돌아가기](./000_README.md) | [이전: 205_RBAC_MENU_GOVERNANCE](./205_RBAC_MENU_GOVERNANCE.md)

---

> **문서 ID**: 206
> **분류**: 절차 & 규칙 (Procedures & Rules)
> **목적**: docs/ 폴더 문서 유형 분류 체계 및 SQL/Python 스크립트 파일 관리 규칙 정의
> **대상**: 전체 에이전트, Team Lead
> **작성일**: 2026-04-23
> **최종 수정**: 2026-04-23
> **작성자**: Claude Code
> **버전**: v1.0

---

## 목차

1. [현황 진단](#1-현황-진단)
2. [docs/ 문서 유형 분류 체계](#2-docs-문서-유형-분류-체계)
3. [정리 대상 및 이동 계획](#3-정리-대상-및-이동-계획)
4. [번호 충돌 해소 계획](#4-번호-충돌-해소-계획)
5. [SQL/Python 스크립트 관리 규칙](#5-sqlpython-스크립트-관리-규칙)
6. [Obsidian Vault 적용 방안](#6-obsidian-vault-적용-방안)
7. [실행 로드맵](#7-실행-로드맵)
8. [에이전트 준수 규칙](#8-에이전트-준수-규칙)

---

## 1. 현황 진단

### 1-1. 문서 현황 (2026-04-23 기준)

| 항목 | 수치 | 비고 |
|------|------|------|
| 전체 문서 수 | **130개** | 중규모 이상 |
| 폴더 수 | **22개** | 계층 탐색 비용 발생 |
| SAR 보고서 | **24개** (15일) | 하루 평균 1.6개 생성 |
| LIVE_ 파일 | **4개** | Source of Truth 집중 |
| 번호 충돌 | **2건** | 104 (2개), 203 (3개) |

### 1-2. 식별된 문제

```
[문제 1] docs/ 내 문서 유형 혼재
  → 초기 Setup 가이드, 프로젝트 활성 규칙, 현황 관리 문서가
    동일 폴더(특히 00_GUIDE/)에 혼재되어 있음

[문제 2] 번호 체계 충돌
  → 104번: 104_MULTIAGENT_RNR_GUIDE.md, 104_QUALITY_GATEWAY_GUIDE.md (2개)
  → 203번: 203_COMMON_CODE_GOVERNANCE.md, 203_PROJECT_APPLICATION_CHECKLIST.md,
           203_SUPABASE_REMOTE_SOP.md (3개)

[문제 3] SQL/스크립트 파일 방치
  → 루트에 DB 덤프 파일 방치 (db_dump.sql 73KB, db_data.sql 32KB)
  → .gitignore에 임시 SQL/py 규칙 없음
  → docs/04_Database/와 supabase/migrations/ 이중 관리 구조 불명확

[문제 4] 사문화 파일 잔존
  → 09_TEMPLATES/040_SETUP_TEMPLATE/ (Ollama/Docker 관련)
    → Tier 6(Ollama) 삭제 결정 이후 사실상 사문화
```

---

## 2. docs/ 문서 유형 분류 체계

### 2-1. 3계층 문서 유형 정의

```
┌─────────────────────────────────────────────────────────┐
│  TYPE A: GOVERNANCE (불변 규칙)                          │
│  → docs/00_GUIDE/                                        │
│  → 방법론, 에이전트 규칙, 거버넌스 문서                  │
│  → 수정 시 Team Lead 승인 권장                           │
├─────────────────────────────────────────────────────────┤
│  TYPE B: OPERATIONAL (현황 추적)                         │
│  → docs/01_WBS/, docs/08_Self_Audit/                     │
│  → LIVE_ 체크리스트, SAR 보고서, UAT, WBS               │
│  → 실시간 갱신, Source of Truth                          │
├─────────────────────────────────────────────────────────┤
│  TYPE C: REFERENCE (참조 자료)                           │
│  → docs/02_Analysis/, docs/03_Design/,                   │
│    docs/04_Database/, docs/10_Reference/                 │
│  → 분석서, 설계서, API 명세, DB 스키마                   │
│  → 변경 시 버전 관리 필수                                │
└─────────────────────────────────────────────────────────┘
```

### 2-2. 폴더별 역할 명확화

| 폴더 | 유형 | 용도 | 수정 주기 |
|------|------|------|---------|
| `00_GUIDE/` | A | 프로젝트 활성 규칙만 (방법론, R-01~R-12, 거버넌스) | 드물게 (승인 필요) |
| `01_WBS/` | B | WBS, 공정 계획 | Phase 완료 시 |
| `02_Analysis/` | C | 요구사항, API 명세, 시퀀스 | 변경 시 버전업 |
| `03_Design/` | C | 화면설계, DB 설계, 아키텍처 | 변경 시 버전업 |
| `04_Database/` | C | 공식 SQL (함수, 트리거) | canonical/ 하위 관리 |
| `05_UI_UX/` | C | UI 스펙, 디자인 제안서 | 변경 시 버전업 |
| `08_Self_Audit/` | B | SAR, LIVE_ 체크리스트, UAT | 실시간 |
| `09_TEMPLATES/` | C | 체크리스트 템플릿, 온보딩 | 드물게 |
| `10_Reference/` | C | Baseline 원본, 외부 참조 | 거의 없음 |
| `80_RawData/` | C | 원시 데이터, 외부 제공 자료 | 읽기 전용 |
| `98_Deprecated/` | — | 사문화 파일 보관 (신설) | 이동 후 동결 |
| `archive/` | — | 기존 아카이브 (유지) | 동결 |

---

## 3. 정리 대상 및 이동 계획

### 3-1. 00_GUIDE/ 내 이동 대상

| 파일 | 현재 위치 | 이동 위치 | 사유 |
|------|---------|---------|------|
| `110_Small_Team_Setup_Evaluation.md` | `00_GUIDE/` | `10_Reference/` | 초기 Setup 평가 자료, 활성 규칙 아님 |
| `FUTURE_REQUIREMENTS.md` | `00_GUIDE/` | `.planning/` | 요구사항은 planning 영역 |
| `ROLE_DEFINITION.md` | `00_GUIDE/` | `103_AGENT_ROLES_SPEC.md`에 통합 검토 | 내용 중복 가능성 확인 후 결정 |
| `104_QUALITY_GATEWAY_GUIDE.md` | `00_GUIDE/` | 번호 → `106_` 변경 | 번호 충돌 해소 (§4 참조) |

### 3-2. 09_TEMPLATES/ 내 사문화 대상

| 항목 | 사유 | 처리 |
|------|------|------|
| `040_SETUP_TEMPLATE/DOCKER_COMPOSE_OLLAMA_TEMPLATE.md` | Tier 6 (Ollama) 삭제 결정 | `98_Deprecated/`로 이동 |
| `040_SETUP_TEMPLATE/OLLAMA_DIRECT_INSTALL_TEMPLATE.md` | 동일 | `98_Deprecated/`로 이동 |
| `040_SETUP_TEMPLATE/VSCODE_OLLAMA_SETUP.md` | 동일 | `98_Deprecated/`로 이동 |

### 3-3. 루트 방치 파일

| 파일 | 크기 | 처리 방안 |
|------|------|---------|
| `db_dump.sql` | 73KB | `.gitignore` 추가 후 로컬 보관 또는 삭제 |
| `db_data.sql` | 32KB | 동일 |
| `supabase/ZENITH_WBS_1.2_Consolidated_SQL.sql` | 4.6KB | 내용 확인 후 `docs/04_Database/archive/` 이동 또는 삭제 |

---

## 4. 번호 충돌 해소 계획

### 4-1. 104번 충돌 (2개 파일)

| 현재 파일명 | 처리 | 새 파일명 |
|-----------|------|---------|
| `104_MULTIAGENT_RNR_GUIDE.md` | **유지** (기준 문서) | 변경 없음 |
| `104_QUALITY_GATEWAY_GUIDE.md` | **번호 변경** | `106_QUALITY_GATEWAY_GUIDE.md` |

### 4-2. 203번 충돌 (3개 파일)

| 현재 파일명 | 처리 | 새 파일명 |
|-----------|------|---------|
| `203_PROJECT_APPLICATION_CHECKLIST.md` | **유지** (기준) | 변경 없음 |
| `203_COMMON_CODE_GOVERNANCE.md` | **번호 변경** | `207_COMMON_CODE_GOVERNANCE.md` |
| `203_SUPABASE_REMOTE_SOP.md` | **번호 변경** | `208_SUPABASE_REMOTE_SOP.md` |

> **주의**: 파일명 변경 시 해당 파일을 참조하는 모든 문서의 링크를 함께 수정해야 합니다.

---

## 5. SQL/Python 스크립트 관리 규칙

### 5-1. 영역 구분 원칙

```
supabase/migrations/          ← [CLI 관리 영역] 절대 수동 수정 금지
                                 supabase CLI로만 생성·관리
supabase/seed_data.sql        ← [초기 데이터] 유지

docs/04_Database/
  ├── canonical/              ← [신설] 영구 보관 SQL
  │     (함수, 트리거, 뷰 정의)
  └── archive/                ← [신설] 참고 이력 SQL
        (사용 종료된 마이그레이션 스크립트 등)

루트 또는 임시 경로
  → 작업 완료 후 반드시 삭제 또는 위 경로로 이동
```

### 5-2. docs/04_Database/ 파일 정리

| 파일 | 분류 | 이동 위치 |
|------|------|---------|
| `fn_get_best_matching_rate.sql` | 함수 정의 (영구 보관) | `canonical/` |
| `tr_capture_order_rate_snapshot.sql` | 트리거 정의 (영구 보관) | `canonical/` |
| `tr_capture_order_rate_snapshot_v1.1.sql` | 트리거 이전 버전 | `archive/` |
| `migration_v1.1_legacy_to_tisa.sql` | 마이그레이션 이력 | `archive/` |
| `migration_v1.2_orders_snapshot.sql` | 마이그레이션 이력 | `archive/` |
| `init_schema.sql` | 초기화 스크립트 이력 | `archive/` |
| `clean_setup.sql` | 임시 정리 스크립트 | 내용 확인 후 `archive/` 또는 삭제 |
| `master_data.sql` | 초기 데이터 이력 | `archive/` |

### 5-3. .gitignore 추가 규칙

```gitignore
# ─── Temporary DB Dumps (do not commit) ───────────────────
db_dump*.sql
db_data*.sql
scratch_*.sql
_temp_*.sql
_tmp_*.sql

# ─── Temporary Python Scripts ─────────────────────────────
scratch_*.py
_temp_*.py
_tmp_*.py
```

### 5-4. 파일 명명 규칙

모든 에이전트는 SQL/Python 파일 생성 시 아래 규칙을 준수합니다.

| 용도 | 명명 규칙 | 보관 위치 | 커밋 여부 |
|------|---------|---------|---------|
| DB 함수/트리거 (영구) | `fn_설명.sql`, `tr_설명.sql` | `docs/04_Database/canonical/` | ✅ |
| Supabase 마이그레이션 | `YYYYMMDDHHMMSS_설명.sql` | `supabase/migrations/` (CLI 생성) | ✅ |
| 작업 중 임시 스크립트 | `scratch_YYYYMMDD_설명.sql` | 로컬만 사용 | ❌ |
| DB 덤프/백업 | `db_dump_YYYYMMDD.sql` | 로컬만 보관 | ❌ |
| 분석용 Python | `scratch_YYYYMMDD_설명.py` | 로컬만 사용 | ❌ |
| 공유 필요 Python 유틸 | `util_설명.py` | `scripts/` (신설 검토) | ✅ |

### 5-5. 작업 완료 시 체크리스트

에이전트는 SQL/Python 파일 관련 작업 완료 보고 전 아래를 확인합니다.

```
□ 루트(/)에 .sql, .py 파일이 방치되어 있지 않은가?
□ supabase/migrations/ 이외 경로에 임시 마이그레이션이 없는가?
□ scratch_* 또는 _temp_* 파일이 git stage에 포함되지 않았는가?
□ 영구 보관 SQL은 docs/04_Database/canonical/에 있는가?
```

---

## 6. Obsidian Vault 적용 방안

### 6-1. 적용 대상

`docs/` 폴더 전체를 Obsidian Vault로 선언합니다.

### 6-2. 적용 방법

```bash
# 1. Obsidian 앱에서 "Open folder as vault"로 docs/ 선택
#    (.obsidian/ 폴더 자동 생성됨)

# 2. .gitignore에 개인 설정 파일 제외
echo "docs/.obsidian/workspace.json" >> .gitignore
echo "docs/.obsidian/workspace-mobile.json" >> .gitignore
```

### 6-3. 즉시 확보되는 기능

| 기능 | 활용 예시 |
|------|---------|
| **전문 검색** | "체적중량" 입력 → 관련 문서 전체 + 라인 표시 |
| **그래프 뷰** | `105_DOMAIN_KNOWLEDGE`를 참조하는 모든 문서 시각화 |
| **Backlink** | `SAR_2026-04-22.md`를 열면 관련 LIVE_ 체크리스트 자동 표시 |
| **태그 필터** | `#phase-3` 태그로 Phase 3 관련 문서 일괄 조회 |

### 6-4. 에이전트 워크플로우 영향

Obsidian은 마크다운을 그대로 읽고 씁니다. **에이전트 워크플로우 변경 없음.**

### 6-5. MASTER_INDEX.md (에이전트용 단일 진입점)

에이전트 세션 초기화 시 Obsidian 대신 읽을 파일입니다. 루트에 생성합니다.

```markdown
# ZENITH_LMS MASTER INDEX

## 필수 참조 (항상 먼저 확인)
- CLAUDE.md — Claude 에이전트 규정
- GEMINI.md — Gemini 에이전트 규정
- docs/00_GUIDE/105_DOMAIN_KNOWLEDGE.md — 물류 도메인 Source of Truth

## 현재 Phase Source of Truth
- docs/08_Self_Audit/Checklists/LIVE_PHASE_2_EXECUTE.md

## 영역별 인덱스
- docs/00_GUIDE/000_README.md — 방법론 & 거버넌스
- docs/01_WBS/000_README.md — WBS & 일정
- docs/02_Analysis/000_README.md — 분석 & API 명세
- docs/03_Design/000_README.md — 설계
- docs/08_Self_Audit/000_README.md — SAR & 감사
```

---

## 7. 실행 로드맵

### Phase 0: 즉시 (5분, 위험도 없음)

```bash
# .gitignore에 임시 파일 규칙 추가
# → 이후 생성되는 덤프/임시 파일 자동 차단
```

### Phase 1: 단기 (1시간, 저위험)

```
□ 번호 충돌 해소 (§4)
  - 104_QUALITY_GATEWAY_GUIDE.md → 106_QUALITY_GATEWAY_GUIDE.md
  - 203_COMMON_CODE_GOVERNANCE.md → 207_COMMON_CODE_GOVERNANCE.md
  - 203_SUPABASE_REMOTE_SOP.md → 208_SUPABASE_REMOTE_SOP.md
  - 참조 링크 일괄 수정

□ 00_GUIDE/ 내 비규칙 파일 이동 (§3-1)
  - 110_Small_Team_Setup_Evaluation.md → 10_Reference/
  - FUTURE_REQUIREMENTS.md → .planning/

□ ROLE_DEFINITION.md 내용 검토 후 처리 방향 결정
```

### Phase 2: 단기 (1시간, 저위험)

```
□ docs/04_Database/ 구조 재편 (§5-2)
  - canonical/, archive/ 폴더 생성
  - 기존 파일 분류 이동

□ 루트 SQL 처리 (§3-3)
  - db_dump.sql, db_data.sql 처리
  - supabase/ZENITH_WBS_1.2_Consolidated_SQL.sql 처리

□ 98_Deprecated/ 생성 및 Ollama 템플릿 이동 (§3-2)
```

### Phase 3: 중기 (30분, 위험도 없음)

```
□ Obsidian Vault 선언 (§6)
  - docs/ 폴더를 vault로 열기
  - .gitignore 설정

□ MASTER_INDEX.md 생성 (§6-5)
  - 루트에 에이전트 단일 진입점 파일 생성

□ 000_README.md 업데이트 (§4 번호 변경 반영)
```

---

## 8. 에이전트 준수 규칙

본 거버넌스 문서 적용 이후 모든 에이전트는 아래를 의무 준수합니다.

### R-DOCS-01 | 신규 문서 생성 규칙

```
1. docs/ 내 신규 문서 생성 시 §2 유형 분류표에 따라 폴더를 결정한다.
2. 00_GUIDE/ 에는 TYPE A (불변 규칙) 문서만 생성한다.
3. 번호 부여 전 기존 번호 목록을 확인하여 충돌을 방지한다.
4. 문서 생성 후 해당 폴더의 000_README.md 인덱스를 즉시 업데이트한다.
```

### R-DOCS-02 | SQL/Python 파일 생성 규칙

```
1. 임시 파일은 scratch_ 또는 _temp_ 접두어를 반드시 사용한다.
2. supabase/migrations/ 외 경로에 마이그레이션 SQL을 생성하지 않는다.
3. 작업 완료 후 §5-5 체크리스트를 수행한다.
4. 루트(/)에 SQL/Python 파일을 잔류시키지 않는다.
```

### R-DOCS-03 | 파일 이동·삭제 규칙

```
1. 파일 이동 시 해당 파일을 참조하는 모든 문서의 링크를 함께 수정한다.
2. 삭제 전 git history에서 복원 가능한지 확인하고 진행한다.
3. 사문화 파일은 즉시 삭제하지 않고 98_Deprecated/로 이동 후 1개월 후 삭제한다.
```

---

## 📝 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|------|------|------|------|
| v1.0 | 2026-04-23 | Claude Code | 초안 작성 — 문서 혼재 현황 진단 및 정리 방안, SQL/py 관리 규칙, Obsidian Vault 적용 방안 포함 |

---

[← 목록으로 돌아가기](./000_README.md)
