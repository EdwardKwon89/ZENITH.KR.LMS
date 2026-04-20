---
name: Ghost Module Dependency (Next.js 16.2.4 Proxy Convention)
description: Next.js 16.2.4의 middleware.ts -> proxy.ts 컨벤션 전환으로 인한 모듈 매핑 오류 및 빌드 중단 해결
category: Integration
severity: CRITICAL
date: 2026-04-19
author: Antigravity (AI Agent)
---

## 현상 (What)

시스템 가동 시 `middleware.ts`가 존재함에도 불구하고, 넥스트JS 런타임이 `src/proxy.ts`를 찾으며 `Module Not Found` 에러를 발생시키고 빌드가 중단됨.

**발생 위치:** `src/proxy.ts` (Entry Point Mapping)
**오류 메시지:** 
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
Could not parse module '[project]/src/proxy.ts', file not found
```

## 원인 (Why)

### 직접적 원인
- `src/middleware.ts` 파일은 존재하나, Next.js 16.2.4(Turbopack) 엔진이 이를 무시하고 `src/proxy.ts`를 엔트리 파일로 강제함.

### 근본 원인 (Root Cause)
- **Next.js 16.2.4 버전의 파괴적 변경(Breaking Change)**: `middleware.ts` 컨벤션이 공식적으로 Deprecated 되었으며, 새로운 표준인 `proxy.ts`를 사용하지 않을 경우 엔트리 포인트를 찾지 못함. 
- **지식 미흡**: 기존 `middleware.ts`가 정석이라는 고정관념으로 인해 엔진의 경고를 '캐시 오류'로 오판함.

### 기여 요소
- 다국어 처리(`next-intl`) 로직이 `middleware.ts` 시절의 설정을 유지하고 있었음.
- 로컬 환경의 캐시 지연 현상이 겹치면서 원인 파악에 혼선 발생.

## 조치 (How)

### 수정 전
- 파일명: `src/middleware.ts`
- 익스포트 함수: `export async function middleware(...)`

### 수정 후
- 파일명: **`src/proxy.ts`** (파일 이동 완료)
- 익스포트 함수: **`export async function proxy(...)`** (함수명 보정 완료)
- 빌드 에러 부가 조치:
  - `ZenButton`에 `loading` 프로퍼티 추가 (Type Error 해결)
  - `RatesManagementPage`에 `Calendar` 아이콘 임포트 추가
  - `PendingPage`에 `useParams`를 통한 `locale` 변수 정의

### 수정 범위
- [x] 프레임워크 컨벤션 동기화 (`middleware` -> `proxy`)
- [x] 전역 미들웨어 함수명 변경
- [x] 관련 페이지 및 컴포넌트 빌드 에러 6개소 수리
- [x] 전체 빌드(npm run build) 완결 검증

## 검증 (Verification)

### 테스트
```bash
rtk npm run build
```

### 결과
```
▲ Next.js 16.2.4 (Turbopack)
✓ Compiled successfully in 3.4s
✓ Finished TypeScript in 3.6s
✓ Finalizing page optimization ...
Exit code: 0
```

## 예방 (Prevention)

### Check List에 추가할 항목
```
□ Next.js 16.2.4+ 환경 확인: middleware.ts 대신 proxy.ts 사용 여부 (SAR-2026-04-19-004)
□ 전역 프록시 함수명: export async function proxy() 익스포트 여부
□ 빌드 전수 검토: npm run build를 통한 엔트리 포인트 정합성 확인
```

### 설계 개선
- `PROJECT.md`에 프레임워크 버전 특이사항(Next.js 16.2.4 Proxy convention) 명시.
- 라이브러리(`next-intl`)와 프레임워크 간의 접점을 `proxy.ts`로 단일화.

---
