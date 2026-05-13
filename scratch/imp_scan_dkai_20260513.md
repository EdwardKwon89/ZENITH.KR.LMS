# EXP-IMP-DK: D_Kai (DeepSeek V4 Flash) — 전체 코드베이스 IMP 도출

> **수행 주체**: D_Kai (OpenCode / DeepSeek V4 Flash)
> **도구**: GitNexus 쿼리 + 파일 분석
> **일시**: 2026-05-13
> **중복 방지**: `scratch/post_launch_improvements.md` IMP-001~011 확인 완료 — 전 항목과 중복 없음

---

## [IMP-012] Master/Admin 코드 관리 페이지 완전 중복

- **발견 경위**: GitNexus 분석 중 `master/codes/`와 `admin/codes/` 경로에서 동일한 `codes-client.tsx` 파일 발견
- **현재 상태**: 아래 두 파일이 **완전히 동일함** (MD5 해시 일치):
  - `src/app/[locale]/(dashboard)/master/codes/codes-client.tsx`
  - `src/app/[locale]/(dashboard)/admin/codes/codes-client.tsx`
- **임시 조치**: 없음 (중복 상태로 운영 중)
- **근본 문제**: 동일 UI를 두 경로에 복사하여 유지보수 시 2중 수정 필요. 한쪽만 수정 시 기능 불일치 발생.
- **목표 구현**:
  1. 공통 코드 관리 컴포넌트를 `src/components/admin/`로 추출
  2. `master/codes/`와 `admin/codes/`에서 공통 컴포넌트 임포트
  3. 기존 두 파일은 얇은 wrapper로 축소
- **관련 파일**: `src/app/[locale]/(dashboard)/master/codes/codes-client.tsx`, `src/app/[locale]/(dashboard)/admin/codes/codes-client.tsx`
- **예상 공수**: 0.5 MD
- **우선순위**: Medium (기능 영향 없으나 유지보수 부채)

---

## [IMP-013] console.log/console.error 직접 사용 — 로깅 유틸리티 미적용

- **발견 경위**: GitNexus 분석 중 `src/` 전역 검색으로 `console.log` 및 `console.error` 사용 확인
- **현재 상태**: `grep -r "console\." src/ --include="*.ts" --include="*.tsx" -l` 결과 **53개 파일**에서 `console.log` 또는 `console.error` 직접 호출 확인
- **임시 조치**: 없음 (콘솔 출력은 보이지만 수집·분석 불가)
- **근본 문제**: 프로덕션 환경에서 console.log는 무시됨. 오류 추적, 로그 레벨 제어, 구조화된 로깅 불가.
- **목표 구현**:
  1. `src/lib/logger.ts` 신규 생성 (레벨 제어: debug/info/warn/error)
  2. 개발/프로덕션 분기 (NODE_ENV 또는 NEXT_PUBLIC_LOG_LEVEL)
  3. 53개 파일의 `console.*` 호출을 `logger.*`로 교체
- **관련 파일**: 53개 파일 + `src/lib/logger.ts` (신규)
- **예상 공수**: 2~3 MD
- **우선순위**: High (프로덕션 운영 품질, 디버깅 효율 직결)

---

## [IMP-014] admin/rates/page.tsx 단일 파일 531줄 — 복잡도 집중

- **발견 경위**: GitNexus 분석 중 `admin/rates/page.tsx`의 파일 크기 및 구조 확인 (531줄)
- **현재 상태**: `src/app/[locale]/(dashboard)/admin/rates/page.tsx`가 **531줄** 단일 파일로 다음을 모두 포함:
  - 요율 등록 폼
  - 요율 목록 테이블
  - 할증 편집기(SurchargeEditor)
  - 역할별 UI 분기 로직
  - 상태 관리
  - (참고: ZEN_A4 800~1,000줄 기준은 충족하나, 다수 관심사 혼재로 인한 복잡도가 문제)
