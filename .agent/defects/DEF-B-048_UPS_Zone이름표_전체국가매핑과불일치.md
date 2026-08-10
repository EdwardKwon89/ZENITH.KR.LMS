# DEF-B-048 (High) — `zen_ups_zones.zone_name` 라벨 전체가 실제 배정 국가와 불일치

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — `ups-detail` 페이지 도착국/Zone 정보 확인 요청(`ZEN-2026-000008`, 중국행인데 "Zone 1 - Domestic Korea"로 표시) |
| **긴급도** | High — 요금 계산 자체는 정상(표시/라벨 전용 문제)이지만, 관리자·대리점·화주 화면 곳곳에서 Zone 정보를 볼 때마다 혼란·오인 유발 |
| **현재 상태** | 미수정 |

## 근본 원인 (확정)

`zen_ups_zones` 테이블의 `zone_name` 컬럼이 **실제로 그 Zone에 배정된 국가와 전혀 무관한 이름**을 달고 있음. 각 Zone에 실제 배정된 국가 샘플(EXPRESS/EXPORT 기준) 대조 결과:

| zone_code | zone_name (현재, 잘못됨) | 실제 배정 국가 예시 |
|:---:|:---|:---|
| Z1 | Zone 1 - Domestic Korea | **CNN(중국 북부), MO, SG, TW** |
| Z2 | Zone 2 - East Asia (China/Japan) | JP, VN (정작 중국은 없음) |
| Z3 | Zone 3 - SE Asia | BN, ID, MY, TH |
| Z4 | Zone 4 - Oceania | IN, NZ |
| Z5 | Zone 5 - West Asia / Middle East | **CA, MX, PR, US** |
| Z6 | Zone 6 - Europe Core | (유럽 다수 — 이 라벨은 대체로 맞음) |
| Z7 | Zone 7 - Europe Extended | AT, DK, FI, GR, IE, NO, PT |
| Z8 | Zone 8 - North America | **AE, AR, BR, EG, RU, ZA 등(중동/남미/아프리카/러시아)** |
| Z9 | Zone 9 - Central & South America | AL, AM, IL, KE, NG 등(중앙아시아/중동/아프리카) |
| Z10 | Zone 10 - Africa | **CNS(중국 남부), HK** |

**중국이 정작 이름에 "China"가 들어간 Z2가 아니라 Z1("국내 배송")·Z10("아프리카")에 들어있고, 미국은 "서아시아/중동" 라벨인 Z5에, 이집트·남아공은 "북미" 라벨인 Z8에 들어있는 등 — 사실상 전체 10개 Zone 중 절반 이상이 이름과 실제 내용이 무관함.**

**요금 데이터 자체는 정상 확인됨** — Z1의 `WW_SAVER_DOC` 0.5kg 요율이 49,700원으로 명백한 국제 특송 요금 수준(국내 배송이라면 수천원대여야 함). 즉 `zone_id`↔실제 요금표 연결과 `zen_ups_zone_countries`의 국가 매핑 자체는 `20260719000000_sntl_zone_countries_rebuild.sql`(실제 UPS PDF 기준 재적재, "US Z8→실제 Z5" 등 교정 이력 존재)로 정확히 재정비된 것으로 보이나, **그보다 이전 단계에서 대략적으로 붙여놨던 zone_name 라벨("Zone 1 - Domestic Korea" 등)은 그 재정비 때 함께 갱신되지 않고 방치됨.**

## 영향 범위

`zone_name`이 표시되는 화면(`grep` 확인):
- `src/app/[locale]/(dashboard)/admin/ups-rates/ups-rates-client.tsx` — Zone 관리 탭
- `src/components/ups/UpsOrderBreakdownCard.tsx`(간접 — `zoneId` 표시, 현재는 스냅샷의 `zone_code`만 사용 중이라 zone_name 직접노출은 제한적이나 `zone_name`도 스냅샷에 저장되어 있어 향후 노출 가능)
- 그 외 `rates.ts`/`rates-public.ts`/`rates-mutation.ts`/`pricing-engine.ts`에서 select/전달(직접 UI 렌더링은 admin 화면이 주 노출 지점)

## 수정 방향 (설계 확정 — JSJung 확인 완료, 2026-08-11)

**JSJung 확정**: 대륙명 등 설명 라벨은 실제 배정 국가가 혼재되어 있어 어차피 부정확할 수밖에 없음 — **번호만 표시하는 방식으로 단순화**.

1. **마이그레이션**: `UPDATE zen_ups_zones SET zone_name = 'Zone ' || <번호> WHERE zone_code = 'Z<번호>'` 10건(예: Z1 → `"Zone 1"`, Z10 → `"Zone 10"`) — 대륙/지역명 설명 문구 전부 제거.
2. **화면 변경 없음** — 라벨 텍스트만 교정, `zone_id`/`zone_code`/요금 데이터는 전혀 손대지 않음(이미 정확함).
3. **[선택, 후속 개선 권장]** 국가 목록이 궁금한 관리자를 위해 admin Zone 관리 탭에 "포함 국가 목록 보기" 같은 상세 조회 기능을 별도로 추가하는 것도 고려 가능(이번 Task 범위 밖 — 필요 시 별도 IMP로 기록).

## 회귀 테스트 (필수)

- 10개 zone_name이 실제 배정 국가와 모순되지 않는 설명인지(자동 테스트로는 검증 어려움 — 수동 검토 + 스냅샷 테스트로 의도한 값과 일치하는지 확인 정도)
- zone_id/요금 데이터가 이번 수정으로 전혀 변경되지 않았는지 확인(회귀 방지 — 이름만 바뀌어야 함)
- **되돌리기 검증** — UPDATE 되돌릴 시 기존(틀린) 이름으로 복귀하는지 확인
