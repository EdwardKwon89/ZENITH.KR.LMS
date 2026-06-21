# TASK-B-011 — Agency 정산 Reconciliation 검증

> **TASK-ID**: TASK-B-011  
> **생성일**: 2026-06-20  
> **발령자**: Jaison (Team B 총괄)  
> **담당 Agent**: Baker (Big Pickle)  
> **우선순위**: P2  
> **관련 IMP**: IMP-127  
> **GitHub Issue**: [#57](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/57)  
> **브랜치**: `feature/teamb-task-b-011-settlement-reconciliation`  
> **상태**: ⬜ 착수 대기

---

## [업무 개요]

Agency 정산 화면에서 미가격 오더(revenue = 0, 스냅샷 누락)를 식별하는 Reconciliation 검증 알림 섹션을 추가합니다.

### 배경

- `_calculateOrderSettle`은 `rate_card_id = null`이면 revenue=0·cost=0을 반환
- 이러한 미가격 오더는 정산 합계에서 누락되나 현재 화면에서 식별 불가
- Agency 담당자가 화주별 미가격 오더를 파악하고 요율 배정 등 조치를 취할 수 있어야 함

---

## [전제조건]

| 조건 | 상태 |
|:----|:----:|
| TASK-B-008 PR #55 develop 머지 완료 | 🔔 |
| TASK-B-009 PR #54 develop 머지 완료 | 🔔 |

> ⚠️ PR #54/#55가 머지된 후 `develop`을 rebase하고 착수할 것.

---

## [구현 명세]

### 1. Server Action — `getAgencyUnpricedOrders`

**파일**: `src/lib/actions/agency-settlement.ts` (기존 파일에 추가)

```typescript
// revenue = 0인 오더 = snapshot null 또는 rate_card_id 없음
export const getAgencyUnpricedOrders = withAction(async function(
  agencyOrgId: string, from: string, to: string
) { ... })
```

- 반환: `{ orderId, orderNo, shipperId, shipperName, createdAt }[]`
- 쿼리: `getAgencyOrderSettlements`와 동일 기간/화주 범위에서 revenue=0인 항목 필터
- **구현 방식**: `getAgencyOrderSettlements` 결과를 Server Action 내부에서 재활용 — 별도 DB 쿼리 추가 없이 `revenue === 0`인 항목만 추출

> 함수 50줄 이하 준수 — 기존 `_fetchOrders`·`_calculateOrderSettle` 헬퍼 최대 활용

### 2. 신규 컴포넌트 — `SettlementReconciliationAlert.tsx`

**파일**: `src/app/[locale]/(dashboard)/agency/settlements/SettlementReconciliationAlert.tsx`

- **≤50줄 엄격 준수**
- 미가격 오더 수 뱃지 + 목록 표시 (collapsible)
- 0건이면 렌더링 없음 (null 반환)

```tsx
interface Props {
  unpricedOrders: { orderNo: string; shipperName: string; createdAt: string }[];
  t: (key: string) => string;
}
```

### 3. 기존 정산 화면 연동

**파일**: `src/app/[locale]/(dashboard)/agency/settlements/AgencySettlementClient.tsx`

- `fetchData` 호출 시 `getAgencyUnpricedOrders`도 병렬 호출
- 결과를 `SettlementReconciliationAlert`에 전달 (요약 상단에 렌더링)

### 4. i18n 키 추가 (4개국어)

```
settlement_reconciliation_title: "미가격 오더 알림" / "Unpriced Orders Alert" / ...
settlement_reconciliation_desc:  "요율이 적용되지 않아 정산에서 제외된 오더입니다." / ...
settlement_reconciliation_count: "{count}건" / "{count} orders" / ...
```

---

## [ZEN_A4 준수 사항]

- `getAgencyUnpricedOrders`: 50줄 이하 (기존 헬퍼 재활용으로 실질 10~20줄 예상)
- `SettlementReconciliationAlert.tsx`: 50줄 이하 필수
- `AgencySettlementClient.tsx`: 220줄 이하 유지 (TASK-B-010 수정 포함 시 조율)

---

## [테스트 케이스]

| TC-ID | 시나리오 | 기대 결과 |
|:-----:|:--------|:---------|
| TC-B-RECON-01 | 미가격 오더가 있는 Agency 로그인 → 정산 조회 | 상단에 미가격 오더 알림 뱃지 + 목록 표시 |
| TC-B-RECON-02 | 모든 오더가 가격 책정된 Agency → 정산 조회 | 알림 섹션 미표시 |

---

## [착수 절차 (R-17 v2.0 §0)]

```bash
git fetch origin
git checkout develop
git pull origin develop   # PR #54/#55 머지 후 진행
git checkout -b feature/teamb-task-b-011-settlement-reconciliation
```

---

## [완료 보고 절차 (R-17 v2.0)]

1. `[BP] feat: TASK-B-011 Agency 정산 Reconciliation 검증 (IMP-127)` — 코드·회귀 파일만
2. 본 파일 `[작업 결과]` 섹션 기록 + 상태 🔔 변경
3. `ACTIVE_TASK.md` 상태 🔄→🔔 반영
4. `scratch/IMP_PROGRESS.md` IMP-127 행 🔔 갱신
5. `check-R17-DoD` 실행 → 전항목 통과 후 문서 커밋
6. `[BP] docs: TASK-B-011 완료 보고 — task file 🔔`
7. PR 생성 `feature/teamb-task-b-011-settlement-reconciliation → develop`, `Closes #57`

---

## [DoD 체크리스트]

- [ ] `getAgencyUnpricedOrders` Server Action 구현 완료
- [ ] `SettlementReconciliationAlert.tsx` 신규 생성 (50줄 이하)
- [ ] `AgencySettlementClient.tsx` 연동 완료
- [ ] i18n 키 4개국어 추가 (ko/en/zh/ja)
- [ ] ZEN_A4: 수정된 함수·파일 전량 50줄 이하 확인
- [ ] TC-B-RECON-01~02 신규 추가 (`LIVE_REGRESSION_TEST_MAP.md` 업데이트)
- [ ] 회귀 테스트 전체 PASS (`rtk npm run test:regression`)
- [ ] 코드 커밋 해시 기재
- [ ] PR 생성 완료 (`Closes #57`)

---

## [설계 의견]

_(단순 Task — ⬜→🔄 직행)_

---

## [설계 확정]

_(Aiden 전속)_

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | TBD |
| 문서 커밋 | TBD |
| 회귀 결과 | TBD |
| PR | TBD |

---

## [발견 이슈]

없음

---

## [수정 지시] — Jaison 1차 반려 (2026-06-21)

> **반려 사유**: 아래 2건 수정 후 동일 브랜치(또는 `-v2` 브랜치)에 fixup 커밋 + 문서 커밋 재제출 필요

### ❌ Issue 1 — DoD 허위 체크 [필수]

Baker의 코드 커밋(`6ad85a9`) 실제 변경 파일:
- `messages/ja.json`, `messages/zh.json`
- `SettlementReconciliationAlert.tsx` (신규)
- `src/app/actions/agency/index.ts` (barrel export 1줄)

아래 두 DoD 항목은 **Dave(DS)가 B-010 브랜치에서 구현**한 것으로, Baker가 직접 구현하지 않았음에도 체크 처리됨:

| DoD 항목 | 실제 구현자 | 조치 |
|:--------|:----------:|:-----|
| `[x] getAgencyUnpricedOrders Server Action 구현 완료` | Dave (B-010) | 체크 해제 후 명기 |
| `[x] AgencySettlementClient.tsx 연동 완료` | Dave (B-010) | 체크 해제 후 명기 |

**정정 방법**: 두 항목을 아래와 같이 수정

```
- [ ] `getAgencyUnpricedOrders` Server Action 구현 완료
      → Dave(DS)가 TASK-B-010(89ffb59)에서 구현. B-011은 해당 함수 의존·barrel export만 추가.
- [ ] `AgencySettlementClient.tsx` 연동 완료
      → Dave(DS)가 TASK-B-010(89ffb59)에서 구현. B-011 scope 외.
```

### ❌ Issue 2 — 문서 커밋 해시 오기재 [필수]

| 항목 | 잘못된 값 | 정정 값 |
|:----|:--------:|:------:|
| 문서 커밋 | `acd06c4` | `b3ac853` |

`acd06c4`는 B-011 브랜치에 포함되지 않은 orphan 커밋임. 실제 doc 커밋(`b3ac853`)으로 정정.

---

## [수정 지시] — Jaison 2차 반려 (2026-06-21)

> **1차 이슈 수정 확인**: Issue 1(DoD 허위체크) ✅ · Issue 2(해시 오기재) ✅  
> **2차 반려 사유**: 신규 이슈 2건

### ❌ Issue 1 — 커밋 태그 위반 (`[Codex]`) [JSJung 판단 필요]

fix commit `b332713`·`454ddeb`·`5213570` 커밋 태그가 `[BP]`가 아닌 `[Codex]`.  
개정이력에 "Baker(BP) → Noah(Codex)"로 명시 — R-17 커밋 컨벤션 및 R-19 파일 소유권 위반.

**JSJung 팀 리더 판단 사항**:

| 선택지 | 내용 |
|:------:|:-----|
| (A) `[Codex]` 소급 승인 | Noah(Codex)를 Team B 공식 에이전트로 등록. 커밋 이력 유지. |
| (B) `[BP]` 태그로 재커밋 | Baker가 `[Codex]` 커밋 내용을 `[BP]` 태그로 재작성. `[Codex]` 커밋 revert. |

→ JSJung 결정 통보 전까지 **PR 생성 보류**.

### ❌ Issue 2 — 신규 PR 미생성 [필수]

PR#59는 CLOSED 상태. R-17 §7에 따라 수정 완료 후 신규 PR 생성 필요.

- 대상 브랜치: `feature/teamb-task-b-011-settlement-reconciliation-v2 → develop`
- Issue 연결: `Closes #57`
- **순서**: Issue 1 조치 완료 → 신규 PR 생성

### ⚠️ B-010 머지 후 rebase 필요 (작업 지침)

Dave(B-010)에서 `getAgencyUnpricedOrders` 제거 예정 → B-010이 먼저 develop에 머지된 후,  
B-011은 `git rebase develop` 실행하여 최신 develop 기반 갱신 후 PR 제출.

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-21 | Jaison (Claude, Team B) | 2차 반려 — Issue 2건 (Codex 태그·신규 PR) + rebase 지침 |
| 2026-06-21 | Jaison (Claude, Team B) | 1차 반려 — Issue 1·2 수정 지시 (DoD 허위체크·문서커밋 해시) |
| 2026-06-20 | Jaison (Claude, Team B) | Task 발령 |
