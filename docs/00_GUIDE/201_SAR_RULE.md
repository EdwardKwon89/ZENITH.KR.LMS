# 📋 SAR (Self_Audit_Report) 작성 규칙

> **문서 목적:** 개발 중 발견된 모든 오류를 일관되게 기록하고 관리하는 규칙  
> **적용 대상:** 모든 개발자 (Phase 1/2/3에서 오류 발견 시)  
> **최종 업데이트:** 2026-04-08  
> **버전:** 1.0

---

## 📌 개요

**SAR은 "오류를 기록하고 재발을 방지하는 팀의 집단 지식"입니다.**

- Self Check 실패 → SAR 작성
- Self Test 실패 → SAR 작성
- Claude 검증 실패 → SAR 작성

**각 SAR은:**
1. 오류 정보 기록 (현상/원인/조치)
2. Check List 항목 생성 (재발 방지)
3. 팀 지식으로 축적 (다음 프로젝트에서 재사용)

---

## 🗂️ 파일 저장 위치

```
docs/081_Self_Audit/SAR_reports/
├── SAR_2026-04-08_001_Design_설계누락.md
├── SAR_2026-04-08_002_NullReference_토큰검증.md
├── SAR_2026-04-09_003_Security_환경변수미설정.md
└── ...
```

---

## 📝 파일명 규칙

### **형식**
```
SAR_YYYY-MM-DD_NNN_[오류분류]_[간단한설명].md
```

### **예시**
```
✅ SAR_2026-04-09_001_Design_아키텍처미흡.md
✅ SAR_2026-04-09_002_Implementation_NullCheck누락.md
✅ SAR_2026-04-09_003_Security_환경변수검증누락.md
✅ SAR_2026-04-10_004_Testing_엣지케이스누락.md

❌ SAR_오류.md (너무 간단)
❌ SAR_2026-04-09_null_reference_error.md (영문 혼용, NNN 없음)
```

### **NNN 번호 규칙**
- 프로젝트당 001부터 시작
- 매일 증가하지만, 월 단위로 리셋 가능
- 예: 4월 001~999, 5월 001부터 다시

---

## 🏷️ 오류 분류 (Category)

### **8가지 표준 분류**

| 분류 | 설명 | 예시 |
|------|------|------|
| **Design** | 아키텍처/설계 미흡 | 모듈 구조 부적절, 인터페이스 미정의 |
| **Implementation** | 구현 오류 (로직/타입) | null check 누락, 타입 오류, 예외 처리 누락 |
| **Testing** | 테스트 미흡 | 엣지 케이스 누락, 커버리지 부족 |
| **Security** | 보안 취약점 | 입력 검증 누락, 환경 변수 노출, 인증 오류 |
| **Performance** | 성능 문제 | N+1 쿼리, 메모리 누수, 불필요한 반복 |
| **Integration** | 통합/연동 오류 | API 스펙 불일치, DB 스키마 오류 |
| **Documentation** | 문서 부족 | 함수 설명 누락, 설정 가이드 부재 |
| **Other** | 기타 | 위 분류에 해당 없음 |

### **분류 선택 기준**

```
오류 발견 → 가장 근본적인 원인으로 분류

예:
"API 응답이 null이면서 crash 발생"
├─ 증상: null reference (구현)
├─ 근본 원인: 오류 처리 누락 (설계)
└─ 분류: Design ← 설계 오류가 근본

"암호 평문 저장"
├─ 증상: 보안 취약 (보안)
├─ 근본 원인: 해싱 로직 누락 (구현)
└─ 분류: Security ← 보안 영역이 우선
```

---

## 🔴 심각도 분류 (Severity)

### **4가지 심각도**

| 심각도 | 정의 | 예시 | 처리 |
|--------|------|------|------|
| **CRITICAL** | 보안/데이터 손실 위험 | 평문 암호 저장, SQL injection, 인증 우회 | 🛑 즉시 수정 |
| **HIGH** | 기능 장애 또는 심각 버그 | null reference crash, 데이터 손실, API 오류 | ⚠️ 오늘 수정 |
| **MEDIUM** | 코드 품질/안정성 문제 | 오류 처리 부족, 엣지 케이스 누락 | 📋 3일 내 수정 |
| **LOW** | 스타일/미흡함 | 함수명 불명확, 주석 누락 | 💡 다음 리팩토링 시 |

---

## 📄 SAR 필수 섹션

### **템플릿**

```markdown
---
name: [간단한 오류 제목]
description: [1줄 요약]
category: [Design/Implementation/Testing/Security/Performance/Integration/Documentation/Other]
severity: [CRITICAL/HIGH/MEDIUM/LOW]
date: YYYY-MM-DD
author: [작성자명]
---

## 현상 (What)

[무엇이 일어났는가? 구체적으로 설명]

**발생 위치:** [파일:줄번호]
**오류 메시지:** [있으면 붙여넣기]

예:
```
function refreshToken() {
  const token = fetchToken();  // null일 수 있음
  return jwt.verify(token);    // ← 여기서 crash
}
```

## 원인 (Why)

[왜 이런 오류가 발생했나? 근본 원인 분석]

### 직접적 원인
[즉각적인 원인]

### 근본 원인
[깊은 원인 - 설계/구현 문제]

### 기여 요소
[다른 요인들 - 테스트 부재, 문서 누락 등]

예:
```
직접적 원인: fetchToken()이 null을 반환할 수 있지만 null check 없음

