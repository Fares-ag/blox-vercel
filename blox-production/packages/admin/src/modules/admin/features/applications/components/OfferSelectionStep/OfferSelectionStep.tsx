import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { type StepProps, Loading, Button, Input, Select, type SelectOption } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import type { Offer } from '@shared/models/offer.model';
import { toast } from 'react-toastify';
import './OfferSelectionStep.scss';

// Dummy data removed - using only localStorage and API

export const OfferSelectionStep: React.FC<StepProps> = ({ data, updateData }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string>(data.offerId || '');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({
    name: '',
    annualRentRate: '' as string,
    annualRentRateFunder: '' as string,
    status: 'active' as 'active' | 'deactive',
    isDefault: false,
  });

  useEffect(() => {
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getOffers();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        setOffers(supabaseResponse.data);
        if (!selectedOfferId && supabaseResponse.data.length > 0) {
          const defaultOffer = supabaseResponse.data.find((o) => o.isDefault) || supabaseResponse.data[0];
          setSelectedOfferId(defaultOffer.id);
          updateData({ offerId: defaultOffer.id, offer: defaultOffer });
        }
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load offers');
      }
    } catch (error: any) {
      console.error('❌ Failed to load offers:', error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'deactive', label: 'Deactive' },
  ];

  const openAddOfferDialog = () => {
    setNewOffer({
      name: '',
      annualRentRate: '',
      annualRentRateFunder: '',
      status: 'active',
      isDefault: false,
    });
    setAddDialogOpen(true);
  };

  const handleCreateOffer = async () => {
    // All fields optional (draft-friendly). We still must satisfy DB NOT NULL columns:
    // - name, annual_rent_rate, annual_rent_rate_funder
    const name = newOffer.name.trim() || `Draft Offer ${Date.now()}`;
    const annualRentRate = (() => {
      const n = Number.parseFloat(newOffer.annualRentRate);
      return Number.isFinite(n) ? n : 0;
    })();
    const annualRentRateFunder = (() => {
      const n = Number.parseFloat(newOffer.annualRentRateFunder);
      return Number.isFinite(n) ? n : 0;
    })();

    setCreatingOffer(true);
    try {
      const res = await supabaseApiService.createOffer({
        name,
        annualRentRate,
        annualRentRateFunder,
        isDefault: !!newOffer.isDefault,
        status: newOffer.status,
        isAdmin: true,
        // Optional fields omitted
        insuranceRateId: '',
      } as any);

      if (res.status !== 'SUCCESS' || !res.data) {
        throw new Error(res.message || 'Failed to create offer');
      }

      toast.success('Offer created');
      setAddDialogOpen(false);

      // Refresh list and select the new offer
      await loadOffers();
      setSelectedOfferId(res.data.id);
      updateData({ offerId: res.data.id, offer: res.data });
    } catch (e: any) {
      console.error('❌ Failed to create offer:', e);
      toast.error(e.message || 'Failed to create offer');
    } finally {
      setCreatingOffer(false);
    }
  };

  const handleOfferChange = (offerId: string) => {
    setSelectedOfferId(offerId);
    const selectedOffer = offers.find((o) => o.id === offerId);
    if (selectedOffer) {
      updateData({ offerId: selectedOffer.id, offer: selectedOffer });
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (offers.length === 0) {
    return (
      <Box className="offer-selection-step">
        <Typography variant="h3" className="section-title">
          Select Offer
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          No offers available. Please contact administrator.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="offer-selection-step">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Typography variant="h3" className="section-title">
          Select Offer
        </Typography>
        <Button variant="secondary" onClick={openAddOfferDialog}>
          + Add New Offer
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose an offer to calculate the rental rate for this application. The annual rental rate from the selected offer will be used for installment calculations.
      </Typography>

      <RadioGroup value={selectedOfferId || ''} onChange={(e) => handleOfferChange(e.target.value)}>
        <Grid container spacing={2}>
          {offers.map((offer) => (
            <Grid item xs={12} md={6} key={offer.id}>
              <Paper
                className={`offer-card ${selectedOfferId === offer.id ? 'selected' : ''} ${offer.isDefault ? 'default' : ''}`}
                onClick={() => handleOfferChange(offer.id)}
              >
                <FormControlLabel
                  value={offer.id}
                  control={<Radio />}
                  label=""
                  sx={{ margin: 0 }}
                />
                <Box className="offer-content">
                  <Box className="offer-header">
                    <Typography variant="h4">{offer.name}</Typography>
                    {offer.isDefault && (
                      <Typography variant="caption" className="default-badge">
                        Default
                      </Typography>
                    )}
                  </Box>
                  <Box className="offer-details">
                    <Typography variant="body2">
                      Annual Rent Rate: <strong>{offer.annualRentRate}%</strong>
                    </Typography>
                    <Typography variant="body2">
                      Insurance: <strong>
                        {offer.insuranceRate?.name || offer.insuranceRateId 
                          ? (offer.insuranceRate?.annualRate || offer.annualInsuranceRate || 'N/A') + '%'
                          : offer.annualInsuranceRate 
                            ? offer.annualInsuranceRate + '%'
                            : 'Not set'}
                      </strong>
                      {offer.insuranceRate?.coverageType && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, textTransform: 'capitalize' }}>
                          {offer.insuranceRate.coverageType}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </RadioGroup>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Offer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Input
                label="Offer Name"
                value={newOffer.name}
                onChange={(e) => setNewOffer((v) => ({ ...v, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Annual Rent Rate (%)"
                type="number"
                inputProps={{ step: '0.01', min: 0 }}
                placeholder="0 for interest-free"
                helperText="Enter 0 for interest-free offers"
                value={newOffer.annualRentRate}
                onChange={(e) => setNewOffer((v) => ({ ...v, annualRentRate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Annual Rent Rate Funder (%)"
                type="number"
                inputProps={{ step: '0.01', min: 0 }}
                placeholder="0 for interest-free"
                helperText="Enter 0 for interest-free offers"
                value={newOffer.annualRentRateFunder}
                onChange={(e) => setNewOffer((v) => ({ ...v, annualRentRateFunder: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Status"
                value={newOffer.status}
                onChange={(e) => setNewOffer((v) => ({ ...v, status: e.target.value as any }))}
                options={statusOptions}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newOffer.isDefault}
                    onChange={(e) => setNewOffer((v) => ({ ...v, isDefault: e.target.checked }))}
                  />
                }
                label="Set as default"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="secondary" onClick={() => setAddDialogOpen(false)} disabled={creatingOffer}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateOffer} loading={creatingOffer}>
            Create Offer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
