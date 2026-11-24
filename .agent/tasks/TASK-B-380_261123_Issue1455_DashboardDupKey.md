# TASK-B-380 — 대시보드 React 중복 key 경고 해소 (#1455, DEF-B-163)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1455](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1455) (Jaison 배정 Mike · p3 · 원인 확정 후 바로 수정) |
| 담당 | **Mike (Worker)** / Auditor: **Jaison** · **PR은 `Refs #1455`** (Closes 금지 — 이슈 지시) |
| 브랜치 | `feature/teamb-task-b380-iss1455-dashboard-dup-key` (base: `origin/TeamB_Dev` `ebd2afa3d`) |
| 상태 | 🔔 완료 (PR 검토 대기) |
| 긴급도 | p3 (Low~Medium, DEF-B-163) |
| 환경 | 로컬 Supabase 한정 (R-14) |

## 채번 확인 (실측)

```bash
ls .agent/tasks | grep -i "B-38"    # → 없음 (신규 생성 · TASK-B-380 확정)
```

## [목표]

`/ko/dashboard`의 React 중복 key 콘솔 경고(DEF-B-163)를 **원인 실측 → 표시 중립 수정 → 실제 렌더 0건 단언**으로 해소한다. `ZenDataGrid` 공용 컴포넌트는 건드리지 않는다.

## [범위]

**수정**: `src/app/[locale]/(dashboard)/dashboard/page.tsx` — "Carrier" 컬럼에 `id: "carrier"` 지정(1줄 + 주석).
**신규**: `tests/e2e/e2e-33-b380-dashboard-dup-key.spec.ts` (3역할 실제 렌더 console.error 0건 단언 + error-logs).
**증적**: `docs/99_Manual/E2E_B380_Result/` (before/after ×3역할 스크린샷·JSON, 수정 전 표시값 실측).

**하지 않는 것**: `ZenDataGrid` key 방식 변경(19개 파일 영향) · 화면 표시 변경(의도 확인 회신 후) · DEF-B-164 · `scratch/`(R-15).

## [지켜야 할 것]

- **원인 실측 필수**: 컬럼 id 열거 + 같은 명령으로 수정 전/후 건수 비교 (소스 문자열 검사로만 단언 금지)
- **회귀**: 실제 렌더로 `console.error` 중복 key **0건** 단언 + **되돌리기 실측**(중복 컬럼으로 되돌리면 FAIL)
- **R-10**: 3역할 대시보드 스크린샷 + `/admin/error-logs` 신규 ERROR 無
- Public 저장소: 세부 노출 금지(재현은 DEF-B-163 재현 명령 인용 수준)

## [R-20 영향도] — GitNexus 미연결(`gitnexus` CLI not found) → `grep` 전수 (실측)

| 항목 | 명령 | 결과 |
|:--|:--|:--|
| `ZenDataGrid` 사용 파일 | `grep -rln "ZenDataGrid" src --include="*.tsx" \| wc -l` | **19개** — 단, 본 수정은 `ZenDataGrid` **미변경**(`git diff ... -- ZenDataGrid.tsx` 빈 출력) |
| 대시보드 `columns` 사용처 | `grep -n "columns" .../dashboard/page.tsx` | **정의 L37 + 전달 L145뿐**(페이지 로컬 한정) |
| `accessorKey: "shipper_name"` 전수 | `grep -rn` src | **L45·L77 2건(동일 파일)** — 다른 파일엔 없음 |
| **columns 배열 단위 중복 전수** | python 균형괄호 파서로 `src/**/*.tsx`의 columns 배열 **32개** 전수 | **중복 있는 배열 1개 = 본 대시보드뿐** (delivery-rates·ups-rates는 파일 단위 중복처럼 보였으나 **서로 다른 columns 배열**임을 실측 — 가짜 양성) |
| `getRowId` 지정 여부 | `grep -rn "getRowId" ZenDataGrid + dashboard page` | **미지정** → TanStack row id = 행 인덱스 → **row id 중복 없음**(원인은 컬럼 id뿐) |

## [DoD] (이슈 작업·요구 조건 기준)

- [x] 원인 확정: 컬럼 id 중복 열거 + 같은 명령으로 전/후 건수 비교
- [x] 의도 확인: 두 컬럼 전 행 동일 값 실측 + `DashboardOrder` 필드 전수 → **이슈에 스크린샷 질문 게시**
- [x] 중복 id 해소(표시 변화 없음) + `getRowId` 점검
- [x] 영향도: gitnexus_impact 대체(grep 전수, CLI 미설치 명시) + task file 기재
- [x] 회귀 테스트: 실제 렌더 console.error 0건 단언 + 되돌리기 FAIL 실측
- [x] R-10: 3역할 수정 전/후 스크린샷 + error-logs 신규 無
- [x] `npm run test:regression` PASS + `npm run build` PASS

## [작업 결과]

- 코드 커밋: `2833b7a7f (재베이스 후 — base: TeamB_Dev a4a6d3101 = #1474 병합본)`

### 착수 절차 실측 (R-17)

```bash
① ./scripts/agent-worktree-init.sh mike → 워크트리 재사용
② git fetch origin && git rebase origin/TeamB_Dev → ebd2afa3d (#1469 병합본) 기준 브랜치 생성
   feature/teamb-task-b380-iss1455-dashboard-dup-key
③ ./scripts/check-db-freshness.sh → OK (pending 0)
④ ls .agent/tasks | grep B-38 → 없음 (TASK-B-380 신규)
⑤ 라벨 status:open → status:in-progress → (완료 시) status:review
```

