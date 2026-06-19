# TASK-161 | Phase 7 UPS 특송 UAT 시나리오 작성

| 항목 | 내용 |
|:----|:----|
| **Task ID** | TASK-161 |
| **발령일** | 2026-06-19 |
| **담당 Agent** | Riley (Gemini) |
| **우선순위** | P2 |
| **상태** | 🔔 |
| **전제조건** | IMP-114·116·117·118·119·122 전량 ✅ |
| **관련 IMP** | IMP-123 |
| **GitHub Issue** | #45 |

---

## [목표]

Phase 7 UPS 특송 신규 기능 6개에 대한 UAT 시나리오 문서를 작성하고  
UAT_MASTER.md 인덱스를 갱신한다. 시범 운영(6/30) 전 완료 필수.

---

## [작업 범위]

### 신규 작성 대상 (6개 문서)

| 문서명 | 대상 기능 | IMP | 참조 구현 |
|:------|:---------|:----|:---------|
| `UAT_15_Agency화주관리.md` | Agency 화주 등록·목록·등급 수정 | IMP-114 | `/agency/shippers` · `getAgencyShippers` |
| `UAT_16_Agency요율오버라이드.md` | Agency 요율 오버라이드 등록·조회·비활성화 | IMP-116 | `/agency/rate-overrides` · `upsertAgencyRateOverride` |
| `UAT_17_UPS특송오더발송.md` | UPS 오더 등록 (직접배송/픽업 선택) + 요금 계산 | IMP-118 | `/orders/new` 발송 유형 UI |
| `UAT_18_창고출고UPS연계.md` | 창고 출고 처리 → UPS 발송 연계 흐름 | IMP-119 | `/warehouse/outbound` |
| `UAT_19_UPS인보이스PDF.md` | UPS 오더 인보이스 PDF 생성·다운로드 | IMP-117 | `/orders/[id]/invoice` |
| `UAT_20_Agency정산조회.md` | Agency 화주별·오더별 정산 조회 | IMP-122 | `/agency/settlements` |

### UAT_MASTER.md 갱신
- 신규 시나리오 인덱스 행 추가 (UAT-15-xx ~ UAT-20-xx)
- 총 케이스 수 갱신 (현재 103개 → 갱신 후 합계)
- 작성자: Riley, 상태: 🔔

### 저장 경로
`docs/91_FinalTest/UAT/` (기존 UAT_13·14 동일 디렉토리)

---

## [참조 문서]

- [UAT_13_주소록.md](../../docs/91_FinalTest/UAT/UAT_13_주소록.md) — 작성 포맷 기준
- [UAT_14_일마감.md](../../docs/91_FinalTest/UAT/UAT_14_일마감.md) — 작성 포맷 기준
- [UAT_MASTER.md](../../docs/91_FinalTest/UAT/UAT_MASTER.md) — 인덱스 갱신 대상
- [agency/shippers 소스](../../src/app/\[locale\]/\(dashboard\)/agency/shippers/) — Agency 화주 관리
- [agency/rate-overrides 소스](../../src/app/\[locale\]/\(dashboard\)/agency/rate-overrides/) — 요율 오버라이드
- [agency/settlements 소스](../../src/app/\[locale\]/\(dashboard\)/agency/settlements/) — Agency 정산

---

## [DoD — 완료 기준]

- [x] UAT_15_Agency화주관리.md 작성 완료 (시나리오 3개 이상)
- [x] UAT_16_Agency요율오버라이드.md 작성 완료 (시나리오 3개 이상)
- [x] UAT_17_UPS특송오더발송.md 작성 완료 (시나리오 3개 이상)
- [x] UAT_18_창고출고UPS연계.md 작성 완료 (시나리오 2개 이상)
- [x] UAT_19_UPS인보이스PDF.md 작성 완료 (시나리오 2개 이상)
- [x] UAT_20_Agency정산조회.md 작성 완료 (시나리오 3개 이상)
- [x] UAT_MASTER.md 인덱스 신규 행 추가 + 총 케이스 수 갱신
- [x] 코드 커밋 해시 기재: 1fc2894
- [x] 빌드 확인: `rtk npm run build` (문서 전용 커밋 — 빌드 생략 가능, R-08 예외)
- [x] 회귀 테스트: `rtk npm run test:regression` PASS

---

## [R-17 완료 보고 절차]

1. **[문서 커밋]** `[Riley] docs: TASK-161 Phase 7 UAT 시나리오 작성 완료 🔔`
2. **본 파일 `[작업 결과]` 섹션 작성** — 커밋 해시 기재 + 상태 🔔 변경
3. **ACTIVE_TASK.md 상태 반영** — 🔄→🔔
4. **IMP_PROGRESS.md IMP-123 행 🔔 갱신**
5. **`check-R17-DoD` 자가 검증 실행** — 전항목 통과 확인
6. **[PR 생성]** `feature/riley-p7-uat-scenarios → develop` (Closes #45)
7. ✅ 전환은 Aiden 단독 권한

---

## [설계 의견]

_(단순 Task — ⬜→🔄 직행)_

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 해시 | 1fc2894 |
| 신규 UAT 시나리오 수 | 16 |
| UAT_MASTER 총 케이스 수 | 119 |
| 회귀 결과 | PASS / 378 PASS |
| PR | #46 |

---

## [Aiden 검토]

_(Aiden 전속)_

---

## [발견 이슈]

_(없으면 "없음" 기재)_

없음
