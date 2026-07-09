# TASK-B-085 — Issue #300 오더 등록 폼 UNIT/CONTENT 통합 + UPS 서비스 이동

| 항목 | 내용 |
|:-----|:------|
| **Issue** | #300 `feat` 오더 등록 폼 — UNIT/CONTENT 필드 통합 + UPS 견적 섹션 패키지 영역 이동 |
| **담당** | Dave |
| **생성일** | 2026-07-09 |
| **상태** | 🔔 검토 요청 |
| **브랜치** | `feature/teamb-task-b084-iss300` |
| **PR** | [#302](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/302) |

---

## 작업 내용

### REQ-1 — UNIT/CONTENT 통합 드롭다운

- UNIT(`packing_unit`: BOX/PLT/CRT) + CONTENT(`content_type`: DOC/NONDOC) → **하나의 조건부 드롭다운**으로 통합
- UPS 모드: DOC/NONDOC → `content_type`
- 그 외(AIR/SEA/EXP/LAND): BOX/PLT/CRT → `packing_unit`

### REQ-2 — UPS 견적 섹션 패키지 영역 이동

- `UpsFreightEstimateSection` → **패키지 ZenCard 내부** SHIPMENT SUMMARY 직전으로 이동
- 노출 조건: `transportMode === 'UPS'` (isAgencyShipper 무관, 전체 화주 노출)

### 서비스 티어 전용 드롭다운

- `getUpsProducts(cargoType)` 호출 → DOC/NONDOC 자동 필터링
- 서비스 패밀리(`_DOC`/`_NONDOC` 접미사 제거) 기준 중복 제거 → UpsServiceSelector와 동일한 라벨 매핑(`WW Express`/`Saver`/`Expedited`/`Freight`)
- Incoterms 기본값: DDP

---

## Jaison 반려 수정 사항

| # | 반려 사항 | 수정 내용 |
|:-:|:---------|:---------|
| 1 | 노출 조건: `isAgencyShipper &&` 제거 | `transportMode === 'UPS'` 단독 조건으로 변경 |
| 2 | TASK 번호 충돌 | TASK-B-084→**TASK-B-085** 정정 |
| 3 | PR 번호 오류 | **#302**로 정정 |
| 4 | 섹션 제목 | "UPS 견적" → **"UPS 서비스"** |
| 5 | 드롭다운 텍스트 | `product_name` 대신 패밀리 라벨 매핑 사용 |

## 검증

| 항목 | 결과 |
|:-----|:-----|
| TypeScript | 기존 오류 외 신규 없음 |
| 회귀 테스트 | 491/491 PASS |
| LAST_REGRESSION_RESULT | PASS |

## 커밋

```
[Dave] feat: TASK-B-085 Issue #300 UNIT/CONTENT 통합 + UPS 서비스 패키지 영역 이동
```
