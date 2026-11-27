# DEF-B-172 — SHXK `createorder` 발송인 회사명 누락 거절 재발

| 항목 | 내용 |
|:--|:--|
| **발견 경위** | Aiden이 2026-11-26 17:13 KST Issue #1552로 보고. 운영 서버 로그에 SHXK 거절 원문 `发件人公司不能为空`(발송인 회사명이 비어 있을 수 없음) 기록 — 응답 값이 아닌 **오류 문구**이므로 R-21 기재 대상 아님. 운영 DB·로그 직접 조회는 R-14에 따라 미실시. |
| **긴급도** | High — UPS 오더 등록(`createorder`) 차단, 동일 오더 재시도 시 동일 거절 |
| **현재 상태** | 원인 확정·수정 완료(PR #1561, `TeamB_Dev` 병합 대기). 실제 SHXK 호출 검증은 미실행. |
| **관련 이력** | DEF-B-054(IS #1067) → TASK-B-282(전송 복구) → TASK-B-341(화주명 통일) → TASK-B-342(회사 기본값 고정) → TASK-B-345(IS #1277/PR #1282, 키 자체 제거) → 본 건 |

## 근본 원인 (확정 — 저장소 기록 기준)

- 당시 `src/lib/ups/label-mapping.ts`의 `buildShipperPayload()`는 `shipper_company` 키를 만들지 않았다(주석 1곳만 존재). `src/app/actions/operations/ups-labels.ts`의 발송인 구성 2경로도 동일했다.
- DEF-B-054 당시 실측 근거는 **`shipping_method: FXUPS`에서 서버가 이 필드를 필수 검증**한다는 것이었다. 그 회귀 테스트의 단언이 TASK-B-345에서 `not.toHaveProperty`로 반전되면서 근거 검토 없이 키 제거가 `main`에 병합됐고, 11-23 운영 릴리즈에 그대로 반영된 것으로 보인다.
- `validate-payload.ts`에는 `shipper_company` 검증이 없어, 키 누락이 사전검증을 통과한 뒤 SHXK 서버에서 거절된다(사전검증 보강은 별도 IMP [#1560](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1560) 범위).
- 화면에 일반 문구(`코드: CREATEORDER`)만 표시되는 이유는 `SHXK_TRANSLATION_DICT` 등재 문구가 2종뿐이라 미매칭 거절이 `shxk_generic`으로 대체되기 때문이다.

## 영향 범위

- `FXUPS`(Saver + DDU) 경로에서 발현 확인(DEF-B-054 실측). 이번 운영 오더의 서비스 코드는 운영 로그 미열람으로 미확인.
- 수정은 전 경로 전송으로 결정했으므로, 값은 환경변수 `SHXK_SHIPPER_COMPANY`에서 읽고 미설정·빈 값·공백 시 `SHXK_SHIPPER_NAME` 값으로 대체 + `logger.warn`으로 누락을 관측한다.

### 대체 방식 검토 (Jaison 지시 2)

- **결론**: Jaison이 지정한 `SHXK_SHIPPER_NAME` 대체 + `logger.warn` 방식을 그대로 채택한다. 임의 변경 없음.
- **근거**: ① `SHXK_SHIPPER_NAME`은 이미 모든 배포 환경에 설정되어 있어 미설정 시에도 빈 문자열 전송을 막을 수 있다(이번 결함의 직접 원인 회피). ② `company`를 `shipperDefaults.name`(화주명)으로 대체하는 안은 TASK-B-341·B-342의 번복 이력과 충돌하고, 화주별로 회사명이 달라 SHXK의 발송인 회사 계약을 깨뜨릴 수 있다. ③ `assertShxkConfig()`처럼 미설정 시 예외를 던지는 안은 오더 등록 전체를 차단해 p1 장애를 키우므로 부적합하다. ④ 경고 로그로 운영에서 설정 누락을 관측할 수 있어 Aiden의 환경변수 설정 누락 탐지 경로가 확보된다.

## 조치 내역 (완료 — PR #1561)

1. `src/lib/shxk/config.ts`에 환경변수·폴백·warn 추가(빈 값·공백 trim 방어 포함).
2. `label-mapping.ts`의 `shipperDefaults` 계약에 회사명을 포함하고 `shipper_company`를 항상 전송. `ups-labels.ts` 2경로에서 환경변수 값 주입.
3. 5개 테스트 파일의 30개 부정 단언을 키 존재·값 단언으로 전환하고, 설정값/미설정 폴백/`FXUPS` 케이스 추가(경계 7건 추가).
4. `Ds-11` payload 계약 갱신, 회귀 항목 등재 완료. 실경로 재현은 **미실행**(테스트용 오더·화주 식별 확인 절차 미충족) — 환경변수 설정 후 Aiden이 실검증 예정.

## 재현·검증 메모

- 실제 SHXK 호출은 샌드박스가 없어 `createorder` → 즉시 `removeorder` 삭제 확인이 필요하다(Jaison 조건부 승인). 조건 미충족 시 미실행 사유를 task file에 기재한다.
- 계정·키·환경변수 값·오더 식별자·**응답 값**·절대경로는 저장소·문서·코멘트에 기재하지 않는다(R-21). 거절 사유 오류 문구 자체는 응답 값이 아니므로 위반에 해당하지 않는다.
