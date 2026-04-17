# 프로젝트 컨텍스트 (ZENITH_LMS)

## 1. 프로젝트 개요

**프로젝트명:** ZENITH_LMS (SNTL 통합 물류 플랫폼)  
**목표:** 항공·해운·통관·택배를 아우르는 통합 물류 관리 및 실시간 Tracking 시스템 구축  
**현재 상태:** Phase 1 개발 준비 환경 구축 완료 (Next.js 초기화, Supabase MCP 로컬 격리 및 연동 완료)  
**마지막 업데이트:** 2026-04-17

## 2. 개발 방법론 & 워크플로우

**방법론:** ZEN_A4 (GSD + 경량화 하이브리드)  
**핵심 도구:** 
- Claude Code (설계/검증)
- Gemini & Antigravity (전략적 자율 개발 및 문서화)
- Ollama (로컬 코드 자동완성)
- rtk (토큰 최적화 Proxy)

**워크플로우:**
1. Phase 1 (Design): 설계 및 Self Check
2. Phase 2 (Implement): 구현 및 Self Test (Coverage 80%+)
3. Phase 3 (Verify): 검증 및 품질 검사
4. Phase 4 (Commit): 규정에 따른 형상 관리

## 3. 기술 스택

- **언어/프레임워크:** Next.js (App Router), Node.js, TypeScript
- **스타일링:** Vanilla CSS (Modern Premium Design, Glassmorphism)
- **데이터베이스:** Supabase (PostgreSQL), ProjectID: ayowrwmufagzstqiqrnj
- **인프라:** Docker Compose (준비중), MinIO (파일 저장소), Vercel (배포 환경 변수 설정 완료)

## 4. 핵심 원칙

- **Code Style:** 불변성 우선, 함수 50줄 이하, 파일 800줄 이하.
- **오류 관리:** 발견된 오류는 즉시 SAR(Self Audit Report)로 기록하여 재발 방지.
- **도구 활용:** `rtk`를 통한 토큰 최적화 및 `GEMINI.md` 규정 준수.

## 5. 제약사항 & 위험요소

- **제약:** 외부 물류 API(항공/선사)의 연동 규격 확정 필요 (Phase 3).
- **위험:** 복잡한 물류 비즈니스 로직(운송비 자동 계산 등)의 정밀도 확보 필요.

---
**작업자 규정:** [CLAUDE.md](CLAUDE.md) / [GEMINI.md](GEMINI.md) 참조
