# 🔌 VS Code에서 Ollama 구성하기

> **용도:** VS Code에서 Ollama(로컬 LLM)를 활용한 개발  
> **예상 시간:** 10-15분  
> **사전 요구:** Ollama 설치 완료 + Gemma4-9B 다운로드

---

## 📋 개요

VS Code에서 Ollama를 사용하면:

- ✅ 로컬에서 자동완성 기능
- ✅ 오프라인 개발 가능
- ✅ 프라이버시 보호 (외부 전송 없음)
- ✅ 빠른 응답 (GPU 활용)
- ✅ 무료 (Subscription 불필요)

### 권장 옵션

| 옵션 | 기능 | 설정난이도 | 추천도 |
| --- | --- | --- | --- |
| **Continue.dev** | Chat + 자동완성 | 쉬움 | ⭐⭐⭐⭐⭐ |
| **Ollama API** | 기본 API 활용 | 중간 | ⭐⭐⭐ |
| **기타 확장** | 제한적 | 어려움 | ⭐⭐ |

**추천: Continue.dev** (가장 쉽고 강력함)

---

## 🚀 옵션 1: Continue - Open-source AI Code Agent (추천)

### 소개

**Continue**는 오픈소스 AI 코드 에이전트로:

- 로컬 LLM (Ollama) 완벽 지원
- Chat + 자동완성 + 코드 분석
- 완전히 오픈소스 & 프라이빗
- VS Code 통합

### Step 1: Ollama 확인

Ollama가 로컬에서 실행 중인지 확인:

```bash
# 터미널에서 Ollama 실행 (백그라운드)
ollama serve

# 다른 터미널에서 확인
curl http://localhost:11434/api/tags

# 응답 예시:
# {"models":[{"name":"gemma4:9b","modified_time":"..."}]}
```

**확인 사항:**
- ✅ Ollama 서버 실행 중 (기본 포트: 11434)
- ✅ 모델 다운로드 완료 (gemma4:9b 등)
- ✅ 터미널에서 curl 응답 확인

### Step 2: VS Code 확장 설치

VS Code를 열고 확장 마켓플레이스 검색:

1. **확장 열기**: `Ctrl+Shift+X` (Windows/Linux) 또는 `Cmd+Shift+X` (Mac)

2. **검색**: "Continue" 입력

3. **설치**: "Continue - Open-source AI Code Agent" (공식 확장)
   - 개발사: Continue Dev
   - 설명: Open-source AI Code Agent
   - 다운로드: 100만+ (신뢰도 높음)

```
확장 정보:
이름: Continue - Open-source AI Code Agent
ID: Continue.continue
출판사: Continue Dev
버전: 최신
설명: AI-powered coding assistant with Ollama support
```

### Step 3: 설정 파일 생성

1. **설정 폴더 열기**
   - Mac: `~/.continue/config.yaml`
   - Windows: `%USERPROFILE%\.continue\config.yaml`
   - Linux: `~/.continue/config.yaml`

2. **없으면 생성**:
   ```bash
   # Mac/Linux
   mkdir -p ~/.continue
   touch ~/.continue/config.yaml
   
   # Windows (PowerShell)
   New-Item -Path "$env:USERPROFILE\.continue" -ItemType Directory -Force
   New-Item -Path "$env:USERPROFILE\.continue\config.yaml" -ItemType File -Force
   ```

3. **설정 파일 작성**: `config.yaml`
   ```yaml
   models:
     - title: "Ollama - Gemma4"
       provider: "ollama"
       model: "gemma4:9b"
       apiBase: "http://localhost:11434"
   
   tabAutocompleteModel:
     title: "Ollama - Gemma4"
     provider: "ollama"
     model: "gemma4:9b"
     apiBase: "http://localhost:11434"
   
   embeddingsProvider:
     provider: "ollama"
     model: "nomic-embed-text"
     apiBase: "http://localhost:11434"
   ```

### Step 4: VS Code 설정 업데이트

VS Code 설정 파일 (`settings.json`)에 추가:

1. **설정 열기**: `Ctrl+,` (Windows/Linux) 또는 `Cmd+,` (Mac)

2. **JSON 편집 열기**: 우측 상단의 `{}` 아이콘 클릭

3. **다음 추가**:
   ```json
   {
     "continue.enableAutoScroll": true,
     "continue.devMode": false,
     "[python]": {
       "editor.defaultFormatter": "ms-python.python",
       "editor.formatOnSave": true,
       "editor.codeActionsOnSave": {
         "source.organizeImports": "explicit"
       }
     }
   }
   ```

### Step 5: 테스트

1. **VS Code 재시작** (또는 `Ctrl+Shift+P` → "Developer: Reload Window")

2. **Continue 패널 열기**:
   - 좌측 사이드바에 "Continue" 아이콘 확인
   - 또는 `Ctrl+L` (Chat 패널)

3. **Chat 테스트**:
   ```
   질문: "Hello, what's your name?"
   
   응답: Gemma4에서 응답 (로컬에서 처리)
   ```

4. **자동완성 테스트**:
   ```python
   # Python 파일에서 함수 작성 후
   def my_function(
   # Tab 키 누르면 자동 완성 제안
   ```

