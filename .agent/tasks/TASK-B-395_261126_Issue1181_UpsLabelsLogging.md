# TASK-B-395 — 로그 커버리지 개선 ①: ups-labels.ts 실패 반환값 무기록 해소 (Issue #1181)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | [#1181](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1181) (TASK-B-319) · 담당 Mike(Jaison 배정 2026-11-26 17:03 KST) · 검증 Jaison·Aiden · p2 |
| 브랜치 | `feature/teamb-task-b395-iss1181-ups-labels-logging` (base `origin/TeamB_Dev` `2d7fb0d14`) |
| 상태 | 🔔 검토 대기 (`status:review`) |
| 범위 | **로깅만 추가**(반환 로직·메시지·구조 불변) · 리팩터링·함수 분할 금지 · `logClientError(CRITICAL)` 알림 연동은 범위 밖(4기준 판정표만 기재) |
| 원칙 | R-21(건수·true/false·exit만) · 새 커밋(force-push 금지) · PR `Refs #1181` |

## 채번·착수 확인 (실측)

```bash
./scripts/next-task-number.sh B   # → TASK-B-395 (origin/TeamB_Dev에 TASK-B-395 파일 부재 0건 확인)
git rev-parse --show-toplevel     # 전용 워크트리 (init 미실행)
git log --oneline -3 origin/TeamB_Dev  # 2d7fb0d14(B-394 병합) 확인 후 신규 분기
# 같은 파일 건드리는 열린 PR: 0건 (열린 PR 전수 파일 조회)
date                              # Thu Nov 26 17:46:00 KST 2026
```

## R-20 영향도 (gitnexus 대체 — 인덱스 미보유)

- `gitnexus` CLI·`.gitnexus` 인덱스 **둘 다 미보유**(staleness 확인 불가) → 지시대로 **grep 직접 재검증**으로 대체.
- 수정 함수 외부 참조: `ups-labels` import **4파일**(orders 상세·ups-detail 페이지·`UpsTradeDocumentActions`·`OutboundProcessForm`), `previewShxkPayload` 외부 참조 **2**, `triggerCreateOrderTest` 외부 참조 **0**, 내부 헬퍼(`resolveCountryCode`·`fetchActiveLabelByOrder`) 외부 참조 **0**, `resolveShxkCode`(export) 참조 **10**(테스트 포함).
- **위험 등급: 낮음** — 반환 계약(메시지·구조) 불변 + 로깅 전용이며, 전체 회귀 2,387건 통과로 호출부 4파일 포함 커버 확인.

## 재측정 결과 (직접 전수 읽기 — 1,000줄, Jaison 휴리스틱 추정치의 확정)

| 구분 | 건수 |
|:--|--:|
| 실패 반환 지점 | **66** |
| throw 지점 | **3** |
| (별도) 헬퍼 null 반환 — DB 오류 흡수 | **3** |
| catch 블록 | **11**(`catch (err)` — `catch` 구문 전체는 13개, 나머지 2개는 `describeStorageError` 속성 읽기 실패 `[unreadable]`·`resolveUploadErrorDetail`의 `JSON.stringify` 실패 폴백 = 진단 문자열 보조 코드의 benign 폴백이라 로깅 불필요, Jaison 판정) |
| **판정: 자체(인접) 로깅** | **46** (반환 44 + throw 2) |
| **판정: 타 지점 로깅 커버** | **16** — 권한 헬퍼 내부 7 · lookup 상위 3 · SHXK 상위 2 · 래퍼 상위 2 · error-문자열 반환의 호출부 1 · throw의 상위 catch 1 |
| **판정: catch 로깅** | **11/11** (로깅 없는 catch **0**) |
| **판정: 방어(도달 불가) — 미처리** | **3** (`registerUpsOrder`·`previewShxkPayload`·`triggerCreateOrderTest`의 `!order` — `lookupOrderPackages`가 `!order`면 반드시 `error`를 반환하므로 도달 불가. 사유: 죽은 방어경로, 테스트 불가) |
| **판정: 무로깅 → 이번 처리** | **7** |

