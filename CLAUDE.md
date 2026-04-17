# PJT_2026_010 (ZENITH_LMS)

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** Gov-02
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-16
> **버전:** v1.1

> [!IMPORTANT]
> 본 문서는 일반 작업자 및 Claude 에이전트를 위한 규정입니다.  
> **Antigravity 및 Gemini 에이전트** 전용 지침은 [GEMINI.md](GEMINI.md)를 참조하십시오.

## Project Overview

SNTL 통합 물류 플랫폼(ZENITH_LMS)은 오더 접수부턴 창고 관리, 트래킹, 회계 정산까지 아우르는 엔드투엔드 물류 솔루션입니다.

## Tech Stack

- Language: TypeScript
- Framework: Next.js (App Router)
- Database: Supabase (PostgreSQL)
- Deployment: Vercel

## Key Conventions

- 커밋 메시지: `<type>: <description>` (feat, fix, refactor, docs, test, chore)
- 브랜치 전략: `main` / `feature/*` / `fix/*`
- 코드 스타일: 불변성 우선, 함수 50줄 이하, 파일 800~1,000줄 이하 (초과 시 분리)
- **핵심 가드레일**: 신규 지시가 기존 룰/요구사항과 상충 시 즉시 이행 금지 및 재확인 필수

## Important Notes

### 📚 핵심 개발 방법론
- 방법론: GSD + ZEN_A4 (경량화 GSD 하이브리드)
- 도구: Claude Code + Ollama
- 테스트 커버리지: 80% 이상 필수
- 자체 검증: Phase 1(Self Check), Phase 2(Self Test) 필수 통과
- 오류 관리: 모든 오류는 SAR(Self Audit Report)로 기록 및 체크리스트 업데이트

### 🚀 새 프로젝트 시작 절차
1. Templates 준비 연동
2. Option A/B 선택 (현재 Option A 지향)
3. Customize & 배포

---
*상세 내용은 docs/00_GUIDE/ 내 관련 문서 참조*
