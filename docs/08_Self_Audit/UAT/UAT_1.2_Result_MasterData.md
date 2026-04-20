# UAT-1.2-RESULT: 마스터 데이터 원격 배포 결과 보고서

**수행일**: 2026-04-18
**검증 대상**: 원격 Supabase 프로젝트 (`ayowrwmufagzstqiqrnj`)
**최종 상태**: ✅ **COMPLETE / PASSED**

---

## 🏛️ 검증 개요
WBS 1.2 공정에 따라 SNTL 통합 물류 플랫폼의 근간이 되는 **공통 코드(Common Codes)** 시스템을 원격 인프라에 배포하였으며, 실제 SQL 쿼리를 통해 데이터 정합성을 전수 검증하였다.

---

## 📊 1. 공통 코드 그룹 (Common Code Groups)
비즈니스 대분류 시스템 구축 현황.

| Group Code | Group Name | System Reserved | Verification |
|:---|:---|:---:|:---|
| `MEMBER_STATUS` | 회원 상태 | Yes | ✅ Verified |
| `SERVICE_TYPE` | 운송 서비스 구분 | Yes | ✅ Verified |
| `INVOICE_STATUS` | 청구서 상태 | Yes | ✅ Verified |

---

## 📊 2. 서비스 기준 데이터 (Reference Data)
실제 물류 비즈니스 운영에 사용되는 기초 코드 데이터 실측값.

| Code Group | Value | Name (KO) | Name (EN) |
|:---|:---|:---|:---|
| `SERVICE_TYPE` | `AIR` | 항공운송 | Air Freight |
| `SERVICE_TYPE` | `SEA` | 해상운송 | Sea Freight |
| `SERVICE_TYPE` | `CIR` | 국제택배 | Courier |
| `SERVICE_TYPE` | `CCL` | 통관서비스 | Customs Clearance |
| `INVOICE_STATUS` | `PAID` | 완납 | Paid |
| `INVOICE_STATUS` | `UNPAID` | 미납 | Unpaid |
| `MEMBER_STATUS` | `ACTIVE` | 활성 | Active |

---

## 🔍 기술적 검증 내용
- **스키마 정합성**: `common_code_groups` 및 `common_codes` 테이블이 원격 DB에 정확히 생성되었음을 확인.
- **다국어 지원**: 한국어(`ko`), 영어(`en`), 중국어(`zh`), 일본어(`ja`)에 대한 명칭 필드가 모두 확보됨.
- **보안(RLS)**: `authenticated` 역할에 대한 조회 정책 및 `ADMIN` 전용 수정 정책이 정상 작동함을 확인.

---

## 🏛️ 결론 및 향후 계획
마스터 데이터 인프라가 원격지에 완벽히 구축되었으므로, 차기 공정인 **WBS 1.3(사용자 인증)** 및 **WBS 2.1(오더 관리)**에서 해당 코드들을 즉시 참조할 수 있음을 보증한다.

> [!IMPORTANT]
> 본 보고서의 수치는 2026-04-18 13:26에 수행된 `supabase db query --linked` 결과를 기반으로 작성되었습니다.
