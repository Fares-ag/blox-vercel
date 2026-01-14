import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { type StepProps } from '@shared/components';
import { formatDate, formatCurrency } from '@shared/utils/formatters';
import './ReviewStep.scss';

export const ReviewStep: React.FC<StepProps> = ({ data }) => {
  return (
    <Box className="review-step">
      <Typography variant="h3" className="section-title">
        Review Application
      </Typography>

      <Paper className="review-section">
        <Typography variant="h4" className="section-subtitle">
          Customer Information
        </Typography>
        <Divider sx={{ my: 2 }} />
        {data.customerInfo ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                Name
              </Typography>
              <Typography variant="body1">
                {data.customerInfo.firstName || ''} {data.customerInfo.lastName || ''}
              </Typography>
            </Grid>
            {data.customerInfo.email && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1">{data.customerInfo.email}</Typography>
              </Grid>
            )}
            {data.customerInfo.phone && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Phone
                </Typography>
                <Typography variant="body1">{data.customerInfo.phone}</Typography>
              </Grid>
            )}
            {data.customerInfo.dateOfBirth && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Date of Birth
                </Typography>
                <Typography variant="body1">
                  {formatDate(data.customerInfo.dateOfBirth)}
                </Typography>
              </Grid>
            )}
            {data.customerInfo.nationality && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Nationality
                </Typography>
                <Typography variant="body1">{data.customerInfo.nationality}</Typography>
              </Grid>
            )}
            {(data.customerInfo.street || data.customerInfo.city || data.customerInfo.country) && (
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Address
                </Typography>
                <Typography variant="body1">
                  {[
                    data.customerInfo.street,
                    data.customerInfo.city,
                    data.customerInfo.country,
                    data.customerInfo.postalCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Typography>
              </Grid>
            )}
            {(data.customerInfo.position || data.customerInfo.company) && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Employment
                </Typography>
                <Typography variant="body1">
                  {[data.customerInfo.position, data.customerInfo.company].filter(Boolean).join(' at ')}
                </Typography>
              </Grid>
            )}
            {data.customerInfo.employmentType && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Employment Type
                </Typography>
                <Typography variant="body1">{data.customerInfo.employmentType}</Typography>
              </Grid>
            )}
            {data.customerInfo.employmentDuration && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Employment Duration
                </Typography>
                <Typography variant="body1">{data.customerInfo.employmentDuration}</Typography>
              </Grid>
            )}
            {data.customerInfo.monthlyIncome && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Monthly Income
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(data.customerInfo.monthlyIncome)}
                </Typography>
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No customer information provided
          </Typography>
        )}
      </Paper>

      <Paper className="review-section">
        <Typography variant="h4" className="section-subtitle">
          Vehicle Information
        </Typography>
        <Divider sx={{ my: 2 }} />
        {data.vehicle ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                Vehicle
              </Typography>
              <Typography variant="body1">
                {[data.vehicle.make, data.vehicle.model, data.vehicle.trim].filter(Boolean).join(' ')}
              </Typography>
            </Grid>
            {data.vehicle.modelYear && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Year
                </Typography>
                <Typography variant="body1">{data.vehicle.modelYear}</Typography>
              </Grid>
            )}
            {data.vehicle.price && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Price
                </Typography>
                <Typography variant="body1">{formatCurrency(data.vehicle.price)}</Typography>
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No vehicle selected
          </Typography>
        )}
      </Paper>

      <Paper className="review-section">
        <Typography variant="h4" className="section-subtitle">
          Offer & Installment Plan
        </Typography>
        <Divider sx={{ my: 2 }} />
        {data.offer ? (
          <Grid container spacing={2}>
            {data.offer.name && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Offer
                </Typography>
                <Typography variant="body1">{data.offer.name}</Typography>
              </Grid>
            )}
            {data.offer.annualRentRate !== undefined && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Annual Rent Rate
                </Typography>
                <Typography variant="body1">{data.offer.annualRentRate}%</Typography>
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            No offer selected
          </Typography>
        )}
        {data.installmentPlan ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              {data.installmentPlan.downPayment !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Down Payment
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(data.installmentPlan.downPayment)}
                  </Typography>
                </Grid>
              )}
              {data.installmentPlan.tenure && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Tenure
                  </Typography>
                  <Typography variant="body1">{data.installmentPlan.tenure}</Typography>
                </Grid>
              )}
              {data.installmentPlan.interval && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Payment Interval
                  </Typography>
                  <Typography variant="body1">{data.installmentPlan.interval}</Typography>
                </Grid>
              )}
              {data.installmentPlan.monthlyAmount !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    {data.installmentPlan.calculationMethod === 'amortized_fixed'
                      ? 'Monthly Payment'
                      : 'First Month Payment'}
                  </Typography>
                  <Typography variant="body1" className="highlight">
                    {formatCurrency(data.installmentPlan.monthlyAmount)}
                  </Typography>
                  {data.installmentPlan.calculationMethod !== 'amortized_fixed' && (
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}
                    >
                    (Payments decrease over time)
                  </Typography>
                  )}
                </Grid>
              )}
              {data.installmentPlan.totalAmount !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Total Amount
                  </Typography>
                  <Typography variant="body1" className="highlight">
                    {formatCurrency(data.installmentPlan.totalAmount)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No installment plan configured
          </Typography>
        )}
        {data.existingLoan && data.existingLoan.enabled && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>
              Existing Loan Information
            </Typography>
            <Grid container spacing={2}>
              {data.existingLoan.entryMode && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Entry Mode
                  </Typography>
                  <Typography variant="body1">
                    {data.existingLoan.entryMode === 'auto' 
                      ? 'Automatic (Calculate from rates)'
                      : data.existingLoan.entryMode === 'fixed'
                      ? 'Fixed Monthly (Amortized)'
                      : data.existingLoan.entryMode === 'balloon'
                      ? 'Balloon Payment Structure'
                      : 'Manual Entry'}
                  </Typography>
                </Grid>
              )}
              {data.existingLoan.startDate && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Loan Start Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(data.existingLoan.startDate)}
                  </Typography>
                </Grid>
              )}
              {data.existingLoan.totalMonths && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Total Loan Months
                  </Typography>
                  <Typography variant="body1">{data.existingLoan.totalMonths} months</Typography>
                </Grid>
              )}
              {data.existingLoan.downPayment !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Down Payment
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(data.existingLoan.downPayment)}
                  </Typography>
                </Grid>
              )}
              {data.existingLoan.monthlyAmount && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Monthly Payment Amount
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(data.existingLoan.monthlyAmount)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </Paper>

      <Paper className="review-section">
        <Typography variant="h4" className="section-subtitle">
          Documents
        </Typography>
        <Divider sx={{ my: 2 }} />
        {data.documents && data.documents.length > 0 ? (
          <Grid container spacing={1}>
            {data.documents.map((doc: any) => (
              <Grid item xs={12} key={doc.id}>
                <Typography variant="body2">✓ {doc.name}</Typography>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No documents uploaded
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
