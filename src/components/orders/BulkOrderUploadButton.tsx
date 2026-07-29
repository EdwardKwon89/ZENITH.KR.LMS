"use client";

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import BulkOrderUploadModal from './BulkOrderUploadModal';

export default function BulkOrderUploadButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-all"
      >
        <Upload size={16} />
        엑셀 일괄등록
      </button>
      {isOpen && <BulkOrderUploadModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
