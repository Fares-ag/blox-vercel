import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Step,
  StepLabel,
  Stepper,
  Card,
  CardContent,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowBack,
  FileDownload,
  CheckCircle,
  Description,
  Print,
  Upload,
  CloudUpload,
} from '@mui/icons-material';
import { Loading } from '@shared/components';
import { toast } from 'react-toastify';
import { ContractPdfService, supabaseApiService } from '@shared/services';
import { supabase } from '@shared/services/supabase.service';
import type { Application } from '@shared/models/application.model';
import './ContractSigningPage.scss';

const steps = ['Download Contract', 'Print & Sign', 'Upload Signed Contract'];

export const ContractSigningPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadApplication();
  }, [id]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      
      if (!id) {
        toast.error('Application ID is required');
        navigate('/customer/my-applications');
        return;
      }
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getApplicationById(id);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        setApplication(supabaseResponse.data);
      } else {
        throw new Error(supabaseResponse.message || 'Application not found');
      }
    } catch (error: any) {
      console.error('❌ Failed to load application:', error);
      toast.error(error.message || 'Failed to load application');
      navigate('/customer/my-applications');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadContract = async () => {
    if (!application || !application.contractGenerated || !application.contractData) {
      toast.error('Contract not yet generated for this application');
      return;
    }

    try {
      await ContractPdfService.generateAndSave(
        {
          application: application,
          contractFormData: application.contractData,
        },
        `Contract-${application.id}-${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast.success('Contract downloaded successfully! Please print and sign it.');
      setActiveStep(1); // Move to next step
    } catch (error: any) {
      console.error('Error generating contract PDF:', error);
      toast.error(error.message || 'Failed to generate contract PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setActiveStep(2);
    }
  };

  const handleSubmitSignedContract = async () => {
    if (!uploadedFile || !application || !id) {
      toast.error('Please upload the signed contract');
      return;
    }

    try {
      setUploading(true);
      
      if (!id || !application) {
        toast.error('Application ID is required');
        return;
      }

      // Upload file to Supabase Storage
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `signed-contract-${id}-${Date.now()}.${fileExt}`;
      const filePath = `signed-contracts/${id}/${fileName}`;

      console.log('📤 Uploading contract to storage:', { filePath, fileName });

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload signed contract');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const contractUrl = urlData.publicUrl;

      console.log('✅ Contract uploaded to storage:', contractUrl);
      
      // Update application in Supabase
      console.log('📤 Updating application with contract:', { 
        id, 
        currentStatus: application.status,
        newStatus: 'contracts_submitted',
        contractUrl
      });

        const supabaseResponse = await supabaseApiService.updateApplication(id, {
          contractSigned: true,
          contractSignature: contractUrl, // Store the URL instead of base64
          status: 'contracts_submitted',
        });

        console.log('📥 Update response:', { 
          status: supabaseResponse.status, 
          message: supabaseResponse.message,
          updatedStatus: supabaseResponse.data?.status 
        });

        if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
          // Reload the application to ensure we have the latest status
          const reloadResponse = await supabaseApiService.getApplicationById(id);
          if (reloadResponse.status === 'SUCCESS' && reloadResponse.data) {
            console.log('🔄 Reloaded application status:', reloadResponse.data.status);
            
            // Verify status was actually updated
            if (reloadResponse.data.status !== 'contracts_submitted') {
              console.warn('⚠️ Status was not updated! Still showing:', reloadResponse.data.status);
              toast.warning('Contract uploaded, but status update may have failed. Please refresh the page.');
            }
          }

          // Create notification for customer (non-blocking)
          supabaseApiService.createNotification({
            userEmail: application.customerEmail,
            type: 'info',
            title: 'Contract Submitted',
            message: `Your signed contract for application #${id?.slice(0, 8)} has been submitted and is awaiting admin review.`,
            link: `/customer/my-applications/${id}`,
          }).catch((notificationError) => {
            console.error('⚠️ Failed to create notification (non-critical):', notificationError);
            // Don't show error to user - notification failure is not critical
          });
          
          toast.success('Signed contract uploaded successfully! Your application is now submitted for admin review.');
          navigate(`/customer/my-applications/${id}`);
        } else {
          console.error('❌ Update failed:', supabaseResponse);
          throw new Error(supabaseResponse.message || 'Failed to update application');
        }
    } catch (error: any) {
      console.error('❌ Error uploading signed contract:', error);
      toast.error(error.message || 'Failed to upload signed contract');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!application) {
    return null;
  }

  return (
    <Box className="contract-signing-page">
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/customer/my-applications/${id}`)}
        className="back-button"
      >
        Back to Application
      </Button>

      <Typography variant="h4" className="page-title">
        Contract Signing
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Please follow the steps below to download, sign, and upload your contract. Once uploaded, your application will be submitted for admin review.
      </Alert>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Grid container spacing={3}>
        {/* Step 1: Download Contract */}
        {activeStep === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Description sx={{ fontSize: 64, color: '#DAFF01', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Step 1: Download Your Contract
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    Download the contract PDF to review and sign. Make sure to read all terms and conditions carefully.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<FileDownload />}
                    onClick={handleDownloadContract}
                    sx={{
                      backgroundColor: '#DAFF01',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: '#B8E001',
                      },
                    }}
                  >
                    Download Contract PDF
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Step 2: Print & Sign */}
        {activeStep === 1 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Print sx={{ fontSize: 64, color: '#DAFF01', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Step 2: Print & Sign Your Contract
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    Print the downloaded contract, sign it physically, and then proceed to upload the signed copy.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<Print />}
                      onClick={handlePrint}
                      sx={{
                        borderColor: '#DAFF01',
                        color: '#DAFF01',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 4,
                        py: 1.5,
                        '&:hover': {
                          borderColor: '#B8E001',
                          backgroundColor: 'rgba(218, 255, 1, 0.1)',
                        },
                      }}
                    >
                      Print Contract
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Upload />}
                      onClick={() => setActiveStep(2)}
                      sx={{
                        backgroundColor: '#DAFF01',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 4,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: '#B8E001',
                        },
                      }}
                    >
                      I've Signed It - Upload Now
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Step 3: Upload Signed Contract */}
        {activeStep === 2 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CloudUpload sx={{ fontSize: 64, color: '#DAFF01', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Step 3: Upload Signed Contract
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    Upload the signed contract PDF. Make sure the file is clear and all signatures are visible.
                  </Typography>
                  
                  <Box sx={{ maxWidth: 500, mx: 'auto' }}>
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
                        size="large"
                        startIcon={<CloudUpload />}
                        sx={{
                          borderColor: '#DAFF01',
                          color: '#DAFF01',
                          fontWeight: 600,
                          textTransform: 'none',
                          px: 4,
                          py: 1.5,
                          width: '100%',
                          mb: 2,
                          '&:hover': {
                            borderColor: '#B8E001',
                            backgroundColor: 'rgba(218, 255, 1, 0.1)',
                          },
                        }}
                      >
                        {uploadedFile ? uploadedFile.name : 'Choose Signed Contract PDF'}
                      </Button>
                    </label>

                    {uploadedFile && (
                      <Box sx={{ mt: 3 }}>
                        <Alert severity="success" sx={{ mb: 2 }}>
                          File selected: {uploadedFile.name}
                        </Alert>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={uploading ? undefined : <CheckCircle />}
                          onClick={handleSubmitSignedContract}
                          disabled={uploading}
                          sx={{
                            backgroundColor: '#DAFF01',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 4,
                            py: 1.5,
                            width: '100%',
                            '&:hover': {
                              backgroundColor: '#B8E001',
                            },
                            '&:disabled': {
                              backgroundColor: '#DAFF01',
                              opacity: 0.7,
                            },
                          }}
                        >
                          {uploading ? 'Uploading...' : 'Submit Signed Contract'}
                        </Button>
                      </Box>
                    )}
                  </Box>

                  <Alert severity="info" sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
                    <Typography variant="body2">
                      <strong>Requirements:</strong> PDF format only, maximum file size 10MB. 
                      Make sure all pages are included and signatures are clearly visible.
                    </Typography>
                  </Alert>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

