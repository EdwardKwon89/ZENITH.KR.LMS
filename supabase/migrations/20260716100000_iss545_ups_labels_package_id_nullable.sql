-- Issue #545: zen_ups_labels.package_id nullable (오더 단위 createorder 전환)
-- 패키지 NOT NULL 제약 제거 — createorder 호출이 패키지 단위에서 오더 단위로 변경됨
-- reference_no UNIQUE 제약은 유지 (idx_ups_labels_reference_active)

ALTER TABLE public.zen_ups_labels ALTER COLUMN package_id DROP NOT NULL;
