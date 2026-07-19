import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Checkbox,
  FormControlLabel,
  Link,
  Tabs,
  Tab,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Button } from '@shared/components';
import {
  ArrowBack,
  Person,
  Email,
  CreditCard,
  Phone,
  Visibility,
  VisibilityOff,
  CloudUpload,
  Delete,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input, Select, type SelectOption } from '@shared/components';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setCredentials, logout as logoutAction } from '../../../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import type { Product } from '@shared/models/product.model';
import type { Application, ApplicationStatus } from '@shared/models/application.model';
import type { Offer } from '@shared/models/offer.model';
import { Loading, EmptyState } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import { supabase } from '@shared/services/supabase.service';
import { devLogger } from '@shared/utils/logger.util';
import { customerAuthService } from '../../../../services/customerAuth.service';
import { vehicleService, CUSTOMER_MAX_VEHICLE_PRICE_QAR } from '../../../../services/vehicle.service';
import { toast } from 'react-toastify';
import { MembershipConfig } from '@shared/config/app.config';
import { formatMonthsToTenure } from '@shared/utils/tenure.utils';
import { getNationalityFromQID, getAllNationalityOptions } from '@shared/utils/nationality.utils';
import moment from 'moment';
import './CreateApplicationPage.scss';

// Schema will be created dynamically based on authentication status
const createApplicationSchema = (isAuthenticated: boolean) => {
  const baseSchema = {
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    nationalId: yup.string().required('National ID is required').length(11, 'National ID must be 11 digits'),
    phone: yup.string().required('Phone number is required'),
    nationality: yup.string().required('Nationality is required'),
    gender: yup.string().required('Gender is required'),
    authorizeCreditCheck: yup.boolean().default(false).oneOf([true], 'You must authorize the credit bureau check'),
    acceptTerms: yup.boolean().default(false).oneOf([true], 'You must accept the terms & conditions'),
  };

  // Only require password fields if user is not authenticated
  if (!isAuthenticated) {
    return yup.object({
      ...baseSchema,
      password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
      confirmPassword: yup
        .string()
        .oneOf([yup.ref('password')], 'Passwords must match')
        .required('Please confirm your password'),
    });
  }

  return yup.object({
    ...baseSchema,
    // Keep fields defined (string) for typing, but not required for authenticated users
    password: yup.string().defined(),
    confirmPassword: yup.string().defined(),
  });
};

interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  nationalId: string;
  phone: string;
  nationality: string;
  gender: string;
  password: string;
  confirmPassword: string;
  authorizeCreditCheck: boolean;
  acceptTerms: boolean;
}

interface DocumentFile {
  id: string;
  name: string;
  file: File;
  category: string;
  url?: string;
}

const documentCategories = [
  { id: 'qatar-id', label: '1. Qatar Id', required: true },
  { id: 'bank-statement', label: '2. Bank Statement', required: true },
  { id: 'salary-certificate', label: '3. Salary Certificates', required: true },
  { id: 'additional', label: '4. Additional Documents (Optional)', required: false },
];

