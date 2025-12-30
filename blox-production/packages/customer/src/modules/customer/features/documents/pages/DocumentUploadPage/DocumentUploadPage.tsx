import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowBack,
  CloudUpload,
  Delete,
  CheckCircle,
} from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import { toast } from 'react-toastify';
import { supabaseApiService } from '@shared/services';
import { supabase } from '@shared/services/supabase.service';
import type { Application } from '@shared/models/application.model';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading } from '../../../../store/slices/application.slice';
import './DocumentUploadPage.scss';

interface DocumentCategory {
  id: string;
  name: string;
  required: boolean;
}

const documentCategories: DocumentCategory[] = [
  { id: 'id', name: 'National ID', required: true },
  { id: 'passport', name: 'Passport', required: false },
  { id: 'license', name: 'Driving License', required: false },
  { id: 'salary', name: 'Salary Certificate', required: true },
  { id: 'bank', name: 'Bank Statement', required: true },
  { id: 'other', name: 'Other Documents', required: false },
];

export const DocumentUploadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected } = useAppSelector((state) => state.application);
  const [documents, setDocuments] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load application details and existing documents
  useEffect(() => {
    const loadApplication = async () => {
      if (!id) return;
      try {
        dispatch(setLoading(true));
        const response = await supabaseApiService.getApplicationById(id);
        if (response.status === 'SUCCESS' && response.data) {
          dispatch(setSelected(response.data));
          
          // Map existing documents by category
          const docsByCategory: Record<string, any> = {};
          if (response.data.documents) {
            response.data.documents.forEach((doc: any) => {
              // Map category names to our category IDs
              const categoryMap: Record<string, string> = {
                'qatar-id': 'id',
                'national-id': 'id',
                'id': 'id',
                'passport': 'passport',
                'driving-license': 'license',
                'license': 'license',
                'salary-certificate': 'salary',
                'salary': 'salary',
                'bank-statement': 'bank',
                'bank': 'bank',
                'additional': 'other',
                'other': 'other',
              };
              
              const categoryId = categoryMap[doc.category] || 'other';
              docsByCategory[categoryId] = doc;
            });
          }
          setDocuments(docsByCategory);
        }
      } catch (error) {
        console.error('Error loading application:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };
    loadApplication();
  }, [id, dispatch]);

  const handleFileUpload = async (category: string, file: File) => {
    if (!id || !selected) {
      toast.error('Application not found');
      return;
    }

    setUploading((prev) => ({ ...prev, [category]: true }));

    try {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB');
        setUploading((prev) => ({ ...prev, [category]: false }));
        return;
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PNG, JPG, and PDF files are allowed');
        setUploading((prev) => ({ ...prev, [category]: false }));
        return;
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${category}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `application-documents/${id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload file to storage');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const newDoc = {
        id: `DOC${Date.now()}-${category}`,
        name: file.name,
        type: file.type,
        category: category,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
      };

      // Update local state
      setDocuments((prev) => ({
        ...prev,
        [category]: newDoc,
      }));

      toast.success('Document uploaded successfully');
    } catch (error: any) {
      console.error(`❌ Failed to upload document:`, error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading((prev) => ({ ...prev, [category]: false }));
    }
  };

  const handleFileChange = (category: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(category, file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleRemove = (category: string) => {
    setDocuments((prev) => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!id || !selected) {
      toast.error('Application not found');
      return;
    }

    // Check required documents
    const requiredCategories = documentCategories.filter(cat => cat.required);
    const missingRequired = requiredCategories.filter(cat => !documents[cat.id]);
    
    if (missingRequired.length > 0) {
      toast.error(`Please upload required documents: ${missingRequired.map(c => c.name).join(', ')}`);
      return;
    }

    try {
      setSubmitting(true);

      // Convert documents object to array and ensure clean structure
      const documentsArray = Object.values(documents).map((doc: any) => ({
        id: doc.id || `DOC${Date.now()}-${doc.category}`,
        name: doc.name || 'document',
        type: doc.type || 'application/pdf',
        category: doc.category,
        url: doc.url || '',
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
      }));

      // Merge with existing documents (keep existing, replace/update by category)
      const existingDocuments = (selected.documents || []).filter((d: any) => {
        // Map existing document categories to our category IDs
        const categoryMap: Record<string, string> = {
          'qatar-id': 'id',
          'national-id': 'id',
          'id': 'id',
          'passport': 'passport',
          'driving-license': 'license',
          'license': 'license',
          'salary-certificate': 'salary',
          'salary': 'salary',
          'bank-statement': 'bank',
          'bank': 'bank',
          'additional': 'other',
          'other': 'other',
        };
        const categoryId = categoryMap[d.category] || d.category || 'other';
        // Keep documents that are NOT being replaced
        return !Object.keys(documents).includes(categoryId);
      });

      // Combine filtered existing with new documents
      const updatedDocuments = [...existingDocuments, ...documentsArray];

      // Ensure all documents have required fields
      const cleanedDocuments = updatedDocuments.map((doc: any) => ({
        id: doc.id || `DOC${Date.now()}-${doc.category || 'unknown'}`,
        name: doc.name || 'document',
        type: doc.type || 'application/pdf',
        category: doc.category || 'other',
        url: doc.url || '',
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
      }));

      // Update application with new documents and status
      // ALWAYS update status to 'under_review' when documents are resubmitted
      const updateData: Partial<Application> = {
        documents: cleanedDocuments,
        status: 'under_review', // Always set to under_review when resubmitting
      };

      console.log('✅ Updating status to under_review', { 
        was: selected.status, 
        willBe: 'under_review',
        documentsCount: cleanedDocuments.length
      });

      console.log('📤 Updating application with data:', { 
        documentsCount: cleanedDocuments.length, 
        newStatus: updateData.status,
        currentStatus: selected.status 
      });

      const updateResponse = await supabaseApiService.updateApplication(id, updateData);
      
      console.log('📥 Update response:', { 
        status: updateResponse.status, 
        message: updateResponse.message,
        updatedStatus: updateResponse.data?.status 
      });
      
      if (updateResponse.status === 'SUCCESS' && updateResponse.data) {
        console.log('✅ Application updated successfully. New status:', updateResponse.data.status);
      }
      
      if (updateResponse.status === 'SUCCESS' && updateResponse.data) {
        console.log('✅ Update response data:', updateResponse.data);
        console.log('✅ Status in response:', updateResponse.data.status);
        
        dispatch(setSelected(updateResponse.data));
        
        // Reload the application to ensure we have the latest status from database
        const reloadResponse = await supabaseApiService.getApplicationById(id);
        if (reloadResponse.status === 'SUCCESS' && reloadResponse.data) {
          console.log('🔄 Reloaded application status:', reloadResponse.data.status);
          dispatch(setSelected(reloadResponse.data));
          
          // Verify status was actually updated
          if (reloadResponse.data.status !== 'under_review') {
            console.warn('⚠️ Status was not updated! Still showing:', reloadResponse.data.status);
            toast.warning('Documents uploaded, but status update may have failed. Please refresh the page.');
          }
        }
        
        // Create notification for admin about document resubmission (non-blocking)
        supabaseApiService.createNotification({
          userEmail: selected.customerEmail,
          type: 'info',
          title: 'Documents Resubmitted',
          message: `Customer has resubmitted ${documentsArray.length} document(s) for application #${id.slice(0, 8)}. Please review.`,
          link: `/admin/applications/${id}`,
        }).catch((notificationError) => {
          console.error('⚠️ Failed to create notification (non-critical):', notificationError);
          // Don't show error to user - notification failure is not critical
        });

        toast.success(`Successfully uploaded ${documentsArray.length} document(s)! Application is back under review.`);
        navigate(`/customer/my-applications/${id}`);
      } else {
        console.error('❌ Update failed:', updateResponse);
        throw new Error(updateResponse.message || 'Failed to update application');
      }
    } catch (error: any) {
      console.error('Error submitting documents:', error);
      toast.error(error.message || 'Failed to submit documents');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box className="document-upload-page">
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/customer/my-applications/${id}`)}
        className="back-button"
      >
        Back to Application
      </Button>

      <Typography variant="h4" className="page-title">
        Upload Documents
      </Typography>

      {selected?.resubmissionComments && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            Resubmission Required:
          </Typography>
          <Typography variant="body2">
            {selected.resubmissionComments}
          </Typography>
        </Alert>
      )}

      <Box className="document-upload-section">
        <Grid container spacing={3}>
          {documentCategories.map((category) => {
            const document = documents[category.id];
            const isUploading = uploading[category.id];

            return (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Paper className="document-card">
                  <Box className="document-header">
                    <Typography variant="body1" className="document-name">
                      {category.name}
                      {category.required && <span className="required">*</span>}
                    </Typography>
                  </Box>

                  {document ? (
                    <Box className="document-preview">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <CheckCircle sx={{ color: '#DAFF01', fontSize: 20 }} />
                        <Typography variant="body2" className="document-file-name" noWrap>
                          {document.name}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemove(category.id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box className="upload-area">
                      <input
                        type="file"
                        id={`file-${category.id}`}
                        style={{ display: 'none' }}
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(category.id, e)}
                        disabled={isUploading}
                      />
                      <label htmlFor={`file-${category.id}`} style={{ cursor: 'pointer' }}>
                        <IconButton
                          component="span"
                          disabled={isUploading}
                          className="upload-button"
                        >
                          <CloudUpload />
                        </IconButton>
                      </label>
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                        {isUploading ? 'Uploading...' : 'Click to upload'}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Box className="action-buttons">
        <CustomButton
          variant="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={Object.keys(documents).length === 0}
        >
          {submitting ? 'Submitting...' : 'Submit Documents'}
        </CustomButton>
        <Button variant="outlined" onClick={() => navigate(`/customer/my-applications/${id}`)}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};
