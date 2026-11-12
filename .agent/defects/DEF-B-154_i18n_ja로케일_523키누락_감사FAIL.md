# DEF-B-154: `npm run check:i18n` 감사 FAIL — ja 로케일이 en 대비 523개 키 누락

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-B-347(Issue #1279) 작업 중 i18n 키 4개 로케일 추가를 위해 `npx tsx scripts/audit-i18n.ts`(`npm run check:i18n`) 실행 시 `exit 1`로 FAIL — 본 Task의 키 추가가 원인인지 확인하는 과정에서 **기존 상태로도 동일하게 FAIL함을 stash 비교로 확인** |
| **긴급도** | Low (ja 로케일이 축소 운영 중인 것으로 보이나, 감사 스크립트가 상시 FAIL 상태면 신규 키 누락이 걸러지지 않음) |
| **발견일** | 2026-11-13 |
| **조치 상태** | 미조치 — 기준(축소 로케일 허용 여부 / ja 보강 계획) 확인 필요 |

## 현상

`scripts/audit-i18n.ts`는 `messages/en.json`(873 keys)을 baseline으로 삼아
나머지 로케일의 missing 키를 검사한다.

```
ℹ️  Baseline [en] has 873 keys
❌ [ja] 523 missing key(s):
   - Common.welcome_verified
   - Common.hero_title
   - ...
❌ i18n audit FAILED: some locale files are missing keys compared to en.json.
```

- `messages/ja.json`의 `Common` 네임스페이스는 **5개 키뿐**(ko 28 / en 26).
- `zh`도 일부 네임스페이스가 en 대비 빠져 있으나(감사상 extra는 경고, missing만 FAIL), 현재 FAIL은 **ja missing 523건**이 유일한 원인.
- 본 Task의 신규 키(`Common.phoneHelp`·`phoneHelpHyphen`·`AgencyShippers.form_contact_phone_help`)는 **4개 로케일 모두 추가되어 있어** 본 Task와 무관( stash 비교로 기존 FAIL 확인).

## 영향 범위

- ja 로케일 사용자에게는 미번역 키가 key 문자열 그대로 노출될 수 있음(next-intl fallback).
- `check:i18n`이 CI(`.github/workflows/pr-checks.yml`)에 포함되어 있지 않아 감사 FAIL이 자동 차단되지 않음 — 누락 키가 지속적으로 누적될 여지.

## 권장 조치

1. ja(및 zh)를 "축소 로케일"로 공식 인정할지 판단 — 인정 시 감사 스크립트에 로케별 허용 범위(baseline 축소)를 명시해 FAIL을 해소.
2. 아니면 ja 보강 계획 수립 + `check:i18n`을 PR Checks에 advisory로 편입.
