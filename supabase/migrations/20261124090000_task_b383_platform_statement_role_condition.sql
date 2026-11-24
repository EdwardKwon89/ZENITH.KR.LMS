-- ============================================================================
-- TASK-B-383 (Issue #1475, DEF-B-171): 청구서 조회 정책에 역할 조건 추가
--   플랫폼 조직이 발행한 청구서(헤더·항목)는 ADMIN·ZENITH_SUPER_ADMIN만 조회
--   (발행자 측 소속 역할 기준 — 수신자·감독 분기와 쓰기 정책은 변경 없음)
--
-- 설계: PR #1488 [설계 확정] 범위 — 기존 SELECT 정책 2개의 "발행자 일치" 분기
--   조건 수정만(새 정책·함수·서버 액션 변경 없음) · 역할 출처 DB 프로필 단일화.
--
-- 판정 조건(목표 상태):
--   허용 = 발행자 일치 AND (관리 역할 OR (조직 조회 성공 AND 발행 조직 유형 ≠ 플랫폼))
--   · 플랫폼 발행분: 관리 역할(ADMIN·ZENITH_SUPER_ADMIN)만 — 그 밖은 차단(fail-closed)
--   · 대리점 발행분: 역할 조건 없음(기존 동작)
--   · 수신자 분기·감독 분기: 변경 없음(우선)
--
-- 적용: supabase db push. 롤백은 하단 ROLLBACK 블록(기존 정책 원문) 사용.
-- 적용 후: NOTIFY pgrst, 'reload schema'
-- ============================================================================

-- 1) 헤더: 발행자 일치 분기에 관리 역할/비플랫폼 발행 조건 추가
DROP POLICY IF EXISTS bill_stmt_select_issuer ON public.zen_billing_statements;
CREATE POLICY bill_stmt_select_issuer ON public.zen_billing_statements
  FOR SELECT TO authenticated
  USING (
    issuer_org_id = ( SELECT zen_profiles.org_id
                        FROM zen_profiles
                       WHERE (zen_profiles.id = auth.uid()) )
    AND (
      ( SELECT zen_profiles.role
          FROM zen_profiles
         WHERE (zen_profiles.id = auth.uid()) ) IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
      OR EXISTS ( SELECT 1
                    FROM zen_organizations o
                   WHERE o.id = zen_billing_statements.issuer_org_id
                     AND o.type <> 'PLATFORM' )
    )
  );

-- 2) 항목: 동일 조건을 발행자 일치 분기에만 추가 (수신자·감독 분기 원문 유지)
DROP POLICY IF EXISTS bsi_select ON public.zen_billing_statement_items;
CREATE POLICY bsi_select ON public.zen_billing_statement_items
  FOR SELECT TO authenticated
  USING (
    EXISTS ( SELECT 1
               FROM zen_billing_statements s
              WHERE s.id = zen_billing_statement_items.statement_id
                AND (
                  ( s.issuer_org_id = ( SELECT zen_profiles.org_id
                                          FROM zen_profiles
                                         WHERE (zen_profiles.id = auth.uid()) )
                    AND (
                      ( SELECT zen_profiles.role
                          FROM zen_profiles
                         WHERE (zen_profiles.id = auth.uid()) ) IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
                      OR EXISTS ( SELECT 1
                                    FROM zen_organizations o
                                   WHERE o.id = s.issuer_org_id
                                     AND o.type <> 'PLATFORM' )
                    )
                  )
                  OR ( s.billed_org_id = ( SELECT zen_profiles.org_id
                                             FROM zen_profiles
                                            WHERE (zen_profiles.id = auth.uid()) )
                       AND s.status = ANY (ARRAY['ISSUED'::text, 'CLOSED'::text]) )
                  OR ( EXISTS ( SELECT 1
                                 FROM zen_profiles p
                                WHERE p.id = auth.uid()
                                  AND p.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text]) )
                       AND EXISTS ( SELECT 1
                                      FROM zen_organizations o
                                     WHERE o.id = s.issuer_org_id
                                       AND o.type = 'AGENCY'::text ) )
                )
           )
  );

-- 스키마 캐시 갱신 (PostgREST)
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK — 변경 전 정책 원문 복원 (주석 해제 후 실행. 원문은 본 파일에만 둔다)
-- ============================================================================
/*
-- ── b359 원본 소스 그대로 (20261119090000_task_b359_billing_statement_db.sql L427-433, L510-527) ──
DROP POLICY IF EXISTS bill_stmt_select_issuer ON public.zen_billing_statements;
CREATE POLICY bill_stmt_select_issuer ON public.zen_billing_statements
  FOR SELECT TO authenticated
  USING (
    issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS bsi_select ON public.zen_billing_statement_items;
CREATE POLICY bsi_select ON public.zen_billing_statement_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_billing_statements s
      WHERE s.id = statement_id
        AND (
          s.issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
          OR (s.billed_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
              AND s.status IN ('ISSUED', 'CLOSED'))
          OR (
            EXISTS (SELECT 1 FROM public.zen_profiles p
                    WHERE p.id = auth.uid() AND p.role IN ('ADMIN','ZENITH_SUPER_ADMIN'))
            AND EXISTS (SELECT 1 FROM public.zen_organizations o
                        WHERE o.id = s.issuer_org_id AND o.type = 'AGENCY')
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
*/
