# ✅ Check List 관리 절차 (CHECK_LIST_PROCEDURE)

> **문서 목적:** SAR로부터 Check List를 체계적으로 생성하고 관리하는 절차  
> **적용 대상:** 모든 개발자 (Phase 1/2/3)  
> **작성일:** 2026-04-17
> **버전:** 1.1

---

## 📌 개요

**Check List의 생명주기:**

```
SAR 작성 (오류 기록)
    ↓
Check List 항목 생성 (예방 규칙)
    ↓
다음 기능 시 확인 (재발 방지)
    ↓
월 1회 검토 (중복 정리)
    ↓
팀 공유 (집단 지식)
    ↓
점검 이력 기록 (Logging) [2026-04-17 추가]
```

---

## 🔄 4단계 절차

### **Step 1: SAR 작성 시점 결정**

#### **Phase 1 (Self Check)에서 오류 발견**

```
Self Check 항목 탈락
  ↓
"아, 이게 빠졌네?" 발견
  ↓
SAR 작성
  → 파일: SAR_YYYY-MM-DD_NNN_Design_누락내용.md

예:
"요구사항 정의가 불명확하다" → SAR 작성
"아키텍처 설계가 미흡하다" → SAR 작성
```

#### **Phase 2 (Self Test)에서 오류 발견**

```
테스트 실패
  ↓
"왜 실패했나?" 분석
  ↓
원인: 구현 미흡, 테스트 부족 등
  ↓
SAR 작성
  → 파일: SAR_YYYY-MM-DD_NNN_Implementation_누락내용.md

예:
"null check 빠뜨렸네" → SAR 작성
"엣지 케이스 테스트 누락" → SAR 작성
```

#### **Phase 3 (Claude 검증)에서 오류 발견**

```
Claude Code에서 지적 사항
  ↓
"이건 정말 놓쳤다" 확인
  ↓
SAR 작성
  → 파일: SAR_YYYY-MM-DD_NNN_Security_누락내용.md

예:
"환경 변수 검증이 없네" → SAR 작성
"입력값 검증 누락" → SAR 작성
```

---

### **Step 2: Check List 항목 생성**

#### **원칙: 1 SAR = 1개 이상의 Check List 항목**

**타이밍:** SAR 작성 후 **같은 날 또는 다음날**

#### **생성 방식**

```
SAR의 "Prevention" 섹션 읽기
  ↓
"앞으로 어떻게 방지할 것인가?" 추출
  ↓
이를 Check List 항목으로 변환
```

#### **예시**

**SAR 작성 내용:**
```markdown
---
name: refreshToken에서 null 처리 누락
category: Implementation
---

## 예방 (Prevention)

### Check List에 추가할 항목
□ Null Check: 모든 외부 API 응답 검증
□ Error Handling: try-catch 또는 if 검사 필수
□ Testing: 실패 케이스 포함 필수

### 설계 개선
- 함수 명세에 "반환값: null 가능성" 명시
```

**Check List 추가:**
```markdown
## Phase 1: Design Check (자동으로 추가)
□ 함수 명세: 반환값이 null이 될 수 있으면 명시 (SAR-002)

## Phase 2: Implementation Check (자동으로 추가)
□ Null Check: 모든 외부 API 응답 검증 (SAR-002)
□ Error Handling: try-catch 또는 if 검사 필수 (SAR-002)
□ Testing: 실패 케이스 포함 필수 (SAR-002)
```

#### **Check List 항목 작성 규칙**

```
Good:
□ Null Check: 모든 외부 API 응답 검증 (SAR-002)
□ Environment Variable: 모든 민감한 설정값은 .env에서 로드 (SAR-005)
□ Input Validation: 사용자 입력값은 항상 타입/범위 검증 (SAR-008)

Bad:
□ 오류 처리하기
□ 테스트 추가하기
□ 조심하기

구체성: "어디에" "무엇을" "왜" 명확
```

---

### **Step 3: Check List 검증**

#### **매 새로운 기능 시작 시:**

```
기능 시작
  ↓
Phase 1 Self Check 체크리스트 열기
  ↓
Check List 항목 모두 검토
  ├─ 이전 오류와 같은가? → 이번에는 주의
  ├─ 새로운 오류 발견 → 그 때 추가
  └─ 해당 없나? → 스킵
  ↓
Phase 1 설계 진행
```

#### **각 Phase별 Check List 확인 시점**

| Phase | 시점 | 확인 대상 |
|-------|------|---------|
| **Phase 1** | 설계 시작 | Design 관련 모든 항목 |
| **Phase 2** | 구현 시작 | Implementation, Testing, Security 항목 |
| **Phase 3** | Claude 검증 전 | Security, Performance, Integration 항목 |
| **매월** | 월 1회 | 모든 항목 검토 & 중복 정리 |

#### **확인 방식**

