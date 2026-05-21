# TASK-041 — dissolveMasterOrder 부분 실패 위험 수정

| 항목 | 내용 |
|:---|:---|
| Task-ID | TASK-041 |
| IMP-ID | IMP-052 |
| 생성일 | 2026-05-21 |
| 담당 Agent | Riley (Gemini) |
| 우선순위 | P2 |
| 전제조건 | IMP-047 ✅ 완료 → 즉시 착수 가능 |
| 상태 | ✅ 완료 |
| 파급 효과 | 없음 |

---

## 배경

`dissolveMasterOrder()` 함수가 다수의 House Order를 일괄 해체 시 단일 `.update().eq("master_order_id", masterId)` 쿼리를 사용한다.
Supabase JS 클라이언트의 bulk update는 부분 실패 감지가 불가능하여, 일부 row만 업데이트되는 데이터 불일치 위험이 있다.

- **현재 코드**: `src/app/actions/orders.ts` — `dissolveMasterOrder()` 내 순차 쿼리 무보호 상태
- **위험 시나리오**: 네트워크 단절 또는 DB 오류 시 일부 House Order는 해체되고 나머지는 마스터 참조 유지 → 데이터 정합성 파괴

참조: `scratch/post_launch_improvements.md §IMP-052`

---

## 작업 지시

1. **본 파일 상태 → 📝, ACTIVE_TASK.md TASK-041 → 📝 동시 반영 후 Aiden 승인 시 🔄로 변경**
2. `gitnexus_impact({target: "dissolveMasterOrder", direction: "upstream"})` — 영향 범위 확인, HIGH/CRITICAL 시 Aiden 보고 후 대기
3. **구현 방안 (권장: 방식 A)**
   - **방식 A (권장)**: Supabase RPC `dissolve_master_order_atomic(p_master_order_id UUID)` 신규 작성
     - 트랜잭션 내에서 모든 House Order의 `master_order_id = NULL` 처리
     - `zen_master_order_history`에 해체 이력 INSERT (IMP-051에서 이미 생성된 테이블 활용)
     - 실패 시 전체 롤백
   - **방식 B**: 개별 House Order 순차 업데이트 + 실패 감지 후 수동 롤백 (방식 A 구현 어려울 경우)
4. Supabase 마이그레이션 파일 작성 (`supabase/migrations/YYYYMMDDHHMMSS_imp052_dissolve_master_atomic.sql`)
5. `dissolveMasterOrder()` — 신규 RPC 호출로 교체
6. 회귀 테스트 전체 PASS: `rtk npm run test:regression`
7. 결과 저장: `docs/08_Self_Audit/Regression_Results/REGRESSION_2026-05-21_TASK-041.log`
8. **코드 커밋**: `[Gemini] fix: IMP-052 dissolveMasterOrder 원자적 RPC 래핑`
9. **본 파일 [작업 결과] 섹션 작성 + 상태 → 🔔** (커밋 해시 반드시 기재)
10. **ACTIVE_TASK.md TASK-041 → 🔔 반영**
11. **`scratch/IMP_PROGRESS.md` IMP-052 행 🔔 갱신**
12. **문서 커밋**: `[Gemini] docs: TASK-041 완료 보고 — task file 🔔`

---

## 완료 기준 (DoD)

- [x] `dissolveMasterOrder()` 트랜잭션 래핑 완료 (RPC 또는 명시적 롤백)
- [x] Supabase 마이그레이션 파일 커밋 포함
- [x] 구현 방식 선택 근거 본 파일 [작업 결과]에 명시
- [x] `gitnexus_impact` 결과 기록
- [x] 회귀 테스트 전체 PASS 증적 (`docs/08_Self_Audit/Regression_Results/`)
- [x] `[Gemini] fix: IMP-052` 코드 커밋 완료 (해시 기재)
- [x] `[Gemini] docs: TASK-041` 문서 커밋 완료
- [x] 본 파일 상태 🔔 + ACTIVE_TASK.md 동기화
- [x] `scratch/IMP_PROGRESS.md` IMP-052 행 갱신

---

## 설계 의견 (Agent 작성)

### 1. 현행 감사 이력 테이블(zen_master_order_history)과 삭제(DELETE) 로직의 모순점
- `zen_master_order_history.master_order_id` 외래키는 `zen_master_orders(id) ON DELETE CASCADE` 제약조건이 걸려 있습니다.
- 오더 해체(`dissolve`) 시 마스터 오더를 데이터베이스에서 물리적으로 `DELETE` 하므로, 해체 이력을 삽입하더라도 외래키 제약조건에 따라 해당 이력이 연쇄 삭제됩니다. 결과적으로 감사 이력이 전혀 남지 않게 됩니다.

