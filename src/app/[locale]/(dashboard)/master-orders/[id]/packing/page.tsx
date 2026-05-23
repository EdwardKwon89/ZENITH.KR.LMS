import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth/guards';
import { getMasterOrderWithHouses } from '@/app/actions/operations';

export default async function MasterPackingPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  await requireAuth();

  const master = await getMasterOrderWithHouses(params.id);
  const t = await getTranslations('MasterPacking');

  const houses = master.houses || [];
  const allItems = houses.flatMap((h: any) => {
    const pkgs = h.packages || [];
    return pkgs.flatMap((p: any) => {
      const items = p.items || [];
      return items.length > 0 ? items : [{ item_name: `Package #${p.packing_count || '?'}`, quantity: 1, weight: p.gross_weight || 0 }];
    });
  });

  const sumQty = allItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  const sumWeight = allItems.reduce((s: number, i: any) => s + ((i.weight || 0) * (i.quantity || 1)), 0);
  const sumCbm = houses.reduce((s: number, h: any) => {
    const pkgs = h.packages || [];
    return s + pkgs.reduce((sp: number, p: any) => sp + ((p.volume || 0) * (p.packing_count || 1)), 0);
  }, 0);

  const origin = master.origin_port as any;
  const dest = master.dest_port as any;
  const carrier = master.carrier as any;

  return (
    <div className="packing-page print-only">
      <style>{`
        @media print {
          @page { margin: 16mm 20mm; }
          body { font-family: 'Noto Sans KR', sans-serif; font-size: 10pt; color: #111; }
          .no-print { display: none !important; }
          .packing-page { display: block !important; max-width: none !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
        }
        @media screen {
          .packing-page { max-width: 1000px; margin: 24px auto; background: #fff; padding: 32px 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        }
        body { font-family: 'Noto Sans KR', sans-serif; background: #f8fafc; margin: 0; padding: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        th { background: #f1f5f9; font-weight: 700; padding: 8px 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; }
        td { padding: 6px 10px; border: 1px solid #e2e8f0; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { font-size: 20pt; font-weight: 900; margin: 0; color: #0f172a; }
        .header .sub { font-size: 8pt; color: #64748b; }
        .info-grid { display: flex; gap: 24px; margin-bottom: 24px; }
        .info-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; }
        .info-label { font-size: 7pt; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
        .info-value { font-size: 10pt; font-weight: 700; color: #0f172a; }
        .info-sub { font-size: 8pt; color: #334155; }
        .summary { display: flex; justify-content: flex-end; gap: 24px; margin-top: 20px; padding: 12px 16px; background: #f1f5f9; border: 1px solid #0f172a; border-radius: 8px; }
        .summary-item { text-align: right; }
        .summary-label { font-size: 7pt; color: #64748b; font-weight: 700; text-transform: uppercase; }
        .summary-value { font-size: 12pt; font-weight: 700; color: #0f172a; }
        .footer { text-align: center; font-size: 7pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 24px; }
        .section-title { font-size: 11pt; font-weight: 700; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; color: #0f172a; }
        .house-header { background: #eef2ff; font-weight: 700; }
        .no-print { margin-bottom: 16px; display: flex; gap: 8px; }
      `}</style>

      <div className="no-print">
        <button
          onClick={() => window.print()}
          style={{
            padding: '10px 24px',
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {t('print_btn') || '인쇄'}
        </button>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '10px 24px',
            background: '#e2e8f0',
            color: '#0f172a',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {t('back_btn') || '뒤로'}
        </button>
      </div>

      <div className="header">
        <div>
          <h1>{t('title') || 'PACKING LIST'}</h1>
          <div className="sub">{t('master_ref') || 'Master Ref'}: {master.master_no}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="sub">{t('issue_date') || '발행일'}</div>
          <div className="info-value" style={{ fontSize: 10 }}>{new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-box">
          <div className="info-label">{t('origin') || '출발지'}</div>
          <div className="info-value">{origin?.name || origin?.code || '-'}</div>
          {origin?.code && <div className="info-sub">{origin.code}</div>}
        </div>
        <div className="info-box">
          <div className="info-label">{t('destination') || '도착지'}</div>
          <div className="info-value">{dest?.name || dest?.code || '-'}</div>
          {dest?.code && <div className="info-sub">{dest.code}</div>}
        </div>
        <div className="info-box">
          <div className="info-label">{t('carrier') || '운송사'}</div>
          <div className="info-value">{carrier?.name || '-'}</div>
          {carrier?.iata_code && <div className="info-sub">{carrier.iata_code}</div>}
        </div>
        <div className="info-box">
          <div className="info-label">{t('vessel') || '항차'}</div>
          <div className="info-value">{master.vessel_flight_no || '-'}</div>
        </div>
      </div>

      {master.etd && (
        <div className="info-grid" style={{ marginTop: -12 }}>
          <div className="info-box">
            <div className="info-label">{t('etd') || 'ETD'}</div>
            <div className="info-value">{new Date(master.etd).toLocaleDateString()}</div>
          </div>
          {master.eta && (
            <div className="info-box">
              <div className="info-label">{t('eta') || 'ETA'}</div>
              <div className="info-value">{new Date(master.eta).toLocaleDateString()}</div>
            </div>
          )}
          <div className="info-box" />
          <div className="info-box" />
        </div>
      )}

      <div className="section-title">{t('house_list') || 'HOUSE ORDERS'}</div>

      {houses.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>{t('no_houses') || '연결된 하우스 오더가 없습니다.'}</p>
      ) : (
        houses.map((house: any, idx: number) => {
          const pkgs = house.packages || [];
          const items = pkgs.flatMap((p: any) => {
            const pItems = p.items || [];
            return pItems.length > 0
              ? pItems.map((i: any) => ({ ...i, pkg: p.packing_count || 1 }))
              : [{ item_name: `Package #${p.packing_count || '?'}`, quantity: 1, weight: p.gross_weight || 0, pkg: 1 }];
          });

          return (
            <div key={house.id} style={{ marginBottom: 16 }}>
              <div className="house-header" style={{ padding: '6px 10px', border: '1px solid #c7d2fe', borderRadius: '4px 4px 0 0', fontSize: 9 }}>
                #{idx + 1} · {house.order_no} · {house.shipper?.name || '-'}
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>{t('item_desc') || '품명'}</th>
                    <th style={{ width: '15%' }} className="text-center">{t('qty') || '수량'}</th>
                    <th style={{ width: '15%' }} className="text-right">{t('weight') || '중량(kg)'}</th>
                    <th style={{ width: '20%' }} className="text-right">{t('volume') || '용적(CBM)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, iIdx: number) => (
                    <tr key={iIdx}>
                      <td>{item.item_name}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{(item.weight || 0).toFixed(2)}</td>
                      <td className="text-right">{((item.volume || 0) * (item.quantity || 1)).toFixed(4)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td style={{ fontSize: 8 }}>{t('house_total') || '소계'}</td>
                    <td className="text-center">{items.reduce((s: number, i: any) => s + (i.quantity || 0), 0)}</td>
                    <td className="text-right">{items.reduce((s: number, i: any) => s + (i.weight || 0), 0).toFixed(2)}</td>
                    <td className="text-right">{items.reduce((s: number, i: any) => s + ((i.volume || 0) * (i.quantity || 1)), 0).toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })
      )}

      <div className="summary">
        <div className="summary-item">
          <div className="summary-label">{t('total_houses') || '총 House'}</div>
          <div className="summary-value">{houses.length}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">{t('total_qty') || '총 수량'}</div>
          <div className="summary-value">{sumQty}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">{t('total_weight') || '총 중량'}</div>
          <div className="summary-value">{sumWeight.toFixed(2)} kg</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">{t('total_volume') || '총 용적'}</div>
          <div className="summary-value">{sumCbm.toFixed(3)} CBM</div>
        </div>
      </div>

      {master.remarks && (
        <div style={{ marginTop: 16, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 8, color: '#374151' }}>
          <strong>{t('remarks') || '비고'}:</strong> {master.remarks}
        </div>
      )}

      <div className="footer">
        ZENITH LMS — {t('generated') || '생성일시'} {new Date().toLocaleString()}
      </div>
    </div>
  );
}
