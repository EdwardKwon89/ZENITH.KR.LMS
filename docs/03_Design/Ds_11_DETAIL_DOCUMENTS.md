# Ds-11 API 상세 명세 — DOCUMENTS

> **도메인:** Documents | **버전:** v1.0 | **최종 수정:** 2026-04-28
> **파일:** `src/app/actions/documents.ts` (예정)

## 19.1 generateCI (Action)
Commercial Invoice 생성을 위한 데이터를 추출하고 다국어 매핑을 수행합니다.

- **권한**: User
- **입력 파라미터**:
  ```typescript
  {
    order_id: string;
    locale: 'ko' | 'en' | 'zh' | 'ja';
  }
  ```
- **반환값**: `CIData` (송하인, 수하인, 품목 리스트, 합계 등)
- **비고**: `@react-pdf/renderer`와 연동하여 실시간 PDF 렌더링에 사용.

## 19.2 generatePL (Action)
Packing List 생성을 위한 데이터를 추출하고 다국어 매핑을 수행합니다.

- **권한**: User
- **입력 파라미터**:
  ```typescript
  {
    order_id: string;
    locale: 'ko' | 'en' | 'zh' | 'ja';
  }
  ```
- **반환값**: `PLData` (포장 단위, 중량, CBM 등)

## 19.3 getDocumentsByOrder (Action)
특정 오더와 연계된 생성 가능한 문서 목록을 조회합니다.

- **권한**: User
- **입력 파라미터**: `order_id: string`
- **반환값**: `DocumentInfo[]` (CI, PL 등 문서 유형 및 상태)
