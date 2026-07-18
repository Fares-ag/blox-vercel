import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  TrendingUp,
  EmojiEvents,
} from '@mui/icons-material';
import type { Application } from '@shared/models/application.model';
import { calculateOwnershipTimeline, type OwnershipMilestone } from '@shared/utils/ownership-timeline.utils';
import { formatDate, formatCurrency } from '@shared/utils/formatters';
import moment from 'moment';
import { OwnershipBlocksCanvas } from '../OwnershipBlocksCanvas/OwnershipBlocksCanvas';
import './OwnershipTimeline.scss';

interface OwnershipTimelineProps {
  application: Application;
}

export const OwnershipTimeline: React.FC<OwnershipTimelineProps> = ({ application }) => {
  const timeline = calculateOwnershipTimeline(application);

  const getMilestoneIcon = (milestone: OwnershipMilestone) => {
    if (milestone.milestone === 'full_owner') return <EmojiEvents sx={{ color: '#FF6B35' }} />;
    if (milestone.milestone === 'almost_there') return <EmojiEvents sx={{ color: '#5C5346' }} />;
    if (milestone.milestone === 'halfway') return <EmojiEvents sx={{ color: '#2A2A2A' }} />;
    if (milestone.paymentStatus === 'paid') return <CheckCircle sx={{ color: '#4CAF50' }} />;
    if (milestone.paymentStatus === 'missed') return <Schedule sx={{ color: '#F44336' }} />;
    return <Schedule sx={{ color: '#9E9E9E' }} />;
  };

  const getMilestoneColor = (milestone: OwnershipMilestone): string => {
    if (milestone.paymentStatus === 'paid') return '#4CAF50';
    if (milestone.paymentStatus === 'missed') return '#F44336';
    return '#9E9E9E';
  };

  const keyMilestones = timeline.milestones.filter((m, index) => {
    if (index === 0 || index === timeline.milestones.length - 1) return true;
    if (m.milestone) return true;
    return index % 4 === 0;
  });

  return (
    <Box className="ownership-timeline">
      <OwnershipBlocksCanvas ownershipPct={timeline.currentOwnership} />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box className="ownership-stats" sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6" fontWeight={700} className="stat-value" sx={{ color: 'var(--primary-text)' }}>
              {timeline.completedPayments}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--secondary-text)' }}>Payments Completed</Typography>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--primary-text)' }}>
              {timeline.totalPayments - timeline.completedPayments}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--secondary-text)' }}>Payments Remaining</Typography>
          </Box>
          {timeline.estimatedCompletionDate && (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--primary-text)' }}>
                {moment(timeline.estimatedCompletionDate).format('MMM YYYY')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--secondary-text)' }}>Est. Completion</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'var(--primary-text)' }}>
          Ownership Timeline
        </Typography>
        <Stepper orientation="vertical" sx={{ mt: 2 }}>
          {keyMilestones.map((milestone, index) => (
            <Step key={index} active={milestone.paymentStatus === 'paid'} completed={milestone.paymentStatus === 'paid'}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: milestone.paymentStatus === 'paid' ? '#2E7D32' : 'var(--card-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: milestone.paymentStatus === 'paid' ? '#fff' : 'var(--secondary-text)',
                    }}
                  >
                    {getMilestoneIcon(milestone)}
                  </Box>
                )}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'var(--primary-text)' }}>
                    {milestone.label}
                  </Typography>
                  {milestone.milestone && (
                    <Chip
                      label={milestone.milestone.replace('_', ' ').toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getMilestoneColor(milestone),
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '10px',
                      }}
                    />
                  )}
                </Box>
              </StepLabel>
              <StepContent>
                <Box sx={{ pl: 4, pb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      className="milestone-chip-ownership"
                      label={`${milestone.ownershipPercentage.toFixed(1)}% Ownership`}
                      size="small"
                      icon={<TrendingUp sx={{ color: 'inherit !important' }} />}
                    />
                    <Chip className="milestone-chip-amount" label={formatCurrency(milestone.ownershipAmount)} size="small" />
                    <Chip className="milestone-chip-date" label={formatDate(milestone.date)} size="small" />
                  </Box>
                  <Typography variant="body2" sx={{ color: 'var(--secondary-text)' }}>
                    Payment #{milestone.paymentIndex + 1} of {timeline.totalPayments}
                  </Typography>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};
