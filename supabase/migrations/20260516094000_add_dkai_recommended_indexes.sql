-- Migration: D_Kai recommended indexes — IMP-055-BK-SUP
-- Task ID: IMP-055-BK-SUP
-- Created At: 2026-05-16 09:40:00
-- Reason: D_Kai ANA-IMP-DK-E 분석 기반 추가 인덱스 4종
--         IMP-055-BK(자체 판단 4종)와 별개의 보완 세트
--         zen_invoices_lookup은 기존 idx_zen_invoices_shipper_id와 공존 가능
--         (단일 컬럼 vs 복합 인덱스 — 서로 다른 쿼리 패턴 커버)

-- 1. zen_profiles(org_id) — 알림 발송·조직 사용자 조회 Full Scan 방지
CREATE INDEX IF NOT EXISTS idx_zen_profiles_org_id ON public.zen_profiles(org_id);

-- 2. zen_voc(order_id, org_id, status) — VOC 목록 복합 조건 최적화
CREATE INDEX IF NOT EXISTS idx_zen_voc_lookup ON public.zen_voc(order_id, org_id, status);

-- 3. zen_qna(org_id, status) — QnA 목록 복합 조건 최적화
CREATE INDEX IF NOT EXISTS idx_zen_qna_lookup ON public.zen_qna(org_id, status);

-- 4. zen_invoices(shipper_id, status, created_at DESC) — 정산 복합 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_zen_invoices_lookup ON public.zen_invoices(shipper_id, status, created_at DESC);
