# TASK-B-158: Issue #573 — DEF-104 SHXK invoice unit_code 매핑 + MTR 옵션 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#573](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/573) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-17 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. OrderRegistrationForm MTR 옵션 추가
- Packing Unit 드롭다운에 `MTR(미터)` 옵션 추가

#### 2. resolveShxkUnitCode 함수 추가
- `label-mapping.ts`에 SHXK API unit_code 매핑 함수 추가
- 매핑: EA/PCS→PCE, SET→SET, MTR→MTR, 기타→PCE(기본값)

#### 3. buildInvoiceFromItems에 unit_code 추가
- `item_packing_unit` → `resolveShxkUnitCode` 변환 후 `unit_code` 필드에 포함
- fallback 아이템에도 `unit_code: 'PCE'` 추가

#### 4. 테스트
- `resolveShxkUnitCode`: 7건 (EA, PCS, SET, MTR, 빈값, 미지값, 소문자)
- `buildInvoiceFromItems`: 3건 (unit_code 변환, 기본값, fallback)

### 검증
- **Build PASS** ✅
- **Regression**: 95/95 ALL PASS (610 tests)

### 커밋
- 코드 커밋: `ad2cb329`

### 발견 이슈
없음
