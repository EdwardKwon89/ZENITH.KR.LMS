# TASK-039 — 다국어 번역 커버리지 감사 + CI 게이트 도입

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-039 |
| IMP-ID | IMP-032 |
| 생성일 | 2026-05-21 |
| 담당 Agent | B_Kai (OpenCode) |
| 우선순위 | P4 |
| 전제조건 | 없음 |
| 상태 | ❌ 반려 — 재작업 필요 |
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

- [x] `scripts/audit-i18n.ts` 생성 완료 — en.json 441키 baseline 비교 + exit 1
- [x] `package.json` `check:i18n` 스크립트 추가 — `tsx scripts/audit-i18n.ts`
- [x] `rtk npm run check:i18n` 실행 시 누락 키 목록 출력 확인 (ja 427·ko 43·zh 372 누락)
- [x] `ORDER_STATUS_META` label·description → labelKey·descriptionKey i18n 키 전환 완료
- [x] `messages/en.json` · `messages/ko.json` orderStatus.* 신규 키 12개씩 추가 완료
- [x] `gitnexus_impact` 결과 기록 — ORDER_STATUS_META 소비처 2개(OrderDataTable·StatusChangeModal)
- [x] `gitnexus_detect_changes()` 결과 확인 — 변경 범위 6개 파일
- [x] 회귀 테스트 PASS 증적 — 207/209 (2 pre-existing failure, 내 변경 무관)
- [x] `[B_Kai] feat: IMP-032` 코드 커밋 완료 (해시 `1e5c07d`)
- [x] `[B_Kai] docs: TASK-039` 문서 커밋 완료 (해시 `8a6cf8e`)
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] `scratch/IMP_PROGRESS.md` IMP-032 행 🔔 갱신

---

## 작업 결과

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-21 |
| 완료일 | 2026-05-21 |
| 생성 파일 | `scripts/audit-i18n.ts` |
| 수정 파일 | `messages/en.json`, `messages/ko.json`, `package.json`, `src/types/orders.ts`, `src/components/orders/OrderDataTable.tsx`, `src/components/orders/StatusChangeModal.tsx` |
| gitnexus_impact 결과 | ORDER_STATUS_META 소비처 2개 — OrderDataTable.tsx(getStatusInfo·JSX label), StatusChangeModal.tsx(currentStatus 표시·선택 가능 목록) |
| 회귀 결과 | 207/209 PASS (2 pre-existing: master_policy.test.ts dissolveMasterOrder mock user 미설정) |
| 코드 커밋 해시 | `1e5c07d` |
| 문서 커밋 해시 | `8a6cf8e` |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-21 |
| 판정 | ❌ 반려 |
| 검토 의견 | **Aiden 정정**: 1차 리뷰에서 "R-17 커밋 순서 위반"으로 반려하였으나 오류 — 실제로 B_Kai는 `1e5c07d`(코드, 11:18:25) → `8a6cf8e`(문서, 11:18:37) 순서 정상 준수. Aiden의 git status 확인 시점이 B_Kai 커밋 이전이어서 발생한 오진. **코드 ✅**: `audit-i18n.ts` 깔끔·flattenKeys 재귀·exit 1·올바른 형식. `ORDER_STATUS_META` labelKey/descriptionKey + `useTranslations('orderStatus')` ✅. `en.json`/`ko.json` 24키 ✅. IMP_PROGRESS.md ✅. R-17 3파일 doc commit ✅. **잔여 절차 이슈 ❌**: ① 코드 커밋 해시 `—`→`1e5c07d` 기재 필요 (2-커밋 패턴 구조적 한계, Advisory) ② 문서 커밋 해시 `—`→`8a6cf8e` 기재 필요 ③ DoD 3개 미체크: `feat` 해시·`docs` 해시·IMP_PROGRESS `[ ]` → `[x]` ④ DoD 텍스트 `[Codex]` → `[B_Kai]` 수정 ⑤ 개정 이력 이름 `Noah (Codex)` → `B_Kai (OpenCode)`. **207/209**: 2 실패 Ring TASK-033 버그 — B_Kai 책임 없음 ✅. **최소 재작업**: task file 단독 커밋 — 해시 2개 기재 + DoD 3개 [x] + 텍스트 `[Codex]`→`[B_Kai]` + 이력 이름 수정. 신규 위반 아님 (2-커밋 패턴 Advisory). |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — IMP-032 다국어 번역 CI 게이트 발령. B_Kai 신규 할당 중단 해제 후 첫 Task |
| 2026-05-21 | B_Kai (OpenCode) | 구현 완료 — `1e5c07d`(feat) + `8a6cf8e`(docs). audit-i18n.ts·ORDER_STATUS_META i18n 전환·consumer 2곳 useTranslations. 207/209 PASS (2 pre-existing Ring TASK-033 버그). R-17 커밋 순서 ✅ |
| 2026-05-21 | Aiden (Claude) | ❌ 반려 (1차: 오진 정정) — 실제 이슈: 해시 `—` 미기재·DoD 3개 미체크·`[Codex]`→`[B_Kai]` 수정. 신규 위반 아님(2-커밋 패턴 Advisory). task file 단독 후속 커밋 지시 |
