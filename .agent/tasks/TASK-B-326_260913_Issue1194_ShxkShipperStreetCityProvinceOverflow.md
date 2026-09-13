# TASK-B-326: Issue #1194 — SHXK shipper_street 시/구/도 포함 시 UPS AddressLine 초과로 등록 거부 (DEF-B-146, DEF-B-145 후속)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1194](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1194) |
| **DEF** | [DEF-B-146](../defects/DEF-B-146_SHXK배송지주소_시구도포함시_UPS등록거부.md) |
| **선행** | [DEF-B-145](../defects/DEF-B-145_SHXK배송지주소_국가명중복포함_AddressLine거부.md) / [TASK-B-325](TASK-B-325_260913_Issue1192_ShxkShipperStreetCountryDuplication.md) — 병합됐으나 근본 원인 불완전 해소 |
| **배경** | JSJung — TASK-B-325 배포 후에도 오더 `ZEN-2026-000015`가 동일 오류 재발 보고 → Jaison이 실제 SHXK API 직접 호출로 재검증 |
| **담당** | Baker (Team B) — TASK-B-325 직접 작업자로 해당 함수 맥락 보유, 연속 배정 |
| **생성일** | 2026-09-13 |
| **우선순위** | P1 (High) |
| **상태** | 🔄 진행 중 |

## 현재 상태 (Jaison 재검증 완료)

**TASK-B-325(국가명 제거) 배포 후에도 동일 오류 재발**:
```
shipper_street: "6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do" (88자)
→ "Invalid ShipFrom AddressLine3" (실패)
```

**DEF-B-145 진단(국가명 중복이 원인)이 틀렸다는 반증**: `zen_shxk_api_logs`에서 과거 성공 사례 발견 —
```
shipper_street: "461-5 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea" (61자) → 성공(success=1)
```
국가명("Republic of Korea")을 포함하고도 성공 — 국가명 자체는 원인이 아니었음.

**Jaison이 실제 SHXK API를 직접 호출해 재검증(2026-09-13)**:
| shipper_street | 길이 | 결과 |
|---|---|---|
| 구/시/도 포함(TASK-B-325 수정 후 상태) | 88자 | 실패 |
| **구/시/도 제거, 도로명+상세주소만** `"6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil"` | 49자 | **성공** — `order_id=785179`, 실 트래킹 `1ZJ443D30406066155` 발급 확인 후 즉시 `removeorder`로 정리 완료 |

**실제 원인**: UPS(ShipFrom)는 AddressLine 1~2줄(총 약 70자 추정)까지만 지원하고, 초과 시 필요한 3번째 줄이 **내용과 무관하게 거부**되는 것으로 강하게 추정됨(정확한 문자수 임계값은 확정 불가 — 61자 성공/88자 실패로 대략 경계만 추정). `shipper_city`/`shipper_province`가 이미 별도 필드로 전달되는데 `shipper_street`에도 시/구/도까지 중복 포함시키는 것이 길이 초과의 주요 원인.

TASK-B-325의 국가명 제거·순서 교정 자체는 정당한 개선이며 되돌리지 않는다 — 이번 Task는 그 위에 **시/구/도 제거**를 추가하는 후속 조치.

## 수정 방향 (복잡 Task — 설계 의견 필요)

**Jaison이 실증 검증한 후보 방향**: 주소를 콤마로 분할해 **첫 세그먼트(도로명)만 사용**, 나머지(구/시/도/국가) 세그먼트는 전부 버림 — 현재 DB의 `*_address_english` 값이 "도로명, 구, 시, 도[, 국가]" 순서로 저장되는 관례(Daum 우편번호/한국 도로명주소 영문 변환 표준)에 기반.

```
resolveShipperStreet(): road = shipperAddr.split(',')[0]?.trim() (첫 세그먼트만)
                         return [detail, road].filter(Boolean).join(', ')
```

