# 👋 팀 온보딩 가이드 (Onboarding Guide)

> **프로젝트:** [PROJECT_NAME]  
> **작성자:** [TEAM_LEADER_NAME]  
> **작성일:** 2026-04-XX

환영합니다! 👋 이 가이드는 첫 기능 개발까지의 완전한 단계별 지침입니다.

---

## 📌 이 가이드의 목표

```
30분 후:    ✓ 개발 환경 설정 완료
1시간 후:   ✓ 첫 번째 기능 설계 완료
3시간 후:   ✓ 첫 번째 기능 개발 완료
4시간 후:   ✓ 첫 번째 Pull Request 생성
```

---

## 📋 사전 확인 (15분)

### 필요한 것들

```
✓ 다음이 설치되어 있나요?
  □ Git
  □ Node.js (또는 [TECH_STACK의 기본 도구])
  □ VS Code (또는 선호하는 편집기)
  □ Claude Code (구독 확인)
  □ Ollama (설치 및 Gemma4 다운로드)

✓ 다음 계정은 준비되어 있나요?
  □ GitHub 계정
  □ Claude (또는 로그인 상태)
  
✓ 다음 정보는 받았나요?
  □ GitHub Repository URL
  □ Slack/Discord 채널
  □ 팀원 연락처
  □ 프로젝트 개요 (CONTEXT.md)
```

### 설정 확인 체크리스트

```bash
# 1. Git 설정 확인
git config --global user.name
git config --global user.email

# 2. Node.js 확인 (JavaScript 프로젝트인 경우)
node --version
npm --version

# 3. Claude Code 확인 (VS Code Extension)
# VS Code → Extensions → "Claude Code" 검색 → 설치 확인

# 4. Ollama 실행 확인
ollama list
ollama run gemma4:9b "테스트"  # 응답 있으면 OK
```

---

## 🚀 Step 1: 환경 설정 (15분)

### Step 1-1: Repository 클론

```bash
# Repository 클론
git clone [REPOSITORY_URL]
cd [PROJECT_NAME]

# 브랜치 확인
git branch -a

# 최신 코드 동기화
git pull origin main
```

### Step 1-2: 의존성 설치

```bash
# [TECH_STACK에 따라 변경]

# Node.js 프로젝트
npm install

# Python 프로젝트
pip install -r requirements.txt

# 기타
[해당 명령어]

# 설치 확인
npm test (또는 해당 테스트 명령어)
```

### Step 1-3: 도구 설정 확인

```bash
# Claude Code 설정
# VS Code → Extensions → Claude Code → Settings 확인

# Ollama 실행
ollama serve

# (다른 터미널에서)
ollama run gemma4:9b
```

### Step 1-4: 프로젝트 구조 이해

```bash
# 디렉토리 구조 확인
tree -L 2

# 주요 파일 읽기
□ README.md (프로젝트 개요)
□ CLAUDE.md (개발 가이드)
□ .planning/CONTEXT.md (팀 정보)
□ docs/000_GUIDE/INTEGRATED_DEVELOPMENT_METHODOLOGY.md (방법론)
```

**완료:** ✓ "환경 설정 완료" 메시지 받으면 다음으로

---

## 📖 Step 2: 방법론 이해 (15분)

### Step 2-1: GSD + ZEN_A4 개요

```
┌─────────────────────────────────────┐
│  GSD: 목표 기반 개발 방법론         │
│  ZEN_A4: 자동화 품질 관리 시스템    │
│  Claude: 설계/검증 도구             │
│  Ollama: 코드 자동완성 도구         │
└─────────────────────────────────────┘
```

**읽을 문서:**
- [ ] [Quick Reference](./QUICK_REFERENCE_TEMPLATE.md) (5분)
- [ ] [ZEN_A4 방법론](../000_GUIDE/ZEN_A4_METHODOLOGY.md) (10분)

### Step 2-2: 개발 플로우 이해

```
Phase 1 (설계):
  - 요구사항 명확화
  - 아키텍처 설계
  - ✅ Self Check 통과 (필수)
  
Phase 2 (구현):
  - Ollama로 자동완성
  - 테스트 코드 작성
  - ✅ Self Test 통과 (필수)
  
Phase 3 (검증):
  - ZEN_A4 자동 리뷰
  - Claude 최종 검증
  - ✅ 커밋 (필수)
```

### Step 2-3: 팀 규칙 확인

```
필수 규칙:
□ Self Check 없이 구현 시작 금지
□ Self Test 없이 커밋 금지
□ 오류 발생 시 SAR (Self_Audit_Report) 필수

팀 활동:
□ 매일 아침: 스탠드업 (10분)
□ [지정 요일]: 코드 리뷰 (1시간)
□ 월 1회: 팀 회의
```

**완료:** ✓ 위의 모든 문서 읽기 완료

---

## 💻 Step 3: 첫 번째 기능 개발 (2-3시간)

