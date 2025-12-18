import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  DescriptionOutlined,
  CreditCard,
  TrendingUp,
  DirectionsCar,
  ArrowForward,
  CheckCircle,
  Schedule,
  AttachMoney,
  Star,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import { StatusBadge, Loading } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import type { Application, PaymentSchedule, BloxMembership } from '@shared/models/application.model';
import { useAppSelector } from '../../../../store/hooks';
import { membershipService } from '../../../../services/membership.service';
import { PurchaseMembershipDialog } from '../../../membership/components/PurchaseMembershipDialog';
import { toast } from 'react-toastify';
import moment from 'moment';
import './DashboardPage.scss';

interface DashboardStats {
  activeApplications: number;
  upcomingPayments: number;
  totalPaid: number;
  remainingBalance: number;
  ownershipPercentage: number;
  nextPaymentDate: string | null;
  nextPaymentAmount: number;
  overduePayments: number;
  totalApplications: number;
}

interface RecentActivity {
  id: string;
  type: 'payment' | 'application' | 'document' | 'contract';
  title: string;
  description: string;
  date: string;
  status: string;
  link?: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeApplications: 0,
    upcomingPayments: 0,
    totalPaid: 0,
    remainingBalance: 0,
    ownershipPercentage: 0,
    nextPaymentDate: null,
    nextPaymentAmount: 0,
    overduePayments: 0,
    totalApplications: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [membership, setMembership] = useState<BloxMembership | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.email) {
      loadDashboardData();
      loadMembershipStatus();
    }
  }, [user?.email]);

  const loadMembershipStatus = async () => {
    try {
      setMembershipLoading(true);
      const status = await membershipService.getMembershipStatus();
      setMembership(status);
    } catch (error) {
      console.error('Failed to load membership status:', error);
      setMembership(null);
    } finally {
      setMembershipLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load applications from Supabase only
      const supabaseResponse = await supabaseApiService.getApplications();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        // Filter to current user's applications by email
        const userEmail = user?.email;
        if (!userEmail) {
          console.warn('⚠️ No user email found, cannot load dashboard data');
          setApplications([]);
          setLoading(false);
          return;
        }
        
        const userApplications = supabaseResponse.data.filter(
          (app) => app.customerEmail?.toLowerCase() === userEmail.toLowerCase()
        );

        setApplications(userApplications);

      // Calculate stats
      const activeStatuses = ['active', 'contract_signing_required', 'contracts_submitted', 'contract_under_review', 'down_payment_required'];
      const activeApps = userApplications.filter((app) => activeStatuses.includes(app.status));
      
      // Calculate payment stats
      const now = moment();
      let upcomingCount = 0;
      let totalPaid = 0;
      let remainingBalance = 0;
      let nextPaymentDate: string | null = null;
      let nextPaymentTs: number | null = null;
      let nextPaymentAmount = 0;
      let overdueCount = 0;

      activeApps.forEach((app) => {
        if (app.installmentPlan?.schedule) {
          app.installmentPlan.schedule.forEach((payment: PaymentSchedule) => {
            const paymentDate = moment(payment.dueDate);
            if (payment.status === 'paid' && payment.paidDate) {
              totalPaid += payment.amount || 0;
            } else if (payment.status === 'upcoming' || payment.status === 'active') {
              const paymentTs = paymentDate.valueOf();
              if (nextPaymentTs === null || paymentTs < nextPaymentTs) {
                nextPaymentTs = paymentTs;
                nextPaymentDate = paymentDate.format();
                nextPaymentAmount = payment.amount || 0;
              }
              // Use day-level comparison for overdue detection (more accurate)
              if (paymentDate.isAfter(now, 'day')) {
                upcomingCount++;
              } else if (paymentDate.isBefore(now, 'day')) {
                overdueCount++;
              }
            }
            remainingBalance += payment.amount || 0;
          });
          
          // Subtract paid amount from remaining balance
          app.installmentPlan.schedule.forEach((payment: PaymentSchedule) => {
            if (payment.status === 'paid') {
              remainingBalance -= payment.amount || 0;
            }
          });
        }
      });

      const totalAssetValue = totalPaid + remainingBalance;
      const ownershipPercentage =
        totalAssetValue > 0 ? (totalPaid / totalAssetValue) * 100 : 0;

      setStats({
        activeApplications: activeApps.length,
        upcomingPayments: upcomingCount,
        totalPaid,
        remainingBalance: Math.max(0, remainingBalance),
        ownershipPercentage,
        nextPaymentDate,
        nextPaymentAmount,
        overduePayments: overdueCount,
        totalApplications: userApplications.length,
      });

      // Generate recent activity
      const activities: RecentActivity[] = [];

      userApplications.forEach((app) => {
        // Application status updates
        activities.push({
          id: `app-${app.id}`,
          type: 'application',
          title: `Application ${app.id}`,
          description: `Status changed to ${app.status.replace(/_/g, ' ')}`,
          date: app.updatedAt || app.createdAt,
          status: app.status,
          link: `/customer/my-applications/${app.id}`,
        });

        // Payment activities
        if (app.installmentPlan?.schedule) {
          app.installmentPlan.schedule.slice(0, 3).forEach((payment: any) => {
            if (payment.status === 'paid') {
              activities.push({
                id: `payment-${app.id}-${payment.dueDate}`,
                type: 'payment',
                title: `Payment for ${app.vehicle?.make} ${app.vehicle?.model}`,
                description: `Payment of ${formatCurrency(payment.amount)} ${payment.paidDate ? 'completed' : 'pending'}`,
                date: payment.paidDate || payment.dueDate,
                status: payment.status,
                link: `/customer/applications/${app.id}/payment`,
              });
            }
          });
        }

        // Contract activities
        if (app.contractGenerated) {
          activities.push({
            id: `contract-${app.id}`,
            type: 'contract',
            title: 'Contract Generated',
            description: `Contract for application ${app.id} is ready for signing`,
            date: app.updatedAt || app.createdAt,
            status: app.contractSigned ? 'signed' : 'pending',
            link: `/customer/applications/${app.id}/contract/sign`,
          });
        }
      });

        // Sort by date (newest first) and take top 10
        activities.sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
        setRecentActivity(activities.slice(0, 10));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load applications');
      }
    } catch (error: any) {
      console.error('❌ Failed to load dashboard data:', error);
      setApplications([]);
      setStats({
        activeApplications: 0,
        upcomingPayments: 0,
        totalPaid: 0,
        remainingBalance: 0,
        ownershipPercentage: 0,
        nextPaymentDate: null,
        nextPaymentAmount: 0,
        overduePayments: 0,
        totalApplications: 0,
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'payment':
        return <CreditCard sx={{ fontSize: 20 }} />;
      case 'application':
        return <DescriptionOutlined sx={{ fontSize: 20 }} />;
      case 'contract':
        return <CheckCircle sx={{ fontSize: 20 }} />;
      case 'document':
        return <AttachMoney sx={{ fontSize: 20 }} />;
      default:
        return <CheckCircle sx={{ fontSize: 20 }} />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'payment':
        return '#00CFA2';
      case 'application':
        return '#2196F3';
      case 'contract':
        return '#FF9800';
      case 'document':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  if (loading) {
    return (
      <Box className="dashboard-page">
        <Loading />
      </Box>
    );
  }

  return (
    <Box className="dashboard-page">
      <Box className="dashboard-header">
        <Typography variant="h4" className="page-title">
          Dashboard
        </Typography>
        <Typography variant="body2" className="page-subtitle">
          Welcome back! Here's an overview of your account.
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Box 
        className="stats-grid-container"
        sx={{
          width: '100%',
          display: 'flex',
          gap: '24px',
          marginBottom: 'var(--spacing-lg)',
          '& > *': {
            flex: '1 1 0',
            minWidth: 0,
          },
          '@media (max-width: 960px)': {
            flexWrap: 'wrap',
            gap: '16px',
            '& > *': {
              flex: '1 1 calc(50% - 8px)',
              minWidth: '250px',
            },
          },
          '@media (max-width: 600px)': {
            '& > *': {
              flex: '1 1 100%',
            },
          },
        }}
      >
        <Card className="stat-card stat-card-primary">
          <CardContent>
            <Box className="stat-header">
              <DescriptionOutlined className="stat-icon" />
              <Chip label={stats.activeApplications} color="primary" size="small" />
            </Box>
            <Typography variant="h6" className="stat-value">
              {stats.activeApplications}
            </Typography>
            <Typography variant="body2" className="stat-label">
              Active Applications
            </Typography>
          </CardContent>
        </Card>

        <Card className="stat-card stat-card-warning">
          <CardContent>
            <Box className="stat-header">
              <Schedule className="stat-icon" />
              {stats.overduePayments > 0 && (
                <Chip label={stats.overduePayments} color="error" size="small" />
              )}
            </Box>
            <Typography variant="h6" className="stat-value">
              {stats.upcomingPayments}
            </Typography>
            <Typography variant="body2" className="stat-label">
              Upcoming Payments
            </Typography>
            {stats.overduePayments > 0 && (
              <Typography variant="caption" className="overdue-notice">
                {stats.overduePayments} overdue
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card stat-card-success">
          <CardContent>
            <Box className="stat-header">
              <TrendingUp className="stat-icon" />
            </Box>
            <Typography variant="h6" className="stat-value">
              {formatCurrency(stats.totalPaid)}
            </Typography>
            <Typography variant="body2" className="stat-label">
              Total Paid
            </Typography>
          </CardContent>
        </Card>

        <Card className="stat-card stat-card-info">
          <CardContent>
            <Box className="stat-header">
              <CreditCard className="stat-icon" />
            </Box>
            <Typography variant="h6" className="stat-value">
              {formatCurrency(stats.remainingBalance)}
            </Typography>
            <Typography variant="body2" className="stat-label">
              Remaining Balance
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Blox Membership Promo */}
      {!membershipLoading && !membership?.isActive && (
        <Paper
          className="blox-membership-cta"
          sx={{
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            background: 'linear-gradient(90deg, #0EA5E9 0%, #22C55E 100%)',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            borderRadius: '16px',
            padding: '18px 24px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star sx={{ color: '#FACC15' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Become a Blox Member
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Unlock up to 3 payment deferrals per year across all your applications.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="inherit"
            onClick={() => setPurchaseDialogOpen(true)}
            sx={{
              color: '#0F172A',
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: 999,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#ffffff',
              },
            }}
          >
            Become a Member
          </Button>
        </Paper>
      )}

      <Box
        className="dashboard-main-content"
        sx={{
          width: '100%',
          display: 'flex',
          gap: '24px',
          alignItems: 'stretch',
          '@media (max-width: 960px)': {
            flexDirection: 'column',
            gap: '16px',
          },
        }}
      >
        {/* Left Column - Quick Actions & Next Payment */}
        <Box
          sx={{
            flex: '1 1 66.666%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            '@media (max-width: 960px)': {
              flex: '1 1 100%',
            },
          }}
        >
          {/* Quick Actions */}
          <Paper className="section-card quick-actions-card" sx={{ mb: 3 }}>
            <Typography variant="h6" className="section-title">
              Quick Actions
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                '@media (max-width: 600px)': {
                  gridTemplateColumns: '1fr',
                },
              }}
            >
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<DirectionsCar />}
                  onClick={() => navigate('/customer/vehicles')}
                  className="quick-action-btn"
                  sx={{ 
                    backgroundColor: '#00CFA2',
                    '&:hover': { backgroundColor: '#00B892' }
                  }}
                >
                  Browse Vehicles
                </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DescriptionOutlined />}
                onClick={() => navigate('/customer/my-applications')}
                className="quick-action-btn"
              >
                My Applications
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<CreditCard />}
                onClick={() => navigate('/customer/payment-calendar')}
                className="quick-action-btn"
              >
                Payment Calendar
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<CreditCard />}
                onClick={() => navigate('/customer/payment-history')}
                className="quick-action-btn"
              >
                Payment History
              </Button>
            </Box>
          </Paper>

          {/* Next Payment */}
          {stats.nextPaymentDate && (
            <Paper className="section-card next-payment-card" sx={{ mb: 3 }}>
              <Box className="next-payment-header">
                <Box>
                  <Typography variant="h6" className="section-title">
                    Next Payment
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Due {moment(stats.nextPaymentDate).format('MMM D, YYYY')}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<CreditCard />}
                  onClick={() => {
                    // Find the application with this payment
                    const app = applications.find((a) => {
                      const schedule = a.installmentPlan?.schedule || [];
                      return schedule.some((p: any) => 
                        moment(p.dueDate).isSame(stats.nextPaymentDate, 'day') && 
                        (p.status === 'upcoming' || p.status === 'active')
                      );
                    });
                    if (app) {
                      navigate(`/customer/applications/${app.id}/payment`);
                    }
                  }}
                  sx={{ 
                    backgroundColor: '#00CFA2',
                    '&:hover': { backgroundColor: '#00B892' }
                  }}
                >
                  Pay Now
                </Button>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box className="next-payment-details">
                <Box className="payment-amount">
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 3,
                      py: 1.5,
                      borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{
                        color: '#FFFFFF',
                        letterSpacing: '0.04em',
                        textShadow: '0 2px 6px rgba(0,0,0,0.35)',
                      }}
                    >
                      {formatCurrency(stats.nextPaymentAmount)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Recent Activity */}
          <Paper className="section-card" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            <Typography variant="h6" className="section-title">
              Recent Activity
            </Typography>
            <Divider sx={{ my: 2 }} />
            {recentActivity.length === 0 ? (
              <Box className="empty-state" sx={{ py: 4, textAlign: 'center', flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent activity
                </Typography>
              </Box>
            ) : (
              <Box className="activity-list" sx={{ flex: 1 }}>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <Box
                      className="activity-item"
                      onClick={() => activity.link && navigate(activity.link)}
                      sx={{ cursor: activity.link ? 'pointer' : 'default' }}
                    >
                      <Box
                        className="activity-icon-wrapper"
                        sx={{ backgroundColor: `${getActivityColor(activity.type)}20` }}
                      >
                        <Box sx={{ color: getActivityColor(activity.type) }}>
                          {getActivityIcon(activity.type)}
                        </Box>
                      </Box>
                      <Box className="activity-content" sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {activity.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          {moment(activity.date).fromNow()}
                        </Typography>
                      </Box>
                      <StatusBadge
                        status={activity.status}
                        type={activity.type === 'payment' ? 'payment' : 'application'}
                      />
                    </Box>
                    {index < recentActivity.length - 1 && <Divider sx={{ my: 1 }} />}
                  </React.Fragment>
                ))}
              </Box>
            )}
          </Paper>
        </Box>

        {/* Right Column - Stats & Applications */}
        <Box
          sx={{
            flex: '1 1 33.333%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            '@media (max-width: 960px)': {
              flex: '1 1 100%',
            },
          }}
        >
          {/* Application Status Overview */}
          <Paper className="section-card" sx={{ mb: 3 }}>
            <Typography variant="h6" className="section-title">
              Application Overview
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box className="application-stats">
              <Box className="stat-item">
                <Typography variant="body2" color="text.secondary">
                  Total Applications
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {stats.totalApplications}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box className="stat-item">
                <Typography variant="body2" color="text.secondary">
                  Active Applications
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {stats.activeApplications}
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              variant="text"
              endIcon={<ArrowForward />}
              onClick={() => navigate('/customer/my-applications')}
              sx={{ mt: 2 }}
            >
              View All Applications
            </Button>
          </Paper>

          {/* Payment Overview */}
          <Paper className="section-card" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            <Typography variant="h6" className="section-title">
              Payment Overview
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box className="payment-overview" sx={{ flex: 1 }}>
              <Box className="payment-stat-item">
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {formatCurrency(stats.totalPaid)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box className="payment-stat-item">
                <Typography variant="body2" color="text.secondary">
                  Remaining Balance
                </Typography>
                <Typography variant="h6" fontWeight={700} color="info.main">
                  {formatCurrency(stats.remainingBalance)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box className="payment-stat-item">
                <Typography variant="body2" color="text.secondary">
                  Ownership
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {stats.ownershipPercentage.toFixed(2)}%
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box className="payment-stat-item">
                <Typography variant="body2" color="text.secondary">
                  Upcoming Payments
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {stats.upcomingPayments}
                </Typography>
              </Box>
              {stats.overduePayments > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Box className="payment-stat-item">
                    <Typography variant="body2" color="error">
                      Overdue Payments
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="error">
                      {stats.overduePayments}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
            <Button
              fullWidth
              variant="text"
              endIcon={<ArrowForward />}
              onClick={() => navigate('/customer/payment-history')}
              sx={{ mt: 2 }}
            >
              View Payment History
            </Button>
          </Paper>
        </Box>
      </Box>

      <PurchaseMembershipDialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        onPurchase={async (type) => {
          try {
            const firstApp = applications[0];
            if (!firstApp) {
              toast.error('You need at least one application to purchase membership.');
              return;
            }
            const result = await membershipService.purchaseMembership(firstApp.id, type);
            setMembership(result);
            toast.success('Blox Membership activated!');
            setPurchaseDialogOpen(false);
          } catch (error: any) {
            console.error('Failed to purchase membership:', error);
            toast.error(error.message || 'Failed to purchase membership');
          }
        }}
        termMonths={36}
      />
    </Box>
  );
};