**Baker가 착수 전 `[설계 의견]`에서 반드시 확인·결정해야 할 사항**:
1. **가정 검증(필수)**: 실제 DB의 `zen_orders.shipper_address_english`, `zen_organizations.address_english`, `zen_orders.recipient_address` 등 여러 건을 직접 조회해 "첫 세그먼트=도로명" 가정이 깨지는 케이스가 없는지 확인. 예외 발견 시 구현 전에 Jaison에게 먼저 보고(설계 방향 자체가 달라질 수 있음)
2. 기존 `stripCountryToken()`(TASK-B-325 신설)을 이번 수정으로 완전히 대체할지, 국가명 제거 로직은 유지하고 시/구/도 제거를 추가하는 형태로 확장할지 — "첫 세그먼트만 사용" 방식이면 국가명은 자동으로 제거되므로 `stripCountryToken()`이 불필요해질 수 있음. 단, `shipperOrg?.address` 등 한글 폴백 경로나 세그먼트 개수가 다른 예외 케이스에서는 여전히 필요할 수 있어 구조를 신중히 판단할 것
3. `resolveConsigneeStreet()`·`buildCreateOrderPayload()`의 consignee_street 인라인 경로 동일 적용
4. 회귀 테스트: 이번에 Jaison이 실제 API로 검증한 두 값(88자 실패 케이스의 입력 → 49자 성공 형태로 변환됨을 확인)을 fixture로 사용. 기존 `defb145-street-country-dedup.test.ts`의 기대값도 이번 수정으로 다시 바뀌는 항목이 있으면 함께 갱신(예: 시/구/도 유지를 검증하던 테스트가 이제는 시/구/도 제거를 검증하도록 뒤집힘 — 의도된 변경임을 주석으로 명시)

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-326-shxk-shipper-street-city-province-overflow` 브랜치 생성(전용 워크트리, R-17 §0) — `./scripts/next-task-number.sh B` 결과를 GitHub Issue 제목 검색으로 교차검증(이번엔 325까지 확인되어 326이 맞음, 2026-09-13 기준)
- [ ] `[설계 의견]` 섹션 작성(위 1~4 항목 포함) 후 `status:draft` 라벨 부여, Jaison 확정 대기
- [ ] (확정 후) `resolveShipperStreet()`/`resolveConsigneeStreet()`/`buildCreateOrderPayload()` 수정
- [ ] 회귀 테스트 신설/갱신(R-09) — 실제 함수 호출·반환값 검증, `toContain` 소스 문자열 검사·존재 확인 패턴 금지
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 갱신
- [ ] **독립 되돌리기 검증**: 수정 원복 시 신규 테스트가 정확히 FAIL하는지 확인 후 복원
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 오더 `ZEN-2026-000015`로 UPS 등록 재시도 — **성공 시 실 화물이 생성되므로**, 이 최종 확인은 신중히 진행하고 성공하더라도 실사용 목적이 아니면 즉시 `removeorder`로 정리할 것(Phase 8 Sandbox 없음 제약)

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-326 SHXK shipper_street 시구도 제거로 AddressLine 초과 해소 (DEF-B-146)` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `gh issue edit 1194 --add-label status:review --remove-label status:in-progress` → 4. `check-R17-DoD` 통과 → 5. 문서 커밋 → 6. PR 생성(`feature/* → TeamB_Dev`, `Closes #1194`)

## 담당자 위반 이력 사전 경고

**Baker**: `.agent/VIOLATION_TRACKER.md` 참조(TASK-B-325와 동일 이력, 요약만 재기재).
- 채번 절차 누락/중복 3회, stale 브랜치 재제출 4회, vacuous test 계열 3회, task file/상태 전환 누락 계열 5회 — 세부는 TASK-B-325 task file 참조.
- **이번 Task 특이사항**: TASK-B-325에서 "88자→실패"였던 것이 이번엔 "49자(첫 세그먼트만)→성공"으로 검증됨 — **DEF-B-145 회귀 테스트의 기존 기대값(시/구/도 유지)이 이번 수정으로 뒤집힌다.** 기존 테스트를 그냥 삭제하지 말고, 의도된 방향 전환임을 명시하며 갱신할 것. 또한 "가설 확인했다고 바로 구현 착수"가 아니라, 위 설계 의견 1번(실제 DB 샘플로 가정 검증) 없이 착수하면 반려 사유.
- 위 이력에도 불구하고 JSJung 2026-07-15 결정에 따라 할당 지속(재론 금지, [[project_dave_r17_assignment_policy]] 동일 원칙 적용).

## [설계 의견]

_(담당자 작성 예정 — 착수 전 필수)_

## [설계 확정]

_(Jaison 작성 예정)_

## [작업 결과]

_(담당자 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