```bash
# 1. 해당 Phase의 Check List 열기
cat docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_1_DESIGN_CHECKLIST.md

# 2. 각 항목 확인
□ 요구사항이 명확한가?
□ 아키텍처 설계가 완료되었나?
□ Check List의 모든 항목 확인
  ├─ "Null Check: 모든 외부 API 응답 검증 (SAR-002)" → 이 기능에 해당? YES/NO
  ├─ "Environment Variable: .env 검증 (SAR-005)" → 이 기능에 해당? YES/NO
  └─ ...

# 3. Phase 완료
Self Check ✓ 또는 오류 발견 → SAR 작성
```

---

### **Step 4: 정기적 검토 (월 1회)**

#### **목적**
- 중복 항목 정리
- 불필요한 항목 제거
- 새로운 패턴 발견
- 팀과 공유

#### **실행 시기**
매월 마지막 주 금요일 (예: 4월 26일)

#### **검토 항목**

```
1. 중복 제거
   Before:
   □ Null Check: API 응답 (SAR-002)
   □ Null Check: 모든 응답값 (SAR-008)
   
   After:
   □ Null Check: 모든 외부 응답 (SAR-002, SAR-008)

2. 오래된 항목 제거
   "3개월 이상 SAR 없는 항목"
   → 해당 실수가 거의 없다는 뜻
   → 혼자 알고 있다는 뜻
   → 제거 고려

3. 새로운 패턴 발견
   "이번 달 SAR이 많은 분류는?"
   → Design 오류: 설계 프로세스 강화 필요
   → Security 오류: 보안 교육 필요

4. 팀 공유
   "이번 달 주요 오류 TOP 3"
   → 팀 회의에서 공유
   → 다른 팀원도 같은 실수 방지
```

#### **월간 검토 템플릿**

```markdown
# 월간 Check List 검토 (2026년 4월)

## 📊 SAR 통계
- 총 SAR: 15개
- Design: 5개 (33%)
- Implementation: 7개 (47%)
- Security: 2개 (13%)
- 기타: 1개 (7%)

## 🔴 높은 오류율 영역
- Implementation (47%) → 테스트 강화 필요
- Null Check (5개) → 이것이 주요 문제

## ✅ Check List 업데이트
- 추가: 5개 항목
- 제거: 2개 항목 (3개월 이상 SAR 없음)
- 수정: 3개 항목 (명확성 개선)

## 📋 최종 Check List 항목 수
- 4월 초: 25개
- 4월 말: 28개 (25 + 5 - 2)

## 💬 팀 공유 사항
1. "Null Check"가 여전히 주요 이슈
2. "Null Check 체크리스트" 리뷰 강화 필요
3. 코드 리뷰에서 null check 필수 확인
```

---

## 📁 Check List 저장 위치

### **위치별 파일**

```
docs/090_TEMPLATES/CHECKLISTS_TEMPLATE/
├── PHASE_1_DESIGN_CHECKLIST.md
│   └─ 설계 단계 Check List
│      └─ "함수 명세: null 가능성 명시" 등
│
├── PHASE_2_EXECUTE_CHECKLIST.md
│   └─ 구현 단계 Check List
│      └─ "Null Check: 모든 응답" 등
│
└── PHASE_3_VERIFY_CHECKLIST.md
    └─ 검증 단계 Check List
       └─ "Security: 입력값 검증" 등
```

### **Phase별 Check List 구성**

```
## PHASE 1: DESIGN CHECK
- [ ] 요구사항이 명확한가?
- [ ] 아키텍처가 정의되었나?
- [ ] 함수 명세: null 가능성 명시 (SAR-002)
- [ ] 에러 처리 전략: 미리 정의 (SAR-004)
- [ ] 보안 고려사항: 미리 검토 (SAR-005)

## PHASE 2: IMPLEMENTATION CHECK
- [ ] Null Check: 모든 외부 API 응답 (SAR-002)
- [ ] Error Handling: try-catch 또는 if (SAR-004)
- [ ] Input Validation: 타입/범위 검증 (SAR-006)
- [ ] Test Coverage: 80% 이상 (SAR-007)
- [ ] Edge Cases: 실패 케이스 포함 (SAR-003)

## PHASE 3: VERIFY CHECK
- [ ] Security Review: 입력값, 환경변수, 인증 (SAR-005)
- [ ] Performance Review: N+1, 메모리 누수 (SAR-009)
- [ ] Code Review: 스타일, 가독성 (SAR-010)
```

---

## 🚀 실전 사용 예

### **시나리오 1: 첫 번째 기능 개발**

