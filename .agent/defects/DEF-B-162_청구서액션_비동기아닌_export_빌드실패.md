# DEF-B-162 — `'use server'` 청구서 액션 파일의 비동기 아닌 export `normalizeShipperName`로 프로덕션 빌드 실패

| 항목 | 내용 |
|:-----|:-----|
| 발견일 | 2026-11-22 |
| 발견자 | Baker (Team B) |
| 발견 경위 | TASK-B-361(Issue #1367) ⒜ PR 완료 검증中 `npm run build` 실행 시 Turbopack 빌드 실패. 원인 추적 결과 병합된 B-360 서버 액션 파일의 기존 export임을 확인 |
| 대상 | `src/app/actions/finance/billing-statements.ts:135` (`export function normalizeShipperName`) |
| 긴급도 | **High** — `npm run build`가 전역 실패하여 모든 후속 PR의 배포 게이트가 막힘 |
| 상태 | **해소됨 (2026-11-22)** — Mike / TASK-B-368 (이슈 #1415, PR #1416 병합)이 `normalizeShipperName`을 순수 유틸 `src/lib/finance/billing/normalize-shipper-name.ts`로 분리. `TeamB_Dev` @ `c89a5d2d9` 기준 `npm run build` PASS 확인. 당초 B-360 산출물로 본 Task 범위 밖이었으나 선행 TASK로 조치 완료 |

## 현상

`npm run build` 실행 시 다음 에러로 중단됩니다.

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  Creating an optimized production build ...
> Build error occurred
Error: Turbopack build failed with 1 error:
./src/app/actions/finance/billing-statements.ts:135:17
Error: Server Actions must be async functions.
   134 |
   135 | export function normalizeShipperName(name: string): string {
       |                                      ^^^^^^^^^^^^^^^^^^^^
   136 |   return name.replace(/\s+/g, ' ').trim().toLowerCase();
   137 | }
Ecmescript file had an error

Import trace:
  Server Component:
    ./src/app/actions/finance/billing-statements.ts
    ./src/app/[locale]/(dashboard)/shipper/statements/[id]/page.tsx
```

파일 최상단이 `'use server';`이며, Next.js는 이 지시문이 붙은 모듈의 **모든 export가 async 함수여야 함**을 요구합니다. `normalizeShipperName`은 동기 함수이므로 빌드 시 거부됩니다.

## 영향 범위

- **전역 빌드 실패** — TASK-B-361의 신규 라우트가 아니어도, 이 액션을 import하는 어떤 Server Component(`shipper/statements/[id]/page.tsx` 등 3경로 8페이지)를 통해서라도 빌드가 실패합니다. 즉 `TeamB_Dev` 병합본 자체가 배포 불가 상태입니다.
- **본 Task 기여도 0** — `git diff d9c800313^ d9c800313 --name-only`에 `billing-statements.ts` 포함 안 됨. `origin/TeamB_Dev` 동일 위치에 같은 비동기 export가 존재(PR #1404, B-360 ⒜ 병합본).
- 테스트는 통과 — `npm run test:regression`에서 이 함수를 쓰는 `tests/integration/task-b360-billing-statements.test.ts` 19/19 PASS. 빌드 타임에만 드러나는 결함.

### 호출자 (수정 시 전부 확인 필요)

| 위치 | 용도 |
|:--|:--|
| `src/app/actions/finance/billing-statements.ts:299` | `resolveBillableTarget` — ADHOC 후보 필터링 |
| `src/app/actions/finance/billing-statements.ts:303` | 동일 — `shipper_name` 정규화 비교 |
| `src/app/actions/finance/billing-statements.ts:488` | `listAdhocShipperNames` — 그룹화 키 계산 |
| `tests/integration/task-b360-billing-statements.test.ts:28` | 직접 import |
| `tests/integration/task-b360-billing-statements.test.ts:510` | `normalizeShipperName('(주)abc co')` 기대값 비교 |

## 긴급도 판정 근거

- **High**: 단순 헬퍼 하나가 배포 파이프라인 전체를 막습니다. 빌드가 실패하면 TASK-B-361 ⒜/⒝ 및 후속 모든 PR의 CI 게이트가 통과할 수 없습니다. 다만 운영 중 런타임 장애는 아니므로 `즉시`는 아닙니다.

## 권장 조치

1. `normalizeShipperName`을 `'use server'` 파일 밖의 순수 유틸 모듈(예: `src/lib/finance/normalize-shipper-name.ts`)로 이동하고, `billing-statements.ts`와 테스트가 이를 import하도록 변경.
   - 또는 `export`를 제거하고 파일 내부 전용 함수로 전환(단, 테스트가 직접 import하므로 이동이 더 안전).
2. `src/components/finance/statements/StatementCreate.tsx:30`의 클라이언트 측 동일 규칙 헬퍼와 값 일치 여부 확인.
3. `npm run build` 재실행 → 성공 확인 후 `import trace`에 올라온 3경로 페이지도 함께 스모크.
4. 수정은 **B-360 산출물 소유자(D_Kai/Noah)에게 별도 TASK로 발령** — 본 Task 범위(화면 구현) 밖이라 지금은 수정하지 않음.

## 관련

- TASK-B-361(Issue #1367) `[발견 이슈]` 섹션에 요약 기재
- 병합 출처: PR #1404 (TASK-B-360 ⒜, 서버 액션 8종 + 통합 생성 RPC)
- TASK-B-361 ⒜ PR: `Refs #1367` — 본 DEF 참조만 기재, 코드 수정 없음
