export async function assertActiveUpsProduct(supabase: any, code: string): Promise<void> {
  const { data, error } = await supabase
    .from('zen_ups_products')
    .select('product_code')
    .eq('product_code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`UPS 상품 코드 검증 중 오류가 발생했습니다: ${error.message}`);
  }
  if (!data) {
    throw new Error(`존재하지 않거나 비활성화된 UPS 상품 코드입니다: ${code}`);
  }
}
