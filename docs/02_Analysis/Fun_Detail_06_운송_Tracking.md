# 상세 기능 정의서: 06. 운송 Tracking

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** An-16
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-16
> **버전:** v1.0

# 6. 운송 Tracking
**설명**: 항운(AIR)·해운(SEA)·택배(CIR) 운송 현황 및 통관 신고 결과를 조회하는 기능.
**Phase**: Phase 3

## 6.1 항운(AIR) Tracking
**설명**: 항공 화물의 실시간 운송 현황을 추적.
**Phase**: Phase 3

### 6.1.1 Tracking 정보 조회
**상세**: 오더별 항공 화물 Tracking 번호·상태·현재위치·최종갱신일시를 조회. (상태 예: Booked → Departed → In Transit → Arrived → Delivered)
**권한**: 회원/운영자/관리자
**Phase**: Phase 3

### 6.1.2 Tracking 정보 갱신
**상세**: 외부 항공사 Tracking API를 호출하여 최신 운송 상태를 업데이트. 자동 갱신(배치) 및 수동 갱신 모두 지원. API 응답 원본을 raw_data에 저장. (비고: 연동 외부 API 추후 확정)
**권한**: 시스템/관리자
**Phase**: Phase 3

## 6.2 해운(SEA) Tracking
**설명**: 해운 화물의 선박 운송 현황을 추적.
**Phase**: Phase 3

### 6.2.1 Tracking 정보 조회
**상세**: 오더별 해운 Tracking 번호(B/L번호)·상태·현재위치·최종갱신일시 조회. (상태 예: Loaded → Departed → On Board → Arrived → Unloaded)
**권한**: 회원/운영자/관리자
**Phase**: Phase 3

### 6.2.2 Tracking 정보 갱신
**상세**: 외부 선사 Tracking API를 호출하여 최신 운송 상태 업데이트. 자동 갱신(배치) 및 수동 갱신 지원. (비고: 연동 외부 API 추후 확정)
**권한**: 시스템/관리자
**Phase**: Phase 3

## 6.3 택배(CIR) Tracking
**설명**: 국제 택배 운송 현황을 추적.
**Phase**: Phase 3

### 6.3.1 Tracking 정보 조회
**상세**: 오더별 택배 운송장번호·상태·현재위치·최종갱신일시 조회.
**권한**: 회원/운영자/관리자
**Phase**: Phase 3

### 6.3.2 Tracking 정보 갱신
**상세**: 택배사 Tracking API를 호출하여 최신 배송 상태 업데이트. (비고: 연동 외부 API 추후 확정)
**권한**: 시스템/관리자
**Phase**: Phase 3

## 6.4 통관신고 관리
**설명**: 통관(CCL) 서비스 연계 통관 신고 및 결과 관리.
**Phase**: Phase 3

### 6.4.1 통관신고 결과 조회
**상세**: 통관 신고번호·신고상태·신고일시·결과수신일시를 조회. 통관 완료 여부를 오더 단위로 확인 가능.
**권한**: 회원/운영자/관리자
**Phase**: Phase 3

### 6.4.2 마스터오더 Tracking
**권한**: 운영자/관리자
**Phase**: Phase 3

---

## 📝 개정 이력 (Revision History)

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-16 | Antigravity | 초기 분석 설계 문서 생성 (운송 Tracking 상세 정의) |
