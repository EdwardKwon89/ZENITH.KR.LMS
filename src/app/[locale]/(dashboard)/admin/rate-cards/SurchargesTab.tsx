'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createSurcharge, updateSurcharge, deleteSurcharge, getSurcharges } from '@/app/actions/admin/surcharges';
import { Trash2, Plus, Save, X } from 'lucide-react';

interface Carrier {
  id: string;
  code: string;
  name: string;
  transport_mode: string;
}

interface Surcharge {
  id: string;
  carrier_id: string;
  surcharge_type: string;
  transport_mode: string;
  rate_type: string;
  amount: number;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  carrier?: { code: string; name: string; transport_mode: string } | null;
}

const TRANSPORT_MODES = ['AIR', 'SEA', 'LAND', 'EXP'] as const;
const RATE_TYPES = ['FLAT', 'PERCENT', 'PER_KG'] as const;
const SURCHARGE_TYPES = ['FSC', 'SSC', 'THC', 'ODF', 'BAF', 'CAF', 'PSS', 'WRS', 'DEM', 'DET'] as const;

export function SurchargesTab() {
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    carrier_id: '',
    surcharge_type: 'FSC' as string,
    transport_mode: 'AIR' as string,
    rate_type: 'FLAT' as string,
    amount: 0,
    currency: 'USD',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
  });

  const fetchSurcharges = useCallback(async () => {
    try {
      const data = await getSurcharges();
      setSurcharges(data as unknown as Surcharge[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('zen_carriers').select('id, code, name, transport_mode').eq('is_active', true).then(({ data }) => {
      if (data) setCarriers(data as unknown as Carrier[]);
    });
    fetchSurcharges();
  }, [fetchSurcharges]);

  const resetForm = () => {
    setFormData({
      carrier_id: '',
      surcharge_type: 'FSC',
      transport_mode: 'AIR',
      rate_type: 'FLAT',
      amount: 0,
      currency: 'USD',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (s: Surcharge) => {
    setFormData({
      carrier_id: s.carrier_id,
      surcharge_type: s.surcharge_type,
      transport_mode: s.transport_mode,
      rate_type: s.rate_type,
      amount: s.amount,
      currency: s.currency,
      valid_from: s.valid_from.split('T')[0],
      valid_until: s.valid_until ? s.valid_until.split('T')[0] : '',
    });
    setEditingId(s.id);
    setShowForm(true);
    setError('');
  };

  const handleSave = async () => {
    if (!formData.carrier_id || !formData.valid_from || !formData.amount) {
      setError('Carrier, Valid From, and Amount are required.');
      return;
    }

    const payload = {
      ...formData,
      valid_until: formData.valid_until || null,
    };

    try {
      if (editingId) {
        await updateSurcharge(editingId, payload);
      } else {
        await createSurcharge(payload);
      }
      resetForm();
      fetchSurcharges();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this surcharge?')) return;
    try {
      await deleteSurcharge(id);
      fetchSurcharges();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Surcharge
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Surcharge' : 'New Surcharge'}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-semibold">Carrier *</label>
              <select
                value={formData.carrier_id}
                onChange={e => setFormData(prev => ({ ...prev, carrier_id: e.target.value }))}
                className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
              >
                <option value="">Select carrier</option>
                {carriers.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">Surcharge Type *</label>
              <select
                value={formData.surcharge_type}
                onChange={e => setFormData(prev => ({ ...prev, surcharge_type: e.target.value }))}
                className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
              >
                {SURCHARGE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">Transport Mode</label>
              <select
                value={formData.transport_mode}
                onChange={e => setFormData(prev => ({ ...prev, transport_mode: e.target.value }))}
                className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
              >
                {TRANSPORT_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">Rate Type *</label>
              <select
                value={formData.rate_type}
                onChange={e => setFormData(prev => ({ ...prev, rate_type: e.target.value }))}
                className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
              >
                {RATE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">Amount *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">Currency</label>
              <input
                type="text"
                value={formData.currency}
                onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">Valid From *</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={e => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={e => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded">
              Cancel
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-emerald-600">
              <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Carrier</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Type</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Mode</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Rate Type</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Amount</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Currency</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Valid From</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Valid Until</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Status</th>
              <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {surcharges.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 text-slate-400">No surcharges found.</td></tr>
            )}
            {surcharges.map(s => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{s.carrier?.name || s.carrier_id}</td>
                <td className="px-4 py-3"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-mono">{s.surcharge_type}</span></td>
                <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">{s.transport_mode}</span></td>
                <td className="px-4 py-3 text-xs">{s.rate_type}</td>
                <td className="px-4 py-3 font-mono">{s.rate_type === 'PERCENT' ? `${s.amount}%` : s.amount.toFixed(2)}</td>
                <td className="px-4 py-3">{s.currency}</td>
                <td className="px-4 py-3">{s.valid_from?.split('T')[0]}</td>
                <td className="px-4 py-3">{s.valid_until?.split('T')[0] || '∞'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.is_active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleEdit(s)} className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
