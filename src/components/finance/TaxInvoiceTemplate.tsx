import React from 'react';

interface TaxInvoiceTemplateProps {
  data: {
    tax_invoice_no: string;
    issued_at: string;
    supplier_info: {
      business_number: string;
      name: string;
      ceo_name: string;
      address: string;
      business_type: string;
      business_item: string;
    };
    buyer_info: {
      business_number: string;
      name: string;
      ceo_name: string;
      address: string;
      business_type: string;
      business_item: string;
    };
    items: Array<{
      date: string;
      item_name: string;
      spec: string;
      quantity: number;
      unit_price: number;
      supply_amount: number;
      tax_amount: number;
      remarks: string;
    }>;
    total_amount: number;
    vat_amount: number;
    grand_total: number;
  };
}

export const TaxInvoiceTemplate: React.FC<TaxInvoiceTemplateProps> = ({ data }) => {
  const { supplier_info, buyer_info, items } = data;

  return (
    <div className="max-w-[800px] mx-auto p-8 bg-white border border-gray-200 font-sans text-sm text-gray-800 shadow-xl rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b-2 border-primary-600 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-900 tracking-tight">세 금 계 산 서</h1>
          <p className="text-xs text-gray-500 mt-1">(공급받는자 보관용)</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">No. {data.tax_invoice_no}</div>
          <div className="text-sm text-gray-600">작성일자: {new Date(data.issued_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Supplier and Buyer Section */}
      <div className="grid grid-cols-2 gap-0 mb-6 border border-gray-300">
        {/* Supplier */}
        <div className="border-r border-gray-300">
          <div className="bg-primary-50 text-primary-900 font-bold p-2 text-center border-b border-gray-300">공 급 자</div>
          <div className="p-4 space-y-2">
            <div className="flex"><span className="w-24 font-semibold text-gray-600">등록번호</span> <span className="font-mono">{supplier_info.business_number}</span></div>
            <div className="flex"><span className="w-24 font-semibold text-gray-600">상호(성명)</span> <span>{supplier_info.name} (인)</span></div>
            <div className="flex"><span className="w-24 font-semibold text-gray-600">사업장 주소</span> <span className="text-xs">{supplier_info.address}</span></div>
            <div className="flex justify-between">
              <div className="flex"><span className="w-24 font-semibold text-gray-600">업태</span> <span>{supplier_info.business_type}</span></div>
              <div className="flex"><span className="w-12 font-semibold text-gray-600">종목</span> <span>{supplier_info.business_item}</span></div>
            </div>
          </div>
        </div>

        {/* Buyer */}
        <div>
          <div className="bg-secondary-50 text-secondary-900 font-bold p-2 text-center border-b border-gray-300">공급받는자</div>
          <div className="p-4 space-y-2">
            <div className="flex"><span className="w-24 font-semibold text-gray-600">등록번호</span> <span className="font-mono">{buyer_info.business_number}</span></div>
            <div className="flex"><span className="w-24 font-semibold text-gray-600">상호(성명)</span> <span>{buyer_info.name}</span></div>
            <div className="flex"><span className="w-24 font-semibold text-gray-600">사업장 주소</span> <span className="text-xs">{buyer_info.address}</span></div>
            <div className="flex justify-between">
              <div className="flex"><span className="w-24 font-semibold text-gray-600">업태</span> <span>{buyer_info.business_type}</span></div>
              <div className="flex"><span className="w-12 font-semibold text-gray-600">종목</span> <span>{buyer_info.business_item}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6 overflow-hidden border border-gray-300 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wider border-b border-gray-300">
              <th className="px-3 py-2 border-r border-gray-300">월/일</th>
              <th className="px-3 py-2 border-r border-gray-300">품목</th>
              <th className="px-3 py-2 border-r border-gray-300 text-right">수량</th>
              <th className="px-3 py-2 border-r border-gray-300 text-right">단가</th>
              <th className="px-3 py-2 border-r border-gray-300 text-right">공급가액</th>
              <th className="px-3 py-2 text-right">세액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 border-r border-gray-300 text-center font-mono text-xs">{item.date}</td>
                <td className="px-3 py-2 border-r border-gray-300">{item.item_name}</td>
                <td className="px-3 py-2 border-r border-gray-300 text-right">{item.quantity.toLocaleString()}</td>
                <td className="px-3 py-2 border-r border-gray-300 text-right font-mono">{item.unit_price.toLocaleString()}</td>
                <td className="px-3 py-2 border-r border-gray-300 text-right font-semibold">{item.supply_amount.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-semibold">{item.tax_amount.toLocaleString()}</td>
              </tr>
            ))}
            {/* Fill empty rows if needed to maintain layout height */}
            {[...Array(Math.max(0, 4 - items.length))].map((_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                <td className="px-3 py-2 border-r border-gray-300"></td>
                <td className="px-3 py-2 border-r border-gray-300"></td>
                <td className="px-3 py-2 border-r border-gray-300"></td>
                <td className="px-3 py-2 border-r border-gray-300"></td>
                <td className="px-3 py-2 border-r border-gray-300"></td>
                <td className="px-3 py-2"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 border border-gray-300 rounded-lg overflow-hidden mb-6">
        <div className="bg-gray-100 p-2 text-center border-r border-gray-300 font-bold text-gray-600">합계금액</div>
        <div className="bg-gray-100 p-2 text-center border-r border-gray-300 font-bold text-gray-600">공급가액</div>
        <div className="bg-gray-100 p-2 text-center border-r border-gray-300 font-bold text-gray-600">세액</div>
        <div className="bg-gray-100 p-2 text-center font-bold text-gray-600">비고</div>
        
        <div className="p-3 text-center border-r border-gray-300 font-bold text-xl text-primary-900 bg-primary-50">
          {data.grand_total.toLocaleString()}
        </div>
        <div className="p-3 text-center border-r border-gray-300 font-semibold text-lg">
          {data.total_amount.toLocaleString()}
        </div>
        <div className="p-3 text-center border-r border-gray-300 font-semibold text-lg text-secondary-600">
          {data.vat_amount.toLocaleString()}
        </div>
        <div className="p-3 text-xs text-gray-500 italic">
          본 세금계산서는 전자식으로 발행되었습니다.
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 mt-12 border-t pt-4">
        &copy; {new Date().getFullYear()} ZENITH LMS. All rights reserved. 본 문서는 법적 효력을 갖는 전자세금계산서입니다.
      </div>
    </div>
  );
};
