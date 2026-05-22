# TASK-062 — UAT 절차서: VOC·고객지원 + 마이페이지

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-062 |
| IMP-ID | UAT-07 · UAT-08 |
| 생성일 | 2026-05-22 |
| 담당 Agent | D_Kai |
| 우선순위 | P4 |
| 전제조건 | TASK-052·055 ✅ |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | 신규 UAT 문서 추가 — 기존 코드 변경 없음 |

---

## 배경

TASK-060(Riley)의 UAT 절차서 작업을 B_Kai·D_Kai로 분담 처리한다.
D_Kai는 **UAT_07 (VOC·고객지원)** + **UAT_08 (마이페이지)** 총 10개 시나리오를 담당한다.

- **UAT_07 대상 시나리오**: UAT-07-01~05 (5개)
- **UAT_08 대상 시나리오**: UAT-08-01~05 (5개)
- **참조 템플릿**: `docs/91_FinalTest/UAT/UAT_MASTER.md` §8 템플릿

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-062 → 🔄 동시 반영**

2. **UAT_07_VOC_고객지원.md 작성**: `docs/91_FinalTest/UAT/UAT_07_VOC_고객지원.md`
   - 시나리오: UAT-07-01 VOC 접수(SHIPPER), UAT-07-02 VOC 처리·ADMIN 답변(ADMIN), UAT-07-03 FAQ 조회(ALL), UAT-07-04 공지사항 조회(ALL), UAT-07-05 QnA 문의 등록 + 답변(SHIPPER/ADMIN)
   - 참조 화면: `/ko/voc`, `/ko/voc/admin`, `/ko/support/faq`, `/ko/support/notices`, `/ko/support/qna`
   - 역할: SHIPPER · ADMIN
   - 템플릿: UAT_MASTER.md §8 기준 작성

3. **UAT_08_마이페이지.md 작성**: `docs/91_FinalTest/UAT/UAT_08_마이페이지.md`
   - 시나리오: UAT-08-01 프로필 조회·수정(ALL), UAT-08-02 비밀번호 변경(ALL), UAT-08-03 통관 정보 설정(SHIPPER), UAT-08-04 법인 정보 등록(SHIPPER), UAT-08-05 등급 조회(SHIPPER)
   - 참조 화면: `/ko/mypage`, `/ko/mypage/profile`, `/ko/mypage/customs`, `/ko/mypage/grade`
   - 역할: ALL · SHIPPER
   - 템플릿: UAT_MASTER.md §8 기준 작성

4. **UAT_MASTER.md 갱신**: `docs/91_FinalTest/UAT/UAT_MASTER.md` 인덱스 표에서 UAT-07·08 해당 행 상태 `⬜` → `✅` 반영 + 담당 Agent `D_Kai`로 갱신

5. **코드 커밋**: `[D_Kai] docs: UAT_07·08 VOC·마이페이지 절차서 작성 (10개 시나리오)`
   - 포함 파일: `UAT_07_VOC_고객지원.md` + `UAT_08_마이페이지.md` + `UAT_MASTER.md`

6. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)

7. **ACTIVE_TASK.md TASK-062 → 🔔 반영**

8. **문서 커밋**: `[D_Kai] docs: TASK-062 완료 보고 — task file 🔔`
   - 포함 파일: 본 파일 + ACTIVE_TASK.md

---

## 완료 기준 (DoD)

- [x] `docs/91_FinalTest/UAT/UAT_07_VOC_고객지원.md` 작성 완료 (5개 시나리오, 템플릿 준수)
- [x] `docs/91_FinalTest/UAT/UAT_08_마이페이지.md` 작성 완료 (5개 시나리오, 템플릿 준수)
- [x] `UAT_MASTER.md` 인덱스 UAT-07·08 상태 ✅ + 담당 D_Kai 반영
- [x] 코드 커밋 완료 (해시: 4bf56b9)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] 문서 커밋 완료 (해시: 080f189)

---

## 설계 의견 (Agent 작성)

> 단순 문서 작성 Task — 설계 의견 불필요. ⬜ → 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 단순 Task — 설계 의견 불필요.

---

## 작업 결과

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-22 |
| 완료일 | 2026-05-22 |
| UAT_07 결과 | 5개 시나리오 (VOC 접수·처리·FAQ·공지사항·QnA) |
| UAT_08 결과 | 5개 시나리오 (프로필·비번변경·통관·법인·등급) |
| 커밋 해시 | 4bf56b9 |
| 문서 커밋 해시 | 080f189 |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-22 |
| 결과 | ✅ 승인 |
| DoD 확인 | 전항목 충족 (UAT_07 5개·UAT_08 5개 시나리오·UAT_MASTER ✅ 갱신·커밋 4bf56b9) |
| Advisory | UAT-08-02 `/ko/mypage/security`·UAT-08-04 `/ko/mypage/corporate` — 지시서 미명시 경로, 실제 라우트 존재 시 적절 (비차단) |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-22 | Aiden (Claude) | Task 생성 — TASK-060 분담 처리, D_Kai UAT_07·08 담당 (10개 시나리오) |
| 2026-05-22 | D_Kai (OpenCode) | TASK-062 구현 완료 — UAT_07·08 10개 시나리오 작성, UAT_MASTER 인덱스 ✅ 갱신, 커밋 4bf56b9 |
