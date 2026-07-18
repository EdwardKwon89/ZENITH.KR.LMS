# TASK-B-165: Issue #590 — 화주(Shipper) 급증 수수료(Surge Fee) 조회 탭 추가

| 메타 | 값 |
|:----|:----|
| **Issue** | [#590](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/590) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-18 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### 1. `shipper/ups-rates/page.tsx` 수정
- `getPublicSurgeFees` import 추가
- `Promise.all`에 `getPublicSurgeFees()` 추가
- `<ShipperUpsRatesClient>`에 `surgeFees={surgeFees}` prop 추가

#### 2. `shipper/ups-rates-client.tsx` 수정
- `PublicSurgeFee` 타입 import 추가
- `TrendingUp` 아이콘 import 추가
- `TabKey` 타입에 `surgeFees` 추가
- `TABS` 배열에 `{ key: 'surgeFees', label: '급증 수수료', icon: TrendingUp }` 추가
- `Props` 인터페이스에 `surgeFees: PublicSurgeFee[]` 추가
- `renderTable()` switch에 `surgeFees` case 추가
- `SurgeFeeTable` 함수 신규 추가 — agency 버전과 동일 (할인 미적용, 원가 그대로 표시)

#### 3. 테스트
- `tests/unit/ups/shipper-ups-rates-surge-fee.test.tsx` 신규
- 급증 수수료 탭 렌더링 + 데이터 표시 검증
- 탭 전환 동작 검증

### 검증
- **Build PASS** ✅
- **Regression**: 626/626 ALL PASS ✅

### 커밋
- 코드 커밋: `ab2e1264`

### 발견 이슈
없음
