import React, { useState, useEffect, useMemo } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<PaymentTransaction[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [applicationFilter, setApplicationFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Moment | null>(null);
  const [endDate, setEndDate] = useState<Moment | null>(null);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, statusFilter, applicationFilter, startDate, endDate]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);

      // Load applications from Supabase only
      const supabaseResponse = await supabaseApiService.getApplications();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        // Filter to current user's applications
        const userEmail = JSON.parse(localStorage.getItem('customer_user') || '{}')?.email;
        const applications = supabaseResponse.data as Application[];
        const userApplications = userEmail
          ? applications.filter((app: Application) => app.customerEmail?.toLowerCase() === userEmail.toLowerCase())
          : applications;
      // Extract all payment transactions
      const allTransactions: PaymentTransaction[] = [];

      userApplications.forEach((app: Application) => {
        if (app.installmentPlan?.schedule) {
          const vehicleName = `${app.vehicle?.make || ''} ${app.vehicle?.model || ''}`.trim() || 'N/A';
          
          app.installmentPlan.schedule.forEach((payment: PaymentSchedule, index: number) => {
            const now = moment().startOf('day');
            const dueDate = moment(payment.dueDate);
            const paymentStatus: PaymentTransaction['status'] = (() => {

              if (payment.status === 'paid' || payment.paidDate) return 'paid';

              if (payment.status === 'active') return 'active';

              if (payment.status === 'upcoming') return 'upcoming';

              if (dueDate.isBefore(now, 'day')) return 'overdue';

              if (dueDate.isSame(now, 'day')) return 'active';

              return 'upcoming';

            })();


            allTransactions.push({
              id: `${app.id}-${payment.dueDate}-${index}`,
              applicationId: app.id,
              applicationName: `Application ${app.id}`,
              vehicleName,
              dueDate: payment.dueDate,
              paidDate: payment.paidDate || null,
              amount: payment.amount || 0,
              status: paymentStatus,
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
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

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

  const downloadPDF = async (transaction?: PaymentTransaction) => {
    // Dynamic import for jsPDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const data = transaction ? [transaction] : filteredTransactions;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 207, 162);
    doc.text(transaction ? 'Payment Receipt' : 'Payment History', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${moment().format('MMMM D, YYYY h:mm A')}`, 14, 30);

    // Simple table layout
    let yPos = 40;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    
    // Headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(0, 207, 162);
    doc.rect(14, yPos - 5, 182, lineHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Application', 16, yPos);
    doc.text('Vehicle', 60, yPos);
    doc.text('Due Date', 100, yPos);
    doc.text('Amount', 140, yPos);
    doc.text('Status', 170, yPos);
    
    yPos += lineHeight;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    // Data rows
    data.forEach((t) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      const rowY = yPos;
      doc.setFontSize(8);
      doc.text(t.applicationName.substring(0, 20), 16, rowY);
      doc.text(t.vehicleName.substring(0, 15), 60, rowY);
      doc.text(formatDate(t.dueDate).substring(0, 10), 100, rowY);
      doc.text(formatCurrency(t.amount), 140, rowY);
      doc.text(t.status.charAt(0).toUpperCase() + t.status.slice(1), 170, rowY);
      
      // Draw line
      doc.setDrawColor(200, 200, 200);
      doc.line(14, rowY + 2, 196, rowY + 2);
      
      yPos += lineHeight + 2;
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(
      transaction
        ? `payment-receipt-${transaction.id}.pdf`
        : `payment-history-${moment().format('YYYY-MM-DD')}.pdf`
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

  if (loading) {
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
            View and download your payment transactions
          </Typography>
        </Box>
      </Box>

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
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="upcoming">Upcoming</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
                      No transactions found
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

