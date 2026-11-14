<!-- agent=D_Kai round=R2 label=D_Kai (OpenCode/DeepSeek) [review/build] secs=64 -->
## 1. 상대 의견 대조 (동의/반대)

**동의(사실 확인 완료)**
- **Riley 점검2-②(로케일 이원화)**: 맞음. `src/lib/auth/rbac.ts:33`은 `['ko','en','zh','ja']`를 하드코딩하는데 `src/i18n/routing.ts:6`·`src/lib/auth/proxy.ts:8,26`은 `routing.locales`를 참조 → §4.7-8에 대조 점검 추가 필요.
- **Riley 점검2-①(DEF-085 설명)**: 맞음. `.agent/defects/DEF-085_proxy_warehouse_authguard_누락.md:15`는 `ALLOWED_PATHS` 누락이고 역할 불일치가 아니다. 231 §1.1-5·§3의 인용은 정정 대상(내 1라운드 미지적).
- **Riley 점검3-1(105 노후화)**: 맞음·차단 사유 승격. 105:162에 `CLAIMED`/`DISPOSED` 없음, 105:169 `WAREHOUSED→PACKED,HELD,RETURNED` vs `status-machine.ts:13`(REGISTERED·SCHEDULED·RELEASED 추가), 105:184-187 역할 4개 vs `:36-40` 5개+ADMIN 예외, 105:194 "WAREHOUSED 수정 불가" vs `status-machine.ts:133-145`(UPS 전체 수정).
- **Riley 점검3-3(discount-guard 무음 실패)**: 맞음. `discount-guard.ts:9-15,32-55`는 `.data`만 구조분해하고 `error`를 검사하지 않아 **fail-open**(오류 시 `null`=제한 없음), `:21` 한글 리터럴.
- **B_Kai 점검2-5(모듈① 경계)**: 맞음·차단 승격. `ups-registration.ts:25-39`는 조회 전용이고, 순수 판정은 `src/lib/orders/ups-edit-availability.ts:37-66`(66줄, `hasActiveUpsLabel` boolean을 받아 결합)인데 231 §8.2에 없다.
- **B_Kai 점검2-7(부록B D4 오분류)**: 맞음. B-142(인증키 미등록)·B-143(Resend 도메인)·B-148(Storage 업로드)은 payload 계약이 아니다.
- **B_Kai 점검3-6(도구 승인 게이트)**: 맞음. 변이·커버리지는 devDependencies(config) 변경 → R-11(231:13)과 충돌하므로 "1-0 도구 승인" 게이트 필요.
- **B_Kai 점검3-8("행 수=테스트 행 수")**: 맞음. negative/예외 테스트가 붙으면 성립 불가 → 행↔테스트 추적 링크로 대체.

**반박(상대 근거의 오류)**
- **Riley 점검1 #26 근거 2건**: ⓐ "§10 #2에 D3 잔존" → §10 #2에 D3 없음(잔존은 §8.3 "D3 2건"과 §8.2 "D3은 포함되지 않으므로") ⓑ "§5.2 표에서 D3-B·D8이 `-`" → D8은 **🟡**, `-`는 D3-B뿐. 논지(행 분리)는 성립하나 인용 수정 필요.
- **Riley 점검4 "결합은 상위 서버 액션"**: 부정확. 결합 함수는 `ups-edit-availability.ts:51`(`getOrderEditScope(status,'UPS')`+라벨 여부). B_Kai 지적이 더 정확하다.
- **Riley 방안 B("1차 커밋=실패하는 테스트")**: `GOV_COMMON.md:333` "커밋 전 `test:regression` PASS"와 정면 충돌(확인). 이 해법은 철회해야 한다.

## 2. 사실 확인 결과 (본인 직접 확인)

| 주장(주체) | 판정 | 근거 |
|:--|:-:|:--|
| `riley_review.md` 0바이트 (나·B) | 맞음 | `ls -l` 0B |
| `DEF-B-157` 실재 (231 §5.1) | **틀림** | 최대 `DEF-B-153` |
| revalidatePath 사례 = B-057, 058/062/063 아님 (나·B) | 맞음 | B-057 파일명 확인 |
| USER_ROLES 14개, "8개 역할" 아님 (나·B) | 맞음 | `rbac.ts:8-23` |
| 회귀 맵 1,129줄 / 231 425줄 | 맞음 | `wc -l` |
| module② discount-guard 4쿼리, zen_ups_labels 아님 (B) | 맞음 | `:10,33,37,41` |

## 3. 내 입장 변경 / 유지

