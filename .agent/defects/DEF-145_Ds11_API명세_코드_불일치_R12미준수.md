# DEF-145 | Ds-11 API 상세 명세서가 코드와 불일치 — R-11·R-12 절차 미준수

> **보고자**: Aiden (Claude) | **작성일**: 2026-11-13 | **상태**: 보고(조치 결정 대기) | **긴급도**: Medium
> **상태 갱신(2026-11-13)**: 재발 방지 장치 구현·반영 완료(아래 §8). 백로그 해소·2단계는 미결.
> **관련**: IMP-183(`scratch/post_launch_improvements.md`), 현황 기록 `docs/08_Self_Audit/Ds11_Gap/Ds11_Gap_Report_20261113.md`, 문서 231 §10 #11

## 1. 발견 경위
2026-11-13, 문서 231(테스트 커버리지 전략 가이드) 검토 중 "Ds-11 문서 부재"라는 지적을 확인하다가 현행본 위치(`docs/02_Analysis/Ds_11_API_상세_명세서.md`)를 찾았고, 이어 Server Action 함수명을 Ds-11과 대조해 불일치를 확인했다.

## 2. 현상 (확인된 사실)
| 항목 | 값 |
|:--|:--|
| 대상 | `src/app/actions/**` `use server` 파일 54개, export 액션 함수 298개 |
| Ds-11에 이름이 나오는 함수 | 92개 (30%) |
| Ds-11에 이름이 없는 함수 | **206개 (70%)** |
| Ds-10 인벤토리에 이름이 나오는 함수 | 37개 (12%) |
| 2026-07-16 이후 추가된 파일의 함수 | **20개 중 0개** 반영 (신규 7파일: `admin/exchange-rates`, `finance/{daily-billing, order-revenue-cost, shipper-invoices, ups-actual-charges, ups-actual-cost}`, `operations/bulk-orders`) |
| 2026-07-15 이후 | `src/app/actions` 변경 커밋 153건, Ds-11 수정 0건 |
| 문서 머리 선언 | "최종 동기화 2026-04-27, Synchronized(전수 조사 완료)" — 현재 코드 기준으로는 성립하지 않음 |

전체 목록·디렉토리별 수치는 `Ds11_Gap_Report_20261113.md`.

## 3. 어긴 규정
- **R-12**(GOV_COMMON.md 119행): "API 사양 변경 시 반드시 `Ds-11_API_상세_명세서.md`를 선제적으로 업데이트. 코드와 명세의 불일치는 심각한 결함." → 신규 액션 20개 미반영.
- **R-11**(GOV_COMMON.md 116행): "API 명세(Ds-11) 및 데이터 모델 설계를 최우선으로 완료하고 승인". → 신규 액션에 대해 Ds-11 선행 작성이 없었다. 단 **대체 기록(task file `[설계 의견]`, Issue 본문)이 있었는지는 확인하지 못했다** — R-11 준수 여부는 별도 샘플 점검이 필요하다.

## 4. 원인 분석 (확인된 것 / 추정)
**확인된 것**
1. R-12는 문서 규칙뿐이고 **집행 수단이 없다**: `pr-checks.yml`에는 Task File Check·Type Check(advisory)만 있고 Ds-11 관련 검사가 없다. `check-R17-DoD`는 저장소 스크립트가 아니라 `opencode.json`의 명령 템플릿(Agent 프롬프트)이다.
2. 갱신 대상이 **수기 편집 단일 파일**(554줄)이다 — 병렬 PR 충돌 부담은 `ACTIVE_TASK.md`·`LIVE_REGRESSION_TEST_MAP.md`에서 이미 확인된 패턴(GOV_COMMON R-17 v3.0 개편 사유).
3. 참조 경로 4곳이 구 경로(`docs/03_Design/`)를 가리키고 있었다(**2026-11-13 정정 완료**: MASTER_INDEX.md:42, README.md:53, 303 가이드 25행, Ds_10 21행). 구 INDEX+DETAIL 17파일은 2026-07-06 GH#206 #13에서 의도적으로 아카이브됨.

**추정(미검증)**
4. Pilot 운영 중 고객 요청 작업이 우선되어 문서 갱신이 후순위로 밀렸을 가능성.
5. 구 도메인별 분할 구조(INDEX+DETAIL)가 사라진 뒤 갱신 책임 단위가 모호해졌을 가능성.

