# ✅ LIVE Phase 2: 구현 체크리스트 (Cumulative Execute Checklist)

> **프로젝트:** ZENITH_LMS  
> **상태:** [ACTIVE] - 프로젝트 전역 공통 적용 및 축적 중

---

## 📌 목적
구현 단계에서 발생할 수 있는 휴먼 에러를 방지하고, 코드의 무결성을 보장합니다.

---

## ✅ [Core] 기본 구현 항목

### 1. 코드 품질 및 로직
- [ ] Null Check: 모든 외부 API 및 DB 응답에 대한 검증이 이루어졌는가?
- [ ] Error Handling: 모든 예외 상황에 대한 `try-catch` 및 로깅이 적용되었는가?
- [ ] 가독성: 함수는 50줄 이내, 파일은 800~1,000줄 이내를 유지하는가?

### 2. 테스트 및 커버리지
- [ ] 유닛 테스트가 작성되었으며 통과하는가?
- [ ] 커버리지가 80% 이상을 달성했는가?
- [ ] Edge Case 및 에러 케이스에 대한 테스트가 포함되었는가?

---

## 🛡️ [Vault] 축적된 오류 방지 항목 (Added from SARs)

> [!IMPORTANT]
> **이 섹션은 우리의 실패가 자산으로 변한 결과물입니다.**

- [ ] **[SAR-2026-04-19-001] i18n Path Integrity**: 모든 리다이렉트 및 링크가 로케일 접두사(예: `/ko`, `/en`)를 포함하거나 감지하는 로직을 거치는가?
- [ ] **[SAR-2026-04-19-001] Redirect Guard**: 인증 및 상태 변경 가드 로직이 다국어 경로 이탈 없이 올바른 대상지로 안내하는가?
- [ ] **[SAR-2026-04-19-003] Server Action Redirect Guard**: 서버 액션의 `redirect()` 출력 신호를 클라이언트 `catch` 블록에서 필터링하여 사용자에게 기술적 메시지(NEXT_REDIRECT)가 노출되지 않도록 조치했는가?
- [ ] **[SAR-2026-04-19-004] Next.js 16.2.4 Proxy Convention**: `middleware.ts` 대신 `proxy.ts`를 사용하고 있는가? 또한 내부 함수명이 `export async function proxy()`로 정확히 익스포트되었는가? (엔트리 포인트 매핑 보장)
- [ ] **[SAR-2026-04-19-004] Infrastructure Cache Integrity**: 핵심 인프라 파일명/경로 변경 시 반드시 `.next` 캐시 삭제 및 서버 재시작을 수행했는가? (유령 모듈 에러 방지)

- [ ] **[SAR-2026-04-19-001] Navigation Hook Guard**: App Router 환경에서 `useRouter` 사용 시 `next/navigation` 임포트 및 컴포넌트 내 상수 정의 여부 확인.
- [ ] **[SAR-2026-04-18-001] Step-Form Integrity**: 다단계 폼(Multi-step) 개발 시 모든 상태(`SignupStep` 등)에 대응하는 렌더링 블록(`switch/if`)이 존재하는가?
- [ ] **[SAR-2026-04-18-001] Hydration Defense**: 브라우저 에이전트 도구와의 충돌 방지를 위해 `<body>` 등에 `suppressHydrationWarning` 속성이 필요한지 검토했는가?
- [ ] **[SAR-2026-04-18-001] Header Fidelity Logic**: `mergeHeaders` 함수를 사용하여 쿠키 보안 속성(Path, HttpOnly)이 유실 없이 전파되는가?

---

## 📊 점검 기록 (Audit Summary)

| 점검일 | 기능명/버전 | 수행자 | 결과 | 로그 링크 |
|--------|------------|--------|------|----------|
|        |            |        |      | [Link]   |

---
**작성 가이드:**
1. 작업 완료 전 이 `LIVE` 문서를 전수 체크하십시오.
2. 발견된 버그의 예방책은 반드시 **[Vault]** 섹션에 영구히 추가하십시오.
