# TASK-B-315: 오더등록 검증 실패 토스트 — 중첩 필드(packages/items) leaf 메시지 표출

- **GitHub Issue**: [#1154](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1154)
- **관련 결함**: [DEF-B-140](.agent/defects/DEF-B-140_오더등록_검증실패_토스트메시지_불명확.md)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 실사용 피드백, TASK-B-314 후속)
- **담당**: Mike
- **우선순위**: P2
- **상태**: 🔄 착수 가능 (설계 확정, 착수 직행)

## [배경]

TASK-B-314로 검증 실패 시 크래시는 해소됐으나, `packages`(배열) 내부 필드가 검증 실패해도 토스트에는 "Check required fields"만 뜨고 실제 원인(예: 품목명 영문 전용 규칙 위반)이 안 보임. 원인은 `onError`가 `errors`의 최상위 키(`errors.packages`, 배열 자체)만 보고 `.message`를 찾기 때문 — 배열/중첩 객체엔 `.message`가 없어 항상 폴백 문구만 표출.

## [설계 확정]

`errors` 객체를 재귀적으로 순회해 첫 번째 leaf(`.message`를 가진 노드)를 찾는 헬퍼 추가:

```ts
function findFirstErrorMessage(node: any, path = ''): { path: string; message: string } | null {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.message === 'string') return { path, message: node.message };
  for (const key of Object.keys(node)) {
    if (key === 'ref' || key === 'type') continue; // DOM ref 등 순환참조 유발 요소 스킵
    const childPath = path ? `${path}.${key}` : key;
    const found = findFirstErrorMessage(node[key], childPath);
    if (found) return found;
  }
  return null;
}

const onError = (errors: any) => {
  const errorSummary = Object.entries(errors).map(([field, err]) => {
    const leaf = findFirstErrorMessage(err, field);
    return { field: leaf?.path ?? field, message: leaf?.message ?? 'Invalid' };
  });
  logger.error('Validation Errors:', errorSummary);
  const firstLeaf = findFirstErrorMessage(errors);
  const errorMessage = firstLeaf?.message || 'Check required fields';
  toast.error('Validation Error', { description: errorMessage, ... });
};
```

`ref`/`type` 키를 명시적으로 건너뛰어 DOM 엘리먼트 순회를 원천 차단(TASK-B-314의 `safeStringify` 방어와는 별개로, 애초에 순회 경로에서 DOM ref에 닿지 않도록 함).

## [작업 범위]

파일: `src/components/orders/OrderRegistrationForm.tsx` — `onError` 핸들러에 `findFirstErrorMessage()` 헬퍼 추가 및 적용.

## [회귀 테스트 방향]

- 중첩 배열 에러(`{ packages: [undefined, { items: [{ item_name: { message: 'Item name must be in English...' } }] }] }`) 전달 시 `findFirstErrorMessage()`가 정확한 leaf 메시지를 찾는지
- 최상위 flat 필드 에러(`{ shipper_id: { message: '...' } }`)도 기존처럼 정상 동작하는지(회귀 없음)
- `ref` 키에 DOM 엘리먼트가 있어도 순회 중 접근하지 않는지(순환참조 재발 방지 확인)

## [R-10]

`/orders/new`에서 한글 품목명 입력 후 제출 → 토스트에 "Item name must be in English..." 같은 구체적 메시지가 뜨는지 스크린샷.

## [작업 결과]

_(Mike 작성 예정)_

## [Jaison 최종 검토]

_(PR 제출 후 작성)_

## [발견 이슈]

없음
