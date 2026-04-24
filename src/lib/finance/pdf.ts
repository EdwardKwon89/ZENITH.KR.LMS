/**
 * ZENITH_LMS: Invoice PDF Generator Utility
 * 
 * jspdf 및 jspdf-autotable을 사용하여 전문적인 인보이스 PDF를 생성합니다.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// jspdf-autotable 타입 보완
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

export interface InvoicePdfData {
  invoice_no: string;
  due_date: string;
  total_amount: number;
  currency: string;
  shipper: {
    name: string;
    address?: string;
    business_number?: string;
  };
  costs: Array<{
    cost_type: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    currency: string;
  }>;
}

/**
 * 인보이스 데이터를 바탕으로 PDF ArrayBuffer를 생성합니다.
 */
export async function generateInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  // 기본 설정: A4, portrait, unit: mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // [1] 상단 로고 및 타이틀
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('ZENITH LMS INVOICE', 105, 20, { align: 'center' });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 25, 190, 25);

  // [2] 발행 정보
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Invoice Details', 20, 35);
  
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice No: ${data.invoice_no}`, 20, 42);
  doc.text(`Issue Date: ${new Date().toLocaleDateString('ko-KR')}`, 20, 47);
  doc.text(`Due Date: ${new Date(data.due_date).toLocaleDateString('ko-KR')}`, 20, 52);

  // [3] 수신자 정보
  doc.setTextColor(100, 100, 100);
  doc.text('Bill To:', 120, 35);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.shipper.name, 120, 42);
  doc.setFont('helvetica', 'normal');
  if (data.shipper.address) {
    doc.text(data.shipper.address, 120, 47, { maxWidth: 70 });
  }
  if (data.shipper.business_number) {
    doc.text(`Biz No: ${data.shipper.business_number}`, 120, 57);
  }

  // [4] 비용 테이블
  const tableBody = data.costs.map((cost) => [
    cost.cost_type,
    cost.quantity.toLocaleString(),
    cost.unit_price.toLocaleString(),
    cost.total_amount.toLocaleString(),
    cost.currency
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Description', 'Qty', 'Unit Price', 'Total', 'Currency']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [52, 73, 94], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' }
    }
  });

  // [5] 총합 및 하단 푸터
  const finalY = doc.lastAutoTable?.finalY || 70;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Amount: ${data.total_amount.toLocaleString()} ${data.currency}`, 190, finalY + 15, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated document. No signature is required.', 105, 280, { align: 'center' });
  doc.text('ZENITH LMS Logistics Solutions - 2026', 105, 285, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
