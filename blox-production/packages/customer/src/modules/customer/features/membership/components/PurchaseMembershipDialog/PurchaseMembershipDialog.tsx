import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { Button } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { MembershipConfig } from '@shared/config/app.config';

interface PurchaseMembershipDialogProps {
  open: boolean;
  onClose: () => void;
  /** New purchases are monthly-only (50 QAR/month). */
  onPurchase: (type: 'monthly') => void;
  termMonths?: number;
}

export const PurchaseMembershipDialog: React.FC<PurchaseMembershipDialogProps> = ({
  open,
  onClose,
  onPurchase,
  termMonths = 36,
}) => {
  const membershipCostPerMonth = MembershipConfig.costPerMonth;
  const totalCost = membershipCostPerMonth * termMonths;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={700}>
          Purchase Blox Membership
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Get 3 payment deferrals per year. Deferrals are per customer account and can be used across all your applications.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> No refunds are available for membership purchases.
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            p: 2,
            border: '2px solid #DBFF00',
            borderRadius: 2,
          }}
        >
          <Typography variant="body1" fontWeight={600}>
            Monthly Plan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatCurrency(membershipCostPerMonth)} per month
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total: {formatCurrency(totalCost)} for {termMonths} months
          </Typography>
        </Box>

        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Total Cost:
            </Typography>
            <Typography variant="h6" color="#DBFF00" fontWeight={700}>
              {formatCurrency(totalCost)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onPurchase('monthly')}>
          Purchase Membership
        </Button>
      </DialogActions>
    </Dialog>
  );
};
