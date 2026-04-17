# 🆘 문제 해결 가이드 (Troubleshooting Guide)

> **프로젝트:** [PROJECT_NAME]  
> **작성자:** [TEAM_LEADER_NAME]  
> **최종 업데이트:** 2026-04-XX

팀에서 발생한 실제 문제와 해결 방법을 기록합니다.

---

## 📌 사용 방법

1. **문제 검색:** Ctrl+F로 키워드 검색
2. **해결 방법 실행:** 단계별 따라하기
3. **해결 안 되면:** "추가 도움" 섹션의 연락처로 문의
4. **새로운 문제:** 발견되면 이 문서에 추가

---

## 🔴 Phase 1-3 관련

### Q1: "Self Check를 어디서 시작하나요?"

**A:** Phase 1 Design Checklist를 사용하세요.

```bash
위치: docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_1_DESIGN_CHECKLIST.md

1. 파일 열기
2. [FEATURE_NAME] = 실제 기능명으로 변경
3. 각 섹션의 □ 항목들 체크
4. 모두 통과 시 "Self Check 통과"
```

---

### Q2: "Self Test 실패했어요. 어떻게 해야 하나요?"

**A:** 다음 절차를 따르세요.

```
1단계: 오류 메시지 읽기
  - 터미널 오류 메시지 확인
  - 무엇이 실패했는지 파악
  
2단계: 원인 분석
  - "이 코드가 맞나?" 다시 검토
  - 테스트 케이스가 맞나 확인
  - 라이브러리 버전 확인
  
3단계: 코드 수정
  - 원인에 따라 수정
  - 테스트 코드 또는 구현 코드 수정
  
4단계: 재테스트
  npm test (또는 해당 명령어)
  
5단계: 모두 통과?
  YES: Self Test 통과! Phase 3으로
  NO:  1단계부터 다시
```

**구체적 예시:**

```javascript
// 테스트 실패
❌ TypeError: addTodo is not a function

// 원인 분석
// 1. 함수가 구현되었나?
// 2. 함수가 export 되었나?
// 3. import 경로가 맞나?

// 수정 예
export function addTodo(title) {
  // ...
}

// 재테스트
npm test

✓ All tests passed!
```

---

### Q3: "커버리지가 80% 미달입니다"

**A:** 테스트를 추가하세요.

```bash
현재 상황:
  npm test -- --coverage
  → 함수 커버리지: 75% (목표: 80%)

테스트 추가:
  1. 미도달 코드 확인
     npm test -- --coverage
     [Uncovered Lines 섹션 확인]
  
  2. 테스트 케이스 추가
     src/__tests__/app.test.js에 다음 추가:
     
     it('엣지 케이스 처리', () => {
       // 미도달 코드를 테스트
     });
  
  3. 재측정
     npm test -- --coverage
     → 85%+ 확인

개선되지 않으면:
  - Claude에게 "이 함수의 엣지 케이스는?" 질문
  - 팀 리더 상담
```

---

### Q4: "SAR은 어떻게 작성하나요?"

**A:** SAR (Self_Audit_Report) 작성 가이드

```
상황: Self Test에서 Null Reference 오류 발생

1단계: SAR 파일 생성
  위치: docs/081_Self_Audit/SAR_reports/
  파일명: SAR_YYYY-MM-DD_NNN_NullReference.md
  예: SAR_2026-04-09_001_NullReference.md

2단계: SAR 내용 작성
  
  ---
  name: Null Reference 오류
  description: refreshToken 함수의 null 체크 누락
  type: 오류 기록
  ---
  
  ## 현상 (What)
  refreshToken() 함수에서 null reference 오류 발생
  
  ## 원인 (Why)
  토큰 조회 실패 시 null 체크 누락
  
  ## 조치 (How)
  - null 체크 추가: if (!token) return
  - 에러 케이스 테스트 추가
  
  ## 검증 (Verification)
  npm test → 모두 통과
  
  ## 예방 (Prevention)
  Check List에 "Null 체크" 항목 추가

3단계: Check List 업데이트
  파일: INTEGRATED_DEVELOPMENT_METHODOLOGY.md
  섹션: 체크리스트 → Phase 2
  
  추가:
  □ Null 체크: 모든 외부 입력 (SAR-001)

4단계: 000_SAR_README.md 업데이트
  SAR 목록에 이 항목 추가
```

---

## 🔴 도구 관련

### Q5: "Ollama가 응답이 너무 느려요"

**A:** 성능 최적화

```bash
현재 상황:
  Tab 키 눌렀는데 3-5초 기다려야 함

해결 방법 (우선순위):

1순위: GPU 활용 확인
  ollama list
  # gemma4:9b-instruct-q4_0
  
  # q4_0은 CPU 모드 → GPU 모드로 변경 필요
  # M1/M2 Mac 또는 NVIDIA GPU 사용 시 자동 활용

2순위: 로컬 모델 크기 확인
  # 9B 모델 (gemma4:9b)
  # → 용량: ~5GB, 응답: 1-2초 (GPU) / 5-10초 (CPU)
  
  # 7B 모델로 변경 고려
  ollama pull gemma2:7b
  
3순위: VS Code 설정 확인
  # 자동완성 지연 설정 조정
  VS Code → Settings → Copilot
  
4순위: 하드웨어 확인
  # 메모리 8GB 이상 권장
  # SSD 권장 (HDD는 매우 느림)
```

