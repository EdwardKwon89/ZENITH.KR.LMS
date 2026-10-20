# TASK-B-337 — Issue #1251: SHXK getdeclareunit 7개 단위 반영 — 정본 목록·YDS/KG 지원·정합 테스트

| 항목 | 내용 |
| :-- | :-- |
| 상태 | 🔔 완료 (review 대기) |
| 이슈 | #1251 |
| 브랜치 | `feature/teamb-337-iss1251-declare-units` |
| base | `TeamB_Dev` |
| 담당 | Baker (Team B) |
| 발령 | Jaison (JSJung 요청 2026-10-13, v2 2026-10-21) |
| 예상 공수 | 0.5~1일 |

## 1. 목표 (이슈 본문 v2 확정 사양)
SHXK `getdeclareunit` 실측 7개 신고단위(`PCE, SET, MTR, PCS, EA, YDS, KG`)를 정본 상수로 도입하고, 폼은 **코드 그대로** 표출·전송(변환 없음, 빈 값/미지 값만 `PCE` 폴백), 신규 기본값을 `EA` → `PCE`로 변경한다.

## 2. [재현 결과] — 실측 출력 인용
### 2-1. `resolveShxkUnitCode` 현재 동작 (`npx tsx -e` 실제 함수 호출, mock 아님)
```
"EA" -> PCE
"PCS" -> PCE
"SET" -> SET
"MTR" -> MTR
"YDS" -> PCE      ← YDS 미지원(요구: YDS 그대로)
"KG" -> PCE       ← KG 미지원(요구: KG 그대로)
"" -> PCE
"XYZ" -> PCE
```

### 2-2. 폼 Packing Unit 옵션 (OrderRegistrationForm.tsx 181~184행)
```
181: <option value="EA">EA</option>
182: <option value="SET">SET</option>
183: <option value="PCS">PCS</option>
184: <option value="MTR">MTR</option>
```
→ 4종 (요구: 7종)

### 2-3. `zen_order_items.item_packing_unit` 분포
```
docker exec supabase_db_ZENITH_LMS_001 psql -U postgres -Atc "select coalesce(item_packing_unit,'<NULL>') as unit, count(*) from zen_order_items group by 1 order by 1"
<NULL>|12
EA|3
PCS|3
```
→ 기존 데이터 마이그레이션은 하지 않는다(범위 밖). 빈 값은 `PCE` 폴백 유지.

## 3. [작업 결과]
- 코드 커밋: `f12bdb6028ee94896fef605bd8be130e43370ed7`
- 문서 커밋: 본 task file만

