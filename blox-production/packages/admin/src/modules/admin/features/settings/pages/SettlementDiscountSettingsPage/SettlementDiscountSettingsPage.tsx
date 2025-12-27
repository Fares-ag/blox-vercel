import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Switch, FormControlLabel, Divider, Alert } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { supabaseApiService } from '@shared/services';
import type { SettlementDiscountSettings } from '@shared/models/settlement-discount.model';
import { Button, Input, Select, type SelectOption, Loading } from '@shared/components';
import { toast } from 'react-toastify';
import { Settings, AttachMoney, Percent, AccountBalance, Add, Delete } from '@mui/icons-material';
import './SettlementDiscountSettingsPage.scss';

export const SettlementDiscountSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettlementDiscountSettings | null>(null);

  const [formData, setFormData] = useState({
    name: 'Default Settlement Discount Settings',
    description: '',
    principalDiscountEnabled: false,
    principalDiscountType: 'percentage' as 'percentage' | 'fixed',
    principalDiscountValue: 0,
    principalDiscountMinAmount: 0,
    interestDiscountEnabled: false,
    interestDiscountType: 'percentage' as 'percentage' | 'fixed',
    interestDiscountValue: 0,
    interestDiscountMinAmount: 0,
    isActive: true,
    minSettlementAmount: 0,
    minRemainingPayments: 1,
    maxDiscountAmount: 0,
    maxDiscountPercentage: 0,
    tieredDiscounts: [] as Array<{
      minMonthsEarly: number;
      maxMonthsEarly?: number;
      principalDiscount: number;
      interestDiscount: number;
      installmentDiscount?: number;
      principalDiscountType: 'percentage' | 'fixed';
      interestDiscountType: 'percentage' | 'fixed';
      installmentDiscountType?: 'percentage' | 'fixed';
    }>,
    useTieredDiscounts: false,
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await supabaseApiService.getSettlementDiscountSettings();
      
      if (response.status === 'SUCCESS' && response.data) {
        const data = response.data;
        setSettings(data);
        setFormData({
          name: data.name || 'Default Settlement Discount Settings',
          description: data.description || '',
          principalDiscountEnabled: data.principalDiscountEnabled || false,
          principalDiscountType: data.principalDiscountType || 'percentage',
          principalDiscountValue: data.principalDiscountValue || 0,
          principalDiscountMinAmount: data.principalDiscountMinAmount || 0,
          interestDiscountEnabled: data.interestDiscountEnabled || false,
          interestDiscountType: data.interestDiscountType || 'percentage',
          interestDiscountValue: data.interestDiscountValue || 0,
          interestDiscountMinAmount: data.interestDiscountMinAmount || 0,
          isActive: data.isActive !== false,
          minSettlementAmount: data.minSettlementAmount || 0,
          minRemainingPayments: data.minRemainingPayments || 1,
          maxDiscountAmount: data.maxDiscountAmount || 0,
          maxDiscountPercentage: data.maxDiscountPercentage || 0,
          tieredDiscounts: (data.tieredDiscounts || []).map((tier: any) => ({
            // Support new format (minMonthsEarly) and backward compatibility with old formats
            minMonthsEarly: tier.minMonthsEarly !== undefined 
              ? tier.minMonthsEarly 
              : (tier.minMonthsIntoLoan !== undefined ? tier.minMonthsIntoLoan : (tier.minPayments || 1)),
            maxMonthsEarly: tier.maxMonthsEarly !== undefined 
              ? tier.maxMonthsEarly 
              : (tier.maxMonthsIntoLoan !== undefined ? tier.maxMonthsIntoLoan : (tier.maxPayments !== undefined ? tier.maxPayments : undefined)),
            principalDiscount: tier.principalDiscount || 0,
            interestDiscount: tier.interestDiscount || 0,
            installmentDiscount: tier.installmentDiscount || 0,
            principalDiscountType: tier.principalDiscountType || 'percentage',
            interestDiscountType: tier.interestDiscountType || 'percentage',
            installmentDiscountType: tier.installmentDiscountType || 'percentage',
          })),
          useTieredDiscounts: (data.tieredDiscounts && data.tieredDiscounts.length > 0) || false,
        });
      } else {
        throw new Error(response.message || 'Failed to load settings');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settlement discount settings';
      console.error('❌ Failed to load settings:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSubmit = useCallback(async () => {
    try {
      setSaving(true);
      
      const updateData = {
        id: settings?.id,
        ...formData,
      };

      const response = await supabaseApiService.updateSettlementDiscountSettings(updateData);

      if (response.status === 'SUCCESS' && response.data) {
        setSettings(response.data);
        toast.success('Settlement discount settings updated successfully');
        loadSettings();
      } else {
        throw new Error(response.message || 'Failed to update settings');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settlement discount settings';
      console.error('❌ Failed to update settings:', error);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [formData, settings, loadSettings]);

  const discountTypeOptions: SelectOption[] = [
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'fixed', label: 'Fixed Amount (QAR)' },
  ];

  if (loading) {
    return <Loading fullScreen message="Loading settlement discount settings..." />;
  }

  return (
    <Box className="settlement-discount-settings-page">
      <Box className="page-header">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Settings sx={{ fontSize: 32, color: '#00CFA2' }} />
          <Typography variant="h2">Early Payment Settlement Discount Settings</Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Configure discounts for customers who settle all remaining payments early
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>How it works:</strong> When customers choose to settle all remaining payments, you can offer discounts on the principal amount and/or interest/rent. 
          Discounts can be set as a percentage or a fixed amount. These settings apply to all settlement payments.
        </Typography>
      </Alert>

      <Paper className="settings-container">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <Grid container spacing={3}>
            {/* General Settings */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Settings sx={{ color: '#00CFA2' }} />
                <Typography variant="h5">General Settings</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Input
                label="Settings Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    color="primary"
                  />
                }
                label="Settings Active"
              />
            </Grid>

            <Grid item xs={12}>
              <Input
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Input
                label="Minimum Settlement Amount (QAR)"
                type="number"
                value={formData.minSettlementAmount}
                onChange={(e) => setFormData({ ...formData, minSettlementAmount: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                helperText="Minimum total amount required for settlement discount to apply"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Input
                label="Minimum Remaining Payments"
                type="number"
                value={formData.minRemainingPayments}
                onChange={(e) => setFormData({ ...formData, minRemainingPayments: parseInt(e.target.value, 10) || 1 })}
                inputProps={{ min: 1 }}
                fullWidth
                helperText="Minimum number of remaining payments required for discount"
              />
            </Grid>

            {/* Maximum Discount Caps */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 2 }}>
                <AttachMoney sx={{ color: '#00CFA2' }} />
                <Typography variant="h5">Maximum Discount Caps</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Input
                label="Maximum Discount Amount (QAR)"
                type="number"
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                helperText="Maximum total discount amount allowed (0 = no limit)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Input
                label="Maximum Discount Percentage (%)"
                type="number"
                value={formData.maxDiscountPercentage}
                onChange={(e) => setFormData({ ...formData, maxDiscountPercentage: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                fullWidth
                helperText="Maximum total discount percentage allowed (0 = no limit)"
              />
            </Grid>

            {/* Tiered Discounts */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 2 }}>
                <Percent sx={{ color: '#00CFA2' }} />
                <Typography variant="h5">Tiered Discounts</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.useTieredDiscounts}
                    onChange={(e) => {
                      const useTiered = e.target.checked;
                      setFormData({ 
                        ...formData, 
                        useTieredDiscounts: useTiered,
                        tieredDiscounts: useTiered && formData.tieredDiscounts.length === 0 
                          ? [{ minMonthsEarly: 1, principalDiscount: 0, interestDiscount: 0, principalDiscountType: 'percentage', interestDiscountType: 'percentage' }]
                          : formData.tieredDiscounts
                      });
                    }}
                    color="primary"
                  />
                }
                label="Use Tiered Discounts (Different discounts based on how many months early they're paying)"
              />
              {formData.useTieredDiscounts && (
                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    Configure different discount rates based on how many months early the customer is paying off the loan. 
                    For example: 5% interest discount for 1-12 months early, 3% for 13-24 months early, 
                    2% for 25-30 months early, 1% for 31+ months early.
                    The discount is calculated as: Total Loan Tenure - Months Into Loan = Months Early.
                    Minimum 1 month early required to qualify for any discount.
                  </Typography>
                </Alert>
              )}
            </Grid>

            {formData.useTieredDiscounts && (
              <>
                {formData.tieredDiscounts.map((tier, index) => (
                  <React.Fragment key={index}>
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6">Tier {index + 1}</Typography>
                          <Button
                            variant="text"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => {
                              const newTiers = formData.tieredDiscounts.filter((_, i) => i !== index);
                              setFormData({ ...formData, tieredDiscounts: newTiers });
                            }}
                            disabled={formData.tieredDiscounts.length === 1}
                          >
                            Remove
                          </Button>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <Input
                              label="Min Months Early"
                              type="number"
                              value={tier.minMonthsEarly !== undefined ? tier.minMonthsEarly : (tier.minMonthsIntoLoan !== undefined ? tier.minMonthsIntoLoan : 1)}
                              onChange={(e) => {
                                const newTiers = [...formData.tieredDiscounts];
                                const value = Math.max(1, parseFloat(e.target.value) || 1); // Minimum 1 month early
                                if (newTiers[index].minMonthsEarly !== undefined) {
                                  newTiers[index].minMonthsEarly = value;
                                } else {
                                  // Migrate from old format
                                  newTiers[index] = {
                                    ...newTiers[index],
                                    minMonthsEarly: value,
                                    maxMonthsEarly: newTiers[index].maxMonthsIntoLoan,
                                  };
                                  delete (newTiers[index] as any).minMonthsIntoLoan;
                                  delete (newTiers[index] as any).maxMonthsIntoLoan;
                                }
                                setFormData({ ...formData, tieredDiscounts: newTiers });
                              }}
                              inputProps={{ min: 1, step: 0.1 }}
                              fullWidth
                              helperText="Minimum months early (1 = at least 1 month early)"
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Input
                              label="Max Months Early (optional)"
                              type="number"
                              value={tier.maxMonthsEarly !== undefined ? (tier.maxMonthsEarly || '') : (tier.maxMonthsIntoLoan !== undefined ? tier.maxMonthsIntoLoan : '')}
                              onChange={(e) => {
                                const newTiers = [...formData.tieredDiscounts];
                                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                if (newTiers[index].maxMonthsEarly !== undefined || newTiers[index].minMonthsEarly !== undefined) {
                                  if (!newTiers[index].minMonthsEarly) {
                                    newTiers[index].minMonthsEarly = 1;
                                  }
                                  newTiers[index].maxMonthsEarly = value;
                                } else {
                                  // Migrate from old format
                                  newTiers[index] = {
                                    ...newTiers[index],
                                    minMonthsEarly: newTiers[index].minMonthsIntoLoan || 1,
                                    maxMonthsEarly: value,
                                  };
                                  delete (newTiers[index] as any).minMonthsIntoLoan;
                                  delete (newTiers[index] as any).maxMonthsIntoLoan;
                                }
                                setFormData({ ...formData, tieredDiscounts: newTiers });
                              }}
                              inputProps={{ min: tier.minMonthsEarly !== undefined ? tier.minMonthsEarly : (tier.minMonthsIntoLoan || 1), step: 0.1 }}
                              fullWidth
                              helperText="Maximum months early (leave empty for unlimited)"
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Select
                              label="Principal Discount Type"
                              value={tier.principalDiscountType}
                              onChange={(e) => {
                                const newTiers = [...formData.tieredDiscounts];
                                newTiers[index].principalDiscountType = e.target.value as 'percentage' | 'fixed';
                                setFormData({ ...formData, tieredDiscounts: newTiers });
                              }}
                              options={discountTypeOptions}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Input
                              label={`Principal Discount (${tier.principalDiscountType === 'percentage' ? '%' : 'QAR'})`}
                              type="number"
                              value={tier.principalDiscount}
                              onChange={(e) => {
                                const newTiers = [...formData.tieredDiscounts];
                                newTiers[index].principalDiscount = parseFloat(e.target.value) || 0;
                                setFormData({ ...formData, tieredDiscounts: newTiers });
                              }}
                              inputProps={{ 
                                min: 0, 
                                max: tier.principalDiscountType === 'percentage' ? 100 : undefined,
                                step: tier.principalDiscountType === 'percentage' ? 0.1 : 0.01
                              }}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Select
                              label="Interest Discount Type"
                              value={tier.interestDiscountType}
                              onChange={(e) => {
                                const newTiers = [...formData.tieredDiscounts];
                                newTiers[index].interestDiscountType = e.target.value as 'percentage' | 'fixed';
                                setFormData({ ...formData, tieredDiscounts: newTiers });
                              }}
                              options={discountTypeOptions}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Input
                              label={`Interest Discount (${tier.interestDiscountType === 'percentage' ? '%' : 'QAR'})`}
                              type="number"
                              value={tier.interestDiscount}
                              onChange={(e) => {
                                const newTiers = [...formData.tieredDiscounts];
                                newTiers[index].interestDiscount = parseFloat(e.target.value) || 0;
                                setFormData({ ...formData, tieredDiscounts: newTiers });
                              }}
                              inputProps={{ 
                                min: 0, 
                                max: tier.interestDiscountType === 'percentage' ? 100 : undefined,
                                step: tier.interestDiscountType === 'percentage' ? 0.1 : 0.01
                              }}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Select
                              label="Installment Discount Type"
                              value={tier.installmentDiscountType || 'percentage'}
                              onChange={(e) => {
                                const newTiers = [...formData.tieredDiscounts];
                                newTiers[index].installmentDiscountType = e.target.value as 'percentage' | 'fixed';
                                setFormData({ ...formData, tieredDiscounts: newTiers });
                              }}
                              options={discountTypeOptions}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Input
                              label={`Installment Discount (${(tier.installmentDiscountType || 'percentage') === 'percentage' ? '%' : 'QAR'})`}
                              type="number"
                              value={tier.installmentDiscount || 0}
                              onChange={(e) => {
                                const newTiers = [...formData.tieredDiscounts];
                                newTiers[index].installmentDiscount = parseFloat(e.target.value) || 0;
                                setFormData({ ...formData, tieredDiscounts: newTiers });
                              }}
                              inputProps={{ 
                                min: 0, 
                                max: (tier.installmentDiscountType || 'percentage') === 'percentage' ? 100 : undefined,
                                step: (tier.installmentDiscountType || 'percentage') === 'percentage' ? 0.1 : 0.01
                              }}
                              fullWidth
                              helperText="Discount on total installment amount (principal + interest)"
                            />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </React.Fragment>
                ))}
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => {
                      const lastTier = formData.tieredDiscounts.length > 0 
                        ? formData.tieredDiscounts[formData.tieredDiscounts.length - 1]
                        : null;
                      const newTier = {
                        minMonthsEarly: lastTier 
                          ? ((lastTier.maxMonthsEarly !== undefined ? lastTier.maxMonthsEarly : (lastTier.maxMonthsIntoLoan || lastTier.minMonthsEarly || lastTier.minMonthsIntoLoan || 1)) + 1)
                          : 1,
                        maxMonthsEarly: undefined,
                        principalDiscount: 0,
                        interestDiscount: 0,
                        installmentDiscount: 0,
                        principalDiscountType: 'percentage' as 'percentage' | 'fixed',
                        interestDiscountType: 'percentage' as 'percentage' | 'fixed',
                        installmentDiscountType: 'percentage' as 'percentage' | 'fixed',
                      };
                      setFormData({ ...formData, tieredDiscounts: [...formData.tieredDiscounts, newTier] });
                    }}
                  >
                    Add Tier
                  </Button>
                </Grid>
              </>
            )}

            {/* Principal Discount Settings */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 2 }}>
                <AccountBalance sx={{ color: '#00CFA2' }} />
                <Typography variant="h5">Principal Amount Discount</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.principalDiscountEnabled}
                    onChange={(e) => setFormData({ ...formData, principalDiscountEnabled: e.target.checked })}
                    color="primary"
                  />
                }
                label="Enable Principal Discount"
              />
            </Grid>

            {formData.principalDiscountEnabled && (
              <>
                <Grid item xs={12} sm={6}>
                  <Select
                    label="Discount Type"
                    value={formData.principalDiscountType}
                    onChange={(e) => setFormData({ ...formData, principalDiscountType: e.target.value as 'percentage' | 'fixed' })}
                    options={discountTypeOptions}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Input
                    label={formData.principalDiscountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (QAR)'}
                    type="number"
                    value={formData.principalDiscountValue}
                    onChange={(e) => setFormData({ ...formData, principalDiscountValue: parseFloat(e.target.value) || 0 })}
                    inputProps={{ 
                      min: 0, 
                      max: formData.principalDiscountType === 'percentage' ? 100 : undefined,
                      step: formData.principalDiscountType === 'percentage' ? 0.1 : 0.01
                    }}
                    fullWidth
                    helperText={
                      formData.principalDiscountType === 'percentage'
                        ? 'Percentage discount on principal amount (0-100%)'
                        : 'Fixed discount amount in QAR'
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Input
                    label="Minimum Principal Amount (QAR)"
                    type="number"
                    value={formData.principalDiscountMinAmount}
                    onChange={(e) => setFormData({ ...formData, principalDiscountMinAmount: parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    helperText="Minimum principal amount required for discount to apply"
                  />
                </Grid>
              </>
            )}

            {/* Interest/Rent Discount Settings */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 2 }}>
                <Percent sx={{ color: '#00CFA2' }} />
                <Typography variant="h5">Interest/Rent Discount</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.interestDiscountEnabled}
                    onChange={(e) => setFormData({ ...formData, interestDiscountEnabled: e.target.checked })}
                    color="primary"
                  />
                }
                label="Enable Interest/Rent Discount"
              />
            </Grid>

            {formData.interestDiscountEnabled && (
              <>
                <Grid item xs={12} sm={6}>
                  <Select
                    label="Discount Type"
                    value={formData.interestDiscountType}
                    onChange={(e) => setFormData({ ...formData, interestDiscountType: e.target.value as 'percentage' | 'fixed' })}
                    options={discountTypeOptions}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Input
                    label={formData.interestDiscountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (QAR)'}
                    type="number"
                    value={formData.interestDiscountValue}
                    onChange={(e) => setFormData({ ...formData, interestDiscountValue: parseFloat(e.target.value) || 0 })}
                    inputProps={{ 
                      min: 0, 
                      max: formData.interestDiscountType === 'percentage' ? 100 : undefined,
                      step: formData.interestDiscountType === 'percentage' ? 0.1 : 0.01
                    }}
                    fullWidth
                    helperText={
                      formData.interestDiscountType === 'percentage'
                        ? 'Percentage discount on interest/rent amount (0-100%)'
                        : 'Fixed discount amount in QAR'
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Input
                    label="Minimum Interest Amount (QAR)"
                    type="number"
                    value={formData.interestDiscountMinAmount}
                    onChange={(e) => setFormData({ ...formData, interestDiscountMinAmount: parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    helperText="Minimum interest/rent amount required for discount to apply"
                  />
                </Grid>
              </>
            )}

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={loadSettings} disabled={saving}>
                  Reset
                </Button>
                <Button variant="primary" onClick={handleSubmit} loading={saving}>
                  Save Settings
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

