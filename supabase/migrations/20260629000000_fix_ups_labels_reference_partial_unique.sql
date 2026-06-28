-- DEF-083: idx_ups_labels_reference 전역 UNIQUE → partial UNIQUE
-- is_voided = false 인 레코드만 UNIQUE 제약 적용
-- 재발급 시 void 처리된 레코드와 동일 reference_no 사용 가능

DROP INDEX IF EXISTS "public"."idx_ups_labels_reference";

CREATE UNIQUE INDEX "idx_ups_labels_reference_active"
  ON "public"."zen_ups_labels" ("reference_no")
  WHERE "is_voided" = false;
