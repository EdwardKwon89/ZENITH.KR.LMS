---
tags: ["governance"]
---

# GEMINI.md — Antigravity & Gemini 에이전트 업무 규정

> **문서번호:** Gov-01 | **버전:** v2.0 | **작성일:** 2026-05-12

이 문서는 ZENITH_LMS 개발에 참여하는 **Gemini 에이전트(Riley 등)**의 업무 규정을 정의합니다.

> [!IMPORTANT]
> 공통 규칙(R-01~R-15, GitNexus, ZEN_A4, SAR)은 **[GOV_COMMON.md](GOV_COMMON.md)** 에 정의되어 있습니다.  
> 세션 시작 시 **반드시 GOV_COMMON.md를 먼저 Read하여 공통 규칙을 숙지**한 후 작업을 시작하십시오.

---

## 🚀 세션 초기화 (Session Initialization, R-02) — Gemini 전용

신규 세션 시작 시 반드시 다음 절차를 수행합니다:

1. **GOV_COMMON.md Read**: 공통 규칙 숙지 (필수)
2. **PATH 설정**: `export PATH=$PATH:/opt/homebrew/bin`
3. **DB 확인**: 로컬 Supabase 구동 확인 및 연결 (원격 접속 시 사용자 승인 필수)
4. **역할 명세 확인**: [103_AGENT_ROLES_SPEC.md](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md) 및 대상 폴더 `000_README.md` 확인

---

## 🤖 에이전트 역할 및 모델 할당

역할별 최적화된 모델을 사용합니다. (상세: [103_AGENT_ROLES_SPEC.md](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md))

| 분류 | 역할 | 모델 |
| :--- | :--- | :--- |
| Leadership | CEO, CTO, CIO | Gemini Pro High |
| Product | CPO (Riley) | Gemini Pro High |
| Audit | Phase 1~2 (Low) / Phase 3 (High) | Gemini Flash → Pro High |
| Operation | PM, Execution | Gemini Flash |

---

## 🔑 커밋 & 브랜치 규약 — Gemini 전용

- **커밋 태그**: 모든 커밋에 `[Gemini]` 접두사 필수 (commit-msg 훅 강제)
- **커밋 시점**: Task 완료마다 즉시 커밋 (Phase 완료까지 미루지 않음)
- **메시지 형식**: `[Gemini] <type>: <description>`

```bash
# 표준 커밋 절차
rtk npm run test:regression                              # R-08
echo "PASS" > .agent/LAST_REGRESSION_RESULT
git add <변경파일>
git commit -m "[Gemini] feat: <작업 설명>"
```

---

## 🛠️ 도구 활용 규칙

- **rtk proxy**: 모든 CLI 명령어는 `rtk` 도구를 경유하여 토큰 효율을 극대화합니다.
- **GSD 도구**: 복잡한 작업은 `/gsd-plan-phase` 명령을 통해 설계 문서를 먼저 생성합니다.

---

## 📝 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-04-16 | Antigravity | 초기 에이전트 업무 규정 수립 |
| v1.13 | 2026-05-07 | Antigravity | E2E 테스트 로컬 Supabase 환경 우선 원칙 R-14 추가 |
| v1.14 | 2026-05-08 | Claude (Aiden) | R-15 추가 |
| v2.0 | 2026-05-12 | Aiden (Claude, ZEN_CEO) | GOV_COMMON.md 분리 — 공통 규칙 이관, Gemini 전용 내용만 유지 (SAR-2026-05-12-001 반영) |
