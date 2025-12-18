import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowBack,
  Edit,
  CheckCircle,
  Cancel,
  Visibility,
  Download,
  Delete,
  Person,
  DirectionsCar,
  AttachMoney,
  Description,
  Timeline as TimelineIcon,
  AccountBalance,
  Receipt,
  Schedule,
  History,
  Comment,
  Folder,
  Info,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading, updateApplication, removeApplication } from '../../../../store/slices/applications.slice';
import { supabaseApiService } from '@shared/services';
import type { Application, PaymentSchedule } from '@shared/models/application.model';
import { Button, StatusBadge, Loading, HorizontalBarChart, SegmentedBarChart } from '@shared/components';
import { formatDate, formatCurrency, formatDateTable } from '@shared/utils/formatters';
import { parseTenureToMonths } from '@shared/utils/tenure.utils';
import { calculateOwnership } from '@shared/utils/ownership.utils';
import { aggregateDailyScheduleToMonthly, isScheduleLikelyDaily, normalizeInstallmentInterval } from '@shared/utils';
import { toast } from 'react-toastify';
import moment from 'moment';
import type { PaymentStatus } from '@shared/models/application.model';
import { ContractGenerationForm, type ContractFormData } from '../../components/ContractGenerationForm/ContractGenerationForm';
import { ContractReviewDialog, type ReviewAction } from '../../components/ContractReviewDialog/ContractReviewDialog';
import { ResubmissionDialog } from '../../components/ResubmissionDialog/ResubmissionDialog';
import { PaymentConfirmationDialog, type PaymentMethod } from '../../components/PaymentConfirmationDialog/PaymentConfirmationDialog';
import { ContractPdfService } from '@shared/services';
import { supabase } from '@shared/services/supabase.service';
import './ApplicationDetailPage.scss';

