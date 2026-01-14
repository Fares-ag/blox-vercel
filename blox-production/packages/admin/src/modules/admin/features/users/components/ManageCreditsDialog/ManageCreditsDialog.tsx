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
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
} from '@mui/material';
import { Add, Remove, Edit, AccountBalance } from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import './ManageCreditsDialog.scss';

export type CreditsAction = 'add' | 'subtract' | 'set';

interface ManageCreditsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (action: CreditsAction, amount: number, description: string) => Promise<void>;
  userEmail: string;
  currentBalance: number;
  loading?: boolean;
}

export const ManageCreditsDialog: React.FC<ManageCreditsDialogProps> = ({
  open,
  onClose,
  onSave,
  userEmail,
  currentBalance,
  loading = false,
}) => {
  const [action, setAction] = useState<CreditsAction>('add');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleClose = () => {
    setAction('add');
    setAmount('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    if (action === 'subtract' && numAmount > currentBalance) {
      return;
    }

    await onSave(action, numAmount, description.trim() || `Admin ${action === 'add' ? 'added' : action === 'subtract' ? 'subtracted' : 'set'} credits`);
    handleClose();
  };

  const isValid = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return false;
    }
    if (action === 'subtract' && numAmount > currentBalance) {
      return false;
    }
    return true;
  };

  const getNewBalance = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return currentBalance;
    }
    
    switch (action) {
      case 'add':
        return currentBalance + numAmount;
      case 'subtract':
        return Math.max(0, currentBalance - numAmount);
      case 'set':
        return numAmount;
      default:
        return currentBalance;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      className="manage-credits-dialog"
    >
      <DialogTitle className="dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          <AccountBalance color="primary" />
          <Typography variant="h3">Manage User Credits</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {userEmail}
        </Typography>
      </DialogTitle>

      <DialogContent className="dialog-content">
        <Alert severity="info" sx={{ mb: 3 }}>
          Current Balance: <strong>{currentBalance.toLocaleString()} Credits</strong>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Action
          </Typography>
          <RadioGroup
            value={action}
            onChange={(e) => {
              setAction(e.target.value as CreditsAction);
              setAmount('');
            }}
          >
            <FormControlLabel
              value="add"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Add color="success" fontSize="small" />
                  <Typography>Add Credits</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="subtract"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Remove color="error" fontSize="small" />
                  <Typography>Subtract Credits</Typography>
                </Box>
              }
              disabled={currentBalance === 0}
            />
            <FormControlLabel
              value="set"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Edit color="primary" fontSize="small" />
                  <Typography>Set Balance</Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Box>

        <TextField
          fullWidth
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={!isValid() && amount !== ''}
          helperText={
            amount !== '' && !isValid()
              ? action === 'subtract' && parseFloat(amount) > currentBalance
                ? `Cannot subtract more than current balance (${currentBalance.toLocaleString()})`
                : 'Amount must be greater than 0'
              : amount !== '' && isValid()
                ? `New balance: ${getNewBalance().toLocaleString()} Credits`
                : 'Enter the amount of credits'
          }
          inputProps={{ min: 0, step: 1 }}
          sx={{ mb: 2 }}
          required
        />

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description (Optional)"
          placeholder={`Reason for ${action === 'add' ? 'adding' : action === 'subtract' ? 'subtracting' : 'setting'} credits...`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />

        {amount !== '' && isValid() && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Preview:</strong> Balance will change from{' '}
              <strong>{currentBalance.toLocaleString()}</strong> to{' '}
              <strong>{getNewBalance().toLocaleString()}</strong> credits
            </Typography>
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
          disabled={!isValid()}
          startIcon={action === 'add' ? <Add /> : action === 'subtract' ? <Remove /> : <Edit />}
        >
          {action === 'add' ? 'Add Credits' : action === 'subtract' ? 'Subtract Credits' : 'Set Balance'}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};
