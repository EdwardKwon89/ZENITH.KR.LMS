-- TASK-B-399 (Issue #1566): 발송인 회사명(shipper_company) 컬럼 추가
-- JSJung 결정(2026-11-27)·Aiden [설계 확정]: 내 정보 사용 = NULL(화주명 결정값 전송),
-- 수기 입력 = 입력 원문 저장. 값 유무로 모드를 추론하므로 별도 모드 컬럼은 두지 않는다.
-- 기존 행은 백필하지 않는다(NULL = 자동 모드). RLS는 zen_orders 테이블 정책을 상속한다.

ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS shipper_company text;

COMMENT ON COLUMN public.zen_orders.shipper_company IS '발송인 회사명 (NULL=내 정보 사용, 값=수기 입력 원문; SHXK shipper.shipper_company 매핑)';

-- ROLLBACK (주석 해제 후 수동 실행 — 앱을 먼저 이전 버전으로 되돌릴 것)
--   ALTER TABLE public.zen_orders DROP COLUMN IF EXISTS shipper_company;
-- Aiden [설계 확정]: 컬럼 잔존 허용(데이터 보존 우선). 백필이 없으므로 잔존해도 기존 동작에 영향 없음.
