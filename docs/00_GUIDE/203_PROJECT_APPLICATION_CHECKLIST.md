# 🚀 실 프로젝트 적용 체크리스트 (SAR & Check List 운영)

> **문서 목적:** 기존 프로젝트에 SAR & Check List 절차를 적용하기 위한 체크리스트  
> **적용 대상:** 프로젝트 리더, 팀 전체  
> **예상 시간:** 2-3일 (준비) + 지속 (운영)  
> **버전:** 1.0

---

## 📋 적용 전 준비 (2-3일)

### **준비 1: 문서 학습 (1일)**

```
□ SAR 작성 규칙 학습
  파일: docs/000_GUIDE/SAR_RULE.md
  소요: 30분
  체크: "8가지 오류 분류를 이해했는가?" YES/NO
  
□ Check List 관리 절차 학습
  파일: docs/000_GUIDE/CHECK_LIST_PROCEDURE.md
  소요: 30분
  체크: "4단계 절차를 이해했는가?" YES/NO

□ 팀 회의
  시간: 30분
  내용: 절차 설명, 질문 수답
  결과: 팀 모두 동의 및 이해 확인
```

### **준비 2: 기존 오류 분류 (선택, 1일)**

```
□ 기존 프로젝트에서 발생한 오류 목록 정리 (선택사항)
  "지난 1-3개월 동안 뭐가 문제였나?"
  예:
    - null reference crash 2건
    - 환경 변수 누락 1건
    - 테스트 누락 3건
    - 성능 저하 1건
  
  → 이들을 SAR로 작성? 선택
     (안 해도 되고, 해도 됨)

□ 기존 Check List 항목이 있다면 정리
  파일: docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_*.md
  내용: 중복 정리, 불명확한 항목 수정
```

### **준비 3: 환경 설정 (1시간)**

```
□ SAR 저장소 준비
  위치: docs/081_Self_Audit/SAR_reports/
  
  □ 디렉토리 생성 (이미 있으면 스킵)
    mkdir -p docs/081_Self_Audit/SAR_reports
  
  □ .gitkeep 파일 생성 (디렉토리 유지)
    touch docs/081_Self_Audit/SAR_reports/.gitkeep
  
  □ README.md 생성 (선택)
    내용: "이 디렉토리에 모든 SAR을 저장합니다"

□ Phase 체크리스트 준비
  파일들:
    - docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_1_DESIGN_CHECKLIST.md
    - docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_2_EXECUTE_CHECKLIST.md
    - docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_3_VERIFY_CHECKLIST.md
  
  확인:
    □ 세 파일 모두 존재?
    □ 기존 Check List 항목이 있나? (기록)
```

---

## 🔄 운영 방식 (지속)

### **일일 운영**

#### **Phase 1: Design (설계 시작)**

```
시간: 기능 설계 시작 시

Step 1: Phase 1 Check List 열기
  파일: docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_1_DESIGN_CHECKLIST.md
  
Step 2: 모든 체크 항목 확인
  □ 요구사항이 명확한가?
  □ 아키텍처 설계가 완료되었나?
  □ (SAR에서 나온) 기존 항목들 확인
  
Step 3: Self Check
  체크리스트 모두 통과? YES → Phase 2로
                      NO → SAR 작성 후 수정
```

#### **Phase 2: Implementation (구현)**

```
시간: 구현 시작 ~ 완료

Step 1: Phase 2 Check List 열기
  파일: docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_2_EXECUTE_CHECKLIST.md
  
Step 2: 구현 중 확인
  □ Null Check: 모든 응답 검증? YES
  □ Error Handling: try-catch? YES
  □ Unit Test: 작성했나? YES (커버리지 80%?)
  
Step 3: Self Test
  테스트 실패? YES → 원인 분석 → SAR 작성 → 수정 → 재테스트
           NO → Phase 3로
```

#### **Phase 3: Verify (검증)**

```
시간: Claude Code 검증 시점

Step 1: Phase 3 Check List 열기
  파일: docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_3_VERIFY_CHECKLIST.md
  
Step 2: Claude 검증
  "이 코드에서 뭐가 빠졌나?"
  → Security, Performance, Integration 등
  
Step 3: 오류 처리
  오류 발견? YES → SAR 작성 → 수정
           NO → Commit ✓
```

