# TASK-B-097: Issue #337 — proxy.ts 미들웨어 org_type 게이트가 /shipper·/agency 차단 (Critical)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#337](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/337) |
| **담당** | Dave (D_Kai) |
| **생성일** | 2026-07-11 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 사항

**근본 원인**: `src/lib/auth/proxy.ts`의 `isAllowedPath` 체크가 `/shipper`와 `/agency` 경로를 허용 목록에 포함하지 않아, SHIPPER/AGENCY org type 사용자는 미들웨어 레벨에서 `/orders`로 강제 리다이렉트됨. 추가로 `ORG_ROUTE_MAP`에 `AGENCY` 타입이 아예 없어 우연히 fallback `'/'`로 통과되던 취약 상태.

### 수정 파일

| 파일 | 변경 |
|:-----|:------|
| `src/config/routes.ts` | `OrgType` 타입에 `'AGENCY'` 추가 · `ORG_ROUTE_MAP`에 `AGENCY: '/agency'` 추가 |
| `src/lib/auth/proxy.ts` | `isAllowedPath` 목록에 `purePath.startsWith('/shipper')` · `purePath.startsWith('/agency')` 추가 |

### 검증

- **build PASS** ✅
- **Playwright AGENCY 실 테스트**: `agency@zenith.kr` 계정으로 `/agency/ups-rates` 및 `/agency/shippers` 정상 접근 확인 (200 OK, no redirect) ✅
- SHIPPER 계정: `jungjs72@gmail.com` 패스워드 불명으로 curl 테스트 불가 → 코드 검증으로 대체 (동일 패턴)

### 커밋

- `54f436bc` — `[Dave] fix: TASK-B-007 Issue #337 — proxy.ts 미들웨어 /shipper·/agency 차단 문제`
