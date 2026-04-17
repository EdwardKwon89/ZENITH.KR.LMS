# Project: ZENITH_LMS (SNTL 통합 물류 플랫폼)

## 1. 개요
- **이름**: ZENITH_LMS (Logistics Management System)
- **성격**: 항공·해운·통관·택배를 아우르는 차세대 통합 물류 관리 플랫폼
- **상태**: Phase 1 기반 구축 진행 중 (Audit 결과: 설계 100%, 구현 0% 지점에서 회복 시작)
- **목표**: 2026-04-17 기준, 누락된 Supabase 스키마 배포 및 초기 데이터 로드 완료

## 2. 핵심 기능 모듈 (10 Modules)
상세 분석 문서(`docs/02_Analysis/Fun_Detail_xx.md`)에 정의된 10개 핵심 모듈입니다.
1. **로그인/인증**: SSO 지원 예정, 권한 기반 접근 제어
2. **회원관리**: 개인/법인 회원 및 관리자 체계
3. **오더관리**: B2B/B2C 오더 접수 및 상태 추적
4. **마스터오더관리**: 대량 오더 그룹화 및 B/L 단위 관리
5. **창고관리**: 입출고, 재고, MinIO 연동 파일 관리
6. **운송/Tracking**: 실시간 API 연계 및 위치 정보 제공
7. **회계/청구**: 자동 청구서 생성 및 수입/비용 분석
8. **VOC 관리**: 고객 불만 및 문의 처리 자동화
9. **시스템관리**: 공통 코드, 메뉴, 권한, 기초 데이터 관리
10. **고객지원**: 공지사항, FAQ, 1:1 상담

## 3. 기술 스택 (Confirmed)
- **Frontend**: Next.js (App Router), Vanilla CSS (Glassmorphism UX)
- **Backend**: Node.js / PostgreSQL / MinIO (스토리지)
- **Infrastructure**: Vercel (Frontend), Docker Compose (Backend/Services)
- **AI Methodology**: ZEN_A4 (GSD Hybrid), `rtk` Proxy

## 4. 운영 정책
- **코드 스타일**: 불변성 우선, 함수 50줄/파일 800줄 이하 준수
- **품질 관리**: Phase별 Self Check/Test 필수, 테스트 커버리지 80% 목표
- **에이전트 규정**: [GEMINI.md](GEMINI.md) 및 [CLAUDE.md](CLAUDE.md) 준수

---
*Last Updated: 2026-04-16*