**확인 사항:**
- ✅ Chat 창에서 응답 확인
- ✅ 자동완성 제안 활성화
- ✅ 응답 시간 1-3초 (GPU 활용)

---

## 🔧 옵션 2: Ollama API 직접 사용

더 가볍거나 맞춤 설정이 필요한 경우:

### Ollama API 엔드포인트

```bash
# 기본 포트
http://localhost:11434

# 주요 엔드포인트
POST   /api/generate      # 텍스트 생성
POST   /api/chat          # 대화형 모드
GET    /api/tags          # 설치된 모델 확인
POST   /api/embeddings    # 임베딩 생성
```

### curl로 테스트

```bash
# 기본 생성
curl -X POST http://localhost:11434/api/generate -d '{
  "model": "gemma4:9b",
  "prompt": "Hello, what is your name?",
  "stream": false
}'

# 대화형 (chat)
curl -X POST http://localhost:11434/api/chat -d '{
  "model": "gemma4:9b",
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "stream": false
}'
```

### VS Code 확장에서 활용

커스텀 확장 개발 시:

```javascript
// VS Code 확장 코드 예시
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemma4:9b',
    prompt: userInput,
    stream: false
  })
});

const data = await response.json();
console.log(data.response);
```

---

## ⚙️ 고급 설정

### 성능 최적화

**Ollama 환경 변수** (`~/.zshrc` 또는 `~/.bashrc`):

```bash
# 스레드 수 설정
export OLLAMA_NUM_THREAD=8

# GPU 메모리 할당
export OLLAMA_GPU=1

# 모델 캐시 경로
export OLLAMA_MODELS=~/.ollama/models
```

### 모델 전환

`config.yaml`에서 모델 변경:

```json
{
  "models": [
    {
      "title": "Ollama - Gemma4 (빠름)",
      "provider": "ollama",
      "model": "gemma4:9b"
    },
    {
      "title": "Ollama - Llama2 (정확함)",
      "provider": "ollama",
      "model": "llama2:13b"
    },
    {
      "title": "Ollama - Mistral (가벼움)",
      "provider": "ollama",
      "model": "mistral:7b"
    }
  ]
}
```

### 시스템 프롬프트 커스터마이징

```json
{
  "models": [
    {
      "title": "Ollama - Gemma4",
      "provider": "ollama",
      "model": "gemma4:9b",
      "systemPrompt": "You are a helpful coding assistant. Provide code examples in the user's language. Keep responses concise."
    }
  ]
}
```

---

## 🐛 문제 해결

### 문제: "Cannot connect to localhost:11434"

**해결:**
```bash
# 1. Ollama 서버 실행 확인
ollama serve

# 2. 포트 확인
curl http://localhost:11434/api/tags

# 3. Windows: 방화벽 확인
# Settings > Privacy & Security > Windows Defender Firewall
# > Allow an app through firewall > ollama 추가
```

### 문제: 자동완성이 작동하지 않음

**해결:**
```bash
# 1. config.yaml 경로 확인
# Mac: ~/.continue/config.yaml 존재?

# 2. VS Code 재시작
# Ctrl+Shift+P > "Developer: Reload Window"

# 3. Continue 확장 업데이트
# 확장 마켓플레이스 > Continue > Update
```

### 문제: 응답이 너무 느림

**해결:**
```bash
# 1. 더 가벼운 모델 사용
ollama pull mistral:7b

# 2. GPU 활용 확인
ollama ps  # 실행 중인 모델 확인

# 3. 시스템 리소스 확인
# 메모리/CPU 사용률 모니터링
```

### 문제: 모델을 찾을 수 없음

**해결:**
```bash
# 1. 모델 다운로드
ollama pull gemma4:9b

# 2. 설치된 모델 확인
ollama list

# 3. config.yaml에서 모델명 정확히 확인
# "model": "gemma4:9b" (공백 주의)
```

---

## 📊 성능 비교

| 모델 | 크기 | 응답시간 | 정확도 | 추천용도 |
| --- | --- | --- | --- | --- |
| **mistral:7b** | 4.1GB | 1-2초 | ⭐⭐⭐ | 빠른 완성 |
| **gemma4:9b** | 5.2GB | 2-3초 | ⭐⭐⭐⭐ | 일반 개발 |
| **llama2:13b** | 7.4GB | 3-5초 | ⭐⭐⭐⭐⭐ | 정확한 분석 |

**추천:** 개발 중에는 **gemma4:9b** (속도와 정확도 균형)

---

## 🔗 참고 자료

- [Continue.dev 공식 문서](https://continue.dev)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [Ollama 모델 라이브러리](https://ollama.ai/library)
- [VS Code 확장 마켓플레이스](https://marketplace.visualstudio.com)

---

## ✅ 체크리스트

```bash
□ Ollama 설치 완료 (ollama --version)
□ 모델 다운로드 완료 (ollama list)
□ Ollama 서버 실행 중 (ollama serve)
□ 포트 확인 (curl http://localhost:11434/api/tags)
□ Continue 확장 설치
□ config.yaml 파일 생성 및 설정
□ VS Code 재시작
□ Chat 창에서 테스트 성공
□ 자동완성 기능 작동 확인
```

완성되면 로컬에서 완전히 오프라인 개발 가능! 🚀

---

**최종 업데이트**: 2026-04-08  
**버전**: v1.0