### **오류 발견 시 (즉시)**

```
어느 Phase에서든 오류 발견 시:

Step 1: SAR 작성 (10-20분)
  파일: docs/081_Self_Audit/SAR_reports/
  파일명: SAR_YYYY-MM-DD_NNN_Category_설명.md
  
  예: SAR_2026-04-10_001_Implementation_NullCheck누락.md
  
  내용:
  - 현상 (What)
  - 원인 (Why)
  - 조치 (How)
  - 검증 (Verification)
  - 예방 (Prevention)
  
  참고: [SAR 작성 규칙](SAR_RULE.md)

Step 2: Check List 항목 생성 (5-10분)
  출처: SAR의 "Prevention" 섹션
  
  예:
  SAR: "null 체크 누락 → 앞으로 모든 응답 검증"
  
  → Check List 추가:
     □ Null Check: 모든 외부 API 응답 검증 (SAR-001)
  
  저장: 해당 Phase의 체크리스트에 추가
  
  참고: [Check List 관리 절차](CHECK_LIST_PROCEDURE.md)

Step 3: 수정 및 재테스트 (30분~)
  코드 수정 → 테스트 → 통과 확인
```

### **월간 검토 (월 1회, 금요일)**

```
시간: 매월 마지막 주 금요일 (예: 4월 26일)
소요: 1-2시간

Step 1: SAR 통계 (30분)
  파일: docs/081_Self_Audit/SAR_reports/
  
  분석:
  □ 이번 달 총 SAR: ___개
  □ 분류별:
    - Design: ___개
    - Implementation: ___개
    - Testing: ___개
    - Security: ___개
    - 기타: ___개
  □ 심각도별:
    - CRITICAL: ___개
    - HIGH: ___개
    - MEDIUM: ___개
    - LOW: ___개

Step 2: Check List 정리 (30분)
  파일: docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_*.md
  
  작업:
  □ 중복 항목 통합
    Before: 
      □ Null Check (SAR-001)
      □ Null Check (SAR-008)
    After:
      □ Null Check (SAR-001, SAR-008)
  
  □ 불필요 항목 제거
    "3개월 이상 SAR 없는 항목" → 제거 고려
  
  □ 명확성 개선
    Bad: "조심하기"
    Good: "모든 API 응답값 null 체크"

Step 3: 팀 회의 (30분)
  내용:
  □ 이번 달 주요 오류 TOP 3
  □ 높은 오류율 영역 (왜?)
  □ Check List 개선 사항
  □ 다음 달 포커스
  
  예:
  "이번 달 null reference가 5건인데,
   Check List를 더 강조해야 할 것 같습니다"
```

---

## 📊 추적 항목 (월간)

**매월 마지막 주 금요일에 기록:**

```markdown
# 2026년 4월 월간 리포트

## SAR 통계
- 총 SAR: 15개
- Design: 5개, Implementation: 7개, Testing: 2개, Security: 1개

## Check List 현황
- 시작: 25개 항목
- 추가: 5개 (+20%)
- 제거: 2개 (-8%)
- 최종: 28개 항목

## 오류율 추이
- Week 1: 25% (10개 기능 중 2.5개 오류)
- Week 2: 20% (오류 감소)
- Week 3: 15%
- Week 4: 10%
- 월간 평균: 17.5% (vs 이전 월: 30%)

## 개선 사항
- Null check Check List 강화
- 테스트 엣지 케이스 항목 추가
- 환경 변수 검증 강화

## 다음 월 액션
- Check List 항목 정리 (중복 제거)
- 팀 교육: "Null Check 패턴" 재강조
```

---

## ⏱️ 타임라인 (1개월 운영)

```
Week 1: 기초 형성
  □ 팀 교육 (0.5일)
  □ 첫 기능 개발 시작
  □ SAR 0-3개 작성 (새로운 오류들)
  □ Check List 0-5개 항목 추가
  기대: 오류율 약 60% (아직 절차 미숙)

Week 2-3: 가속화
  □ SAR 3-5개 추가 (같은 패턴 반복)
  □ Check List 5-10개 항목 추가
  □ "어? 이건 이미 Check List에 있네?" 경험
  기대: 오류율 약 20-30% (절차 익숙)

Week 4: 정착
  □ SAR 2-3개 (새로운 영역의 오류만)
  □ Check List 15-20개 항목 누적
  □ 월간 검토 실행
  기대: 오류율 약 10% (체계 정착)

Month 2: 본 궤도
  □ Check List 적용 기능 증가
  □ 재발 오류 거의 없음
  □ 새로운 영역의 오류만 남음
  기대: 오류율 < 5% (체계 완성)
```

