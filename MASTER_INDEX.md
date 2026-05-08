# 🌐 ZENITH_LMS 통합 문서 마스터 인덱스 (MASTER_INDEX)

항공·해운·통관·택배를 아우르는 차세대 지능형 통합 물류 관리 플랫폼, **ZENITH_LMS**의 모든 기술 및 업무 문서를 집대성한 인덱스입니다.

---

## 📋 [00] 가이드 및 거버넌스 (Guides & Governance)
프로젝트 운영 표준, 에이전트 규정 및 개발 방법론입니다.

| 분류 | 문서명 | 상세 내용 |
| :--- | :--- | :--- |
| **운영 규정** | [GEMINI.md](./GEMINI.md) | Gemini 에이전트의 작업 원칙, R-01~R-14 규정 및 커밋 규칙 |
| **에이전트 가이드** | [CLAUDE.md](./CLAUDE.md) | Claude 에이전트의 개발 지침 및 환경 설정 |
| **개발 방법론** | [ZEN_A4_METHODOLOGY.md](docs/00_GUIDE/101_ZEN_A4_METHODOLOGY.md) | GSD Hybrid 방식의 4단계(Plan-Execute-Audit-Deliver) 프로세스 |
| **도메인 지식** | [DOMAIN_KNOWLEDGE.md](docs/00_GUIDE/105_DOMAIN_KNOWLEDGE.md) | **Source of Truth**: 물류 도메인 용어, 비즈니스 로직 및 프로세스 정의 |
| **문서 거버넌스** | [DOCS_AND_SCRIPT_GOVERNANCE.md](docs/00_GUIDE/206_DOCS_AND_SCRIPT_GOVERNANCE.md) | 파일 명명 규칙, 문서 트리 구조 및 아카이빙 정책 |

---

## 🔍 [02] 요구사항 및 기능 분석 (Requirements)
비즈니스 요구사항을 기술적으로 정의한 기능 명세서입니다.

### 📦 모듈별 상세 기능 정의서 (Functional Details)
- [Fun_Detail_01_로그인_인증.md](docs/02_Analysis/Fun_Detail_01_로그인_인증.md): 계정 관리 및 MFA 인증
- [Fun_Detail_02_회원관리.md](docs/02_Analysis/Fun_Detail_02_회원관리.md): 조직/법인/사용자 관리 및 권한 승인
- [Fun_Detail_03_오더관리.md](docs/02_Analysis/Fun_Detail_03_오더관리.md): 화물 접수 및 B2B/B2C 분기 로직
- [Fun_Detail_04_마스터오더관리.md](docs/02_Analysis/Fun_Detail_04_마스터오더관리.md): 운송 단위 그룹화(Consolidation) 로직
- [Fun_Detail_05_창고관리.md](docs/02_Analysis/Fun_Detail_05_창고관리.md): 입고/출고 스캔 및 재고 트래킹
- [Fun_Detail_06_운송_Tracking.md](docs/02_Analysis/Fun_Detail_06_운송_Tracking.md): 실시간 위치 및 마일스톤 업데이트
- [Fun_Detail_07_회계_청구.md](docs/02_Analysis/Fun_Detail_07_회계_청구.md): 운임 자동 계산 및 세금계산서 발행
- [Fun_Detail_08_VOC_관리.md](docs/02_Analysis/Fun_Detail_08_VOC_관리.md): 1:1 문의 및 오더 QnA 시스템
- [Fun_Detail_09_시스템관리.md](docs/02_Analysis/Fun_Detail_09_시스템관리.md): 코드 관리, 환율 및 시스템 설정
- [Fun_Detail_10_고객지원.md](docs/02_Analysis/Fun_Detail_10_고객지원.md): 공지사항 및 도움말 관리

---

## 🎨 [03] 시스템 설계 및 API 명세 (Design & Architecture)
시스템 아키텍처와 기술적 설계서입니다.

| 분류 | 문서명 | 상세 내용 |
| :--- | :--- | :--- |
| **API 명세** | [Ds_11_API_상세_명세서.md](docs/03_Design/Ds_11_API_상세_명세서.md) | **API First**: 전체 모듈 통합 API 규격 및 입출력 정의 |
| **UI 설계** | [Ds_01_화면설계_공통_컴포넌트.md](docs/03_Design/Ds_01_화면설계_공통_컴포넌트.md) | 공통 UI 컴포넌트 및 레이아웃 가이드 |
| **인증 보안** | [302_AUTH_GUARD_ARCHITECTURE.md](docs/03_Design/302_AUTH_GUARD_ARCHITECTURE.md) | Next.js Middleware 기반 권한 제어 엔진 설계 |
| **데이터 모델** | [An_01_데이터사전.md](docs/02_Analysis/An_01_데이터사전.md) | 전역 데이터 엔티티 및 컬럼 정의서 |

---

## ✅ [08] 자가 감사 및 품질 관리 (Quality Assurance)
품질 확보를 위한 검증 결과 및 이슈 해결 기록입니다.

- **회귀 테스트**: [LIVE_REGRESSION_TEST_MAP.md](docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md) (전체 기능 성공 여부 추적)
- **수행 보고서 (Walkthroughs)**:
    - [PH14_E2E05_정산_프로세스.md](docs/08_Self_Audit/Walkthroughs/PH14_E2E05_SETTLEMENT.md)
    - [PH14_E2E09_등급_승격_워크플로우.md](docs/08_Self_Audit/Walkthroughs/PH14_E2E09_GRADE_PROMOTION.md)
    - [PH14_E2E11_오더_문의_대화.md](docs/08_Self_Audit/Walkthroughs/PH14_E2E11_ORDER_QNA.md)
- **장애 보고서 (SAR)**: [SAR_reports/](docs/08_Self_Audit/SAR_reports/) (원인 분석 및 재발 방지 대책)

---

## 🧪 [99] 매뉴얼 및 E2E 결과 증적 (Manuals & Evidence)
최종 사용자를 위한 매뉴얼과 E2E 테스트 결과물입니다.

- **사용자 매뉴얼**: [MANUAL_USER.md](docs/99_Manual/MANUAL_USER.md) (화주용 가이드)
- **운영자 매뉴얼**: [MANUAL_OPER.md](docs/99_Manual/MANUAL_OPER.md) (관리자용 가이드)
- **E2E 테스트 결과**: [docs/99_Manual/](docs/99_Manual/) 폴더 내 `E2E_NN_Result` 서브 폴더 참조 (스크린샷 및 로그)

## 🏁 [97] 최종 결과물 및 보고서 (Final Deliverables)
최종 프로젝트 산출물 및 종합 보고서입니다.

- [Zenith_LMS_방법론_종합_리뷰_보고서(Riley).md](docs/97_Final/Zenith_LMS_방법론_종합_리뷰_보고서(Riley).md): 방법론, 에이전트 협업, 거버넌스 운영 성과 분석 보고서

---
© 2026 ZENITH_LMS Team. All rights reserved.
