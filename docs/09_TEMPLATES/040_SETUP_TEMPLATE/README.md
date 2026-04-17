# ⚙️ Setup Guide Templates

> 프로젝트 시작 시 개발 환경 설정 가이드

4가지 도구의 상세 설정:

1. **CLAUDE_CODE_SETUP.md** - Claude Code (Subscription) 설정
2. **OLLAMA_DIRECT_INSTALL_TEMPLATE.md** - Ollama + Gemma4 설치
3. **VSCODE_OLLAMA_SETUP.md** - VS Code에서 Ollama 통합 설정
4. **ZEN_A4_SETUP.md** - settings.json 훅 설정 (자동화)

---

## 🚀 첫 프로젝트 시작 순서

```
1. CLAUDE_CODE_SETUP.md 따라하기
   → 로그인 & VS Code 연동 (10분)

2. OLLAMA_DIRECT_INSTALL_TEMPLATE.md 따라하기
   → Ollama 설치 & Gemma4 다운로드 (15분)

3. VSCODE_OLLAMA_SETUP.md 따라하기
   → VS Code에서 Ollama 통합 설정 (10분)
   → Continue.dev 확장 설치 & 구성

4. ZEN_A4_SETUP.md 따라하기
   → 자동화 훅 설정 (10분)

완료: 총 45분
```

---

## 💡 각 Setup의 역할

| Setup | 도구 | 비용 | 역할 |
|-------|------|------|------|
| **CLAUDE** | Claude Code | Subscription | 설계/검증 |
| **OLLAMA_INSTALL** | Ollama + Gemma4 | 무료 | 설치 & 모델 다운로드 |
| **VSCODE_OLLAMA** | Continue.dev | 무료 | VS Code 자동완성 |
| **ZEN_A4** | VS Code Hooks | 무료 | 자동 리뷰 & 검증 |

---

## 📋 첫 번째 프로젝트 체크리스트

```
□ Claude Code 설정 완료
  □ 로그인
  □ VS Code 연동
  □ /gsd-plan-phase 테스트

□ Ollama 설치 완료
  □ 설치 (ollama --version)
  □ Gemma4 다운로드
  □ ollama run gemma4:9b 테스트

□ VS Code + Ollama 통합 완료
  □ Continue.dev 확장 설치
  □ config.json 설정
  □ Chat 창 테스트
  □ 자동완성 테스트

□ ZEN_A4 설정 완료
  □ settings.json 작성
  □ hooks 활성화
  □ AutoReview 테스트

□ 개발 시작
  □ ONBOARDING_TEMPLATE.md로 첫 기능 개발
```

---

**각 파일을 열어서 단계별로 따라하세요!** 👇
