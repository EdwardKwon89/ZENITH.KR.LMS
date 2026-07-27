# TASK-B-149: Issue #554 — 영문 주소 필드 추가 + AddressInput 캡처 로직

| 메타 | 값 |
|:----|:----|
| **Issue** | [#554](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/554) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-16 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. DB 마이그레이션: `zen_organizations` 영문 주소 필드 추가
- `address_english text` (nullable)
- `address_detail_english text` (nullable)

#### 2. AddressInput.tsx: roadAddressEnglish 캡처 로직 추가
- DaumPostcodeEmbed onComplete에서 `(data as any).roadAddressEnglish` 캡처
- `${prefix}_address_english`로 setValue

### 검증
- **Build PASS** ✅
- **Regression**: 92/92 ALL PASS (566 tests)
- **회귀 테스트 추가**: address_english hidden input 캡처 검증 테스트 1건 추가

### 커밋
- 코드 커밋: `3f71d94d30d11cf5a6c97183a2a33eb1ff505aa6`
- 테스트 커밋: `3719a8fa` (회귀 테스트 추가)

### 발견 이슈
없음
