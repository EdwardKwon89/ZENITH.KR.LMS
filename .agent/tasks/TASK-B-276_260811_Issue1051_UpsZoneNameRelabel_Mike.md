# TASK-B-276 — DEF-B-048 zen_ups_zones 이름표 번호만 표시 단순화

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-B-276 |
| Issue-ID | #1051 / DEF-B-048 |
| 생성일 | 2026-08-11 |
| 담당 Agent | Mike (MiMo V2.5) |
| 우선순위 | P2 |
| 상태 | ✅ 완료 |

---

## 배경

JSJung — ups-detail 페이지에서 중국행 오더의 Zone이 "Zone 1 - Domestic Korea"로 표시되는 걸 확인

---

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:----------|
| `20260811020000_iss1051_ups_zone_name_relabel.sql` | Z1~Z10 이름표를 'Zone 1'~'Zone 10'으로 변경 |

---

## [작업 결과]

**커밋**: `b2f12869` — `[Mike] fix: DEF-B-048 zen_ups_zones 이름표를 번호만 표시하는 방식으로 단순화 (Issue #1051)`

**PR**: #1055 (TeamB_Dev base) — https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1055

**변경 내용**:
- Z1~Z10 이름표를 'Zone 1'~'Zone 10'으로 변경
- 대륙명 라벨은 국가 혼재로 부정확하므로 번호만 표시

**검증**: 핵심 단위 테스트 44개 전부 통과
