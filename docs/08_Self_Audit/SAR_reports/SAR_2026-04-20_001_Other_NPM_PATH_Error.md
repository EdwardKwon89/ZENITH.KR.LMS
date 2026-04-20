---
name: npm 명령어 미인식 및 PATH 누락 오류
description: 빌드 검증 단계에서 npm 명령어를 인식하지 못하여 작업 지연 발생
category: Other
severity: HIGH
date: 2026-04-20
author: Antigravity
---

## 현상 (What)

Phase 2.1 작업 완료 후 빌드 검증(`npm run build`)을 시도했으나, 시스템이 `npm` 명령어를 인식하지 못함 (Exit code 127).

**발생 위치:** 터미널 실행 시점
**오류 메시지:** `zsh:1: command not found: npm`

## 원인 (Why)

### 직접적 원인
에이전트 세션의 환경 변수(PATH)에 Node.js 실행 경로가 포함되지 않음.

### 근본 원인
`GEMINI.md`의 **[R-02: 세션 초기화 필수 절차]**인 `export PATH=$PATH:/opt/homebrew/bin` 실행을 누락함. 에이전트가 새 세션 시작 시 환경 동기화를 완료하지 않은 채 바로 집행에 착수함.

### 기여 요소
- `rtk` 도구 활용에만 집중하여 기본 터미널 환경의 영속성 부재를 간과함.
- 수동 확인 절차 없이 바로 복합 명령어를 실행함.

## 조치 (How)

### 수정 전
```bash
npm run build
```

### 수정 후
```bash
export PATH=$PATH:/opt/homebrew/bin && npm run build
```

### 수정 범위
- [x] 현재 세션 PATH 설정 복구
- [x] 빌드 재시도 및 성공 확인
- [ ] 에이전트 초기화 스크립트(Hook) 검토

## 검증 (Verification)

### 테스트
```bash
export PATH=$PATH:/opt/homebrew/bin && npm run build
```

### 결과
`✓ Compiled successfully` - 프로덕션 빌드 성공 확인.

## 예방 (Prevention)

### Check List에 추가할 항목
```
□ Environment: 작업 시작 전 PATH 설정 및 도구 접근성 확인 (SAR-2026-04-20-001)
□ Environment: rtk supabase login 등 세션 초기화 상태 확인 (SAR-2026-04-20-001)
```

### 설계 개선
- 에이전트의 모든 `run_command` 호출 시 PATH 접두어를 자동으로 붙이거나 초기화 여부를 선행 점검하는 로직 제안.

### 팀 공유
- `GEMINI.md` 규정 v1.3(R-02)의 엄격한 준수 강조.
