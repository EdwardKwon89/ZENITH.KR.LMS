# [INDEX] 자가 감사 보고서 통합 인덱스 (SAR INDEX)

> **프로젝트:** ZENITH_LMS
> **위치:** `docs/08_Self_Audit/SAR_reports/`
> **목적:** 기술적 부채, 장애 상황, 설계 혼선에 대한 기록 및 교훈의 통합 관리

이 문서는 제니스 프로젝트 진행 중 발생한 코드 결함, 환경 설정 오류, 설계 일관성 부족 등의 이슈와 그에 대한 재발 방지 대책을 집계합니다. 모든 팀원은 작업 시작 전 관련 카테고리의 SAR을 검토하여 동일 오류를 예방해야 합니다.

## 📊 SAR 현황 요약 (Summary)

| 날짜 | ID | 제목 (Title) | 카테고리 | 심각도 | 링크 (Link) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-04-20 | **003** | 권한 가드-미들웨어 상충 및 참조 오류 | Auth/Middleware | HIGH | [상세보기](./SAR_2026-04-20_003_Auth_Middleware_Conflict.md) |
| 2026-04-20 | **002** | Proxy-Middleware 설계 혼선 및 루프 장애 | Design | CRITICAL | [상세보기](./SAR_2026-04-20_002_Design_Proxy_Middleware_Conflict.md) |
| 2026-04-20 | **001** | npm 명령어 미인식 및 PATH 누락 오류 | Environment | HIGH | [상세보기](./SAR_2026-04-20_001_Other_NPM_PATH_Error.md) |
| 2026-04-19 | **004** | Ghost Module Dependency (Next.js 16.2.4) | Middleware | HIGH | [상세보기](./SAR_2026-04-19_004_Ghost_Module_Dependency.md) |
| 2026-04-19 | **003** | Server Action Redirect Exposure | Security | CRITICAL | [상세보기](./SAR_2026-04-19_003_Auth_NextRedirect_Exposure.md) |
| 2026-04-19 | **002** | 개인 권한 설정 이슈 (Permission) | Permission | HIGH | [상세보기](./SAR_2026-04-19_002_Personal_Perm_Issue.md) |
| 2026-04-19 | **001** | Router Undefined 에러 | Router | HIGH | [상세보기](./SAR_2026-04-19_001_Router_Undefined.md) |
| 2026-04-19 | **001** | Middleware Naming Error & Login Loop | Middleware | HIGH | [상세보기](./SAR_2026-04-19_001_Middleware_Naming_Error.md) |
| 2026-04-19 | **001** | Auth i18n Redirect Loop | Auth/i18n | CRITICAL | [상세보기](./SAR_2026-04-19_001_Auth_i18n_Redirect_Loop.md) |
| 2026-04-18 | **001** | Middleware Redirect Loop | Middleware | CRITICAL | [상세보기](./SAR_2026-04-18_001_Middleware_Redirect_Loop.md) |
| 2026-04-18 | **001** | Middleware Loop Regression | Middleware | CRITICAL | [상세보기](./SAR_2026-04-18_001_Middleware_Loop_Regression.md) |
| 2026-04-18 | **001** | 회원가입 UI 단계 누락 및 하이드레이션 오류 | Auth/UI | HIGH | [상세보기](./SAR_2026-04-18_001_Auth_UI_Logic_Error.md) |
| 2026-04-18 | **002** | 회원가입 완료 후 Locale 리다이렉션 누락 | Auth | HIGH | [상세보기](./SAR_2026-04-18-002_Auth_Redirection_Bug.md) |
| 2026-04-17 | **003** | 작업 완료 보고 정합성 불일치 | Quality | HIGH | [상세보기](./SAR_2026-04-17_003_Quality_Implementation_Consistency_Error.md) |
| 2026-04-17 | **002** | 설계 문서 간 명칭 및 번호 체계 불일치 | Documentation | MEDIUM | [상세보기](./SAR_2026-04-17_002_Documentation_DesignConsistency.md) |
| 2026-04-17 | **002** | 조직 계층 구조 설계 누락 | Design | CRITICAL | [상세보기](./SAR_2026-04-17_002_Design_Org_Hierarchy_Missing.md) |
| 2026-04-17 | **001** | NPM 실행 오류 (Installation) | Implementation | HIGH | [상세보기](./SAR_2026-04-17_001_Implementation_NPM_Install_Error.md) |
| 2026-04-08 | **001** | Documentation_ReadmeLinkErrors | Documentation | HIGH | [상세보기](./SAR_2026-04-08_001_Documentation_ReadmeLinkErrors.md) |

---
*본 인덱스는 Antigravity CIO Agent에 의해 매 장애 발생 시 자동으로 업데이트됩니다.*
