import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { MultiStepForm, type StepConfig } from '@shared/components';
import { CustomerInfoStep } from '../../components/CustomerInfoStep/CustomerInfoStep';
import { VehicleSelectionStep } from '../../components/VehicleSelectionStep/VehicleSelectionStep';
import { OfferSelectionStep } from '../../components/OfferSelectionStep/OfferSelectionStep';
import { InstallmentPlanStep } from '../../components/InstallmentPlanStep/InstallmentPlanStep';
import { DocumentUploadStep } from '../../components/DocumentUploadStep/DocumentUploadStep';
import { ReviewStep } from '../../components/ReviewStep/ReviewStep';
import { supabaseApiService } from '@shared/services';
import { useAppDispatch } from '../../../../store/hooks';
import { addApplication } from '../../../../store/slices/applications.slice';
import { toast } from 'react-toastify';
import type { Application } from '@shared/models/application.model';
import './AddApplicationPage.scss';

export const AddApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const steps: StepConfig[] = [
    { label: 'Customer Information', component: CustomerInfoStep },
    { label: 'Vehicle Selection', component: VehicleSelectionStep },
    { label: 'Select Offer', component: OfferSelectionStep },
    { label: 'Installment Plan', component: InstallmentPlanStep },
    { label: 'Upload Documents', component: DocumentUploadStep },
    { label: 'Review Application', component: ReviewStep },
  ];

  const handleSubmit = async (data: any) => {
    try {
      // Draft-friendly: allow missing sections/fields.
      const customerInfo = data.customerInfo || {};
      const firstName = (customerInfo.firstName || '').toString().trim();
      const lastName = (customerInfo.lastName || '').toString().trim();
      const customerName =
        (customerInfo.customerName || '').toString().trim() ||
        `${firstName} ${lastName}`.trim() ||
        'Draft Customer';

      const customerEmail = (customerInfo.email || '').toString().trim(); // can be empty for draft
      const customerPhone = (customerInfo.phone || '').toString().trim(); // can be empty for draft

      const vehicle = data.vehicle || null;
      const offer = data.offer || null;
      const installmentPlan = data.installmentPlan || null;

      const vehiclePrice = vehicle?.price ? Number(vehicle.price) : 0;
      const downPayment = installmentPlan?.downPayment !== undefined ? Number(installmentPlan.downPayment) : 0;
      const loanAmount = Math.max(vehiclePrice - downPayment, 0);

      const payload: Omit<Application, 'id' | 'createdAt' | 'updatedAt'> = {
        customerName,
        customerEmail,
        customerPhone,
        vehicleId: vehicle?.id || null,
        offerId: offer?.id || null,
        status: 'draft',
        loanAmount,
        downPayment,
        installmentPlan: installmentPlan || null,
        documents: data.documents || [],
        submissionDate: null,
        contractGenerated: false,
        contractSigned: false,
        customerInfo: customerInfo || null,
        vehicle: vehicle || undefined,
        offer: offer || undefined,
      } as any;

      const res = await supabaseApiService.createApplication(payload);
      if (res.status === 'SUCCESS' && res.data) {
        dispatch(addApplication(res.data));
        toast.success('Draft application created successfully!');
        navigate('/admin/applications');
        return;
      }

      throw new Error(res.message || 'Failed to create application');
    } catch (error: any) {
      console.error('Submission error details:', error);
      toast.error(error.message || 'Failed to create application. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate('/admin/applications');
  };

  return (
    <Box className="add-application-page">
      <Typography variant="h2" className="page-title">
        Create New Application
      </Typography>
      <MultiStepForm steps={steps} onSubmit={handleSubmit} onCancel={handleCancel} />
    </Box>
  );
};
