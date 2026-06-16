'use client';

import { useState } from 'react';
import { updateAgencyShipperGrade } from '@/app/actions/agency/shippers';
import type { AgencyShipperRow } from '@/types/agency';
import { ShippersHeader } from './shippers-header';
import { ShipperTable } from './shipper-table';

interface AgencyShippersClientProps {
  shippers: AgencyShipperRow[];
  t: (key: string) => string;
}

export function AgencyShippersClient({ shippers, t }: AgencyShippersClientProps) {
  const [localShippers, setLocalShippers] = useState<AgencyShipperRow[]>(shippers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState('');
  const [editRate, setEditRate] = useState(0);
  const [error, setError] = useState('');

  const startEdit = (shipper: AgencyShipperRow) => {
    setEditingId(shipper.id);
    setEditGrade(shipper.grade || '');
    setEditRate(shipper.discount_rate);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditGrade('');
    setEditRate(0);
    setError('');
  };

  const saveEdit = async (id: string) => {
    setError('');
    try {
      await updateAgencyShipperGrade(id, editGrade, editRate);
      setLocalShippers((prev) => prev.map((s) => (s.id === id ? { ...s, grade: editGrade || null, discount_rate: editRate } : s)));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || t('submit_error'));
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen animate-in fade-in duration-500">
      <ShippersHeader error={error} onDismissError={() => setError('')} t={t} />
      <ShipperTable
        shippers={localShippers}
        editingId={editingId}
        editGrade={editGrade}
        editRate={editRate}
        onEdit={startEdit}
        onCancel={cancelEdit}
        onSave={saveEdit}
        onGradeChange={setEditGrade}
        onRateChange={setEditRate}
        t={t}
      />
    </div>
  );
}