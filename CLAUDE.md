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

<!-- 프로젝트 설명을 여기에 작성하세요 -->

## Tech Stack

<!-- 사용 기술 스택을 여기에 작성하세요 -->
- Language:
- Framework:
- Database:

## Architecture

<!-- 아키텍처 설명을 여기에 작성하세요 -->

## Development Setup

```bash
# 개발 환경 설정 명령어
```

## Key Conventions

- 커밋 메시지: `<type>: <description>` (feat, fix, refactor, docs, test, chore)
- 브랜치 전략: `main` / `feature/*` / `fix/*`
- 코드 스타일: 불변성 우선, 함수 50줄 이하, 파일 800~1,000줄 이하 (초과 시 분리)
- **핵심 가드레일**: 신규 지시가 기존 룰/요구사항과 상충 시 즉시 이행 금지 및 재확인 필수

## Important Notes

### 📚 핵심 개발 방법론

1. **개발 방법론 & 도구**
   - 방법론: GSD + ZEN_A4 (경량화 GSD 하이브리드)
   - 도구: Claude Code (Subscription) + Ollama (Gemma4-9B 로컬)
   - 비용: Subscription만 (추가 비용 $0)
   - 자세히: [ZEN_A4_METHODOLOGY.md](docs/000_GUIDE/ZEN_A4_METHODOLOGY.md)

2. **개발 워크플로우 (4단계)**
   - Phase 1 (Design): 설계 → Self Check ✓ (필수)
   - Phase 2 (Implement): 구현 → Self Test ✓ (필수)
   - Phase 3 (Verify): Claude 검증
   - Phase 4 (Commit): 깃 커밋

3. **자체 검증 (Self Check & Self Test)**
   - **Self Check** (Phase 1 완료 필수): 아키텍처/요구사항/이슈 검증
   - **Self Test** (Phase 2 완료 필수): 단위테스트/커버리지 80%+/수동테스트/보안 검증

4. **오류 관리 & 재발 방지**
   - SAR 작성: Self Check/Test 미통과 시 필수
   - 저장위치: `docs/081_Self_Audit/SAR_reports/SAR_YYYY-MM-DD_NNN_문제_분류.md`
   - Check List 업데이트: SAR 작성 후 필수 (동일 오류 방지)
   - 자세히: [SAR 작성 규칙](docs/000_GUIDE/SAR_RULE.md) / [Check List 절차](docs/000_GUIDE/CHECK_LIST_PROCEDURE.md)

5. **도구 역할 분담**
   - **Ollama**: 함수 자동완성 (Tab) → 개발 시간의 70%
   - **Claude Code**: 설계/검증/상담 → 개발 시간의 30%
   - **ZEN_A4**: 3가지 훅으로 자동 리뷰 (PreToolUse/PostToolUse/Stop)

6. **자동화 & 품질 목표**
   - 자동화율: 80%+
   - 개발 속도: +50%
   - 버그 감소: -30~40%
   - 코드 리뷰 반려율: -50%
   - 테스트 커버리지: 80%+ 필수

7. **문서 관리 & 추적**
   - **DECISIONS.md**: 주요 기술 의사결정 기록 (.planning/)
   - **CONTEXT.md**: 프로젝트 정보 & 아키텍처 (.planning/)
   - **INTEGRATED_DEVELOPMENT_METHODOLOGY.md**: 상세 운영 절차 (docs/000_GUIDE/)
   - Check List: 위 파일의 체크리스트 섹션에서 유지보수

8. **GSD 사용 기준**
   - 복잡한 기능: `/gsd-plan-phase` 사용 (설계 문서 자동 생성)
   - 간단한 기능: 직접 구현 (자동화된 Self Check/Test로 충분)

9. **핵심 원칙**
   - 불변성 우선, 함수 50줄 이하
   - **파일 길이**: 개별 파일은 **800 ~ 1,000라인** 이하로 유지하며, 1,000라인 초과 시 **개요(Overview)**와 **상세(Detail)** 파일로 분리합니다.
- **상충 시 재확인(Conflict Resolution)**: 새로운 지시가 기존 룰/요구사항과 상충 시 반드시 사용자 재확인 후 이행
   - 모든 오류는 SAR으로 추적, Check List 업데이트로 재발 방지
   - Self Check/Test 통과 없이 다음 단계 진행 불가
   - Stop 게이트(품질 기준) 만족 없이 커밋 불가

### 📖 Project Templates & Guides

첫 프로젝트 시작 시 다음을 customize해서 팀에 배포:

- [Templates 사용 가이드](docs/090_TEMPLATES/README.md) - 전체 가이드
- [Quick Reference](docs/090_TEMPLATES/QUICK_REFERENCE_TEMPLATE.md) - 한눈 플로우
- [온보딩 가이드](docs/090_TEMPLATES/ONBOARDING_TEMPLATE.md) - 첫 기능 개발
- [Phase별 체크리스트](docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/) - 설계/구현/검증
- [문제 해결 가이드](docs/090_TEMPLATES/TROUBLESHOOTING_TEMPLATE.md) - Q&A

### 🚀 새 프로젝트 시작 절차