**확인 방법:**
```bash
# Ollama 성능 테스트
time ollama run gemma4:9b "hello"

# 1-2초: 정상 (GPU)
# 5-10초: 정상 (CPU)
# 30초+: 비정상 (메모리 부족)
```

---

### Q6: "Claude Code 설정이 안 돼요"

**A:** VS Code Extension 확인

```bash
VS Code → Extensions 탭

1. "Claude Code" 검색
2. "Claude Code" 설치
3. "Sign in" 버튼 클릭
4. 로그인 완료 후 재시작

확인:
  - VS Code 좌측 하단에 "Claude" 아이콘 있나?
  - /gsd-plan-phase 명령 사용 가능?

안 되면:
  - VS Code 전체 재시작
  - Extension 재설치
  - 계정 재로그인
```

---

### Q7: "ZEN_A4 자동 리뷰가 안 실행돼요"

**A:** settings.json 확인

```bash
위치: ~/.claude/settings.json (또는 프로젝트 .claude/settings.json)

확인 사항:
1. hooks 섹션이 활성화되어 있나?
   "hooks": {
     "enabled": true,
     ...
   }

2. PostToolUse가 활성화되어 있나?
   "postToolUse": {
     "enabled": true,
     ...
   }

3. 설정 저장 후 VS Code 재시작

여전히 안 되면:
  - 팀 리더에게 설정 파일 요청
  - Claude에게 "ZEN_A4 설정" 상담
```

---

## 🔴 Git 관련

### Q8: "커밋 메시지를 잘못 작성했어요"

**A:** 마지막 커밋 수정

```bash
상황: "feat: 로그인" 이라고 했는데 "feat: 로그인 기능 추가"여야 함

해결:
  git commit --amend

  # 에디터 열림
  # 메시지 수정
  # 저장 & 종료
  
  git push -f  # 주의: 이미 push한 경우만

주의:
  - amend는 이미 push한 커밋에는 --force 필요
  - 팀과 협업 시 조심스러워야 함
```

---

### Q9: "잘못된 브랜치에서 커밋했어요"

**A:** 브랜치 변경

```bash
상황:
  main에서 실수로 커밋함
  feature/login 브랜치에서 작업해야 했음

해결:
  1. feature/login 브랜치 생성 & 전환
     git checkout -b feature/login
  
  2. 커밋은 자동으로 따라옴
  
  3. main 브랜치에서 커밋 되돌리기
     git checkout main
     git reset --hard HEAD~1

경고: reset --hard는 되돌릴 수 없음!
  - 확실할 때만 사용
  - 팀 리더와 상담 후 사용
```

---

### Q10: "Pull Request에서 conflict가 났어요"

**A:** 병합 충돌 해결

```bash
상황:
  PR 생성했는데 "This branch has conflicts that must be resolved"

원인:
  다른 팀원이 같은 파일을 수정한 경우

해결:
  1. 로컬에서 main 업데이트
     git fetch origin
     git merge origin/main
  
  2. 충돌 파일 확인
     <<<<<<< HEAD
     내 코드
     =======
     다른 사람 코드
     >>>>>>>
  
  3. 충돌 해결 (두 코드 모두 필요시 병합)
  
  4. 재커밋
     git add [파일]
     git commit -m "Merge main into feature/login"
  
  5. 푸시
     git push

  6. PR이 자동으로 업데이트됨

불확실하면:
  - 팀 리더에게 물어보기
  - Claude에게 "이 코드 병합해줄래?" 요청
```

---

## 🔴 프로젝트별 추가 문제

> **주의:** PM/Leader는 프로젝트 진행 중 새로운 문제를 추가하세요

```
### Q11: "[TODO: 실제 발생한 문제 1]"

**A:** 해결 방법

...

---

### Q12: "[TODO: 실제 발생한 문제 2]"

**A:** 해결 방법

...
```

---

## 📞 추가 도움 받기

| 상황 | 연락처 | 방법 |
|------|--------|------|
| **모르는 문제** | 팀 리더 | Slack / 회의 |
| **기술 문제** | Claude Code | @codebase 또는 채팅 |
| **코딩 문제** | Pair Programming | 함께 코딩 |
| **설계 문제** | Architect | 설계 리뷰 |
| **긴급** | 팀 리더 | 직통 전화 |

---

## 💡 자주 하는 실수

```
❌ "Self Check 없이 바로 구현"
✓ 항상 설계부터 시작하세요

❌ "테스트 커버리지 80% 미달로 커밋"
✓ Stop 게이트가 차단합니다

❌ "SAR 작성을 건너뛰기"
✓ 같은 오류가 반복됩니다

❌ "commit --force 무분별 사용"
✓ 팀과 상담 후 사용하세요

❌ "자동 리뷰 무시"
✓ 빨간색 ❌는 필수 수정입니다
```

---

## 🎯 문제 해결 플로우

```
문제 발생
  ↓
이 문서에서 검색 (Ctrl+F)
  ↓
  ├─ 찾음: 해결 방법 따라하기
  │
  └─ 못 찾음:
     ↓
     팀 리더에게 물어보기
     ↓
     해결됨: 이 문서에 추가
```

---

**최종 업데이트:** 2026-04-XX  
**담당자:** [TEAM_LEADER_NAME]  
**버전:** 1.0

---

**이 문서는 팀의 경험과 함께 자라갑니다. 새로운 문제를 발견하면 추가해주세요!** 📚
