# TASK-B-022 — [Phase 8] UPS 실물 연동 사전 설계 리서치

> **TASK-ID**: TASK-B-022
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Phase 8 착수 결정 260624)
> **담당 Agent**: JSJung (팀 리더 직접 수행)
> **우선순위**: P1
> **관련 Issue**: [#97](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/97)
> **전제조건**: 없음
> **브랜치**: `feature/teamb-task-b-022-phase8-ups-research`
> **상태**: ⬜

---

## [업무 개요]

Phase 8 UPS 실물 연동 구현을 위한 사전 설계 리서치를 수행합니다.
WBS P7-SPR-04에 기등재된 "Phase 8 사전 설계 리서치 (UPS 실물 연동 스펙)" 항목 이행.

**배경**:
- IBC/Pactrak Interface(IMP-115) 영구 제외 (Edward 지시 260617)
- UPS 실물 연동(레이블 발급·트래킹·인보이스)을 UAT 전 우선 개발하기로 결정 (260624)
- API: 실 API 사용 확정 (Spec 동일, IP·Key값만 환경별 상이) (Edward 확인 260624)

---

## [리서치 범위]

### 1. 레이블 발급 (UPS Label API)

| 항목 | 조사 내용 |
|:----|:---------|
| Endpoint | 발급 URL, HTTP Method, Content-Type |
| Request payload | 송하인·수하인 정보, 패키지 정보, 서비스 코드 |
| Response | 레이블 데이터 형식 (ZPL/PNG/PDF), 운송장번호 포함 여부 |
| 오류 처리 | 발급 실패 시 재시도 정책, 번호 폐기 절차 |
| 환경 분리 | 테스트 IP/Key vs 실 IP/Key 파라미터 구조 |

### 2. 트래킹 폴링 (UPS Tracking API)

| 항목 | 조사 내용 |
|:----|:---------|
| Endpoint | 조회 URL, 인증 방식 |
| Request | 운송장번호 기반 조회 파라미터 |
| Response | 이벤트 구조 (상태코드, 위치, 타임스탬프) |
| 폴링 전략 | 권장 폴링 주기, Rate Limit |

### 3. 인보이스 (UPS Invoice/Customs API)

| 항목 | 조사 내용 |
|:----|:---------|
| 인보이스 제출 방식 | API 자동 제출 vs 수동 업로드 |
| 필수 필드 | 품목명, HS코드, 신고가치, 통화 |
| 연동 시점 | 레이블 발급 시 동시 vs 별도 |

### 4. DB 스키마 요건 도출

An-13 설계 입력 데이터로 아래 항목을 도출:
- `zen_ups_labels` 신규 테이블 필드 목록
- `zen_ups_tracking_events` 신규 테이블 필드 목록
- 기존 `zen_order_packages` 확장 필드 필요 여부

---

## [산출물]

| 파일 | 내용 |
|:----|:----|
| `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` | API 스펙 조사 결과 원본 |
| 본 Task file `[작업 결과]` 섹션 | 핵심 정보 요약 + An-13 입력 사항 |

> **R-11 준수**: 리서치 결과는 Aiden의 An-13 설계 초안 작성 입력 자료로 사용됩니다.
> 구현 코드 작성은 An-13 Edward 승인 후 진행합니다.

---

## [ZEN_A4 준수 사항]

- 리서치 문서 800줄 이하 (Advisory 기준)
- R-07: 한글 작성

---

## [DoD 체크리스트]

- [ ] 레이블 발급 API 스펙 확인 완료 (Endpoint·payload·response 구조)
- [ ] 트래킹 폴링 API 스펙 확인 완료 (폴링 주기·응답 구조)
- [ ] 인보이스 연동 방식 확인 완료
- [ ] 테스트/실 환경 분기 방식 확인 완료 (IP·Key 파라미터 구조)
- [ ] DB 스키마 요건 초안 작성 완료
- [ ] `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 작성 완료
- [ ] R-17 완료 보고 절차 준수

---

## [설계 의견]

_(설계 의견 없음 — 리서치 Task)_

---

## [작업 결과]

_(미착수)_

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | Task 발령 — Phase 8 UPS 실물 연동 착수 결정 (Edward 260624) · 실 API 사용 확정 · WBS P7-SPR-04 기등재 항목 이행 |
