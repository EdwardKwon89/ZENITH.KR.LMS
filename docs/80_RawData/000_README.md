# 📚 000_RAWDATA_README (기초 원천 자료 인덱스)

> **문서 ID**: 000  
> **분류**: 🔍 참조 & 외부  
> **목적**: 프로젝트 초기 분석을 위한 원천 자료 및 레거시 데이터 관리  
> **대상**: 분석가, CIO, CPO  
> **작성일**: 2026-04-18  
> **최종 수정**: 2026-04-18  
> **작성자**: CIO (AI Agent)  
> **버전**: v1.1 (한글 인코딩 복구 및 전수 조사 반영)

---

[← 상위 목록으로 돌아가기](../000_GUIDE/000_README.md)

---

## 📌 개요
이 폴더는 SNTL 통합 물류 플랫폼(ZENITH_LMS) 개발의 기원이 된 각종 원천 자료들을 보관합니다. 데이터 딕셔너리, 기존 프로세스 정의서, UI 리스트 등 설계의 근간이 된 엑셀 및 텍스트 자료들이 포함되어 있습니다.

## 📄 문서 목록

### 1. 비즈니스 정의서 (SNTL 레거시)
| 파일명 | 형식 | 개요 |
|--------|------|------|
| [SNTL_DataDictionary.xlsx](./SNTL_DataDictionary.xlsx) | Excel | 시스템 전반의 용어 사전 및 데이터 정의 |
| [SNTL_ProcessDefinition.xlsx](./SNTL_ProcessDefinition.xlsx) | Excel | 물류 비즈니스 프로세스(수출입) 정의서 |
| [SNTL_FeatureList.xlsx](./SNTL_FeatureList.xlsx) | Excel | 기존 시스템 기능 목록 및 요구사항 |
| [SNTL통합플랫폼_기능정리.xlsx](./SNTL통합플랫폼_기능정리.xlsx) | Excel | 통합 플랫폼 기능 요구사항 정리본 |
| [비지니스 정의(추가).md](./비지니스%20정의(추가).md) | Markdown | 추가 비즈니스 요구사항 및 정의 |

### 2. UI 및 인터페이스 자료
| 파일명 | 형식 | 개요 |
|--------|------|------|
| [SNTL_UIList.xlsx](./SNTL_UIList.xlsx) | Excel | 전체 화면 목록 및 ID 정의 |
| [SNTL_UI화면설계서.md](./SNTL_UI화면설계서.md) | Markdown | UI 화면 상세 설계서 (영문/한글 혼용) |
| [SNTL_UI화면설계서.pptx](./SNTL_UI화면설계서.pptx) | PPTX | UI 화면 설계 프리젠테이션 자료 |
| [SNTL_UI화면설계서_Figma.html](./SNTL_UI화면설계서_Figma.html) | HTML | 피그마 디자인 링크 및 미리보기 |

### 3. 표준 코드 및 마스터 자료
| 파일명 | 형식 | 개요 |
|--------|------|------|
| [공항코드집.xlsx](./공항코드집.xlsx) | Excel | 전 세계 주요 공항 코드 마스터 |
| [항공사코드집.xlsx](./항공사코드집.xlsx) | Excel | 글로벌 항공사 IATA/ICAO 코드 마스터 |
| [외교부_국가표준코드_20251222.xlsx](./외교부_국가표준코드_20251222.xlsx) | Excel | ISO 국가 표준 코드 (외교부 기준) |
| [해양수산부_국가 및 항구코드_20250731.xlsx](./해양수산부_국가%20및%20항구코드_20250731.xlsx) | Excel | UN/LOCODE 및 해양수산부 항구 코드 |

### 4. 분석 원천 데이터 (Raw Text)
| 파일명 | 형식 | 개요 |
|--------|------|------|
| [all_tables_columns_raw.txt](./all_tables_columns_raw.txt) | Text | 레거시 DB 테이블 및 컬럼 원시 목록 |
| [extracted_text.txt](./extracted_text.txt) | Text | 문서 추출 텍스트 원본 (v1) |
| [extracted_text_v2.txt](./extracted_text_v2.txt) | Text | 문서 추출 텍스트 정제본 (v2) |

---

## ⚠️ 관리 주의사항
- 본 폴더의 자료는 **Read-only**를 원칙으로 합니다.
- 해당 자료를 바탕으로 재구성된 최신 정보는 `docs/02_Analysis/` 또는 `docs/04_Database/`의 문서를 참조하십시오.

---

[← 상위 목록으로 돌아가기](../000_GUIDE/000_README.md)
