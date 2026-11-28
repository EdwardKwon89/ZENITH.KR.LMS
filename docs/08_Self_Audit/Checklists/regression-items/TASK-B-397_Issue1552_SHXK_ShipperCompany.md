# [TASK-B-397] SHXK `createorder` 발송인 회사명 재전송 (Issue #1552 / DEF-B-172)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-397 / [#1552](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1552) |
| **팀 / 작성일** | Team B / 2026-11-27 |
| **대상 모듈** | `src/lib/shxk/config.ts`, `src/lib/ups/label-mapping.ts`, `src/app/actions/operations/ups-labels.ts` |
| **검증 차원** | D1(매핑), D2(설정·폴백), D8(로그 관측) |

**2026-11-27, Baker** — TASK-B-345의 `shipper_company` 키 미전송을 번복하고, 환경변수 `SHXK_SHIPPER_COMPANY` 값을 전 경로에서 전송하도록 수정했습니다. 미설정 시 `SHXK_SHIPPER_NAME` 값으로 대체하고 `logger.warn` 1회를 남깁니다. 실제 값은 저장소·문서·테스트에 기재하지 않고 테스트는 더미 문자열을 사용합니다(R-21).

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-397-01 | 환경변수 설정 시 config 노출 | `SHXK_SHIPPER_COMPANY` = 설정값, `warn` 미호출 | `tests/unit/shxk/task-b397-shipper-company-env.test.ts` | CI (vitest) |
| TC-397-02 | 미설정 폴백 | `SHXK_SHIPPER_COMPANY` = `SHXK_SHIPPER_NAME`, `warn` 1회 | 동일 | CI (vitest) |
| TC-397-03 | `FXUPS` 경로 payload | `shipper.shipper_company` = 환경변수 값, `shipper_name` = 화주명 | 동일 | CI (vitest) |
| TC-397-04 | 기존 30개 부정 단언 전환 | 5개 파일의 `shipper_company` 키 존재·값 단언(더미 값) | `tests/unit/ups/ups-labels-mapping.test.ts` | CI (vitest) |
| TC-397-05 | 화주명 사양 유지(8건) | `shipper_name` 폴백 순서 불변 + `shipper_company` 값 단언 | `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts` | CI (vitest) |
| TC-397-06 | 회사 기본값 사양 전환(8건) | 다른 `name` 주입 시에도 `shipper_company` = 환경변수 값 | `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts` | CI (vitest) |
| TC-397-07 | 화주명 수기입력 사양 전환(7건) | 수기입력·조직명 폴백은 `shipper_name`에만 적용 | `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts` | CI (vitest) |
| TC-397-08 | DEF-B-054 회귀(1건) | 실제 액션 경로 `createorder` payload에 `shipper_company` 존재 | `tests/unit/ups/defb054-shipper-company.test.ts` | CI (vitest) |

**수정 전 되돌리기 검증**: 구현 전 `tests/unit/shxk/task-b397-shipper-company-env.test.ts` 3/3 FAIL (`config` 미존재 export 2건 + payload 키 누락 1건) 확인 후 구현 → 3/3 PASS.

**회귀**: `npx vitest run` 대상 6개 파일 **78/78 PASS**. 전체 `npm run test:regression` 결과는 task file에 기재합니다.

**실경로 SHXK 호출**: 미실행. 테스트용 오더·화주 식별 값이 테스트용임을 확인할 픽스처·절차가 없어 Jaison의 조건부 승인(1회 `createorder` → 즉시 `removeorder`, 식별자·원문 비기재) 요건을 충족하지 못했습니다. 추가 호출 없이 사유만 보고합니다.
