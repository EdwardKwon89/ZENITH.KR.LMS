import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const D = "docs/99_Manual/UAT_18_Result";
const SB = createClient("http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!);
const OID = "9ccc82e5-5814-4764-9f69-07c3e5100ec0";

async function login(page: any, email: string) {
  await page.goto("/ko/logout");
  await page.goto("/ko/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "password1234");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/ko\//, { timeout: 15000 });
  await page.waitForTimeout(1000);
}

test.describe.serial("UAT-18", () => {
  test("UAT-18-01: WAREHOUSED→RELEASED + UPS label", async ({ page }) => {
    // Reset DB (delete old labels first to avoid unique constraint on reference_no)
    await SB.from("zen_ups_labels").delete().eq("order_id", OID);
    await SB.from("zen_orders").update({ status: "WAREHOUSED" }).eq("id", OID);
    await SB.from("zen_order_packages").update({ intl_ref_no: null, intl_ref_locked: false, intl_ref_issued_at: null }).eq("order_id", OID);

    await login(page, "manager@zenith.kr");
    await page.goto("/ko/warehouse/outbound");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${D}/01_outbound_list.png`, fullPage: true });

    await page.locator("text=UAT18-TEST-001").first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${D}/02_outbound_confirm.png`, fullPage: true });

    await page.locator('button:has-text("출고 확정")').click();
    await page.waitForTimeout(1000);

    // "계속 진행" 버튼 클릭 (intl_ref_no 없는 패키지 경고)
    await page.locator('button:has-text("계속 진행")').waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    const contBtn = page.locator('button:has-text("계속 진행")');
    if (await contBtn.isVisible().catch(() => false)) await contBtn.click();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${D}/03_ups_label_issued.png`, fullPage: true });

    // DB 검증
    const { data: order } = await SB.from("zen_orders").select("status").eq("id", OID).single();
    expect(order?.status).toBe("RELEASED");
    const { data: pkg } = await SB.from("zen_order_packages").select("intl_ref_no,intl_ref_locked").eq("order_id", OID).single();
    expect(pkg?.intl_ref_locked).toBe(true);
    expect(pkg?.intl_ref_no).toMatch(/^MOCK-/);
  });

  test("UAT-18-02a: RLS owner access", async ({ page }) => {
    await login(page, "manager@zenith.kr");
    await page.goto(`/ko/orders/${OID}`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${D}/04_rls_owner_view.png`, fullPage: true });
  });

  test("UAT-18-02b: RLS other shipper blocked", async ({ page }) => {
    await login(page, "agency_shipper@zenith.kr");
    await page.goto(`/ko/orders/${OID}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${D}/05_rls_blocked.png`, fullPage: true });
  });
});