```
Week 1: 사용자 로그인 기능

1. Phase 1 시작
   - PHASE_1_DESIGN_CHECKLIST.md 열기
   - "요구사항이 명확한가?" → 체크
   - "함수 명세: null 가능성 명시?" → 체크
   
2. 설계 완료
   - Self Check 통과
   
3. Phase 2 시작
   - PHASE_2_EXECUTE_CHECKLIST.md 열기
   - "Null Check: 모든 응답?" → 네, 했어요 (SAR-002 덕분)
   - "Input Validation: 타입/범위?" → 체크 중
   
4. 테스트 실패
   - "엣지 케이스 누락"
   - SAR 작성: SAR_2026-04-10_001_Testing_엣지케이스누락.md
   - Check List에 추가: "□ Edge Case: 빈 입력, 특수문자, 초과 길이"
   
5. 재테스트 성공
   - Self Test ✓
   
6. Phase 3
   - Claude 검증 → "환경 변수 검증 누락?"
   - SAR 작성: SAR_2026-04-10_002_Security_환경변수검증누락.md
   - Check List에 추가: "□ Environment: 모든 SECRET은 .env에서 로드"
   
Result:
  - Check List: 0개 → 3개 항목 추가
  - 다음 기능에서 같은 오류 방지
```

### **시나리오 2: 두 번째 기능 개발**

```
Week 3: 토큰 리프레시 기능

1. Phase 1 시작
   - PHASE_1_DESIGN_CHECKLIST.md 열기
   - 기존 3개 항목 모두 확인
   
2. Phase 1 설계
   - "함수 명세: null 가능성 명시?" → 처음부터 했어요! (SAR-001 덕분)
   - "Edge Case 고려?" → 했어요! (SAR-003 덕분)
   - "Environment 검증?" → 했어요! (SAR-002 덕분)
   
3. Phase 2 구현
   - Check List 모두 반영 → 오류 0개!
   - Self Test 첫 시도에 통과
   
4. Phase 3 검증
   - Claude: "좋네요! 깔끔합니다"
   - SAR 0개
   
Result:
  - 시간 절약: 이전 2시간 → 이번 0.5시간
  - 오류 방지: 100% (Check List 덕분)
```

---

## 📊 Check List 효과 측정

### **추적 항목**

| 지표 | 주 1 | 주 2 | 주 3 | 주 4 | 추세 |
|------|------|------|------|------|------|
| **Check List 항목** | 0 | 3 | 7 | 12 | ↑ |
| **SAR 작성 수** | 5 | 4 | 3 | 2 | ↓ |
| **재발 오류** | 0 | 0 | 0 | 0 | ✓ |
| **Phase별 통과율** | 60% | 75% | 85% | 95% | ↑ |
| **평균 개발 시간** | 8시간 | 7시간 | 5시간 | 4시간 | ↓ |

### **Step 5: 점검 이력 기록 (Logging) [2026-04-17 추가]**

#### **목적**
- 어떤 기능에 대해, 언제, 누가, 어떤 체크리스트를 점검했는지 증적을 남깁니다.
- 코드 리뷰나 QA 시 점검 누락 여부를 확인하는 근거로 사용합니다.

#### **파일명 규칙**
```
docs/09_Checklists/log/LOG_YYYY-MM-DD_[기능명].md
```

#### **로그 작성 시점**
- Phase 1, 2, 3의 각 단계를 완료할 때마다 또는 모든 Phase가 끝난 최종 시점에 작성합니다.

#### **필수 포함 내용**
1. **점검 정보**: 일시, 작업자, 기능명, 관련 WBS 번호.
2. **점검 대상**: 사용한 체크리스트 템플릿 정보.
3. **점검 결과**: 각 섹션별 통과 여부 및 발견된 특이 사항.
4. **연관 SAR**: 해당 작업 중 발행된 SAR 링크.

---

## ⚙️ 자동화 고려사항 (선택, 1개월 후)

### **1개월 운영 후, 필요하면 자동화:**

```
IF Check List 항목 > 40개:
  → Check List 카테고리화 필요
  → 자동 필터링 도구 고려

IF SAR 파일 > 50개:
  → SAR 검색이 어렵다
  → 데이터베이스화 또는 태깅 고려

IF 월간 검토에 > 1시간:
  → 자동 분류 도구 고려

ELSE:
  → 현재 수동 방식으로 충분
```

---

## 📚 참고 자료

- [SAR 작성 규칙](./SAR_RULE.md)
- [Phase 1 Design Checklist](../090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_1_DESIGN_CHECKLIST.md)
- [Phase 2 Execute Checklist](../090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_2_EXECUTE_CHECKLIST.md)
- [Phase 3 Verify Checklist](../090_TEMPLATES/CHECKLISTS_TEMPLATE/PHASE_3_VERIFY_CHECKLIST.md)
- [통합 개발 방법론](./INTEGRATED_DEVELOPMENT_METHODOLOGY.md)

---

**문서 작성자:** Team Lead  
**최종 검토:** 2026-04-08  
**버전:** 1.0
