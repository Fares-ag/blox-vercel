import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { MultiStepForm, type StepConfig } from '@shared/components';
import { CustomerInfoStep } from '../../components/CustomerInfoStep/CustomerInfoStep';
import { VehicleSelectionStep } from '../../components/VehicleSelectionStep/VehicleSelectionStep';
import { DealSetupStep } from '../../components/DealSetupStep/DealSetupStep';
import { OfferSelectionStep } from '../../components/OfferSelectionStep/OfferSelectionStep';
import { InstallmentPlanStep } from '../../components/InstallmentPlanStep/InstallmentPlanStep';
import { DocumentUploadStep } from '../../components/DocumentUploadStep/DocumentUploadStep';
import { ReviewStep } from '../../components/ReviewStep/ReviewStep';
import { supabaseApiService } from '@shared/services';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { addApplication } from '../../../../store/slices/applications.slice';
import { toast } from 'react-toastify';
import type { Application, InstallmentPlan } from '@shared/models/application.model';
import type { Product } from '@shared/models/product.model';
import { computeHideInterestDisplay } from '@shared/utils';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import './AddApplicationPage.scss';

function resolveDownPaymentPercent(
  installmentPlan: InstallmentPlan | null | undefined,
  templateVehiclePrice: number
): number {
  const fromStructure = installmentPlan?.paymentStructure?.downPaymentPercent;
  if (typeof fromStructure === 'number' && Number.isFinite(fromStructure)) {
    return fromStructure;
  }
  const dp = Number(installmentPlan?.downPayment);
  if (templateVehiclePrice > 0 && Number.isFinite(dp) && dp >= 0) {
    return (dp / templateVehiclePrice) * 100;
  }
  return 0;
}

