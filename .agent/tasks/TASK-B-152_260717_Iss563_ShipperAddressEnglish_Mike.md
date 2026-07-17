# TASK-B-152: Issue #563 — placeShxkOrder 화주 영문 주소 우선 매핑

| 메타 | 값 |
|:----|:----|
| **Issue** | [#563](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/563) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-17 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. lookupOrderPackages shipper_org 조인 추가
- `zen_organizations!shipper_id` 조인으로 화주 조직 주소 조회
- `address_english`, `address_detail_english` 등 8필드 포함

#### 2. placeShxkOrder shipperStreet 영문 우선 로직
- 우선순위: 조직 영문주소 → 조직 한글주소 → 오더 스냅샷(레거시)
- `shipperOrg?.address_english` → `shipperOrg?.address` → `order.shipper_address`

#### 3. 회귀 테스트
- `tests/unit/ups/ups-labels-shipper-address.test.ts` 신규 (5건)
- 소스코드 기반 검증 (조인·우선순위·폴백 로직 확인)

### 검증
- **Build PASS** ✅
- **Regression**: 94/94 ALL PASS (580 tests)

### 커밋
- 코드 커밋: `c3da381d`

### 발견 이슈
없음
