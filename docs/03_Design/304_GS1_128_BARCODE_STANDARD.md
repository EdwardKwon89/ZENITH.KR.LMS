# 🛰️ 304_GS1_128_BARCODE_STANDARD (v2.0)

> **문서 상태**: 승인 (Approved)
> **대상 범위**: ZENITH LMS 마스터 오더(Master Order) 및 글로벌 패키징 유닛
> **표준 규격**: GS1-128 (SSCC-18 규격)

## 1. 배경 및 목적
글로벌 물류 가시성과 공급망 내 하남 시스템 호환성을 위해 국제 표준인 **SSCC-18 (Serial Shipping Container Code)**을 채택합니다. 이는 단순 식별자를 넘어, 전 세계 어느 물류 거점에서든 스캔만으로 화물을 고유하게 식별할 수 있는 기반이 됩니다.

## 2. SSCC-18 기술 사양

### 2.1 데이터 구조 (18자리 숫자)
SSCC-18은 Application Identifier (00)과 함께 사용되며, 총 20자리(AI 포함)의 데이터 스트림을 형성합니다.

| 필드 명칭 | 길이 | 설명 |
| :--- | :--- | :--- |
| **Application Identifier (AI)** | 2 | `00` (SSCC 식별 코드) |
| **Extension Digit** | 1 | `1` (제니스 고유 확장자) |
| **GS1 Company Prefix** | 8 | `88012345` (제니스 글로벌 업체 코드) |
| **Serial Reference** | 8 | `00000001` ~ `99999999` (순차적 일련번호) |
| **Check Digit** | 1 | Luhn Mod 10 알고리즘에 의한 검증 번호 |

**예시**: `(00)188012345000000012`

### 2.2 체크 디지트 알고리즘 (Luhn Mod 10)
데이터 정합성을 위해 마지막 18번째 자리는 아래 규칙에 따라 계산됩니다.
1. 오른쪽에서 왼쪽으로 홀수 번째 자리 숫자에 3을 곱함.
2. 짝수 번째 자리 숫자를 그대로 합산.
3. 전체 합계를 10으로 나눈 나머지값을 10에서 뺌 (결과가 10이면 0).

## 3. 시스템 구현 가이드

### 3.1 바코드 생성 및 검증 (Utility)
```typescript
/**
 * SSCC-18 형식의 마스터 오더 번호를 생성하고 검증함
 */
export const validateSSCC18 = (moNo: string): boolean => {
  if (!/^\d{18}$/.test(moNo)) return false;
  // Luhn Checksum Logic Implementation...
  return true;
};
```

### 3.2 UI 및 라벨 출력
- **심볼로지**: GS1-128 (Code 128 기반)
- **HRI 표기**: AI는 반드시 괄호 `(00)`를 포함하여 가독성 확보.
- **Library**: `react-barcode` 사용 시 `format="CODE128"` 및 FNC1 프리픽스 적용 권장.

## 4. 개정 이력
- 2026-04-16 (v1.0): 단순 AI(400) 방식 기반 초안 (Draft)
- 2026-04-21 (v2.0): **SSCC-18 표준 전면 도입 및 알고리즘 사양 확정 (Final)**
