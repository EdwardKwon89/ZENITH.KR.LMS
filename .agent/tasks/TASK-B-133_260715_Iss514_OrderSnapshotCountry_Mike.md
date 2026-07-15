# TASK-B-133: Issue #514 — order rate snapshot dest_country_code 수정

| 메타 | 값 |
|:----|:----|
| **Issue** | [#514](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/514) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-15 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 수정: `src/app/actions/operations/orders.ts` (44-55행)
- `saveOrderRateSnapshot`의 목적지 국가코드 조회 변경
- 기존: `dest_port_id` 기반 `zen_ports` 조회 → `port.country_code`
- 변경: `validated.recipient_country_code || port?.country_code` (UPS 모드 대응)

### 검증
- **Build PASS** ✅
- **Regression**: 84/84 ALL PASS (520 tests)

### 커밋
- 코드 커밋: `39d581b2058bd4db9d96d806ad0e107c4619a43b`

### 발견 이슈
없음