**바꿈**: ① 105 현행화 선행을 **차단 사유로 수용**(Riley·B_Kai 독립 지적 + 내 재확인) ② 모듈① 경계 오류를 **차단 사유로 승격**(B_Kai) ③ §7-2 해법을 "실패 테스트 커밋"(철회) → **`it.fails` + `src/` 미수정 + Draft PR 승인 게이트**로 수정(`it.todo`는 스펙 검증력 0).
**유지**: Riley 원문 0바이트 차단, DEF-B-157·B-057 오인용, 14역할, §4.1 완료 기준 측정 불가(도구 미설치), §4의 예제·실행 명령 부재.

## 4. 안건별 합의/대립

| 항목 | 내 입장 | 합의여부 |
|:--|:--|:-:|
| 105 §3 현행화 선행 | 찬성 | 합의(3인) |
| 모듈①에 `ups-edit-availability.ts` 추가 | 찬성 | 합의(B·나) |
| D3 → D3-A/D3-B 표기 통일 | 찬성 | 합의(R) |
| 커버 맵 PR 직접 수정 금지 | 찬성 | 합의 |
| 모듈② 차원에 D8 추가 | 찬성 | 합의(R·나) |
| §8.3 DEF 10건을 PoC 모듈로 제한 | 반대(6:4 배분) | **대립(B)** |
| 과거 커밋 체크아웃만 재현 인정 | 조건부(수동 재주입 허용) | **대립(B)** |
| 1차 커밋 표기 | `it.fails` | **대립(B: todo)** |
| §4.8 에러코드 단언 | 지금은 구조화 필드 경로로 대체 | 합의 |

## 5. 안건별 현재 최선안

1. **105**: 별도 Issue로 §3-1~3-4 현행화 → 단계 1a-①의 착수 조건. §7-1은 "명세 = 최신 확정 Issue AC가 R-12로 환류된 상태"로 한정.
2. **§7-2**: Issue 1건 유지(1 Issue=1 Agent). 1차 커밋 = 결정표 + `it.fails`(src 미수정) → Draft PR에서 Aiden 승인 → 2차 커밋에서 `it`로 전환. R-08 green 유지.
3. **D3-B 모순(B_Kai 2)**: 매트릭스를 문서가 아니라 `tests/db/permission-matrix.ts`(데이터)로 두고, 커버 맵은 PR 본문만 → "행 추가 없으면 미완료"와 "PR 직접 수정 금지"가 양립.
4. **§8.2**: ②의 D8 명기 + `discount-guard` error 미검사(fail-open)를 PoC 검증 타깃으로. ①은 3파일로 분해(순수/결합/DB).
5. **§4**: 말미에 파일 경로·실행 명령·최소 예제 1개 + 용어표(Ds-11, RLS(Row Level Security, 행 단위 접근 제어), vacuous(값을 확정하지 않는 단언), PoC(Proof of Concept, 개념 검증)).

## 6. 대립 항목 결정 기준·판정 규칙

| 대립 | 실험/데이터 | 판정 규칙 |
|:--|:--|:--|
| §8.3 범위 제한 | PoC 모듈 내 5건 + 외 5건 재현 | 외부 5건 추가 검출률이 내부보다 낮으면(≤) B안(제한) 채택, 높으면 내 안 |
| `it.fails` vs `it.todo` | 3모듈에 각 1건 시범 적용 | ① R-08 PASS ② 되돌리기 시 실패 확인 — 둘 다 충족하는 쪽 채택. skip은 실적 불인정 |
| 재현 방식 | 동일 DEF 1건을 (a)커밋 체크아웃 (b)수동 재주입, 2인 실행 | 두 결과 불일치 시 케이스 제외, 3건 중 2건 일치해야 지표 반영 |
| D8 필수 여부 | `discount-guard` 4쿼리에 error 주입 | 현행 테스트가 미검출하면 D8 필수(현재 코드상 미검출 예상 — 확인) |

## 승인 차단 사유 (중대 지적)
① `riley_review.md` 0바이트 → (R) 14건 검증 불가 ② `DEF-B-157` 허위 인용(§5.1, 1a-④) ③ B-057 오인용(§1.1-5, §4.7-4) ④ §7-2가 R-08(`GOV_COMMON.md:333`) 위반 ⑤ 105 §3 노후 상태로 1a 착수 불가 ⑥ §8.2 모듈① 경계 오류(`ups-edit-availability.ts` 누락).

## v1.0 승인 가능 여부
**조건부**. ①~⑥ 해소 + ⑦ Riley 근거 2건 정정 + ⑧ §8.2 ②에 D8 추가 시 승인. ①·⑤ 미해소 시 **불가**.