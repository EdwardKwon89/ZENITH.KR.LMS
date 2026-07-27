import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getOrderDetails } from '@/app/actions/operations/orders';
import { getOrganizations, getPorts } from '@/app/actions/master';
import { OrderRegistrationForm } from '@/components/orders/OrderRegistrationForm';
import { requireAuth } from '@/lib/auth/guards';
import { isOrderEditable } from '@/lib/logistics/status-machine';
import type { OrderStatus } from '@/types/orders';

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ orderId: string; locale: string }>;
}) {
  await requireAuth();
  const { orderId } = await params;

  const rawOrder = await getOrderDetails(orderId);
  if (!rawOrder) redirect('/orders');

  if (!isOrderEditable(rawOrder.status as OrderStatus)) {
    redirect(`/orders/${orderId}`);
  }

  const order: any = rawOrder;

  const t = await getTranslations('Orders');
  const navT = await getTranslations('Navigation');

  const [dataShippers, dataPorts] = await Promise.all([
    getOrganizations(),
    getPorts(),
  ]);

  const shippers = dataShippers ?? [];
  const ports = dataPorts ?? [];

  const defaultValues = {
    order_type: order.order_type,
    shipper_id: order.shipper_id,
    origin_port_id: order.origin_port_id,
    dest_port_id: order.dest_port_id,
    description: order.description ?? '',
    shipper_contact_name: order.shipper_contact_name ?? '',
    shipper_contact_phone: order.shipper_contact_phone ?? '',
    shipper_contact_email: order.shipper_contact_email ?? '',
    shipper_address: order.shipper_address ?? '',
    shipper_country_code: order.shipper_country_code ?? 'KR',
    shipper_state_province: order.shipper_state_province ?? '',
    shipper_city: order.shipper_city ?? '',
    shipper_address_detail: order.shipper_address_detail ?? '',
    shipper_zipcode: order.shipper_zipcode ?? '',
    shipper_biz_no: order.shipper_biz_no ?? '',
    recipient_name: order.recipient_name ?? '',
    recipient_address: order.recipient_address ?? '',
    recipient_address_local: order.recipient_address_local ?? '',
    recipient_address_detail: order.recipient_address_detail ?? '',
    recipient_phone: order.recipient_phone ?? '',
    recipient_zipcode: order.recipient_zipcode ?? '',
    recipient_country_code: order.recipient_country_code ?? '',
    recipient_state_province: order.recipient_state_province ?? '',
    recipient_city: order.recipient_city ?? '',
    recipient_pccc: order.recipient_pccc ?? '',
    recipient_email: order.recipient_email ?? '',
    delivery_notes: order.delivery_notes ?? '',
    transport_mode: order.transport_mode,
    estimated_cost: order.estimated_cost ?? 0,
    delivery_method: order.delivery_method ?? 'DIRECT',
    pickup_location: order.pickup_location ?? '',
    pickup_contact_name: order.pickup_contact_name ?? '',
    pickup_contact_tel: order.pickup_contact_tel ?? '',
    ups_product_code: (order as any).ups_product_code ?? '',
    incoterms: (order as any).incoterms ?? 'DDP',
    ups_service_family: (order as any).ups_service_family ?? undefined,
    packages: (order.packages ?? []).map((pkg: any) => ({
      packing_unit: pkg.packing_unit,
      packing_count: pkg.packing_count,
      physical_box_count: pkg.physical_box_count ?? 1,
      length: pkg.length ?? 0,
      width: pkg.width ?? 0,
      height: pkg.height ?? 0,
      gross_weight: pkg.gross_weight ?? 0,
      volume: pkg.volume ?? undefined,
      special_cargo_type: pkg.special_cargo_type ?? 'NONE',
      content_type: pkg.content_type ?? 'GENERAL',
      domestic_ref_no: pkg.domestic_ref_no ?? '',
      items: (pkg.items ?? []).map((item: any) => ({
        item_name: item.item_name ?? '',
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? 0,
        currency: item.currency ?? 'USD',
        hs_code: item.hs_code ?? '',
        item_packing_unit: item.item_packing_unit ?? 'EA',
      })),
    })),
  };

  return (
    <div className="relative min-h-screen animate-in fade-in duration-500">
      <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-slate-100 px-8 py-3 mb-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/orders/${orderId}`}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:shadow-sm transition-all text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                {t('title_edit') ?? 'Edit Order'}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 ml-3.5">
                {navT('order_mgmt')} — {order.order_no}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8">
        <OrderRegistrationForm
          shippers={shippers}
          ports={ports}
          orderId={orderId}
          defaultValues={defaultValues}
        />
      </div>
    </div>
  );
}
