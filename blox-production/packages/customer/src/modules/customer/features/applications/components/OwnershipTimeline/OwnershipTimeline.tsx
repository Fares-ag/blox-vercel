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
  LinearProgress,
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
import './OwnershipTimeline.scss';

interface OwnershipTimelineProps {
  application: Application;
}

export const OwnershipTimeline: React.FC<OwnershipTimelineProps> = ({ application }) => {
  const timeline = calculateOwnershipTimeline(application);

  const getMilestoneIcon = (milestone: OwnershipMilestone) => {
    if (milestone.milestone === 'full_owner') return <EmojiEvents sx={{ color: '#FF6B35' }} />;
    if (milestone.milestone === 'almost_there') return <EmojiEvents sx={{ color: '#9C27B0' }} />;
    if (milestone.milestone === 'halfway') return <EmojiEvents sx={{ color: '#2196F3' }} />;
    if (milestone.paymentStatus === 'paid') return <CheckCircle sx={{ color: '#4CAF50' }} />;
    if (milestone.paymentStatus === 'missed') return <Schedule sx={{ color: '#F44336' }} />;
    return <Schedule sx={{ color: '#9E9E9E' }} />;
  };

  const getMilestoneColor = (milestone: OwnershipMilestone): string => {
    if (milestone.paymentStatus === 'paid') return '#4CAF50';
    if (milestone.paymentStatus === 'missed') return '#F44336';
    return '#9E9E9E';
  };

  // Filter milestones to show key ones (every 25% or special milestones)
  const keyMilestones = timeline.milestones.filter((m, index) => {
    // Always show first and last
    if (index === 0 || index === timeline.milestones.length - 1) return true;
    // Show milestone markers
    if (m.milestone) return true;
    // Show every 4th payment for visibility
    return index % 4 === 0;
  });

  return (
    <Box className="ownership-timeline">
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Ownership Journey
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track your progress toward full ownership
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" fontWeight={700} color="primary">
              {timeline.currentOwnership.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Current Ownership
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              0%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              100%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={timeline.progressPercentage}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                background: 'linear-gradient(90deg, #00CFA2 0%, #00B892 100%)',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(timeline.milestones[0]?.ownershipAmount || 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(application.vehicle?.price || 0)}
            </Typography>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6" fontWeight={600} color="primary">
              {timeline.completedPayments}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Payments Completed
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600} color="text.secondary">
              {timeline.totalPayments - timeline.completedPayments}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Payments Remaining
            </Typography>
          </Box>
          {timeline.estimatedCompletionDate && (
            <Box>
              <Typography variant="h6" fontWeight={600} color="text.secondary">
                {moment(timeline.estimatedCompletionDate).format('MMM YYYY')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Est. Completion
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Timeline Stepper */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
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
                      backgroundColor: milestone.paymentStatus === 'paid' ? '#4CAF50' : '#E0E0E0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    {getMilestoneIcon(milestone)}
                  </Box>
                )}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
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
                      label={`${milestone.ownershipPercentage.toFixed(1)}% Ownership`}
                      size="small"
                      icon={<TrendingUp />}
                      sx={{ backgroundColor: '#E3F2FD', color: '#1976D2' }}
                    />
                    <Chip
                      label={formatCurrency(milestone.ownershipAmount)}
                      size="small"
                      sx={{ backgroundColor: '#F3E5F5', color: '#7B1FA2' }}
                    />
                    <Chip
                      label={formatDate(milestone.date)}
                      size="small"
                      sx={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
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

