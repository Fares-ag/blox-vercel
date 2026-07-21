import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Tooltip,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowBack,
  Download,
  GetApp,
  FilterList,
  PictureAsPdf,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import { Loading, DatePicker } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import type { Application, PaymentSchedule } from '@shared/models/application.model';
import moment from 'moment';
import { useAppSelector } from '../../../../store/hooks';
type Moment = moment.Moment;
import './PaymentHistoryPage.scss';

interface PaymentTransaction {
  id: string;
  applicationId: string;
  applicationName: string;
  vehicleName: string;
  dueDate: string;
  paidDate: string | null;
  amount: number;
  status: 'paid' | 'upcoming' | 'overdue' | 'active';
  paymentMethod?: string;
  transactionId?: string;
}

export const PaymentHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<PaymentTransaction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Filters (page only shows paid transactions)
  const [applicationFilter, setApplicationFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Moment | null>(null);
  const [endDate, setEndDate] = useState<Moment | null>(null);

  const loadPaymentHistory = useCallback(async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      setLoadError(null);

      // Load applications from Supabase only
      const supabaseResponse = await supabaseApiService.getApplications();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        // Filter to current user's applications (use Redux auth)
        const applications = supabaseResponse.data as Application[];
        const userApplications = applications.filter(
          (app: Application) => app.customerEmail?.toLowerCase() === user.email.toLowerCase()
        );
      // Extract all payment transactions
      const allTransactions: PaymentTransaction[] = [];

      userApplications.forEach((app: Application) => {
        if (app.installmentPlan?.schedule) {
          const vehicleName = `${app.vehicle?.make || ''} ${app.vehicle?.model || ''}`.trim() || 'N/A';
          
          app.installmentPlan.schedule.forEach((payment: PaymentSchedule, index: number) => {
            // Only include fully paid schedule rows (do not treat paidDate alone as paid)
            if (payment.status !== 'paid') return;

            allTransactions.push({
              id: `${app.id}-${payment.dueDate}-${index}`,
              applicationId: app.id,
              applicationName: `Application ${app.id}`,
              vehicleName,
              dueDate: payment.dueDate,
              paidDate: payment.paidDate || null,
              amount: payment.amount || 0,
              status: 'paid' as const,
              paymentMethod: payment.paymentMethod || 'N/A',
              transactionId: payment.transactionId || undefined,
            });
          });
        }
      });

        // Sort by due date (newest first)
        allTransactions.sort((a, b) => moment(b.dueDate).valueOf() - moment(a.dueDate).valueOf());
        
        setTransactions(allTransactions);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load applications');
      }
    } catch (error: any) {
      console.error('Failed to load payment history:', error);
      setTransactions([]);
      setLoadError(
        error?.message ||
          'Failed to load payment history. Please try again — this is not an empty history.'
      );
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadPaymentHistory();
  }, [loadPaymentHistory]);

  useEffect(() => {
    applyFilters();
  }, [transactions, applicationFilter, startDate, endDate]);

  const applyFilters = () => {
    let filtered = [...transactions];

    // Application filter
    if (applicationFilter !== 'all') {
      filtered = filtered.filter((t) => t.applicationId === applicationFilter);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter((t) => moment(t.dueDate).isSameOrAfter(startDate, 'day'));
    }
    if (endDate) {
      filtered = filtered.filter((t) => moment(t.dueDate).isSameOrBefore(endDate, 'day'));
    }

    setFilteredTransactions(filtered);
  };

  const uniqueApplications = useMemo(() => {
    const apps = new Map<string, string>();
    transactions.forEach((t) => {
      if (!apps.has(t.applicationId)) {
        apps.set(t.applicationId, t.applicationName);
      }
    });
    return Array.from(apps.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions]);

  // Brand colors: Lime Yellow #DAFF01, Blox Black #0E1909
  const LIME_YELLOW = [218, 255, 1] as [number, number, number];
  const BLOX_BLACK = [14, 25, 9] as [number, number, number];
  const PAGE_WIDTH = 210;
  const MARGIN = 18;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  const downloadPDF = async (transaction?: PaymentTransaction) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.height;

    if (transaction) {
      // ——— Single receipt: designed like an actual receipt ———
      let y = MARGIN;

      // Brand header bar (Blox Black background, Lime Yellow text)
      doc.setFillColor(...BLOX_BLACK);
      doc.rect(0, 0, PAGE_WIDTH, 36, 'F');
      doc.setTextColor(...LIME_YELLOW);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('BLOX', PAGE_WIDTH / 2, 14, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Payment Receipt', PAGE_WIDTH / 2, 24, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Vehicle financing · Keep this receipt for your records', PAGE_WIDTH / 2, 31, { align: 'center' });

      y = 46;
      doc.setTextColor(...BLOX_BLACK);

      // Receipt number & date
      const receiptNum = transaction.transactionId || `REC-${transaction.applicationId.slice(0, 8)}-${moment(transaction.paidDate || transaction.dueDate).format('YYYYMMDD')}`;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Receipt No.', MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.text(receiptNum, MARGIN + 32, y);
      doc.setFont('helvetica', 'bold');
      doc.text('Date issued:', PAGE_WIDTH - MARGIN - 45, y);
      doc.setFont('helvetica', 'normal');
      doc.text(moment().format('DD MMM YYYY, h:mm A'), PAGE_WIDTH - MARGIN - 42, y);
      y += 10;

      // Divider
      doc.setDrawColor(218, 255, 1);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      y += 12;

      // Client
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('CLIENT', MARGIN, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(user?.name || '—', MARGIN, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(user?.email || '—', MARGIN, y);
      doc.setTextColor(...BLOX_BLACK);
      y += 14;

      // Vehicle & application
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('VEHICLE', MARGIN, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(transaction.vehicleName || '—', MARGIN, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Application ${transaction.applicationName.replace(/^Application\s+/i, '')}`, MARGIN, y);
      doc.setTextColor(...BLOX_BLACK);
      y += 14;

      // Installment / payment details box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('INSTALLMENT PAYMENT', MARGIN, y);
      y += 8;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      const boxTop = y - 2;
      doc.rect(MARGIN, boxTop, CONTENT_WIDTH, 52, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const leftLabel = MARGIN + 4;
      const leftVal = MARGIN + 58;
      doc.text('Due date', leftLabel, y + 6);
      doc.text(formatDate(transaction.dueDate), leftVal, y + 6);
      doc.text('Paid date', leftLabel, y + 14);
      doc.text(transaction.paidDate ? formatDate(transaction.paidDate) : '—', leftVal, y + 14);
      doc.text('Amount', leftLabel, y + 22);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(formatCurrency(transaction.amount), leftVal, y + 22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Payment method', leftLabel, y + 30);
      doc.text((transaction.paymentMethod && transaction.paymentMethod !== 'N/A') ? String(transaction.paymentMethod).replace(/_/g, ' ') : '—', leftVal, y + 30);
      if (transaction.transactionId) {
        doc.text('Transaction ID', leftLabel, y + 38);
        doc.setFontSize(8);
        doc.text(transaction.transactionId, leftVal, y + 38);
        doc.setFontSize(10);
      }
      y += 58;

      // Status badge (Paid)
      doc.setFillColor(218, 255, 1);
      doc.rect(PAGE_WIDTH - MARGIN - 22, y - 6, 22, 8, 'F');
      doc.setTextColor(...BLOX_BLACK);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PAID', PAGE_WIDTH - MARGIN - 11, y - 0.5, { align: 'center' });
      y += 16;

      // Divider
      doc.setDrawColor(218, 255, 1);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      y += 14;

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('This is an official payment receipt from BLOX.', PAGE_WIDTH / 2, y, { align: 'center' });
      doc.text('Thank you for your payment.', PAGE_WIDTH / 2, y + 5, { align: 'center' });
      doc.text('For support: info@blox-it.com', PAGE_WIDTH / 2, y + 12, { align: 'center' });
    } else {
      // ——— Payment History (multiple transactions) ———
      let yPos = MARGIN;
      doc.setFillColor(...BLOX_BLACK);
      doc.rect(0, 0, PAGE_WIDTH, 28, 'F');
      doc.setTextColor(...LIME_YELLOW);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('BLOX', PAGE_WIDTH / 2, 12, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Payment History', PAGE_WIDTH / 2, 21, { align: 'center' });
      yPos = 36;
      doc.setTextColor(...BLOX_BLACK);
      doc.setFontSize(9);
      doc.text(`Generated: ${moment().format('MMMM D, YYYY h:mm A')}`, MARGIN, yPos);
      doc.text(`Client: ${user?.name || user?.email || '—'}`, PAGE_WIDTH - MARGIN, yPos, { align: 'right' });
      yPos += 12;

      const lineHeight = 8;
      doc.setFillColor(...BLOX_BLACK);
      doc.rect(MARGIN, yPos - 5, CONTENT_WIDTH, lineHeight, 'F');
      doc.setTextColor(...LIME_YELLOW);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Application', MARGIN + 2, yPos);
      doc.text('Vehicle', MARGIN + 42, yPos);
      doc.text('Due Date', MARGIN + 85, yPos);
      doc.text('Paid Date', MARGIN + 115, yPos);
      doc.text('Amount', MARGIN + 145, yPos);
      doc.text('Status', MARGIN + 175, yPos);
      yPos += lineHeight + 2;
      doc.setTextColor(...BLOX_BLACK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      filteredTransactions.forEach((t) => {
        if (yPos > pageHeight - 22) {
          doc.addPage();
          yPos = MARGIN;
        }
        doc.text(t.applicationName.substring(0, 18), MARGIN + 2, yPos);
        doc.text(t.vehicleName.substring(0, 20), MARGIN + 42, yPos);
        doc.text(formatDate(t.dueDate).substring(0, 10), MARGIN + 85, yPos);
        doc.text(t.paidDate ? formatDate(t.paidDate).substring(0, 10) : '—', MARGIN + 115, yPos);
        doc.text(formatCurrency(t.amount), MARGIN + 145, yPos);
        doc.text(t.status.charAt(0).toUpperCase() + t.status.slice(1), MARGIN + 175, yPos);
        doc.setDrawColor(230, 230, 230);
        doc.line(MARGIN, yPos + 2, PAGE_WIDTH - MARGIN, yPos + 2);
        yPos += lineHeight + 2;
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Page ${i} of ${pageCount}`,
          PAGE_WIDTH / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    }

    doc.save(
      transaction
        ? `blox-receipt-${moment(transaction.paidDate || transaction.dueDate).format('YYYY-MM-DD')}-${transaction.applicationId.slice(0, 8)}.pdf`
        : `blox-payment-history-${moment().format('YYYY-MM-DD')}.pdf`
    );
  };

  const downloadCSV = () => {
    const headers = ['Application', 'Vehicle', 'Due Date', 'Paid Date', 'Amount', 'Status', 'Payment Method'];
    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map((t) =>
        [
          `"${t.applicationName}"`,
          `"${t.vehicleName}"`,
          formatDate(t.dueDate),
          t.paidDate ? formatDate(t.paidDate) : '',
          t.amount.toString(),
          t.status,
          t.paymentMethod || 'N/A',
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-history-${moment().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: PaymentTransaction['status']) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'active':
        return 'warning';
      default:
        return 'default';
    }
  };

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const paidAmount = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.status === 'paid')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const userReady = user?.email !== undefined;
  if (loading || (isAuthenticated && !userReady)) {
    return (
      <Box className="payment-history-page">
        <Loading />
      </Box>
    );
  }

  return (
    <Box className="payment-history-page">
      <Box className="page-header">
        <Button
          variant="text"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          className="back-button"
        >
          Back
        </Button>
        <Box className="header-content">
          <Typography variant="h4" className="page-title">
            Payment History
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            View and download your paid payment history
          </Typography>
        </Box>
      </Box>

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void loadPaymentHistory()}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {/* Filters */}
      <Paper className="filters-card" sx={{ mb: 3 }}>
        <Box className="filters-header">
          <Typography variant="h6" className="filters-title">
            <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filters
          </Typography>
          <Box className="export-buttons">
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={downloadCSV}
              disabled={filteredTransactions.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<PictureAsPdf />}
              onClick={() => downloadPDF()}
              disabled={filteredTransactions.length === 0}
              sx={{
                backgroundColor: 'var(--primary-color)',
                color: 'var(--primary-btn-color)',
                '&:hover': { backgroundColor: 'var(--primary-btn-hover)' },
              }}
            >
              Download PDF
            </Button>
          </Box>
        </Box>
        <Box className="filters-content">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Application</InputLabel>
                <Select
                  value={applicationFilter}
                  label="Application"
                  onChange={(e) => setApplicationFilter(e.target.value)}
                >
                  <MenuItem value="all">All Applications</MenuItem>
                  {uniqueApplications.map((app) => (
                    <MenuItem key={app.id} value={app.id}>
                      {app.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Summary Cards */}
      <Box className="summary-cards" sx={{ mb: 3 }}>
        <Paper className="summary-card">
          <Typography variant="body2" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
            Total Transactions
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: 'var(--primary-text)' }}>
            {filteredTransactions.length}
          </Typography>
        </Paper>
        <Paper className="summary-card">
          <Typography variant="body2" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
            Total Amount
          </Typography>
          <Typography variant="h5" fontWeight={700} className="highlight" sx={{ color: 'var(--primary-color)' }}>
            {formatCurrency(totalAmount)}
          </Typography>
        </Paper>
        <Paper className="summary-card">
          <Typography variant="body2" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
            Paid Amount
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: 'var(--primary-text)' }}>
            {formatCurrency(paidAmount)}
          </Typography>
        </Paper>
      </Box>

      {/* Transactions Table */}
      <Paper className="table-card">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Application</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Paid Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'var(--background-secondary)' }}>
                    <Typography variant="body2" sx={{ color: 'var(--background-secondary)', opacity: 0.8 }}>
                      No paid transactions yet
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell sx={{ color: 'var(--background-secondary)' }}>{transaction.applicationName}</TableCell>
                    <TableCell sx={{ color: 'var(--background-secondary)' }}>{transaction.vehicleName}</TableCell>
                    <TableCell sx={{ color: 'var(--background-secondary)' }}>{formatDate(transaction.dueDate)}</TableCell>
                    <TableCell sx={{ color: 'var(--background-secondary)' }}>
                      {transaction.paidDate ? formatDate(transaction.paidDate) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'var(--background-secondary)' }}>
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        color={getStatusColor(transaction.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Download Receipt">
                        <IconButton
                          size="small"
                          onClick={() => downloadPDF(transaction)}
                          disabled={transaction.status !== 'paid'}
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

