# TASK-B-224: DEF-B-018 — ups-actual-charges dest_country_code 오타 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#899](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/899) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 작업 결과

### 변경 내용

#### `src/app/actions/finance/ups-actual-charges.ts`
- `searchDeliveredUpsOrders`(line 313) 및 `getMoreOrdersForSearch`(line 358)의 select에서 `dest_country_code` → `dest_country_code:recipient_country_code` PostgREST 별칭 적용
- 서버는 `recipient_country_code` 컬럼을 읽되, 응답 필드명을 `dest_country_code`로 별칭하여 클라이언트 변경 없이 해결

### 테스트
- `TC-B204-07`: `searchDeliveredUpsOrders`가 `dest_country_code` 필드로 정상 반환 검증

### 검증
- **테스트**: 7/7 PASS (ups-actual-charges)
- **빌드**: ✅ PASS
- **회귀**: 135/135 파일, 895/895 테스트 ALL PASS
- **커밋 해시**: `a382a549`
