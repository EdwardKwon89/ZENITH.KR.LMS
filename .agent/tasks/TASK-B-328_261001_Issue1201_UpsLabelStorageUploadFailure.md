# TASK-B-328: Issue #1201 — UPS 라벨 PDF Storage 업로드 실패 시 오진단성 오류 메시지 + 재시도 없음 (DEF-B-148)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1201](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1201) |
| **DEF** | [DEF-B-148](../defects/DEF-B-148_UPS라벨문서_Storage업로드실패_오류표출.md) |
| **배경** | Edward가 Vercel 운영 확인 중 목격 → Aiden 1차 분석(2026-09-30) → Jaison 심층 분석(2026-10-01) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-10-01 |
| **우선순위** | P2 (Medium) |
| **상태** | 🔔 리뷰 대기 |

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

- [x] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-328-ups-label-storage-upload-failure` 브랜치 생성(전용 워크트리 `ZENITH_LMS-worktrees/mike`, R-17 §0) — Issue #1201 제목에 TASK-B-328 명시 확인
- [x] ③ `markAllPackagesIssued()` 스킵 영향 실제 확인 — 결과: `confirmOutbound()`는 `intl_ref_locked`를 **강제 차단하지 않음**(누락 시 `pkgsWithoutIntlRef` 경고만 표시, 출고확정은 진행). 다만 UI(`OutboundProcessForm`)가 `intl_ref_locked` 기준으로 라벨 재발급을 유도하므로, SHXK 발급 성공 시 Storage 실패와 무관하게 마킹 수행하는 쪽으로 설계 변경
- [x] `downloadAndStoreLabelDoc()` 재시도+구조화 로깅 추가(①)
- [x] `fetchAndSaveLabel()`/`fetchAndIssueUpsLabel()`(docType 없음) 오류 구분(②)
- [x] `fetchShxkTradeDocument()`·`fetchAndIssueUpsLabel()`(docType 있음)는 손대지 않음 — TASK-B-327 스코프 중복 방지
- [x] 회귀 테스트 신설(R-09): `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` 7건 — 실제 `downloadAndStoreLabelDoc`/`fetchAndIssueUpsLabel` 호출 기반 behavioral, `readFileSync`+`toContain` 없음
- [x] `LIVE_REGRESSION_TEST_MAP.md` 갱신 (§60, TC-UPS-STG-01~07)
- [x] **독립 되돌리기 검증**: TeamB_Dev 원본으로 복원 시 신규 테스트 4건 FAIL(재시도 부재·빈 메시지·오진단성 메시지·마킹 스킵) → 수정본 복원 시 7/7 PASS 확인
- [x] `npm run test:regression` 직접 실행: **210 files / 1482 tests ALL PASS**
- [x] `npm run build` SUCCESS (Next.js 16.2.4, TypeScript 통과)
- [x] (R-10) behavioral mock 기반 검증 — 서버 액션 `fetchAndIssueUpsLabel` 실제 경로에서 Storage upload 실패 mock → 정확한 오류 메시지 + 재시도 로그(logger.error 구조화 payload) + `markAllPackagesIssued` 호출 확인. **운영 UI 실측 스크린샷은 미수행**(로컬에서 Storage를 인위 실패시킬 환경 부재 — 테스트가 서버 액션 전체 경로를 mock 검증한 것으로 대체)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-328 UPS 라벨 Storage 업로드 실패 오류 메시지·재시도 개선 (DEF-B-148)` → 2. task file `[작업 결과]` 작성 + 상태 🔔 → 3. `gh issue edit 1201 --add-label status:review --remove-label status:in-progress` → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR 생성(`feature/* → TeamB_Dev`, `Closes #1201`)

## 담당자 위반 이력 사전 경고

**Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수.
- 공유 workspace 브랜치 오염 2회, 채번 절차 누락 2회, 테스트가 실제 수정 대상 검증 못함(위양성) 2회 이력 있음(각 유형 할당 중단 기준 3회에 1회씩 남은 상태).
- 특히 "테스트 타겟 오류" 이력 때문에 이번 회귀 테스트는 **반드시 실제 `fetchAndSaveLabel`/`fetchAndIssueUpsLabel`을 호출**해서 검증할 것 — mock 대상 함수 경로가 실제 프로덕션 코드 구조와 일치하는지 작성 후 스스로 재확인.
- 오랜만의 배정(마지막 TASK-B-317, 2026-08-17)이므로 브랜치/워크트리 재동기화(`agent-worktree-init.sh` 등) 꼼꼼히 확인.

## [작업 결과]

### 수정 요약

| 구분 | 내용 |
|:-----|:------|
| **이슈/DEF** | Issue #1201 / DEF-B-148 |
| **브랜치** | `feature/teamb-328-ups-label-storage-upload-failure` (워크트리 `ZENITH_LMS-worktrees/mike` 격리) |
| **수정 파일** | `src/app/actions/operations/ups-labels.ts` |
| **신규 테스트** | `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts` (7건) |
| **문서** | `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` §60 |

### ① `downloadAndStoreLabelDoc()` 공통 개선

- Storage 업로드 실패 시 **1회 재시도**(500ms backoff, 단순 재호출 — 별도 라이브러리 없음)
- 실패 시 `uploadError` 객체 전체를 `describeStorageError()`로 구조화해 `logger.error`에 기록(own property 순회 + message/error/statusCode/hint/details 보강)
- `uploadError.message`가 빈 문자열이던 사례(DEF-B-148 `<none>`) 대응: throw 메시지에 `.message`가 비어있으면 **객체 전체 JSON**을 포함해 근본원인 진단 가능하게 함
- 3개 호출부(`fetchAndSaveLabel`, `fetchAndIssueUpsLabel` docType 있음, `fetchShxkTradeDocument`) 공통 적용 — 스코프상 TASK-B-327에도 이득

