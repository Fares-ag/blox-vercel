import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
} from '@mui/material';
import { CheckCircle, Cancel, Edit } from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import './ContractReviewDialog.scss';

export type ReviewAction = 'approve' | 'reject' | 'resubmit';

interface ContractReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onReview: (action: ReviewAction, comments: string) => void;
  loading?: boolean;
  applicationId?: string;
  customerName?: string;
}

export const ContractReviewDialog: React.FC<ContractReviewDialogProps> = ({
  open,
  onClose,
  onReview,
  loading = false,
  applicationId,
  customerName,
}) => {
  const [selectedAction, setSelectedAction] = useState<ReviewAction>('approve');
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    // Comments are required for reject and resubmit actions
    if ((selectedAction === 'reject' || selectedAction === 'resubmit') && !comments.trim()) {
      return;
    }
    onReview(selectedAction, comments.trim());
  };

  const handleClose = () => {
    setSelectedAction('approve');
    setComments('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      className="contract-review-dialog"
    >
      <DialogTitle className="dialog-title">
        <Typography variant="h3">Review Contract Submission</Typography>
        {applicationId && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Application ID: {applicationId}
            {customerName && ` • ${customerName}`}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent className="dialog-content">
        <Alert severity="info" sx={{ mb: 3 }}>
          Please review the signed contract and select an action. Comments are required for rejection or resubmission requests.
        </Alert>

        <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
            Select Action
          </FormLabel>
          <RadioGroup
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value as ReviewAction)}
            sx={{ gap: 1 }}
          >
            <FormControlLabel
              value="approve"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ color: '#09C97F', fontSize: 20 }} />
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Approve Contract
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Approve the contract and activate the application
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="resubmit"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Edit sx={{ color: '#E2B13C', fontSize: 20 }} />
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Request Resubmission
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Request the customer to resubmit with corrections
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="reject"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Cancel sx={{ color: '#D65D5D', fontSize: 20 }} />
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Reject Contract
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Reject the contract submission
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {(selectedAction === 'reject' || selectedAction === 'resubmit') && (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comments"
            placeholder={`Enter your comments for ${selectedAction === 'reject' ? 'rejection' : 'resubmission'}...`}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            required
            error={!comments.trim()}
            helperText={
              !comments.trim()
                ? 'Comments are required'
                : selectedAction === 'reject'
                ? 'These comments will be sent to the customer explaining why the contract was rejected.'
                : 'These comments will help the customer understand what needs to be corrected.'
            }
            sx={{ mb: 2 }}
          />
        )}

        {selectedAction === 'approve' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            The contract will be approved and the application will be activated. No comments are required.
          </Alert>
        )}
      </DialogContent>

      <DialogActions className="dialog-actions">
        <Button variant="text" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <CustomButton
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={(selectedAction === 'reject' || selectedAction === 'resubmit') && !comments.trim()}
        >
          {selectedAction === 'approve' && 'Approve Contract'}
          {selectedAction === 'resubmit' && 'Request Resubmission'}
          {selectedAction === 'reject' && 'Reject Contract'}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

