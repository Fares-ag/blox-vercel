import React, { useState, useCallback } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Delete, CloudUpload } from '@mui/icons-material';
import { type StepProps } from '@shared/components';
import { supabase } from '@shared/services/supabase.service';
import { toast } from 'react-toastify';
import './DocumentUploadStep.scss';

interface DocumentCategory {
  id: string;
  name: string;
  required: boolean;
}

const documentCategories: DocumentCategory[] = [
  { id: 'id', name: 'National ID', required: false },
  { id: 'passport', name: 'Passport', required: false },
  { id: 'license', name: 'Driving License', required: false },
  { id: 'salary', name: 'Salary Certificate', required: false },
  { id: 'bank', name: 'Bank Statement', required: false },
  { id: 'other', name: 'Other Documents', required: false },
];

export const DocumentUploadStep: React.FC<StepProps> = ({ data, updateData }) => {
  const [documents, setDocuments] = useState<any[]>(data.documents || []);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const handleFileUpload = useCallback(
    async (category: string, file: File) => {
      setUploading((prev) => ({ ...prev, [category]: true }));

      try {
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          toast.error('File size must be less than 5MB');
          setUploading((prev) => ({ ...prev, [category]: false }));
          return;
        }

        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${category}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `application-documents/${fileName}`;

        // Upload file to Supabase Storage bucket
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
          category,
          url: publicUrl, // Store Supabase Storage URL
          uploadedAt: new Date().toISOString(),
        };

        setDocuments((prev) => {
          const filtered = prev.filter((d) => d.category !== category);
          return [...filtered, newDoc];
        });

        updateData({
          documents: [...documents.filter((d) => d.category !== category), newDoc],
        });

        toast.success('Document uploaded successfully');
      } catch (error: any) {
        console.error('❌ Failed to upload document:', error);
        toast.error(error.message || 'Failed to upload document');
      } finally {
        setUploading((prev) => ({ ...prev, [category]: false }));
      }
    },
    [documents, updateData]
  );

  const handleFileChange = (category: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(category, file);
    }
  };

  const handleRemove = (category: string) => {
    setDocuments((prev) => prev.filter((d) => d.category !== category));
    updateData({
      documents: documents.filter((d) => d.category !== category),
    });
  };

  const getDocumentForCategory = (category: string) => {
    return documents.find((d) => d.category === category);
  };

  return (
    <Box className="document-upload-step">
      <Typography variant="h3" className="section-title">
        Upload Documents
      </Typography>

      <Grid container spacing={3}>
        {documentCategories.map((category) => {
          const document = getDocumentForCategory(category.id);
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
                    <Typography variant="body2" className="document-file-name">
                      {document.name}
                    </Typography>
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
                      onChange={(e) => handleFileChange(category.id, e)}
                      disabled={isUploading}
                    />
                    <label htmlFor={`file-${category.id}`}>
                      <IconButton
                        component="span"
                        disabled={isUploading}
                        className="upload-button"
                      >
                        <CloudUpload />
                      </IconButton>
                    </label>
                    <Typography variant="caption" color="textSecondary">
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
  );
};
