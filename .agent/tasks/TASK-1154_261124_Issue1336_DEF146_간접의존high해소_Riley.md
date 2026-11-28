# TASK-1154: Issue #1336 (DEF-146 P2) — 간접 의존 high 4건 해소 (`browserslist`·`dompurify`·`source-map-js`·`ws`)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1336](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1336) |
| **수행(Worker)** | Riley (Team A, `[Gemini]`) |
| **검증(Auditor)** | Aiden (Team A, ZEN_CEO) (R-01) |
| **선행 조건** | `TASK-1157` (`xlsx` 벤더링) 종결 |
| **우선순위** | P2 (`priority:p2`, `team:a`, `type:fix`) |
| **상태** | 완료 보고 (`status:review`) |
| **브랜치** | `feature/teama-task-1154-def146-indirect-high` |

> **공개 기재 기준 (GOV R-21)**: 본 문서에는 취약 패키지의 구체 CVE 상세·재현 절차를 기재하지 않으며, 패키지명·갱신 버전 및 `high N건 해소, 잔존 N건` 형식만 기록합니다.

---

## 1. 처리 요약

1. **이름 지정 호환 갱신 (`npm update browserslist dompurify source-map-js ws`)**:
   - `browserslist`: `4.28.2` → `4.29.6` (high 해소)
   - `dompurify`: `3.4.1` → `3.5.0` (moderate 해소)
   - `source-map-js`: `1.2.1` → `1.2.4` (high 해소)
   - `ws`: `8.20.0` → `8.23.0` (high 해소)
   - (`baseline-browser-mapping`도 `browserslist` 하위 의존으로 함께 갱신되어 moderate 해소)
2. **금지·보호 조건 준수**:
   - `npm update` 일괄 갱신·`npm audit fix`·`overrides` 미사용 (`package.json` 변경 0건).
   - `vitest` (`4.1.4`)·`@vitest/*`·`next` (`16.4.6`)·`react` (`19.2.4`)·`@sentry/nextjs` (`10.78.0`) 버전 변동 **0건**.
   - `src/` 소스 코드 변경 **0건**.
3. **`scripts/audit-baseline.json` 축소 갱신**:
   - `node scripts/check-audit.mjs --update-baseline` 실행 (`--allow-grow` 미사용, `12건 → 7건`으로 축소).

---

## 2. `npm audit --omit=dev` 전/후 비교 및 도달 가능성 점검

| 구분 | Critical | High | Moderate | Low | 합계 | 비고 |
|:--|--:|--:|--:|--:|--:|---|
| 갱신 전 (`origin/develop`) | 0 | **3** | 8 | 1 | **12** | `browserslist`·`source-map-js`·`ws` high 3건, `dompurify` moderate 1건 |
| 갱신 후 | 0 | **0** | 6 | 1 | **7** | **high 3건(및 moderate 2건) 해소, 잔존 high 0건** |

- **도달 가능성 확인 (`src/` 기준)**:
  - `rg -n "dompurify|from ['\"]ws['\"]|require\(['\"]ws['\"]\)|browserslist|source-map-js" src/`: 직접 참조 **0건** (`dompurify` HTML 정제 및 `ws` realtime 직접 경로 없음).

---

## 3. 검증 결과

- `npm run check:audit`: 허용 목록(7건) 외 신규 취약점 **0건** (`high 0건`)
- `npm run check:ds11`: 허용 목록 외 신규 미반영 **0건**
- `npm run check:doc-links`: 허용 목록 외 신규 깨진 링크 **0건**
- `git diff package.json` / `package-lock.json` (`vitest` · P0 5종): **0건**
- `npm run build`: **PASS** (`next build` 컴파일·TypeScript·정적 생성 완료)
- `npm run test:regression`: **274 Test Files / 2,022 Tests ALL PASS** (`537.54s`)

---

## 4. DoD 체크리스트
- [x] 이름 지정 갱신으로 간접 의존 `high` **3건 해소, 잔존 0건** (`npm audit --omit=dev`)
- [x] `scripts/audit-baseline.json` 축소 방향 갱신 (`12 → 7건`, `--allow-grow` 미사용)
- [x] `vitest` 4.1.4 · P0 5종 버전 변동 0건, `overrides` 미도입, `src/` 변경 0건
- [x] `check:audit` · `check:ds11` · `check:doc-links` 신규 0건
- [x] `npm run build` · `npm run test:regression` 전체 PASS

---

## 5. [작업 결과]

- **코드·락파일 커밋**: `e34092b1eb16c765af1b74fccab87c41eb15ea61` (`[Gemini] fix: TASK-1154 간접 의존 high 3건 해소(browserslist·dompurify·source-map-js·ws) (#1336)`)
