import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  Paper,
  Chip,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArrowBack,
  FileDownload,
  Description,
  Payment,
  DirectionsCar,
  CheckCircle,
  Upload,
  Receipt,
  Schedule,
  Person,
  Delete,
  Cancel,
  AttachMoney,
  Print,
  CloudUpload,
  Timeline as TimelineIcon,
  EmojiEvents,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading, setError } from '../../../../store/slices/application.slice';
import { supabaseApiService } from '@shared/services';
import type { Application, PaymentSchedule } from '@shared/models/application.model';
import { StatusBadge, Loading, EmptyState, ConfirmDialog } from '@shared/components';
import type { PaymentStatus } from '@shared/models/application.model';
import { formatDate, formatDateTable, formatCurrency } from '@shared/utils/formatters';
import { parseTenureToMonths } from '@shared/utils/tenure.utils';
import { calculateOwnership } from '@shared/utils/ownership.utils';
import { toast } from 'react-toastify';
import { ApplicationTimeline } from '../../components/ApplicationTimeline/ApplicationTimeline';
import type { TimelineEvent } from '../../components/ApplicationTimeline/ApplicationTimeline';
import { OwnershipTimeline } from '../../components/OwnershipTimeline/OwnershipTimeline';
import { BadgeDisplay } from '../../components/BadgeDisplay/BadgeDisplay';
import { ContractPdfService } from '@shared/services';
import './ApplicationDetailPage.scss';