### 3-1. 구현
1. `src/lib/shxk/declare-units.ts` 신규 — `SHXK_DECLARE_UNITS`(`code`,`cnname` 7개 `as const`) + `isShxkDeclareUnit(v)`(대소문자 무시). 주석에 조회 일자·호출 방법 기재. (server-only import 없음)
2. `src/lib/orders/packing-units.ts` 신규 — `PACKING_UNIT_OPTIONS`(=`SHXK_DECLARE_UNITS` code 7개, 순서 `PCE, SET, MTR, PCS, EA, YDS, KG`) + `DEFAULT_PACKING_UNIT='PCE'`.
3. `src/components/orders/OrderRegistrationForm.tsx` — Packing Unit `<option>`을 `PACKING_UNIT_OPTIONS.map`으로 교체(라벨=코드, `title`=cnname), 신규 품목 기본값 3곳(`append`·초기값·`appendPackage`) `EA`→`DEFAULT_PACKING_UNIT`.
4. 기본값 `EA`→`PCE`: `order.ts:16` 스키마 default, `edit-defaults.ts:135` 폴백, `bulk-orders.ts` 폴백, `bulk-order-template.ts` 샘플.
5. `src/lib/ups/label-mapping.ts` — `SHXK_UNIT_CODE_MAP` 삭제, `resolveShxkUnitCode`를 `SHXK_DECLARE_UNITS` 기반(대문자화 후 목록 포함 시 그대로, 아니면 `PCE`)으로 단순화.
6. `src/lib/shxk/validate-payload.ts` — 품목 루프에 `unit_code` 있으면 `isShxkDeclareUnit` 검사, 아니면 한글 에러 반환.
7. `docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 153행 `unit_code` 설명 7개 단위로 갱신.

### 3-2. `wc -l` 전/후 (OrderRegistrationForm.tsx)
```
전:  1930
후:  1930   ← 순증 0 (option 4줄 제거 → map 3줄 + import 1줄)
```

### 3-3. 테스트 결과
- 신규 `tests/unit/ups/shxk-declare-units.test.ts` — 19 tests PASS (테스트 1~6)
- 기존 테스트 변경 표 (아래 §4)
- `npm run test:regression`: **232 files / 1662 tests PASS** (수정 전 231/1641 → 신규 1파일 19케이스 + 기존 2케이스 증가)
- `npm run build`: 성공 (exit 0)
- `tsc --noEmit`: `src/` 신규 오류 **0** (총 130건은 baseline `origin/TeamB_Dev`에서도 동일 — 기존 오류)

## 4. [기존 테스트 변경 표] (허용 목록만, 삭제·약화 금지)
| 파일 | before | after | 사유 |
| :-- | :-- | :-- | :-- |
| `tests/unit/ups/ups-labels-mapping.test.ts` (81행) | `EA → PCE` | `EA → EA` | 이슈 본문 허용 목록 — v2 변환 폐기 |
| `tests/unit/ups/ups-labels-mapping.test.ts` (85행) | `PCS → PCE` | `PCS → PCS` | 이슈 본문 허용 목록 — v2 변환 폐기 |
| `tests/unit/ups/ups-labels-mapping.test.ts` (104행) | `소문자 ea → PCE` | `소문자 ea → EA` | 이슈 본문 허용 목록 — 대소문자 무시 + 변환 없음 |
| `tests/unit/ups/ups-labels-mapping.test.ts` (118행) | `buildInvoiceFromItems` EA 입력 → `unit_code:'PCE'` | `unit_code:'EA'` | 이슈 본문 허용 목록 — v2 |
| `tests/unit/ups/ups-labels-mapping.test.ts` (125행) | EA 입력 → `unit_code:'PCE'` | `unit_code:'EA'` | 이슈 본문 허용 목록 — v2 |

**불변(그대로 통과)**: `SET→SET`, `MTR→MTR`, `''→PCE`, `XYZ→PCE`, `recipient`/fallback 케이스. 신규 케이스 2건 추가(`YDS→YDS`, `KG→KG`) — 삭제·약화 없음, 순증.
**기본값 단언 케이스 없음**: `grep -rln "'EA'" tests`의 나머지 파일은 모두 단순 fixture 값(`EA`는 유효 선택지로 존속) → **미변경**. 회귀 실행에서 FAIL 0으로 확인.

## 5. 되돌리기 검증 (직접 수행, FAIL 출력 인용, `cp` 백업 → 변이 → 복원 → `shasum`)
| # | 변이 | 기대 FAIL | 실제 |
| :-- | :-- | :-- | :-- |
| a | `label-mapping.ts` — `EA`·`PCS`→`PCE` 매핑 복원 | TC-337-1·2·4 FAIL | `6 failed \| 13 passed` — `expected 'PCE' to be 'EA'`, `expected 'PCE' to be 'PCS'` (각 3건) |
| b | `packing-units.ts` — `PACKING_UNIT_OPTIONS`에 `ZZZ` 추가 | TC-337-2·3 FAIL | `2 failed \| 17 passed` — `expected 'PCE' to be 'ZZZ'`, `Set{…4} to deeply equal Set{…3}` |
| c | `validate-payload.ts` — 단위 검사 제거 | TC-337-5 FAIL | `1 failed \| 18 passed` — `expected [] to include '품목 1: 단위 코드 XYZ은(는) SHXK 허용 단위가 아닙니다'` |
| d | `order.ts` — 스키마 default를 `EA`로 복원 | TC-337-6 FAIL | `1 failed \| 18 passed` — `expected 'EA' to be 'PCE'` |

**복원 후 shasum 일치 확인** (원본 = 복원 후):
```
4f7450b07de51fc836c5e82e1d12800c78cd7a35  src/lib/ups/label-mapping.ts
334a865990be6eaaca929bda276421f8f38d81c5  src/lib/orders/packing-units.ts
2d445b9374195d3973bc334c9ab088de8f6e220b  src/lib/shxk/validate-payload.ts
de5735bd07b3891c01ea4ea218e2a3f20c80c809  src/lib/validation/order.ts
```
복원 후 재실행: `2 passed (2) / 59 passed (59)`.

## 6. [발견 이슈]
없음

## 7. DoD 체크리스트
- [x] 구현 1~6 — `declare-units.ts`·`packing-units.ts` 신규, 폼 옵션 map 교체·기본값 3곳, 기본값 4파일, 매핑 단순화, 사전검증, Phase8 문서
- [x] 테스트 1~6 — `tests/unit/ups/shxk-declare-units.test.ts` 19 tests PASS
- [x] 되돌리기 4종 — (a)~(d) FAIL 출력 인용 + shasum 복원 확인
- [x] 기존 테스트 변경 표 — §4 (허용 목록 5행 + 신규 2건 순증)
- [x] 문서 갱신(Phase8) — 153행 `unit_code` 7개 단위
- [x] MAP §70 신규 + §71 두 행 갱신 — `TC-337-MAP` 포함 7행, `grep -c "TC-337"` = 7
- [x] 전체 회귀 + build — 232 files / 1662 tests PASS, build exit 0
- [x] `wc -l` 전후 — 1930 → 1930
- [x] R-12 — `grep "unit_code\|신고단위\|item_packing_unit" docs/02_Analysis/Ds_11_API_상세_명세서.md` → 0건, **해당 없음**
- [x] R-04 자가점검 — 변경 파일 정적 리뷰: 신규 2파일 순수 상수/함수, server-only import 없음(클라이언트 폼 import 안전), 기존 로직 로컬 수정만
- [x] R-15 관측성 판단 — **로깅 대상 아님**: `declare-units.ts`(순수 상수+1줄 predicate), `packing-units.ts`(상수 매핑), `resolveShxkUnitCode`(순수 함수) 모두 부수효과·I/O·실패 분기 없음. 조회 실패 등은 발생 지점인 `client.ts`·`ups-labels.ts`에서 기존 로깅 유지.
- [x] 알려진 위험 기재 — §8

## 8. 알려진 위험 (완료 보고 [발견 이슈]에 기재, 코드로 막지 말 것)
- **전송값이 바뀐다**: 이전에는 `EA`·`PCS`가 `PCE`로 변환돼 나갔고 실서버 성공 이력은 `unit_code:'PCE'`뿐이다. v2에서는 `EA`·`PCS`·`YDS`·`KG`가 그대로 나간다 — SHXK 수락 여부는 미확인. 병합 후 JSJung 라이브 확인(shxk.rtb56.com createorder, 확인 후 `removeorder`).
- **기존 데이터**: 로컬 분포 빈 값 12 / `PCS` 3 / `EA` 3. 마이그레이션 하지 않음. 기존 `EA`·`PCS` 행도 앞으로 그대로 전송된다.

## 9. [열린 질문]
- 없음 (미결)

## 10. 병합 후 확인 (JSJung)
shxk.rtb56.com에는 Sandbox 없음. `EA`·`PCS`·`YDS`·`KG` 각각 품목 1건짜리 오더로 createorder 성공 확인 → `removeorder`로 삭제.