- **임시 조치**: 없음 (증상 진행 중)
- **근본 문제**: 등록 폼·목록 테이블·할증 편집기·역할 분기·상태 관리 등 **5개 관심사가 단일 파일에 집중**되어 테스트 용이성 저하 및 유지보수 어려움. 단위 테스트 작성 시 목(mock) 설정이 과도하게 복잡해짐.
- **목표 구현**:
  1. `src/components/admin/rates/RateForm.tsx` — 등록 폼 분리
  2. `src/components/admin/rates/RateList.tsx` — 목록 테이블 분리 (기존 `RateCardList` 통합)
  3. `src/components/admin/rates/RateSurchargeEditor.tsx` — 할증 편집기 분리 (기존 `SurchargeEditor` 통합)
  4. `page.tsx`는 얇은 컨테이너로 축소
- **관련 파일**: `src/app/[locale]/(dashboard)/admin/rates/page.tsx`, `src/components/admin/SurchargeEditor.tsx`, `src/components/admin/RateCardList.tsx`
- **예상 공수**: 1~1.5 MD
- **우선순위**: Low (현재 동작 정상, 유지보수 편의성)

---

## IMP 항목 요약

| IMP | 내용 | 우선순위 | 예상 공수 | 관련 파일 |
|:---|:---|:---:|:---:|:---|
| **IMP-012** | Master/Admin 코드 페이지 중복 | Medium | 0.5 MD | 2개 파일 |
| **IMP-013** | console.log 직접 사용 (53개 파일) | **High** | **2~3 MD** | 53개 파일 + 신규 |
| **IMP-014** | admin/rates 531줄 복잡도 집중 | Low | 1~1.5 MD | 3개 파일 |

> 최소 3건 IMP 도출 완료 (R-15 형식 준수)

---

## Aiden 검토 의견

> **판정**: ⚠️ **CONDITIONAL PASS**
> **검증 주체**: Aiden (Claude) | **판정일**: 2026-05-13

### ✅ 채택 항목

| IMP | 내용 | 사실 확인 | 조치 |
|:----|:----|:--------:|:-----|
| IMP-012 | Master/Admin codes-client.tsx 완전 중복 | ✅ MD5 해시 `627ef8fd1775930c5b44eef71111a5dd` 일치 확인 | 원안 채택 |
| IMP-013 | console.log/error 직접 사용 | ⚠️ 수정 채택 (W-1 참조) | 수정 후 채택 |
| IMP-014 | admin/rates 단일 파일 비대화 | ⚠️ 수정 채택 (W-2 참조) | 수정 후 채택 |

### ⚠️ 위반 사항 (Warnings)

**W-1 | IMP-013 파일 수 과소 보고**
- **보고**: "최소 10개 파일"
- **실측**: `grep -r "console\." src/ --include="*.ts" --include="*.tsx" -l` 결과 **53개 파일** (5배 이상 과소)
- **영향**: 우선순위 및 공수 재산정 필요
- **수정 권고**: 우선순위 `Medium → High`, 예상 공수 `1 MD → 2~3 MD` 상향

**W-2 | IMP-014 ZEN_A4 위반 근거 오류**
- **보고**: "ZEN_A4 파일 분리 전략 위반"
- **실제 기준**: ZEN_A4는 **800~1,000줄 이하**가 권고 — 531줄은 기준 **이내**로 규칙 위반이 아님
- **수정 권고**: 근거를 "복잡도 집중(다수 관심사를 단일 파일에 혼재)으로 인한 테스트 용이성 저하"로 변경하여 재기술

### 📋 CONDITIONAL PASS 조건

1. IMP-013 파일 수를 실측값(53개)으로 수정, 우선순위/공수 갱신
2. IMP-014 위반 근거를 복잡도 기반으로 재기술
3. `scratch/post_launch_improvements.md`에 IMP-012~014 등록

> W-1·2 조치 후 `scratch/post_launch_improvements.md` 반영 시 최종 PASS 처리 가능
