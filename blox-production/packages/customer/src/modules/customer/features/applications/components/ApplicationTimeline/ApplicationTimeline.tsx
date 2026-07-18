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

// Status Colors - Colorful and clear
const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: { label: 'Draft Created', color: '#FF9800', icon: <Pending /> }, // Orange
  under_review: { label: 'Under Review', color: '#FFC107', icon: <AccessTime /> }, // Amber/Yellow
  active: { label: 'Approved', color: '#2A2A2A', icon: <CheckCircle /> },
  completed: { label: 'Completed', color: '#2E7D32', icon: <CheckCircle /> },
  rejected: { label: 'Rejected', color: '#C62828', icon: <Cancel /> },
  contract_signing_required: {
    label: 'Contract Signing Required',
    color: '#5C5346',
    icon: <AccessTime />,
  },
  resubmission_required: {
    label: 'Resubmission Required',
    color: '#E65100',
    icon: <Pending />,
  },
  contracts_submitted: {
    label: 'Contracts Submitted',
    color: '#2A2A2A',
    icon: <CheckCircle />,
  },
  contract_under_review: {
    label: 'Contract Under Review',
    color: '#F9A825',
    icon: <AccessTime />,
  },
  down_payment_required: {
    label: 'Down Payment Required',
    color: '#E65100',
    icon: <AccessTime />,
  },
  down_payment_submitted: {
    label: 'Down Payment Submitted',
    color: '#2A2A2A',
    icon: <CheckCircle />,
  },
  submission_cancelled: {
    label: 'Cancelled',
    color: '#757575', // Grey
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

          const isDraft = event.status === 'draft';
          const dotBg = isDraft ? config.color : (isActive ? config.color : '#C9C4B7');
          const iconColor = isDraft
            ? '#FFFFFF'
            : isActive
              ? (config.color === '#FFC107' || config.color === '#FF9800' ? '#FFFFFF' : '#FFFFFF')
              : '#787663';

          return (
            <TimelineItem key={index}>
              <TimelineSeparator>
                <TimelineDot
                  sx={{
                    backgroundColor: dotBg,
                    color: iconColor,
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

