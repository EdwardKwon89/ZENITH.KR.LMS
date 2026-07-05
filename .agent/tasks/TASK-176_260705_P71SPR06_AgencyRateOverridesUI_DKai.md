# TASK-176 — Phase 7.1 SPR-06: Agency 요율 오버라이드 UI 수정 (IMP-145)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-176 |
| **생성일** | 2026-07-05 |
| **할당 Agent** | D_Kai |
| **우선순위** | P1 |
| **전제조건** | TASK-171 ✅ |
| **관련 IMP** | IMP-145 |
| **브랜치** | `feature/teama-phase71-ups-rate-management` (TASK-175와 동일 브랜치 이어서 사용) |
| **커밋 태그** | `[D_Kai]` |
| **상태** | ⬜ |

---

## ⚠️ Team B 소유 화면 — 충돌 주의

`/agency/rate-overrides` 화면은 **Team B(Baker)가 오늘도 계속 수정 중**이다(TASK-B-053~055, UAT-16 관련). 착수 전 반드시:
```bash
git log origin/develop --oneline -10 -- 'src/app/[locale]/(dashboard)/agency/rate-overrides/*' 'src/app/actions/agency/rate-overrides.ts'
```
로 최신 변경 확인 후, develop의 최신 버전을 **먼저 이 브랜치로 머지/리베이스**하고 그 위에서 작업할 것. 임의로 덮어쓰지 말 것.

## [배경]

An-14 §0(조사 결과) — 현재 `zen_agency_rate_overrides.cost_price`를 Agency가 직접 수기 입력 가능한 구조적 결함을 TASK-171에서 DB 트리거로 막았다(`trg_agency_rate_override_calc_cost` — Agency가 어떤 cost_price 값을 보내도 서버가 `판매가×(1-할인율)`로 재계산). 이제 **UI도 이 사실을 반영**해야 한다.

## [작업 범위]

### 1. `src/app/actions/agency/rate-overrides.ts` 확인·수정

기존 `upsertAgencyRateOverride`가 `cost_price`를 폼 입력값 그대로 저장하려 시도할 것이다 — 트리거가 서버에서 덮어쓰므로 기능은 깨지지 않지만, **폼에서 cost_price를 아예 입력받지 않도록** 정리(불필요한 값 전송 제거).

만약 대상 Agency에 `zen_agency_pricing_policies` 행이 없으면 INSERT가 에러(`"...할인율 정책이 없는 대리점은 요율을 등록할 수 없습니다"`)를 던진다 — 이 에러를 사용자 친화적 메시지로 매핑해서 보여줄 것("담당 관리자에게 할인율 정책 등록을 요청하세요" 등).

### 2. `src/app/[locale]/(dashboard)/agency/rate-overrides/new/page.tsx` 및 관련 폼 컴포넌트 수정

- `cost_price` 입력 필드 제거(또는 읽기전용으로 전환) — "원가는 Admin이 설정한 할인율에 따라 자동 계산됩니다" 안내 문구로 대체
- `selling_price`(Agency 마진 반영 최종 판매가)만 입력받도록 유지
- 저장 성공 후 자동계산된 `cost_price`를 조회해 화면에 표시(계산 결과 확인용, 읽기전용)

### 3. Agency별 부가요금 등록 — 신규 섹션/페이지

`zen_agency_other_charges` CRUD (An-14 §3-2, TASK-171에서 스키마 완료):
- `src/app/actions/agency/other-charges.ts` 신규 — `getAgencyOtherCharges`·`upsertAgencyOtherCharge`·`deactivateAgencyOtherCharge`
- `/agency/rate-overrides` 화면 내 신규 탭 또는 `/agency/other-charges` 신규 페이지(택1 — Team B가 최근 만든 유사 화면 패턴이 있으면 그 패턴 우선 재사용)
- 공통코드(`zen_ups_other_charges`) 목록 중 Agency가 자체 금액을 등록할 항목 선택 → selling_price/cost_price 입력

### 4. i18n

`messages/{ko,en,zh,ja}.json` — cost_price 자동계산 안내 문구, Agency 부가요금 등록 화면 키.

### 5. 테스트

`tests/unit/agency/other-charges-actions.test.ts` 신규 — Agency 부가요금 CRUD 3종 검증.

## [DoD]

- [ ] Team B 최신 develop 변경분 확인 후 병합/리베이스 완료
- [ ] `cost_price` 입력 필드 제거·읽기전용 전환 확인
- [ ] 정책 미등록 에러 메시지 사용자 친화적으로 표시 확인
- [ ] `zen_agency_other_charges` CRUD Action 3종 + UI 구현
- [ ] i18n 4개국어 반영
- [ ] 신규 테스트 전량 PASS
- [ ] `npm run test:regression` 전체 PASS (TASK-175 완료 기준선 이상 유지)
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 등재
- [ ] `check-R17-DoD` 실행 완료

## [R-17 완료 보고 절차]

TASK-175와 동일 (코드 커밋 → task file 🔔 → ACTIVE_TASK 반영 → IMP_PROGRESS 갱신 → check-R17-DoD → 문서 커밋). **PR 생성 금지** — Aiden이 Phase 7.1 통합 PR 1개로 생성.

## [발견 이슈]

_(담당 Task 범위 밖 이슈 발견 시 기재. 없으면 "없음")_
