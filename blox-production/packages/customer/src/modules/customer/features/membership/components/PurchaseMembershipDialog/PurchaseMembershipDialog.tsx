import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Divider,
} from '@mui/material';
import { Button } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { MembershipConfig } from '@shared/config/app.config';

interface PurchaseMembershipDialogProps {
  open: boolean;
  onClose: () => void;
  onPurchase: (type: 'monthly' | 'yearly') => void;
  termMonths?: number;
}

export const PurchaseMembershipDialog: React.FC<PurchaseMembershipDialogProps> = ({
  open,
  onClose,
  onPurchase,
  termMonths = 36,
}) => {
  const [membershipType, setMembershipType] = useState<'monthly' | 'yearly'>('monthly');
  
  const membershipCostPerMonth = MembershipConfig.costPerMonth;
  const membershipCostPerYear = MembershipConfig.costPerYear;
  
  const totalCost = membershipType === 'yearly'
    ? membershipCostPerYear * Math.ceil(termMonths / 12)
    : membershipCostPerMonth * termMonths;
  
  const savings = membershipType === 'yearly'
    ? (membershipCostPerMonth * 12) - membershipCostPerYear
    : 0;

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

        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2, fontSize: '1rem', fontWeight: 600 }}>
            Select Membership Plan
          </FormLabel>
          <RadioGroup
            value={membershipType}
            onChange={(e) => setMembershipType(e.target.value as 'monthly' | 'yearly')}
          >
            <Box
              sx={{
                p: 2,
                mb: 2,
                border: membershipType === 'monthly' ? '2px solid #DAFF01' : '1px solid #e0e0e0',
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
              onClick={() => setMembershipType('monthly')}
            >
              <FormControlLabel
                value="monthly"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Monthly Plan
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(membershipCostPerMonth)} per month
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total: {formatCurrency(membershipCostPerMonth * termMonths)} for {termMonths} months
                    </Typography>
                  </Box>
                }
                sx={{ m: 0 }}
              />
            </Box>

            <Box
              sx={{
                p: 2,
                border: membershipType === 'yearly' ? '2px solid #DAFF01' : '1px solid #e0e0e0',
                borderRadius: 2,
                cursor: 'pointer',
                backgroundColor: membershipType === 'yearly' ? '#f0fdf4' : 'transparent',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
              onClick={() => setMembershipType('yearly')}
            >
              <FormControlLabel
                value="yearly"
                control={<Radio />}
                label={
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body1" fontWeight={600}>
                        Yearly Plan
                      </Typography>
                      {savings > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.5,
                            backgroundColor: '#DAFF01',
                            color: 'white',
                            borderRadius: 1,
                            fontWeight: 600,
                          }}
                        >
                          Save {formatCurrency(savings)}/year
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(membershipCostPerYear)} per year
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total: {formatCurrency(totalCost)} for {termMonths} months
                    </Typography>
                  </Box>
                }
                sx={{ m: 0 }}
              />
            </Box>
          </RadioGroup>
        </FormControl>

        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Total Cost:
            </Typography>
            <Typography variant="h6" color="#DAFF01" fontWeight={700}>
              {formatCurrency(totalCost)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onPurchase(membershipType)}>
          Purchase Membership
        </Button>
      </DialogActions>
    </Dialog>
  );
};

