# TASK-B-304 — UPS 진행상태 스테퍼: 취소/보류 시각 표출 + 단계별 시각 위치 조정

| 항목 | 내용 |
|:-----|:------|
| **생성일** | 2026-08-14 |
| **담당** | Dave (구현) · Jaison (검토) |
| **우선순위** | P3 |
| **GitHub Issue** | [#1128](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1128) |
| **관련 결함** | 없음(JSJung 직접 요청) |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 배경

JSJung 질문("취소 로그도 저장하고 있어?")에 Jaison이 확인한 결과: `order_status_history`는 `update_order_status_atomic` RPC의 무조건 INSERT(5단계) 덕분에 CANCELED/HELD 포함 **모든 전이를 이미 기록**하고 있음(reason 컬럼 포함). 하지만 `UpsOrderStatusStepper.tsx`는 CANCELED/HELD일 때 7단계 스테퍼 전체를 감추고 시각·사유 없는 정적 배너로 대체해 이 데이터가 화면에 전혀 노출되지 않음을 확인.

Jaison이 구조 전체를 갈아엎는 안(B안: 실이력 기반 타임라인 통합)도 제시했으나, JSJung 확정 방향은 **현재 구조를 그대로 유지**하는 최소 변경:
1. 정상 스텝 시각 표시 위치를 "Step Indicator Dot/Line" 바 **아래로** 이동(현재는 바 위)
2. CANCELED/HELD 배너에 실제 전이 시각을 추가하되, 정상 스텝 시각(회색)과 **구분되는 색**으로 표출(등록/취소를 시각적으로 구분)

## 조사 결과 — 참고(색상 불일치, 이번 범위 아님)

앱 전역 캐노니컬 상태 색상(`ORDER_STATUS_META`/`ZenStatusBadge`)과 이 컴포넌트의 배너 색상(rose/amber)이 서로 다르고, 같은 화면 우측 "주문 상태" 뱃지도 상태 무관 amber 고정인 것을 확인했으나 **이번 작업 범위 아님** — JSJung이 현재 구조 유지를 택했으므로 기존 rose(CANCELED)/amber(HELD) 배너 색 그대로 사용. 색상 통일 이슈는 별도 요청 시 처리.

## 작업 범위

파일: `src/components/ups/UpsOrderStatusStepper.tsx` (단일 파일)

### ① 정상 스텝 시각 표시 위치 — 바 아래로 이동

**현재** (L213-231, `stageTime` 블록이 "Step Label" 다음·"Step Indicator Dot/Line" **이전**에 위치):
```tsx
{/* TASK-B-301 (Issue #1121): 단계별 전이 시각 (미도달 단계는 미표시) */}
{stageTime && (
  <span className="text-[9px] text-slate-400 leading-tight">
    {stageTime}
  </span>
)}

{/* Step Indicator Dot / Line */}
<div className="w-full flex items-center justify-center gap-1 mt-1">
  <span className={`h-1 rounded-full w-full ${...}`} />
</div>
```

**변경**: 두 블록 순서를 바꿔 "Step Indicator Dot/Line" 바가 먼저, `stageTime`이 그 아래로:
```tsx
{/* Step Indicator Dot / Line */}
<div className="w-full flex items-center justify-center gap-1 mt-1">
  <span className={`h-1 rounded-full w-full ${...}`} />
</div>

{/* TASK-B-304 (이전 TASK-B-301): 단계별 전이 시각 — 바 아래로 위치 이동 */}
{stageTime && (
  <span className="text-[9px] text-slate-400 leading-tight">
    {stageTime}
  </span>
)}
```
로직(어떤 시각을 표시할지 판정하는 `stageCreatedAt`/`stageTime` 계산, L173-179)은 변경 없음 — 순수 렌더링 순서만 이동.

### ② CANCELED/HELD 배너에 전이 시각 추가 (등록 시각과 구분되는 색)

**신규 계산**(배너 렌더 앞부분, `isCanceled`/`isHeld` 선언부 근처에 추가):
```ts
// TASK-B-304: CANCELED/HELD 전이 시각 (order_status_history에서 현재 상태로의 전이 중 가장 최근 것)
const exceptionCreatedAt = [...(statusHistory ?? [])].reverse().find((h) => h.next_status === currentStatus)?.created_at;
let exceptionTime = '';
if (exceptionCreatedAt) {
  const parsed = new Date(exceptionCreatedAt);
  if (!isNaN(parsed.getTime())) exceptionTime = parsed.toLocaleString('ko-KR');
}
```

**CANCELED 배너 변경**(L150-155):
```tsx
{isCanceled && (
  <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
    <div className="flex flex-col gap-0.5">
      <span>본 오더는 현재 <strong className="font-bold">취소(CANCELED)</strong> 처리되었습니다.</span>
      {exceptionTime && (
        <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400">취소 일시: {exceptionTime}</span>
      )}
    </div>
  </div>
)}
```

**HELD 배너도 동일 패턴 적용**(L157-162, amber 색 유지) — CANCELED만 처리하면 동일한 "시각 데이터는 있는데 화면에 없음" 격차가 HELD에 그대로 남으므로, 같은 작업 안에서 함께 처리(효과가 동일한 코드 패턴이라 추가 비용 거의 없음):
```tsx
{isHeld && (
  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-300">
    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
    <div className="flex flex-col gap-0.5">
      <span>본 오더는 현재 <strong className="font-bold">보류(HELD)</strong> 상태입니다. 사유 해제 후 진행됩니다.</span>
      {exceptionTime && (
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">보류 일시: {exceptionTime}</span>
      )}
    </div>
  </div>
)}
```

**"등록/취소 구분되게 표출" 반영 방식**: 정상 스텝 시각(①, 회색 `text-slate-400`, "언제 그 단계에 도달했는지"라는 중립적 정보)과 취소/보류 시각(②, 배너 색과 통일된 rose/amber, "예외 상황이 발생했다"는 경고성 정보)이 색으로 명확히 구분됨 — 별도 범례나 텍스트 라벨 없이 기존 배너의 경고 색상 관례를 그대로 시각에도 확장하는 최소 방식.

과설계 금지 — 사유(`reason`) 표시, 색상 체계 전면 통일(조사 결과 섹션 참고), 배너-스테퍼 구조 통합은 전부 범위 밖.

## 회귀 테스트 방향

- 정상 스텝 시각이 바 아래(Step Indicator Dot/Line 다음)에 렌더링되는지 (DOM 순서 검증)
- CANCELED 상태 오더에서 배너에 "취소 일시: ..." 텍스트가 표시되는지, 색이 rose 계열인지
- HELD 상태 오더에서 배너에 "보류 일시: ..." 텍스트가 표시되는지, 색이 amber 계열인지
- `statusHistory`에 CANCELED/HELD 전이 이력이 없을 때(예: 데이터 누락) 시각 텍스트 자체가 렌더링되지 않는지(빈 문자열/Invalid Date 미노출 — 기존 TASK-B-301 가드 패턴 재사용)
- 같은 상태로 재전이된 이력이 여러 건일 때 가장 최근 것이 표시되는지(TASK-B-301의 `reverse().find()` 패턴 재사용 확인)
- 전체 회귀 PASS + `LIVE_REGRESSION_TEST_MAP.md` 갱신(R-09)
- **독립 되돌리기 검증 필수** — ①위치 이동 되돌리면 순서 검증 테스트 FAIL ②배너 시각 추가 제거하면 표시 검증 테스트 FAIL

## R-10 (실 UI 검증)

- 실제 CANCELED 오더(또는 테스트로 상태 전이)로 배너에 취소 일시가 rose 색으로 표시되는지 스크린샷
- 정상 진행 중인 UPS 오더에서 단계별 시각이 바 아래쪽에 표시되는지 스크린샷(레이아웃 확인)

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `baa9c1f5` | `[Dave] feat: TASK-B-304 UPS 스테퍼 취소/보류 시각 표출 + 단계별 시각 위치 바 아래로 이동 (Issue #1128)` |

### ① 정상 스텝 시각 표시 위치 — 바 아래로 이동

`UpsOrderStatusStepper.tsx` 단일 파일. 설계 확정대로 **순수 렌더링 순서만 이동**:
- "Step Label" → **"Step Indicator Dot/Line" 바 → `stageTime`** 순서로 변경 (기존은 시각이 바 위)
- `stageCreatedAt`/`stageTime` 계산 로직(L173-179)은 무변경

### ② CANCELED/HELD 배너에 전이 시각 추가

- **신규 계산**: `exceptionCreatedAt = [...(statusHistory ?? [])].reverse().find((h) => h.next_status === currentStatus)?.created_at` → `toLocaleString('ko-KR')`, Invalid Date 가드(빈 문자열)
- **CANCELED 배너**: `취소 일시: {exceptionTime}` — `text-rose-500 dark:text-rose-400` (배너 rose 계열과 통일, 정상 시각 text-slate-400과 구분)
- **HELD 배너**: `보류 일시: {exceptionTime}` — `text-amber-600 dark:text-amber-400` (동일 패턴, amber 계열)
- 7단계 스테퍼 숨김 구조(`!isCanceled`)는 유지 — CANCELED만 스테퍼 숨김, HELD는 기존대로 유지 (기존 동작 무변경)

### 회귀 테스트 (7건 신설, 실제 컴포넌트 렌더링 — mock 금지)

`tests/unit/ups/ups-stepper-b304.test.tsx` (UpsOrderStatusStepper 직접 렌더)

| TC | 내용 |
|:---|:-----|
| TC-B304-01-01 | 단계별 시각이 Step Indicator Dot/Line 바 **아래**에 렌더 (DOM 순서 검증) |
| TC-B304-01-02 | 시각 있는 모든 스텝(IN_TRANSIT 포함) indicator 바 아래 확인 |
| TC-B304-02-01 | CANCELED 배너 "취소 일시" rose 계열 표시 + 7단계 스테퍼 숨김 유지 |
| TC-B304-02-02 | HELD 배너 "보류 일시" amber 계열 표시 + 7단계 스테퍼 유지 |
| TC-B304-02-03 | statusHistory에 CANCELED/HELD 이력 없으면 시각 미표시 (데이터 누락 가드) |
| TC-B304-02-04 | 같은 상태 재전이 이력 여러 건 → 가장 최근 것만 표시 (reverse().find()) |
| TC-B304-02-05 | Invalid Date created_at → 시각 미표시 (TASK-B-301 가드 패턴 재사용) |

### 독립 되돌리기 검증 (필수)

| 원복 대상 | 결과 |
|:----------|:-----|
| 시각 위치 이동 되돌림(바 위로 복원) | **TC-B304-01-01/01-02 2건 정확히 FAIL** (DOM 순서 역전) → 복원 후 PASS |
| CANCELED/HELD 배너 시각 표시 제거 | **TC-B304-02-01/02-02/02-04 3건 정확히 FAIL** → 복원 후 PASS |

### 검증

- `npm run test:regression`: **1360/1360 PASS** (197파일, 신규 +7 — 196→197파일)
- `npm run build`: SUCCESS
- 기존 스테퍼 관련 테스트(`ups-detail-b301`/`ups-detail-b300`) 포함 회귀 없음
- `LIVE_REGRESSION_TEST_MAP.md`에 TC-B304-01-01~02-04 6행 추가 (R-09)

### 환경 참고 (내 변경 아님 — DB 상태 이슈)

- 최초 회귀 실행 시 `iss1070-ups-warehoused-partial-edit.test.ts` TC-284-05(감사 로그) 1건 실패 — 로컬 DB 잔여 상태 문제(zen_order_edit_log 잔류 데이터)로 확인. `supabase db reset --local` 후 **해당 테스트 6/6 PASS** 재확인. 본 변경은 스테퍼 UI 컴포넌트 단일 파일이라 `updateOrder` 감사 로그 경로와 무관.

### (R-10) 라이브 브라우저 검증

Dave 환경 브라우저 부재 — 병합 후 JSJung 실브라우저 검증 요청: ①CANCELED 오더 배너에 취소 일시 rose 표시 ②정상 UPS 오더 단계별 시각이 바 아래 위치 확인(레이아웃). (자동화 회귀 테스트로 DOM 순서·시각 표시 검증 완료)

## [Jaison 최종 검토]

_(PR 제출 후 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| 이슈 | 내용 | 긴급도 |
|:----:|:-----|:------:|
| 색상 불일치 | `ORDER_STATUS_META`(캐노니컬)와 이 컴포넌트 배너 색상·"주문 상태" 뱃지(하드코딩 amber 고정) 3중 불일치 확인 — 이번 작업 범위 아님, JSJung 확인 후 별도 요청 시 처리 | Low |
