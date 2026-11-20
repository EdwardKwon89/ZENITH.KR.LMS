# vendor/ — 외부 패키지 벤더링

npm 레지스트리에서 더 이상 배포되지 않는 패키지를 **공식 배포처 원본 그대로** 저장소에 고정한 디렉터리입니다.
`package.json` 에서 `file:vendor/...` 형태로 참조합니다.

## xlsx-0.20.3.tgz

| 항목 | 값 |
|:--|:--|
| 패키지 | `xlsx` (SheetJS Community Edition) |
| 버전 | **0.20.3** |
| 출처 URL | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| 내려받은 날짜 | **2026-11-17** (KST) |
| 파일 크기 | 2,409,319 bytes |
| SHA-256 | `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8` |

해시 파일: [`xlsx-0.20.3.tgz.sha256`](./xlsx-0.20.3.tgz.sha256) — `shasum -a 256 -c vendor/xlsx-0.20.3.tgz.sha256`

### 왜 벤더링하는가 (DEF-146)

- `xlsx@0.18.5`(npm 레지스트리 최종 배포판)에는 high 등급 취약점 2건이 있습니다.
  - 프로토타입 오염 (수정: **0.19.3**)
  - ReDoS (수정: **0.20.2**)
- SheetJS는 npm 레지스트리 배포를 중단했고, 수정판은 **자체 CDN**으로만 배포합니다.
  따라서 `npm install xlsx@^0.20.3` 같은 레지스트리 기반 상향이 불가능합니다.
- 대안(엑셀 라이브러리 교체, 유지, CSV 전용 전환) 검토 결과는
  `docs/08_Self_Audit/Reviews/TASK-1151_DEF-146_운영의존성_취약점_영향분석.md` §5 참조.

### 주의사항

- ⚠️ **버전을 상향할 때는 반드시 수동 점검 필요** — npm 레지스트리 자동 감사(`npm audit`)가 이 벤더링 파일을 검사하지 못합니다.
  상향 시: ① 새 tarball 을 위 출처 URL 패턴에서 내려받고 ② SHA-256 을 다시 계산해 이 문서와 `.sha256` 파일을 갱신하고
  ③ `node scripts/check-vendor.mjs` 로 참조 버전·해시 일치를 확인하세요.
- 🔒 tarball 은 **재압축·수정하지 않고** 배포처 원본 바이트 그대로 커밋합니다. 해시가 그 증거입니다.
- 🐳 `Dockerfile` 의 `deps` 스테이지가 `npm ci` 전에 `vendor/` 를 복사해야 합니다(`COPY vendor ./vendor`).
  이 줄이 없으면 `file:` 의존성 해석 실패로 도커 빌드가 깨집니다.
- 📦 `package-lock.json` 의 `integrity` 값도 함께 커밋되어 `npm ci` 시 검증됩니다.
