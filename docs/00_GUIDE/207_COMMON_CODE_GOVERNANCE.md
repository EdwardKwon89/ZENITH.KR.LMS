---
tags: ["procedure"]
---

# [207] ZENITH Common Code Governance (제니스 공통 코드 거버넌스)

> **문서번호:** 207
> **관할:** CIO (Chief Information Officer)
> **대상:** 모든 업무 분기 및 상태 관리 로직

## 1. 개요
제니스 플랫폼 내에서 발생하는 모든 상태 값, 유형 구분, 코드성 데이터는 하드코딩을 엄격히 금지하며, 본 문서에 정의된 **공통 코드 체계**를 통해서만 관리한다.

## 2. 코드 구조
- **Group Code**: 업무 도메인 단위의 코드 집합 (예: `ORDER_STATUS`, `USER_ROLE`)
- **Code Value**: 실제 DB에 저장되는 최소 단위 값 (예: `REGISTERED`, `CARRIER`)
- **Multi-language**: `code_name_ko`, `code_name_en` 등 다국어 명칭 지원 필수.

## 3. 운영 원칙
1. **코드 우선 원칙**: 새로운 업무 상태가 발생하면 반드시 `common_codes`에 먼저 등록한다.
2. **분기 처리 가이드**: 
   ```typescript
   // Bad: 하드코딩
   if (order.status === 'REGISTERED') { ... }

   // Good: 공통 코드 또는 상수 매핑 활용 (추후 DB 연동)
   if (order.status === STATUS.REGISTERED) { ... }
   ```
3. **사용자 환경**: UI에 노출되는 모든 코드 명칭은 사용자의 `preferred_language` 설정을 따르며, 기본값은 'KO'로 한다.

## 4. 관리 도구
- 관리자(ADMIN)는 `Master Data > Codes` 메뉴를 통해 실시간으로 명칭 및 정렬 순서를 변경할 수 있어야 한다.
