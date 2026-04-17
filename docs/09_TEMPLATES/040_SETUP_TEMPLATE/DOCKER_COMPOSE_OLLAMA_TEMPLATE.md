# 🐳 Docker Compose Ollama 가이드 (선택사항 - 배포용)

> **프로젝트:** [PROJECT_NAME]  
> **용도:** 팀 표준화 & CI/CD 배포  
> **전제조건:** Docker Desktop 설치 & Ollama 로컬 개발 완료  
> **예상 시간:** 20분

---

## 📌 개요

이 가이드는 **팀 전체가 동일한 환경으로 Ollama를 실행**하는 방법입니다.

### 언제 필요한가?

```
로컬 개발: Ollama 직접 설치 (OLLAMA_DIRECT_INSTALL_TEMPLATE.md)
   ↓ (필요할 때)
팀 협업/CI/CD: Docker Compose (이 가이드)
   ↓
클라우드 배포: Kubernetes (별도)
```

### 특징
- ✅ 팀 전체 동일 환경
- ✅ git에 버전 관리 가능
- ✅ CI/CD 파이프라인 통합
- ✅ 재현 가능한 배포
- ⚠️ Apple Silicon에서 CPU 모드만 지원 (개발용 아님)

---

## 🚀 빠른 시작 (3단계)

### Step 1: docker-compose.yml 생성

프로젝트 루트에 다음 파일을 생성하세요:

```yaml
# docker-compose.yml

version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    
    # GPU 지원 (NVIDIA만)
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    
    # 볼륨 (모델 저장)
    volumes:
      - ollama_data:/root/.ollama
    
    # 포트
    ports:
      - "11434:11434"
    
    # 환경 변수
    environment:
      OLLAMA_MODELS: /root/.ollama/models
    
    # 항상 재시작
    restart: unless-stopped

volumes:
  ollama_data:
    driver: local
```

### Step 2: 모델 다운로드 & 실행

```bash
# 이미지 다운로드
docker-compose pull

# 서비스 시작
docker-compose up -d

# 모델 다운로드 (컨테이너 내에서)
docker-compose exec ollama ollama pull llama2:7b

# 확인
docker-compose exec ollama ollama list
```

### Step 3: 테스트

```bash
# 방법 1: Docker에서 직접 테스트
docker-compose exec ollama ollama run llama2:7b "Hello"

# 방법 2: API로 테스트
curl http://localhost:11434/api/generate \
  -d '{"model":"llama2:7b","prompt":"Hello"}'

# 방법 3: Python에서
import requests
response = requests.post('http://localhost:11434/api/generate',
  json={'model':'llama2:7b','prompt':'Hello'})
```

---

## 📝 전체 설정 (상세)

### 기본 구성

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama_[PROJECT_NAME]
    
    ports:
      - "11434:11434"
    
    volumes:
      - ollama_data:/root/.ollama
    
    restart: unless-stopped
    
volumes:
  ollama_data:
```

### NVIDIA GPU 지원 (Linux)

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    
    volumes:
      - ollama_data:/root/.ollama
    
    ports:
      - "11434:11434"
    
    restart: unless-stopped
```

### AMD GPU 지원 (ROCm)

```yaml
services:
  ollama:
    image: ollama/ollama:rocm  # rocm 이미지 사용
    
    environment:
      OLLAMA_DEBUG: 1
    
    volumes:
      - ollama_data:/root/.ollama
    
    ports:
      - "11434:11434"
    
    restart: unless-stopped
```

### 다중 모델 (고급)

```yaml
version: '3.8'

services:
  ollama-fast:
    image: ollama/ollama:latest
    container_name: ollama_fast
    ports:
      - "11434:11434"
    volumes:
      - ollama_fast:/root/.ollama
    restart: unless-stopped
  
  ollama-powerful:
    image: ollama/ollama:latest
    container_name: ollama_powerful
    ports:
      - "11435:11434"
    volumes:
      - ollama_powerful:/root/.ollama
    restart: unless-stopped

volumes:
  ollama_fast:
  ollama_powerful:
```

---

## 🎯 팀 협업 설정

### Step 1: git에 추가

```bash
# 프로젝트 루트에 docker-compose.yml 저장
git add docker-compose.yml
git commit -m "infra: Add Docker Compose for Ollama"
git push
```

### Step 2: 팀원 설정 (모두 동일)

```bash
# 저장소 클론 (이미 되어 있음)
git clone [REPO_URL]
cd [PROJECT_NAME]

# 서비스 시작
docker-compose up -d

# 모델 다운로드
docker-compose exec ollama ollama pull llama2:7b

# 완료
docker-compose ps
```

### Step 3: 환경 변수 관리 (.env)

```bash
# .env 파일 생성
OLLAMA_MODEL=llama2:7b
OLLAMA_PORT=11434
OLLAMA_DEBUG=0

# docker-compose.yml에서 사용
environment:
  OLLAMA_MODEL: ${OLLAMA_MODEL:-llama2:7b}
  OLLAMA_PORT: ${OLLAMA_PORT:-11434}
```

---

## 💻 CI/CD 통합 (GitHub Actions)

### 자동 테스트

```yaml
# .github/workflows/test.yml

name: Test Ollama Models

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      ollama:
        image: ollama/ollama:latest
        options: >-
          --gpus all
        ports:
          - 11434:11434
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Pull model
        run: |
          docker exec $(docker ps -q) ollama pull llama2:7b
      
      - name: Test generate
        run: |
          curl http://localhost:11434/api/generate \
            -d '{"model":"llama2:7b","prompt":"test"}'
      
      - name: Run tests
        run: |
          python -m pytest tests/
```

