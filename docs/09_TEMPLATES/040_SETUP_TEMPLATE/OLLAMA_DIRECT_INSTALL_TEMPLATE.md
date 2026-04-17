# 🔧 Ollama 직접 설치 가이드 (Local Development)

> **프로젝트:** [PROJECT_NAME]  
> **용도:** 로컬 개발 환경 (개발자 각각 설치)  
> **예상 시간:** 15분 + 모델 다운로드 (5-20분)

---

## 📌 개요

이 가이드는 **개발 팀 각 멤버가 자신의 PC에 Ollama를 직접 설치**하는 방법입니다.

### 특징
- ✅ 빠른 설치 & 설정
- ✅ 즉시 사용 가능
- ✅ [TECH_STACK]과 직접 통합
- ✅ Mac에서 최고 성능 (Apple Silicon GPU 활용)
- ✅ 디버깅 & 개발 최적화

### 하이브리드 구조
```
로컬 개발 (이 가이드):
└─ Ollama 직접 설치 ← 빠른 반복 개발
  
배포/CI 환경 (별도):
└─ Docker (필요시) ← 팀 표준화
```

---

## 🖥️ 플랫폼별 설치

### macOS (권장 - Apple Silicon 최적화)

#### Step 1: 설치

**Option A: 공식 설치 프로그램 (가장 쉬움)**

```bash
# 다운로드
# https://ollama.ai/download/mac

# 또는 Homebrew
brew install ollama
```

**Option B: Docker Desktop 대신 직접 설치 (권장)**

```bash
# 이미 Docker Desktop이 설치되어 있다면
# Ollama는 별도 설치 (CPU vs GPU 성능 차이 중요)
```

#### Step 2: 실행

```bash
# 백그라운드에서 실행
ollama serve

# 확인 (다른 터미널)
ollama list
```

#### Step 3: 모델 다운로드

```bash
# 권장 모델: llama2 (7B, 3.8GB, 응답 빠름)
ollama pull llama2:7b

# 또는 최신 모델: llama2 13B
ollama pull llama2:13b

# 또는 가벼운 모델: mistral
ollama pull mistral

# 다운로드 확인
ollama list
```

#### Step 4: 테스트

```bash
# 모델 실행
ollama run llama2:7b

# 프롬프트에서 테스트
>>> Hello, what's your name?

# 종료: /bye
```

**특징:**
- ✅ Metal GPU 자동 활용 (M1/M2/M3 최적화)
- ✅ 응답 속도: 1-2초 (GPU 가속)
- ✅ 설정 파일: `~/.ollama/models`

---

### Windows

#### Step 1: 설치

```bash
# 공식 설치 프로그램 다운로드
# https://ollama.ai/download/windows

# 또는 Windows Package Manager
winget install ollama
```

#### Step 2: 실행

```bash
# 설치 후 자동 실행 (백그라운드 서비스)
# 또는 수동 시작
ollama serve
```

#### Step 3: 모델 다운로드

```bash
# PowerShell에서
ollama pull llama2:7b
```

#### Step 4: 테스트

```bash
ollama run llama2:7b
```

**특징:**
- NVIDIA GPU: CUDA 자동 지원
- AMD GPU: 제한적 지원
- 설정 파일: `%USERPROFILE%\.ollama\models`

---

### Linux (Ubuntu/Debian)

#### Step 1: 설치

```bash
# 공식 설치 스크립트
curl -fsSL https://ollama.ai/install.sh | sh

# 또는 패키지 매니저
# Ubuntu
apt-get install ollama

# Fedora
dnf install ollama
```

#### Step 2: 서비스 시작

```bash
# systemd 서비스로 등록
sudo systemctl enable ollama
sudo systemctl start ollama

# 확인
sudo systemctl status ollama
```

#### Step 3: 모델 다운로드

```bash
ollama pull llama2:7b
```

#### Step 4: 테스트

```bash
ollama run llama2:7b
```

**특징:**
- NVIDIA GPU: CUDA 지원
- AMD GPU: ROCm 지원
- 설정 파일: `~/.ollama/models`

---

## 🎯 개발자용 설정

### VS Code 통합

**Extension 설치:**

```
Marketplace에서 "Ollama" 검색
또는 "Continue.dev" 설치
```

**설정:**

```json
// .vscode/settings.json 또는 VS Code settings.json
{
  "continue.serverUrl": "http://localhost:11434",
  "continue.models": [
    {
      "title": "Llama 2",
      "model": "llama2:7b",
      "provider": "ollama"
    }
  ]
}
```

**사용:**
```
VS Code에서 Cmd+K,C (Mac) 또는 Ctrl+K,C (Windows)
→ Ollama에서 자동완성 제안
```

---

### 개발팀 워크플로우

#### 1단계: 로컬 설치 완료 확인

```bash
# 모든 팀원이 실행
ollama pull llama2:7b

# 응답 확인
ollama run llama2:7b -e "test"
```

#### 2단계: 개발 중 사용

```bash
# 터미널 1: Ollama 서비스 실행
ollama serve

# 터미널 2: 코딩
# - VS Code에서 자동완성 사용
# - 또는 CLI에서 ollama run llama2:7b
# - 또는 API 호출: curl http://localhost:11434/api/generate
```

#### 3단계: 성능 최적화

```bash
# GPU 사용 확인
ollama run llama2:7b --verbose

# 로그 확인
tail -f ~/.ollama/logs/ollama.log (macOS/Linux)
# Windows: %APPDATA%\ollama\logs
```

---

## 🔧 트러블슈팅

