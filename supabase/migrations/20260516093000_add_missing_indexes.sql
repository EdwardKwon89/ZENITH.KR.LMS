-- Migration: Add missing indexes for query performance
-- Task ID: IMP-055-BK
-- Created At: 2026-05-16 09:30:00
-- Reason: 누락된 인덱스 4종 추가 — 주요 조회/필터 컬럼 성능 개선
--         zen_order_costs.invoice_id는 IMP-044-BK에서 기추가 — 중복 제외

-- 1. zen_orders.shipper_id — RLS 필터 + 역할별 조회 (dashboard, orders)
CREATE INDEX IF NOT EXISTS idx_zen_orders_shipper_id ON public.zen_orders(shipper_id);

-- 2. zen_orders.status — 상태별 집계/필터 (dashboard, orders listing)
CREATE INDEX IF NOT EXISTS idx_zen_orders_status ON public.zen_orders(status);

-- 3. zen_invoices.shipper_id — RLS 필터 + 정산 조회 (finance, settlement)
CREATE INDEX IF NOT EXISTS idx_zen_invoices_shipper_id ON public.zen_invoices(shipper_id);

-- 4. zen_order_costs.order_id — FK 조인 성능 (finance, settlement engine)
CREATE INDEX IF NOT EXISTS idx_zen_order_costs_order_id ON public.zen_order_costs(order_id);
