# TASK-082 — UAT 절차서 보완: 출고·운송장·패킹 (UAT-04-06, UAT-04-07)

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-082 |
| IMP-ID | — (UAT 문서 작업) |
| 생성일 | 2026-05-24 |
| 담당 Agent | B_Kai |
| 우선순위 | P4 |
| 전제조건 | TASK-070 ✅ (IMP-074 SCR-041 출고·운송장) · TASK-071 ✅ (IMP-075 SCR-031 패킹) |
| 상태 | 🔔 |
| 파급 효과 | UAT_04 기존 문서에 시나리오 추가 — 코드 변경 없음 |

---

## 배경

UAT Sprint(TASK-058~064) 완료 후 갭 분석 후속으로 구현된 IMP-074(SCR-041 출고·운송장)·IMP-075(SCR-031 패킹)에 대한 UAT 절차서가 미작성된 채로 UAT_MASTER에 ⬜로 남아 있다. B_Kai는 두 기능 모두 직접 구현한 담당자이므로 절차서 작성에 가장 적합하다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-082 → 🔄 동시 반영**

2. **UAT_04_창고_재고.md에 UAT-04-06 추가**: `docs/91_FinalTest/UAT/UAT_04_창고_재고.md`
   - 시나리오: **UAT-04-06 SCR-041 출고 처리 + 운송장 PDF 출력**
   - 화면 URL: `/ko/warehouse/outbound`
   - 역할: MANAGER
   - 핵심 검증: WAREHOUSED 오더 목록, 출고 처리(RELEASED 전이), 운송장 PDF 생성·다운로드, 다국어(ko/en/zh/ja) 레이블 정상 출력
   - IMP-074 참조: `src/app/[locale]/(dashboard)/warehouse/outbound/`, zh/ja i18n 전량, RBAC MANAGER 권한

3. **UAT_04_창고_재고.md에 UAT-04-07 추가**: (동일 파일 계속 작성)
   - 시나리오: **UAT-04-07 SCR-031 오더 패킹 리스트 화면**
   - 화면 URL: `/ko/master-orders/[id]/packing`
   - 역할: MASTER · ADMIN
   - 핵심 검증: 마스터 오더 내 개별 오더 목록, PackingToolbar(Client Component) 동작, 체크박스 상태 관리, 인쇄/PDF 출력, SHIPPER 접근 차단
   - IMP-075 참조: `src/app/[locale]/(dashboard)/master-orders/[id]/packing/`, PackingToolbar "use client" 분리

4. **UAT_MASTER.md 갱신**: UAT-04-06·UAT-04-07 행 상태 `⬜` → `✅`, 담당 Agent `B_Kai`로 갱신

5. **코드 커밋**: `[B_Kai] docs: TASK-082 UAT-04-06 출고·운송장 + UAT-04-07 패킹 절차서 작성`
   - 포함 파일: `UAT_04_창고_재고.md` + `UAT_MASTER.md`

6. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)

7. **ACTIVE_TASK.md TASK-082 → 🔔 반영**

8. **문서 커밋**: `[B_Kai] docs: TASK-082 완료 보고 — task file 🔔`
   - 포함 파일: 본 파일 + `ACTIVE_TASK.md`

---

## 완료 기준 (DoD)

- [ ] UAT_04_창고_재고.md — UAT-04-06 절차표 완성 (출고처리·RELEASED 전이·운송장 PDF·다국어)
- [ ] UAT_04_창고_재고.md — UAT-04-07 절차표 완성 (패킹 리스트·PackingToolbar·SHIPPER 차단)
- [ ] UAT_MASTER.md 인덱스 UAT-04-06·04-07 상태 ✅ + 담당 B_Kai 반영
- [ ] 코드 커밋 완료 (해시: 기재 필수)
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] 문서 커밋 완료 (해시: 기재 필수)

---

## 설계 의견 (Agent 작성)

> 단순 문서 작성 Task — 설계 의견 불필요. ⬜ → 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 단순 Task — 직행.

---

## 작업 결과

| 항목 | 파일 | 상태 |
|:-----|:-----|:----:|
| UAT-04-06 절차표 완성 (출고처리·RELEASED 전이·운송장 PDF·다국어) | `docs/91_FinalTest/UAT/UAT_04_창고_재고.md` | ✅ |
| UAT-04-07 절차표 완성 (패킹 리스트·PackingToolbar·SHIPPER 차단) | `docs/91_FinalTest/UAT/UAT_04_창고_재고.md` | ✅ |
| UAT_MASTER.md 인덱스 UAT-04-06·04-07 ✅ + 담당 B_Kai 반영 | `docs/91_FinalTest/UAT/UAT_MASTER.md` | ✅ |
| 총계 갱신 (70/72 ✅) | `docs/91_FinalTest/UAT/UAT_MASTER.md` | ✅ |
| 코드 커밋 완료 (해시: `182ebd7`) | — | ✅ |

### DoD 체크리스트

- [x] UAT_04_창고_재고.md — UAT-04-06 절차표 완성 (출고처리·RELEASED 전이·운송장 PDF·다국어)
- [x] UAT_04_창고_재고.md — UAT-04-07 절차표 완성 (패킹 리스트·PackingToolbar·SHIPPER 차단)
- [x] UAT_MASTER.md 인덱스 UAT-04-06·04-07 상태 ✅ + 담당 B_Kai 반영
- [x] 코드 커밋 완료 (해시: `182ebd7`)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] 문서 커밋 완료 (해시: `d4d5706`)

---

## Aiden 검토

> Aiden 검토 후 기재.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-24 | Aiden (Claude) | Task 생성 — UAT Sprint 누락 2건(IMP-074·075) 보완. B_Kai 직접 구현 기능 담당 배정 |
| 2026-05-24 | B_Kai (OpenCode) | 🔔 완료 — UAT-04-06·04-07 절차서 작성 · 코드 182ebd7 · 70/72 갱신 |
