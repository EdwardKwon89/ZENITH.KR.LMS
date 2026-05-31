'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createRateCard, updateRateCard, deleteRateCard, getRateCards } from '@/app/actions/admin/rate-cards';
import { Trash2, Plus, Save, X } from 'lucide-react';

interface Carrier {
  id: string;
  code: string;
  name: string;
  transport_mode: string;
}

interface RateCard {
  id: string;
  carrier_id: string;
  transport_mode: string;
  currency: string;
  tiers: { weight_min: number; unit_price: number }[];
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  carrier_cost?: number | null;
  margin_rate?: number | null;
  platform_fee_rate?: number | null;
  carrier?: { code: string; name: string; transport_mode: string } | null;
}

const TRANSPORT_MODES = ['AIR', 'SEA', 'LAND', 'EXP'] as const;
const EMPTY_TIER = { weight_min: 0, unit_price: 0 };

function RateCardFormRow({ tier, index, onChange, onRemove }: {
  tier: { weight_min: number; unit_price: number };
  index: number;
  onChange: (i: number, field: 'weight_min' | 'unit_price', value: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-4">{index + 1}</span>
      <div className="flex-1">
        <label className="text-xs text-slate-500">Weight Min</label>
        <input
          type="number"
          min={0}
          value={tier.weight_min}
          onChange={e => onChange(index, 'weight_min', Number(e.target.value))}
          className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-slate-500">Unit Price</label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={tier.unit_price}
          onChange={e => onChange(index, 'unit_price', Number(e.target.value))}
          className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
        />
      </div>
      {index > 0 && (
        <button onClick={() => onRemove(index)} className="p-1 text-red-400 hover:text-red-600 mt-5">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function RateCardsTab() {
  const [cards, setCards] = useState<RateCard[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    carrier_id: '',
    transport_mode: 'AIR' as string,
    currency: 'USD',
    tiers: [{ ...EMPTY_TIER }],
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    carrier_cost: '',
    margin_rate: '15.0',
    platform_fee_rate: '5.0',
  });

  const fetchCards = useCallback(async () => {
    try {
      const data = await getRateCards();
      setCards(data as unknown as RateCard[]);
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
    fetchCards();
  }, [fetchCards]);

  const resetForm = () => {
    setFormData({
      carrier_id: '',
      transport_mode: 'AIR',
      currency: 'USD',
      tiers: [{ ...EMPTY_TIER }],
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      carrier_cost: '',
      margin_rate: '15.0',
      platform_fee_rate: '5.0',
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (card: RateCard) => {
    setFormData({
      carrier_id: card.carrier_id,
      transport_mode: card.transport_mode,
      currency: card.currency,
      tiers: card.tiers.length > 0 ? card.tiers.map(t => ({ ...t })) : [{ ...EMPTY_TIER }],
      valid_from: card.valid_from.split('T')[0],
      valid_until: card.valid_until ? card.valid_until.split('T')[0] : '',
      carrier_cost: card.carrier_cost?.toString() || '',
      margin_rate: card.margin_rate?.toString() || '15.0',
      platform_fee_rate: card.platform_fee_rate?.toString() || '5.0',
    });
    setEditingId(card.id);
    setShowForm(true);
    setError('');
  };

  const handleSave = async () => {
    if (!formData.carrier_id || !formData.valid_from) {
      setError('Carrier and Valid From are required.');
      return;
    }

    const payload = {
      ...formData,
      valid_until: formData.valid_until || null,
      carrier_cost: formData.carrier_cost ? Number(formData.carrier_cost) : null,
      margin_rate: formData.margin_rate ? Number(formData.margin_rate) : 15.0,
      platform_fee_rate: formData.platform_fee_rate ? Number(formData.platform_fee_rate) : 5.0,
    };

    try {
      if (editingId) {
        await updateRateCard(editingId, payload);
      } else {
        await createRateCard(payload);
      }
      resetForm();
      fetchCards();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this rate card?')) return;
    try {
      await deleteRateCard(id);
      fetchCards();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTierChange = (index: number, field: 'weight_min' | 'unit_price', value: number) => {
    const tiers = [...formData.tiers];
    tiers[index] = { ...tiers[index], [field]: value };
    setFormData(prev => ({ ...prev, tiers }));
  };

  const addTier = () => {
    setFormData(prev => ({ ...prev, tiers: [...prev.tiers, { ...EMPTY_TIER }] }));
  };

  const removeTier = (index: number) => {
    setFormData(prev => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }));
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
          <Plus className="w-4 h-4" /> New Rate Card
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Rate Card' : 'New Rate Card'}</h2>

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

          <div className="border-t border-slate-100 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Pricing Breakdown (3-Tier)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-500 font-semibold">Carrier Cost (원가)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.carrier_cost}
                  onChange={e => setFormData(prev => ({ ...prev, carrier_cost: e.target.value }))}
                  className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold">Margin Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formData.margin_rate}
                  onChange={e => setFormData(prev => ({ ...prev, margin_rate: e.target.value }))}
                  className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold">Platform Fee Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formData.platform_fee_rate}
                  onChange={e => setFormData(prev => ({ ...prev, platform_fee_rate: e.target.value }))}
                  className="w-full border border-slate-200 rounded px-2 py-2 text-sm mt-1"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              unit_price ≈ carrier_cost × (1 + margin_rate/100) × (1 + platform_fee_rate/100)
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-semibold">Tiers</label>
            <div className="space-y-2 mt-1">
              {formData.tiers.map((tier, i) => (
                <RateCardFormRow key={i} tier={tier} index={i} onChange={handleTierChange} onRemove={removeTier} />
              ))}
            </div>
            <button onClick={addTier} className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mt-2">
              <Plus className="w-3 h-3" /> Add tier
            </button>
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
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Mode</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Currency</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Tiers</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Carrier Cost</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Margin</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Fee</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Valid From</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Valid Until</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Status</th>
              <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 && (
              <tr><td colSpan={11} className="text-center py-8 text-slate-400">No rate cards found.</td></tr>
            )}
            {cards.map(card => (
              <tr key={card.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{card.carrier?.name || card.carrier_id}</td>
                <td className="px-4 py-3">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">{card.transport_mode}</span>
                </td>
                <td className="px-4 py-3">{card.currency}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{card.tiers?.length || 0} slabs</td>
                <td className="px-4 py-3 text-xs font-mono">{card.carrier_cost != null ? `$${card.carrier_cost}` : '-'}</td>
                <td className="px-4 py-3 text-xs">{card.margin_rate != null ? `${card.margin_rate}%` : '-'}</td>
                <td className="px-4 py-3 text-xs">{card.platform_fee_rate != null ? `${card.platform_fee_rate}%` : '-'}</td>
                <td className="px-4 py-3">{card.valid_from?.split('T')[0]}</td>
                <td className="px-4 py-3">{card.valid_until?.split('T')[0] || '∞'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${card.is_active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                    {card.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleEdit(card)} className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold">Edit</button>
                    <button onClick={() => handleDelete(card.id)} className="text-red-400 hover:text-red-600">
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
