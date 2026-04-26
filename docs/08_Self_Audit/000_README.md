# 📚 000_SELF_AUDIT_README (자기 감사 및 품질 관리 인덱스)

> **문서 ID**: 000  
> **분류**: 📋 절차 & 규칙  
> **목적**: 프로젝트 품질 보증(QA) 및 오류 교정 시스템(SAR) 관리  
> **대상**: 모든 팀원, Audit Agent, ZEN_CEO  
> **작성일**: 2026-04-18  
> **최종 수정**: 2026-04-18  
> **작성자**: CIO (AI Agent)  
> **버전**: v1.1 (한글 인코딩 복구 및 전수 조사 반영)

---

[← 상위 목록으로 돌아가기](../00_GUIDE/000_README.md)

---

## 📌 개요
이 폴더는 ZENITH_LMS의 무결성을 유지하기 위한 사후 품질 관리 체계를 보관합니다. 발생한 오류의 원인을 분석하는 SAR 보고서와 품질 검토 체크리스트, UAT(사용자 수용 테스트) 결과 등이 포함됩니다.

## 📄 문서 목록

### 1. 품질 관리 체계 개요
| # | 문서명 | Link | 개요 |
|---|--------|------|------|
| **001** | 자기 감사(Self-Audit) 개요 | [001_Self_Audit_Overview.md](./001_Self_Audit_Overview.md) | 프로젝트 품질 관리 프로세스 및 운영 체계 상세 |

### 2. 품질 관리 자산 (Sub-directories)

#### 📋 [SAR Reports](./SAR_reports) (오류 분석 보고서)
| 파일명 | 개요 |
|--------|------|
| [SAR_2026-04-08_001_Documentation_ReadmeLinkErrors.md](./SAR_reports/SAR_2026-04-08_001_Documentation_ReadmeLinkErrors.md) | 인덱스 링크 오류 분석 |
| [SAR_2026-04-17_001_Implementation_NPM_Install_Error.md](./SAR_reports/SAR_2026-04-17_001_Implementation_NPM_Install_Error.md) | npm 실행 환경 장애 분석 |
| [SAR_2026-04-17_002_Design_Org_Hierarchy_Missing.md](./SAR_reports/SAR_2026-04-17_002_Design_Org_Hierarchy_Missing.md) | 조직 가시성 설계 누락 분석 |
| [SAR_2026-04-17_003_Quality_Implementation_Consistency_Error.md](./SAR_reports/SAR_2026-04-17_003_Quality_Implementation_Consistency_Error.md) | 작업 완료 보고 불일치 분석 |
| [SAR_2026-04-18-002_Auth_Redirection_Bug.md](./SAR_reports/SAR_2026-04-18-002_Auth_Redirection_Bug.md) | 인증 리다이렉션 버그 분석 |
| **기타 최신 리포트** | `SAR_reports/` 폴더 참조 |

#### ✅ [Checklists](./Checklists) (검증 체크리스트)
| 파일명 | 개요 |
|--------|------|
| [PHASE_1_CHECKLIST_Standardization.md](./Checklists/PHASE_1_CHECKLIST_Standardization.md) | 1단계 설계 표준화 검증 항목 |

#### 🧪 [UAT](./UAT) (사용자 수용 테스트)
| 파일명 | 개요 |
|--------|------|
| [UAT_1.3_Auth.md](./UAT/UAT_1.3_Auth.md) | 인증 시스템 테스트 시나리오 |
| [UAT_1.3_Result_Auth.md](./UAT/UAT_1.3_Result_Auth.md) | 인증 시스템 테스트 결과 보고 |

---

[← 상위 목록으로 돌아가기](../00_GUIDE/000_README.md)
