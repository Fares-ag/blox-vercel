import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import './ResubmissionDialog.scss';

interface ResubmissionDialogProps {
  open: boolean;
  onClose: () => void;
  onRequestResubmission: (comments: string) => void;
  loading?: boolean;
  applicationId?: string;
  customerName?: string;
}

export const ResubmissionDialog: React.FC<ResubmissionDialogProps> = ({
  open,
  onClose,
  onRequestResubmission,
  loading = false,
  applicationId,
  customerName,
}) => {
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    if (!comments.trim()) {
      return;
    }
    onRequestResubmission(comments.trim());
  };

  const handleClose = () => {
    setComments('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      className="resubmission-dialog"
    >
      <DialogTitle className="dialog-title">
        <Typography variant="h3">Request Resubmission</Typography>
        {applicationId && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Application ID: {applicationId}
            {customerName && ` • ${customerName}`}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent className="dialog-content">
        <Alert severity="warning" sx={{ mb: 3 }}>
          Request the customer to resubmit documents or information. Your comments will be sent to the customer explaining what needs to be corrected.
        </Alert>

        <TextField
          fullWidth
          multiline
          rows={6}
          label="Resubmission Reason"
          placeholder="Enter the reason for resubmission (e.g., 'Please upload a clearer copy of your Qatar ID' or 'Bank statement is missing pages')..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          required
          error={!comments.trim()}
          helperText={
            !comments.trim()
              ? 'Please provide a reason for resubmission'
              : 'This message will be displayed to the customer'
          }
          sx={{ mb: 2 }}
        />
      </DialogContent>

      <DialogActions className="dialog-actions">
        <Button variant="text" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <CustomButton
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={!comments.trim()}
          startIcon={<Edit />}
        >
          Request Resubmission
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

