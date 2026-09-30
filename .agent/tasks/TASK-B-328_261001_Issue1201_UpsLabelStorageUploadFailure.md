# TASK-B-328: Issue #1201 — UPS 라벨 PDF Storage 업로드 실패 시 오진단성 오류 메시지 + 재시도 없음 (DEF-B-148)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1201](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1201) |
| **DEF** | [DEF-B-148](../defects/DEF-B-148_UPS라벨문서_Storage업로드실패_오류표출.md) |
| **배경** | Edward가 Vercel 운영 확인 중 목격 → Aiden 1차 분석(2026-09-30) → Jaison 심층 분석(2026-10-01) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-10-01 |
| **우선순위** | P2 (Medium) |
| **상태** | 🔄 진행 중 |

## 현재 상태 (Jaison 분석 완료)

오더 `ZEN-2026-000019` 처리 중 UPS 등록/트래킹 자체는 이미 성공했는데, PDF를 Supabase Storage(`invoices` 버킷)에 백업 저장하는 부가 단계만 실패해 `"PDF 업로드 실패: <none>"` 오류가 화면에 떴다. 실제 배송 처리(출고확정→운송중 전환)는 이후 정상 진행됨.

**핵심 발견 — 오류 메시지 자체가 사실과 다름(확정 버그)**: [`fetchAndIssueUpsLabel()` L428-429](../../src/app/actions/operations/ups-labels.ts#L428-L429)
```ts
const labelUrl = await fetchAndSaveLabel(supabase, label.reference_no, orderId, label.id);
if (!labelUrl) return { success: false, error: '라벨 발급 실패 (getnewlabel)' };
```
[`fetchAndSaveLabel()`](../../src/app/actions/operations/ups-labels.ts#L225-L273)은 **"SHXK getnewlabel 자체 실패"**와 **"getnewlabel은 성공했지만 Storage 저장만 실패"** 두 가지를 구분 없이 똑같이 `null`로 반환 → 이번 사례(후자)에도 "라벨 발급 실패 (getnewlabel)"라는 틀린 메시지가 뜸.

**부수 확인 필요**: 같은 함수의 [L431-432](../../src/app/actions/operations/ups-labels.ts#L431-L432) — `labelUrl`이 없으면 `markAllPackagesIssued()`(패키지 `intl_ref_no`/`intl_ref_locked` 설정) 호출 전에 조기 반환됨. Storage 실패 시 패키지 마킹이 실제로 스킵되는지, 스킵되면 출고확정 등 후속 처리에 실제 영향이 있는지 **재현 확인이 안 된 상태** — 이번 사례에서는 이후 출고확정이 정상 진행됐다고 보고됐으나 원인(재시도 성공인지, 다른 경로인지) 불명.

**`uploadError.message`가 빈 문자열인 이유**: 근본원인 미상 — 현재 로깅이 `.message`만 남기고 객체 전체를 안 남겨서 진단 불가. 이게 이번 1회성 사건보다 더 큰 문제(재발해도 원인 추적 불가능한 상태가 계속됨).

**동일 함수 공유 주의**: `downloadAndStoreLabelDoc()`은 `fetchAndSaveLabel()`(이번 건) 외에 `fetchAndIssueUpsLabel()`(docType 있음)과 `fetchShxkTradeDocument()`(DEF-B-147/TASK-B-327이 다루는 "무역서류 관리" 버튼 경로)에서도 호출됨 — **공통 헬퍼 수정은 양쪽에 이득이지만, 개별 호출부 오류 메시지 문구는 TASK-B-327과 스코프가 겹치지 않게 이 Task는 `fetchAndSaveLabel`/`fetchAndIssueUpsLabel`(docType 없음) 경로만 수정**.

## 수정 방향

### ① `downloadAndStoreLabelDoc()` 공통 개선 — 3개 호출부 전체에 이득
- Storage 업로드 실패 시 `uploadError` 객체 전체를 구조화 로깅(`logger.error`에 `JSON.stringify(uploadError)` 또는 객체 그대로 전달 — 기존 `logger` 인터페이스 확인 후 구조화 필드 지원하면 그쪽 사용)
- 1회 재시도(짧은 backoff, 예: 500ms) 후에도 실패하면 그때 throw — 재시도 로직은 과설계 없이 최소 구현(단순 for-loop, 별도 라이브러리 불요)

### ② `fetchAndSaveLabel()` 반환 타입 확장 — 실패 원인 구분
```ts
// before: Promise<string | null>
// after:
async function fetchAndSaveLabel(...): Promise<{ signedUrl: string | null; getNewLabelFailed: boolean }> {
  // labelRes.success !== 1 인 경우 → { signedUrl: null, getNewLabelFailed: true }
  // getnewlabel 성공, storage 전부 실패 → { signedUrl: null, getNewLabelFailed: false }
}
```
호출부(`fetchAndIssueUpsLabel`, docType 없는 분기)에서 `getNewLabelFailed` 값에 따라 에러 메시지 분기:
- `true`: 기존대로 `'라벨 발급 실패 (getnewlabel)'`
- `false`: `'배송 처리는 완료되었으나 라벨 문서 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'`(정확한 한글 문구는 담당자 재량, 핵심은 "배송 자체는 문제없다"는 사실 전달)

### ③ `markAllPackagesIssued()` 스킵 영향 실제 확인 (필수, 착수 전)
Storage 실패로 `fetchAndSaveLabel`이 실패값을 반환하는 상황을 실제로 재현(mock)해서 `markAllPackagesIssued()`가 스킵되는 게 맞는지, 스킵됐을 때 `confirmOutbound()`(출고확정)가 실제로 `intl_ref_locked`를 요구하는지 확인. **요구한다면** Storage 실패와 무관하게 `markAllPackagesIssued()`를 먼저 호출하도록 순서 조정 필요(설계 변경) — 확인 결과를 `[작업 결과]`에 반드리 기재.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-328-ups-label-storage-upload-failure` 브랜치 생성(전용 워크트리, R-17 §0) — `next-task-number.sh B` 결과가 stale할 수 있음(2026-09-13 TASK-B-318 사례), GitHub Issue 제목 검색으로 328이 맞는지 재확인(이번엔 Issue #1201 제목에 이미 TASK-B-328로 명시돼 있어 확인 용이)
- [ ] ③ `markAllPackagesIssued()` 스킵 영향 실제 확인(필수, 위 참조) — 결과에 따라 설계 조정 여부 판단
- [ ] `downloadAndStoreLabelDoc()` 재시도+구조화 로깅 추가(①)
- [ ] `fetchAndSaveLabel()`/`fetchAndIssueUpsLabel()`(docType 없음) 오류 구분(②)
- [ ] `fetchShxkTradeDocument()`·`fetchAndIssueUpsLabel()`(docType 있음)는 손대지 말 것 — TASK-B-327 스코프와 중복 방지(공통 헬퍼 `downloadAndStoreLabelDoc()` 수정은 그대로 이득이 감)
- [ ] 회귀 테스트 신설(R-09): Storage 업로드 mock 실패 → 재시도 1회 확인, 실패 원인 구분(getNewLabelFailed) 검증, 실제 함수 호출 기반(`toContain`·함수 존재 확인 금지)
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [ ] **독립 되돌리기 검증**: 수정 원복 시 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 UI에서 Storage 업로드를 인위적으로 실패시켜(또는 mock) 정확한 오류 메시지가 뜨는지, 재시도 로그가 남는지 확인, 스크린샷/로그 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-328 UPS 라벨 Storage 업로드 실패 오류 메시지·재시도 개선 (DEF-B-148)` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재, ③ 확인 결과 포함) + 상태 🔔 → 3. `gh issue edit 1201 --add-label status:review --remove-label status:in-progress` → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR 생성(`feature/* → TeamB_Dev`, `Closes #1201`)

## 담당자 위반 이력 사전 경고

**Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수.
- 공유 workspace 브랜치 오염 2회, 채번 절차 누락 2회, 테스트가 실제 수정 대상 검증 못함(위양성) 2회 이력 있음(각 유형 할당 중단 기준 3회에 1회씩 남은 상태).
- 특히 "테스트 타겟 오류" 이력 때문에 이번 회귀 테스트는 **반드시 실제 `fetchAndSaveLabel`/`fetchAndIssueUpsLabel`을 호출**해서 검증할 것 — mock 대상 함수 경로가 실제 프로덕션 코드 구조와 일치하는지 작성 후 스스로 재확인.
- 오랜만의 배정(마지막 TASK-B-317, 2026-08-17)이므로 브랜치/워크트리 재동기화(`agent-worktree-init.sh` 등) 꼼꼼히 확인.

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
