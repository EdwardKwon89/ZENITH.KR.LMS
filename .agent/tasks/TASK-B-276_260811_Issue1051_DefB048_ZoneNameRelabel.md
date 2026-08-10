# TASK-B-276: Issue #1051 / DEF-B-048 (High) — zen_ups_zones Zone 이름표 재정비

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1051](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1051) |
| **DEF** | [DEF-B-048](../defects/DEF-B-048_UPS_Zone이름표_전체국가매핑과불일치.md) |
| **배경** | JSJung — ups-detail 페이지에서 중국행 오더 Zone이 "Zone 1 - Domestic Korea"로 표시되는 걸 발견, 조사 요청 |
| **담당** | Mike (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 근본 원인 (Issue #1051 / DEF-B-048 참조 — 확정 완료)

`zen_ups_zones.zone_name`이 실제 배정 국가와 전혀 무관(Jaison이 전 Zone 전수 대조 완료):

| zone_code | 현재(잘못됨) | 실제 배정 국가 예시 |
|:---:|:---|:---|
| Z1 | Zone 1 - Domestic Korea | CNN(중국 북부), MO, SG, TW |
| Z2 | Zone 2 - East Asia (China/Japan) | JP, VN (중국 없음) |
| Z5 | Zone 5 - West Asia / Middle East | CA, MX, PR, US |
| Z8 | Zone 8 - North America | AE, AR, BR, EG, RU, ZA 등 |
| Z10 | Zone 10 - Africa | CNS(중국 남부), HK |
| (그 외 Z3/Z4/Z6/Z7/Z9도 유사하게 불일치) |

요금 데이터(`zen_ups_base_rates`, `zone_id` 자체)는 정상 확인됨(Z1의 WW_SAVER_DOC 0.5kg 요율 49,700원 — 명백한 국제 특송 요금, "국내배송" 아님). `20260719000000_sntl_zone_countries_rebuild.sql`(실제 UPS PDF 기준 재적재, "US Z8→실제 Z5" 등 교정 이력 존재)로 `zone_id`↔국가 매핑 자체는 정확히 재정비됐으나, 그 이전 단계의 placeholder `zone_name` 라벨은 함께 갱신되지 않고 방치됨.

## 설계 확정 (JSJung 확인 완료, 2026-08-11)

**"대륙명 등 설명 라벨은 실제 배정 국가가 혼재돼 있어 부정확할 수밖에 없음 — 번호만 표시하는 방식으로 단순화"**

## 수정 방향

1. **신규 마이그레이션**:
   ```sql
   UPDATE public.zen_ups_zones SET zone_name = 'Zone ' || substring(zone_code from 2) WHERE zone_code = 'Z1';
   -- 또는 zone_code별로 10건 개별 UPDATE (Z1→'Zone 1', Z2→'Zone 2', ... Z10→'Zone 10')
   ```
   대륙/지역 설명 문구 전부 제거, 번호만 남김.
2. **화면 변경 없음** — 라벨 텍스트만 교정, `zone_id`/`zone_code`/요금 데이터는 전혀 손대지 않음(이미 정확하므로 절대 건드리지 말 것).
3. **[선택, 이번 범위 아님]** 국가 목록 조회 기능 추가는 후속 IMP로 별도 기록 가능(구현자 판단, 강제 아님).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-276-zone-name-relabel` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/mike` 안에서 — 공유 메인 체크아웃 금지, R-17 §0). **TASK-B-275와 별도 브랜치로 분리할 것.**
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-276 확인
- [ ] 신규 마이그레이션 — `zen_ups_zones` 10개 zone_name을 "Zone N" 형식으로 UPDATE
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - 마이그레이션 적용 후 10개 zone_name이 정확히 "Zone 1"~"Zone 10" 형식인지 확인(실 DB 쿼리 기반)
  - `zone_id`/`zone_code`/`zen_ups_base_rates` 등 요금 데이터가 이번 수정으로 전혀 변경되지 않았는지 확인(회귀 방지 — 이름만 바뀌어야 함, 되돌리기 검증과 함께 수행 가능)
  - **되돌리기 검증 필수** — UPDATE 되돌릴 시 기존(틀린) 이름으로 복귀하는지 확인
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) `/admin/ups-rates` Zone 관리 탭에서 10개 Zone 이름이 전부 "Zone N" 형식으로 표시되는지 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-276 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1051 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1051`)

## 담당자 위반 이력 사전 경고

- **Mike**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 이번 Task는 TASK-B-275(DEF-B-047)과 동시 배정됨 — 두 Task를 혼동해 파일을 섞지 않도록 주의(각 task file/브랜치 분리 유지). 이 Task는 데이터(zone_name) 수정만 있고 로직 변경이 없으므로, "요금 데이터는 전혀 안 바뀌었다"는 되돌리기 검증을 특히 꼼꼼히 할 것.

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
