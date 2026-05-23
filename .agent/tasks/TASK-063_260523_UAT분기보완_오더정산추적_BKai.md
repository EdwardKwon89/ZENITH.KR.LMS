# TASK-063 — UAT 분기 보완: 오더·마스터오더·정산·추적

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-063 |
| IMP-ID | — (UAT 문서 보완 · 코드 변경 없음) |
| 생성일 | 2026-05-23 |
| 담당 Agent | B_Kai |
| 우선순위 | P4 |
| 전제조건 | TASK-058·061 ✅ |
| 상태 | 🔔 검토 요청 |
| 파급 효과 | UAT 문서 추가 — 기존 코드 변경 없음 |

---

## 배경

Aiden이 register/page.tsx 코드 검토 중 UAT-01-01 개인/법인 분기 누락을 발견하였고, 이를 계기로 전 UAT 영역에 대해 코드-시나리오 정합성을 재점검하였다. 그 결과 B_Kai 담당 영역(UAT_02·03·05·06)에서 아래 High 분기가 누락된 것이 확인되었다.

| 누락 분기 | 영역 | 심각도 |
|:---|:---:|:---:|
| 역할별 상태 변경 권한 분화 — MANAGER 가능 범위 vs ADMIN 전용 | UAT-02 | High |
| MASTERED 상태 오더 개별 수정 불가 UX 검증 | UAT-03 | High |
| `/finance/invoices/{id}` 상세 링크 이동 — 404 가능성 | UAT-05 | High |
| SHIPPER의 Settlement 접근 권한 범위 검증 | UAT-05 | High |
| SHIPPER vs ADMIN 추적 데이터 범위 분리 | UAT-06 | High |

> ⚠️ **작업 범위 엄수**: UAT 문서(시나리오 추가·수정)만 허용. 코드 수정 절대 금지.
> 코드 레벨 결함이 발견되더라도 시나리오만 작성하고 코드는 건드리지 않는다.

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-063 → 🔄 동시 반영**

2. **UAT_02_오더관리.md 보완**: `docs/91_FinalTest/UAT/UAT_02_오더관리.md`
   - **UAT-02-08 신규 추가**: 역할별 상태 변경 권한 분화
     - 역할: MANAGER / ADMIN
     - 시나리오: MANAGER 로그인 → 오더 상세 → 상태 변경 버튼 클릭 → MANAGER 허용 범위 외 상태 선택 시 차단(비활성·오류) 확인
     - 역참조: `canChangeStatus()` 함수 (role 기반 권한 제어 존재)
     - 기대 결과 예시: "MANAGER는 WAREHOUSED·PACKED 상태 전환 가능 / CANCELED 등 ADMIN 전용 상태는 버튼 비노출 또는 오류"
     - 합격 기준: 역할별 허용·차단 상태 명확히 구분됨

3. **UAT_03_마스터오더_분리.md 보완**: `docs/91_FinalTest/UAT/UAT_03_마스터오더_분리.md`
   - **UAT-03-04 신규 추가**: MASTERED 상태 오더 수정 불가 UX 검증
     - 역할: ADMIN
     - 시나리오: MASTERED 오더 상세 접속 → 상태 변경 버튼 비활성 또는 숨김 확인 → 강제 URL 접근 시도 → 차단 메시지 확인
     - 역참조: 상태 머신 규칙 `MASTERED → []` (전이 불가)
     - 합격 기준: MASTERED 상태에서 상태 변경 액션 불가능 확인

4. **UAT_05_정산_인보이스.md 보완**: `docs/91_FinalTest/UAT/UAT_05_정산_인보이스.md`
   - **UAT-05-06 신규 추가**: 인보이스 상세 페이지 링크 이동 검증
     - 역할: ADMIN
     - 화면: `/ko/finance/revenue`
     - 시나리오: 수익 조회 목록에서 Invoice No 링크 클릭 → `/ko/finance/invoices/{id}` 상세 페이지 이동 → 404 없음 확인
     - 합격 기준: 링크 이동 성공, 인보이스 상세 정보 표시, 500·404 에러 없음
   - **UAT-05-07 신규 추가**: SHIPPER의 Settlement 접근 권한 검증
     - 역할: SHIPPER
     - 시나리오: SHIPPER 로그인 → `/ko/settlement` 직접 접근 → 권한 오류 또는 `/ko/finance`로 리다이렉트 확인
     - 시나리오B: SHIPPER 로그인 → `/ko/finance` 접근 → 본인 조직 인보이스만 노출 확인 (타 조직 인보이스 미노출)
     - 합격 기준: SHIPPER의 Settlement 직접 접근 차단 또는 적절한 권한 분리 확인

