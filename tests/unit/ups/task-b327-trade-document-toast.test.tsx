import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

// TASK-B-327 (Issue #1196 / DEF-B-147): SHXK 무역서류(WAYBILL/INVOICE/CUSTOMS) 처리 완료 메시지 부재.
// UpsTradeDocumentActions 컴포넌트를 실제로 렌더해 미리보기 "확인" → handleConfirmPreview 경로를 태우고,
// fetchShxkTradeDocument 성공/실패에 따라 toast.success/error + router.refresh가 호출되는지 검증한다.
// (소스 문자열 검사(toContain)나 함수 존재 확인이 아니라 실제 컴포넌트 상호작용 기반)

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  preview: vi.fn(),
  fetchDoc: vi.fn(),
  voidLabel: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock('lucide-react', () => ({
  FileText: () => null,
  XCircle: () => null,
  Loader2: () => null,
}));
vi.mock('@/app/actions/operations/ups-labels', () => ({
  previewShxkPayload: mocks.preview,
  fetchShxkTradeDocument: mocks.fetchDoc,
  voidUpsLabel: mocks.voidLabel,
}));

import UpsTradeDocumentActions from '@/components/orders/UpsTradeDocumentActions';

const ORDER_ID = 'order-327';

async function openDocAndConfirm(buttonLabel: string) {
  render(<UpsTradeDocumentActions orderId={ORDER_ID} hasActiveLabel />);
  fireEvent.click(screen.getByText(buttonLabel));
  // 미리보기 팝업의 "확인" 클릭 → handleConfirmPreview 진입
  await waitFor(() => expect(screen.getByText('확인')).toBeInTheDocument());
  fireEvent.click(screen.getByText('확인'));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.preview.mockResolvedValue({ success: true, payload: { configInfo: {}, listorder: [] } });
});

afterEach(() => {
  cleanup();
});

describe('TASK-B-327: 무역서류 처리 완료/실패 메시지 (DEF-B-147)', () => {
  it('WAYBILL 성공 시 완료 토스트 + router.refresh 호출', async () => {
    mocks.fetchDoc.mockResolvedValue({ success: true, url: 'https://example.com/waybill.pdf' });

    await openDocAndConfirm('waybill');

    await waitFor(() => expect(mocks.fetchDoc).toHaveBeenCalledWith(ORDER_ID, 'WAYBILL'));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('문서 처리가 완료되었습니다.'));
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('CUSTOMS 성공 시 완료 토스트 + router.refresh 호출', async () => {
    mocks.fetchDoc.mockResolvedValue({ success: true, url: 'https://example.com/customs.pdf' });

    await openDocAndConfirm('customs_declaration_shxk');

    await waitFor(() => expect(mocks.fetchDoc).toHaveBeenCalledWith(ORDER_ID, 'CUSTOMS'));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('문서 처리가 완료되었습니다.'));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('INVOICE 실패 시 에러 토스트 호출, 완료 토스트/refresh 는 호출되지 않음', async () => {
    mocks.fetchDoc.mockResolvedValue({ success: false, error: '문서 다운로드/저장 실패' });

    await openDocAndConfirm('logistics_invoice');

    await waitFor(() => expect(mocks.fetchDoc).toHaveBeenCalledWith(ORDER_ID, 'INVOICE'));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('문서 다운로드/저장 실패'));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('성공 응답에 url 이 있으면 결과 팝업에 "문서 열기" 링크가 노출된다', async () => {
    mocks.fetchDoc.mockResolvedValue({ success: true, url: 'https://example.com/invoice.pdf' });

    await openDocAndConfirm('logistics_invoice');

    const link = await screen.findByText('문서 열기');
    expect(link).toHaveAttribute('href', 'https://example.com/invoice.pdf');
  });
});
