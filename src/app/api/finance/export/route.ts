import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { USER_ROLES } from "@/lib/auth/rbac";
import { formatErrorResponse } from "@/lib/errors";

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
      .from("zen_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[FIN-02] Profile Error:", profileError);
      return new NextResponse(`Forbidden: ${profileError?.message || 'Profile not found'}`, { status: 403 });
    }

    // 2. 쿼리 구성
    let query = supabase
      .from("zen_invoices")
      .select(`
        *,
        shipper:shipper_id(name)
      `)
      .order("created_at", { ascending: false });

    // 필터 적용
    if (status) query = query.eq("status", status);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00Z`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59Z`);
    
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.ZENITH_SUPER_ADMIN].includes(profile.role);
    if (isAdmin && shipperId) {
      query = query.eq("shipper_id", shipperId);
    }

    const { data: invoices, error: queryError } = await query;

    if (queryError) {
      console.error("[FIN-02] Query Error:", queryError);
      return new NextResponse(`Data fetch error: ${queryError.message}`, { status: 500 });
    }

    return generateExcelResponse(invoices || [], "export");

  } catch (error: unknown) {
    console.error("[FIN-02] Export Handler Panic:", error);
    const err = formatErrorResponse(error);
    return new NextResponse(err.message, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, filename } = body;

    if (!data || !Array.isArray(data)) {
      console.error("[FIN-02] Invalid POST data:", body);
      return new NextResponse("Invalid data format", { status: 400 });
    }

    console.log(`[FIN-02] POST Payload - Data rows: ${data.length}, Filename: ${filename}`);
    if (data.length > 0) {
      console.log(`[FIN-02] First row sample:`, JSON.stringify(data[0]).substring(0, 200));
    }

    return generateExcelResponse(data, filename || "export");

  } catch (error: unknown) {
    console.error("[FIN-02] Export POST Handler Panic:", error);
    const err = formatErrorResponse(error);
    return new NextResponse(err.message, { status: 500 });
  }
}

function generateExcelResponse(data: any[], filename: string) {
  try {
    console.log(`[FIN-02] Generating Excel for ${data.length} rows, filename: ${filename}`);
    
    // 3. 데이터 가공
    const worksheetData = data.map((inv: any, idx: number) => {
      try {
        return {
          "인보이스 번호": inv.invoice_no || "N/A",
          "상태": inv.status || "N/A",
          "화주명": inv.shipper?.name || inv.shipper_id || "N/A",
          "총 금액": inv.total_amount || 0,
          "결제 금액": inv.paid_amount || 0,
          "통화": inv.currency || "USD",
          "지불 기한": inv.due_date || "N/A",
          "생성 일시": inv.created_at ? new Date(inv.created_at).toLocaleString('ko-KR') : "N/A",
        };
      } catch (e) {
        console.error(`[FIN-02] Error processing row ${idx}:`, e);
        return { "Error": "Row processing failed" };
      }
    });

    console.log("[FIN-02] Worksheet data prepared");

    // 4. XLSX 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    const wscols = [
      { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 25 },
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "정산데이터");

    console.log("[FIN-02] Workbook created");

    // 5. 바이너리 데이터 생성
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    console.log("[FIN-02] Buffer generated, size:", buf?.length);
  
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${filename}.xlsx`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[FIN-02] generateExcelResponse Error:", error);
    throw error;
  }
}
