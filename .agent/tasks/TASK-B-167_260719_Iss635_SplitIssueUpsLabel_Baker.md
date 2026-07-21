# TASK-B-167: Issue #635 Task A — issueUpsLabel() 분리 (PACKED/RELEASED 분기)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#635](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/635) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-19 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. `src/app/actions/operations/ups-labels.ts` 수정

**목적**: `issueUpsLabel()` 함수가 한 번에 register+label을 모두 수행하던 구조를 분리하여, Warehouse UI에서 PACKED 단계와 RELEASED 단계를 독립적으로 호출할 수 있도록 함.

**3개 신규 함수 추가**:

1. **`registerUpsOrder(orderId)`** — SHXK createorder 호출 + zen_ups_label 저장 (기존 `issueUpsLabel`의 register 부분)
2. **`fetchAndIssueUpsLabel(orderId, docType?)`** — getnewlabel 호출 + label URL 반환 (기존 `issueUpsLabel`의 label 발급 부분)
3. **`cancelUpsRegistration(orderId)`** — removeorder 호출 + 라벨 레코드 삭제 (기존 cancelUpsLabel 분리)

**기존 `issueUpsOrder()` 함수는 유지** — backward compatibility (내부에서 registerUpsOrder + fetchAndIssueUpsLabel 호출)

#### 2. 신규 테스트 (`tests/unit/ups/ups-labels-split.test.ts`)

- `registerUpsOrder`: 3건 (성공 시 createorder 호출 + saveInitialLabel, 실패 시 error 저장, getnewlabel 미호출 확인)
- `fetchAndIssueUpsLabel`: 3건 (성공 시 getnewlabel 호출 + label_url 반환, docType별 content_type 분기, 라벨 레코드 없으면 에러)
- `cancelUpsRegistration`: 3건 (성공 시 removeorder 호출 + 삭제, 라벨 없으면 에러, removeorder 실패 시에도 진행)

### 검증
- **회귀 테스트**: 104개 파일, 665개 테스트 ALL PASS ✅
- **Lint**: 0 errors (2 warnings pre-existing)
- **CI**: 회귀 대상 (TeamB_Dev PR)

### 커밋
- 코드 커밋: `f2665082`
- 문서 커밋: `3d9cddf9`

### PR
- PR 대기 · base: `TeamB_Dev` · `Closes #635`

### 발견 이슈
- 없음