const genderOptions: SelectOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const CreateApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, initialized } = useAppSelector((state) => state.auth);
  // Only treat true customer sessions as logged-in apply; non-customer sessions must not
  // skip password/signup (and are redirected away below).
  const isCustomerSession = isAuthenticated && user?.role === 'customer';
  const [vehicle, setVehicle] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeDocumentTab, setActiveDocumentTab] = useState(0);
  const [documents, setDocuments] = useState<Record<string, DocumentFile>>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [checkingApplications, setCheckingApplications] = useState(true);

  // Get data from URL params
  const vehicleId = searchParams.get('vehicleId');
  const downPayment = parseFloat(searchParams.get('downPayment') || '0');
  const termMonths = parseInt(searchParams.get('termMonths') || '0');
  const salary = parseFloat(searchParams.get('salary') || '0');
  const durationOfResidence = searchParams.get('durationOfResidence') || '';
  // const monthlyLiabilities = searchParams.get('monthlyLiabilities') || ''; // Currently unused
  const employmentType = searchParams.get('employmentType') || '';
  const hasBloxMembership = searchParams.get('hasBloxMembership') === 'true';
  const membershipType = (searchParams.get('membershipType') as 'monthly' | 'yearly') || 'monthly';
  const loanAmount = parseFloat(searchParams.get('loanAmount') || '0');
  const monthlyPayment = parseFloat(searchParams.get('monthlyPayment') || '0');
  const totalRent = parseFloat(searchParams.get('totalRent') || '0');
  const annualRentalRate = parseFloat(searchParams.get('annualRentalRate') || '0');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<ApplicationFormData>({
    resolver: yupResolver(createApplicationSchema(isCustomerSession)),
    defaultValues: {
      firstName: isCustomerSession ? user?.name?.split(' ')[0] || '' : '',
      lastName: isCustomerSession ? user?.name?.split(' ').slice(1).join(' ') || '' : '',
      email: isCustomerSession ? user?.email || '' : '',
      nationalId: '',
      phone: '',
      nationality: '',
      gender: '',
      password: '',
      confirmPassword: '',
      authorizeCreditCheck: false,
      acceptTerms: false,
    },
  });

  // Public route: kick non-customer sessions so admin JWTs cannot submit as "logged in".
  useEffect(() => {
    if (!initialized) return;
    if (isAuthenticated && user?.role !== 'customer') {
      void customerAuthService
        .logout()
        .catch(() => undefined)
        .finally(() => {
          dispatch(logoutAction());
          navigate('/customer/auth/login?reason=not_customer', { replace: true });
        });
    }
  }, [initialized, isAuthenticated, user?.role, navigate, dispatch]);

  // Get all nationality options from the country code map
  const nationalityOptions: SelectOption[] = React.useMemo(() => {
    try {
      const options = getAllNationalityOptions();
      devLogger.debug('Nationality options loaded:', options.length);
      return options;
    } catch (error: unknown) {
      devLogger.error('Error loading nationality options:', error);
      return [];
    }
  }, []);

  const nationalIdValue = watch('nationalId');
  const currentNationality = watch('nationality');

  // Auto-fill nationality based on National ID (QID)
  useEffect(() => {
    if (nationalIdValue && nationalIdValue.length === 11) {
      const detectedNationality = getNationalityFromQID(nationalIdValue);
      if (detectedNationality) {
        // Find matching option by label (exact match)
        const nationalityOption = nationalityOptions.find(
          opt => opt.label.toLowerCase() === detectedNationality.toLowerCase()
        );
        if (nationalityOption) {
          // Only auto-fill if nationality is empty or matches the detected one
          if (!currentNationality || currentNationality === String(nationalityOption.value)) {
            setValue('nationality', String(nationalityOption.value), { shouldValidate: true });
          }
        }
      }
    }
  }, [nationalIdValue, currentNationality, setValue, nationalityOptions]);

  // Fetch and pre-fill user metadata when authenticated
  useEffect(() => {
    const fetchUserMetadata = async () => {
      if (isCustomerSession && user?.id) {
        try {
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          if (supabaseUser?.user_metadata) {
            const metadata = supabaseUser.user_metadata;
            // Update form with user metadata
            reset({
              firstName: user?.name?.split(' ')[0] || metadata.first_name || '',
              lastName: user?.name?.split(' ').slice(1).join(' ') || metadata.last_name || '',
              email: user?.email || '',
              nationalId: metadata.qid || '',
              phone: metadata.phone_number || '',
              nationality: metadata.nationality || '',
              gender: metadata.gender?.toLowerCase() || '',
              password: '',
              confirmPassword: '',
              authorizeCreditCheck: false,
              acceptTerms: false,
            });
          }
        } catch (error) {
          console.error('Error fetching user metadata:', error);
        }
      }
    };
    fetchUserMetadata();
  }, [isCustomerSession, user?.id, user?.name, user?.email, reset]);

  const authorizeCreditCheck = watch('authorizeCreditCheck');
  const acceptTerms = watch('acceptTerms');

  // Check for existing applications that would block new application
  useEffect(() => {
    const checkExistingApplications = async () => {
      try {
        setCheckingApplications(true);
        
        // Get customer email (from form default or user)
        const customerEmail = user?.email || '';
        if (!customerEmail) {
          // Can't check without email, allow form to proceed
          setCheckingApplications(false);
          return;
        }

        // Check applications from Supabase
        const supabaseResponse = await supabaseApiService.getApplications();
        const allApplications: Application[] = supabaseResponse.status === 'SUCCESS' && supabaseResponse.data 
          ? supabaseResponse.data 
          : [];

        // Find applications for this customer (by email)
        const customerApplications = allApplications.filter(
          (app) => app.customerEmail.toLowerCase() === customerEmail.toLowerCase()
        );

        // Keep in sync with public.has_blocking_application (active financing blocks; completed does not).
        const blockingStatuses: ApplicationStatus[] = [
          'active',
          'under_review',
          'contract_signing_required',
          'resubmission_required',
          'contracts_submitted',
          'contract_under_review',
          'down_payment_required',
          'down_payment_submitted',
        ];

        const blockingApplication = customerApplications.find((app) =>
          blockingStatuses.includes(app.status)
        );

        if (blockingApplication) {
          setExistingApplication(blockingApplication);
        }
      } catch (error) {
        console.error('Error checking existing applications:', error);
      } finally {
        setCheckingApplications(false);
      }
    };

    checkExistingApplications();
  }, [user?.email]);

  useEffect(() => {
    if (vehicleId) {
      loadVehicle(vehicleId);
    } else {
      toast.error('Vehicle ID is required');
      navigate('/customer/vehicles');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const loadVehicle = async (id: string) => {
    try {
      setLoading(true);

      // Enforce ≤70k customer catalog rule (same as browse/detail)
      const response = await vehicleService.getVehicleById(id);

      if (response.status === 'SUCCESS' && response.data && response.data.status === 'active') {
        if (response.data.price > CUSTOMER_MAX_VEHICLE_PRICE_QAR) {
          toast.error('This vehicle is not available for customer applications');
          navigate('/customer/vehicles');
          return;
        }
        setVehicle(response.data);
      } else {
        toast.error(response.message || 'Vehicle not found or inactive');
        navigate('/customer/vehicles');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load vehicle details';
      console.error('❌ Failed to load vehicle details:', error);
      toast.error(errorMessage);
      navigate('/customer/vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(
    async (category: string, file: File) => {
      // Keep File locally until application is created, then upload with real id
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB');
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PNG, JPG, and PDF files are allowed');
        return;
      }

      setUploading((prev) => ({ ...prev, [category]: true }));

      try {
        setDocuments((prev) => ({
          ...prev,
          [category]: {
            id: `doc-${Date.now()}`,
            name: file.name,
            file,
            category,
          },
        }));
        toast.success('Document attached. It will be uploaded when you submit.');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to attach document';
        toast.error(errorMessage);
      } finally {
        setUploading((prev) => ({ ...prev, [category]: false }));
      }
    },
    []
  );

  const uploadDocumentsForApplication = async (
    applicationId: string,
    docs: Record<string, DocumentFile>
  ) => {
    const uploaded: Array<{
      id: string;
      name: string;
      type: string;
      category: string;
      url: string;
      uploadedAt: string;
    }> = [];

    for (const doc of Object.values(docs)) {
      if (!doc.file) {
        throw new Error(`Missing file for ${doc.category}`);
      }
      const fileExt = doc.file.name.split('.').pop() || 'bin';
      const fileName = `${Date.now()}-${doc.category}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `application-documents/${applicationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, doc.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || `Failed to upload ${doc.name}`);
      }

      // Bucket is private — store path; public URL is not readable without signing.
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      uploaded.push({
        id: `DOC${Date.now()}-${doc.category}`,
        name: doc.name || `${doc.category} document`,
        type: doc.file.type || 'application/pdf',
        category: doc.category,
        path: filePath,
        url: urlData?.publicUrl || filePath,
        uploadedAt: new Date().toISOString(),
      });
    }

    return uploaded;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const category = documentCategories[activeDocumentTab].id;
        handleFileUpload(category, e.dataTransfer.files[0]);
      }
    },
    [activeDocumentTab, handleFileUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const category = documentCategories[activeDocumentTab].id;
      handleFileUpload(category, e.target.files[0]);
    }
  };

  const handleRemoveDocument = (category: string) => {
    setDocuments((prev) => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
  };

  const onSubmit = async (data: ApplicationFormData) => {
    devLogger.debug('Form submitted with data:', data);
    devLogger.debug('Form errors:', errors);

    // Match DB / RLS: when logged in, use session email (same as JWT), not a differently cased form value.
    const resolvedCustomerEmail =
      isCustomerSession && user?.email
        ? user.email.trim().toLowerCase()
        : data.email.trim().toLowerCase();

    if (!vehicle) {
      toast.error('Vehicle information is missing');
      return;
    }

    if (!downPayment || !termMonths || !salary || !employmentType) {
      toast.error('Please complete all installment details');
      navigate(`/customer/vehicles/${vehicleId}`);
      return;
    }

    try {
      setSubmitting(true);
      console.log('Starting application submission...');

      // Blocking check via SECURITY DEFINER RPC (works for anon/guest; RLS SELECT does not).
      const customerEmail = resolvedCustomerEmail;
      const { data: blockingAppId, error: blockingRpcError } = await supabase.rpc(
        'has_blocking_application',
        { p_email: customerEmail }
      );
      // Fail closed — never allow submit when we cannot verify blocking status.
      if (blockingRpcError) {
        console.error('has_blocking_application RPC failed:', blockingRpcError.message);
        toast.error(
          'We could not verify whether you already have an application. Please try again.'
        );
        return;
      }
      if (typeof blockingAppId === 'string' && blockingAppId.length > 0) {
        toast.error(
          'You already have an application in progress. Please wait until it is approved or rejected before applying again.'
        );
        if (isCustomerSession) {
          navigate(`/customer/my-applications/${blockingAppId}`);
        } else {
          navigate('/customer/auth/login');
        }
        return;
      }

      /** When email confirmation is on, signUp returns session null — DB insert uses RPC instead of RLS. */
      let signupAuthUserId: string | undefined;

      // If user is not authenticated, create account first, then submit application (session or RPC).
      if (!isCustomerSession && data.password) {
        try {
          console.log('Creating user account...');
          const { user: newUser, session: newSession } = await customerAuthService.signup({
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone_number: data.phone,
            qid: data.nationalId,
            gender: data.gender === 'male' ? 'Male' : 'Female',
            nationality: data.nationality,
            password: data.password,
            confirm_password: data.confirmPassword,
          });

          if (newSession?.user) {
            const u = newSession.user;
            const mappedUser: User = {
              id: u.id,
              email: u.email || '',
              name:
                u.user_metadata?.first_name && u.user_metadata?.last_name
                  ? `${u.user_metadata.first_name} ${u.user_metadata.last_name}`.trim()
                  : u.email || '',
              role: u.user_metadata?.role || 'customer',
              permissions: u.user_metadata?.permissions || [],
            };
            dispatch(setCredentials({ user: mappedUser, token: newSession.access_token }));
            // Do not toast account success here — wait until the application row is saved.
          } else if (newUser?.id) {
            // Email confirm pending: no JWT yet — create via RPC after this block.
            // Do not toast success here; wait until the application row is saved.
            signupAuthUserId = newUser.id;
          } else {
            toast.error('Account could not be created. Please try again or log in.');
            return;
          }
        } catch (signupError: unknown) {
          const errorMessage = signupError instanceof Error ? signupError.message : 'Failed to create account';

          if (errorMessage.includes('already registered') || errorMessage.includes('User already registered')) {
            toast.warning('An account with this email already exists. Please login to continue.');
            navigate('/customer/auth/login');
            return;
          }

          console.error('Account creation error:', signupError);
          toast.error(`Account creation failed: ${errorMessage}. Please try again or log in.`);
          return;
        }
      }
      
      // TODO: Replace with actual API call
      // const applicationData = {
      //   vehicleId: vehicle.id,
      //   vehicle: vehicle,
      //   downPayment,
      //   loanAmount,
      //   termMonths,
      //   monthlyPayment,
      //   customerInfo: {
      //     firstName: data.firstName,
      //     lastName: data.lastName,
      //     email: data.email,
      //     phone: data.phone,
      //     nationalId: data.nationalId,
      //     nationality: data.nationality,
      //     gender: data.gender,
      //     salary,
      //     employmentType,
      //     durationOfResidence,
      //     monthlyLiabilities,
      //     password: data.password, // Only if creating new account
      //   },
      //   options: {
      //     hasPremiumMembership,
      //     hasInsurance,
      //   },
      //   documents: Object.values(documents).map((doc) => ({
      //     category: doc.category,
      //     name: doc.name,
      //     url: doc.url,
      //   })),
      //   authorizeCreditCheck: data.authorizeCreditCheck,
      //   acceptTerms: data.acceptTerms,
      // };
      // const response = await apiService.post('/customer/applications', applicationData);
      // if (response.status === 'SUCCESS') {
      //   toast.success('Application submitted successfully!');
      //   navigate('/customer/my-applications');
      // }

      // Load offers from Supabase
      let selectedOffer: Offer | null = null;
      
      try {
        const offersResponse = await supabaseApiService.getOffers();
        if (offersResponse.status === 'SUCCESS' && offersResponse.data) {
          const activeOffers = offersResponse.data.filter((o: Offer) => o.status === 'active');
          
          if (activeOffers.length > 0) {
            // Use default offer if exists, otherwise use first active offer
            selectedOffer = activeOffers.find((o: Offer) => o.isDefault) || activeOffers[0];
          }
        }
      } catch (error) {
        console.error('❌ Error loading offers:', error);
      }
      
      if (!selectedOffer) {
        toast.error('No active financing offer is available. Please contact support.');
        return;
      }
      const defaultOffer: Offer = selectedOffer;

      // Calculate tenure - use consistent format matching Config.tenure format
      // For full years: "X Years", for partial: "X Months"
      const tenureString = formatMonthsToTenure(termMonths);
      
      // Generate payment schedule
      // Use calculator's annual rental rate if available, otherwise use default offer rate
      // Calculator passes rate as decimal (e.g., 0.12), default offer is percentage (e.g., 12.0)
      const annualRentRateDecimal = annualRentalRate > 0 
        ? annualRentalRate 
        : defaultOffer.annualRentRate / 100;
      
      const schedule: import('@shared/models/application.model').PaymentSchedule[] = [];
      const startDate = moment().startOf('month').add(1, 'month'); // Start next month
      const principalPaymentPerMonth = loanAmount / termMonths;
      const rentPerPeriodRate = annualRentRateDecimal / 12;

      // New applications must never invent paid history — schedules start unpaid.
      for (let i = 0; i < termMonths; i++) {
        const dueDate = moment(startDate).add(i, 'months');
        const customerOwnership = downPayment + (principalPaymentPerMonth * i);
        const bloxOwnership = vehicle.price - customerOwnership;
        const monthlyRentForThisMonth = bloxOwnership * rentPerPeriodRate;
        const paymentAmount = principalPaymentPerMonth + monthlyRentForThisMonth;

        schedule.push({
          dueDate: dueDate.format('YYYY-MM-DD'),
          amount: paymentAmount,
          status: i === 0 ? 'active' : 'upcoming',
        });
      }

      // Create application in Supabase
      const supabaseResponse = await supabaseApiService.createApplication(
        {
          customerName: `${data.firstName} ${data.lastName}`,
          customerEmail: resolvedCustomerEmail,
          customerPhone: data.phone,
          vehicleId: vehicle.id,
          offerId: defaultOffer.id,
          status: 'under_review',
          loanAmount: loanAmount || (vehicle.price - downPayment),
          downPayment: downPayment,
          customerInfo: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: resolvedCustomerEmail,
            phone: data.phone,
            nationalId: data.nationalId,
            gender: data.gender,
            nationality: data.nationality,
            employment: {
              employmentType: employmentType || '',
              employmentDuration: durationOfResidence || '',
              salary: salary || 0,
              company: '',
              position: '',
            },
            income: {
              monthlyIncome: salary || 0,
              totalIncome: salary || 0,
            },
          },
          installmentPlan: {
            tenure: tenureString,
            interval: 'Monthly',
            monthlyAmount: monthlyPayment || 0,
            totalAmount: vehicle.price + totalRent,
            downPayment: downPayment,
            annualRentalRate: annualRentRateDecimal, // Store the rate used for calculation
            schedule: schedule,
          },
          documents: [], // Uploaded after create with real applicationId
          bloxMembership: hasBloxMembership ? {
            isActive: true,
            membershipType: membershipType,
            purchasedDate: new Date().toISOString(),
            cost: membershipType === 'yearly' ? MembershipConfig.costPerYear : MembershipConfig.costPerMonth,
            ...(membershipType === 'monthly' && {
              nextBillingDate: moment().add(1, 'month').toISOString(),
            }),
            ...(membershipType === 'yearly' && {
              renewalDate: moment().add(1, 'year').toISOString(),
            }),
          } : undefined,
        },
        signupAuthUserId ? { signupAuthUserId } : undefined
      );

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        console.log('Application created successfully:', supabaseResponse.data);
        const applicationId = supabaseResponse.data.id;

        // Upload attached documents to Storage, then persist URLs on the application
        if (Object.keys(documents).length > 0) {
          try {
            const uploadedDocs = await uploadDocumentsForApplication(applicationId, documents);
            const updateDocs = await supabaseApiService.updateApplication(applicationId, {
              documents: uploadedDocs,
            });
            if (updateDocs.status !== 'SUCCESS') {
              throw new Error(updateDocs.message || 'Failed to save document URLs');
            }
          } catch (docError: unknown) {
            const msg = docError instanceof Error ? docError.message : 'Document upload failed';
            console.error('❌ Document upload after create failed:', docError);
            toast.error(
              `Application created, but document upload failed: ${msg}. Please upload documents from My Applications.`
            );
            navigate(`/customer/my-applications/${applicationId}`);
            return;
          }
        }
        
        // Notification is best-effort — never block navigation on it
        void supabaseApiService
          .createNotification({
            userEmail: resolvedCustomerEmail,
            type: 'success',
            title: 'Application Submitted',
            message: `Your application #${applicationId.slice(0, 8)} has been submitted successfully and is now under review.`,
            link: `/customer/my-applications/${applicationId}`,
          })
          .catch((notificationError) => {
            console.error('Failed to create notification:', notificationError);
          });
        
        // If account was just created and email needs verification
        if (signupAuthUserId) {
          toast.success(
            'Account created! Check your email to confirm your address — your application is saved. After confirming, log in to track it under My Applications.'
          );
          navigate('/customer/auth/login', {
            state: {
              message:
                'Please check your email to verify your account. Once verified, you can login to view your applications.',
            },
          });
        } else if (!isCustomerSession) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && !user.email_confirmed_at) {
            toast.success('Application submitted! Please verify your email to view your applications.');
            navigate('/customer/auth/login', { 
              state: { 
                message: 'Please check your email to verify your account. Once verified, you can login to view your applications.' 
              } 
            });
          } else {
            toast.success('Application submitted successfully!');
            navigate('/customer/my-applications');
          }
        } else {
          toast.success('Application submitted successfully!');
          navigate('/customer/my-applications');
        }
      } else {
        throw new Error(supabaseResponse.message || 'Failed to create application');
      }
    } catch (error: unknown) {
      devLogger.error('Error submitting application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Debug function to check form state (dev only)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    devLogger.debug('Form submit event triggered');
    devLogger.debug('Form values:', watch());
    devLogger.debug('Form errors:', errors);
    devLogger.debug('Authorize credit check:', authorizeCreditCheck);
    devLogger.debug('Accept terms:', acceptTerms);
    handleSubmit(onSubmit)();
  };

  if (loading || checkingApplications) {
    return (
      <Box className="create-application-page">
        <Loading />
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Box className="create-application-page">
        <EmptyState title="Vehicle not found" message="The vehicle you're trying to apply for doesn't exist." />
        <Button variant="secondary" onClick={() => navigate('/customer/vehicles')} sx={{ mt: 2 }}>
          Back to Vehicles
        </Button>
      </Box>
    );
  }

  // Show blocking message if existing application found
  if (existingApplication) {
    const statusLabels: Record<string, string> = {
      under_review: 'Under Review',
      contract_signing_required: 'Contract Signing Required',
      resubmission_required: 'Resubmission Required',
      contracts_submitted: 'Contracts Submitted',
      contract_under_review: 'Contract Under Review',
      down_payment_required: 'Down Payment Required',
      down_payment_submitted: 'Down Payment Submitted',
      submission_cancelled: 'Cancelled',
      completed: 'Completed',
    };

    return (
      <Box className="create-application-page">
        <Button
          variant="secondary"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/customer/vehicles')}
          className="back-button"
        >
          Back to Vehicles
        </Button>

        <Box sx={{ maxWidth: 800, margin: '0 auto', mt: 3 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Cannot Create New Application
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              You already have an application with status: <strong>{statusLabels[existingApplication.status] || existingApplication.status}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Please wait until your current application is <strong>approved (active)</strong> or <strong>rejected</strong> before applying for a new one.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(`/customer/my-applications/${existingApplication.id}`)}
              sx={{ mt: 2 }}
            >
              View Current Application
            </Button>
          </Alert>
        </Box>
      </Box>
    );
  }

  const currentDocumentCategory = documentCategories[activeDocumentTab];
  const currentDocument = documents[currentDocumentCategory.id];

  return (
    <Box className="create-application-page">
      <Button
        variant="secondary"
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/customer/vehicles/${vehicleId}`)}
        className="back-button"
      >
        Go Back
      </Button>

      <Box component="form" onSubmit={handleFormSubmit} className="application-form">
        {/* Personal Details Section */}
        <Card className="form-section">
          <CardContent>
            <Typography variant="h5" className="section-title">
              Personal Details
            </Typography>
            <Typography variant="body2" color="text.secondary" className="section-subtitle">
              {isCustomerSession 
                ? "Your personal details are pre-filled from your profile. To update them, please visit your profile page."
                : "Please enter your details to submit your application"}
            </Typography>
            <Divider sx={{ my: 3 }} />

            <Box className="form-grid">
              <Box className="form-field">
                <Input
                  label="First Name"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                  {...register('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  disabled={isCustomerSession}
                />
              </Box>
              <Box className="form-field">
                <Input
                  label="Last Name"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                  {...register('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                  disabled={isCustomerSession}
                />
              </Box>
              <Box className="form-field">
                <Input
                  label="Enter Email"
                  type="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                  {...register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={isCustomerSession}
                />
              </Box>
              <Box className="form-field">
                <Input
                  label="Enter National ID"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CreditCard />
                      </InputAdornment>
                    ),
                  }}
                  {...register('nationalId')}
                  error={!!errors.nationalId}
                  helperText={errors.nationalId?.message}
                  disabled={isCustomerSession}
                />
              </Box>
              <Box className="form-field phone-field">
                  <Box className="phone-input-wrapper">
                    <Select
                      value="+974"
                      options={[{ value: '+974', label: '+974' }]}
                      className="country-code-select"
                      onChange={() => {}} // Read-only
                      disabled
                    />
                  <Input
                    label="Phone Number"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      ),
                    }}
                    {...register('phone')}
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    className="phone-input"
                    disabled={isCustomerSession}
                  />
                </Box>
              </Box>
              <Box className="form-field">
                <Controller
                  name="nationality"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Nationality"
                      {...field}
                      options={nationalityOptions}
                      error={!!errors.nationality}
                      helperText={errors.nationality?.message || (nationalityOptions.length === 0 ? 'Loading nationalities...' : '')}
                      disabled={isCustomerSession}
                      placeholder={nationalityOptions.length === 0 ? 'Loading nationalities...' : 'Select your nationality'}
                    />
                  )}
                />
              </Box>
              <Box className="form-field">
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Gender"
                      {...field}
                      options={genderOptions}
                      error={!!errors.gender}
                      helperText={errors.gender?.message}
                      disabled={isCustomerSession}
                    />
                  )}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Set Password Section */}
        {!isCustomerSession && (
          <Card className="form-section">
            <CardContent>
              <Typography variant="h5" className="section-title">
                Set Password
              </Typography>
              <Typography variant="body2" color="text.secondary" className="section-subtitle">
                Create a password for your user, in order to come back and review the progress of your applications in
                the future, or apply for another lease.
              </Typography>
              <Divider sx={{ my: 3 }} />

              <Box className="form-grid">
                <Box className="form-field">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    {...register('password')}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                  />
                </Box>
                <Box className="form-field">
                  <Input
                    label="Enter Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    {...register('confirmPassword')}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Upload Documents Section */}
        <Card className="form-section">
          <CardContent>
            <Typography variant="h5" className="section-title">
              Upload Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" className="section-subtitle">
              Blox requires the following documents to process your application. (Optional for submission)
            </Typography>
            <Divider sx={{ my: 3 }} />

            <Tabs
              value={activeDocumentTab}
              onChange={(_, newValue) => setActiveDocumentTab(newValue)}
              className="document-tabs"
            >
              {documentCategories.map((category) => (
                <Tab key={category.id} label={category.label} />
              ))}
            </Tabs>

            <Box className="document-upload-area">
              {currentDocument ? (
                <Box className="document-preview">
                  <Box className="document-info">
                    <Typography variant="body1" className="document-name">
                      {currentDocument.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentDocument.file.size > 1024 * 1024
                        ? `${(currentDocument.file.size / (1024 * 1024)).toFixed(2)} MB`
                        : `${(currentDocument.file.size / 1024).toFixed(2)} KB`}
                    </Typography>
                  </Box>
                  <IconButton onClick={() => handleRemoveDocument(currentDocumentCategory.id)} color="error">
                    <Delete />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  className={`drag-drop-area ${dragActive ? 'drag-active' : ''} ${uploading[currentDocumentCategory.id] ? 'uploading' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }}
                    onChange={handleFileInput}
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    disabled={uploading[currentDocumentCategory.id]}
                  />
                  <label htmlFor="file-upload" className="upload-label">
                    <CloudUpload className="upload-icon" />
                    <Typography variant="body1" className="upload-text">
                      Drag and drop file here or <span className="browse-link">Browse</span>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="upload-hint">
                      Maximum size: 5MB
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="upload-hint">
                      Supported format: PNG, JPG, PDF
                    </Typography>
                  </label>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Authorization & Terms */}
        <Box className="authorization-section">
          <FormControlLabel
            control={<Checkbox {...register('authorizeCreditCheck')} checked={authorizeCreditCheck} />}
            label="Authorize Blox to check the credit bureau report"
            className="checkbox-label"
          />
          <FormControlLabel
            control={<Checkbox {...register('acceptTerms')} checked={acceptTerms} />}
            label={
              <span>
                Accept the{' '}
                <Link href="#" onClick={(e) => e.preventDefault()} className="terms-link">
                  terms & conditions
                </Link>
              </span>
            }
            className="checkbox-label"
          />
          {(errors.authorizeCreditCheck || errors.acceptTerms) && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {errors.authorizeCreditCheck?.message || errors.acceptTerms?.message}
            </Typography>
          )}
        </Box>

        {/* Submit Button */}
        <Box className="form-actions">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !authorizeCreditCheck || !acceptTerms}
            className="submit-button"
            loading={submitting}
          >
            Submit
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

