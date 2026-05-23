import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentConfirmationPage } from '../PaymentConfirmationPage/PaymentConfirmationPage';

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
const mockGetApplicationById = vi.fn();
const mockGenerateAndDownload = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'app-456' }),
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

vi.mock('@shared/utils/formatters', () => ({
  formatCurrency: (n: number) => `QAR ${n.toFixed(2)}`,
}));

vi.mock('@shared/components', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@shared/services', () => ({
  supabaseApiService: {
    getApplicationById: (...args: unknown[]) => mockGetApplicationById(...args),
  },
  receiptService: {
    generateAndDownload: (...args: unknown[]) => mockGenerateAndDownload(...args),
  },
}));

describe('PaymentConfirmationPage', () => {
  beforeEach(() => {
    mockUseLocation.mockReturnValue({
      state: {
        transactionId: 'TXN-confirm-123',
        amount: 2500,
        method: 'card',
      },
      pathname: '',
      search: '',
      hash: '',
      key: '',
    });
  });

  it('should render success message and transaction details from location state', () => {
    render(<PaymentConfirmationPage />);

    expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
    expect(screen.getByText(/your payment has been processed successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/TXN-confirm-123/)).toBeInTheDocument();
    expect(screen.getByText(/QAR 2500.00/)).toBeInTheDocument();
    expect(screen.getByText(/credit\/debit card/i)).toBeInTheDocument();
  });

  it('should show N/A for missing transaction id when state is empty', () => {
    mockUseLocation.mockReturnValue({
      state: {},
      pathname: '',
      search: '',
      hash: '',
      key: '',
    });

    render(<PaymentConfirmationPage />);

    const values = screen.getAllByText(/N\/A/i);
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  it('should show bank transfer when method is bank_transfer', () => {
    mockUseLocation.mockReturnValue({
      state: { transactionId: 'TXN-2', amount: 1000, method: 'bank_transfer' },
      pathname: '',
      search: '',
      hash: '',
      key: '',
    });

    render(<PaymentConfirmationPage />);
    expect(screen.getByText(/bank transfer/i)).toBeInTheDocument();
  });

  it('should navigate to application when Back to Application is clicked', async () => {
    render(<PaymentConfirmationPage />);
    const backBtn = screen.getByRole('button', { name: /back to application/i });
    await userEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/customer/my-applications/app-456');
  });

  it('should fall back to print when getApplicationById fails', async () => {
    mockGetApplicationById.mockResolvedValue({ status: 'ERROR' });
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<PaymentConfirmationPage />);
    const downloadBtn = screen.getByRole('button', { name: /download receipt/i });
    await userEvent.click(downloadBtn);
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('should call receiptService.generateAndDownload with description when isSettlement', async () => {
    mockUseLocation.mockReturnValue({
      state: {
        transactionId: 'TXN-settle-1',
        amount: 5000,
        method: 'blox_credit',
        isSettlement: true,
        paymentsSettled: 3,
      },
      pathname: '',
      search: '',
      hash: '',
      key: '',
    });
    const fakeApp = {
      id: 'app-456',
      installmentPlan: {
        schedule: [
          { dueDate: '2025-01-01', status: 'paid', amount: 2000, paidAmount: 2000 },
          { dueDate: '2025-02-01', status: 'paid', amount: 1500, paidAmount: 1500 },
          { dueDate: '2025-03-01', status: 'paid', amount: 1500, paidAmount: 1500 },
        ],
      },
    };
    mockGetApplicationById.mockResolvedValue({ status: 'SUCCESS', data: fakeApp });
    mockGenerateAndDownload.mockResolvedValue(undefined);

    render(<PaymentConfirmationPage />);
    const downloadBtn = screen.getByRole('button', { name: /download receipt/i });
    await userEvent.click(downloadBtn);

    await vi.waitFor(() => {
      expect(mockGenerateAndDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          application: fakeApp,
          paidAmount: 5000,
          description: 'Settlement of 3 installments',
        }),
        expect.any(String)
      );
    });
  });
});
