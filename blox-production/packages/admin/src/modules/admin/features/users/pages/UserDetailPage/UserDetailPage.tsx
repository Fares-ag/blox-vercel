import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Person, Email, Phone, Badge as BadgeIcon, Public, People, AttachMoney, WorkspacePremium, AccountBalance, Edit } from '@mui/icons-material';
import { supabaseApiService, creditsService, supabase } from '@shared/services';
import type { User, Application, Company } from '@shared/models';
import { Button, StatusBadge, Loading } from '@shared/components';
import { formatDate, formatCurrency } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import { ManageCreditsDialog, type CreditsAction } from '../../components/ManageCreditsDialog';
import type { CreditTransaction } from '@shared/services/credits.service';
import './UserDetailPage.scss';

export const UserDetailPage: React.FC = () => {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [creditsTransactions, setCreditsTransactions] = useState<CreditTransaction[]>([]);
  const [manageCreditsOpen, setManageCreditsOpen] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const [savingCompany, setSavingCompany] = useState(false);

  const loadUserDetails = useCallback(async () => {
    if (!email) return;
    
    try {
      setLoading(true);
      
      // Load user
      const userResponse = await supabaseApiService.getUserByEmail(decodeURIComponent(email));
      if (userResponse.status === 'SUCCESS' && userResponse.data) {
        const userData = userResponse.data;
        setUser(userData);
        setCompanyId(userData.companyId || '');
        // Set credits balance from user data
        if (userData.creditsBalance !== undefined) {
          setCreditsBalance(userData.creditsBalance);
        }
      } else {
        throw new Error(userResponse.message || 'Failed to load user');
      }

      // Load user's applications
      const appsResponse = await supabaseApiService.getApplications();
      if (appsResponse.status === 'SUCCESS' && appsResponse.data) {
        const userApps = appsResponse.data.filter(
          (app) => app.customerEmail?.toLowerCase() === decodeURIComponent(email).toLowerCase()
        );
        setApplications(userApps);
      }

      // Load user's credits (after user is loaded)
      const emailDecoded = decodeURIComponent(email);
      const creditsResponse = await creditsService.getUserCredits(emailDecoded);
      if (creditsResponse.status === 'SUCCESS' && creditsResponse.data) {
        setCreditsBalance(creditsResponse.data.balance || 0);
      }

      // Load credit transactions
      const transactionsResponse = await creditsService.getUserCreditTransactions(emailDecoded, 20);
      if (transactionsResponse.status === 'SUCCESS' && transactionsResponse.data) {
        setCreditsTransactions(transactionsResponse.data);
      }
    } catch (error: unknown) {
      console.error('❌ Failed to load user details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user details';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email]);

  const loadCompanies = useCallback(async () => {
    try {
      setCompaniesLoading(true);
      const res = await supabaseApiService.getCompanies();
      if (res.status === 'SUCCESS' && res.data) {
        setCompanies(res.data);
      }
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  const handleCompanyChange = useCallback(async (nextCompanyId: string) => {
    if (!user?.id) return;
    try {
      setSavingCompany(true);
      setCompanyId(nextCompanyId);
      const res = await supabaseApiService.updateUserCompanyId(
        user.id,
        nextCompanyId ? nextCompanyId : null,
        user.email || undefined
      );
      if (res.status !== 'SUCCESS' || !res.data) {
        throw new Error(res.message || 'Failed to update user company');
      }
      setUser(res.data);
      toast.success('User company updated');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update user company';
      toast.error(msg);
    } finally {
      setSavingCompany(false);
    }
  }, [user?.id]);


  const handleManageCredits = async (action: CreditsAction, amount: number, description: string) => {
    if (!email) return;

    try {
      setCreditsLoading(true);
      const emailDecoded = decodeURIComponent(email);
      
      // Get admin email from auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const adminEmail = authUser?.email || null;

      let result;
      switch (action) {
        case 'add':
          result = await creditsService.addCredits(emailDecoded, amount, description, adminEmail || undefined);
          break;
        case 'subtract':
          result = await creditsService.subtractCredits(emailDecoded, amount, description, adminEmail || undefined);
          break;
        case 'set':
          result = await creditsService.setCredits(emailDecoded, amount, description, adminEmail || undefined);
          break;
      }

      if (result.status === 'SUCCESS' && result.data) {
        toast.success(result.data.message || 'Credits updated successfully');
      // Reload user details to update credits balance
      await loadUserDetails();
      } else {
        throw new Error(result.message || 'Failed to update credits');
      }
    } catch (error: any) {
      console.error('Failed to manage credits:', error);
      toast.error(error.message || 'Failed to update credits');
    } finally {
      setCreditsLoading(false);
    }
  };

  useEffect(() => {
    if (email) {
      loadUserDetails();
      loadCompanies();
    }
  }, [email, loadUserDetails, loadCompanies]);

  const totalLoanAmount = useMemo(() => 
    applications.reduce((sum, app) => sum + (app.loanAmount || 0), 0),
    [applications]
  );

  const activeApplications = useMemo(() => 
    applications.filter((app) => app.status === 'active').length,
    [applications]
  );

  if (loading && !user) {
    return <Loading fullScreen message="Loading user details..." />;
  }

  if (!user) {
    return (
      <Box className="user-detail-page">
        <Button variant="secondary" startIcon={<ArrowBack />} onClick={() => navigate('/admin/users')}>
          Back to Users
        </Button>
        <Typography variant="h6" sx={{ mt: 2 }}>
          User not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="user-detail-page">
      <Button variant="secondary" startIcon={<ArrowBack />} onClick={() => navigate('/admin/users')} className="back-button">
        Back to Users
      </Button>

      <Box className="page-header">
        <Box className="header-left">
          <Typography variant="h2" className="page-title">
            User Details
          </Typography>
          <Typography variant="body2" className="user-email" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* User Information */}
        <Grid item xs={12} md={4}>
          <Paper className="info-card">
            <Typography variant="h6" className="card-title" gutterBottom>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box className="info-item">
              <Box className="info-label">
                <Person sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Name</Typography>
              </Box>
              <Typography variant="body1" fontWeight={600}>
                {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}
              </Typography>
            </Box>

            <Box className="info-item">
              <Box className="info-label">
                <Email sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Email</Typography>
              </Box>
              <Typography variant="body1" fontWeight={600}>
                {user.email}
              </Typography>
            </Box>

            <Box className="info-item">
              <Box className="info-label">
                <Typography variant="body2" color="text.secondary">Company</Typography>
              </Box>
              <FormControl size="small" fullWidth disabled={companiesLoading || savingCompany}>
                <InputLabel id="user-company-select-label">Company</InputLabel>
                <Select
                  labelId="user-company-select-label"
                  label="Company"
                  value={companyId}
                  onChange={(e) => handleCompanyChange(String(e.target.value))}
                >
                  <MenuItem value="">No company</MenuItem>
                  {companies.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}{c.code ? ` (${c.code})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box className="info-item">
              <Box className="info-label">
                <Phone sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Phone</Typography>
              </Box>
              <Typography variant="body1" fontWeight={600}>
                {user.phone || 'N/A'}
              </Typography>
            </Box>

            <Box className="info-item">
              <Box className="info-label">
                <BadgeIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">National ID</Typography>
              </Box>
              <Typography variant="body1" fontWeight={600}>
                {user.nationalId || 'N/A'}
              </Typography>
            </Box>

            <Box className="info-item">
              <Box className="info-label">
                <Public sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Nationality</Typography>
              </Box>
              <Typography variant="body1" fontWeight={600}>
                {user.nationality || 'N/A'}
              </Typography>
            </Box>

            {user.gender && (
              <Box className="info-item">
                <Box className="info-label">
                  <Person sx={{ mr: 1, fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary">Gender</Typography>
                </Box>
                <Typography variant="body1" fontWeight={600}>
                  {user.gender}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Box className="stat-header">
                    <People color="primary" />
                    <Typography variant="h4" className="stat-value">
                      {user.totalApplications || 0}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Applications
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Box className="stat-header">
                    <AttachMoney color="success" />
                    <Typography variant="h4" className="stat-value">
                      {activeApplications}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Applications
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Box className="stat-header">
                    <AttachMoney color="primary" />
                    <Typography variant="h4" className="stat-value">
                      {formatCurrency(totalLoanAmount)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Loan Amount
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Box className="stat-header">
                    <WorkspacePremium color={user.membershipStatus === 'active' ? 'success' : 'action'} />
                    <Chip
                      label={user.membershipStatus === 'active' ? 'Active' : user.membershipStatus === 'inactive' ? 'Inactive' : 'None'}
                      color={user.membershipStatus === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Membership Status
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card className="stat-card">
                <CardContent>
                  <Box className="stat-header" sx={{ justifyContent: 'space-between', mb: 1 }}>
                    <AccountBalance color="primary" />
                    <Tooltip title="Manage Credits">
                      <IconButton
                        size="small"
                        onClick={() => setManageCreditsOpen(true)}
                        sx={{ ml: 'auto' }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="h4" className="stat-value">
                    {creditsBalance.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Blox Credits
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Credits Transactions */}
          <Paper className="credits-transactions-card" sx={{ mt: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" className="card-title">
                Credit Transactions ({creditsTransactions.length})
              </Typography>
              <Button
                variant="primary"
                startIcon={<Edit />}
                onClick={() => setManageCreditsOpen(true)}
                size="small"
              >
                Manage Credits
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {creditsTransactions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No credit transactions found
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Balance Before</TableCell>
                      <TableCell align="right">Balance After</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Admin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {creditsTransactions.map((transaction) => (
                      <TableRow key={transaction.id} hover>
                        <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                        <TableCell>
                          <Chip
                            label={transaction.transactionType.toUpperCase()}
                            color={
                              transaction.transactionType === 'add' || transaction.transactionType === 'topup'
                                ? 'success'
                                : transaction.transactionType === 'subtract' || transaction.transactionType === 'payment'
                                ? 'error'
                                : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={
                              transaction.transactionType === 'add' || transaction.transactionType === 'topup'
                                ? 'success.main'
                                : transaction.transactionType === 'subtract' || transaction.transactionType === 'payment'
                                ? 'error.main'
                                : 'text.primary'
                            }
                          >
                            {transaction.transactionType === 'add' || transaction.transactionType === 'topup' ? '+' : '-'}
                            {transaction.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{transaction.balanceBefore.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {transaction.balanceAfter.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>{transaction.description || 'N/A'}</TableCell>
                        <TableCell>{transaction.adminEmail || 'System'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Applications List */}
          <Paper className="applications-card" sx={{ mt: 3 }}>
            <Typography variant="h6" className="card-title" gutterBottom>
              Applications ({applications.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {applications.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No applications found
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Application ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>Loan Amount</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id} hover>
                        <TableCell>{app.id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} type="application" />
                        </TableCell>
                        <TableCell>
                          {app.vehicle?.make} {app.vehicle?.model}
                        </TableCell>
                        <TableCell>{formatCurrency(app.loanAmount || 0)}</TableCell>
                        <TableCell>{app.createdAt ? formatDate(app.createdAt) : 'N/A'}</TableCell>
                        <TableCell align="right">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => navigate(`/admin/applications/view/${app.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Manage Credits Dialog */}
      {user && (
        <ManageCreditsDialog
          open={manageCreditsOpen}
          onClose={() => setManageCreditsOpen(false)}
          onSave={handleManageCredits}
          userEmail={user.email || ''}
          currentBalance={creditsBalance}
          loading={creditsLoading}
        />
      )}
    </Box>
  );
};

