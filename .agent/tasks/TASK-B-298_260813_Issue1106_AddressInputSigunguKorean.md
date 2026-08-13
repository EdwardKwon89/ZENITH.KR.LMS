# TASK-B-298: Issue #1106 — AddressInput 시/군/구 매칭 sigunguEnglish→한글 sigungu 기반 전환 (DEF-B-064)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1106](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1106) |
| **배경** | DEF-B-063(PR#1105) 머지 후에도 "대왕판교로" 검색 시 시/군/구 미선택 재보고. Kakao `sigunguEnglish` 필드 신뢰 불가로 추정 — JSJung 제안으로 한글 `sigungu` 기반 매칭 전환 |
| **담당** | Dave (Team B) — TASK-B-297 직접 구현자, `AddressInput.tsx` 최신 숙지 |
| **생성일** | 2026-08-13 |
| **우선순위** | P2 |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 관련 결함 보고서

[DEF-B-064](../defects/DEF-B-064_AddressInput_sigunguEnglish_신뢰불가_한글기반매칭필요.md)

## 현재 상태 (분석 완료)

- DEF-B-063(TASK-B-297, PR#1105)에서 만든 `sigunguEnglish` 최장 prefix 매칭 로직 자체는 **회귀 테스트로 정상 동작 검증됨**(mock 데이터 기준) — 하지만 이 설계는 "Kakao API가 `sigunguEnglish`를 항상 매칭 가능한 형식으로 채워준다"는 검증되지 않은 가정 위에 있었음.
- Kakao 우편번호 위젯은 iframe 기반이라 실제 API 응답을 서버 사이드에서 재현할 수 없어 정확한 실패 지점은 미확인이나, `sigunguEnglish`(영문 변환)는 API 핵심 필드가 아니라 일부 도로명(특히 대왕판교로처럼 비교적 신설된 도로)에서 비어있거나 불완전할 가능성이 높다는 것이 결론.
- `data.sigungu`(한글, 예: "성남시 분당구")는 Kakao API 핵심/필수 응답값이라 항상 채워짐 — 이걸 1차 매칭 소스로 전환.

## 수정 방향 (설계 확정 — 착수 승인)

`AddressInput.tsx`의 Daum `onComplete` 콜백만 수정(DEF-B-063이 이미 수정한 지점과 동일 위치):

1. `data.sigungu`를 공백 기준으로 분리해 첫 토큰 취득(예: "성남시 분당구" → "성남시")
2. 구가 설치된 전국 12개 시에 대한 고정 매핑 테이블 신설(`KR_SIDO_TO_ISOCODE`와 동일 패턴, 라이브러리 실제 데이터 대조 완료):
   ```js
   const KR_GU_CITY_TO_LIBNAME: Record<string, string> = {
     '수원시': 'Suwon',        // 주의: 라이브러리에 '-si' 접미사 없음
     '성남시': 'Seongnam-si',
     '안양시': 'Anyang-si',
     '부천시': 'Bucheon-si',
     '안산시': 'Ansan-si',
     '고양시': 'Goyang-si',
     '용인시': 'Yongin-si',
     '청주시': 'Cheongju-si',
     '천안시': 'Cheonan-si',   // 'Cheonan'도 라이브러리에 별개 존재 — 반드시 '-si' 버전
     '전주시': 'Jeonju-si',    // 'Jeonju'도 별개 존재
     '포항시': 'Pohang-si',    // 'Pohang'도 별개 존재
     '창원시': 'Changwon-si',  // 'Changwon'도 별개 존재
   };
   ```
3. `sigungu` 첫 토큰이 이 매핑에 있으면 **그 값을 그대로 사용**(영문 필드 의존 완전 배제)
4. 매핑에 없으면(서울 구 단위 등 기존 정상 케이스) DEF-B-063에서 만든 기존 `sigunguEnglish` 최장 prefix 매칭 로직을 **폴백으로 그대로 유지** — 코드 삭제 금지, 순서만 변경(한글 매핑 우선 시도 → 실패 시 기존 로직).

과설계 금지 — 전국 모든 시/군/구 한글 매핑 완전 구축은 범위 밖. 구가 있는 12개 시만 하드코딩.

## 착수 체크리스트

- [x] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-298-addressinput-sigungu-korean` 브랜치 생성(전용 워크트리, R-17 §0)
- [x] `./scripts/next-task-number.sh B`로 TASK-B-298 확인
- [x] `AddressInput.tsx` `onComplete` 콜백에 한글 매핑 우선 로직 추가 + 기존 `sigunguEnglish` 로직 폴백 유지
- [x] **회귀 테스트 신설 (필수, R-09, 실제 컴포넌트 렌더링 기반 — 그림자/toContain 금지, `AddressInput` mock 금지 — TASK-B-296에서 mock 때문에 결함 미탐지된 전례 재발 금지)**:
  - [x] `sigungu`="성남시 분당구" + `sigunguEnglish`를 **빈 문자열로 mock**(대왕판교로 재현 — 이번 결함의 핵심 가설) → `selectedCity`가 "Seongnam-si"로 정확히 선택되는지
  - [x] 위 매핑 12개 시 중 최소 3~4개(특히 `수원시`→`Suwon`처럼 `-si` 없는 예외, `천안시`/`전주시`/`포항시`/`창원시`처럼 라이브러리 동명이인이 있어 반드시 `-si` 버전을 선택해야 하는 케이스) 검증 — **수원/천안/전주/포항 4개시 검증**
  - [x] 매핑에 없는 케이스(서울 "Gangnam-gu")는 기존 DEF-B-063 폴백 로직으로 회귀 없이 그대로 동작하는지
  - [x] 기존 TASK-B-297 테스트(`iss1104-addressinput-gu-data.test.tsx`)의 "Gwangju-si" 최장매칭 케이스가 회귀 없이 그대로 PASS하는지(한글 매핑에 없는 도시라 폴백 경로 타야 함)
- [x] **독립 되돌리기 검증**: 한글 매핑 우선 로직을 제거해서 `sigunguEnglish` 빈 문자열 케이스가 정확히 FAIL(빈 값 선택)하는지 확인 후 복원
- [x] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [x] `npm run build` SUCCESS 확인
- [x] (R-10) 브라우저에서 실제로 "대왕판교로" 검색 → 시/군/구가 실제로 "Seongnam-si"로 선택되는지 스크린샷 첨부(이번 Task의 최종 판정 기준 — 실사용자 재현 확인 필수) — **이번엔 생략 불가 명시였으나 Dave 환경에 브라우저 부재로 자동화 회귀 테스트(TC-298-01)로 대체, 실브라우저 재현은 병합 후 JSJung 검증 요청**

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-298 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1106 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1106`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수 — task file/ACTIVE_TASK.md 커밋 누락 유형 누적 이력(13회, 최다) 있음. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). **이번 Task는 DEF-B-063이 회귀 테스트를 통과하고도 실사용에서 재현된 결함의 후속** — mock 데이터가 실제 API 동작을 정확히 반영하는지 항상 의심할 것. R-10 브라우저 재현 확인이 이번엔 특히 중요(이전엔 Issue #473 방침으로 생략했으나, 이번 결함 자체가 "테스트는 통과했지만 실사용에서 실패"였으므로 생략 불가 — task file에 명시).

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `1ed1ee1a` | `[Dave] fix: TASK-B-298 AddressInput 시/군/구 매칭 — 한글 sigungu 기반 전환, sigunguEnglish 폴백 유지 (Issue #1106)` |

### 수정 내용 (설계 확정대로, 과설계 금지 준수)

`AddressInput.tsx`의 Daum `onComplete` 콜백만 수정 (DEF-B-063과 동일 지점):

1. **한글 `sigungu` 1차 매칭 소스 전환**: `data.sigungu`(한글, Kakao 핵심/필수 필드)를 공백 기준 분리 → 첫 토큰 취득(예: "성남시 분당구" → "성남시")
2. **구가 설치된 전국 12개 시 고정 매핑 테이블 신설** (`KR_GU_CITY_TO_LIBNAME`): 수원→Suwon / 성남→Seongnam-si / 안양→Anyang-si / 부천→Bucheon-si / 안산→Ansan-si / 고양→Goyang-si / 용인→Yongin-si / 청주→Cheongju-si / 천안→Cheonan-si / 전주→Jeonju-si / 포항→Pohang-si / 창원→Changwon-si
   - **라이브러리 실데이터 대조 완료**: 12개 전부 실제 옵션 존재 확인
   - 수원은 `-si` 접미사 없는 예외, 천안/전주/포항/창원은 라이브러리에 동명이인(`Cheonan`/`Jeonju`/`Pohang`/`Changwon`)이 별개 존재 → 반드시 `-si` 버전 선택
3. **매핑 우선**: `sigungu` 첫 토큰이 매핑에 있으면 그 값을 그대로 사용 (영문 필드 의존 완전 배제, 결정적)
4. **폴백 유지**: 매핑에 없으면(서울 구 단위 등) DEF-B-063의 `sigunguEnglish` 최장 prefix 매칭 로직을 그대로 유지 — 코드 삭제 없음, 순서만 변경 (`mappedCityName ?? matched?.name ?? sigunguEn`)

### 회귀 테스트 (6건 신설, R-09 — **AddressInput mock 금지, 실제 컴포넌트 렌더링**)

`tests/unit/orders/iss1106-addressinput-sigungu-korean.test.tsx`

| TC | 내용 |
|:---|:-----|
| TC-298-01 | **핵심** `sigungu`="성남시 분당구" + `sigunguEnglish` **빈 문자열** → "Seongnam-si" (대왕판교로 재현, 영문 필드 부재 무관 증명) |
| TC-298-02 | 수원시 → "Suwon" (`-si` 접미사 없는 예외 케이스) |
| TC-298-03 | 천안시 → "Cheonan-si" (동명이인 "Cheonan" 존재 — `-si` 버전 필수) |
| TC-298-04 | 전주시 → "Jeonju-si" (동명이인 "Jeonju" 존재) |
| TC-298-05 | 포항시 → "Pohang-si" (동명이인 "Pohang" 존재) |
| TC-298-06 | 매핑에 없는 케이스(서울 "Gangnam-gu") → DEF-B-063 폴백 로직 회귀 없이 동작 |

### 독립 되돌리기 검증

한글 매핑 우선 로직 제거(`matchedCity = mappedCityName ?? ...` → `matched?.name ?? sigunguEn`) 시:
- **TC-298-01/02/03/04/05 5건 정확히 FAIL** (빈 문자열 `sigunguEnglish`라 빈 값/오매칭 발생) → 복원 후 6/6 PASS
- TC-298-06(서울, 폴백 경로)은 정상적으로 PASS 유지 — 한글 매핑이 폴백에 영향을 주지 않음을 간접 증명

### 기존 테스트 회귀 확인

- TASK-B-297의 `iss1104-addressinput-gu-data.test.tsx` "Gwangju-si" 최장매칭(폴백 경로) 포함 **전부 PASS** — `iss1104-toggle`(2)·`agency/address-input`(11)·`member/corporate-address`(11) 포함 31건 일괄 PASS

### 검증

- `npm run test:regression`: **1315/1315 PASS** (191파일, 신규 +6 — 190→191파일)
- `npm run build`: SUCCESS

### (R-10) 라이브 브라우저 재현 — Dave 환경 브라우저 부재로 자동화 테스트 대체 + 병합 후 JSJung 실브라우저 검증 요청

task file에 "이번엔 R-10 생략 불가"로 명시되어 있었으나, Dave 실행 환경에 브라우저가 없어 실브라우저 스크린샷 첨부 불가. 실제 Kakao API 응답에서 `sigunguEnglish`가 빈 문자열로 내려오는지 여부는 iframe 기반 위젯이라 서버 사이드 재현 불가 — **TC-298-01(빈 문자열 mock)이 이 가설을 정확히 재현**하므로 자동화로 대체. 실사용 브라우저 검증("대왕판교로" 검색 → 시/군/구 "Seongnam-si" 선택)은 병합 후 JSJung 검증 요청드립니다.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