새로운 프로젝트를 시작할 때 PM/Leader는 다음 순서를 따르세요:

#### 1단계: Templates 준비 (필수)

```bash
# 090_TEMPLATES/ 전체를 프로젝트로 복사
cp -r docs/090_TEMPLATES/* [새프로젝트]/docs/
```

---

#### 2단계: 반드시 선택 ⚠️

[docs/090_TEMPLATES/README.md](docs/090_TEMPLATES/README.md)를 열고 아래 중 하나를 선택하세요:

##### 🟢 Option A: 지금 즉시 완성 (권장 ✅)

- 소요 시간: 2시간
- 포함 내용:
  - SETUP_TEMPLATE/: Claude Code, Ollama, ZEN_A4 설정 가이드
  - ROLES_TEMPLATE/: Developer, Team Lead, Architect 역할별 가이드
  - EXAMPLES_TEMPLATE/: 실전 예시 3가지
- 효과: 완전히 자동화된 개발 환경 준비 가능

##### 🔵 Option B: 나중에 추가

- 소요 시간: 지금은 0분 (필요시 추가)
- 현재: 기본 Templates만 사용
- 추천: 첫 프로젝트 진행 중 필요시 추가

##### ❓ 어느 것을 선택?

| 상황 | 추천 |
| --- | --- |
| 프로젝트 특성 & 팀 구성이 명확 | ✅ Option A |
| 시간이 충분함 | ✅ Option A |
| 시간이 부족함 | 🔵 Option B |
| 첫 프로젝트 진행 중 | 🔵 Option B → 필요시 추가 |

#### 3단계: Customize

선택한 Option에 따라 다음을 프로젝트에 맞게 수정:

- [PROJECT_NAME] → 실제 프로젝트명
- [TECH_STACK] → 기술스택
- [TEAM_SIZE] → 팀 규모
- [TODO] 항목들 → 프로젝트별 추가 작성

#### 4단계: 팀에 배포

수정된 Templates을 팀원에게 전달하고 온보딩 시작

---

---

### 📋 첫 프로젝트 체크리스트

```bash
□ Option A 또는 B 선택
□ Templates customize 완료
  □ [PROJECT_NAME] 변경
  □ [TEAM_SIZE] 변경
  □ [TECH_STACK] 변경
  □ [TODO] 항목들 추가
□ 팀 회의: 절차 및 가이드 설명
□ 온보딩 시작: ONBOARDING_TEMPLATE.md 사용
```

---

### 🔄 SAR & Check List 운영 절차 (실 프로젝트 적용, Option 1)

**목표:** 점진적 오류 감소 + 팀 학습 + 자동화

**절차:**

1. **SAR 작성** (Phase 1/2/3에서 오류 발견 시)
   - 파일: `docs/081_Self_Audit/SAR_reports/SAR_YYYY-MM-DD_NNN_Category_설명.md`
   - 규칙: [SAR 작성 규칙](docs/000_GUIDE/SAR_RULE.md) 참고
   - 심각도: CRITICAL / HIGH / MEDIUM / LOW

2. **Check List 생성** (SAR 작성 후 같은 날)
   - 출처: SAR의 "Prevention" 섹션
   - 저장: Phase 1/2/3 체크리스트 해당 섹션에 추가
   - 절차: [Check List 관리 절차](docs/000_GUIDE/CHECK_LIST_PROCEDURE.md) 참고

3. **Check List 검증** (새 기능 시작 시)
   - Phase 1: Design 관련 항목 확인
   - Phase 2: Implementation 관련 항목 확인
   - Phase 3: Security/Performance 관련 항목 확인

4. **월간 검토** (매월 마지막 주 금요일)
   - SAR 통계 분석 (분류별, 심각도별)
   - Check List 중복 정리 & 불필요 항목 제거
   - 팀 회의에서 주요 오류 공유

**기대 효과 (1-3개월):**

- Month 1: 오류율 50-60% 감소
- Month 2: 오류율 75-80% 감소
- Month 3+: 오류율 90%+ 감소

**자동화 검토 (1개월 후):**

- Check List 항목 > 40개 → 카테고리화
- SAR 파일 > 50개 → 데이터베이스화 고려
- 월간 검토 시간 > 1시간 → 자동 분류 도구 고려
- 그 외: 현재 수동 방식 유지

---

### 🔗 기타 참고 문서

- [통합 개발 방법론](docs/000_GUIDE/INTEGRATED_DEVELOPMENT_METHODOLOGY.md)
- [기술 의사결정 기록](/.planning/DECISIONS.md)
- [프로젝트 컨텍스트](/.planning/CONTEXT.md)
- [SAR 작성 규칙](docs/000_GUIDE/SAR_RULE.md)
- [Check List 관리 절차](docs/000_GUIDE/CHECK_LIST_PROCEDURE.md)

---

## 📝 개정 이력 (Revision History)

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-16 | Antigravity | 초기 프로젝트 규정 수립 및 개발 환경 가이드 구축 |
| v1.1 | 2026-04-16 | Antigravity | 파일 관리 기준(800-1000라인) 및 지시 상충 시 재확인 가드레일 공식 명문화 |
