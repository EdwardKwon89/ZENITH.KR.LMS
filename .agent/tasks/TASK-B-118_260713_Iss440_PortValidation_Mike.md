# TASK-B-118: Issue #440 (P1) — origin_port/dest_port 검증 오류 + DOC 무한 루프 수정

| 메타 | 값 |
|:----|:----|
| **Issue** | [#440](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/440) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-13 |
| **상태** | ✅ 완료 (Aiden 승인·머지) |

## 작업 결과

### 변경 내용

#### 수정: `src/components/orders/OrderRegistrationForm.tsx`

**A. origin_port_id/dest_port_id 검증 오류 수정 (428~431행)**
- `setValue('origin_port_id', '')` → `setValue('origin_port_id', undefined)`
- `setValue('dest_port_id', '')` → `setValue('dest_port_id', undefined)`
- 빈 문자열은 `.uuid()` 검증을 타서 실패 → `undefined`로 변경하여 `.optional()`이 검증 건너뛰도록 수정

**B. DOC content_type 치수 초기화 무한 루프 수정 (439~448행)**
- `watchedPackages` 배열 참조 대신 `contentTypesKey` (useMemo로 안정화된 문자열) 의존성 사용
- `if (pkg.length !== undefined || pkg.width !== undefined || pkg.height !== undefined)` 가드 추가 — 이미 undefined면 setValue 스킵

### 검증
- **Build PASS** ✅
- **Regression**: 81/81 ALL PASS (485 tests)

### 커밋
- `8a5e4380` — `[Mike] fix: TASK-B-118 Issue #440 port validation 오류 + DOC 무한 루프 수정`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/442 — ✅ Aiden 승인·머지 완료(2026-07-13)

## [Aiden 검토]

승인. Issue #440은 3개 결함 복합 이슈 중 1순위(포트 검증+DOC 무한루프)만 해결 — 잔여(주소록 전체정보 저장/불러오기 매핑 오류)는 Open 유지, 후속 Task 필요.
