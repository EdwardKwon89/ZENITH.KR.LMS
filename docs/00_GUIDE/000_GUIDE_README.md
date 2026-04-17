# 📚 000_GUIDE 문서 인덱스

> **폴더명**: 000_GUIDE (개발 방법론 & 절차 & 규칙)  
> **목적**: 프로젝트 전체의 개발 방법론, 절차, 규칙을 정의하고 안내  
> **관리자**: Team Lead  
> **최종 업데이트**: 2026-04-08  

---

## 📋 폴더 개요

이 폴더에는 프로젝트 개발의 모든 단계에서 필요한 **방법론, 절차, 규칙, 가이드**가 포함됩니다.

### 폴더 구조 및 번호 체계

```
001-099: 문서 작성 및 관리 규칙 (Documentation Rules)
100-199: 개발 방법론 (Methodologies)
200-299: 절차 & 규칙 (Procedures & Rules)
300-399: 운영 & 관리 (Operations & Management)
```

---

## 📄 문서 목록

### **📖 문서 작성 & 관리 규칙** (001-099)

| # | 문서명 | Link | 개요 |
|---|--------|------|------|
| **001** | **프로젝트 문서 작성 가이드** | [001_Document_Writing_Guide.md](./001_Document_Writing_Guide.md) | 이 프로젝트의 모든 문서 작성 규칙 및 표준 (번호 체계, 메타데이터, 네비게이션, 포맷) |

---

### **🎯 개발 방법론** (100-199)

| # | 문서명 | Link | 개요 |
|---|--------|------|------|
| **101** | **개발 방법론 개요** | (추가 예정) | GSD + ZEN_A4 하이브리드 방법론 개요 |
| **101** | **ZEN_A4 자동 리뷰 시스템** | [101_ZEN_A4_METHODOLOGY.md](./101_ZEN_A4_METHODOLOGY.md) | 3가지 Hook을 통한 자동 코드 리뷰 및 품질 관리 |
| **102** | **통합 개발 방법론** | [102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md](./102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md) | Phase 1-4 상세 운영 절차 및 체크리스트 |

---

### **📋 절차 & 규칙** (200-299)

| # | 문서명 | Link | 개요 |
|---|--------|------|------|
| **201** | **SAR 작성 규칙** | [201_SAR_RULE.md](./201_SAR_RULE.md) | Self_Audit_Report 작성 방법 (파일명, 분류, 심각도, 필수 섹션) |
| **202** | **Check List 관리 절차** | [202_CHECK_LIST_PROCEDURE.md](./202_CHECK_LIST_PROCEDURE.md) | SAR으로부터 Check List 생성 및 관리 절차 (4단계) |
| **203** | **실 프로젝트 적용 체크리스트** | [203_PROJECT_APPLICATION_CHECKLIST.md](./203_PROJECT_APPLICATION_CHECKLIST.md) | SAR & Check List 절차를 기존 프로젝트에 적용하는 실행 가이드 |

---

### **⚙️ 운영 & 관리** (300-399)

| # | 문서명 | Link | 개요 |
|---|--------|------|------|
| (예정) | (예정) | - | 팀 운영, 회의, 리포팅 등 |

---

## 🔍 문서 분류 체계

### 번호 범위
```
001-099: 📖 문서 작성 & 관리 규칙
          ├─ 001-010: 문서 작성 가이드
          └─ 011-099: 기타 관리 규칙

100-199: 🎯 개발 방법론
          ├─ 101-110: 방법론 개요 & 이론
          ├─ 111-120: 설계 방법론
          ├─ 121-130: 구현 방법론
          └─ 131-199: 기타 방법론

200-299: 📋 절차 & 규칙
          ├─ 201-210: SAR 관련
          ├─ 211-220: Check List 관련
          ├─ 221-230: 코드 리뷰 규칙
          ├─ 231-240: 테스트 규칙
          ├─ 241-250: 커밋 & PR 규칙
          └─ 251-299: 기타 절차

300-399: ⚙️ 운영 & 관리
          ├─ 301-310: 팀 운영
          ├─ 311-320: 회의 및 리포팅
          ├─ 321-330: 의사결정 프로세스
          └─ 331-399: 기타 운영
```

### 문서 이모지
```
📖 문서 작성 & 관리
🎯 개발 방법론
📋 절차 & 규칙
⚙️ 운영 & 관리
```

---

## 📝 파일명 규칙

### 형식
```
[세자리번호]_[파일명].md

예:
✅ 001_Document_Writing_Guide.md
✅ 102_ZEN_A4_METHODOLOGY.md
✅ 201_SAR_RULE.md
```