### ② `fetchAndSaveLabel()` 반환 타입 확장 + 오류 구분

```ts
// before: Promise<string | null>
// after:
Promise<{ signedUrl: string | null; getNewLabelFailed: boolean }>
```

- `getNewLabelFailed: true` (SHXK getnewlabel 자체 실패) → 기존 메시지 유지: `'라벨 발급 실패 (getnewlabel)'`
- `getNewLabelFailed: false` + `signedUrl: null` (Storage 저장만 실패) → 정확한 메시지: `'배송 처리는 완료되었으나 라벨 문서 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'`
- **스코프 준수**: `fetchShxkTradeDocument()`(무역서류 관리 경로) 및 `fetchAndIssueUpsLabel()` docType 있음 분기의 개별 메시지는 건드리지 않음(TASK-B-327과 중복/충돌 방지)

### ③ `markAllPackagesIssued()` 스킵 영향 확인 결과 + 설계 변경

**코드 분석 확인**:
- `confirmOutbound()`(`src/app/actions/operations/warehouse.ts`)는 `intl_ref_no`/`intl_ref_locked`를 **필수 조건으로 차단하지 않음** — 누락 시 `pkgsWithoutIntlRef` 카운트만 반환해 UI 경고 토스트 표시, 출고확정 자체는 진행됨
- 다만 `OutboundProcessForm.tsx`가 `intl_ref_locked` 기준으로 라벨 재발급을 유도하므로, Storage 실패로 마킹이 스킵되면 사용자가 "라벨 미발급" 상태로 오인하고 재발급을 시도하게 됨

**설계 변경(반영됨)**:
- SHXK `getnewlabel` **발급 성공**(`getNewLabelFailed: false`)인 경우 Storage 저장 성공/실패와 무관하게 `markAllPackagesIssued()`를 먼저 호출
- 패키지 `intl_ref_no`/`intl_ref_locked`는 트래킹 번호가 유통하는 동안 보존되어야 하므로 문서 아카이빙 실패와 분리 처리
- Storage 실패 시에도 메시지에 "배송 처리는 완료" 사실을 명시해 사용자 오인 제거

### 검증 결과

| 항목 | 결과 |
|:-----|:-----|
| 신규 회귀 테스트 | **7/7 PASS** (behavioral, 실제 서버 액션 호출) |
| 전체 회귀 테스트 | **210 files / 1482 tests ALL PASS** (`npm run test:regression`) |
| 빌드 | **SUCCESS** (`npm run build`, Next.js 16.2.4 + TypeScript 통과) |
| 독립 되돌리기 검증 | TeamB_Dev 원본 복원 시 신규 테스트 **4건 FAIL**(재시도 upload 1회 호출·빈 메시지 `"PDF 업로드 실패: "`·오진단성 `"라벨 발급 실패 (getnewlabel)"`·마킹 미수행) → 수정본 복원 시 7/7 PASS. 테스트가 실제 수정 대상을 검증함을 확인 |
| 기존 UPS 래블 관련 테스트 | `ups-labels-download-store` / `ups-labels-split` / `ups-labels-combined-doctype` / `ups-labels-agency-permission` 전건 PASS(31건) |

### 테스트 설계 (위양성 방지)

- `readFileSync`+`toContain()` 소스 문자열 검사 **미사용** (Mike 반복 위반 이력 관련 자가검증)
- `downloadAndStoreLabelDoc` 직접 호출: upload mock 시퀀스로 재시도 횟수·구조화 로깅 payload 검증
- `fetchAndIssueUpsLabel` 직접 호출(docType 없음): `getnewlabel` mock + Storage upload mock 조합으로 아래 4경로 구분 검증
  1. getnewlabel 성공 + Storage 실패 → 정확한 메시지 + `zen_order_packages` update 호출(마킹 수행)
  2. getnewlabel 실패 → 기존 메시지 + 마킹 미수행 + Storage 미호출
  3. 전 성공 → signed URL + 마킹 수행
  4. 교차 검증: getnewlabel 실패 시 Storage upload 호출 자체 없음

### 커밋

- **코드 커밋**: `e6534fca00c637768f4a2c9b70643fbbd5ecc323` — `[Mike] fix: TASK-B-328 UPS 라벨 Storage 업로드 실패 오류 메시지·재시도 개선 (DEF-B-148)`
  - 포함: `src/app/actions/operations/ups-labels.ts`, `tests/unit/ups/defb148-ups-label-storage-upload-retry.test.ts`, `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`

## [발견 이슈]

1. **`uploadError.message` 빈 문자열 근본원인은 여전히 미상** — 이번 수정으로 재발 시 구조화 로그(statusCode/error/hint/details 포함)에 객체 전체가 남아 진단 가능해졌으나, 원래 StorageError가 왜 빈 message를 반환했는지(네트워크 중단/타임아웃/권한/버킷 정책 중 무엇)는 운영 로그에서 확인 전. 다음 재발 시 Vercel 로그의 `[downloadAndStoreLabelDoc] Storage upload failed` payload를 확인할 것.
2. **R-10 운영 UI 실측 미수행** — 로컬/워크트리 환경에서 Supabase Storage를 인위 실패시킬 수단이 없어, 서버 액션 전체 경로 behavioral mock으로 대체. 운영 배포 후 동일 경로 재현 시 스크린샷·로그 추가 첨부 바람.
3. `fetchAndIssueUpsLabel`의 docType 있음 분기(L492) 및 `fetchShxkTradeDocument`(L787 근방)의 개별 오류 메시지("발급된 문서 저장 실패"/"문서 다운로드/저장 실패")는 이번 스코프 밖 — TASK-B-327 담당.
