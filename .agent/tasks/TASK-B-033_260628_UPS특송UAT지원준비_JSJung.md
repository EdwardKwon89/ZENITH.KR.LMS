# TASK-B-033 — UPS 특송 UAT 주도 실행 (IMP-144)

> **Task-ID**: TASK-B-033
> **생성일**: 2026-06-28
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (2026-06-28)
> **담당**: JSJung (총괄) · Jaison · Dave · Baker
> **우선순위**: P1
> **상태**: ⬜
> **GitHub Issue**: [#135](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/135)
> **연관 IMP**: IMP-144
> **전제조건**: D_Kai TASK-168 §1~§3 완료 ✅ (seed SQL·isUpsOrder 수정·계정 준비)
> **목표 완료일**: 2026-06-29

---

## 업무 개요

UPS 특송 UAT(UAT-17~19)를 **Team B(JSJung 주도)가 직접 실행**한다. Team A는 UAT 지원 및 발견 결함의 수정 방향 결정을 담당한다.

> **[2026-06-28 Edward 지시]** UPS 특송 기능 UAT는 Team B 주도로 진행.  
> Team A(Aiden·D_Kai·B_Kai)는 UAT 지원 및 결함 수정 방향 결정 담당.

### UAT 역할 분담

| 역할 | 담당 |
|:-----|:-----|
| **UAT 주도 실행 및 결과 보고** | **Team B (JSJung 총괄 · Jaison · Dave · Baker)** |
| UAT 최종 통과 판정 | **Edward (ZEN_CEO)** |
| UAT 지원 · 결함 수정 방향 결정 | **Team A (Aiden 주도 · D_Kai · B_Kai)** |
| UAT 결함 수정 구현 | Team A 또는 Team B (Aiden 결정) |

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

각 시나리오별 예상 DB 결과값을 사전 기재.

| UAT | 시나리오 | 실행 주체 | 담당 |
|:----|:--------|:--------:|:-----|
| UAT-17-01 | DIRECT 오더 등록 | Jaison | Jaison |
| UAT-17-02 | PICKUP 오더 등록 + Zod 차단 | Jaison | Jaison |
| UAT-17-03 | 대리점 요율 오버라이드 | Baker | Baker |
| UAT-18-01 | 창고 출고 → UPS 레이블 채번 | Dave | Dave |
| UAT-18-02 | UPS 발송 정보 RLS 격리 | Dave | Dave |
| UAT-19-01 | UPS 인보이스 PDF 출력 | Baker | Baker |
| UAT-19-02 | PDF 다운로드 파일명·내용 검증 | Baker | Baker |

### §5 — UAT 실행 (Team B 주도)

Team B가 UAT-17~19 시나리오를 직접 실행하고 결과를 기록:
- 스크린샷: `docs/99_Manual/UAT_17_Result/` · `UAT_18_Result/` · `UAT_19_Result/`
- 결함 발견 시 R-18 절차: `.agent/defects/DEF-NNN.md` 작성 → Aiden 즉시 보고
- Aiden 수정 방향 결정 후 Team A 또는 Team B 구현 착수

### §6 — 결함 보고 (전원)

UAT 중 발견 결함:
1. `[발견 이슈]` 섹션에 요약 기재
2. `.agent/defects/DEF-NNN_제목.md` 상세 보고서 작성
3. Aiden에게 즉시 보고 (수정 방향 결정 대기)

---

## DoD (Definition of Done)

- [ ] §1 SHXK 환경변수 설정 완료 + 동작 확인
- [ ] §2 agency@zenith.kr 요율 오버라이드 등록 확인
- [ ] §3 WAREHOUSED UPS 오더 1건 준비
- [ ] §4 UAT-17~19 체크리스트 예상 결과값 기재 완료
- [ ] §5 UAT-17-01~03 실행 완료 + 스크린샷 증적
- [ ] §5 UAT-18-01~02 실행 완료 + 스크린샷 증적
- [ ] §5 UAT-19-01~02 실행 완료 + 스크린샷 증적
- [ ] §6 발견 결함 전량 R-18 DEF 보고서 제출 + Aiden 보고
- [ ] Edward UAT 최종 통과 판정 확인
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

### Baker (§4) — 2026-06-29

| UAT | 시나리오 | 상태 | 비고 |
|:----|:--------|:----:|:-----|
| UAT-17-03 | 대리점 화주 요율 오버라이드 적용 UPS 요금 계산 검증 | ✅ | 예상 DB 결과값 기재 완료 (UAT_17_UPS특송오더발송.md) |
| UAT-19-01 | UPS 오더 상세 화면 간이 인보이스 PDF 출력 검증 | ✅ | 예상 DB 결과값 기재 완료 (UAT_19_UPS인보이스PDF.md) |
| UAT-19-02 | 인보이스 PDF 다운로드 파일명 및 내용 무결성 검증 | ✅ | 예상 DB 결과값 기재 완료 (UAT_19_UPS인보이스PDF.md) |

각 시나리오별 예상 SQL 결과값을 `### 예상 DB 결과값 (UAT §4 체크리스트)` 섹션으로 UAT 문서에 추가 완료.

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-28 | Aiden (ZEN_CEO) | TASK-B-033 신규 발령 — UPS 특송 UAT 지원 준비 · JSJung 주도 · Issue #135 · IMP-144 · Edward 승인 |
| 2026-06-28 | Aiden (ZEN_CEO) | **UAT 역할 재정의 (Edward 지시)** — Team B UAT 주도 실행 · Team A UAT 지원 + 결함 수정 방향 결정 · DoD §5~§6 추가 |