### 규칙
- **번호**: 000-999 (세자리 숫자)
- **파일명**: 영문 PascalCase 또는 Snake_Case
  - ✅ `001_Document_Writing_Guide.md`
  - ✅ `002_Check_List_Procedure.md`
  - ❌ `001_documentWritingGuide.md` (camelCase 사용 금지)
  - ❌ `001_document-writing-guide.md` (kebab-case 사용 금지)

---

## 📌 메타데이터 표준

모든 문서는 다음 메타데이터를 포함해야 합니다:

```markdown
# [번호] 문서명

> **문서 ID**: 0XX  
> **분류**: [분류명]  
> **목적**: [문서의 목적]  
> **대상**: [대상 독자]  
> **작성일**: YYYY-MM-DD  
> **최종 수정**: YYYY-MM-DD  
> **작성자**: [작성자]  
> **버전**: v1.0  

---
```

---

## 🔗 문서 간 네비게이션

### 상단 네비게이션
```markdown
[← 목록으로 돌아가기](./000_GUIDE_README.md) | [이전 문서](./001_*.md) | [다음 문서](./002_*.md)

---
```

### 하단 네비게이션
```markdown
---

[← 목록으로 돌아가기](./000_GUIDE_README.md)
```

---

## 📊 사용 가이드

### 언제 어떤 문서를 읽을까?

| 상황 | 추천 문서 |
|------|---------|
| **새 프로젝트 시작** | 103 (통합 방법론) → 201-203 (절차) → 001 (작성 규칙) |
| **기능 개발** | 103 (Phase 1-4) → 201-203 (SAR & Check List) |
| **코드 리뷰** | (예정된 규칙 문서) |
| **버그 수정** | 201 (SAR 규칙) → 202 (Check List) |
| **문서 작성** | 001 (문서 작성 가이드) |
| **팀 회의** | (예정된 운영 문서) |

---

## 🚀 빠른 시작

### **1단계: 방법론 이해** (1시간)

1. [101_ZEN_A4_METHODOLOGY.md](./101_ZEN_A4_METHODOLOGY.md) 읽기 (자동 리뷰)
2. [102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md](./102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md) 읽기 (4단계 절차)

### **2단계: 절차 이해** (2시간)

1. [201_SAR_RULE.md](./201_SAR_RULE.md) 읽기 (오류 기록)
2. [202_CHECK_LIST_PROCEDURE.md](./202_CHECK_LIST_PROCEDURE.md) 읽기 (오류 방지)
3. [203_PROJECT_APPLICATION_CHECKLIST.md](./203_PROJECT_APPLICATION_CHECKLIST.md) 읽기 (실행)

### **3단계: 기능 개발 시작** (지속)
- Phase 1-4 절차 따르기
- SAR 작성 & Check List 관리

---

## 📈 문서 생성 로드맵

### ✅ 완료 (2026-04-08)
- ✅ 001_Document_Writing_Guide.md
- ✅ 102_ZEN_A4_METHODOLOGY.md
- ✅ 103_INTEGRATED_DEVELOPMENT_METHODOLOGY.md
- ✅ 201_SAR_RULE.md
- ✅ 202_CHECK_LIST_PROCEDURE.md
- ✅ 203_PROJECT_APPLICATION_CHECKLIST.md

### 🔜 계획 중 (추가 예정)
- 101_Development_Methodology_Overview.md
- 210_Code_Review_Rule.md
- 220_Test_Writing_Rule.md
- 230_Commit_and_PR_Rule.md
- 301_Team_Operation_Guide.md
- 310_Meeting_and_Reporting.md

---

## 💡 문서 추가 방법

새로운 문서를 추가할 때:

1. **번호 결정**: 위의 번호 범위에서 적절한 번호 선택
2. **파일 생성**: `[번호]_[파일명].md` 형식으로 생성
3. **메타데이터 추가**: 상단에 필수 정보 포함
4. **이 README 업데이트**: 위의 문서 목록에 추가
5. **네비게이션 추가**: 상단/하단 링크 추가

---

## 📞 문서 관리 담당

**폴더 관리자**: Team Lead  
**최종 검토**: 2026-04-08  
**버전**: 1.0

---

## 🔗 관련 링크

- [프로젝트 가이드](../../CLAUDE.md) - CLAUDE.md
- [기술 의사결정 기록](../../.planning/DECISIONS.md)
- [프로젝트 컨텍스트](../../.planning/CONTEXT.md)
- [참조 문서](../10_Reference/000_Reference_README.md) - 완전한 문서 작성 규칙

---

**마지막 업데이트**: 2026-04-08  
**작성자**: Claude Code (AI)
