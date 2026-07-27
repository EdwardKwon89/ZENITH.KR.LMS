# DEF-107: SHXK createorder `cargovolume[].child_number`(패키지 참조값)에 UUID 하이픈 포함 시 거부

## 발견 경위
JSJung이 `SHXK_TEST_MOCK=false`로 오더 ZEN-2026-000001 실제 createorder 재시도 중 발견(DEF-106 병합 직후, 순서상 다섯 번째 오류):
```
API创建并预报订单失败：创建预报失败!Invalid Package Reference Value
```
→ "패키지 참조값(Package Reference)이 잘못됨"

DEF-103~106을 모두 해결한 뒤 처음으로 발신인/수취인 주소·품명·단위코드 검증을 통과하고 다음 단계(패키지 참조값 검증)에서 새로 발견된 오류.

## 근본 원인
`buildCargovolume()`(`src/lib/ups/label-mapping.ts:13`)이 `cargovolume[].child_number`에 패키지 UUID를 하이픈 포함 그대로 전송:
```ts
child_number: String(pkg.id ?? ''),
// 예: "26d940f6-dcad-4579-b656-9b9982ca8feb" (36자, 하이픈 포함)
```
길이(60자 이내, `docs/80_RawData/Phase8_UPS_API_리서치_결과.md:168`)는 문제없으나, 이번 세션에서 반복 확인된 패턴(DEF-104 unit_code·DEF-106 sold-to province 모두 "영숫자만" 요구)과 마찬가지로 하이픈(`-`) 같은 특수문자를 포함한 값을 거부하는 것으로 추정됨. "Package Reference"는 UPS API의 표준 개념(패키지별 참조번호, 보통 영숫자만 허용)과도 일치.

이 필드는 원래 순번(`1,2,3...`)이었다가 JSJung 요청(Issue #551/552 — SHXK 응답을 DB 패키지 레코드로 역추적하기 위해 UUID 사용)으로 변경된 것. 하이픈만 제거하면 정보 손실 없이(하이픈은 UUID 표준 표기의 구분자일 뿐) 역추적 목적은 그대로 유지 가능 — JSJung 확인 후 진행 결정.

## 영향 범위
품목이 있는 모든 오더의 실제 SHXK createorder — mock 모드에서는 검증이 없어 지금까지 발견 안 됨(DEF-103/104/105/106과 동일 패턴).

## 긴급도
High — SHXK 실연동 createorder가 이 오류로 막힘(DEF-106 해결 직후 곧바로 발견된 다섯 번째 순차 오류).

## 권장 조치
`child_number`에서 하이픈 제거(`String(pkg.id ?? '').replace(/-/g, '')`). 응답을 역추적할 때는 `REPLACE(id::text, '-', '')`로 조회하거나 표준 8-4-4-4-12 위치에 하이픈을 재삽입하면 원본 UUID와 100% 동일하게 복원 가능. 상세 설계는 Issue(이 문서와 함께 등록) 참조.

## 관련 파일
`src/lib/ups/label-mapping.ts`

## 보고
JSJung 직접 지시("진행하자")로 착수.
