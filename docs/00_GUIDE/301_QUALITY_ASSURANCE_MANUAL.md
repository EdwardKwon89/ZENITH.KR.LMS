---
tags: ["procedure"]
---

# ZENITH Quality Assurance Manual (QAM)

**문서번호**: ZEN-QA-01
**최종 승인**: Edward (CEO)
**관리부서**: CEO Audit Group
**제정일**: 2026-04-18

---

## 🏛️ 1. 개요 (Objective)
본 지침서는 ZENITH LMS 프로젝트의 품질 표준을 정의한다. 모든 개발 결과물은 본 지침서에서 정의한 검증 수준을 통과해야 하며, 이를 위반한 결과물은 WBS 완료로 인정하지 않는다.

## ⚖️ 2. 핵심 품질 원칙 (Core Principles)

### 2.1. 이원화 검증의 원칙 (Principle of Dual-Track Testing)
모든 비즈니스 프로세스는 사용자 직군 및 시스템 경로에 따라 독립적으로 검증되어야 한다.
- **Corporate Track (신청형)**: 신청, 심사, 승인, ID 발급의 전 과정을 검증한다.
- **Personal Track (즉시형)**: 가입 즉시 활성화 및 기능 진입의 민첩성을 검증한다.
- **Negative Test**: 승인되지 않은 상태에서의 불법적 접근 차단 여부를 반드시 확인한다.

### 2.2. 실측 증적의 원칙 (EBA: Evidence-Based Audit)
단순한 UI 시각적 확인(Happy Path)은 공식 증적으로 인정하지 않는다.
- **SQL Verification**: 반드시 데이터베이스 직접 조회를 통해 필드값(Status, ID Format, Null 여부 등)의 정합성을 실측해야 한다.
- **Token/Log Audit**: 서버 측 로그 및 토큰 유효성 검증 결과를 포함해야 한다.

### 2.3. 영구 보존의 원칙 (Permanent Registration)
테스트 결과는 휘발되지 않는 공식 문서 체계로 관리한다.
- **Naming Rule**: `UAT_[WBS_ID]_Result_[Task_Name].md`
- **Location**: `docs/08_Self_Audit/UAT/` 하위에 영구 보존한다.

## 🛠️ 3. 품질 게이트 (Quality Gates)

| Gate | 단계 | 통과 기준 |
|:---:|:---|:---|
| **Gate 1** | 설계(Plan) | 이원화 시나리오가 포함된 UAT 계획서 승인 |
| **Gate 2** | 구현(Execute) | 단위 테스트 80% 이상 및 자가 검증(SAR) 완료 |
| **Gate 3** | 검증(Verify) | SQL 실측 결과가 포함된 영구 보고서 제출 |

## 🏛️ 4. CEO 특례 지침
본 지침서의 내용은 Edward CEO의 직속 권한으로 관리되며, 예외 상황 발생 시 반드시 CEO의 서면 승인을 득해야 한다.

---

**ZENITH 로지스틱스 품질 관리 위원회**
