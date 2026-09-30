# DEF-B-148: UPS 라벨/무역서류 PDF Storage 업로드 실패 — 화면에 오류 표출(처리 자체는 완료)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward가 원격(Vercel) 운영 확인 중 UPS 출고 처리 화면에서 오류 메시지를 목격, 그러나 실제 처리는 완료됨을 보고 — Aiden이 Vercel `get_runtime_errors`로 원인 추적(2026-09-30) |
| **긴급도** | Medium (핵심 배송 처리는 이미 완료된 뒤 부가 문서 저장 단계만 실패 — 데이터 유실은 없으나 반복 시 사용자 신뢰도 저하 및 문서 재발급 필요) |
| **발견일** | 2026-09-30 |

## 현상

오더 **ZEN-2026-000019** 처리 중 2026-09-30 15:54:31~35 KST(UTC 06:54:31~35)에 UPS 라벨/무역서류 PDF를 SHXK에서 받아 Supabase Storage에 저장하는 단계에서 아래 오류가 발생, 화면에 오류로 노출됨:

```
[downloadAndStoreLabelDoc] Storage upload failed: StorageApiError: <none>
[fetchAndIssueUpsLabel] document download/store failed for ZEN-2026-000019: Error: PDF 업로드 실패: <none>
```

다만 SHXK API(`getnewlabel`) 호출로 라벨/문서 자체는 이미 정상 발급된 뒤였고(응답에서 `lable_file` URL 수신 완료), 우리 쪽 Storage에 백업 저장하는 부가 단계만 실패했다. 이후 같은 오더가 17:08:34 KST 출고확정(`confirmOutbound`), 17:09:46 KST "운송 중" 상태 전환까지 정상적으로 이어져 **실제 배송 처리 자체는 완료**되었음을 확인.

## 원인

[`src/app/actions/operations/ups-labels.ts:53-64`](../../src/app/actions/operations/ups-labels.ts#L53-L64) `downloadAndStoreLabelDoc()`가 `supabase.storage.from('invoices').upload()` 실패 시 `uploadError.message`를 포함해 `throw`하는데, 이번 케이스는 `uploadError.message`가 빈 문자열(`<none>`)이라 원인 특정이 안 됨 — Supabase Storage 측 일시 오류(용량/네트워크/권한 등) 추정이나 로그만으로는 근본원인 미확정.

호출부 [`fetchAndIssueUpsLabel()` L401-412](../../src/app/actions/operations/ups-labels.ts#L401-L412)는 문서별 루프 안에서 개별 실패를 catch해 로깅만 하고 다음 항목으로 진행하지만, **성공한 문서가 하나도 없으면(`storedUrls.length === 0`) `{success:false, error:'발급된 문서 저장 실패'}`를 반환**해 프론트에 오류로 표출된다(이번 건은 요청 문서가 1건뿐이라 해당).

## 인접 참고

같은 코드 경로가 Issue #1196(DEF-B-147, TASK-B-327)에서 "정상 처리인데 완료 메시지가 없어 오인" 문제로 이미 지적된 `UpsTradeDocumentActions.tsx`/`fetchShxkTradeDocument()` 흐름과 인접(같은 무역서류 발급 UI). 다만 이번 건은 실제로 저장이 실패한 케이스라 별개 결함으로 분리.

## 권장 조치

1. `uploadError.message`가 비어 있는 경우를 대비해 `uploadError` 객체 전체(코드/상태 등)를 로깅에 포함 — 현재는 원인 특정 불가 상태
2. Supabase Storage 업로드 실패 시 1회 재시도(retry) 로직 검토 — 일시적 오류일 가능성이 높음
3. 저장 실패 시 사용자에게 "배송 처리는 완료되었으나 문서 저장만 실패, 재발급 필요"라는 명확한 안내로 오류 메시지 문구 개선(현재는 마치 전체 처리가 실패한 것처럼 보임 — Edward가 실제로 오인한 지점)
4. 회귀 테스트 추가: Storage 업로드 실패 시에도 상위 배송 처리 흐름에 영향 없음을 검증

## 파일 소유권 확인

`git log --follow -- src/app/actions/operations/ups-labels.ts` — Baker(14)/Dave(12)/Mike(4)/B_Kai(4) 순, Team B 주도 파일 → **Team B 담당**
