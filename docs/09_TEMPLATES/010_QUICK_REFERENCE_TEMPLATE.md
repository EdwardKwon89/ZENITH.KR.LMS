# 🚀 빠른 참조 가이드 (Quick Reference)

> **프로젝트:** [PROJECT_NAME]  
> **팀 규모:** [TEAM_SIZE]명  
> **기술스택:** [TECH_STACK]  
> **개발 기간:** [DURATION]

---

## 📋 한눈에 보는 워크플로우

```
┌─────────────────────────────────────────────────────────┐
│                    기능 개발 요청                         │
└──────────────────────┬──────────────────────────────────┘
                       ↓
            Phase 1: 설계 (Design)
            ├─ 설계 검토 & 아키텍처 검증
            ├─ 요구사항 명확화
            ├─ 예상 이슈 파악
            └─ ✅ Self Check 통과 (필수)
                       ↓
            Phase 2: 구현 (Implement)
            ├─ Claude Code: 설계 리뷰
            ├─ Ollama: 함수 자동완성
            ├─ 코드 작성 (직접)
            ├─ 단위 테스트 작성
            ├─ 커버리지 80%+ 확인
            ├─ 수동 기능 테스트
            ├─ 보안 검증
            └─ ✅ Self Test 통과 (필수)
                       ↓
            Phase 3: 검증 (Verify)
            ├─ ZEN_A4 자동 리뷰
            ├─ Claude 최종 검증
            ├─ SAR 작성 (필요시)
            └─ 모든 Check List 통과
                       ↓
            ✅ 커밋 & 병합
```

---

## ⏱️ 예상 소요 시간

| Phase | 활동 | 시간 | 도구 |
|-------|------|------|------|
| **1. 설계** | 아키텍처 설계 | [XX시간] | Claude Code |
| | Self Check | 15-30분 | 체크리스트 |
| **2. 구현** | 코드 작성 | [XX시간] | Ollama + 직접 |
| | 테스트 작성 | [XX시간] | 직접 |
| | Self Test | 30-45분 | 체크리스트 |
| **3. 검증** | 자동 리뷰 | 5-10분 | ZEN_A4 |
| | Claude 검증 | 10-15분 | Claude Code |
| | SAR 작성 | 15-30분 (필요시) | 직접 |
| **합계** | | **[XX시간]** | |

> **주의:** [XX시간]은 프로젝트별로 채우세요

---

## 🔄 Daily Workflow

### 아침 (스탠드업)

```
□ 어제 완료 사항 공유
□ 오늘 할 기능 확인
□ 막히는 부분 물어보기
```

### 개발 시간

```
1. Self Check (Phase 1)
   □ 설계 검토 체크리스트 실행
   □ 문제 없으면 코딩 진행

2. 코딩 (Phase 2)
   □ Ollama로 자동완성 활용 (Tab)
   □ 복잡한 부분은 Claude에 상담
   □ 테스트 동시에 작성

3. Self Test (Phase 2)
   □ 단위 테스트 실행
   □ 커버리지 확인 (80%+)
   □ 수동 기능 테스트
   □ 보안 검증

4. 오류 시 SAR 작성 (필요시)
   □ SAR 파일 생성
   □ Check List 업데이트
   □ 코드 수정 & 재테스트

5. 커밋 (Phase 3)
   □ Final Check List 실행
   □ git commit
   □ Pull Request 생성
```

### 오후 (코드 리뷰)

```
□ ZEN_A4 자동 리뷰 결과 확인
□ Claude 최종 검증 수행
□ 리뷰 의견 반영
□ Merge 승인
```

---

## 🛠️ 빠른 명령어

### Claude Code 주요 커맨드

```bash
# 1. 복잡한 기능 설계
/gsd-plan-phase "기능명"

# 2. 코드 검토 (VS Code에서)
Cmd+K,C (Continue.dev)

# 3. 복잡한 문제 해결
채팅에서 "@codebase" 사용
```

### Ollama 주요 단축키

```bash
# 1. 함수 자동완성
Tab (또는 설정된 단축키)

# 2. 전체 함수 작성
Cmd+K로 선택 후 "함수명 구현해줘"

# 3. 파일 템플릿
Cmd+K에서 "파일 구조 만들어줘"
```

### Git 기본 명령어

```bash
# 1. Branch 생성
git checkout -b feature/기능명

# 2. 커밋
git commit -m "feat: 기능 설명"

# 3. Pull Request 생성
gh pr create

# 4. Merge
gh pr merge [pr-number]
```

---

## ✅ 체크리스트 (Quick Checklist)

### Phase 1: 설계 (Self Check)

```
□ 요구사항 명확화
□ 아키텍처 설계 완료
□ 데이터 흐름 확인
□ 예상 이슈 파악
□ 의존성 확인
□ 예상 개발 시간 추정
□ [TODO: 프로젝트별 추가]
```

