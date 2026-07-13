# TASK-B-075 — Issue #260 REQ-01/02 화주 주소 자동완성 + AddressInput 공통 컴포넌트화

> **발령일**: 2026-07-08
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Dave (D_Kai)
> **우선순위**: P1
> **상태**: 🔔 검토 요청
> **선행 Task**: 없음
> **연관 이슈**: [Issue #260](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/260)

---

## 작업 범위

### REQ-02: AddressInput 공통 컴포넌트화
- `address-input.tsx` → `src/components/common/AddressInput.tsx` 이동
- dual-mode 지원: `mode='form-action'`(기존) + `mode='rhf'`(prefix + register)
- import 경로 업데이트 3곳 + 테스트 mock 2곳

### REQ-01: 화주 주소 자동 불러오기
- `getCurrentUserAffiliation()`: address 6컬럼 반환
- `orderRegistrationSchema`: shipper_country_code 등 5개 필드 추가
- `OrderRegistrationForm.tsx`: AddressInput RHF 연동 + useEffect 자동 로드

---

## DoD

- [x] AddressInput 공통 컴포넌트 이동 + dual-mode
- [x] 기존 사용처 정상 동작 (agency/shippers/new, edit-form)
- [x] getCurrentUserAffiliation() address 6컬럼 반환
- [x] orderRegistrationSchema shipper_* 주소 필드 확장
- [x] OrderRegistrationForm AddressInput RHF + 자동 로드
- [x] readOnly prop → disabled 처리
- [x] RHF mode country_code hidden register 연결
- [x] 전체 회귀 PASS
- [x] R-17 커밋 분리
- [x] PR 생성 (Closes #260)

---

## [작업 결과]

### REQ-02: AddressInput 공통 컴포넌트화 ✅
| 파일 | 변경 |
|:-----|:------|
| `src/components/common/AddressInput.tsx` | 신규 — dual-mode 지원, readOnly prop |
| `shipper-form.tsx` | import 경로 변경 |
| `edit-form.tsx` | import 경로 변경 |
| `address-input.test.tsx` | import 경로 변경 |
| `edit-form.test.tsx` | mock 경로 변경 |

### REQ-01: 화주 주소 자동 불러오기 ✅
| 파일 | 변경 |
|:-----|:------|
| `admin/master.ts` | `getCurrentUserAffiliation()` 주소 6컬럼 반환 |
| `validation/order.ts` | shipper_country_code/state_province/city/address_detail/zipcode 5필드 추가 |
| `OrderRegistrationForm.tsx` | AddressInput RHF 모드 연동 + useEffect 자동 로딩 |

### 검증
- **코드 커밋**: `277c0a2`
- **회귀**: 489/489 PASS (81 files)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-08 | Jaison | TASK-B-075 발령 — Issue #260 REQ-01/02 |
| 2026-07-08 | Dave | TASK-B-075 🔔 구현 완료 — 8 files |
