---
name: Documentation README Link Mismatches
description: 000_GUIDE_README.md의 파일 링크가 실제 파일명과 불일치
category: Documentation
severity: MEDIUM
date: 2026-04-08
author: Claude Code
---

# SAR_2026-04-08_001: 문서 링크 오류

## 현상 (What)

**발생 위치:** `docs/00_GUIDE/000_GUIDE_README.md`

000_GUIDE_README.md 파일의 여러 링크가 실제 파일명과 일치하지 않음:

### 링크 오류 목록

| 행 | 현재 링크 | 실제 파일명 | 상태 |
|---|---------|---------|------|
| 40 | `[ZEN_A4_METHODOLOGY.md](./ZEN_A4_METHODOLOGY.md)` | `101_ZEN_A4_METHODOLOGY.md` | ❌ 미정상 |
| 41 | `[INTEGRATED_DEVELOPMENT_METHODOLOGY.md](./INTEGRATED_DEVELOPMENT_METHODOLOGY.md)` | `102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md` | ❌ 미정상 |
| 49 | `[SAR_RULE.md](./SAR_RULE.md)` | `201_SAR_RULE.md` | ❌ 미정상 |
| 50 | `[CHECK_LIST_PROCEDURE.md](./CHECK_LIST_PROCEDURE.md)` | `202_CHECK_LIST_PROCEDURE.md` | ❌ 미정상 |
| 51 | `[PROJECT_APPLICATION_CHECKLIST.md](./PROJECT_APPLICATION_CHECKLIST.md)` | `203_PROJECT_APPLICATION_CHECKLIST.md` | ❌ 미정상 |
| 240 | `[../093_Reference/]` | `../10_Reference/` | ❌ 미정상 |

**결과:** 링크 클릭 시 404 오류 발생 (파일을 찾을 수 없음)

---

## 원인 (Why)

### 직접적 원인
폴더 구조 개선 시 파일명에 prefix 번호를 추가했으나, README의 링크를 함께 갱신하지 않음

**변경 내용:**
```
변경 전: ZEN_A4_METHODOLOGY.md
변경 후: 101_ZEN_A4_METHODOLOGY.md (prefix 번호 추가)

README는 여전히: [ZEN_A4_METHODOLOGY.md](./ZEN_A4_METHODOLOGY.md) ← 미갱신
```

### 근본 원인
- 파일명 변경과 문서 링크 갱신이 별개의 작업으로 취급됨
- README 링크 검증 없이 파일명만 변경함
- 리뷰 시 링크 일관성 점검 미포함

### 기여 요소
- 자동화된 링크 검증 프로세스 부재
- Check List에 "링크 검증" 항목 미포함

---

## 조치 (How)

### 수정 전
```markdown
| **102** | **ZEN_A4 자동 리뷰 시스템** | [ZEN_A4_METHODOLOGY.md](./ZEN_A4_METHODOLOGY.md) |
| **103** | **통합 개발 방법론** | [INTEGRATED_DEVELOPMENT_METHODOLOGY.md](./INTEGRATED_DEVELOPMENT_METHODOLOGY.md) |
...
| **201** | **SAR 작성 규칙** | [SAR_RULE.md](./SAR_RULE.md) |
```

### 수정 후
```markdown
| **101** | **ZEN_A4 자동 리뷰 시스템** | [101_ZEN_A4_METHODOLOGY.md](./101_ZEN_A4_METHODOLOGY.md) |
| **102** | **통합 개발 방법론** | [102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md](./102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md) |
...
| **201** | **SAR 작성 규칙** | [201_SAR_RULE.md](./201_SAR_RULE.md) |
```

### 수정 범위
- [x] 문서 목록 테이블의 모든 링크 수정 (행 40, 41, 49, 50, 51)
- [x] 빠른 시작 섹션의 모든 링크 수정 (행 181-187)
- [x] 관련 링크 섹션 수정 (행 240)
- [x] 마크다운 포맷팅 개선 (리스트 주변 빈 줄 추가)

---

## 검증 (Verification)

### 링크 검증
✅ 모든 링크를 실제 파일과 비교하여 검증 완료

```
확인 항목:
✓ 101_ZEN_A4_METHODOLOGY.md - 파일 존재 확인
✓ 102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md - 파일 존재 확인
✓ 201_SAR_RULE.md - 파일 존재 확인
✓ 202_CHECK_LIST_PROCEDURE.md - 파일 존재 확인
✓ 203_PROJECT_APPLICATION_CHECKLIST.md - 파일 존재 확인
✓ 10_Reference/ - 폴더 존재 확인
```

### 마크다운 검증
✅ IDE 마크다운 lint 통과 (모든 경고 해결)

```
해결된 문제:
✓ MD022: 제목 주변 빈 줄 추가
✓ MD031: 펜스 코드블록 주변 빈 줄 추가
✓ MD032: 리스트 주변 빈 줄 추가
```

---

## 예방 (Prevention)

### Check List에 추가할 항목

**문서 작성 & 관리 (001-099 범위) Phase 1 체크리스트:**

```
□ 링크 검증: README의 모든 파일 링크가 실제 파일명과 일치하는지 확인
  - 폴더 구조 변경 후 필수
  - 파일명 변경 후 필수
  - 새 문서 추가 후 필수
```

### 설계 개선

1. **파일명 변경 규칙**
   - 파일명 변경 시 모든 링크를 함께 검사하는 체크리스트 항목 추가
   - 변경 전후 링크 일관성 확인 필수

2. **자동화 고려**
   - 향후 문서 링크 자동 검증 스크립트 개발 (별도 프로젝트)
   - GitHub Actions에서 링크 검증 CI/CD 추가 검토

### 팀 공유

- **온보딩:** 새 팀원에게 "파일명 변경 시 링크 갱신" 규칙 교육
- **코드 리뷰:** 문서 변경 시 링크 검증 항목 필수 포함
- **Check List:** 모든 Phase 1 체크리스트에 이 항목 추가

---

**SAR ID:** SAR-001  
**상태:** ✅ 수정 완료  
**최종 검증:** 2026-04-08  
**예방 적용:** Check List 업데이트 필요
