---
tags: ["procedure"]
---

# ⚙️ ZENITH System Setting Governance (제니스 운영 설정 관리 가이드)

> **문서번호:** ZEN-GOV-02
> **관할:** CTO (Chief Technology Officer)
> **대상:** 시스템 전역 파라미터 및 비즈니스 기준값

## 1. 개요
시스템의 행위나 비즈니스 판단의 기준이 되는 임계값(Threshold) 및 파라미터(Parameter)는 코드 수정 없이 운영 중에 변경 가능하도록 전용 테이블에서 관리한다.

## 2. 관리 대상
- **페이징 규격**: `default_page_size` (기본: 20)
- **보안 정책**: 세션 만료 시간, 비밀번호 복잡도 기준 등
- **비즈니스 정책**: 오더 자동 확정 시간(Hour), 알림 발송 활성화 여부 등

## 3. 데이터 구조 (`zen_system_settings`)
| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `setting_key` | VARCHAR (PK) | 고유 설정 키 (예: `ORDER_PAGE_SIZE`) |
| `setting_value` | TEXT | 설정값 (문자열, 숫자, JSON 등) |
| `description` | TEXT | 해당 설정의 용도 및 영향 범위 설명 |

## 4. 운영 가이드
- 기준값 변경 시 별도의 배포 없이 즉시 시스템에 반영되어야 한다.
- 관리자 권한을 가진 사용자(`ZENITH_SUPER_ADMIN`, `ADMIN`)만 수정 가능하다.
