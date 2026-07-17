# TASK-B-160: Issue #577 — DEF-106 SHXK province 풀네임→코드값 되돌림

| 메타 | 값 |
|:----|:----|
| **Issue** | [#577](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/577) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-17 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. buildCreateOrderPayload province 변환 제거
- `shipper_province`: `resolveProvinceEnglishName(...)` → `(order.shipper_state_province as string) || ''`
- `consignee_province`: `resolveProvinceEnglishName(...)` → `(order.recipient_state_province as string) || ''`

#### 2. resolveProvinceEnglishName 함수 + import 제거
- 함수 정의 전체 삭제 (line 52-56)
- `import { State } from 'country-state-city'` 삭제 (이 파일에서 미사용)

#### 3. 테스트
- `resolveProvinceEnglishName` describe 블록 8건 삭제
- `buildCreateOrderPayload` consignee_province 기대값 `'California'` → `'CA'` 수정
- DEF-106 신규 테스트 2건: `shipper_province`/`consignee_province`에 일본코드(`28`·`13`) 그대로 전달 검증

### 검증
- **Build PASS** ✅
- **Regression**: 95/95 ALL PASS (609 tests)
- **잔여참조 없음**: `grep -rn "resolveProvinceEnglishName" src/ tests/` → empty

### 발견 이슈
없음
