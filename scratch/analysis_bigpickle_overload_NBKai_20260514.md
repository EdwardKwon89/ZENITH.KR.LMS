# OpenCode Big Pickle 과잉 분석 / 무한 루프 — 근본 원인 분석 보고서

> **문서번호:** AUD-2026-0514-002
> **작성자:** NB Kai (OpenCode)
> **작성일:** 2026-05-14
> **목적:** 다른 PC에서 재현된 Big Pickle 무한 루프 문제의 진짜 원인 규명 및 해결 방안
> **참조:** SAR-2026-05-13-001, SAR-2026-05-13-002

---

## 1. 배경

### 1.1 문제 요약

OpenCode (Big Pickle 모델) 사용 시 단순 인사("Hi")에도 전체 프로젝트 분석에 돌입하거나, 동일 작업을 무한 반복하는 현상이 특정 PC에서 보고됨.

### 1.2 이전 조치 (SAR-001 / SAR-002)

| SAR | 조치 | 결과 |
|:----|:-----|:-----|
| SAR-2026-05-13-001 | GOV-001~009: ACTIVE_AGENT.md IDLE 초기화, GitNexus Hook Storm 제거 등 | ✅ Claude Code(Aiden)에는 효과 |
| SAR-2026-05-13-002 | B_Kai 비활성화 (Edward 결정) | ✅ 해당 PC 1대만 해결 |

**그러나 다른 PC에서 동일 문제 재현 → 근본 원인이 아직 해결되지 않았음을 시사.**

---

## 2. 원인 분석

### 2.1 Aiden 검토 의견 — Hook은 OpenCode에 영향 없음

`~/.claude/settings.json`의 Hook(gsd, rtk, GitNexus 등)은 **Claude Code(Aiden) 전용**이며, OpenCode에는 영향을 주지 않는다는 결론. 프로젝트 레벨 `.claude/settings.json` 역시 OpenCode에서 무시됨.

### 2.2 동일 모델 + 동일 프로젝트여도 PC에 따라 동작이 다른 현상

다른 PC에서 동일 프로젝트(`git pull`) + 동일 모델(Big Pickle)로 정상 동작 확인됨.
→ **모델 자체의 문제가 아님**을 입증.
→ **프로젝트 파일(AGENTS.md, GOV_COMMON.md)의 문제도 아님**을 입증.

### 2.3 진짜 원인: `.agent/skills/` Skill 파일 1000개 초과

**문제 PC의 `.agent/skills/` 디렉토리에 1,000개가 넘는 Skill 파일이 존재.**

| 요소 | 문제 PC | 정상 PC |
|:----|:-------:|:-------:|
| `.agent/skills/` 파일 수 | **1,000개+** | 없음 또는 소수 |
| rtk / gsd 설치 | ✅ | ❌ |
| 무한 루프 발생 | ✅ | ❌ |

### 2.4 무한 루프 메커니즘

```
사용자 입력
    ↓
시스템 프롬프트에 1,000+ Skill 목록 포함
    ↓
모델이 Skill 스캔 시도 → 컨텍스트 대량 소비
    ↓
Context Compaction 트리거
    ↓
Compaction 후 재시작 → 다시 1,000+ Skill 로드
    ↓
🔄 무한 반복
```

ECC(Everything Claude Code)가 마켓플레이스의 모든 Skill을 `.agent/skills/`에 일괄 다운로드하면서 발생하는 문제. Skill 하나하나가 시스템 프롬프트에 "available skills"로 포함되어, 모델이 매 입력마다 전체 Skill 목록을 스캔하려고 시도함.

### 2.5 추가 확인 사항

- Docker로 격리 실행 시 정상 동작 → **로컬 파일 시스템 오염**이 원인임을 재확인
- 정상 PC에서는 `.claude/skills/gitnexus` 단 1개 디렉토리(6개 파일)만 존재
- 프로젝트 실사용 기술은 Next.js / Supabase / TypeScript / Playwright 등 약 12개 Skill만 필요

---

## 3. 해결 방안

### 3.1 즉시 조치 (권장)

```bash
# 문제 PC에서 실행
rm -rf .agent/skills/*
```

`.agent/skills/`의 모든 파일을 삭제하고, 필요한 Skill만 선별하여 다시 설치.

### 3.2 보관할 Skill (프로젝트 실사용 기준)

커밋 이력 162건 + package.json 의존성 분석 결과, 실제로 필요한 Skill:

`agentic-engineering`, `api-design`, `backend-patterns`, `coding-standards`, `database-migrations`, `deployment-patterns`, `e2e-testing`, `frontend-patterns`, `postgres-patterns`, `security-review`, `tdd-workflow`, `verification-loop`

### 3.3 제거해도 무방한 Skill (50개+)

해당 프로젝트에서 사용하지 않는 기술의 Skill:

- **모바일/크로스플랫폼**: `android-clean-architecture`, `compose-multiplatform-patterns`, `swiftui-patterns`, `swift-concurrency-6-2`, `liquid-glass-design`, `foundation-models-on-device`
- **타 언어 백엔드**: `django-patterns`, `laravel-patterns`, `golang-patterns`, `rust-patterns`, `kotlin-ktor-patterns`, `java-coding-standards`, `perl-patterns`, `cpp-coding-standards`, `springboot-patterns`, `clickhouse-io`
- **비즈니스 도메인**: `carrier-relationship-management`, `customs-trade-compliance`, `energy-procurement`, `inventory-demand-planning`, `logistics-exception-management`, `production-scheduling`, `quality-nonconformance`, `returns-reverse-logistics`, `investor-materials`, `market-research`
- **기타**: `article-writing`, `content-engine`, `crosspost`, `data-scraper-agent`, `fal-ai-media`, `frontend-slides`, `nutrient-document-processing`, `video-editing`, `videodb`, `visa-doc-translate`, `x-api`, `exa-search`

### 3.4 근본 예방

1. **ECC 설치 시 Skill 선택**: `ECC_HOOK_PROFILE=minimal`로 설정하여 불필요한 Skill 자동 설치 방지
2. **정기 정리**: `.agent/skills/`를 프로젝트 실제 필요 기술만 유지하도록 관리
3. **Git에 `.agent/skills/`를 `.gitignore`에 추가**하여 다른 PC로 Skill 과다 문제가 전파되지 않도록 방지

---

## 4. 결론

| 항목 | 판정 |
|:----|:----:|
| 모델(Big Pickle) 자체의 문제 | ❌ 아님 |
| 프로젝트 파일(AGENTS.md 등) 문제 | ❌ 아님 |
| Claude Code Hook(gsd/rtk) 문제 | ❌ 아님 (OpenCode 무관) |
| **`.agent/skills/` Skill 1,000개 과다** | **✅ 진짜 원인** |

---

## 5. 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:----|:----:|:------|:------|
| v1.0 | 2026-05-14 | NB Kai (OpenCode) | 최초 작성 — `.agent/skills` 과다 적재 원인 규명 및 해결 방안 |
