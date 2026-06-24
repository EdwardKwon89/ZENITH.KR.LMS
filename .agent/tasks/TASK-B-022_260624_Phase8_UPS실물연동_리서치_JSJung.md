# TASK-B-022 — Phase 8 UPS 실물 연동 사전 설계 리서치

> **TASK-ID**: TASK-B-022
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #97)
> **담당 Agent**: Jaison (총괄) · Dave (§1 리서치) · Baker (§2 문서·PR)
> **우선순위**: P1
> **관련 Issue**: [#97](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/97)
> **전제조건**: 없음
> **브랜치**: `feature/teamb-task-b-022-phase8-ups-research`
> **상태**: 🔄

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

- [ ] 참조 자료 (docs/80_RawData/ PDF·xlsx) 검토 완료
- [ ] ① 레이블 발급 API 조사 완료 (Endpoint·payload·response·오류)
- [ ] ② 트래킹 폴링 API 조사 완료 (이벤트 구조·폴링 주기)
- [ ] ③ 인보이스 연동 방식 확인 완료
- [ ] ④ 환경 분기 파라미터 구조 확인 완료
- [ ] ⑤ DB 스키마 요건 초안 (`zen_ups_labels`·`zen_ups_tracking_events`) 작성 완료
- [ ] 산출물 `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 작성 완료
- [ ] R-17 완료 보고 절차 준수
- [ ] PR `Closes #97`

---

## [설계 의견]

_(없음 — 리서치 범위 명확)_

---

## [작업 결과]

_(Dave §1 완료 후 Baker 기재)_

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Jaison (Claude, Team B) | 🔄 착수 (JSJung 지시) — Issue #97, Dave(§1 리서치) · Baker(§2 문서·PR) 배정. 브랜치 `feature/teamb-task-b-022-phase8-ups-research` 생성. |