/** Scale a template installment plan to a target vehicle price using down-payment %. */
function planForVehicle(
  template: InstallmentPlan | null | undefined,
  vehiclePrice: number,
  downPaymentPercent: number
): InstallmentPlan | null {
  if (!template) return null;
  const downPayment = Math.max(0, (vehiclePrice * downPaymentPercent) / 100);
  const loanAmount = Math.max(vehiclePrice - downPayment, 0);
  const templatePrice = Number((template as any)._templateVehiclePrice) || 0;
  const templateLoan =
    templatePrice > 0
      ? Math.max(templatePrice - (Number(template.downPayment) || 0), 0)
      : Number(template.totalAmount) || 0;
  const scale = templateLoan > 0 ? loanAmount / templateLoan : 1;

  const schedule = (template.schedule || []).map((row) => {
    const amount = Math.round((Number(row.amount) || 0) * scale * 100) / 100;
    return {
      ...row,
      amount,
      remainingAmount: amount,
      paidAmount: 0,
      status: row.status === 'paid' ? 'upcoming' : row.status,
    };
  });

  const monthlyAmount = Math.round((Number(template.monthlyAmount) || 0) * scale * 100) / 100;
  const totalAmount =
    Math.round(schedule.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100 ||
    Math.round(loanAmount * 100) / 100;

  return {
    ...template,
    downPayment: Math.round(downPayment * 100) / 100,
    monthlyAmount,
    totalAmount,
    schedule,
    paymentStructure: {
      ...(template.paymentStructure || {}),
      downPaymentPercent,
    },
  };
}

export const AddApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const portalBase = usePortalBasePath();
  const { user } = useAppSelector((state) => state.auth);
  const isDealer = (user?.role || '').toLowerCase() === 'dealer_agent';

  const steps: StepConfig[] = [
    { label: 'Customer Information', component: CustomerInfoStep },
    { label: 'Vehicle Selection', component: VehicleSelectionStep },
    { label: 'Deal Setup', component: DealSetupStep },
    { label: 'Select Offer', component: OfferSelectionStep },
    { label: 'Installment Plan', component: InstallmentPlanStep },
    { label: 'Upload Documents', component: DocumentUploadStep },
    { label: 'Review Application', component: ReviewStep },
  ];

  const handleSubmit = useCallback(async (data: any) => {
    try {
      const customerInfo = data.customerInfo || {};
      const isCorporate = customerInfo.applicantType === 'corporate';
      const corporate = customerInfo.corporate;

      const customerName = isCorporate
        ? (corporate?.legalName || '').toString().trim() || 'Draft Company'
        : (customerInfo.customerName || '').toString().trim() ||
          `${(customerInfo.firstName || '').toString().trim()} ${(customerInfo.lastName || '').toString().trim()}`.trim() ||
          'Draft Customer';

      const customerEmail = (
        isCorporate
          ? corporate?.authorizedSignatory?.email || customerInfo.email
          : customerInfo.email
      )
        ?.toString()
        .trim()
        .toLowerCase();

      const customerPhone = (
        isCorporate
          ? corporate?.authorizedSignatory?.phone || customerInfo.phone
          : customerInfo.phone
      )
        ?.toString()
        .trim();

      if (!customerEmail) {
        toast.error(
          isCorporate
            ? 'Authorized signatory email is required. The application is only visible to that user’s account.'
            : 'Customer email is required. The application is only visible to that user’s account.'
        );
        return;
      }

      if (!data.agentUserId && isDealer) {
        toast.error('Please select the agent in charge on the Deal Setup step.');
        return;
      }

      const vehicles: Product[] =
        isCorporate && Array.isArray(data.vehicles) && data.vehicles.length > 0
          ? data.vehicles
          : data.vehicle
            ? [data.vehicle]
            : [];

      if (isCorporate && vehicles.length === 0) {
        toast.error('Select at least one vehicle for the corporate application.');
        return;
      }

      const offer = data.offer || null;
      const templatePlan: InstallmentPlan | null = data.installmentPlan || null;
      const templateVehiclePrice =
        Number(data.sellingPrice) ||
        Number(data.vehicle?.price) ||
        Number(vehicles[0]?.price) ||
        0;
      const downPaymentPercent = resolveDownPaymentPercent(templatePlan, templateVehiclePrice);
      const documents = data.documents || [];
      const nowIso = new Date().toISOString();
      // Dealers submit into the credit queue; admins keep draft for ops workflow.
      const initialStatus = isDealer ? 'under_review' : 'draft';

      const bulkBatchId =
        isCorporate && vehicles.length > 1
          ? typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `bulk-${Date.now()}`
          : undefined;

      const sharedCustomerInfo = {
        ...customerInfo,
        applicantType: isCorporate ? 'corporate' : 'individual',
        ...(bulkBatchId ? { bulkBatchId } : {}),
      };

      const created: Application[] = [];
      const failures: string[] = [];

      for (const vehicle of vehicles.length > 0 ? vehicles : [null as unknown as Product]) {
        const listPrice = Number(data.listPrice ?? vehicle?.price) || 0;
        const sellingPrice =
          Number(data.sellingPrice) ||
          (vehicle ? Number(vehicle.price) || 0 : 0) ||
          listPrice;
        const plan =
          vehicle && templatePlan
            ? planForVehicle(
                { ...templatePlan, ...( { _templateVehiclePrice: templateVehiclePrice } as any) },
                sellingPrice,
                downPaymentPercent
              )
            : templatePlan;
        const downPayment = plan?.downPayment !== undefined ? Number(plan.downPayment) : 0;
        const loanAmount = Math.max(sellingPrice - downPayment, 0);

        const internalAnnualRate =
          data.internalAnnualRate != null
            ? Number(data.internalAnnualRate)
            : plan?.annualRentalRate != null
              ? Number(plan.annualRentalRate) > 1
                ? Number(plan.annualRentalRate) / 100
                : Number(plan.annualRentalRate)
              : offer?.annualRentRate != null
                ? Number(offer.annualRentRate) / 100
                : undefined;

        const hideInterest = !!data.hideInterest;
        let customerDisplayPrice = data.customerDisplayPrice;
        let customerDisplayRate = data.customerDisplayRate;
        let pricingSnapshot = data.pricingSnapshot;
        if (hideInterest && plan) {
          const display = computeHideInterestDisplay({
            sellingPrice,
            installmentPlan: plan,
            internalAnnualRate,
          });
          customerDisplayPrice = display.customerDisplayPrice;
          customerDisplayRate = 0;
          pricingSnapshot = display.pricingSnapshot;
        } else if (!hideInterest) {
          customerDisplayPrice = sellingPrice;
          customerDisplayRate =
            internalAnnualRate != null
              ? internalAnnualRate <= 1
                ? internalAnnualRate * 100
                : internalAnnualRate
              : undefined;
        }

        const payload: Omit<Application, 'id' | 'createdAt' | 'updatedAt'> = {
          customerName,
          customerEmail,
          customerPhone: customerPhone || '',
          vehicleId: vehicle?.id || (null as any),
          offerId: offer?.id || (null as any),
          status: initialStatus as any,
          loanAmount,
          downPayment,
          installmentPlan: plan || null,
          documents,
          submissionDate: isDealer ? nowIso : (null as any),
          contractGenerated: false,
          contractSigned: false,
          customerInfo: sharedCustomerInfo as any,
          vehicle: vehicle ? { ...vehicle, price: sellingPrice } : undefined,
          offer: offer || undefined,
          agentUserId: data.agentUserId || user?.id,
          listPrice: listPrice || undefined,
          sellingPrice: sellingPrice || undefined,
          internalAnnualRate,
          hideInterest,
          customerDisplayPrice,
          customerDisplayRate,
          pricingSnapshot,
          ...(isDealer
            ? { submittedAt: nowIso, submittedBy: user?.id }
            : {}),
        } as any;

        const res = await supabaseApiService.createApplication(payload);
        if (res.status === 'SUCCESS' && res.data) {
          created.push(res.data);
          dispatch(addApplication(res.data));
        } else {
          const label = vehicle
            ? `${vehicle.make} ${vehicle.model}`
            : 'application';
          failures.push(`${label}: ${res.message || 'failed'}`);
        }
      }

      if (created.length === 0) {
        throw new Error(failures[0] || 'Failed to create application');
      }

      if (failures.length > 0) {
        toast.warning(
          `Created ${created.length} application(s); ${failures.length} failed. ${failures[0]}`
        );
        navigate(withPortalBase(portalBase, '/applications'));
        return;
      }

      if (created.length > 1) {
        toast.success(
          isDealer
            ? `Submitted ${created.length} applications for credit review.`
            : `Created ${created.length} draft applications for ${customerEmail} (same company batch).`
        );
        navigate(withPortalBase(portalBase, '/applications'));
        return;
      }

      toast.success(
        isDealer
          ? `Application ${created[0].id} submitted for credit review.`
          : `Application ${created[0].id} created for ${customerEmail}. It will show under that customer’s My Applications.`
      );
      navigate(withPortalBase(portalBase, `/applications/view/${created[0].id}`));
    } catch (error: any) {
      console.error('Submission error details:', error);
      toast.error(error.message || 'Failed to create application. Please try again.');
    }
  }, [dispatch, navigate, isDealer, user?.id, portalBase]);

  const handleCancel = useCallback(() => {
    navigate(withPortalBase(portalBase, '/applications'));
  }, [navigate, portalBase]);

  return (
    <Box className="add-application-page">
      <Typography variant="h2" className="page-title">
        Create New Application
      </Typography>
      <MultiStepForm steps={steps} onSubmit={handleSubmit} onCancel={handleCancel} />
    </Box>
  );
};
