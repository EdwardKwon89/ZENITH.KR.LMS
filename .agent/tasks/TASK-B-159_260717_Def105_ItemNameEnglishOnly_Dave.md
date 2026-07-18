# TASK-B-159: Issue #574 — DEF-105 오더 품명 영문 전용 입력 제한

| 메타 | 값 |
|:----|:----|
| **Issue** | [#574](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/574) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-17 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. orderItemSchema 영문 전용 regex 추가
- `item_name`에 `.regex(/^[A-Za-z0-9\s.,\-()&'"/#%+:]*$/)` 추가

#### 2. OrderRegistrationForm.tsx 에러 메시지 표시
- 품명 입력란 아래 `<p className="text-[9px] text-rose-500 mt-1">` 추가

#### 3. 테스트
- DEF-105 전용 describe 블록 + 5종 테스트 (한글 거부·영문 통과·혼합기호 통과·빈값 거부·한글+영문 혼합 거부)

### 검증
- **Build PASS** ✅
- **Regression**: 95/95 ALL PASS (615 tests)

### CI 결과 (PR#576)
- Vercel Preview Comments ✅ PASS
- Regression Tests ✅ PASS
- Task File Check ✅ PASS

### PR
- PR#576 → `integration/teamb-260716` (docs 누락으로 반려, 본 커밋으로 보완)

### 발견 이슈
없음
