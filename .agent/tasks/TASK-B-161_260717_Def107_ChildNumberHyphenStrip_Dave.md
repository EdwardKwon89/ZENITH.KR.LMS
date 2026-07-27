# TASK-B-161: Issue #580 — DEF-107 SHXK cargovolume child_number 하이픈 제거

| 메타 | 값 |
|:----|:----|
| **Issue** | [#580](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/580) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-17 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. buildCargovolume child_number 하이픈 제거
- `child_number`: `String(pkg.id ?? '')` → `String(pkg.id ?? '').replace(/-/g, '')`
- UPS "Package Reference" 검증이 하이픈 등 특수문자 거부 → 제거 후 전송

#### 2. 테스트
- 기존 `child_number` 기대값 `'pkg-uuid-001'` → `'pkguuid001'` (하이픈 제거 반영)
- 실제 UUID 형태(`'26d940f6-dcad-4579-b656-9b9982ca8feb'`) 입력 → 하이픈 없이 반환 검증 테스트 1건 신규

### 검증
- **Build PASS** ✅
- **Regression**: 95/95 ALL PASS (610 tests)
- **변경 범위**: `buildCargovolume()` 단 1줄만 수정, 다른 함수·파일 건드리지 않음

### CI 결과 (PR#581)
- Regression Tests ✅ PASS (5m33s)
- Task File Check ✅ PASS
- Vercel ⚠️ rate-limited (pro plan, non-blocking, 로컬 build로 대체 검증 완료)

### 발견 이슈
없음