---

## 🔧 명령어 모음

### 기본 명령

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 로그 확인
docker-compose logs -f

# 상태 확인
docker-compose ps

# 컨테이너 진입
docker-compose exec ollama bash
```

### 모델 관리

```bash
# 모델 다운로드
docker-compose exec ollama ollama pull [MODEL_NAME]

# 모델 목록
docker-compose exec ollama ollama list

# 모델 삭제
docker-compose exec ollama ollama rm [MODEL_NAME]

# 모델 실행
docker-compose exec ollama ollama run [MODEL_NAME] "[PROMPT]"
```

### API 호출

```bash
# 텍스트 생성
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2:7b",
    "prompt": "Why is the sky blue?",
    "stream": false
  }'

# 스트리밍 응답
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2:7b",
    "prompt": "Hello",
    "stream": true
  }' | jq .
```

---

## 🐛 트러블슈팅

### Q1: NVIDIA GPU가 인식 안 됨

```bash
# 원인: NVIDIA Container Toolkit 미설치

# 설치 (Ubuntu/Debian)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# 확인
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.6.2-base-ubuntu20.04 nvidia-smi
```

### Q2: "Cannot connect to Docker daemon"

```bash
# 원인: Docker Desktop 또는 Docker 데몬이 실행 안 됨

# 해결 1: Docker Desktop 시작 (Mac/Windows)
# 응용 프로그램 → Docker 실행

# 해결 2: Docker 서비스 시작 (Linux)
sudo systemctl start docker
sudo usermod -aG docker $USER

# 확인
docker ps
```

### Q3: 포트 11434가 이미 사용 중

```bash
# 원인: 로컬 Ollama가 이미 실행 중

# 해결 1: 로컬 Ollama 중지
ollama stop  # 없을 수 있음

# 해결 2: 포트 변경
# docker-compose.yml 수정
ports:
  - "11435:11434"  # 11435로 변경

# 해결 3: 실행 중인 프로세스 확인
lsof -i :11434  # macOS/Linux
netstat -ano | findstr :11434  # Windows
```

### Q4: 모델 다운로드가 느려요

```bash
# 해결 1: 더 작은 모델 사용
docker-compose exec ollama ollama pull mistral

# 해결 2: 다운로드 상태 확인
docker-compose logs -f

# 해결 3: 인터넷 대역폭 확인
# 모델 다운로드에 시간이 소요될 수 있음
```

---

## 📊 성능 비교

### 직접 설치 vs Docker

| 항목 | 직접 설치 | Docker |
|------|---------|--------|
| **응답 시간** | 1-2초 (GPU) | 3-5초 (컨테이너 오버헤드) |
| **메모리** | 최소 | +100-200MB |
| **설정** | 간단 | 중간 |
| **팀 협업** | 개별 관리 | 동일 환경 |
| **추천 용도** | 개발 | 배포/CI |

---

## 🎯 팀 협업 가이드

### 개발팀 권장 워크플로우

```
로컬 개발 (개발자 PC):
1. Ollama 직접 설치 (OLLAMA_DIRECT_INSTALL_TEMPLATE.md)
2. 빠른 반복 개발 & 테스트

팀 통합 테스트:
1. docker-compose up -d로 표준 환경 구성
2. 모든 팀원이 동일한 이미지 사용
3. 문제 발생시 재현 가능

배포:
1. CI/CD에서 자동으로 Docker 이미지 빌드
2. 프로덕션 환경에 배포
```

---

## 📋 팀 체크리스트

```bash
□ docker-compose.yml 생성 완료
  □ 파일 위치: [PROJECT_ROOT]/docker-compose.yml
  □ git에 추가됨

□ Docker Compose 실행 테스트
  □ docker-compose up -d 성공
  □ docker-compose ps에서 ollama 실행 중
  □ 포트 11434 정상 작동

□ 모델 다운로드 & 테스트
  □ docker-compose exec ollama ollama pull llama2:7b 완료
  □ API 테스트 성공
  
□ 팀원 모두 동일한 환경 확인
  □ 팀원 A: 완료
  □ 팀원 B: 완료
  □ 팀원 C: 완료

□ CI/CD 파이프라인 (선택)
  □ GitHub Actions 또는 GitLab CI 설정
  □ 자동 테스트 실행
```

---

## 🔗 참고 자료

- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [Ollama Docker 가이드](https://github.com/jmorganca/ollama/blob/main/docs/docker.md)
- [NVIDIA Container Toolkit](https://github.com/NVIDIA/nvidia-docker)

---

## 📌 주의사항

### ⚠️ Apple Silicon (Mac) 사용자

```
Docker에서 Ollama는 GPU 미지원!
→ CPU 모드만 가능 (5-6배 느림)

권장:
□ 개발: 로컬 Ollama 직접 설치 (Metal GPU)
□ 배포: Docker Compose (필요시)
```

### ⚠️ 포트 충돌

```
로컬 Ollama와 Docker 동시 실행 불가
→ 포트 변경 또는 하나만 실행
```

---

**다음 단계:**
- 로컬 개발: [OLLAMA_DIRECT_INSTALL_TEMPLATE.md](./OLLAMA_DIRECT_INSTALL_TEMPLATE.md)
- 자동화: [ZEN_A4_SETUP_TEMPLATE.md](./ZEN_A4_SETUP_TEMPLATE.md)

**작성자:** [TEAM_LEADER]  
**작성일:** 2026-04-XX  
**버전:** 1.0