## 5. 영향 범위
- Ds-11을 진실의 근거로 쓰는 모든 작업(231 §7-1의 근거 우선순위 포함) — 약 70% 액션에는 근거가 없다.
- 금전·외부 연동 액션이 다수 포함: `finance/` 39개 중 29개, `ups/` 43개 중 26개 미언급.
- 신규 Agent·MLFF 이식 시 참고 문서로서의 신뢰성.
- **운영 장애는 확인되지 않음**(문서 결함이며 코드 동작과 무관).

## 6. 권장 조치 (결정 필요: Edward — 상세 근거는 IMP-183)
1. **규정 명확화(R-11·R-12 개정안)**: 트리거(신규·변경 Server Action·RPC·외부 payload), 최소 기재 항목(함수명·경로·입력·출력·권한·오류), 시점(구현 PR과 같은 PR 이내), 제외(내부 헬퍼·테스트), 책임(구현 Agent가 PR 내 갱신, Aiden이 머지 전 확인).
2. **자동 점검 + 래칫(핵심)**: 코드의 `use server` 액션 함수명과 Ds-11을 대조하는 스크립트를 두고, **현재 미반영 206개를 허용 목록(baseline)으로 고정**한 뒤 **신규 미반영 발생 시에만** 경고 → 관찰 후 차단. 기존 Task File Check(Issue #358)와 같은 방식(advisory → 관찰 → required)으로 `pr-checks.yml`에 추가.
3. **작성 부담 경감**: 시그니처 표는 코드에서 생성(stub)하고 사람은 권한·오류·설명만 기재.
4. **구조 검토**: 단일 파일 대신 도메인별 분할(충돌 감소) 여부 — Edward 결정.
5. **백로그 해소**: 신규 20개 → 금전·외부 연동 영역(finance·ups) → 나머지 순.
6. **R-11 준수 샘플 점검**: 7/16 이후 신규 20개 함수의 Issue/task file에서 설계 승인 기록 존재 여부 확인.

## 7. 한계
함수명 언급 여부만 대조했으며 **언급된 92개의 정확성은 미검증**이다. 이름 변경·그룹 서술은 과대 집계될 수 있다. 문서 동기화 선언일 대비 벌어진 정도는 분리하지 못했다.

## 8. 조치 이력 (2026-11-13, Edward 승인)
| 항목 | 조치 | 위치 |
|:--|:--|:--|
| 참조 경로 4곳 정정 | 완료 | `MASTER_INDEX.md`·`README.md`·303 가이드·`Ds_10_API_INVENTORY.md` → `docs/02_Analysis/Ds_11_API_상세_명세서.md` |
| 자동 점검 + 래칫 | **구현 완료**(advisory) — 미반영 206개 baseline 고정, baseline 밖 신규만 경고, baseline 확대 거부, `--strict`(필수 승격용)·`--update-baseline` 지원 | `scripts/check-ds11-sync.mjs`, `scripts/ds11-sync-baseline.json`, `npm run check:ds11` |
| 링크 점검 | **구현 완료**(advisory) — 깨진 링크 84개 baseline 고정(`docs/08_Self_Audit/Reviews/`·아카이브는 점검 제외), 신규만 경고 | `scripts/check-doc-links.mjs`, `scripts/doc-links-baseline.json`, `npm run check:doc-links` |
| CI 연결 | 완료 — `Docs Sync Check (advisory, non-blocking)` job(`continue-on-error`, 항상 exit 0, `npm ci` 불필요) | `.github/workflows/pr-checks.yml` |
| 규정 명확화 | 완료 — R-11(Ds-11 현행 위치), R-12(트리거·시점·최소 기재·제외·책임·집행) | `GOV_COMMON.md` v3.7, `docs/00_GUIDE/GOV_CHANGELOG.md` |
| 시험 | 신규 액션 함수 임시 추가 → 경고·`--strict` exit 1·CI 주석 생성 확인, 신규 깨진 링크 감지 확인, baseline 확대 갱신 거부 확인 후 원복 | (로컬 실행) |

**미결(후속)**: ① 206개 백로그 해소(finance·ups 우선) ② 2단계 — 언급된 92개의 내용 정확성 점검 ③ advisory → 필수(`--strict`) 승격 시점(관찰 후) ④ R-11 준수 샘플 점검 ⑤ Aiden 머지 전 확인 체크리스트(`/check-request`·`/approve` skill)에 Ds-11 갱신 확인 반영 ⑥ Ds-11 도메인별 분할 여부.
**알려진 한계**: CI 동작은 로컬 시험으로만 확인했고 **실제 PR에서의 실행은 아직 미확인**(첫 PR에서 job 로그 확인 필요). 링크 점검은 인라인 링크만 보며 괄호 포함 경로는 파싱이 부정확할 수 있다.
