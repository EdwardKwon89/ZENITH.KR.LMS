---
name: 조직 계층 구조 설계 누락
description: 초기 organizations 테이블 설계 시 본사-지사 계층 구조 요구사항 반영 누락
category: Design
severity: MEDIUM
date: 2026-04-17
author: Antigravity
---

## 현상 (What)

고객 요구사항 정의 및 기초 스키마 설계 단계에서 조직(Organizations) 간의 계층적 관계(본사-지사)를 고려하지 않은 단순 플랫(flat) 구조로 설계를 진행함. 이후 사용자 피드백을 통해 계층 구조 필요성이 인지됨.

**발생 위치:** [init_schema.sql](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/04_Database/init_schema.sql) 초기 버전 설계

## 원인 (Why)

### 직접적 원인
물류 플랫폼의 복잡한 비즈니스 엔티티(법인-지점) 관계에 대한 명시적 확인 없이 일반적인 조직 테이블 구조를 적용함.

### 근본 원인
**도메인 심층 분석 부족**: SNTL 통합 물류 플랫폼의 특성상 해외 지사 및 다국적 법인이 연계됨을 고려해야 함에도 불구하고, 초기 설계 시 "공통 사항"으로 간주하여 구체적 관계 설정을 누락함.

### 기여 요소
- 초기 오픈 질문 시 "조직 구조"에 대한 구체적 질문 누락.
- WBS의 "Organizations 테이블 설계" 항목을 단순 엔티티 생성으로 해석함.

## 조치 (How)

### 수정 전
```sql
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY,
    org_name_ko VARCHAR(200),
    -- 계층 구조 필드 없음
);
```

### 수정 후
```sql
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY,
    parent_id UUID REFERENCES public.organizations(id), -- 계층 구조 추가
    -- ...
);
```

### 수정 범위
- [x] 해당 테이블 수정
- [ ] 유사 테이블 전파 (현재 해당사항 없음)
- [ ] 테스트 코드 추가
- [x] 문서 업데이트 (체크리스트 반영)

## 검증 (Verification)

### 테스트
SQL Editor에서 `parent_id`를 통한 자가 참조(Self-Join)가 정상적으로 작동하며, 지사 삭제 시 `ON DELETE SET NULL` 정책이 올바르게 적용됨을 확인.

## 예방 (Prevention)

### Check List에 추가할 항목
```
□ Architecture: 조직, 장소 등 관계형 데이터 설계 시 계층(Hierarchy) 구조 필요성 필수 확인 (SAR-002)
□ Analysis: 도메인 엔티티의 "그룹화" 및 "상속" 관계 여부를 설계 초기에 명문화 (SAR-002)
```

### 설계 개선
- 설계 템플릿에 "Entity Relationship: Hierarchy/Recursive Reference" 항목 추가.