### Phase 2: 구현 (Self Test)

```
□ 모든 함수 구현 완료
□ 테스트 코드 작성 완료
□ npm test (또는 해당 명령어) 모두 통과
□ 커버리지 80% 이상
□ 수동 기능 테스트 통과
□ 보안 검증 통과
□ SAR 작성 완료 (필요시)
□ Check List 업데이트 완료 (필요시)
□ [TODO: 프로젝트별 추가]
```

### Phase 3: 검증 (커밋 전)

```
□ ZEN_A4 자동 리뷰 완료
□ Claude 최종 검증 완료
□ Linting 통과
□ 커밋 메시지 작성
□ 브랜치명 규칙 준수
□ PR 설명 작성
□ [TODO: 프로젝트별 추가]
```

---

## 🚨 자주 하는 실수

| 실수 | 해결 |
|------|------|
| Self Check 스킵 | → Phase 1 필수 체크리스트 사용 |
| 테스트 미작성 | → TDD (테스트 먼저 작성) 규칙 따르기 |
| 커버리지 80% 미달 | → Self Test 통과 안 됨 |
| SAR 미작성 | → 오류 발생 시 필수 작성 |
| Check List 미업데이트 | → 동일 오류 재발 위험 |
| Self Test 없이 커밋 | → Stop 게이트에서 차단됨 |

---

## 📞 SOS (문제 발생)

### "Self Test 실패했어요"

```
1. 오류 메시지 읽기
2. 오류 원인 파악
3. SAR 작성 (오류 기록)
4. 코드 수정
5. Self Test 재실행
6. 통과 후 커밋
```

**도움 받기:**
- [Troubleshooting Guide](./TROUBLESHOOTING_TEMPLATE.md)
- Claude Code: `@codebase 이 에러 뭐야?`
- 팀 리더: Slack/회의

### "뭘 해야 할지 모르겠어요"

```
1. 이 문서 (Quick Reference) 다시 읽기
2. Onboarding Guide 참고
3. [PHASE_CHECKLIST] 확인
4. 팀 리더에게 물어보기
```

---

## 📚 필독 문서

- ✅ [온보딩 가이드](./ONBOARDING_TEMPLATE.md) - 첫 기능 개발
- ✅ [체크리스트](./CHECKLISTS_TEMPLATE/) - Phase별 상세 체크
- ⚠️ [문제 해결](./TROUBLESHOOTING_TEMPLATE.md) - 문제 발생 시
- 📖 [통합 개발 방법론](../000_GUIDE/INTEGRATED_DEVELOPMENT_METHODOLOGY.md) - 상세 설명
- 📖 [ZEN_A4 방법론](../000_GUIDE/ZEN_A4_METHODOLOGY.md) - 자동화 시스템

---

## 🎯 팀 규칙

### 필수 규칙 (어겨진 경우 커밋 차단)

```
1. Self Check 통과 없이 구현 진행 금지
2. Self Test 통과 없이 커밋 금지
3. 커버리지 80% 미달 커밋 금지
4. 오류 발생 시 SAR 미작성 금지
```

### 권장 규칙

```
1. 매일 아침 스탠드업 (10분)
2. 주간 리뷰 (1시간 - 금요일)
3. SAR 검토 (주간 1회)
4. Check List 업데이트 (분기 1회)
```

---

## 📊 성공 지표

| 지표 | 목표 | 확인 방법 |
|-----|------|---------|
| **Self Test 통과율** | 100% | Check List |
| **테스트 커버리지** | 80%+ | 커밋 전 확인 |
| **SAR 작성율** | 100% (오류 발생 시) | SAR 목록 |
| **코드 리뷰 반려율** | < 10% | PR 통계 |
| **버그 감소율** | 월 -10% | 이슈 추적 |

---

## 🔗 바로가기

```
프로젝트 구조:
├─ src/              [프로젝트 소스]
├─ docs/
│  ├─ 000_GUIDE/     [공통 방법론]
│  ├─ 090_TEMPLATES/ [Template 모음]
│  ├─ 081_Self_Audit/ [SAR 관리]
│  └─ 082_METRICS/   [통계]
├─ .planning/
│  ├─ DECISIONS.md   [기술 결정]
│  └─ CONTEXT.md     [프로젝트 정보]
└─ CLAUDE.md         [프로젝트 가이드]
```

---

**프로젝트 시작일:** [START_DATE]  
**예상 완료일:** [END_DATE]  
**최종 업데이트:** 2026-04-08  
**버전:** 1.0

---

## 💬 피드백

이 가이드가 부족하거나 추가할 항목이 있으면:
- Slack: #[PROJECT_NAME]-guide
- 이슈: GitHub Issues
- 회의: 주간 리뷰에서 제안

**모두 함께 만드는 가이드입니다!** 📝
