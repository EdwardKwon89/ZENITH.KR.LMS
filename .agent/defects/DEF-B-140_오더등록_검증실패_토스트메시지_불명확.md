# DEF-B-140: 오더등록 검증 실패 시 토스트 메시지가 구체적 원인을 안 알려줌

**발견일**: 2026-08-17
**발견자**: JSJung (실사용 확인, `/orders/new`)
**긴급도**: Medium (TASK-B-314로 크래시는 해소됨 — 이건 후속 메시지 품질 이슈)

## 현상

`/orders/new`에서 `packages`(패키지/품목) 배열 내부 필드(예: 품목명 영문 전용 규칙 등, `TASK-B-159`/`DEF-105`)가 검증 실패해도, 토스트에는 "Check required fields"라는 두루뭉술한 문구만 뜨고 실제로 어떤 필드가 왜 문제인지 안내되지 않음.

## 원인

`OrderRegistrationForm.tsx:889-897`의 `onError`:
```ts
const onError = (errors: any) => {
  const errorSummary = Object.entries(errors).map(([field, err]) => ({ field, message: err?.message || 'Invalid' }));
  logger.error('Validation Errors:', errorSummary);
  const firstError = Object.values(errors)[0] as any;
  const errorMessage = firstError?.message || 'Check required fields';
  toast.error('Validation Error', { description: errorMessage, ... });
};
```

`packages`는 배열 필드라 react-hook-form의 `errors.packages`는 중첩 구조(`errors.packages[idx].items[idx].item_name.message`)를 가지는데, 위 코드는 최상위 키(`errors.packages`, 배열 그 자체)만 보고 `.message`를 찾는다. 배열/중첩 객체엔 `.message`가 없으므로 항상 폴백 문구("Invalid"/"Check required fields")만 표출됨 — 실제 리프(leaf) 에러 메시지("Item name must be in English..." 등)까지 도달하지 못함.

## 영향 범위

`packages`/`items` 등 배열·중첩 필드 관련 모든 검증 실패 케이스(오더 등록/수정 화면 공통).

## 권장 조치

TASK-B-315로 처리 — `errors` 객체를 재귀적으로 순회해 첫 번째 leaf `.message`를 찾는 헬퍼로 교체.