근본 원인: 
- API 응답 실패 케이스 처리 로직 미설계
- 에러 핸들링 표준 미정의

기여 요소:
- 단위 테스트에서 실패 케이스 미포함
- 함수 명세 부재
```

## 조치 (How)

[어떻게 수정했나? 구체적 코드 변경]

### 수정 전
```javascript
function refreshToken() {
  const token = fetchToken();
  return jwt.verify(token);  // null crash!
}
```

### 수정 후
```javascript
function refreshToken() {
  const token = fetchToken();
  if (!token) {
    throw new Error('Token fetch failed');
  }
  return jwt.verify(token);
}
```

### 수정 범위
- [ ] 해당 함수만 수정
- [ ] 유사 함수들도 동일 패턴 적용
- [ ] 테스트 코드 추가
- [ ] 문서 업데이트

## 검증 (Verification)

[수정이 제대로 되었나 어떻게 확인했나?]

### 테스트
```bash
# 실패 케이스 테스트
npm test -- refreshToken.test.js

# 결과
✓ should throw error when token fetch fails
✓ should return valid token when success
```

### 수동 테스트
- [ ] 로컬에서 테스트 완료
- [ ] 다양한 입력값으로 테스트
- [ ] 엣지 케이스 확인

## 예방 (Prevention)

[앞으로 같은 오류를 어떻게 방지할 것인가?]

### Check List에 추가할 항목
```
□ Null Check: 모든 외부 API 응답 검증 (SAR-NNN)
□ Error Handling: try-catch 또는 if 검사 필수
□ Testing: 실패 케이스 포함 필수
```

### 설계 개선
- 함수 명세에 "반환값: null 가능성" 명시
- API 에러 처리 가이드 문서화

### 팀 공유
- 다음 온보딩에 이 패턴 교육
- 코드 리뷰 체크리스트에 추가
```

---

## 📌 작성 가이드

### **1. 현상 (What) - 구체적으로**

```
❌ "오류가 났어요"
✅ "refreshToken() 호출 시 TypeError: Cannot read property 'verify' of null
   at line 45 in auth.js"
```

### **2. 원인 (Why) - 근본까지**

```
❌ "fetchToken()이 null을 반환했어요"
✅ "네트워크 오류 시 fetchToken()이 null을 반환하지만,
   함수 설계에서 null 체크가 없음.
   근본: null을 반환할 수 있는 함수를 호출하는 곳마다
   null 체크하는 관례가 미정립됨"
```

### **3. 조치 (How) - 코드로**

```
❌ "if 문을 추가했습니다"
✅ "if (!token) { throw new Error(...) }를 line 44에 추가
   이를 통해 null이 verify()에 전달되지 않도록 방지"
```

### **4. 예방 (Prevention) - 구체적으로**

```
❌ "앞으로 조심하겠습니다"
✅ "Check List에 다음 추가:
    □ Null Check: 외부 API 응답은 항상 null 체크
    코드 리뷰 시 이 항목 필수 확인"
```

---

## ⏱️ SAR 작성 시간 가이드

| 심각도 | 소요 시간 | 타이밍 |
|--------|---------|--------|
| CRITICAL | 5-10분 (빠르게) | 즉시 수정 후 |
| HIGH | 10-15분 | 오류 수정 후 |
| MEDIUM | 15-20분 | Phase 2/3 완료 후 |
| LOW | 5-10분 | 주간 정리 시 |

---

## 🔍 SAR 검토 체크리스트

각 SAR 작성 후 자신에게 확인:

```
□ 파일명 형식 맞나? (YYYY-MM-DD_NNN_Category_설명)
□ 분류 올바른가? (가장 근본적인 원인으로)
□ 심각도 적절한가?
□ 현상이 명확한가? (구체적 오류 메시지/줄번호)
□ 원인을 3단계로 분석했나?
  □ 직접적 원인
  □ 근본 원인
  □ 기여 요소
□ 수정 코드가 명확한가? (before/after)
□ 검증이 되었나? (테스트 결과)
□ Check List 항목이 구체적인가?
□ 팀이 재사용할 수 있는가?
```

---

## 📊 SAR 관리 통계

**매월 분석:**

```
총 SAR 수: ___개
분류별:
  - Design: ___개 (__)
  - Implementation: ___개 (__)
  - Testing: ___개 (__)
  - Security: ___개 (__)
  - 기타: ___개 (__)

심각도별:
  - CRITICAL: ___개
  - HIGH: ___개
  - MEDIUM: ___개
  - LOW: ___개

추세:
  - 월 1 vs 월 2: 오류율 감소 __% ✅
```

---

## 📚 참고 자료

- [Check List 관리 절차](./CHECK_LIST_PROCEDURE.md)
- [통합 개발 방법론](./INTEGRATED_DEVELOPMENT_METHODOLOGY.md)
- [SAR 저장소](../081_Self_Audit/SAR_reports/)

---

**문서 작성자:** Team Lead  
**최종 검토:** 2026-04-08  
**버전:** 1.0
