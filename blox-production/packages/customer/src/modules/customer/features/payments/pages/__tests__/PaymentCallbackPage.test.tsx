import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PaymentCallbackPage } from '../PaymentCallbackPage/PaymentCallbackPage';
import { skipCashService } from '@shared/services';
import { supabase } from '@shared/services';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@shared/utils/formatters', () => ({
  formatCurrency: (n: number) => `QAR ${n.toFixed(2)}`,
}));

vi.mock('@shared/components', () => ({
  Button: ({ children, onClick, startIcon, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Loading: () => <div>Loading...</div>,
}));

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('@shared/services', () => ({
  skipCashService: {
    verifyPayment: vi.fn(),
  },
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

function renderWithRouter(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="applications/:id/payment-callback" element={<PaymentCallbackPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PaymentCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    // Default: DB returns completed so success path exits polling loop immediately (no 1s delay)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null }),
    } as any);
  });

  it('should show error when transactionId is missing', async () => {
    renderWithRouter('/applications/app-123/payment-callback?applicationId=app-123');

    await waitFor(() => {
      expect(screen.getByText(/transaction id is missing/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
  });

  it('should show verifying state then success when verification succeeds', async () => {
    vi.mocked(skipCashService.verifyPayment).mockResolvedValue({
      status: 'SUCCESS',
      data: {
        status: 2,
        statusId: 2,
        amount: 1000,
        cardType: 'Visa',
      },
      message: 'OK',
    });

    renderWithRouter(
      '/applications/app-123/payment-callback?transactionId=TXN-123&applicationId=app-123'
    );

    expect(screen.getByText(/verifying payment/i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(screen.getByText(/your payment has been processed successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/TXN-123/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to application/i })).toBeInTheDocument();
  });

  it('should show failed state when verification returns failed status', async () => {
    vi.mocked(skipCashService.verifyPayment).mockResolvedValue({
      status: 'SUCCESS',
      data: { status: 4, statusId: 4, errorMessage: 'Card declined' },
      message: 'OK',
    });

    renderWithRouter(
      '/applications/app-123/payment-callback?transactionId=TXN-123&applicationId=app-123'
    );

    await waitFor(
      () => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(screen.getByText(/card declined/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify again/i })).toBeInTheDocument();
  });

  it('should show failed when payment was canceled', async () => {
    vi.mocked(skipCashService.verifyPayment).mockResolvedValue({
      status: 'SUCCESS',
      data: { status: 3, statusId: 3 },
      message: 'OK',
    });

    renderWithRouter(
      '/applications/app-123/payment-callback?transactionId=TXN-123&applicationId=app-123'
    );

    await waitFor(
      () => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(screen.getByText(/payment was canceled/i)).toBeInTheDocument();
  });

  it('should show pending state when verification returns pending', async () => {
    vi.mocked(skipCashService.verifyPayment).mockResolvedValue({
      status: 'SUCCESS',
      data: { status: 1, statusId: 1 },
      message: 'OK',
    });

    renderWithRouter(
      '/applications/app-123/payment-callback?transactionId=TXN-123&applicationId=app-123'
    );

    await waitFor(
      () => {
        expect(screen.getByText(/payment processing/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(screen.getByRole('button', { name: /check status again/i })).toBeInTheDocument();
  });

  it('should navigate to application when Back to Application is clicked', async () => {
    vi.mocked(skipCashService.verifyPayment).mockResolvedValue({
      status: 'SUCCESS',
      data: { status: 2, statusId: 2 },
      message: 'OK',
    });

    renderWithRouter(
      '/applications/app-123/payment-callback?transactionId=TXN-123&applicationId=app-123'
    );

    await waitFor(
      () => {
        expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const backBtn = screen.getByRole('button', { name: /back to application/i });
    await userEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/customer/my-applications/app-123');
  });

  it('should call verify again when Verify Again is clicked after failure', async () => {
    vi.mocked(skipCashService.verifyPayment)
      .mockResolvedValueOnce({
        status: 'SUCCESS',
        data: { status: 4, statusId: 4 },
        message: 'OK',
      })
      .mockResolvedValueOnce({
        status: 'SUCCESS',
        data: { status: 2, statusId: 2 },
        message: 'OK',
      });

    renderWithRouter(
      '/applications/app-123/payment-callback?transactionId=TXN-123&applicationId=app-123'
    );

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /verify again/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await userEvent.click(screen.getByRole('button', { name: /verify again/i }));

    await waitFor(
      () => {
        expect(skipCashService.verifyPayment).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 }
    );
  });
});
