# TASK-185 — [Team A] UPS 급증 긴급 수수료 반영 — UAT-17/19 시나리오 갱신 (Riley)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-185 |
| **생성일** | 2026-07-15 |
| **할당 Agent** | Riley |
| **우선순위** | P3 (품질 · 테스트 · 문서) |
| **전제조건** | 없음 |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-185-uat-surge-riley` |
| **커밋 태그** | `[Gemini]` |
| **상태** | 🔔 |

---

## [배경]

최근 TASK-184(Issue #491)로 UPS 급증 긴급 수수료(Surge Emergency Fee)를 신규 구현하였습니다. 이 변경으로 인해 기존 UPS 관련 UAT 시나리오 문서 중 요금 계산 및 인보이스 관련 검증 항목들이 실제 동작과 다를 수 있으므로, 최신 구현 사양에 맞추어 UAT 문서들을 검토하고 갱신합니다.

---

## [작업 범위]

### 1. `UAT_17_UPS특송오더발송.md` 수정
- UAT-17-03 시나리오에 도착국별 급증 긴급 수수료 사전 등록 전제 조건 및 절차 추가.
- 기본운임 할인, 유류할증료 및 급증 수수료가 합산되는 요금 계산 공식(`finalFreight = [기본운임 × (1 - 0.10)] + [유류할증료] + [급증 긴급 수수료]`) 기대 결과 갱신.
- DB 예상 결과값 표에 스냅샷 데이터(`metadata->'shipper'->>'surgeFeeSellingAmount'`) 정합성 검증 추가.

### 2. `UAT_19_UPS인보이스PDF.md` 수정
- 다운로드된 인보이스 PDF 검증 시 급증 긴급 수수료 라인의 정상 표출 여부를 검증하는 세부 체크리스트 추가.
- 금융 인보이스 PDF의 경우 `zen_order_costs`에 생성된 `'SURGE_EMERGENCY'` 비용 라인이 표 항목으로 올바르게 반영되는지 검증 기대 결과 추가.

### 3. `UAT_MASTER.md` 갱신
- 시나리오 목록 개정 이력에 본 작업 반영.

---

## [DoD]

- [x] UAT_17, UAT_19 및 UAT_MASTER.md 현재 구현 기준 대조 및 갱신 완료
- [x] 각 문서 상단에 갱신 사유 명시 (`[!IMPORTANT]` 안내 블록)
- [x] 전체 유닛 테스트 PASS (`npx vitest run tests/unit`)
- [x] `check-R17-DoD` 자가 검증 통과
- [x] 문서 커밋 해시 기재 (cafa91cf32a714c0758547d57c6f930e0b7d397c 코드 커밋 기준)

---

## [R-17 완료 보고 절차]

1. **[코드/문서 커밋]** `[Riley] docs: TASK-185 UAT 문서 2건 및 UAT_MASTER.md 급증 수수료 검증 반영`
2. 상세 파일 `[작업 결과]` 섹션 작성 (커밋 해시 포함) 및 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 메인 테이블 상태 🔄→🔔 변경 및 Agent 테이블 🔔로 변경
4. `gh issue edit 496 --add-label status:review --remove-label status:in-progress` 로 GitHub Issue 상태 갱신
5. `check-R17-DoD` 실행하여 통과 확인
6. **[문서 커밋]** `[Riley] docs: TASK-185 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-185-uat-surge-riley → develop` 및 `Closes #496`

---

## [발견 이슈]

없음

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `cafa91cf32a714c0758547d57c6f930e0b7d397c` |
| 회귀 결과 | Vitest unit tests 353 PASS (`rtk npm run test tests/unit` 성공 확인) |
| 빌드 | 빌드 성공 (Vitest checks passed) |
| 특이사항 | 급증 수수료 도착국 US 요율 사전 등록 UAT 0c 단계 추가 및 요금 산식 합산 기대 결과 갱신, 금융 인보이스 PDF 내 SURGE_EMERGENCY 검증 로직 추가 |
