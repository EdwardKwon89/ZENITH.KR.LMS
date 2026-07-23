# DEF-123: zen_tracking_configs.tracking_no 동기화

| 메타 | 값 |
|:----|:----|
| **Issue** | [#771](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/771) (DEF-123) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-23 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

#### `src/app/actions/operations/ups-labels.ts`

`registerUpsOrder()`의 `saveInitialLabel()` 호출 직후 `zen_tracking_configs.tracking_no` 갱신 로직 추가:

```ts
if (orderResult.trackingNo) {
  await supabase
    .from('zen_tracking_configs')
    .update({ tracking_no: orderResult.trackingNo, updated_at: new Date().toISOString() })
    .eq('order_id', order.id as string);
}
```

### 파일 목록
- `src/app/actions/operations/ups-labels.ts` — tracking_configs 갱신 로직 추가
- `tests/unit/ups/def123-tracking-no-sync.test.ts` — 신규 (2건)

### 검증
- 테스트: **2/2 PASS**
- 빌드: ✅ PASS
- 회귀: **116/116 파일 PASS, 775/775 테스트 PASS**
- 커밋 해시: `f3be6ebc`
- PR: [#775](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/775)
