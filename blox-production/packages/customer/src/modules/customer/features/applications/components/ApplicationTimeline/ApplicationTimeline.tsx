import React from 'react';
import { Box, Typography } from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import { CheckCircle, Pending, Cancel, AccessTime } from '@mui/icons-material';
import { formatDate } from '@shared/utils/formatters';
import type { ApplicationStatus } from '@shared/models/application.model';
import './ApplicationTimeline.scss';

export interface TimelineEvent {
  status: ApplicationStatus;
  date: string;
  note?: string;
}

interface ApplicationTimelineProps {
  events: TimelineEvent[];
  currentStatus: ApplicationStatus;
}

// Blox Brand Colors
const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: { label: 'Draft Created', color: '#C9C4B7', icon: <Pending /> }, // Mid Grey
  under_review: { label: 'Under Review', color: '#DAFF01', icon: <AccessTime /> }, // Lime Yellow
  active: { label: 'Approved', color: '#787663', icon: <CheckCircle /> }, // Dark Grey
  completed: { label: 'Completed', color: '#787663', icon: <CheckCircle /> }, // Dark Grey
  rejected: { label: 'Rejected', color: '#0E1909', icon: <Cancel /> }, // Blox Black
  contract_signing_required: {
    label: 'Contract Signing Required',
    color: '#787663', // Dark Grey
    icon: <AccessTime />,
  },
  resubmission_required: {
    label: 'Resubmission Required',
    color: '#787663', // Dark Grey
    icon: <Pending />,
  },
  contracts_submitted: {
    label: 'Contracts Submitted',
    color: '#DAFF01', // Lime Yellow
    icon: <CheckCircle />,
  },
  contract_under_review: {
    label: 'Contract Under Review',
    color: '#DAFF01', // Lime Yellow
    icon: <AccessTime />,
  },
  down_payment_required: {
    label: 'Down Payment Required',
    color: '#787663', // Dark Grey
    icon: <AccessTime />,
  },
  down_payment_submitted: {
    label: 'Down Payment Submitted',
    color: '#787663', // Dark Grey
    icon: <CheckCircle />,
  },
  submission_cancelled: {
    label: 'Cancelled',
    color: '#0E1909', // Blox Black
    icon: <Cancel />,
  },
};

export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  events,
  currentStatus,
}) => {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Box className="application-timeline">
      <Typography variant="h6" className="timeline-title">
        Application Timeline
      </Typography>
      <Timeline sx={{ '& .MuiTimelineContent-root': { textAlign: 'left' } }}>
        {sortedEvents.map((event, index) => {
          const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.draft;
          const isLast = index === sortedEvents.length - 1;
          const isActive = event.status === currentStatus;

          return (
            <TimelineItem key={index}>
              <TimelineSeparator>
                <TimelineDot
                  sx={{
                    backgroundColor: isActive ? config.color : '#C9C4B7', // Mid Grey for inactive
                    color: isActive 
                      ? (config.color === '#DAFF01' ? '#0E1909' : '#FFFFFF') // Blox Black for Lime Yellow, white for others
                      : '#787663', // Dark Grey for inactive icons
                  }}
                >
                  {config.icon}
                </TimelineDot>
                {!isLast && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent sx={{ textAlign: 'left', flex: 1 }}>
                <Box className="timeline-content-box">
                  <Typography variant="subtitle2" fontWeight={isActive ? 600 : 400} sx={{ textAlign: 'left' }}>
                    {config.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'left' }}>
                    {formatDate(event.date)}
                  </Typography>
                  {event.note && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textAlign: 'left' }}>
                      {event.note}
                    </Typography>
                  )}
                </Box>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Box>
  );
};