### Step 3-1: 첫 기능 정의

**이번에 개발할 기능:**
```
기능명: [FIRST_FEATURE_NAME]
요구사항: [요구사항 1~3]
예상 시간: [XX시간]

예시: "사용자 로그인 기능" 또는 "To-Do 추가 기능"
```

### Step 3-2: 브랜치 생성

```bash
# 브랜치 생성 (이름 규칙: feature/기능명)
git checkout -b feature/[FIRST_FEATURE_NAME]

# 확인
git branch
# * feature/[FIRST_FEATURE_NAME]
# main
```

### Step 3-3: Phase 1 - 설계 (30분)

**Step 3-3-1: 설계 검토**

다음을 생각해보세요:
```
□ 이 기능이 정확히 뭔가요?
  → [요구사항 작성]

□ 어떻게 구현할 건가요?
  → [기본 아이디어 작성]

□ 어떤 파일을 수정할 건가요?
  → [수정 파일 나열]

□ 테스트는 어떻게 할 건가요?
  → [테스트 시나리오 작성]
```

**Step 3-3-2: Self Check 실행**

```
[Phase 1: Self Check 체크리스트]

□ 요구사항 명확화
  - 이 기능이 정확히 뭔지 안다
  - 사용자 관점에서 이해한다
  
□ 아키텍처 설계
  - 어떤 파일을 수정할지 안다
  - 함수/메소드 구조를 알아둔다
  
□ 의존성 확인
  - 외부 라이브러리는 필요 없다 (또는 이미 있다)
  - 다른 팀원과의 의존성은 없다 (또는 조율됨)
  
□ 예상 이슈 파악
  - 예상되는 문제가 없다 (또는 해결책이 있다)
  
□ [TODO: 프로젝트별 추가 항목]
```

**문제 있으면:** 팀 리더에게 문의 (Slack/회의)

**완료:** ✓ 모든 항목 체크 → "Self Check 통과" → Phase 2 진행

---

### Step 3-4: Phase 2 - 구현 (1-2시간)

**Step 3-4-1: 테스트 코드 작성 (TDD)** ← 테스트부터!

```
// [PROJECT_LANGUAGE] 예시

예: JavaScript/Node.js
```typescript
describe('[FIRST_FEATURE_NAME]', () => {
  it('정상 케이스', () => {
    // TODO: 테스트 코드 작성
  });
  
  it('에러 케이스', () => {
    // TODO: 에러 테스트
  });
});
```

예: Python
```python
def test_first_feature():
    # TODO: 테스트 코드 작성
    assert result == expected
```
```

**도움 받기:**
- `Claude Code: @codebase "[기능명]" 테스트 코드 작성해줄래?`
- [체크리스트](./CHECKLISTS_TEMPLATE/PHASE_2_EXECUTE_CHECKLIST.md) 참고

**Step 3-4-2: 기능 구현**

```bash
# 1. 파일 열기
code src/[파일명]

# 2. Ollama 자동완성 활용
# - 함수명 시작 후 Tab 키
# - 몇 글자 입력하면 자동 제안

# 3. 복잡한 부분은 Claude 상담
# - VS Code에서: Cmd+K,C
# - 또는: Claude Code 채팅에서 상담

# 4. 테스트 실행 (계속)
npm test (또는 해당 명령어)
```

**예시 개발 과정:**

```
1. 함수 시그니처 작성
   function addTodo(title) {
   
2. Tab으로 자동완성
   function addTodo(title) {
     // 함수 본문 자동 생성
   }
   
3. 테스트 실행
   npm test → 일부 통과
   
4. 실패한 테스트 수정
   코드 수정
   npm test → 모두 통과
   
5. 커버리지 확인
   npm test -- --coverage
   → 80% 이상? OK!
```

**Step 3-4-3: Self Test 실행**

```
[Phase 2: Self Test 체크리스트]

□ 코드 작성 완료
  - 모든 함수가 구현되어 있다
  
□ 테스트 작성 완료
  - 정상 케이스와 에러 케이스 모두 있다
  
□ 테스트 통과
  npm test → ✓ All tests passed
  
□ 커버리지 확인
  npm test -- --coverage
  → 80% 이상: ✓ OK!
  → 미달: ✗ 추가 테스트 필요
  
□ 수동 테스트
  - 애플리케이션을 직접 실행
  - 기능이 정상 작동하는지 확인
  
□ 보안 검증
  - 사용자 입력이 안전하게 처리되는가?
  - 민감한 정보가 노출되지 않는가?
  
□ [TODO: 프로젝트별 추가 항목]
```

**문제 발생:**
- 테스트 실패 → [Troubleshooting](./TROUBLESHOOTING_TEMPLATE.md) 참고
- 커버리지 부족 → 테스트 추가
- 보안 문제 → Claude에 상담

**완료:** ✓ 모든 항목 체크 → "Self Test 통과" → Phase 3 진행

---

