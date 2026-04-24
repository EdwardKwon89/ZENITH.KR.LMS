import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * [FIN-02] 정산 데이터 엑셀 내보내기 Route Handler
 * WBS 3.2.4.1 ~ 3.2.4.2 대응
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const shipperId = searchParams.get("shipperId");

    const supabase = await createClient();
    
    // 1. 세션 및 프로필 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // 2. 쿼리 구성
    // RLS가 적용되어 있으므로 소속 조직 데이터만 조회됨 (ADMIN 제외)
    let query = supabase
      .from("zen_invoices")
      .select(`
        *,
        shipper:shipper_id(name)
      `)
      .order("created_at", { ascending: false });

    // 필터 적용
    if (status) {
      query = query.eq("status", status);
    }
    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00Z`);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59Z`);
    }
    
    // Admin/SuperAdmin은 특정 화주 필터링 가능
    const isAdmin = ['ADMIN', 'ZENITH_SUPER_ADMIN'].includes(profile.role);
    if (isAdmin && shipperId) {
      query = query.eq("shipper_id", shipperId);
    }

    const { data: invoices, error: queryError } = await query;

    if (queryError) {
      console.error("[FIN-02] Query Error:", queryError);
      return new NextResponse(`Data fetch error: ${queryError.message}`, { status: 500 });
    }

    // 3. 데이터 가공 (엑셀 행 데이터)
    const worksheetData = (invoices || []).map((inv: any) => ({
      "인보이스 번호": inv.invoice_no,
      "상태": inv.status,
      "화주명": inv.shipper?.name || inv.shipper_id,
      "총 금액": inv.total_amount,
      "결제 금액": inv.paid_amount,
      "통화": inv.currency,
      "지불 기한": inv.due_date,
      "생성 일시": new Date(inv.created_at).toLocaleString('ko-KR'),
    }));

    // 4. XLSX 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // 컬럼 너비 설정
    const wscols = [
      { wch: 20 }, // 인보이스 번호
      { wch: 10 }, // 상태
      { wch: 20 }, // 화주명
      { wch: 15 }, // 총 금액
      { wch: 15 }, // 결제 금액
      { wch: 8 },  // 통화
      { wch: 15 }, // 지불 기한
      { wch: 25 }, // 생성 일시
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "정산데이터");

    // 5. 바이너리 스트림 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `settlement_export_${dateStr}.xlsx`;

    // 6. 응답 반환
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${fileName}`,
        "Cache-Control": "no-store",
      },
    });

  } catch (error: any) {
    console.error("[FIN-02] Export Handler Panic:", error);
    return new NextResponse(`Server Error: ${error.message}`, { status: 500 });
  }
}