5. **UAT_06_추적_스케줄.md 보완**: `docs/91_FinalTest/UAT/UAT_06_추적_스케줄.md`
   - **UAT-06-04 신규 추가**: SHIPPER vs ADMIN 추적 데이터 범위 분리 검증
     - 역할: SHIPPER / ADMIN
     - 시나리오A: SHIPPER 로그인 → 추적 목록 → 본인 조직 오더만 표시됨 확인 (타 조직 오더 미노출)
     - 시나리오B: ADMIN 로그인 → 추적 목록 → 전체 오더 표시됨 확인
     - 합격 기준: 역할에 따라 조회 범위 분리 정상 동작

6. **UAT_MASTER.md 갱신**: `docs/91_FinalTest/UAT/UAT_MASTER.md`
   - 인덱스 표에 아래 5개 행 추가 (상태 ✅, 담당 B_Kai):
     - UAT-02-08 | 역할별 상태 변경 권한 분화 | MANAGER/ADMIN | UAT_02 | B_Kai | ✅
     - UAT-03-04 | MASTERED 오더 수정 불가 검증 | ADMIN | UAT_03 | B_Kai | ✅
     - UAT-05-06 | 인보이스 상세 링크 이동 | ADMIN | UAT_05 | B_Kai | ✅
     - UAT-05-07 | SHIPPER Settlement 접근 권한 | SHIPPER | UAT_05 | B_Kai | ✅
     - UAT-06-04 | SHIPPER vs ADMIN 추적 범위 | SHIPPER/ADMIN | UAT_06 | B_Kai | ✅
   - 총 시나리오 수 갱신: 45 → 50 (TASK-064 완료 후 56으로 재갱신 예정)
   - ⚠️ 결함 관리 원장 수정 금지 — 실행 전 사전 기재 불가

7. **코드 커밋**: `[B_Kai] docs: TASK-063 UAT 분기 보완 — 오더·마스터오더·정산·추적 5개 시나리오 추가`
   - 포함 파일: `UAT_02_오더관리.md` + `UAT_03_마스터오더_분리.md` + `UAT_05_정산_인보이스.md` + `UAT_06_추적_스케줄.md` + `UAT_MASTER.md`

8. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)

9. **ACTIVE_TASK.md TASK-063 → 🔔 반영**

10. **문서 커밋**: `[B_Kai] docs: TASK-063 완료 보고 — task file 🔔`
    - 포함 파일: 본 파일 + ACTIVE_TASK.md

---

## 완료 기준 (DoD)

- [x] UAT-02-08 시나리오 작성 (역할별 상태 변경 권한, 절차 표 포함)
- [x] UAT-03-04 시나리오 작성 (MASTERED 수정 불가, 절차 표 포함)
- [x] UAT-05-06 시나리오 작성 (인보이스 상세 링크, 절차 표 포함)
- [x] UAT-05-07 시나리오 작성 (SHIPPER Settlement 접근, A·B·C 시나리오 모두 포함)
- [x] UAT-06-04 시나리오 작성 (SHIPPER vs ADMIN 추적 범위, A·B 시나리오 모두 포함)
- [x] UAT_MASTER.md 인덱스 5개 행 추가 + 총계 50개 갱신
- [x] 코드 변경 없음 확인
- [x] 코드 커밋 완료 (해시: 8cf9bfc)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] 문서 커밋 완료 (해시 기재)

---

## 설계 의견 (Agent 작성)

> 단순 문서 작업 Task — 설계 의견 불필요. ⬜ → 🔄 직행.

---

## 설계 확정 (Aiden 작성)

> 단순 Task — 설계 의견 불필요.

---

## 작업 결과

> 이 섹션은 착수 후 B_Kai가 작성합니다.

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-23 |
| 완료일 | 2026-05-23 |
| 추가 시나리오 | 5개 (UAT-02-08·03-04·05-06·05-07·06-04) |
| 커밋 해시 | 8cf9bfc |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> 이 섹션은 🔔 제출 후 Aiden이 작성합니다.

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-23 | Aiden (Claude) | Task 생성 — 코드-UAT 정합성 재점검 결과 B_Kai 담당 영역 High 분기 5건 누락 확인, 보완 지시 |
