# TASK-039 — 다국어 번역 커버리지 감사 + CI 게이트 도입

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-039 |
| IMP-ID | IMP-032 |
| 생성일 | 2026-05-21 |
| 담당 Agent | B_Kai (OpenCode) |
| 우선순위 | P4 |
| 전제조건 | 없음 |
| 상태 | ⬜ 미착수 |
| 파급 효과 | 낮음 (신규 스크립트 추가 + ORDER_STATUS_META 키 전환) |

---

## 배경

- `src/types/orders.ts` `ORDER_STATUS_META` — `label`·`description` 필드 한글 하드코딩 (다국어 미지원)
- `messages/ja.json` 25줄 / `messages/zh.json` 77줄 — `messages/en.json` 463줄 대비 번역 누락 심각
- 번역 누락 자동 탐지 체계 없음 — 신규 페이지 추가 시마다 수동 확인에 의존

참조: `scratch/post_launch_improvements.md §IMP-032`  
관련 파일: `scripts/audit-i18n.ts` (신규), `src/types/orders.ts`, `messages/*.json`, `package.json`

> **단순 Task — ⬜→🔄 직행**

---

## 작업 지시

1. **본 파일 상태 → 🔄, ACTIVE_TASK.md TASK-039 → 🔄 동시 반영**
2. `gitnexus_impact({target: "ORDER_STATUS_META", direction: "upstream"})` — 영향 범위 확인
3. **`scripts/audit-i18n.ts` 신규 작성**:
   - `messages/en.json` 키 목록을 기준(baseline)으로 ko/ja/zh 누락 키 비교
   - 누락 키 발견 시 콘솔 출력 + exit code 1 반환
   - 출력 형식: `[MISSING] ja: 키경로 (expected: "영문값")`
4. **`package.json` `scripts`에 추가**:
   ```json
   "check:i18n": "npx tsx scripts/audit-i18n.ts"
   ```
5. **`src/types/orders.ts` `ORDER_STATUS_META` 수정**:
   - `label` 필드: 한글 하드코딩 → `ko.json`의 기존 키 참조 또는 `orderStatus.{status}.label` 신규 키 추가
   - `description` 필드: 동일 방식 처리
   - **단, ORDER_STATUS_META의 color 필드는 변경 금지** (UI 전용, 번역 불필요)
   - 변경 후 `messages/en.json` · `messages/ko.json`에 해당 키 추가 (ja/zh는 en 값 임시 fallback 허용)
6. `gitnexus_detect_changes()` — 커밋 전 변경 범위 확인
7. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
8. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-039.log`
9. **코드 커밋**: `[B_Kai] feat: IMP-032 다국어 번역 CI 게이트 — audit-i18n 스크립트 + ORDER_STATUS_META i18n 전환`
10. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
11. **ACTIVE_TASK.md TASK-039 → 🔔 반영**
12. **`scratch/IMP_PROGRESS.md` IMP-032 행 🔔 갱신**
13. **문서 커밋**: `[B_Kai] docs: TASK-039 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [ ] `scripts/audit-i18n.ts` 생성 완료
- [ ] `package.json` `check:i18n` 스크립트 추가
- [ ] `rtk npm run check:i18n` 실행 시 누락 키 목록 출력 확인 (ja/zh 누락 키 발견 예상)
- [ ] `ORDER_STATUS_META` label·description i18n 키 기반 전환 완료
- [ ] `messages/en.json` · `messages/ko.json` 신규 키 추가 완료
- [ ] `gitnexus_impact` 결과 기록
- [ ] `gitnexus_detect_changes()` 결과 확인
- [ ] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [ ] `[B_Kai] feat: IMP-032` 코드 커밋 완료 (해시 기재)
- [ ] `[B_Kai] docs: TASK-039` 문서 커밋 완료
- [ ] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [ ] `scratch/IMP_PROGRESS.md` IMP-032 행 갱신

---

## 작업 결과

> **이 섹션은 착수 후 B_Kai가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | — |
| 완료일 | — |
| 생성 파일 | — |
| gitnexus_impact 결과 | — |
| 회귀 결과 | — |
| 코드 커밋 해시 | — |
| 문서 커밋 해시 | — |

---

## Aiden 검토

> **이 섹션은 🔔 보고 후 Aiden이 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 검토일 | — |
| 판정 | — |
| 검토 의견 | — |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — IMP-032 다국어 번역 CI 게이트 발령. B_Kai 신규 할당 중단 해제 후 첫 Task |
