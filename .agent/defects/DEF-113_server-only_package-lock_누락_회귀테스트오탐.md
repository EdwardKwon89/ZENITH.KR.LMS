# DEF-113: `server-only` 패키지가 `package-lock.json`에 누락되어 관련 테스트 파일 CI 상시 실패

| 항목 | 내용 |
|:----|:----|
| **발견 경위** | PR#646(Baker, TASK-B-170, Issue #635 Task C) 재작업분 실제 CI(`Regression Tests`) 확인 중 발견 |
| **긴급도** | Medium |
| **발견자** | Jaison |
| **발견일** | 2026-07-21 |

## 현상

`gh pr checks 646` 결과 `Regression Tests`가 fail로 표시됨. 로그 확인 결과 672개 테스트 자체는 전부 PASS했으나, 3개 테스트 파일이 트랜스폼(로드) 단계에서 아래 에러로 죽어 "Failed Suites"로 집계됨:

```
Error: Failed to resolve import "server-only" from "src/lib/shxk/order.ts". Does the file exist?
  Plugin: vite:import-analysis
```

실패한 파일:
- `tests/unit/warehouse/agency-warehouse-scoping.test.ts`
- `tests/unit/warehouse/outbound-ups.test.ts`
- `tests/unit/warehouse/ups-pickup-inbound.test.ts`

세 파일 모두 `src/lib/shxk/order.ts`(1행 `import 'server-only'`)를 mock하지 않고 트랜지티브하게 import하는 경로를 갖고 있어, vite가 실제 `server-only` 패키지를 resolve하려다 실패함.

## 근본 원인

- `node_modules/next/package.json`은 `server-only: "0.0.1"`을 의존성으로 명시하지만, **저장소 `package-lock.json`에는 `server-only` 항목 자체가 존재하지 않음**.
- `TeamB_Dev` HEAD(PR#646과 무관한 시점)에서 직접 재현 확인 — 이번 PR이 원인이 아니라 **저장소 레벨의 사전 존재 결함**.
- fresh `npm ci`(CI 환경)에서는 항상 재현되나, 로컬 개발 환경은 과거 `npm install` 이력에 따라 `node_modules`에 우연히 남아있어 증상이 드러나지 않았을 가능성.

## 영향 범위

- `src/lib/shxk/order.ts`를 mock 없이 임포트 체인에 두는 **모든 테스트 파일**이 CI에서 항상 실패 처리됨(현재 확인된 3개 외에도 더 있을 수 있음 — 전수조사 안 됨).
- 그동안 R-08-1(CI 미트리거 시 로컬 대체)이 반복 적용되어온 탓에 이 결함이 실제 CI 상에서 드러난 것은 이번이 사실상 처음으로 추정됨.
- `R-08`(전체 PASS 증거 첨부 의무) 준수를 저해 — 앞으로 이 3개 파일을 건드리지 않는 PR이라도 `Regression Tests` 체크가 이유 불문 fail로 표시되어, 매번 근본원인 재분석 없이는 "CI fail=병합 보류" 오판이 반복될 위험.

## 임시 조치

이번 건(PR#646)은 실패 원인이 이 결함으로 명확히 특정되고 PR 자체 변경분과 무관함을 확인해 Jaison 판단으로 승인·병합함. 향후 동일 에러 재발 시 이 DEF를 참조해 "PR 자체 결함이 아님"을 빠르게 판별 가능.

## 목표 구현

`package-lock.json`을 `server-only` 포함하도록 재생성(`npm install` 후 lockfile 갱신) 또는 `vitest.config.ts`에 `server-only`를 명시적으로 mock/alias 처리(예: `resolve.alias`에 빈 모듈로 매핑) — 어느 방식이 적절한지는 Aiden/Team A 판단 필요(빌드 설정 영역).

## 관련 파일

- `package-lock.json`
- `src/lib/shxk/order.ts`
- `vitest.config.ts`
- `tests/unit/warehouse/agency-warehouse-scoping.test.ts`
- `tests/unit/warehouse/outbound-ups.test.ts`
- `tests/unit/warehouse/ups-pickup-inbound.test.ts`

## 예상 공수

Low (0.5일 이내 추정 — lockfile 재생성 후 CI 재확인)

## 우선순위

Medium — 즉시 기능 장애는 아니나, R-08 회귀 검증 신뢰성을 지속적으로 저해함