### 2. 해결 방안 (대안 A 제안)
- 감사 이력 유실을 막기 위해 **외래키 참조 관계를 `ON DELETE SET NULL`로 변경**하고, 마스터 오더 정보를 보존할 수 있도록 **`master_no` 텍스트 필드를 이력 테이블에 추가**하는 신규 마이그레이션을 이번 작업에 포함하여 진행하고자 합니다.
- **마이그레이션 구문 예시**:
  ```sql
  -- 1. FK 제약 조건 변경
  ALTER TABLE public.zen_master_order_history 
    DROP CONSTRAINT IF EXISTS zen_master_order_history_master_order_id_fkey;
  
  ALTER TABLE public.zen_master_order_history
    ADD CONSTRAINT zen_master_order_history_master_order_id_fkey 
    FOREIGN KEY (master_order_id) REFERENCES public.zen_master_orders(id) ON DELETE SET NULL;
    
  ALTER TABLE public.zen_master_order_history 
    ALTER COLUMN master_order_id DROP NOT NULL;

  -- 2. 백업용 master_no 컬럼 추가
  ALTER TABLE public.zen_master_order_history
    ADD COLUMN IF NOT EXISTS master_no VARCHAR(50);
  ```

### 3. RPC `dissolve_master_order_atomic` 구현안
- 매개변수: `p_master_order_id UUID`, `p_user_id UUID`
- 트랜잭션 흐름:
  1. `zen_master_orders`에서 `master_no`를 조회 및 행 잠금(`FOR UPDATE`).
  2. `zen_orders`에서 소속 하우스 오더들의 `master_order_id = NULL`, `status = 'REGISTERED'` 일괄 업데이트.
  3. `zen_master_order_history`에 해체 이력(`prev_status = 'MASTERED'`, `next_status = 'DISSOLVED'`, `reason = 'Master order dissolved'`, `master_no = v_master_no`) 삽입.
  4. `zen_master_orders`에서 `id = p_master_order_id` 삭제.

---

## 설계 확정 (Aiden 작성)

| 항목 | 내용 |
|:---|:---|
| 확정 방안 | **방안 A (Riley 수정안 포함) 확정** |
| 수정·보완 사항 | ① **ON DELETE CASCADE 버그 수정 필수**: `zen_master_order_history.master_order_id` FK를 `ON DELETE SET NULL`로 변경 + `master_no VARCHAR(50)` 컬럼 추가 — dissolve 후 이력 보존 목적. 이 마이그레이션을 RPC 마이그레이션과 같은 SQL 파일에 묶어도 무방 ② **RPC 구현 순서 확정**: `FOR UPDATE` 잠금 → House Order `master_order_id = NULL` 일괄 업데이트 → 이력 INSERT (master_no 포함) → 마스터 오더 DELETE 순 ③ **user_id 파라미터**: `p_user_id UUID` 포함하여 이력 `changed_by` 기록 |
| 착수 승인 | ✅ 즉시 착수 — 마이그레이션 SQL 1개(FK 변경 + master_no 컬럼 + RPC 함수 통합 가능) |

---

## 작업 결과

> **이 섹션은 착수 후 Riley가 작성합니다.**

| 항목 | 내용 |
|:---|:---|
| 착수일 | 2026-05-21 |
| 완료일 | 2026-05-21 |
| 구현 방식 | Supabase RPC `dissolve_master_order_atomic`을 호출하여 원자적 마스터 해체 트랜잭션 수행 (ON DELETE SET NULL을 통해 감사 이력 유실 방지) |
| gitnexus_impact 결과 | 10 files, 11 symbols, 5 affected processes (Medium Risk) |
| 회귀 결과 | 209/209 PASS (REGRESSION_2026-05-21_TASK-041.log) |
| 코드 커밋 해시 | b4b2f9f49579c513e1bb346a54d840a2084afffa |
| 문서 커밋 해시 | [문서 커밋 완료 후 업데이트 예정] |

---

## Aiden 검토

| 항목 | 내용 |
|:---|:---|
| 검토일 | 2026-05-21 |
| 검토 결과 | **✅ PASS** |
| 코드 확인 | ON DELETE CASCADE→SET NULL ✅ · `master_no VARCHAR(50)` 컬럼 추가 ✅ · `dissolve_master_order_atomic` RPC: FOR UPDATE 잠금→일괄 UPDATE→이력 INSERT(master_no 포함)→DELETE 순 ✅ · `p_user_id`→`changed_by` 기록 ✅ · `orderRepo.dissolveMasterOrderAtomic()` 호출로 교체 ✅ |
| 회귀 확인 | 209/209 PASS ✅ (`b4b2f9f` 실증) |
| Advisory | ① TASK-042/043 동일 코드 커밋 번들(`b4b2f9f`) — 동일 sprint·동일 날짜 허용 ② 문서 커밋 해시 자기참조 구조적 한계 인정(`c39bc5c` 실존 확인) ③ 개정이력 Riley 완료 entry 누락 Advisory |
| 최종 판정 | IMP-052 완료 ✅ · TASK-041 ✅ 승인 |

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:-----|
| 2026-05-21 | Aiden (Claude) | Task 생성 — Sprint H-II 작업 지시 발령 |
| 2026-05-21 | Aiden (Claude) | 설계 확정 — 방안 A(수정안) 확정·ON DELETE SET NULL 마이그레이션 필수·착수 승인 🔄 |
| 2026-05-21 | Riley (Gemini) | 구현 완료 — `dissolve_master_order_atomic` RPC·FK SET NULL·master_no 컬럼. 209/209 ✅. 코드 `b4b2f9f`·문서 `c39bc5c`. 🔔 |
| 2026-05-21 | Aiden (Claude) | ✅ PASS 승인 — RPC·FK·master_no 설계 요건 전량 확인. IMP-052 완료 |
