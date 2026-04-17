# 📚 09_TEMPLATES 문서 인덱스

> **폴더명**: 09_TEMPLATES (프로젝트 템플릿 & 가이드)  
> **목적**: 새 프로젝트 시작 시 필요한 모든 템플릿 제공  
> **관리자**: Team Lead  
> **최종 업데이트**: 2026-04-08  

---

## 📌 폴더 개요

이 폴더는 **새 프로젝트 또는 새 기능 개발**에 필요한 모든 템플릿을 포함합니다.

### 목적
- ✅ 개발 생명주기 가이드 (Phase 1-4)
- ✅ 체크리스트 (설계/구현/검증)
- ✅ 온보딩 자료 (신규 팀원 교육)
- ✅ 문제 해결 가이드 (Q&A)
- ✅ 설정 가이드 (Ollama, Docker 등)

---

## 📄 문서 목록

### **메인 가이드**

| # | 문서명 | Link | 개요 |
| --- | --- | --- | --- |
| **000** | **TEMPLATES 인덱스** | [000_TEMPLATES_README.md](./000_TEMPLATES_README.md) | 이 폴더의 개요 |
| **010** | **Quick Reference** | [010_QUICK_REFERENCE_TEMPLATE.md](./010_QUICK_REFERENCE_TEMPLATE.md) | 한눈에 보는 개발 흐름 |
| **020** | **Onboarding Guide** | [020_ONBOARDING_TEMPLATE.md](./020_ONBOARDING_TEMPLATE.md) | 첫 기능 개발 가이드 (4-5시간) |
| **030** | **Troubleshooting** | [030_TROUBLESHOOTING_TEMPLATE.md](./030_TROUBLESHOOTING_TEMPLATE.md) | 문제 해결 Q&A |

### **Phase별 체크리스트** (050_CHECKLISTS_TEMPLATE/)

| # | 문서명 | 용도 |
| --- | --- | --- |
| **051** | **Phase 1 Design** | 설계 단계 (Self Check) |
| **052** | **Phase 2 Execute** | 구현 단계 (Self Test) |
| **053** | **Phase 3 Verify** | 검증 단계 (Claude 검증) |
| **054** | **Commit** | 커밋 전 최종 확인 |

### **설정 가이드** (040_SETUP_TEMPLATE/)

| # | 문서명 | 용도 |
| --- | --- | --- |
| **041** | **Ollama 직접 설치** | 로컬 개발 환경 (권장) |
| **042** | **Docker Compose** | 팀 표준화/배포 환경 |

---

## 📁 폴더 구조

```
09_TEMPLATES/
├── 000_TEMPLATES_README.md (이 파일)
├── 010_QUICK_REFERENCE_TEMPLATE.md
├── 020_ONBOARDING_TEMPLATE.md
├── 030_TROUBLESHOOTING_TEMPLATE.md
├── 040_SETUP_TEMPLATE/
│   ├── 041_OLLAMA_DIRECT_INSTALL_TEMPLATE.md
│   └── 042_DOCKER_COMPOSE_OLLAMA_TEMPLATE.md
└── 050_CHECKLISTS_TEMPLATE/
    ├── 051_PHASE_1_DESIGN_CHECKLIST.md
    ├── 052_PHASE_2_EXECUTE_CHECKLIST.md
    ├── 053_PHASE_3_VERIFY_CHECKLIST.md
    └── 054_COMMIT_CHECKLIST.md
```

---

## 🚀 사용 시나리오

### **시나리오 1: 새 프로젝트 시작**

```
Step 1: 010_QUICK_REFERENCE 읽기 (5분)
  └─ 개발 흐름 이해

Step 2: 040_SETUP_TEMPLATE 실행 (15-20분)
  ├─ 041_OLLAMA_DIRECT_INSTALL (로컬)
  └─ 042_DOCKER_COMPOSE (팀 협업, 선택)

Step 3: 020_ONBOARDING 따라하기 (4-5시간)
  ├─ Phase 1: 설계 + Self Check
  ├─ Phase 2: 구현 + Self Test
  ├─ Phase 3: Claude 검증
  └─ Phase 4: 커밋

Result: 첫 기능 완성! ✅
```

### **시나리오 2: 문제 발생**

```
문제 발생
  ↓
030_TROUBLESHOOTING_TEMPLATE에서 검색
  ├─ 찾음 → 해결 방법 실행
  └─ 못 찾음 → 팀 리더 상담
```

### **시나리오 3: 각 Phase 진행**

```
Phase 1 설계: 051_PHASE_1_DESIGN_CHECKLIST 사용
Phase 2 구현: 052_PHASE_2_EXECUTE_CHECKLIST 사용
Phase 3 검증: 053_PHASE_3_VERIFY_CHECKLIST 사용
커밋 전: 054_COMMIT_CHECKLIST 확인
```

---

## 💡 템플릿 커스터마이징

### PM/Leader가 해야 할 일

새 프로젝트마다:

```
1. 이 폴더의 모든 템플릿 복사
2. 다음 항목 변경:
   - [PROJECT_NAME] → 실제 프로젝트명
   - [TECH_STACK] → 기술스택
   - [TEAM_SIZE] → 팀 규모
   - [TODO] → 프로젝트별 추가 항목
3. 팀에 배포
4. 온보딩 시작 (020_ONBOARDING 사용)
```

---

## 📊 권장 사용 시간

| 항목 | 소요 시간 |
| --- | --- |
| Quick Reference 읽기 | 5분 |
| 설정 (040_SETUP) | 15-20분 |
| Onboarding (020_) | 4-5시간 |
| 문제 해결 (030_) | 상황별 |
| 체크리스트 사용 | Phase별 30분-2시간 |

---

## 📚 통합 흐름

```
새 프로젝트/기능 시작
       ↓
010_QUICK_REFERENCE (5분) - 흐름 이해
       ↓
040_SETUP_TEMPLATE (20분) - 환경 설정
       ↓
020_ONBOARDING (4-5시간) - Phase 1-4 진행
  ├─ 051 체크리스트 (Phase 1)
  ├─ 052 체크리스트 (Phase 2)
  ├─ 053 체크리스트 (Phase 3)
  └─ 054 체크리스트 (커밋)
       ↓
완료! ✅
```

---

## 🔗 관련 링크

- [00_GUIDE/000_GUIDE_README.md](../00_GUIDE/000_GUIDE_README.md) - 전체 개발 방법론
- [00_GUIDE/201_SAR_RULE.md](../00_GUIDE/201_SAR_RULE.md) - SAR 작성 규칙
- [08_Self_Audit/001_Self_Audit_Overview.md](../08_Self_Audit/001_Self_Audit_Overview.md) - 오류 관리

---

**버전**: v1.0 | **최종 업데이트**: 2026-04-08
