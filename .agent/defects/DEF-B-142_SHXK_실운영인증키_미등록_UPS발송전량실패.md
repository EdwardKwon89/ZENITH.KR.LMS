# DEF-B-142: SHXK 실운영 인증키(SHXK_APP_KEY/TOKEN) Vercel Production 미등록 — UPS 발송(국제운송번호 발행) 전량 실패

**발견일**: 2026-08-19
**발견자**: Edward 보고(james@sntl.co.kr, ZEN-2026-000011 UPS 발송 오류) → Aiden 원인 분석
**긴급도**: 즉시 (Critical) — "정식 GoLive" 선언된 핵심 기능이 실제로는 한 번도 성공하지 못함

## 현상

ZEN-2026-000011(WAREHOUSED, US행) UPS 발송 시도 시 9회 연속 동일 오류로 실패:

```json
{"success": 0, "cnmessage": "参数错误：缺少必要的参数", "enmessage": "Parameter error"}
```

`zen_shxk_api_logs`(원격 프로덕션 DB) 전체 조회 결과, **실제(mock 아닌) `createorder` 호출 14건 중 성공 0건** — 이 오더만의 문제가 아니라 UPS 라벨 발급 기능 자체가 프로덕션에서 단 한 번도 성공한 적이 없음(`zen_ups_labels` 테이블도 0건).

## 원인

- `vercel env ls` / `vercel env pull --environment=production` 확인 결과, **`SHXK_APP_KEY`·`SHXK_APP_TOKEN`이 Vercel의 production/preview/development 전 환경에 존재하지 않음**.
- `src/lib/shxk/config.ts`가 `process.env.SHXK_APP_KEY ?? ''`로 값을 읽어, 미설정 시 **빈 문자열이 그대로 SHXK API로 전송**됨. `assertShxkConfig()`가 이 상황을 막기 위해 존재하지만 `callShxk()`(`src/lib/shxk/client.ts`) 어디에서도 호출되지 않아 죽은 코드 상태 — 인증키 없이도 조용히 요청이 나가고, SHXK 서버가 인증 불가 요청을 범용 "Parameter error"로 반환하는 것으로 추정됨.
- 이력 추적(Issue #135/TASK-B-033, 2026-06-28) 결과: 실 SHXK 인증키는 **JSJung의 로컬 `.env.local`에만 등록**되었고, 당시 완료 보고에 `Mock mode: SHXK_TEST_MOCK=true (현재 mock 활성)`로 명시됨 — 즉 UAT-17/18/19 "PASS" 판정 전부 mock 응답 기준이었음. 이후 아무도 이 키를 Vercel Production 환경변수로 이관하지 않았고, "2026-07-20 UPS 특송 서비스 정식 GoLive" 선언도 이 mock 검증 결과 위에서 내려짐.
- 참고(부차적, 별도 확인 필요): `buildCreateOrderPayload()`/`buildCargovolume()`(`src/lib/ups/label-mapping.ts`)의 `order_weight`·`order_pieces`·`cargovolume[].involume_*` 필드가 SHXK 공식 스펙(문자열 타입)과 달리 JSON 숫자로 전송됨(`invoice[]` 필드는 `String()` 캐스팅되어 있어 이 부분만 누락). 인증 자체가 안 되는 상태라 이게 실제로 추가 실패 요인인지는 검증 불가 — 인증키 정상화 후 재확인 필요.
- 회귀 테스트(1,400여건)는 전부 `SHXK_TEST_MOCK=true`로 동작해 목킹 응답기가 인증/타입 검증을 하지 않으므로, 이 클래스의 결함은 테스트로 원천적으로 발견 불가능한 구조.

## 영향 범위

- UPS 발송(국제운송번호 발행) 기능 전체 — 프로덕션에서 시도된 모든 실 오더(destCountry 무관, 최소 3건 확인: ZEN-2026-000008/010/011)가 100% 실패.
- 사용자(화주)는 반복 재시도만 하게 되고 실패 원인을 알 방법이 없음(에러 메시지가 "Parameter error"로만 노출).

## 권장 조치 (TASK-B-318로 처리)

1. **실 SHXK_APP_KEY/SHXK_APP_TOKEN 값 확보 및 Vercel Production 환경변수 등록** — JSJung 보유분(로컬 `.env.local`) 확인 후 이관, 또는 SNTL 측에 값 재확인.
2. `assertShxkConfig()`를 `callShxk()` 진입점에 연결 — 키 미설정 시 조용히 빈 값 전송하는 대신 명확한 한글 에러로 즉시 실패.
3. 실 인증키 등록 후, 실제(비-mock) 환경에서 `createorder` 테스트 호출로 정상 동작 재확인.
4. 위 확인 이후 `order_weight`/`order_pieces`/`cargovolume[].involume_*` 필드의 문자열 캐스팅 여부를 SHXK 스펙과 재대조.
5. 재발 방지: 이번처럼 mock 모드로만 검증된 기능을 "GoLive"로 선언하기 전, 실 API 대상 최소 1회 실통과 확인을 완료 체크리스트에 명시.

## 해소 확인 (2026-08-19, Edward 실측)

- Aiden이 실 `SHXK_APP_KEY`/`SHXK_APP_TOKEN`을 Vercel Production에 등록(Edward가 안전 채널로 값 전달) 후 **좁은 재배포**(코드 변경 없이 동일 커밋 재빌드, env만 반영) 진행.
- Edward가 프로덕션 화면에서 ZEN-2026-000011 UPS 발송을 직접 재시도 — `zen_shxk_api_logs` 실측 확인:
  ```
  07:49:13 createorder → success:1, 실제 UPS 트래킹번호 1ZJ443D30411318800 발급
           (이 시스템에서 실(non-mock) createorder 성공 사례 최초)
  07:50:46 removeorder → success:1 (Edward가 테스트 목적으로 의도적 취소 — 별도 결함 아님)
  ```
- **결론**: 인증키 미등록이 원인이었다는 진단이 실측으로 확정됨. §1(인증키 등록)·§3(정상 동작 재확인) DoD 완료.
- **남은 DoD**(Team B/JSJung 후속 구현): §2 `assertShxkConfig()` 호출부 연결, §4 숫자/문자열 타입 재검토, §6 `LIVE_REGRESSION_TEST_MAP.md` 갱신.
- **별도 확인 필요**: ZEN-2026-000011(james@sntl.co.kr 실제 화물)은 테스트 후 의도적으로 취소된 상태라 **아직 실발송 미완료** — 실제 재발송 여부는 Edward 확인 대기.
