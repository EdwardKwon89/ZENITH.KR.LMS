# TASK-B-033 — UPS 특송 UAT 환경 준비 및 실행 지원 (IMP-144)

> **Task-ID**: TASK-B-033
> **생성일**: 2026-06-28
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (2026-06-28)
> **담당**: JSJung (총괄) · Jaison · Dave · Baker (지원)
> **우선순위**: P1
> **상태**: ⬜
> **GitHub Issue**: [#135](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/135)
> **연관 IMP**: IMP-144
> **전제조건**: D_Kai TASK-168 §1~§3 완료 ✅ (seed SQL·isUpsOrder 수정·계정 준비)
> **목표 완료일**: 2026-06-28 (당일 — Aiden·Edward UAT 실행 즉시 지원)

---

## 업무 개요

UPS 특송 UAT(UAT-17~19)를 **Aiden·Edward가 직접 실행**할 수 있도록 Team B가 환경·데이터·체크리스트를 완비하고 실행 지원 대기.

### UAT 역할 분담

| 역할 | 담당 |
|:-----|:-----|
| UAT 실행 및 최종 통과 판정 | **Aiden (ZEN_CEO) · Edward** |
| UAT 환경 준비 · 지원 | **Team B (JSJung 주도)** |
| UAT 중 결함 수정 의사결정 | Team A |
| UAT 중 결함 수정 구현 | Team B |

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| D_Kai TASK-168 §1 DB 시드 데이터 투입 | ✅ |
| D_Kai TASK-168 §2 isUpsOrder 버그 수정 | ✅ |
| D_Kai TASK-168 §3 테스트 계정 준비 | ✅ |

---

## 구현 범위

### §1 — SHXK 환경변수 설정 (JSJung 담당)

| 항목 | 내용 |
|:-----|:-----|
| `SHXK_APP_KEY` | `.env.local` 등록 |
| `SHXK_APP_TOKEN` | `.env.local` 등록 |
| 확인 방법 | `rtk npm run dev` 후 `/orders/new` 접근 시 콘솔 에러 없음 확인 |

### §2 — UAT-17/19 사전 데이터 준비 (Jaison 담당)

UAT-17-03 실행을 위한 agency@zenith.kr 요율 오버라이드 등록:

```sql
-- Supabase Studio 또는 psql에서 실행
-- agency@zenith.kr (AGENCY 계정) 의 UPS 요율 마크업 설정
-- zen_agency_rate_overrides 또는 동등 테이블에 MARKUP_FLAT 15.00 등록
```

- `agency@zenith.kr` 대리점 계정에 요율 오버라이드(Markup) 등록 확인
- UAT-19용 정산 완료 오더 없을 경우 수동 생성

### §3 — UAT-18 사전 데이터 준비 (Dave 담당)

**전제: TASK-B-029 완료 후 착수**

| 항목 | 내용 |
|:-----|:-----|
| WAREHOUSED 상태 UPS 오더 | 1건 이상 준비 (`transport_mode = 'EXP'`, `status = 'WAREHOUSED'`) |
| 준비 방법 | Supabase Studio에서 직접 INSERT 또는 UI를 통해 오더 생성 후 상태 조작 |

### §4 — UAT 체크리스트 완비 (JSJung 담당)

각 시나리오별 예상 DB 결과값을 사전 기재하여 Aiden·Edward 실행 시 즉시 대조 가능하도록 준비.

| UAT | 시나리오 | 실행 가능 시점 | 담당 점검자 |
|:----|:--------|:------------:|:----------|
| UAT-17-01 | DIRECT 오더 등록 | 즉시 | Jaison |
| UAT-17-02 | PICKUP 오더 등록 + Zod 차단 | 즉시 | Jaison |
| UAT-17-03 | 대리점 요율 오버라이드 | 즉시 | Baker |
| UAT-18-01 | 창고 출고 → UPS 레이블 채번 | TASK-B-029 완료 후 | Dave |
| UAT-18-02 | UPS 발송 정보 RLS 격리 | TASK-B-029 완료 후 | Dave |
| UAT-19-01 | UPS 인보이스 PDF 출력 | 즉시 | Baker |
| UAT-19-02 | PDF 다운로드 파일명·내용 검증 | 즉시 | Baker |

### §5 — 실행 지원 대기 (전원)

Aiden·Edward UAT 실행 시 즉각 기술 지원:
- 결함 발생 시 원인 분석 및 Aiden에게 보고
- Aiden 의사결정 후 즉시 수정 착수 가능한 상태 유지

---

## DoD (Definition of Done)

- [ ] §1 SHXK 환경변수 설정 완료 + 동작 확인
- [ ] §2 agency@zenith.kr 요율 오버라이드 등록 확인
- [ ] §3 WAREHOUSED UPS 오더 1건 준비 (TASK-B-029 완료 후)
- [ ] §4 UAT-17-01~03 체크리스트 예상 결과값 기재 완료
- [ ] §4 UAT-18-01~02 체크리스트 예상 결과값 기재 완료 (TASK-B-029 완료 후)
- [ ] §4 UAT-19-01~02 체크리스트 예상 결과값 기재 완료
- [ ] Aiden·Edward UAT 실행 준비 완료 코멘트 게시 (Issue #135)
- [ ] R-17 커밋 순서 준수
- [ ] 코드 커밋 해시 기재: _(구현 후 기재)_
- [ ] 문서 커밋 해시 기재: _(구현 후 기재)_
- [ ] PR 생성 (`Closes #135`)

---

## [설계 의견]

_JSJung 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_JSJung 완료 후 기재_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-28 | Aiden (ZEN_CEO) | TASK-B-033 신규 발령 — UPS 특송 UAT 지원 준비 · JSJung 주도 · Issue #135 · IMP-144 · Edward 승인 |