### Step 3-5: Phase 3 - 검증 & 커밋 (30분)

**Step 3-5-1: 코드 커밋**

```bash
# 1. 변경사항 확인
git status

# 2. 파일 스테이징
git add src/[변경된 파일들]

# 3. 커밋 (메시지 규칙: feat/fix/refactor/docs)
git commit -m "feat: [FIRST_FEATURE_NAME] 구현"

# 3-1. 커밋 메시지 형식
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 개선
test: 테스트 추가
docs: 문서 수정

예시:
git commit -m "feat: 로그인 기능 구현

- JWT 토큰 기반 인증
- 비밀번호 해싱
- 테스트 커버리지 85%"
```

**Step 3-5-2: ZEN_A4 자동 리뷰 확인**

```
자동으로 실행됨:
✓ code-reviewer: 코드 품질 검증
✓ security-reviewer: 보안 검증
✓ language-reviewer: 언어 관례 검증

결과 확인:
- Slack/VS Code에 알림 옴
- 빨간색 ❌ 항목 있으면 수정 필요
- 노란색 ⚠️ 항목은 권장사항
```

**Step 3-5-3: 최종 검증**

```
체크리스트:
□ 모든 테스트 통과
□ 커버리지 80% 이상
□ 자동 리뷰 ❌ 없음
□ 커밋 메시지 규칙 준수
```

---

## 🎯 Step 4: Pull Request 생성 (15분)

### Step 4-1: 브랜치 푸시

```bash
# 브랜치를 원격 저장소에 푸시
git push -u origin feature/[FIRST_FEATURE_NAME]

# 확인
git branch -r
# origin/feature/[FIRST_FEATURE_NAME]
```

### Step 4-2: Pull Request 생성

```bash
# GitHub CLI로 PR 생성
gh pr create --title "feat: [FIRST_FEATURE_NAME]" \
  --body "
## Summary
[기능 설명 1-3줄]

## Test Plan
- [ ] 로컬에서 테스트 완료
- [ ] 커버리지 80% 확인
- [ ] Self Test 통과

## Screenshots/Examples
[필요하면 스크린샷 추가]
"
```

**또는 웹에서:**
```
1. GitHub 열기
2. "Create Pull Request" 버튼 클릭
3. 제목 & 설명 입력
4. "Create pull request" 클릭
```

### Step 4-3: 코드 리뷰 받기

```
PR 생성 후:
□ 팀 리더가 리뷰 (12-24시간 이내)
□ 의견 있으면 수정 후 재커밋
  → 자동으로 PR 업데이트됨
□ 승인 받으면 Merge
```

**완료:** ✓ PR Merge 완료! 🎉

---

## ✨ Step 5: 축하합니다!

```
┌──────────────────────────────┐
│  첫 번째 기능 개발 완료! 🎉  │
│                              │
│  ✓ 환경 설정                 │
│  ✓ 방법론 학습               │
│  ✓ 첫 기능 개발              │
│  ✓ PR 생성 & Merge           │
│                              │
│  이제 팀의 일원입니다! 👋    │
└──────────────────────────────┘
```

### 다음 단계

```
□ 팀 회의 참석
□ 다음 기능 할당 받기
□ 질문 있으면 팀 리더에게 물어보기
□ Slack에서 팀과 소통

이 가이드 언제든 참고 가능!
```

---

## 🆘 문제 발생 시

| 상황 | 해결 방법 |
|------|---------|
| **"Self Test 실패"** | [Troubleshooting](./TROUBLESHOOTING_TEMPLATE.md) 참고 |
| **"Ollama 응답 느림"** | 로컬 GPU 활용 설정 확인 |
| **"테스트 커버리지 부족"** | 테스트 추가 (Claude에게 도움 요청) |
| **"PR 리뷰 의견 받음"** | 수정 후 재커밋 (자동 업데이트) |
| **"뭘 해야 할지 모름"** | Quick Reference 다시 읽기 → 팀 리더 문의 |

---

## 📚 참고 자료

```
필독 (이미 읽음):
✓ Quick Reference
✓ 방법론 문서들

필요시 참고:
□ Phase별 체크리스트
□ Troubleshooting
□ [프로젝트명] CLAUDE.md
□ Integration Development Methodology
```

---

## 📞 연락처

```
막히는 부분이 있으면:

1순위: 팀 리더
  - Slack: @[TEAM_LEADER]
  - 직통: [PHONE_NUMBER]
  
2순위: 팀 채널
  - Slack: #[PROJECT_NAME]-dev
  - 이슈: GitHub Issues

3순위: Claude Code
  - @codebase 사용해서 질문
  - 설계/코딩 도움
```

---

**온보딩 가이드 작성자:** [TEAM_LEADER_NAME]  
**최종 업데이트:** 2026-04-XX  
**버전:** 1.0

---

**한 번 더:** 질문 있으면 언제든 물어보세요! 이것이 팀 문화입니다. 👋