// Using only Supabase - no API or localStorage fallbacks

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.applications);
  const [activeTab, setActiveTab] = useState(0);
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [contractReviewOpen, setContractReviewOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [resubmissionDialogOpen, setResubmissionDialogOpen] = useState(false);
  const [requestingResubmission, setRequestingResubmission] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number | null>(null);
  const [markingPaymentPaid, setMarkingPaymentPaid] = useState(false);
  const [convertScheduleDialogOpen, setConvertScheduleDialogOpen] = useState(false);
  const [convertingSchedule, setConvertingSchedule] = useState(false);

  useEffect(() => {
    if (id) {
      loadApplicationDetails(id);
    }
  }, [id]);

  const loadApplicationDetails = async (applicationId: string) => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getApplicationById(applicationId);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load application from Supabase');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to load application details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load application from Supabase';
      toast.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Helper function to create notifications
  const createNotificationForCustomer = async (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    link?: string
  ) => {
    if (!displayData?.customerEmail) return;

    try {
      await supabaseApiService.createNotification({
        userEmail: displayData.customerEmail,
        type,
        title,
        message,
        link,
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
      // Don't throw - notification failure shouldn't break the main action
    }
  };

  const handlePaymentConfirmation = async (paymentMethod: PaymentMethod, proofFile: File | null) => {
    if (!id || selectedPaymentIndex === null || !selected) {
      throw new Error('Missing required information');
    }

    try {
      setMarkingPaymentPaid(true);

      let proofDocumentUrl: string | undefined;
      let proofDocumentName: string | undefined;

      // Upload proof file if provided
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `payment-proof-${id}-${selectedPaymentIndex}-${Date.now()}.${fileExt}`;
        const filePath = `payment-proofs/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, proofFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message || 'Failed to upload proof document');
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        proofDocumentUrl = urlData.publicUrl;
        proofDocumentName = proofFile.name;
      }

      // Update payment schedule
      const currentSchedule = selected.installmentPlan?.schedule || [];
      const updatedSchedule = [...currentSchedule];
      const paymentToUpdate = updatedSchedule[selectedPaymentIndex];
      const paymentAmount = paymentToUpdate.amount;
      
      updatedSchedule[selectedPaymentIndex] = {
        ...paymentToUpdate,
        status: 'paid' as PaymentStatus,
        paidDate: moment().format('YYYY-MM-DD'),
        paymentMethod,
        proofDocument: proofDocumentUrl ? {
          name: proofDocumentName || 'proof.pdf',
          url: proofDocumentUrl,
          uploadedAt: new Date().toISOString(),
        } : undefined,
      };

      // Update application in Supabase
      const updateResponse = await supabaseApiService.updateApplication(id, {
        installmentPlan: {
          ...selected.installmentPlan,
          schedule: updatedSchedule,
        },
      });

      if (updateResponse.status === 'SUCCESS') {
        toast.success(`Installment #${selectedPaymentIndex + 1} marked as paid`);
        
        // Create notification for customer
        await createNotificationForCustomer(
          'success',
          'Payment Confirmed',
          `Your payment of ${formatCurrency(paymentAmount)} for installment #${selectedPaymentIndex + 1} has been confirmed.`,
          `/customer/my-applications/${id}`
        );
        
        // Reload application details
        await loadApplicationDetails(id);
        setPaymentDialogOpen(false);
        setSelectedPaymentIndex(null);
      } else {
        throw new Error(updateResponse.message || 'Failed to update payment');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to confirm payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm payment';
      throw new Error(errorMessage);
    } finally {
      setMarkingPaymentPaid(false);
    }
  };

  if (loading) {
    return <Loading fullScreen message="Loading application details..." />;
  }

  // Generate payment schedule if not present
  const generatePaymentSchedule = (application: Application): PaymentSchedule[] => {
    if (application.installmentPlan?.schedule && application.installmentPlan.schedule.length > 0) {
      return application.installmentPlan.schedule;
    }

    // Generate schedule if missing
    if (!application.installmentPlan || !application.vehicle) {
      return [];
    }

    const schedule: PaymentSchedule[] = [];
    const now = moment().startOf('day');
    const startDate = moment().startOf('month').add(1, 'month'); // Start next month
    
    // Parse tenure consistently: handle both "X Years" and "X Months" formats
    const tenureStr = application.installmentPlan.tenure || '12 Months';
    const tenureMonths = parseTenureToMonths(tenureStr);
    
    const monthlyAmount = application.installmentPlan.monthlyAmount || 0;

    // Determine status using month-level comparison for consistency
    // Past month = paid, current month = active, future = upcoming
    for (let i = 0; i < tenureMonths; i++) {
      const dueDate = moment(startDate).add(i, 'months');
      const isPast = dueDate.isBefore(now, 'month');
      const isCurrentMonth = dueDate.isSame(now, 'month');

      let status: PaymentStatus;
      if (isPast) {
        status = 'paid';
      } else if (isCurrentMonth) {
        status = 'active';
      } else {
        status = 'upcoming';
      }

      schedule.push({
        dueDate: dueDate.format('YYYY-MM-DD'),
        amount: monthlyAmount,
        status,
        paidDate: isPast ? dueDate.format('YYYY-MM-DD') : undefined,
      });
    }

    return schedule;
  };

  // No dummy data - use only selected from Redux/localStorage
  let displayData = selected as Application & {
    aiResponse?: string;
    aiReason?: string;
    adminResponse?: string;
    adminReason?: string;
    assetDistribution?: number;
    customerInfo?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      nationalId?: string;
      gender?: string;
      nationality?: string;
      dateOfBirth?: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      employment?: {
        company?: string;
        position?: string;
        employmentType?: string;
        employmentDuration?: string;
        salary?: number;
      };
      income?: {
        monthlyIncome?: number;
        otherIncome?: number;
        totalIncome?: number;
      };
    };
    dbr?: number;
    durationOfResidence?: string;
    selfEmploymentPeriod?: string;
  };

  // Ensure installment schedule exists
  if (displayData && (!displayData.installmentPlan?.schedule || displayData.installmentPlan.schedule.length === 0)) {
    const generatedSchedule = generatePaymentSchedule(displayData);
    if (generatedSchedule.length > 0) {
      displayData = {
        ...displayData,
        installmentPlan: {
          ...displayData.installmentPlan,
          schedule: generatedSchedule,
        },
      };
    }
  }

  if (!displayData) {
    return (
      <Box className="application-detail-page">
        <Typography variant="h4">Application not found</Typography>
        <Button variant="secondary" onClick={() => navigate('/admin/applications')}>
          Back to List
        </Button>
      </Box>
    );
  }

  const normalizedInterval = normalizeInstallmentInterval(displayData.installmentPlan?.interval);
  const schedule = displayData.installmentPlan?.schedule || [];
  const scheduleLooksDaily = isScheduleLikelyDaily(schedule);
  const canConvertDailyToMonthly =
    !!displayData.installmentPlan &&
    Array.isArray(schedule) &&
    schedule.length > 0 &&
    (normalizedInterval === 'daily' || scheduleLooksDaily);

  const intervalLabel =
    normalizedInterval === 'daily'
      ? 'Daily'
      : normalizedInterval === 'monthly'
        ? 'Monthly'
        : (displayData.installmentPlan?.interval || 'N/A');

  const handleConvertDailyScheduleToMonthly = async () => {
    if (!id || !displayData?.installmentPlan) return;
    if (!displayData.installmentPlan.schedule || displayData.installmentPlan.schedule.length === 0) {
      toast.error('No schedule found to convert.');
      return;
    }

    setConvertingSchedule(true);
    try {
      const monthlySchedule = aggregateDailyScheduleToMonthly(displayData.installmentPlan.schedule);

      if (monthlySchedule.length === 0) {
        throw new Error('Conversion failed: resulting monthly schedule is empty.');
      }

      const updateResponse = await supabaseApiService.updateApplication(id, {
        installmentPlan: {
          ...displayData.installmentPlan,
          interval: 'Monthly',
          schedule: monthlySchedule,
        },
      });

      if (updateResponse.status !== 'SUCCESS') {
        throw new Error(updateResponse.message || 'Failed to update application schedule');
      }

      toast.success('Installment schedule converted to Monthly');
      setConvertScheduleDialogOpen(false);
      await loadApplicationDetails(id);
    } catch (error: unknown) {
      console.error('❌ Failed to convert schedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert schedule';
      toast.error(errorMessage);
    } finally {
      setConvertingSchedule(false);
    }
  };

  const statusMap: Record<string, string> = {
    'draft': 'Draft',
    'under_review': 'Under Review',
    'active': 'Active',
    'completed': 'Completed',
    'submission_cancelled': 'Submission Cancelled',
    'rejected': 'Rejected',
    'contract_signing_required': 'Contract Signing Required',
  };

  // Calculate asset distribution percentages based on real installment data
  const vehiclePrice = displayData.vehicle?.price || 0;
  const downPayment = displayData.downPayment || displayData.installmentPlan?.downPayment || 0;
  let paidInstallmentsTotal = 0;

  if (displayData.installmentPlan?.schedule) {
    displayData.installmentPlan.schedule.forEach((payment) => {
      if (payment.status === 'paid') {
        paidInstallmentsTotal += payment.amount || 0;
      }
    });
  }

  const customerOwnershipAmount = downPayment + paidInstallmentsTotal;
  const rawCustomerOwnershipPercentage =
    vehiclePrice > 0 ? (customerOwnershipAmount / vehiclePrice) * 100 : 0;

  const customerOwnershipPercentage = Math.min(100, Math.max(0, rawCustomerOwnershipPercentage));
  const bloxOwnershipPercentage = 100 - customerOwnershipPercentage;

  const handleApprove = () => {
    // Open contract generation form
    setContractFormOpen(true);
  };

  const handleContractGenerated = async (contractData: ContractFormData) => {
    if (!id || !displayData) return;

    try {
      setApproving(true);

      // Generate payment schedule if not present
      const paymentSchedule = generatePaymentSchedule(displayData);
      
      // Create updated application with contract data
      const updatedApplication: Application = {
        ...displayData,
        status: 'contract_signing_required',
        contractGenerated: true,
        contractData: contractData as any, // Store contract form data
        installmentPlan: {
          ...displayData.installmentPlan,
          schedule: paymentSchedule,
        },
        updatedAt: new Date().toISOString(),
      };

      // Update in Supabase only
      const supabaseResponse = await supabaseApiService.updateApplication(id, {
        status: 'contract_signing_required',
        contractGenerated: true,
        contractData: contractData as any,
        installmentPlan: {
          ...displayData.installmentPlan,
          schedule: paymentSchedule,
        },
      });
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(updateApplication(supabaseResponse.data));
        dispatch(setSelected(supabaseResponse.data));
        toast.success('Application approved and contract generated successfully!');
        
        // Create notification for customer
        await createNotificationForCustomer(
          'success',
          'Contract Ready for Signing',
          `Your application #${id?.slice(0, 8)} has been approved! Please review and sign the contract to proceed.`,
          `/customer/my-applications/${id}/contract`
        );
        
        setContractFormOpen(false);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to update application');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to approve application:', error);
      toast.error(error.message || 'Failed to approve application in Supabase');
    } finally {
      setApproving(false);
    }
  };

  const handleDownloadContract = async () => {
    if (!displayData || !displayData.contractGenerated || !displayData.contractData) {
      toast.error('Contract not yet generated for this application');
      return;
    }

    try {
      const pdfService = new ContractPdfService();
      await pdfService.generateContract({
        application: displayData,
        contractFormData: displayData.contractData,
      });
      pdfService.save(`Contract-${displayData.id}-${moment().format('YYYY-MM-DD')}.pdf`);
      toast.success('Contract downloaded successfully!');
    } catch (error: unknown) {
      console.error('Error generating contract PDF:', error);
      toast.error(error.message || 'Failed to generate contract PDF');
    }
  };

  const handleReviewContract = () => {
    setContractReviewOpen(true);
  };

  const handleContractReview = async (action: ReviewAction, comments: string) => {
    if (!id || !displayData) return;

    try {
      setReviewing(true);

      let newStatus: Application['status'];
      let contractSigned: boolean | undefined = displayData.contractSigned;
      
      switch (action) {
        case 'approve':
          newStatus = 'active';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'resubmit':
          newStatus = 'contract_signing_required';
          contractSigned = false; // Reset signature flag so customer can sign again
          break;
      }

      const updatedApplication: Application = {
        ...displayData,
        status: newStatus,
        contractSigned: contractSigned,
        contractReviewComments: comments || undefined,
        contractReviewDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update in Supabase only
      const supabaseResponse = await supabaseApiService.updateApplication(id, {
        status: newStatus,
        contractSigned: contractSigned,
        contractReviewComments: comments || undefined,
        contractReviewDate: new Date().toISOString(),
      });
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(updateApplication(supabaseResponse.data));
        dispatch(setSelected(supabaseResponse.data));
        
        // Create appropriate notification based on action
        if (action === 'approve') {
          await createNotificationForCustomer(
            'success',
            'Application Activated',
            `Your application #${id?.slice(0, 8)} has been activated! Your financing is now active.`,
            `/customer/my-applications/${id}`
          );
        } else if (action === 'reject') {
          await createNotificationForCustomer(
            'error',
            'Application Rejected',
            `Your application #${id?.slice(0, 8)} has been rejected.${comments ? ` Reason: ${comments}` : ''}`,
            `/customer/my-applications/${id}`
          );
        } else if (action === 'resubmit') {
          await createNotificationForCustomer(
            'warning',
            'Contract Resubmission Required',
            `Your contract for application #${id?.slice(0, 8)} requires resubmission.${comments ? ` ${comments}` : ''}`,
            `/customer/my-applications/${id}/contract`
          );
        }
        
        toast.success(`Contract ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent for resubmission'} successfully!`);
        setContractReviewOpen(false);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to update application');
      }
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to review contract');
    } finally {
      setReviewing(false);
    }
  };

  const handleRequestResubmission = async (comments: string) => {
    if (!id || !displayData) return;

    try {
      setRequestingResubmission(true);

      // Update in Supabase
      const supabaseResponse = await supabaseApiService.updateApplication(id, {
        status: 'resubmission_required',
        resubmissionComments: comments,
        resubmissionDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(updateApplication(supabaseResponse.data));
        dispatch(setSelected(supabaseResponse.data));
        
        // Create notification for customer
        const notificationResponse = await supabaseApiService.createNotification({
          userEmail: displayData.customerEmail,
          type: 'warning',
          title: 'Resubmission Required',
          message: `Your application #${id.slice(0, 8)} requires resubmission. ${comments}`,
          link: `/customer/my-applications/${id}/documents`,
        });
        
        if (notificationResponse.status === 'SUCCESS') {
          toast.success('Resubmission requested successfully! Customer has been notified.');
        } else {
          toast.success('Resubmission requested successfully!');
        }
        
        setResubmissionDialogOpen(false);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to request resubmission');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to request resubmission:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to request resubmission';
      toast.error(errorMessage);
    } finally {
      setRequestingResubmission(false);
    }
  };

  const handleDirectApprove = async () => {
    if (!id || !displayData) return;

    const confirmed = window.confirm('Are you sure you want to approve and activate this application? This will make it active immediately.');
    if (!confirmed) return;

    try {
      // Generate payment schedule if not present
      const paymentSchedule = generatePaymentSchedule(displayData);
      
      // Update in Supabase only
      const supabaseResponse = await supabaseApiService.updateApplication(id, {
        status: 'active',
        installmentPlan: {
          ...displayData.installmentPlan,
          schedule: paymentSchedule,
        },
        updatedAt: new Date().toISOString(),
      });
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(updateApplication(supabaseResponse.data));
        dispatch(setSelected(supabaseResponse.data));
        
        // Create notification for customer
        await createNotificationForCustomer(
          'success',
          'Application Approved',
          `Your application #${id?.slice(0, 8)} has been approved and activated! Your financing is now active.`,
          `/customer/my-applications/${id}`
        );
        
        toast.success('Application approved and activated successfully!');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to approve application');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to approve application:', error);
      toast.error(error.message || 'Failed to approve application');
    }
  };

  const handleActivateDraft = async () => {
    if (!id || !displayData) return;

    const confirmed = window.confirm(
      'Activate this draft application now? This will set the status to Active and start the installment schedule.'
    );
    if (!confirmed) return;

    try {
      // Generate payment schedule if not present
      const paymentSchedule = generatePaymentSchedule(displayData);

      const supabaseResponse = await supabaseApiService.updateApplication(id, {
        status: 'active',
        installmentPlan: {
          ...displayData.installmentPlan,
          schedule: paymentSchedule,
        },
        updatedAt: new Date().toISOString(),
      } as any);

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(updateApplication(supabaseResponse.data));
        dispatch(setSelected(supabaseResponse.data));

        await createNotificationForCustomer(
          'success',
          'Application Activated',
          `Your application #${id?.slice(0, 8)} has been activated! Your financing is now active.`,
          `/customer/my-applications/${id}`
        );

        toast.success('Draft application activated successfully!');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to activate application');
      }
    } catch (error: any) {
      console.error('❌ Failed to activate draft application:', error);
      toast.error(error.message || 'Failed to activate application');
    }
  };

  const handleDeleteApplication = async () => {
    if (!id || !displayData) return;

    const confirmed = window.confirm(
      `Delete application ${id.slice(0, 8)}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const resp = await supabaseApiService.deleteApplication(id);
      if (resp.status !== 'SUCCESS') {
        throw new Error(resp.message || 'Failed to delete application');
      }

      dispatch(removeApplication(id));
      toast.success('Application deleted');
      navigate('/admin/applications');
    } catch (error: any) {
      console.error('❌ Failed to delete application:', error);
      toast.error(error.message || 'Failed to delete application');
    }
  };

  const handleReject = async () => {
    if (!id || !displayData) return;

    const confirmed = window.confirm('Are you sure you want to reject this application? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const updatedApplication: Application = {
        ...displayData,
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      };

      // Update in Supabase only
      const supabaseResponse = await supabaseApiService.updateApplication(id, {
        status: 'rejected',
      });
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(updateApplication(supabaseResponse.data));
        dispatch(setSelected(supabaseResponse.data));
        
        // Create notification for customer
        await createNotificationForCustomer(
          'error',
          'Application Rejected',
          `Unfortunately, your application #${id?.slice(0, 8)} has been rejected. Please contact support for more information.`,
          `/customer/my-applications/${id}`
        );
        
        toast.success('Application rejected successfully!');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to reject application');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to reject application:', error);
      toast.error(error.message || 'Failed to reject application in Supabase');
    }
  };

  return (
    <Box className="application-detail-page">
      {/* Header Section */}
      <Box className="page-header">
        <Box className="header-left">
          <Button variant="secondary" startIcon={<ArrowBack />} onClick={() => navigate('/admin/applications')} className="back-button">
            Back
        </Button>
          <Box className="header-title-section">
            <Typography variant="h2" className="page-title">
              Application Details
            </Typography>
            <Typography variant="body2" className="application-id">
              ID: {displayData.id}
            </Typography>
          </Box>
        </Box>
        <Box className="header-actions">
          <StatusBadge status={statusMap[displayData.status] || displayData.status} type="application" />
          {displayData.status === 'draft' && (
            <Button variant="primary" startIcon={<CheckCircle />} onClick={handleActivateDraft}>
              Activate
            </Button>
          )}
          {(displayData.status === 'under_review') && (
            <>
              <Button variant="primary" startIcon={<Description />} className="approve-button" onClick={handleApprove}>
                Generate Contract & Send to Client
              </Button>
              <Button variant="primary" startIcon={<CheckCircle />} className="approve-button" onClick={handleDirectApprove}>
                Approve & Activate
              </Button>
              <Button 
                variant="secondary" 
                startIcon={<Edit />} 
                className="resubmission-button" 
                onClick={() => setResubmissionDialogOpen(true)}
              >
                Request Resubmission
              </Button>
              <Button variant="secondary" startIcon={<Cancel />} className="reject-button" onClick={handleReject}>
                Reject
              </Button>
            </>
          )}
          {displayData.status === 'contracts_submitted' && (
            <Button variant="primary" startIcon={<Visibility />} onClick={handleReviewContract}>
              Review Contract
            </Button>
          )}
          {displayData.contractGenerated && (
            <Button variant="secondary" startIcon={<Download />} onClick={handleDownloadContract}>
              Download Contract
            </Button>
          )}
          <Button variant="secondary" startIcon={<Delete />} onClick={handleDeleteApplication}>
            Delete
          </Button>
        </Box>
      </Box>

      {/* Cancelled by Customer Alert */}
      {displayData.status === 'submission_cancelled' && displayData.cancelledByCustomer && (
        <Alert severity="warning" icon={<Info />} sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>
            This application was cancelled by the customer
          </Typography>
          {displayData.cancelledAt && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Cancelled on: {formatDate(displayData.cancelledAt)}
            </Typography>
          )}
        </Alert>
      )}

      {/* Tabs */}
      <Paper className="tabs-container">
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          className="detail-tabs"
          aria-label="application detail tabs"
        >
          <Tab label="Overview" />
          <Tab label="Transactions" />
          <Tab label="Installment Schedule" />
          <Tab label="Logs" />
          <Tab label="Comments" />
          <Tab label="Docs" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box className="tab-content">
        {activeTab === 0 && (
          <Box className="detail-content">
        {/* Left Column - Main Content (60%) */}
        <Box className="left-column">
          {/* Customer Information */}
          <Paper className="detail-section">
            <Box className="section-header">
              <Person className="section-icon" />
              <Typography variant="h5" className="section-title">
          Customer Information
        </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Full Name
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.customerInfo?.firstName && displayData.customerInfo?.lastName
                      ? `${displayData.customerInfo.firstName} ${displayData.customerInfo.lastName}`
                      : displayData.customerName}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Email Address
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.customerInfo?.email || displayData.customerEmail}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Phone Number
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.customerInfo?.phone || displayData.customerPhone}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    National ID
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.customerInfo?.nationalId || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Gender
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.customerInfo?.gender || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Nationality
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.customerInfo?.nationality || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              {(displayData.dbr !== undefined) && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      DBR
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {displayData.dbr.toFixed(2)}%
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Duration of Residence
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.durationOfResidence || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Employment Type
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.customerInfo?.employment?.employmentType || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              {displayData.selfEmploymentPeriod && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Self Employment Period
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {displayData.selfEmploymentPeriod}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {displayData.customerInfo?.employment?.employmentDuration && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Employment Duration
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {displayData.customerInfo.employment.employmentDuration}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {displayData.customerInfo?.employment?.company && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Company
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {displayData.customerInfo.employment.company}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {displayData.customerInfo?.employment?.position && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Position
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {displayData.customerInfo.employment.position}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {displayData.customerInfo?.employment?.salary && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Salary
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {formatCurrency(displayData.customerInfo.employment.salary)}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {displayData.customerInfo?.employment?.employmentDuration && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Employment Duration
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {displayData.customerInfo.employment.employmentDuration}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {displayData.customerInfo?.address && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" className="info-label" sx={{ mt: 2, mb: 1 }}>
                      Address
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Street
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.customerInfo.address.street || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        City
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.customerInfo.address.city || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Country
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.customerInfo.address.country || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Postal Code
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.customerInfo.address.postalCode || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Application Date
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {formatDateTable(displayData.createdAt)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Vehicle Information */}
          <Paper className="detail-section">
            <Box className="section-header">
              <DirectionsCar className="section-icon" />
              <Typography variant="h5" className="section-title">
                Vehicle Information
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Vehicle ID
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.vehicleId}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Offer ID
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.offerId}
                  </Typography>
                </Box>
              </Grid>
              {displayData.vehicle ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Make
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.vehicle.make}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Model
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.vehicle.model}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Trim
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.vehicle.trim}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Model Year
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.vehicle.modelYear}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Condition
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.vehicle.condition === 'new' ? 'New' : 'Used'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Engine
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.vehicle.engine}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Color
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.vehicle.color}
                      </Typography>
                    </Box>
                  </Grid>
                  {displayData.vehicle.condition === 'old' && (
                    <Grid item xs={12} sm={6}>
                      <Box className="info-item">
                        <Typography variant="caption" className="info-label">
                          Mileage
                        </Typography>
                        <Typography variant="body1" className="info-value">
                          {displayData.vehicle.mileage?.toLocaleString()} km
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Price
                      </Typography>
                      <Typography variant="body1" className="info-value" sx={{ color: '#00CFA2', fontWeight: 600 }}>
                        {formatCurrency(displayData.vehicle.price)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Status
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {displayData.vehicle.status === 'active' ? 'Active' : 'Inactive'}
                      </Typography>
                    </Box>
                  </Grid>
                  {displayData.vehicle.attributes && displayData.vehicle.attributes.length > 0 && (
                    <>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" className="info-label" sx={{ mb: 2 }}>
                          Additional Attributes
                        </Typography>
                      </Grid>
                      {displayData.vehicle.attributes.map((attr) => (
                        <Grid item xs={12} sm={6} key={attr.id}>
                          <Box className="info-item">
                            <Typography variant="caption" className="info-label">
                              {attr.name}
                            </Typography>
                            <Typography variant="body1" className="info-value">
                              {attr.value}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </>
                  )}
                  {displayData.vehicle.description && (
                    <>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Box className="info-item">
                          <Typography variant="caption" className="info-label" sx={{ mb: 1 }}>
                            Description
                          </Typography>
                          <Typography variant="body1" className="info-value">
                            {displayData.vehicle.description}
                          </Typography>
                        </Box>
                      </Grid>
                    </>
                  )}
                </>
              ) : (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Vehicle information not available
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Terms of Application */}
          {displayData.installmentPlan && (
            <Paper className="detail-section">
              <Box className="section-header">
                <Description className="section-icon" />
                <Typography variant="h5" className="section-title">
                  Terms of Application
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Tenure
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {displayData.installmentPlan.tenure}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Payment Interval
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {intervalLabel}
                    </Typography>
                    {canConvertDailyToMonthly && (
                      <Box sx={{ mt: 1 }}>
                        <Button variant="small" onClick={() => setConvertScheduleDialogOpen(true)}>
                          Convert schedule to Monthly
                        </Button>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Converts the customer’s daily-like payments into one monthly payment per month.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      {displayData.installmentPlan.calculationMethod === 'amortized_fixed'
                        ? 'Monthly Payment'
                        : 'First Month Payment'}
                    </Typography>
                    <Typography variant="body1" className="info-value" sx={{ color: '#00CFA2', fontWeight: 600 }}>
                      {formatCurrency(displayData.installmentPlan.monthlyAmount)}
                    </Typography>
                    {displayData.installmentPlan.calculationMethod !== 'amortized_fixed' && (
                      <Typography
                        variant="caption"
                        sx={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'text.secondary' }}
                      >
                      (Payments decrease over time)
                    </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Total Amount
                    </Typography>
                    <Typography variant="body1" className="info-value" sx={{ color: '#00CFA2', fontWeight: 600 }}>
                      {formatCurrency(displayData.installmentPlan.totalAmount)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Down Payment
                    </Typography>
                    <Typography variant="body1" className="info-value" sx={{ color: '#00CFA2', fontWeight: 600 }}>
                      {formatCurrency(displayData.downPayment)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Loan Amount
                    </Typography>
                    <Typography variant="body1" className="info-value" sx={{ color: '#00CFA2', fontWeight: 600 }}>
                      {formatCurrency(displayData.loanAmount)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Financial Details */}
          <Paper className="detail-section">
            <Box className="section-header">
              <AttachMoney className="section-icon" />
              <Typography variant="h5" className="section-title">
                Financial Details
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Vehicle Price
                  </Typography>
                  <Typography variant="h6" className="info-value highlight">
                    {formatCurrency((displayData.loanAmount || 0) + (displayData.downPayment || 0))}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Down Payment
                  </Typography>
                  <Typography variant="h6" className="info-value">
                    {formatCurrency(displayData.downPayment)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Loan Amount
                  </Typography>
                  <Typography variant="h6" className="info-value highlight">
                    {formatCurrency(displayData.loanAmount)}
                  </Typography>
                </Box>
              </Grid>
              {displayData.installmentPlan && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Monthly Installment
                    </Typography>
                    <Typography variant="h6" className="info-value highlight">
                      {formatCurrency(displayData.installmentPlan.monthlyAmount)}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Signed Contract Section - Show when contract is submitted */}
          {displayData.status === 'contracts_submitted' && displayData.contractSigned && (
            <Paper className="detail-section" sx={{ border: '2px solid #00CFA2', backgroundColor: '#F0FDFA' }}>
              <Box className="section-header">
                <CheckCircle className="section-icon" sx={{ color: '#00CFA2' }} />
                <Typography variant="h5" className="section-title" sx={{ color: '#00CFA2' }}>
                  Signed Contract - Awaiting Review
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Customer has signed and submitted the contract. Please review and take action.
                  </Alert>
                </Grid>
                {displayData.contractSignature && (
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Customer Signature
                      </Typography>
                      <Typography variant="body1" className="info-value" sx={{ fontStyle: 'italic', fontWeight: 600 }}>
                        {displayData.contractSignature}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {displayData.contractSigned && (
                  <Grid item xs={12} sm={6}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Signed Date
                      </Typography>
                      <Typography variant="body1" className="info-value">
                        {formatDate(displayData.updatedAt)}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {displayData.contractReviewComments && (
                  <Grid item xs={12}>
                    <Box className="info-item">
                      <Typography variant="caption" className="info-label">
                        Previous Review Comments
                      </Typography>
                      <Typography variant="body1" className="info-value" sx={{ mt: 1, p: 2, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        {displayData.contractReviewComments}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* Documents Section */}
          <Paper className="detail-section">
            <Box className="section-header">
              <Description className="section-icon" />
              <Typography variant="h5" className="section-title">
                Documents
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            {displayData.documents && displayData.documents.length > 0 ? (
              <Grid container spacing={2}>
                {displayData.documents.map((doc) => (
                  <Grid item xs={12} sm={6} md={4} key={doc.id}>
                    <Box className="document-card">
                      <Description className="document-icon" />
                      <Typography variant="body2" className="document-name">
                        {doc.name}
                      </Typography>
                      <Box className="document-actions">
                        <Tooltip title="View">
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton size="small">
                            <Download fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No documents uploaded yet
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Right Column - Sidebar (40%) */}
        <Box className="right-column">
          {/* Status & Responses */}
          <Paper className="detail-section">
            <Box className="section-header">
              <TimelineIcon className="section-icon" />
              <Typography variant="h5" className="section-title">
                Status & Responses
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box className="status-info">
              <Box className="info-item">
                <Typography variant="caption" className="info-label">
                  Current Status
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <StatusBadge status={statusMap[displayData.status] || displayData.status} type="application" />
                </Box>
              </Box>
          <Box className="info-item">
                <Typography variant="caption" className="info-label">
                  AI Response
                </Typography>
                <Typography variant="body1" className="info-value">
                  {displayData.aiResponse || 'N/A'}
            </Typography>
          </Box>
          <Box className="info-item">
                <Typography variant="caption" className="info-label">
                  AI Reason
            </Typography>
                <Chip
                  label={displayData.aiReason || 'AI Failed'}
                  size="small"
                  color={displayData.aiReason === 'AI Failed' ? 'error' : 'default'}
                  className="reason-chip"
                />
          </Box>
          <Box className="info-item">
                <Typography variant="caption" className="info-label">
                  Admin Response
                </Typography>
                <Typography variant="body1" className="info-value">
                  {displayData.adminResponse || 'N/A'}
            </Typography>
          </Box>
          <Box className="info-item">
                <Typography variant="caption" className="info-label">
                  Admin Reason
                </Typography>
                <Typography variant="body2" className="info-value">
                  {displayData.adminReason || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Asset Distribution */}
          <Paper className="detail-section">
            <Box className="section-header">
              <AccountBalance className="section-icon" />
              <Typography variant="h5" className="section-title">
                Asset Distribution
            </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box className="asset-distribution">
              <HorizontalBarChart
                label="Total Assets Ownership"
                value={100}
                maxValue={100}
                color="#008A6C"
              />
              <Box sx={{ mt: 3 }}>
                <SegmentedBarChart
                  label="Total Assets Distributions"
                  segments={[
                    {
                      label: 'Owned by Customer',
                      value: customerOwnershipPercentage,
                      color: '#E2B13C',
                    },
                    {
                      label: 'Owned by Blox',
                      value: bloxOwnershipPercentage,
                      color: '#09C97F',
                    },
                  ]}
                  total={100}
                />
          </Box>
        </Box>
      </Paper>

          {/* Timeline */}
          <Paper className="detail-section">
            <Box className="section-header">
              <TimelineIcon className="section-icon" />
              <Typography variant="h5" className="section-title">
                Timeline
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box className="timeline">
              <Box className="timeline-item">
                <Box className="timeline-dot" />
                <Box className="timeline-content">
                  <Typography variant="body2" className="timeline-title">
                    Application Submitted
                  </Typography>
                  <Typography variant="caption" className="timeline-date">
                    {formatDateTable(displayData.createdAt)}
                  </Typography>
                </Box>
              </Box>
              {displayData.updatedAt !== displayData.createdAt && (
                <Box className="timeline-item">
                  <Box className="timeline-dot" />
                  <Box className="timeline-content">
                    <Typography variant="body2" className="timeline-title">
                      Last Updated
                    </Typography>
                    <Typography variant="caption" className="timeline-date">
                      {formatDateTable(displayData.updatedAt)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
        )}

        {activeTab === 1 && (
          <Box className="tab-panel">
            <Box sx={{ mb: 3 }}>
              <Box className="section-header" sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Receipt className="section-icon" sx={{ color: '#00CFA2', fontSize: 24 }} />
                <Typography variant="h5" className="section-title" sx={{ fontWeight: 700, color: '#000000', fontFamily: "'IBM Plex Sans', sans-serif", margin: 0 }}>
                  Transactions
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              {(() => {
                // Combine payment history and paid installments from schedule
                const paymentHistory = displayData.paymentHistory || [];
                const paidInstallments = (displayData.installmentPlan?.schedule || [])
                  .filter((s) => s.status === 'paid')
                  .map((s, index) => ({
                    id: `installment-${index}`,
                    amount: s.amount,
                    type: 'Installment Payment',
                    status: 'paid' as PaymentStatus,
                    date: s.paidDate || s.dueDate,
                    receipt: undefined,
                  }));
                
                const allTransactions = [...paymentHistory, ...paidInstallments]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                return allTransactions.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Receipt</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allTransactions.map((payment, index) => (
                          <TableRow key={payment.id || `transaction-${index}`}>
                            <TableCell>{formatDateTable(payment.date)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{payment.type}</TableCell>
                            <TableCell>
                              <StatusBadge status={payment.status} type="payment" />
                            </TableCell>
                            <TableCell align="center">
                              {payment.receipt && (
                                <IconButton size="small" onClick={() => window.open(payment.receipt, '_blank')}>
                                  <Download fontSize="small" />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No transactions found
                  </Typography>
                );
              })()}
            </Box>
          </Box>
        )}

        {activeTab === 2 && (
          <Box className="tab-panel">
            <Box sx={{ mb: 3 }}>
              <Box
                className="section-header"
                sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, justifyContent: 'space-between' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Schedule className="section-icon" sx={{ color: '#00CFA2', fontSize: 24 }} />
                  <Typography
                    variant="h5"
                    className="section-title"
                    sx={{
                      fontWeight: 700,
                      color: '#000000',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      margin: 0,
                    }}
                  >
                    Installment Schedule
                  </Typography>
                  <Chip
                    size="small"
                    label={scheduleLooksDaily ? 'Daily-like schedule' : 'Monthly schedule'}
                    sx={{
                      backgroundColor: scheduleLooksDaily ? '#FEF3C7' : '#D1FAE5',
                      color: scheduleLooksDaily ? '#B45309' : '#047857',
                      fontWeight: 700,
                    }}
                  />
                </Box>

                {canConvertDailyToMonthly && (
                  <Button variant="small" onClick={() => setConvertScheduleDialogOpen(true)}>
                    Convert schedule to Monthly
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 3 }} />
              {displayData.installmentPlan?.schedule && displayData.installmentPlan.schedule.length > 0 ? (
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
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayData.installmentPlan.schedule.map((schedule, index) => {
                        // Calculate ownership for this payment using stored data
                        const vehiclePrice = displayData.vehicle?.price || 0;
                        const downPayment = displayData.downPayment || displayData.installmentPlan?.downPayment || 0;
                        const tenureStr = displayData.installmentPlan?.tenure || '12 Months';
                        
                        // Use utility functions for parsing and calculation
                        const tenureMonths = parseTenureToMonths(tenureStr);
                        const { customerOwnership, bloxOwnership } = calculateOwnership(
                          vehiclePrice,
                          downPayment,
                          tenureMonths,
                          index
                        );
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{formatDateTable(schedule.dueDate)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(schedule.amount)}</TableCell>
                            <TableCell>
                              <StatusBadge status={schedule.status} type="payment" />
                            </TableCell>
                            <TableCell>
                              {schedule.paidDate ? formatDateTable(schedule.paidDate) : '-'}
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
                            {schedule.status !== 'paid' && (
                              <Tooltip title="Mark as Paid">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => {
                                    setSelectedPaymentIndex(index);
                                    setPaymentDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No installment schedule available
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {activeTab === 3 && (
          <Box className="tab-panel">
            <Paper className="detail-section">
              <Box className="section-header">
                <History className="section-icon" />
                <Typography variant="h5" className="section-title">
                  Activity Logs
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box className="timeline">
                <Box className="timeline-item">
                  <Box className="timeline-dot" />
                  <Box className="timeline-content">
                    <Typography variant="body2" className="timeline-title">
                      Application Created
                    </Typography>
                    <Typography variant="caption" className="timeline-date">
                      {formatDateTable(displayData.createdAt)}
                    </Typography>
                  </Box>
                </Box>
                {displayData.submissionDate && (
                  <Box className="timeline-item">
                    <Box className="timeline-dot" />
                    <Box className="timeline-content">
                      <Typography variant="body2" className="timeline-title">
                        Application Submitted
                      </Typography>
                      <Typography variant="caption" className="timeline-date">
                        {formatDateTable(displayData.submissionDate)}
                      </Typography>
                    </Box>
                  </Box>
                )}
                {displayData.updatedAt !== displayData.createdAt && (
                  <Box className="timeline-item">
                    <Box className="timeline-dot" />
                    <Box className="timeline-content">
                      <Typography variant="body2" className="timeline-title">
                        Last Updated
                      </Typography>
                      <Typography variant="caption" className="timeline-date">
                        {formatDateTable(displayData.updatedAt)}
            </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        )}

        {activeTab === 4 && (
          <Box className="tab-panel">
            <Paper className="detail-section">
              <Box className="section-header">
                <Comment className="section-icon" />
                <Typography variant="h5" className="section-title">
                  Comments & Notes
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No comments available
            </Typography>
            </Paper>
          </Box>
        )}

        {activeTab === 5 && (
          <Box className="tab-panel">
            <Paper className="detail-section">
              <Box className="section-header">
                <Folder className="section-icon" />
                <Typography variant="h5" className="section-title">
                  Documents
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              {displayData.documents && displayData.documents.length > 0 ? (
                <Grid container spacing={2}>
                  {displayData.documents.map((doc) => (
                    <Grid item xs={12} sm={6} md={4} key={doc.id}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {doc.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {doc.type} • {formatDateTable(doc.uploadedAt)}
            </Typography>
                          </Box>
                          <Box>
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => window.open(doc.url, '_blank')}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download">
                              <IconButton size="small" onClick={() => window.open(doc.url, '_blank')}>
                                <Download fontSize="small" />
                              </IconButton>
                            </Tooltip>
          </Box>
        </Box>
      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No documents uploaded
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </Box>

      <ContractGenerationForm
        open={contractFormOpen}
        onClose={() => setContractFormOpen(false)}
        onSubmit={handleContractGenerated}
        applicationData={displayData}
        loading={approving}
      />

      <ContractReviewDialog
        open={contractReviewOpen}
        onClose={() => setContractReviewOpen(false)}
        onReview={handleContractReview}
        loading={reviewing}
        applicationId={displayData?.id}
        customerName={displayData?.customerName}
      />

      <ResubmissionDialog
        open={resubmissionDialogOpen}
        onClose={() => setResubmissionDialogOpen(false)}
        onRequestResubmission={handleRequestResubmission}
        loading={requestingResubmission}
        applicationId={displayData?.id}
        customerName={displayData?.customerName}
      />

      {paymentDialogOpen && selectedPaymentIndex !== null && displayData?.installmentPlan?.schedule?.[selectedPaymentIndex] && (
        <PaymentConfirmationDialog
          open={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            setSelectedPaymentIndex(null);
          }}
          onConfirm={handlePaymentConfirmation}
          installmentAmount={displayData.installmentPlan.schedule[selectedPaymentIndex].amount}
          installmentNumber={selectedPaymentIndex + 1}
          dueDate={formatDate(displayData.installmentPlan.schedule[selectedPaymentIndex].dueDate)}
          loading={markingPaymentPaid}
        />
      )}

      <Dialog open={convertScheduleDialogOpen} onClose={() => setConvertScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert installment schedule to Monthly</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will replace the existing <strong>daily</strong> schedule with a <strong>monthly</strong> schedule by summing all daily
            payments within each month.
          </Typography>
          {displayData.installmentPlan?.schedule?.length ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Current schedule entries: <strong>{displayData.installmentPlan.schedule.length}</strong>
              <br />
              Monthly entries after conversion: <strong>{aggregateDailyScheduleToMonthly(displayData.installmentPlan.schedule).length}</strong>
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button variant="secondary" onClick={() => setConvertScheduleDialogOpen(false)} disabled={convertingSchedule}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConvertDailyScheduleToMonthly} loading={convertingSchedule}>
            Convert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
