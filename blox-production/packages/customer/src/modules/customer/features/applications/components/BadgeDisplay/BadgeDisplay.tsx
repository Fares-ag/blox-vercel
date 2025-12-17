import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  LinearProgress,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  EmojiEvents,
  Lock,
  CheckCircle,
} from '@mui/icons-material';
import type { Application } from '@shared/models/application.model';
import { calculateBadges, getBadgeProgress, type Badge } from '@shared/utils/badges.utils';
import { formatDate } from '@shared/utils/formatters';
import './BadgeDisplay.scss';

interface BadgeDisplayProps {
  application: Application;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ application }) => {
  const badges = calculateBadges(application);
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);

  const BadgeCard: React.FC<{ badge: Badge }> = ({ badge }) => {
    const progress = getBadgeProgress(badge);
    const isUnlocked = badge.unlocked;

    return (
      <Card
        className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}
        sx={{
          height: '100%',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: isUnlocked ? 'translateY(-4px)' : 'none',
            boxShadow: isUnlocked ? 4 : 1,
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: isUnlocked ? badge.color : '#E0E0E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                flexShrink: 0,
                opacity: isUnlocked ? 1 : 0.5,
              }}
            >
              {isUnlocked ? badge.icon : <Lock sx={{ color: '#9E9E9E', fontSize: 28 }} />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ color: isUnlocked ? 'text.primary' : 'text.secondary' }}>
                  {badge.name}
                </Typography>
                {isUnlocked && (
                  <CheckCircle sx={{ color: '#4CAF50', fontSize: 18 }} />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {badge.description}
              </Typography>
              {isUnlocked && badge.unlockedDate && (
                <Chip
                  label={`Unlocked ${formatDate(badge.unlockedDate)}`}
                  size="small"
                  sx={{
                    backgroundColor: '#E8F5E9',
                    color: '#2E7D32',
                    fontSize: '10px',
                    height: 20,
                  }}
                />
              )}
              {!isUnlocked && badge.progress !== undefined && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {progress.current}/{progress.target}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress.percentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#E0E0E0',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        backgroundColor: badge.color,
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box className="badge-display">
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Achievements & Badges
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unlock badges as you progress on your ownership journey
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" fontWeight={700} color="primary">
              {unlockedBadges.length}/{badges.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Badges Unlocked
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <LinearProgress
          variant="determinate"
          value={(unlockedBadges.length / badges.length) * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: '#E0E0E0',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: 'linear-gradient(90deg, #00CFA2 0%, #00B892 100%)',
            },
          }}
        />
      </Paper>

      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEvents sx={{ color: '#FFD700' }} />
            Unlocked Badges
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {unlockedBadges.map((badge) => (
              <Grid item xs={12} sm={6} md={4} key={badge.id}>
                <BadgeCard badge={badge} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock sx={{ color: '#9E9E9E' }} />
            Locked Badges
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {lockedBadges.map((badge) => (
              <Grid item xs={12} sm={6} md={4} key={badge.id}>
                <BadgeCard badge={badge} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