- Jaison 추정(무로깅 21·catch 무로깅 2)과의 차이: 8줄 lookback 휴리스틱이 **헬퍼 내부/상위 함수 로깅**을 잡지 못함(커버 16건) + catch 무로깅 실측 **0건**.
- **지점군 목록(처리 7)**: ① `previewShxkPayload` 도착국 미확인(warn) ② `previewShxkPayload` 운송방법 미매핑(warn) ③ `triggerCreateOrderTest` 도착국 미확인(warn) ④ `triggerCreateOrderTest` 운송방법 미매핑(warn) ⑤ `resolveCountryCode` DB 오류 흡수(error, **`PGRST116` 행 없음 제외**) ⑥ `resolveShxkCode` DB 오류 흡수(error, **`PGRST116` 제외**) ⑦ `fetchActiveLabelByOrder` DB 오류 흡수(error, `maybeSingle`이라 행 없음은 오류 아님 — 현행 유지).

## 최종 기준 건수 (불일치 정리 — 이 표가 최종)

> **83건**(실패 반환 66 + throw 3 + 헬퍼 null 3 + catch 11) = 자체 로깅 **46** + 타 지점 커버 **16** + catch 로깅 **11** + 방어(도달 불가) **3** + **처리 7**. (구현 커밋 메시지의 "72지점"은 집계 도중의 중간 수치이며, 이 표와 보고의 83건이 최종 기준이다.)

## 처리 결과 (분모와 함께)

- **7/7 처리** (무로깅 지점 전량) · 미처리는 방어 3건(사유 위) + 커버 62건(자체 46 + 타 지점 16 + catch 11은 처리 불필요).
- 레벨: 사용자·데이터 매핑 누락 4 = `logger.warn`(기존 `registerUpsOrder` 442·448행의 선행 판례와 동일), 외부 DB 오류 3 = `logger.error` + **원본 오류 객체 전달**. **보완 반영(Aiden 보완 1·Jaison 필수 1)**: `resolveCountryCode`·`resolveShxkCode`는 `error.code !== 'PGRST116'`(행 없음 = 정상 업무 실패)일 때만 `logger.error` — 정상 매핑 누락의 error 이중 기록(헬퍼 error + 호출부 warn)과 `/admin/error-logs`·Sentry 노이즈 제거(`src/lib/params/service.ts` 40행의 기존 `PGRST116` 구분과 동일 기준). `fetchActiveLabelByOrder`는 `maybeSingle`이라 현행 유지.
- `catch (err)`는 전부 원본 `err`를 로거에 전달(기존 유지, 실측 11/11).

## diff 검증 (반환값 불변 + 로깅만)

- 소스 diff **+22/−7**: `logger.*` 호출 **7줄** + `error` 디스스트럭처링 **3줄**(if-block 전환에 동반된 중첩 재배치 12줄) — **반환 표현식의 문자열은 변경 전과 동일**(전체 diff 직접 대조).
- `src/` 이외 변경: 신규 테스트 1파일 + 회귀 항목 1파일. 마이그레이션 **0건**.
- 파일 줄 수 **1,014줄**(하드 리밋 1,500 이내).

## 테스트 (레벨·인자 단언 — 호출 여부 단언으로 갈음하지 않음)

