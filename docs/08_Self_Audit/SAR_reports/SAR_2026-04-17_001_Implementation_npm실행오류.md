---
name: npm 명령어 경로 미설정으로 인한 실행 실패
description: npm install 실행 시 'command not found' 오류 발생
category: Implementation
severity: MEDIUM
date: 2026-04-17
author: Antigravity
---

## 현상 (What)

Next.js 프로젝트에 `next-intl` 라이브러리를 추가하기 위해 `npm install next-intl` 명령을 실행했으나, `zsh:1: command not found: npm` 오류와 함께 작업이 중단됨.

**발생 위치:** 터미널 명령 실행 시
**오류 메시지:** `zsh:1: command not found: npm`

## 원인 (Why)

### 직접적 원인
현재 쉘 환경의 `PATH` 변수에 `npm` 바이너리 경로가 포함되어 있지 않음.

### 근본 원인
에이전트 환경의 기본 `PATH` 설정이 로컬 개발 환경(Homebrew 경로 등)과 동기화되어 있지 않아 표준 위치에 없는 라이브러리 실행에 실패함.

### 기여 요소
- `which npm` 등을 통한 환경 사전 점검 과정 누락.
- `package-lock.json` 존재 여부만으로 패키지 매니저가 정상 작동할 것이라 자가 판단함.

## 조치 (How)

### 수정 전
```bash
npm install next-intl
```

### 수정 후
환경 변수 조정을 시도하거나, 라이브러리 설치 없이 설정을 먼저 진행함. (실제로는 설치를 보류하고 파일 구조 설계를 선행함)

### 수정 범위
- [ ] 해당 함수만 수정
- [ ] 유사 함수들도 동일 패턴 적용
- [ ] 테스트 코드 추가
- [x] 문서 업데이트 (체크리스트 반영)

## 검증 (Verification)

### 테스트
`ls -F /opt/homebrew/bin/npm` 명령을 통해 실제 바이너리 위치를 확인했으며, 추후 전체 경로를 사용하거나 환경 설정을 요청해야 함을 인지함.

## 예방 (Prevention)

### Check List에 추가할 항목
```
□ Environment Check: 외부 명령 실행 전 `which <cmd>`를 통해 실행 가능 여부 확인 필수 (SAR-001)
□ Tool Validation: `package.json` 존재 시에도 실제 패키지 매니저 작동 여부 사전 검증 (SAR-001)
```

### 팀 공유
- 에이전트 환경에서 Homebrew 경로(`/opt/homebrew/bin`)가 누락될 수 있으므로 주의 필요.
