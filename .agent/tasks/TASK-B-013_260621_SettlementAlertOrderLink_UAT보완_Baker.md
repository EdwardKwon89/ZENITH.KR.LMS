# TASK-B-013 — SettlementReconciliationAlert 오더 링크 + Agency SPR-06 UAT 시나리오 보완

> **TASK-ID**: TASK-B-013  
> **생성일**: 2026-06-21  
> **발령자**: Jaison (Team B 총괄)  
> **담당 Agent**: Baker (Big Pickle)  
> **우선순위**: P3  
> **관련 IMP**: IMP-129  
> **GitHub Issue**: [#50](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/50)  
> **브랜치**: `feature/teamb-task-b-013-alert-link-uat`  
> **상태**: 🔔

---

## [업무 개요]

2개의 소규모 개선 작업을 병합하여 처리합니다.

### §1. `SettlementReconciliationAlert` 오더 상세 링크 추가

현재 미가격 오더 알림에서 오더번호가 텍스트로만 표시됩니다. 클릭 시 해당 오더 상세 페이지로 이동하는 링크를 추가합니다.

### §2. Agency SPR-06 UAT 시나리오 보완

TASK-161(Riley, 2026-06-19)에서 작성된 Phase 7 UAT(UAT-15~20)가 SPR-06 기능(TASK-B-010·011) 출시 전에 작성되어 아래 두 기능의 UAT 시나리오가 없습니다.

- **TASK-B-010**: Agency 정산 오더번호 검색 (ILIKE 검색 + 검색 결과 표시)
- **TASK-B-011**: Agency 정산 Reconciliation 알림 (미가격 오더 뱃지 + collapsible 목록)

---

## [전제조건]

| 조건 | 상태 |
|:----|:----:|
| TASK-B-010 PR#62 develop 머지 완료 | ✅ |
| TASK-B-011 PR#63 develop 머지 완료 | ✅ |

---

## [구현 명세]

### §1. `SettlementReconciliationAlert.tsx` — 오더 링크 추가

**파일**: `src/app/[locale]/(dashboard)/agency/settlements/SettlementReconciliationAlert.tsx`

현재 `UnpricedOrder` 인터페이스에 `orderId`가 없어 링크 생성 불가. 아래와 같이 수정합니다.

#### 수정 1: `UnpricedOrder` 인터페이스에 `orderId` 추가

```typescript
interface UnpricedOrder {
  orderId: string;   // ← 추가
  orderNo: string;
  shipperName: string;
  createdAt: string;
}
```

> `getAgencyUnpricedOrders`가 `orderId`를 이미 반환하므로 서버 액션 수정 불필요.  
> `AgencySettlementClient.tsx`는 `unpricedOrders` 전체를 그대로 전달 — 수정 불필요.

#### 수정 2: 오더번호에 Link 추가

```tsx
import Link from 'next/link';
import { useLocale } from 'next-intl';

// 컴포넌트 내부
const locale = useLocale();

// 오더 목록 렌더링 (현재 li 내부)
// 현재:
<span className="font-mono font-medium">{o.orderNo}</span>

// 수정 후:
<Link
  href={`/${locale}/orders/${o.orderId}`}
  className="font-mono font-medium text-amber-900 hover:underline"
>
  {o.orderNo}
</Link>
```

> **ZEN_A4**: 현재 44줄 → 수정 후 약 48줄 (50줄 이하 준수)

### §2. UAT 시나리오 추가

**파일**: `docs/99_Manual/UAT/UAT_16_Agency정산조회.md` (또는 신규 `UAT_17_Agency정산SPR06.md`)

> 기존 UAT 파일 구조 확인 후 적절한 위치에 추가. TASK-161에서 UAT-15~20이 이미 있으므로 UAT-21 이후 번호 사용 또는 기존 UAT-16(Agency 정산) 내에 시나리오 추가.

#### 추가할 시나리오 (최소 4건)

| UAT-ID | 기능 | 시나리오 | 기대 결과 |
|:------:|:----|:--------|:---------|
| UAT-16-NNN | Agency 정산 오더번호 검색 | 오더번호 일부 입력 → 조회 | 입력값 포함 오더만 테이블에 표시 |
| UAT-16-NNN | Agency 정산 오더번호 검색 | 존재하지 않는 오더번호 입력 → 조회 | 결과 없음 표시 |
| UAT-16-NNN | Agency 정산 Reconciliation | 미가격 오더 존재 Agency 로그인 → 정산 조회 | 상단 알림 뱃지 표시 + 클릭 시 목록 펼침 |
| UAT-16-NNN | Agency 정산 Reconciliation | 모든 오더 가격 책정된 Agency 로그인 → 정산 조회 | 알림 미표시 |

> UAT_MASTER.md 갱신 필수

---

## [ZEN_A4 준수 사항]

- `SettlementReconciliationAlert.tsx`: 수정 후 ≤50줄 필수 확인
- UAT 문서: `.md` 파일 Hard Limit 1,000줄 준수

---

## [착수 절차 (R-17 v2.0 §0)]

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-013-alert-link-uat
```

---

## [완료 보고 절차 (R-17 v2.0)]

1. `[BP] feat: TASK-B-013 §1 SettlementReconciliationAlert 오더 링크 추가 (IMP-129)` — 코드 파일만
2. `[BP] docs: TASK-B-013 §2 Agency SPR-06 UAT 시나리오 보완` — UAT 문서 커밋
3. 본 파일 `[작업 결과]` 섹션 기록 + 상태 🔔 변경
4. `ACTIVE_TASK.md` 상태 🔄→🔔 반영
5. `scratch/IMP_PROGRESS.md` IMP-129 행 🔔 갱신
6. `check-R17-DoD` 실행 → 전항목 통과 후 문서 커밋
7. `[BP] docs: TASK-B-013 완료 보고 — task file 🔔`
8. PR 생성 `feature/teamb-task-b-013-alert-link-uat → develop`, `Closes #50`

---

## [DoD 체크리스트]

- [x] `SettlementReconciliationAlert.tsx` — `orderId` 필드 추가 + 오더번호 Link 연결
- [x] `SettlementReconciliationAlert.tsx` — ≤50줄 ZEN_A4 준수 확인
- [x] UAT 시나리오 4건 이상 추가 (오더번호 검색 2건 + Reconciliation 2건)
- [x] `UAT_MASTER.md` 시나리오 수 갱신
- [x] 회귀 테스트 전체 PASS (`rtk npm run test:regression`)
- [x] 코드 커밋 해시 기재 (`§1 feat 커밋`)
- [x] 문서 커밋 해시 기재 (`§2 docs 커밋`)
- [x] PR 생성 완료 (`Closes #50`)

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
| §1 코드 커밋 | `eb7a959` |
| §2 문서 커밋 | `f5b1c04` |
| 회귀 결과 | 375 PASS / 7 SKIP / 2 FAIL (기존 Supabase 타임아웃, 변경無 영향) |
| PR | [#67](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/67) |

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-21 | Jaison (Claude, Team B) | Task 발령 — §1 SettlementReconciliationAlert 링크, §2 SPR-06 UAT 보완 |
| 2026-06-21 | Baker (Big Pickle) | §1 코드 커밋 eb7a959 · §2 문서 커밋 f5b1c04 · 회귀 375/384 (2 FAIL pre-existing) |