- 신규 `tests/unit/ups/task-b395-ups-labels-logging.test.ts` — **12/12 PASS**(보완 반영: `PGRST116` 행 없음 2케이스 추가).
- 단언 내용: ① **레벨**(`logger.warn`/`logger.error` 구분·`error` 미호출 단언 포함) ② **인자**(오류 객체 동일성 `toHaveBeenCalledWith(문자, 객체)`, 원문 포함 문자열, product·incoterms·order 포함) ③ **반환값 불변**(12케이스 전부 `toEqual({success:false, error: <동일 키 trError>})` + 원문 미노출).
- 지점군 커버: 매핑 누락 4 · 헬퍼 DB 오류 3(그 외 코드 = 오류 객체 동일성 단언) · **`PGRST116` 행 없음 2(`error` 미호출 + 호출부 `warn` 단독 단언 — 실제 `.single()` 동작과 일치하도록 모킹)** · SHXK 외부 API 1 · catch 원본 err 1 · DB 쓰기 1.
- 회귀 항목: `regression-items/TASK-B-395_Issue1181_ups-labels-logging.md` (TC-395-01~10) · `npm run check:lrtm` **OK**(유령 0·신규 미등재 0, exit 0) · LRTM 본문은 R-09 규칙대로 **미수정**.

## 핵심 지점 4기준 판정표 (지점군별 — 알림 `logClientError(CRITICAL)` 연동은 미구현, 범위 밖)

| 지점군 | ① 금전 | ② SLA(고객접점) | ③ 침묵성 | ④ 과거 전례 | 판정 |
|:--|:--|:--|:--|:--|:--|
| 매핑 누락(도착국·운송방법) — 이번 warn 4 | 발급 차단(간접) | 발급 지연·재시도 유도 | **해당(이전 무기록)** | DEF-B-142 계열 | 핵심 후보 |
| 헬퍼 DB 오류 흡수 — 이번 error 3 | 발급·취소 실패 | 지연 | **해당(not found로 위장)** | DEF-B-142 계열 | 핵심 후보 |
| SHXK 외부 API 실패(기존 error) | 발급·취소 실패 | 지연 | 해소됨(로깅 존재) | **DEF-B-142 직접 해당** | 핵심(알림 연동은 후속 범위) |
| DB 쓰기·catch(기존 error) | 부분 | 지연 | 해소됨 | — | 보통 |
| 권한·데이터 없음(기존 warn) | 해당 없음 | 해당 없음 | 해소됨 | — | 보통 |

- Aiden 판단 대기: 위 핵심 후보의 `logClientError(CRITICAL)` 연동을 이 Task 뒤 별도 IMP/Task로 둘지(배정 코멘트의 Aiden 질문 항목).

## 검증 (DoD)

- `npm run check:lrtm` → **OK exit 0**
- `npm run build` → **exit 0** (SUCCESS)
- `npm run test:regression` → **Test Files 310 passed | 1 skipped (311) · Tests 2,387 passed | 16 skipped (2,403) · exit 0** (직전 2,377 대비 +10 = 신규 10)
- PR CI: `gh pr checks` 출력 그대로 인용([작업 결과] 참조)

## [DoD]

- [x] 재측정 결과(실패 반환·로깅 없는 지점·catch 건수와 지점군 목록) 기재 (위 표)
- [x] 잔여 지점 처리 7/7 · 미처리(방어 3) 사유 기재
- [x] 반환값 불변 단언 + "추가 줄은 로깅뿐" diff 건수 확인
- [x] 로거 레벨·오류 객체 전달 단언 테스트 12건(PGRST116 2 포함) · 회귀 항목 파일 · `check:lrtm` OK
- [x] 핵심 지점 4기준 판정표(알림 미구현 명시)
- [x] `npm run build` · `npm run test:regression` 전체 PASS
- [x] `gh pr checks <PR>` 출력 그대로 인용 + 완료 절차 R-17 (문서·코드 PR만, `Refs #1181`, 병합 Jaison·종결 Aiden)
- [x] 추가된 줄에 절대경로·계정·운영 값 없음 (R-21)

## [작업 결과]

- 커밋: `c60c40cf4f1f297d289d29a71615d1510ac8600e`
- PR: [#1554](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1554) (`Refs #1181`, base `TeamB_Dev`, 병합 Jaison·종결 Aiden) · head `59f74ba92`
