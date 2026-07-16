import React from 'react';
import { Box } from '@mui/material';
import { Skeleton } from '@shared/components';

interface PageSkeletonProps {
  /** denser form/detail layout vs list */
  variant?: 'detail' | 'form' | 'list';
}

/**
 * In-page loading shell for Admin detail/edit screens.
 * Prefer this over full-screen Loading for calmer ops UX.
 */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  variant = 'detail',
}) => {
  if (variant === 'list') {
    return (
      <Box className="page-skeleton" display="flex" flexDirection="column" gap={2}>
        <Skeleton height={40} width={220} />
        <Skeleton height={20} width={280} />
        <Skeleton height={48} />
        <Skeleton height={360} />
      </Box>
    );
  }

  if (variant === 'form') {
    return (
      <Box className="page-skeleton" display="flex" flexDirection="column" gap={2} maxWidth={720}>
        <Skeleton height={36} width={200} />
        <Skeleton height={18} width={260} />
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={120} />
        <Box display="flex" gap={2} justifyContent="flex-end">
          <Skeleton height={44} width={120} />
          <Skeleton height={44} width={140} />
        </Box>
      </Box>
    );
  }

  return (
    <Box className="page-skeleton" display="flex" flexDirection="column" gap={2}>
      <Skeleton height={36} width={260} />
      <Skeleton height={18} width={320} />
      <Box display="flex" gap={2} flexWrap="wrap">
        <Skeleton height={40} width={120} />
        <Skeleton height={40} width={120} />
        <Skeleton height={40} width={140} />
      </Box>
      <Skeleton height={220} />
      <Skeleton height={220} />
    </Box>
  );
};
