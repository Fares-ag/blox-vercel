import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Person, Email, Phone, Badge as BadgeIcon, Public, People, AttachMoney, WorkspacePremium } from '@mui/icons-material';
import { supabaseApiService } from '@shared/services';
import type { User, Application } from '@shared/models';
import { Button, StatusBadge, Loading } from '@shared/components';
import { formatDate, formatCurrency } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './UserDetailPage.scss';

export const UserDetailPage: React.FC = () => {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (email) {
      loadUserDetails();
    }
  }, [email]);

  const loadUserDetails = async () => {
    if (!email) return;
    
    try {
      setLoading(true);
      
      // Load user
      const userResponse = await supabaseApiService.getUserByEmail(decodeURIComponent(email));
      if (userResponse.status === 'SUCCESS' && userResponse.data) {
        setUser(userResponse.data);
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
    } catch (error: unknown) {
      console.error('❌ Failed to load user details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user details';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  const totalLoanAmount = applications.reduce((sum, app) => sum + (app.loanAmount || 0), 0);
  const activeApplications = applications.filter((app) => app.status === 'active').length;

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
          </Grid>

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
    </Box>
  );
};

