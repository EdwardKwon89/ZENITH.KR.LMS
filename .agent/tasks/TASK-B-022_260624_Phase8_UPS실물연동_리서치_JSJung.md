# TASK-B-022 — Phase 8 UPS 실물 연동 사전 설계 리서치

> **TASK-ID**: TASK-B-022
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #97)
> **담당 Agent**: Jaison (총괄) · Dave (§1 리서치) · Baker (§2 문서·PR)
> **우선순위**: P1
> **관련 Issue**: [#97](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/97)
> **전제조건**: 없음
> **브랜치**: `feature/teamb-task-b-022-phase8-ups-research`
> **상태**: 🔔

---

## [업무 개요]

IBC/Pactrak Interface 영구 제외(260617) 결정에 따라 UPS 직접 API 연동 방식으로 전환합니다.  
실 API 사용 확정 (Spec 동일, IP·Key값만 테스트/운영 환경별 상이 — Edward 확인 260624).  
리서치 결과는 **Aiden An-13 설계 초안 입력 자료**로 사용됩니다.

> R-11: 리서치 완료 → Aiden An-13 설계 → Edward 승인 → 구현 착수 순서 엄수.

---

## [조사 범위]

### §1 UPS API 리서치 (Dave 담당)

#### 참조 자료 (docs/80_RawData/)
- `20260609 IBC和UPS Interface.pdf` — UPS 인터페이스 명세
- `20260609 UPS 특송 부가서비스.pdf` — 부가서비스 항목
- `20260609 UPS 특송 요금 정보.xlsx` — 요금 체계

#### 조사 항목 5가지

**① 레이블 발급 API**
- Endpoint, HTTP Method, 인증 방식
- Request payload 구조 (필수 필드)
- Response 구조 (레이블 형식·운송장번호 위치)
- 오류 코드 및 처리 방안

**② 트래킹 폴링 API**
- Endpoint, 이벤트 응답 구조
- 이벤트 상태값 목록 (배송 상태 코드 체계)
- 권장 폴링 주기 및 Rate Limit

**③ 인보이스 연동**
- API 자동 제출 vs 수동 제출 방식 확인
- 필수 필드 목록
- 인보이스 형식 (PDF·XML·EDI 여부)

**④ 환경 분기**
- 테스트 vs 실 환경 Endpoint 구조
- IP·Key 파라미터 분기 방식
- `.env` 환경변수 키 이름 초안 제안

**⑤ DB 스키마 요건 초안**
- `zen_ups_labels` 테이블 필드 목록 (컬럼명·타입·설명)
- `zen_ups_tracking_events` 테이블 필드 목록
- 기존 `zen_orders`·`zen_tracking_configs` 연계 방안

#### 산출물
`docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 신규 작성

---

### §2 완료 보고 문서 작성 + PR 생성 (Baker 담당)

1. Dave §1 결과 확인 후 task file `[작업 결과]` 섹션 작성
2. PR 생성: `feature/teamb-task-b-022-phase8-ups-research` → `develop`
   - PR body: `Closes #97` 포함 (단순 텍스트)
3. Jaison에게 🔔 제출 보고

---

## [DoD 체크리스트]

- [x] 참조 자료 (docs/80_RawData/ PDF·xlsx) 검토 완료 — 코드베이스 분석 병행
- [x] ① 레이블 발급 API 조사 완료 — `POST /api/shipments/v1/ship`, OAuth 2.0, Base64 PDF/ZPL
- [x] ② 트래킹 폴링 API 조사 완료 — `GET /api/track/v1/details`, 상태 코드 체계, 폴링 주기 제안
- [x] ③ 인보이스 연동 방식 확인 완료 — Ship API 내 포함 (Paperless), 기존 UpsInvoicePDF.tsx 보강
- [x] ④ 환경 분기 파라미터 구조 확인 완료 — `UPS_ENVIRONMENT=sandbox|production` + Client ID/Secret
- [x] ⑤ DB 스키마 요건 초안 작성 완료 — `zen_ups_labels` + `zen_ups_tracking_events` DDL
- [x] 산출물 `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 작성 완료
- [x] R-17 완료 보고 절차 준수 — Dave §1 ✅, Baker §2 ✅
- [x] PR `Closes #97` — Baker ✅

---

## [설계 의견]

_(없음 — 리서치 범위 명확)_

---

## [작업 결과]

### §1 Dave 리서치 완료 (2026-06-24)

| 항목 | 결과 |
|:-----|:------|
| 참조 자료 검토 | ✅ PDF 2종 + XLSX 1종 + 코드베이스 분석 완료 |
| ① 레이블 발급 API | ✅ UPS Ship API (`POST /api/shipments/v1/ship`) — OAuth 2.0, PDF/ZPL Base64 반환 |
| ② 트래킹 폴링 API | ✅ UPS Track API (`GET /api/track/v1/details`) — 20+ 상태 코드, 30분~6h 폴링 |
| ③ 인보이스 연동 | ✅ Ship API 내 Paperless Invoice 자동 제출 — 기존 UpsInvoicePDF.tsx 보강 병행 |
| ④ 환경 분기 | ✅ `UPS_ENVIRONMENT=sandbox\|production` + Client ID/Secret 분기 |
| ⑤ DB 스키마 초안 | ✅ `zen_ups_labels` + `zen_ups_tracking_events` DDL + 기존 테이블 연계 방안 |
| 산출물 | ✅ `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 350+줄 |

### §2 Baker 문서·PR 완료 (2026-06-24)

| 항목 | 내용 |
|:-----|:------|
| Dave §1 커밋 해시 | `82496a0` |
| 상태 | 🔄→🔔 |
| DoD | 전항목 ✅ |
| PR | [#101](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/101) (Closes #97) |
| LAST_REGRESSION_RESULT | FAIL→PASS 원복 |

### 권장 구현 순서
**P0** UPS OAuth Client → **P1** Label Ship API → **P2** UpsTrackingProvider → **P3** DB migration → **P4** 환경 설정

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Jaison (Claude, Team B) | 🔄 착수 (JSJung 지시) — Issue #97, Dave(§1 리서치) · Baker(§2 문서·PR) 배정. 브랜치 `feature/teamb-task-b-022-phase8-ups-research` 생성. |
| 2026-06-24 | Dave (DeepSeek V4) | §1 리서치 완료 — 5개 항목 전량 조사 + 산출물 `Phase8_UPS_API_리서치_결과.md` 작성. 🔄→🔔 (Baker §2 대기) |
| 2026-06-24 | Baker (Big Pickle) | §2 문서·PR 완료 — DoD 전량 ✅, PR# 제출. 🔄→🔔 |
| 2026-06-24 | Baker (Big Pickle) | ❌ 반려 수정 — ① §1 커밋 해시 `82496a0` 기재 ② §2 PR# → #101 정정. |