// Dummy data removed - using only localStorage and API

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.application);
  const [activeTab, setActiveTab] = useState(0);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const loadApplicationDetails = useCallback(async (applicationId: string) => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getApplicationById(applicationId);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Application not found');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to load application details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load application details';
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      loadApplicationDetails(id);
    }
  }, [id, loadApplicationDetails, location.key]); // Reload when location changes (navigation)

  const handleDownloadContract = useCallback(async () => {
    // Get current application from selected or Supabase
    const currentApp = selected;
    
    if (!currentApp || !currentApp.contractGenerated || !currentApp.contractData) {
      toast.error('Contract not yet generated for this application');
      return;
    }

    try {
      await ContractPdfService.generateAndSave(
        {
          application: currentApp,
          contractFormData: currentApp.contractData,
        },
        `Contract-${currentApp.id}-${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast.success('Contract downloaded successfully! Please print and sign it.');
    } catch (error: unknown) {
      console.error('Error generating contract PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate contract PDF';
      toast.error(errorMessage);
    }
  }, [selected]);

  const handlePrintContract = useCallback(() => {
    window.print();
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setUploadedFile(file);
    }
  }, []);

  const handleSubmitSignedContract = useCallback(async () => {
    if (!uploadedFile || !id) {
      toast.error('Please upload the signed contract');
      return;
    }

    try {
      setUploading(true);
      
      // Convert file to base64 for storage (in a real app, this would be uploaded to a server)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64File = reader.result as string;
        
        // Update application in Supabase
        if (!id) {
          throw new Error('Application ID is required');
        }
        
        const updateResponse = await supabaseApiService.updateApplication(id, {
          contractSigned: true,
          signedContractFile: base64File,
          signedContractFileName: uploadedFile.name,
          signedContractUploadedAt: new Date().toISOString(),
          status: 'contracts_submitted',
          updatedAt: new Date().toISOString(),
        });
        
        if (updateResponse.status !== 'SUCCESS') {
          throw new Error(updateResponse.message || 'Failed to update application');
        }

        // Reload the application to show updated status
        await loadApplicationDetails(id!);
        
        toast.success('Signed contract uploaded successfully! Your application is now submitted for admin review.');
        setUploadedFile(null);
      };
      
      reader.readAsDataURL(uploadedFile);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload signed contract';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [id, uploadedFile, loadApplicationDetails]);

  const handleSignContract = useCallback(() => {
    navigate(`/customer/applications/${id}/contract/sign`);
  }, [navigate, id]);

  const handleUploadDocument = useCallback(() => {
    navigate(`/customer/applications/${id}/documents/upload`);
  }, [navigate, id]);

  const handleCancelApplication = useCallback(async () => {
    if (!selected || !id) return;

    try {
      // Update in Supabase
      if (!id) {
        throw new Error('Application ID is required');
      }
      
      const updateResponse = await supabaseApiService.updateApplication(id, {
        status: 'submission_cancelled',
        cancelledByCustomer: true,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      if (updateResponse.status !== 'SUCCESS') {
        throw new Error(updateResponse.message || 'Failed to cancel application');
      }

      // Reload application to get updated data
      await loadApplicationDetails(id);
      
      setCancelDialogOpen(false);
      toast.success('Application cancelled successfully');
      navigate('/customer/my-applications');
    } catch (error: unknown) {
      console.error('Error cancelling application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel application';
      toast.error(errorMessage);
    }
  }, [id, selected, loadApplicationDetails, navigate]);

  const handleMakePayment = useCallback((paymentIndex?: number) => {
    // Use selected application from Redux (loaded from Supabase)
    const currentApplication = selected;

    navigate(`/customer/applications/${id}/payment${paymentIndex !== undefined ? `/${paymentIndex}` : ''}`, {
      state: paymentIndex !== undefined && currentApplication?.installmentPlan?.schedule
        ? { amount: currentApplication.installmentPlan.schedule[paymentIndex].amount }
        : {},
    });
  }, [navigate, id, selected]);

  const handleSettleAllPayments = useCallback(async () => {
    if (!selected || !id) return;

    // Calculate total remaining payments
    const remainingPayments = selected.installmentPlan?.schedule?.filter(
      (payment: PaymentSchedule) => payment.status !== 'paid'
    ) || [];

    if (remainingPayments.length === 0) {
      toast.info('All payments have already been settled.');
      return;
    }

    const totalAmount = remainingPayments.reduce((sum: number, payment: PaymentSchedule) => sum + payment.amount, 0);

    // Try to calculate discount (optional - don't block if it fails)
    let finalAmount = totalAmount;
    try {
      const settingsResponse = await supabaseApiService.getSettlementDiscountSettings();
      if (settingsResponse.status === 'SUCCESS' && settingsResponse.data) {
        const { calculateSettlementDiscount } = await import('@shared/utils/settlement-discount.utils');
        const calculation = calculateSettlementDiscount(
          selected,
          remainingPayments,
          settingsResponse.data,
          new Date()
        );
        if (calculation.totalDiscount > 0) {
          finalAmount = calculation.finalAmount;
        }
      }
    } catch (error) {
      // Discount calculation failed - use original amount
      console.debug('Could not calculate discount, using original amount:', error);
    }

    navigate(`/customer/applications/${id}/payment`, {
      state: {
        amount: totalAmount, // Original amount for reference
        finalAmount, // Discounted amount if applicable
        isSettlement: true,
        settleAll: true,
        remainingPayments: remainingPayments.length,
      },
    });
  }, [navigate, id, selected]);

  if (loading) {
    return (
      <Box className="application-detail-page">
        <Loading />
      </Box>
    );
  }

  // Use selected application from Redux (loaded from Supabase)
  const application = selected;

  // Check if application can be cancelled (not active, rejected, or already cancelled)
  const canCancel = application && 
    !['active', 'rejected', 'submission_cancelled', 'completed'].includes(application.status);

  if (!application) {
    return (
      <Box className="application-detail-page">
        <EmptyState
          title="Application not found"
          message="The application you're looking for doesn't exist or has been removed."
        />
        <Button
          variant="outlined"
          onClick={() => navigate('/customer/my-applications')}
          sx={{ mt: 2 }}
        >
          Back to Applications
        </Button>
      </Box>
    );
  }

  return (
    <Box className="application-detail-page">
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate('/customer/my-applications')}
        className="back-button"
      >
        Back to Applications
      </Button>

      {/* Header Section */}
      <Box className="page-header">
        <Box>
          <Typography variant="h4" className="page-title">
            Application #{application.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="page-subtitle">
            Submitted on {formatDate(application.submissionDate || application.createdAt)}
          </Typography>
        </Box>
        <StatusBadge status={application.status} />
      </Box>

      {/* Review Comments Alert */}
      {application.contractReviewComments && (
        <Alert 
          severity={application.status === 'rejected' ? 'error' : application.status === 'contract_signing_required' ? 'warning' : 'info'} 
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            Admin Review Comments:
          </Typography>
          <Typography variant="body2">
            {application.contractReviewComments}
          </Typography>
          {application.contractReviewDate && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Reviewed on: {formatDate(application.contractReviewDate)}
            </Typography>
          )}
        </Alert>
      )}

      {/* Resubmission Comments Alert */}
      {application.resubmissionComments && application.status === 'resubmission_required' && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            Resubmission Required:
          </Typography>
          <Typography variant="body2">
            {application.resubmissionComments}
          </Typography>
          {application.resubmissionDate && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Requested on: {formatDate(application.resubmissionDate)}
            </Typography>
          )}
        </Alert>
      )}

      {/* Contract Signing Section */}
      {application.contractGenerated && 
       application.status !== 'contracts_submitted' && 
       application.status !== 'active' && (
        <Card sx={{ mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              Contract Signing Required
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please download your contract, print it, sign it physically, and then upload the signed copy.
            </Alert>

            <Box>
              {/* Download Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  1. Download Contract
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download the contract PDF to review and sign. Make sure to read all terms and conditions carefully.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<FileDownload />}
                    onClick={handleDownloadContract}
                    sx={{
                      backgroundColor: '#00CFA2',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#00B892',
                      },
                    }}
                  >
                    Download Contract PDF
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handlePrintContract}
                    sx={{
                      borderColor: '#00CFA2',
                      color: '#00CFA2',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#00B892',
                        backgroundColor: 'rgba(0, 207, 162, 0.1)',
                      },
                    }}
                  >
                    Print Contract
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Upload Section */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  2. Upload Signed Contract
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Upload the signed contract PDF. Make sure the file is clear and all signatures are visible.
                </Typography>

                <Box sx={{ maxWidth: 500 }}>
                  <input
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    id="contract-upload"
                    type="file"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="contract-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<CloudUpload />}
                      sx={{
                        borderColor: '#00CFA2',
                        color: '#00CFA2',
                        fontWeight: 600,
                        textTransform: 'none',
                        py: 1.5,
                        mb: 2,
                        '&:hover': {
                          borderColor: '#00B892',
                          backgroundColor: 'rgba(0, 207, 162, 0.1)',
                        },
                      }}
                    >
                      {uploadedFile ? uploadedFile.name : 'Choose Signed Contract PDF'}
                    </Button>
                  </label>

                  {uploadedFile && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        File selected: {uploadedFile.name}
                      </Alert>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={uploading ? undefined : <CheckCircle />}
                        onClick={handleSubmitSignedContract}
                        disabled={uploading}
                        sx={{
                          backgroundColor: '#00CFA2',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          textTransform: 'none',
                          py: 1.5,
                          '&:hover': {
                            backgroundColor: '#00B892',
                          },
                          '&:disabled': {
                            backgroundColor: '#00CFA2',
                            opacity: 0.7,
                          },
                        }}
                      >
                        {uploading ? 'Uploading...' : 'Submit Signed Contract'}
                      </Button>
                    </Box>
                  )}

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Requirements:</strong> PDF format only, maximum file size 10MB. 
                      Make sure all pages are included and signatures are clearly visible.
                    </Typography>
                  </Alert>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box className="action-buttons">
        {application.status === 'contracts_submitted' && (
          <Alert severity="info" sx={{ width: '100%' }}>
            Your contract has been submitted and is awaiting admin review.
          </Alert>
        )}
        {application.contractGenerated && application.contractSigned && application.status !== 'contracts_submitted' && (
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={handleDownloadContract}
            className="download-contract-button"
            sx={{
              backgroundColor: '#16535B',
              color: '#FFFFFF',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#0A6B6A',
              },
            }}
          >
            Download Contract
          </Button>
        )}
        {application.status === 'resubmission_required' && (
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={handleUploadDocument}
            className="primary-action"
          >
            Upload Documents
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Cancel />}
            onClick={() => setCancelDialogOpen(true)}
            className="cancel-action"
          >
            Cancel Application
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper className="tabs-container" sx={{ mb: 3, mt: 3, position: 'relative', zIndex: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => {
            setActiveTab(newValue);
          }}
          className="detail-tabs"
          variant={isSmallScreen ? 'scrollable' : 'fullWidth'}
          scrollButtons={isSmallScreen ? 'auto' : false}
          allowScrollButtonsMobile
          aria-label="application detail tabs"
          sx={{ position: 'relative', zIndex: 2 }}
        >
          <Tab
            label="Overview"
            icon={isMobile ? undefined : <Person />}
            iconPosition="start"
          />
          <Tab
            label={isMobile ? 'Trans.' : 'Transactions'}
            icon={isMobile ? undefined : <Receipt />}
            iconPosition="start"
          />
          <Tab
            label={isMobile ? 'Schedule' : 'Installment Schedule'}
            icon={isMobile ? undefined : <Schedule />}
            iconPosition="start"
          />
          <Tab 
            label={isMobile ? 'Ownership' : 'Ownership Journey'} 
            icon={isMobile ? undefined : <TimelineIcon />} 
            iconPosition="start"
            disabled={application.status !== 'active'}
            sx={{ 
              opacity: application.status === 'active' ? 1 : 0.5,
              cursor: application.status === 'active' ? 'pointer' : 'not-allowed'
            }}
          />
          <Tab 
            label={isMobile ? 'Badges' : 'Achievements'} 
            icon={isMobile ? undefined : <EmojiEvents />} 
            iconPosition="start"
            disabled={application.status !== 'active'}
            sx={{ 
              opacity: application.status === 'active' ? 1 : 0.5,
              cursor: application.status === 'active' ? 'pointer' : 'not-allowed'
            }}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box className="tab-content">
        {activeTab === 0 && (
          <Box className="detail-content">
        {/* Left Column */}
        <Box className="left-column">
          {/* Customer Information */}
          <Card className="detail-card">
            <CardContent>
              <Box className="card-header">
                <Person className="section-icon" />
                <Typography variant="h6" className="section-title">
                  Customer Information
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box className="info-grid">
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.customerName || 'N/A'}
                  </Typography>
                </Box>
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.customerEmail || 'N/A'}
                  </Typography>
                </Box>
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Phone Number
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.customerInfo?.phone || application.customerPhone || 'N/A'}
                  </Typography>
                </Box>
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    National ID
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.customerInfo?.nationalId || 'N/A'}
                  </Typography>
                </Box>
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Gender
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.customerInfo?.gender ? application.customerInfo.gender.charAt(0).toUpperCase() + application.customerInfo.gender.slice(1) : 'N/A'}
                  </Typography>
                </Box>
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Nationality
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.customerInfo?.nationality || 'N/A'}
                  </Typography>
                </Box>
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Duration of Residence
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.customerInfo?.employment?.employmentDuration || 'N/A'}
                  </Typography>
                </Box>
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Employment Type
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.customerInfo?.employment?.employmentType || 'N/A'}
                  </Typography>
                </Box>
                {application.customerInfo?.address && (
                  <Box className="info-item">
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {[
                        application.customerInfo.address.street,
                        application.customerInfo.address.city,
                        application.customerInfo.address.country
                      ].filter(Boolean).join(', ') || 'N/A'}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card className="detail-card">
            <CardContent>
              <Box className="card-header">
                <DirectionsCar className="section-icon" />
                <Typography variant="h6" className="section-title">
                  Vehicle Information
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              {application.vehicle ? (
                <Box className="info-grid">
                  <Box className="info-item">
                    <Typography variant="caption" color="text.secondary">
                      Make & Model
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {application.vehicle.make} {application.vehicle.model}
                    </Typography>
                  </Box>
                  <Box className="info-item">
                    <Typography variant="caption" color="text.secondary">
                      Trim
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {application.vehicle.trim}
                    </Typography>
                  </Box>
                  <Box className="info-item">
                    <Typography variant="caption" color="text.secondary">
                      Year
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {application.vehicle.modelYear}
                    </Typography>
                  </Box>
                  <Box className="info-item">
                    <Typography variant="caption" color="text.secondary">
                      Engine
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {application.vehicle.engine}
                    </Typography>
                  </Box>
                  <Box className="info-item">
                    <Typography variant="caption" color="text.secondary">
                      Color
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {application.vehicle.color}
                    </Typography>
                  </Box>
                  <Box className="info-item">
                    <Typography variant="caption" color="text.secondary">
                      Vehicle Price
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatCurrency(application.vehicle.price)}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Vehicle information not available
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card className="detail-card">
            <CardContent>
              <Box className="card-header">
                <AttachMoney className="section-icon" />
                <Typography variant="h6" className="section-title">
                  Financial Details
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box className="info-grid">
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Loan Amount
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(application.loanAmount)}
                  </Typography>
                </Box>
                <Box className="info-item">
                  <Typography variant="caption" color="text.secondary">
                    Down Payment
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(application.downPayment)}
                  </Typography>
                </Box>
                {application.installmentPlan && (
                  <>
                    <Box className="info-item">
                      <Typography variant="caption" color="text.secondary">
                        Tenure
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {application.installmentPlan.tenure}
                      </Typography>
                    </Box>
                    <Box className="info-item">
                      <Typography variant="caption" color="text.secondary">
                        {application.installmentPlan.calculationMethod === 'amortized_fixed'
                          ? 'Monthly Payment'
                          : 'First Month Payment'}
                      </Typography>
                      <Typography variant="body1" fontWeight={600} className="highlight-amount">
                        {formatCurrency(application.installmentPlan.monthlyAmount)}
                      </Typography>
                      {application.installmentPlan.calculationMethod !== 'amortized_fixed' && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}
                        >
                        (Payments decrease over time)
                      </Typography>
                      )}
                    </Box>
                    <Box className="info-item">
                      <Typography variant="caption" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(application.installmentPlan.totalAmount)}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="detail-card">
            <CardContent>
              <Box className="card-header">
                <Description className="section-icon" />
                <Typography variant="h6" className="section-title">
                  Documents
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              {application.documents && application.documents.length > 0 ? (
                <Box className="documents-list">
                  {application.documents.map((doc) => (
                    <Box key={doc.id} className="document-item">
                      <Box className="document-info">
                        <Typography variant="body2" fontWeight={600}>
                          {doc.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {doc.category} • {formatDateTable(doc.uploadedAt)}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        startIcon={<FileDownload />}
                        onClick={() => toast.info('Download will be implemented')}
                      >
                        Download
                      </Button>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No documents uploaded yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Right Column - Timeline */}
        <Box className="right-column">
          {/* Application Timeline */}
          <Card className="detail-card">
            <CardContent>
              <ApplicationTimeline
                events={[
                  {
                    status: 'draft',
                    date: application.createdAt,
                    note: 'Application created',
                  },
                  {
                    status: application.status,
                    date: application.updatedAt,
                    note: 'Latest status update',
                  },
                ]}
                currentStatus={application.status}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>
        )}

        {activeTab === 1 && (
          <Paper className="tab-panel">
            <Box className="section-header" sx={{ mb: 3 }}>
              <Receipt className="section-icon" />
              <Typography variant="h5" className="section-title">
                Transaction History
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {application.paymentHistory && application.paymentHistory.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Receipt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {application.paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDateTable(payment.date)}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{payment.type}</TableCell>
                        <TableCell>
                          <StatusBadge status={payment.status} type="payment" />
                        </TableCell>
                        <TableCell>
                          {payment.receipt ? (
                            <Button
                              size="small"
                              startIcon={<FileDownload />}
                              onClick={() => toast.info('Download receipt')}
                            >
                              Download
                            </Button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Receipt sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No transactions found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Your payment history will appear here once you make payments
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {activeTab === 2 && (
          <Paper className="tab-panel">
            <Box className="section-header" sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Schedule className="section-icon" />
                <Typography variant="h5" className="section-title">
                  Installment Schedule
                </Typography>
              </Box>
              {application.status === 'active' && application.installmentPlan?.schedule && (() => {
                const remainingPayments = application.installmentPlan.schedule.filter(
                  (payment: PaymentSchedule) => payment.status !== 'paid'
                );
                const totalRemaining = remainingPayments.reduce((sum: number, payment: PaymentSchedule) => sum + payment.amount, 0);
                
                if (remainingPayments.length > 0) {
                  return (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AttachMoney />}
                      onClick={handleSettleAllPayments}
                      sx={{
                        backgroundColor: '#00CFA2',
                        '&:hover': {
                          backgroundColor: '#00B892',
                        },
                      }}
                    >
                      Settle All Remaining ({formatCurrency(totalRemaining)})
                    </Button>
                  );
                }
                return null;
              })()}
            </Box>
            <Divider sx={{ mb: 3 }} />
            {application.installmentPlan && application.installmentPlan.schedule && application.installmentPlan.schedule.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Paid Date</TableCell>
                      <TableCell align="right">Customer Share</TableCell>
                      <TableCell align="right">Blox Share</TableCell>
                      <TableCell align="center">Receipt</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {application.installmentPlan.schedule.map((payment: PaymentSchedule, index: number) => {
                      // Calculate ownership for this payment using stored data
                      const vehiclePrice = application.vehicle?.price || 0;
                      const downPayment = application.downPayment || application.installmentPlan?.downPayment || 0;
                      const tenureStr = application.installmentPlan?.tenure || '12 Months';
                      
                      // Use utility functions for parsing and calculation
                      const tenureMonths = parseTenureToMonths(tenureStr);
                      const { customerOwnership, bloxOwnership, loanAmount, principalPerMonth } = calculateOwnership(
                        vehiclePrice,
                        downPayment,
                        tenureMonths,
                        index
                      );
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{formatDateTable(payment.dueDate)}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            <Box>
                              {formatCurrency(payment.amount)}
                              {payment.paidAmount !== undefined && payment.paidAmount > 0 && (
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Paid: {formatCurrency(payment.paidAmount)}
                                  </Typography>
                                  {payment.remainingAmount !== undefined && payment.remainingAmount > 0 && (
                                    <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                                      Remaining: {formatCurrency(payment.remainingAmount)}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={payment.status} type="payment" />
                          </TableCell>
                          <TableCell>
                            {payment.paidDate ? formatDateTable(payment.paidDate) : '-'}
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight={600} 
                              sx={{ 
                                color: '#F59E0B',
                                backgroundColor: '#FEF3C7',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                display: 'inline-block'
                              }}
                            >
                              {formatCurrency(customerOwnership)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight={600} 
                              sx={{ 
                                color: '#10B981',
                                backgroundColor: '#D1FAE5',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                display: 'inline-block'
                              }}
                            >
                              {formatCurrency(bloxOwnership)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {payment.receiptUrl ? (
                              <Button
                                size="small"
                                startIcon={<FileDownload />}
                                onClick={() => {
                                  window.open(payment.receiptUrl, '_blank');
                                }}
                                variant="outlined"
                              >
                                Download
                              </Button>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {payment.status !== 'paid' && application.status === 'active' && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleMakePayment(index)}
                              >
                                Pay Now
                              </Button>
                            )}
                            {payment.status !== 'paid' && application.status !== 'active' && (
                              <Typography variant="caption" color="text.secondary">
                                Not available
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Schedule sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No installment schedule available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Installment schedule will be generated after contract approval
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Ownership Journey Tab */}
        {activeTab === 3 && (
          <Box>
            {application.status === 'active' ? (
              <OwnershipTimeline application={application} />
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Ownership Journey Unavailable
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This feature is only available for active applications.
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Achievements Tab */}
        {activeTab === 4 && (
          <Box>
            {application.status === 'active' ? (
              <BadgeDisplay application={application} />
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Achievements Unavailable
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This feature is only available for active applications.
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Box>

      {/* Cancel Application Confirmation Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        title="Cancel Application"
        message="Are you sure you want to cancel this application? This action cannot be undone. The application will be marked as cancelled and visible to administrators."
        onConfirm={handleCancelApplication}
        onCancel={() => setCancelDialogOpen(false)}
        confirmText="Cancel Application"
        cancelText="Keep Application"
        variant="danger"
      />
    </Box>
  );
};
