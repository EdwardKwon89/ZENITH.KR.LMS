# TASK-B-174: DEF-115 — WarehouseUpsReceiving.partial_success i18n 키 누락

| 메타 | 값 |
|:----|:----|
| **Issue** | [#659](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/659) (DEF-115) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-21 |
| **상태** | 🔔 검토 요청 |

## 작업 결과

### 변경 내용

`WarehouseUpsReceiving` 블록에 누락된 `partial_success` 키를 4개 로케일에 추가:

| 로케일 | 값 |
|:-------|:---|
| ko | `UPS 등록 완료: {success}건 성공, {fail}건 실패` |
| en | `UPS registration complete: {success} succeeded, {fail} failed` |
| ja | `UPS登録完了: {success}件成功、{fail}件失敗` |
| zh | `UPS注册完成：{success}件成功，{fail}件失败` |

### 파일 목록
- `messages/ko.json` — partial_success 키 추가
- `messages/en.json` — partial_success 키 추가
- `messages/ja.json` — partial_success 키 추가
- `messages/zh.json` — partial_success 키 추가

### 검증
- 빌드: ✅ PASS (next-intl 키 누락 에러 없음)
- 커밋 해시: `80957da3`
- PR: [#660](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/660)
