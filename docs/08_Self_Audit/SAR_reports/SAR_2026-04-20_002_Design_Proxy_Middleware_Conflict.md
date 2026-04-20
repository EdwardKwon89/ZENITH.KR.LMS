---
name: Proxy-Middleware 설계 혼선 및 리다이렉트 장애 종합 보고서
description: Next.js 16.2.4 컨벤션 변화 및 경로 정합성 오류로 인한 복합 장애 분석
category: Design
severity: CRITICAL
date: 2026-04-20
author: Antigravity (AI Agent)
SAR_ID: SAR-2026-04-20-002
---

## 현상 (What)

프로젝트 초기 가동 및 가입 승인 로직 적용 시 다음 두 가지 치명적 현상이 교차 발생함:
1. **커스텀 프록시 미인식**: `middleware.ts`를 사용했을 때 Next.js 엔진이 이를 감지하지 못하고 `src/proxy.ts` 부재 에러를 내며 빌드 중단.
2. **무한 리다이렉션 루프**: PENDING 상태 사용자가 `/ko/login`으로 접속 시, 미들웨어에서 실제 파일 경로(`/register/pending`)와 설정 경로(`/pending`)를 오판하여 무한 재시도 발생.

## 원인 (Why)

### 근본 원인 (Root Cause)
- **프레임워크 컨벤션 드리프트**: Next.js 16.2.4(Turbopack)에서 도입된 `proxy.ts` 표준을 에이전트가 초기에 인지하지 못함 (지식의 파편화).
- **경로 가상화 오판**: `routes.ts`에 정의된 추상화된 경로와 Next.js App Router의 물리적 파일 시스템 경로 사이의 **[정합성 검증 부재]**.

### 기여 요소
- **재귀적 가드 설계 결함**: 미들웨어에서 예외 처리 경로(Whitelist)를 체크할 때, `Request.url`의 절대 경로와 프로젝트의 상대 경로를 혼용함.

## 조치 (How)

### 1. 엔트리 포인트 표준화
- `src/middleware.ts`를 `src/proxy.ts`로 영구 이동하고, `export async function proxy()`를 공식 엔트리로 선언.

### 2. 리다이렉트 로직 보정
- `PURE_PATH` 추출 로직을 강화하고, 리다이렉트 타겟 결정 시 반드시 `routes.ts` 상수를 거치도록 강제.

## 예방 (Prevention)

### Check List에 추가할 항목 (SAR-2026-04-20-002)
- [ ] **Next.js 16.2.4+ 규격**: `src/proxy.ts` 엔트리 포인트 유효성 검증 필수.
- [ ] **Physical Route Check**: 미들웨어 리다이렉트 대상이 실제 `src/app/` 하위에 물리적으로 존재하는지 `ls` 명령어로 확인.
- [ ] **Loop Guard**: 모든 리다이렉트 조건문에 `!purePath.startsWith(target)` 형식의 배타적 가드 포함.

## Audit Agent 확인
본 보고서는 과거의 혼란을 설계의 관점으로 통합하였으며, 재발 방지 대책이 기술적으로 유효함을 확인합니다.