### Q1: "ollama: command not found"

```bash
# macOS
# 시스템 PATH에 추가
export PATH="/Applications/Ollama.app/Contents/MacOS:$PATH"

# 또는 ~/.zshrc에 추가
echo 'export PATH="/Applications/Ollama.app/Contents/MacOS:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Q2: 모델 다운로드가 느려요

```bash
# 문제: 인터넷 속도 느림 또는 디스크 부족

# 해결 1: 더 작은 모델 사용
ollama pull mistral  # 4.1GB (더 빠름)

# 해결 2: 디스크 공간 확인
df -h ~/.ollama

# 해결 3: 다운로드 재개
ollama pull llama2:7b  # 중단되었다면 재시작
```

### Q3: 응답이 너무 느려요 (3초 이상)

```bash
# 문제: GPU 미사용 또는 CPU 모드

# 1단계: GPU 확인
ollama run llama2:7b --verbose

# macOS: "Metal Acceleration Enabled" 확인
# Windows: "CUDA" 또는 "GPU" 확인
# Linux: "GPU" 확인

# 2단계: GPU 미사용 시 해결

# macOS (Apple Silicon):
# → 기본 지원, 자동 사용
# → Metal GPU 확인: system_profiler SPDisplaysDataType

# Windows (NVIDIA):
# → nvidia-smi 명령으로 GPU 확인
# → NVIDIA Container Toolkit 설치 필요할 수 있음

# Linux (NVIDIA):
# → nvidia-smi 명령으로 GPU 확인
# → NVIDIA CUDA Toolkit 설치 필요

# 3단계: 임시 CPU 모드 (테스트용)
ollama run llama2:7b --cpu-only
```

### Q4: 모델 삭제하고 싶어요

```bash
# 모델 확인
ollama list

# 특정 모델 삭제
ollama rm llama2:7b

# 저장소 정리
rm -rf ~/.ollama/models
```

### Q5: 포트 변경하고 싶어요 (11434는 이미 사용 중)

```bash
# macOS/Linux
OLLAMA_PORT=11435 ollama serve

# Windows (PowerShell)
$env:OLLAMA_PORT = "11435"; ollama serve

# 또는 환경변수 설정 (.env 파일)
OLLAMA_PORT=11435
```

---

## 📊 성능 비교

### 모델별 성능 (Apple Silicon Mac 예시)

| 모델 | 크기 | 다운로드 | 응답 시간 | 추천 |
|------|------|---------|---------|------|
| mistral | 4.1GB | 5분 | 1초 | ⭐⭐⭐ (빠름) |
| llama2:7b | 3.8GB | 5분 | 1-2초 | ⭐⭐⭐⭐ (균형) |
| llama2:13b | 7.4GB | 10분 | 3-4초 | ⭐⭐ (느림) |

### 개발팀 권장 설정

```bash
# Step 1: 빠른 테스트 (처음)
ollama pull mistral

# Step 2: 메인 모델 (개발 중)
ollama pull llama2:7b

# Step 3: 고급 기능 (필요시)
ollama pull llama2:13b  # 또는 다른 모델
```

---

## 📝 팀 공유 체크리스트

```bash
□ Ollama 설치 완료
  □ ollama --version 실행됨
  
□ 모델 다운로드 완료
  □ ollama list에서 [MODEL_NAME] 확인
  
□ 테스트 완료
  □ ollama run [MODEL_NAME]에서 응답 확인
  □ 응답 시간: ___ 초 (기록)
  
□ VS Code 통합 (선택)
  □ Continue.dev 또는 Ollama Extension 설치
  □ http://localhost:11434 연결 확인
  
□ 성능 기록
  □ 사용 모델: [MODEL_NAME]
  □ 응답 시간: ___ 초
  □ GPU 사용: [ ] Yes [ ] No
  □ OS: [macOS/Windows/Linux]
  □ CPU/GPU: _______________
```

---

## 🎯 개발팀 표준 설정 (권장)

```bash
# [PROJECT_NAME] 팀 공식 설정

모델: llama2:7b
포트: 11434
저장소: ~/.ollama/models

설치 명령:
  ollama pull llama2:7b

테스트 명령:
  ollama run llama2:7b "Hello, test."

응답 시간 목표: 1-2초 (M1 Mac 기준)
```

> **TODO**: 팀 합의 후 위 설정을 프로젝트의 CLAUDE.md에 추가

---

## 🔗 참고 자료

- [Ollama 공식 사이트](https://ollama.ai)
- [Ollama GitHub](https://github.com/jmorganca/ollama)
- [Ollama 모델 라이브러리](https://ollama.ai/library)
- [Apple Silicon 최적화 가이드](https://github.com/jmorganca/ollama/discussions/1051)

---

## 📞 도움말

문제가 발생하면:

1. 위의 "트러블슈팅" 참고
2. [TROUBLESHOOTING_TEMPLATE.md](../TROUBLESHOOTING_TEMPLATE.md) 확인
3. 팀 리더에게 문의
4. [Ollama GitHub Issues](https://github.com/jmorganca/ollama/issues) 검색

---

**다음 단계:**
- 설치 완료 후 [ZEN_A4_SETUP_TEMPLATE.md](./ZEN_A4_SETUP_TEMPLATE.md)로 이동
- 또는 [DOCKER_COMPOSE_OLLAMA_TEMPLATE.md](./DOCKER_COMPOSE_OLLAMA_TEMPLATE.md) (배포 환경)

**설치자:** [YOUR_NAME]  
**완료일:** 2026-04-XX  
**버전:** 1.0
