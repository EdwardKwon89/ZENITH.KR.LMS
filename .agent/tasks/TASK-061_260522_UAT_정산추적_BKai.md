# TASK-061 — UAT 절차서: 정산·인보이스 + 추적·스케줄

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-061 |
| IMP-ID | UAT-05 · UAT-06 |
| 생성일 | 2026-05-22 |
| 담당 Agent | B_Kai |
| 우선순위 | P4 |
| 전제조건 | TASK-052·055 ✅ |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 신규 UAT 문서 추가 — 기존 코드 변경 없음 |

---

## 배경

TASK-060(Riley)의 UAT 절차서 작업을 B_Kai·D_Kai로 분담 처리한다.
B_Kai는 **UAT_05 (정산·인보이스)** + **UAT_06 (추적·스케줄)** 총 8개 시나리오를 담당한다.

- **UAT_05 대상 시나리오**: UAT-05-01~05 (5개)
- **UAT_06 대상 시나리오**: UAT-06-01~03 (3개)
- **참조 템플릿**: `docs/91_FinalTest/UAT/UAT_MASTER.md` §8 템플릿

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-061 → 🔄 동시 반영**

2. **UAT_05_정산_인보이스.md 작성**: `docs/91_FinalTest/UAT/UAT_05_정산_인보이스.md`
   - 시나리오: UAT-05-01 정산 목록 조회, UAT-05-02 인보이스 생성, UAT-05-03 Excel/PDF 다운로드, UAT-05-04 비용 조회, UAT-05-05 수익 조회
   - 참조 화면: `/ko/finance`, `/ko/finance/costs`, `/ko/finance/revenue`
   - 역할: ADMIN
   - 템플릿: UAT_MASTER.md §8 기준 작성

3. **UAT_06_추적_스케줄.md 작성**: `docs/91_FinalTest/UAT/UAT_06_추적_스케줄.md`
   - 시나리오: UAT-06-01 배송 추적 조회(SHIPPER), UAT-06-02 스케줄 목록 조회(ADMIN), UAT-06-03 스케줄 등록(ADMIN)
   - 참조 화면: `/ko/tracking`, `/ko/tracking/schedules`
   - 역할: SHIPPER · ADMIN
   - 템플릿: UAT_MASTER.md §8 기준 작성

4. **UAT_MASTER.md 갱신**: `docs/91_FinalTest/UAT/UAT_MASTER.md` 인덱스 표에서 UAT-05·06 해당 행 상태 `⬜` → `✅` 반영 + 담당 Agent `B_Kai`로 갱신

5. **코드 커밋**: `[B_Kai] docs: UAT_05·06 정산·추적 절차서 작성 (8개 시나리오)`
   - 포함 파일: `UAT_05_정산_인보이스.md` + `UAT_06_추적_스케줄.md` + `UAT_MASTER.md`

6. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)

7. **ACTIVE_TASK.md TASK-061 → 🔔 반영**

8. **문서 커밋**: `[B_Kai] docs: TASK-061 완료 보고 — task file 🔔`
   - 포함 파일: 본 파일 + ACTIVE_TASK.md

---

## 완료 기준 (DoD)

- [x] `docs/91_FinalTest/UAT/UAT_05_정산_인보이스.md` 작성 완료 (5개 시나리오, 템플릿 준수)
- [x] `docs/91_FinalTest/UAT/UAT_06_추적_스케줄.md` 작성 완료 (3개 시나리오, 템플릿 준수)
- [x] `UAT_MASTER.md` 인덱스 UAT-05·06 상태 ✅ + 담당 B_Kai 반영
- [x] 코드 커밋 완료 (해시: 2b91af8)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] 문서 커밋 완료 (해시: 1534d35)

---

## 설계 의견 (Agent 작성)

> 단순 문서 작성 Task — 설계 의견 불필요. ⬜ → 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 단순 Task — 설계 의견 불필요.

---

## 작업 결과

> 이 섹션은 착수 후 B_Kai가 작성합니다.

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-22 |
| 완료일 | 2026-05-22 |
| UAT_05 결과 | 5개 시나리오 (UAT-05-01~05) |
| UAT_06 결과 | 3개 시나리오 (UAT-06-01~03) |
| 커밋 해시 | 2b91af8 |
| 문서 커밋 해시 | 1534d35, b9ea60f |

---

## Aiden 검토

> 이 섹션은 🔔 제출 후 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-22 | Aiden (Claude) | Task 생성 — TASK-060 분담 처리, B_Kai UAT_05·06 담당 (8개 시나리오) |