---

## 🎯 성공 지표

### **Goal: 점진적 오류 감소**

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| **오류율 감소** | Month 1: 50-60% ↓ | (월간 오류 수 추적) |
| **SAR 누적** | Month 1: 15-20개 | (SAR 파일 수 세기) |
| **Check List** | Month 1: 20-30개 | (체크리스트 항목 수) |
| **재발 오류** | Month 1: 0개 | (같은 오류 반복 여부) |
| **팀 만족도** | Week 2 이후 높음 | (팀 피드백) |

### **Goal: 자동화 검토**

Month 1 운영 후:
```
IF SAR > 50개 AND Check List > 40개:
  → 자동화 도구 개발 고려 (2주)
  → 데이터베이스, 태깅, 검색 기능
ELSE:
  → 수동 운영 지속
  → 안정적이고 비용 효율적
```

---

## 🆘 문제 해결

### **문제 1: SAR 작성이 너무 많음 (매일 5개+)**

```
진단: 오류가 많다 (절차 문제 아님)

해결:
1. Check List 검토 → 막는 것 추가
2. Phase 1 Self Check 강화
3. 팀 교육 보강
```

### **문제 2: SAR을 빠뜨린다**

```
진단: 절차 미숙 또는 시간 부족

해결:
1. 템플릿 간단하게 수정 (5분 내로)
2. 매일 SAR 작성 시간 정해두기 (예: 매일 4시)
3. 체크리스트에 "SAR 작성 여부" 항목 추가
```

### **문제 3: Check List가 너무 길어진다 (50+ 항목)**

```
진단: 세부 항목이 너무 많음

해결:
1. 항목 통합 (비슷한 것끼리)
2. 카테고리 분류
3. 필수/선택 구분
```

### **문제 4: Check List를 확인 안 한다**

```
진단: 절차 강제력 부족

해결:
1. Self Check/Test 게이트 강화
2. "Check List 확인" 항목을 필수로
3. PR 리뷰 시 "Check List 확인했나?" 묻기
```

---

## ✅ 첫 주 체크리스트 (지금 하기)

```
□ 팀 회의 (30분)
  - SAR & Check List 절차 설명
  - 질문 수답
  - 동의 확인

□ 문서 공유 (15분)
  - SAR_RULE.md 공유
  - CHECK_LIST_PROCEDURE.md 공유
  - 이 체크리스트 공유

□ 준비 완료 (15분)
  - SAR 저장소 생성
  - Phase 체크리스트 준비
  - 첫 기능 개발 시작 준비

□ 첫 기능 시작 (Week 1)
  - Phase 1 시작 → Check List 확인
  - Phase 2 시작 → Check List 확인
  - 오류 발견 → SAR 작성
  - 수정 → 재테스트

총 소요: 1시간 (준비) + 지속 (운영)
```

---

## 📞 질문이 있을 때

```
"SAR 뭐하는 거죠?"
→ [SAR 작성 규칙](SAR_RULE.md)의 개요 섹션

"Check List 항목을 어떻게 만들죠?"
→ [Check List 관리 절차](CHECK_LIST_PROCEDURE.md)의 Step 2

"월간 검토는 뭘 하나요?"
→ 이 문서의 "월간 검토" 섹션

"도구는 언제 만들어요?"
→ 1개월 운영 후, 필요하면
```

---

## 🚀 시작하기

**지금 바로:**
1. 팀 회의 예약 (30분)
2. 문서 3개 읽기 (1시간)
3. 준비 완료 (30분)

**그 다음:**
- 첫 기능 개발 시작 (Check List 확인)
- 오류 발견 → SAR 작성
- 매월 검토 (마지막 주 금요일)

**Result:** 1개월 후 오류율 50-60% 감소 ✅

---

**문서 작성:** Team Lead  
**최종 검토:** 2026-04-08  
**버전:** 1.0