### 1. 원인 확정 (실측 — 소스 문자열 단언 아님)

| 실측 항목 | 결과 |
|:--|:--|
| 컬럼 id 열거 | `accessorKey: "shipper_name"` **2회**(L45 "Carrier", L77 "Customer") → TanStack 컬럼 id = `accessorKey`이므로 header.id·cell.id **중복** |
| `getRowId` | **미지정** → row id = 행 인덱스 → row id 중복 없음 (원인은 컬럼 id뿐) |
| **같은 명령 전/후 비교** (DEF-B-163 재현: `npx playwright test tests/e2e/e2e-31-...spec.ts -g "B6"`) | 수정 전 **console.error=256**(전부 동일 중복 key 메시지, pageerror 0) → 수정 후 **console.error=0** (256→0) |
| 집중 렌더 1회(Admin 20행) | 전/후 `duplicate-key` **85건 → 0건** |

### 2. 의도 확인 (이슈 작업 2번 — 질문 게시 완료)

- **실측**: 두 컬럼 **전 행에서 같은 값**(B371 Shipper A/B, B371 Agency A…) — `00_수정전_표시값_실측.json`(20행 전수)
- **`DashboardOrder` 필드 전수**: `id·order_no·shipper_name·origin·dest·status·transport_mode·created_at` — **carrier(운송사) 필드 없음**, `transport_mode`는 운송수단(UPS) 한정
- → 이슈에 스크린샷과 함께 **질문 게시**(코멘트 `7101141826`): (a) 화주명 2회 표시가 의도인지 (b) 다른 필드를 보여야 한다면 어떤 필드인지. **회신 전 표시 변경 없음**(지시 준수).

### 3. 수정 (표시 중립 — 화면 표시 변화 0)

- `dashboard/page.tsx` "Carrier" 컬럼에 **`id: "carrier"`** 1줄 지정(`accessorKey: "shipper_name"` **유지** = 두 열 모두 화주명 표시 그대로)
- TanStack이 `id`를 컬럼 identity로 쓰므로 header.id·cell.id가 고유해지고, 값은 accessorKey 그대로 → **표시 변화 없음**(before/after 동일 조건: Admin 20행·동일 URL 실측 대조)
- `ZenDataGrid` **미변경** (`git diff -- ZenDataGrid.tsx` 빈 출력)

### 4. 영향도 (R-20)

- `gitnexus_impact`는 **`gitnexus` CLI 미설치(not found)** → R-20에 따라 **grep 전수**으로 대체(위 [R-20 영향도] 표 실측)
- 핵심: `ZenDataGrid` 19개 파일 사용하나 **공용 컴포넌트 미변경** · `columns`는 페이지 로컬 · **columns 배열 32개 전수 조사에서 중복은 본 대시보드뿐**(delivery-rates·ups-rates는 파일 단위로는 중복처럼 보이나 **서로 다른 columns 배열** — 가짜 양성 실측)

### 5. 회귀 테스트 (실제 렌더 · 소스 문자열 검사 0건)

`tests/e2e/e2e-33-b380-dashboard-dup-key.spec.ts` — **3역할 실제 로그인·`page.goto`·console 수집**

| 역할 | 최종 URL | 행 | duplicate-key (before → after) |
|:--|:--|:-:|:--|
| Admin | `/ko/dashboard` | 20 | **85 → 0** |
| AGENCY | `/ko/agency` (프록시 리다이렉트 — `/ko/dashboard` 접근 불가 실측) | — | 0 → 0 |
| SHIPPER | `/ko/orders?page=1` (프록시 리다이렉트) | — | 0 → 0 |

- `pageerror` 3역할 **0건** · `zen_error_logs` **delta 0** (`after_콘솔점검_3역할.json`)
- **되돌리기 실측**: `id: "carrier"` 1줄 제거 → **FAIL (exit 1, Admin duplicate-key=85)** / 복원 → **PASS**(기준선 0건)

### 6. UI 증적 (R-10)

- `docs/99_Manual/E2E_B380_Result/` — **before/after × 3역할 스크린샷** 6장 + `before/after_콘솔점검_3역할.json` + `00_수정전_표시값_실측.json` + `after_B6_역할x화면_매트릭스.json`·`after_B7_R04_콘솔점검.json`(수정 후 재현 명령 결과, `consoleErrors: 0`)
- **에러 로그 확인 — 無** (`zen_error_logs` delta 0, 최근 10분 행 없음)
- 표시 대조: before/after 모두 Admin 20행·동일 URL·헤더 6개 그대로

### C. 검증 (전부 재실행)

- `npm run test:regression` → **296 files / 2,267 tests 전부 PASS**
- `npm run build` → **exit 0** (`✓ Compiled successfully in 7.0s`)
- `check:lrtm` OK · `check:doc-links` OK · `check:audit` OK · `tsc` 관련 **0건**
- `git diff origin/TeamB_Dev...HEAD -- scratch` → **출력 없음** (R-15)
- **R-12(Ds-11)**: **해당 없음** — 서버 액션(`getDashboardStats`)·RPC·API 변경 **0**(클라이언트 컬럼 정의만 변경) → Ds-11 갱신 대상 아님

### 발견 이슈

**없음** — 범위 밖 중복 패턴 조사(delivery-rates·ups-rates)는 **서로 다른 columns 배열**임이 실측된 가짜 양성이라 DEF 등록 대상 아님. 의도 확인 질문은 이슈 코멘트로 게시(위 2번).

## [발견 이슈]

없음 (범위 밖 중복 패턴은 가짜 양성으로 실측 · 의도 확인 질문은 이슈 코멘트로 게시).
