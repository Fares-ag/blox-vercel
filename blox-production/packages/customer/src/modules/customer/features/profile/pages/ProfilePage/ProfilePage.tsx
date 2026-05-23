import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Divider,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Save, Edit } from '@mui/icons-material';
import { useAppSelector } from '../../../../store/hooks';
import { Button as CustomButton, Loading } from '@shared/components';
import { supabase } from '@shared/services/supabase.service';
import { toast } from 'react-toastify';
import './ProfilePage.scss';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Qatar',
    },
  });

  // Fetch user metadata from Supabase
  useEffect(() => {
    const fetchUserMetadata = async () => {
      if (!user?.id) {
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error fetching user:', error);
          setLoadingData(false);
          return;
        }

        if (supabaseUser?.user_metadata) {
          const metadata = supabaseUser.user_metadata;
          
          // Format date of birth if it exists
          let dateOfBirth = '';
          if (metadata.date_of_birth) {
            // Handle different date formats
            const dob = metadata.date_of_birth;
            if (dob.includes('T')) {
              dateOfBirth = dob.split('T')[0]; // Extract date part from ISO string
            } else {
              dateOfBirth = dob;
            }
          }

          setFormData({
            firstName: user?.name?.split(' ')[0] || metadata.first_name || '',
            lastName: user?.name?.split(' ').slice(1).join(' ') || metadata.last_name || '',
            email: user?.email || '',
            phone: metadata.phone_number || metadata.phone || '',
            dateOfBirth: dateOfBirth,
            nationality: metadata.nationality || '',
            address: {
              street: metadata.address?.street || metadata.street_address || '',
              city: metadata.address?.city || metadata.city || '',
              state: metadata.address?.state || metadata.state || '',
              postalCode: metadata.address?.postal_code || metadata.postal_code || '',
              country: metadata.address?.country || metadata.country || 'Qatar',
            },
          });
        }
      } catch (error) {
        console.error('Error fetching user metadata:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchUserMetadata();
  }, [user?.id, user?.name, user?.email]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phone,
          date_of_birth: formData.dateOfBirth || null,
          nationality: formData.nationality || null,
          address: {
            street: formData.address.street,
            city: formData.address.city,
            state: formData.address.state,
            postal_code: formData.address.postalCode,
            country: formData.address.country,
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      setEditing(false);
      
      // Reload user metadata to reflect changes
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser?.user_metadata) {
        const metadata = updatedUser.user_metadata;
        let dateOfBirth = '';
        if (metadata.date_of_birth) {
          const dob = metadata.date_of_birth;
          dateOfBirth = dob.includes('T') ? dob.split('T')[0] : dob;
        }
        
        setFormData(prev => ({
          ...prev,
          phone: metadata.phone_number || metadata.phone || prev.phone,
          dateOfBirth: dateOfBirth || prev.dateOfBirth,
          nationality: metadata.nationality || prev.nationality,
          address: {
            street: metadata.address?.street || metadata.street_address || prev.address.street,
            city: metadata.address?.city || metadata.city || prev.address.city,
            state: metadata.address?.state || metadata.state || prev.address.state,
            postalCode: metadata.address?.postal_code || metadata.postal_code || prev.address.postalCode,
            country: metadata.address?.country || metadata.country || prev.address.country,
          },
        }));
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <Loading fullScreen message="Loading profile..." />;
  }

  return (
    <Box className="profile-page">
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        className="back-button"
      >
        Back
      </Button>

      <Typography variant="h4" className="page-title">
        My Profile
      </Typography>

      <Paper className="profile-card">
        <Box className="profile-header">
          <Avatar sx={{ width: 100, height: 100, fontSize: 40 }}>
            {formData.firstName.charAt(0).toUpperCase()}
            {formData.lastName.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5">
              {formData.firstName} {formData.lastName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--secondary-text)' }}>
              {formData.email}
            </Typography>
          </Box>
          {!editing && (
            <CustomButton
              variant="secondary"
              startIcon={<Edit />}
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </CustomButton>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              disabled={true}
              helperText="Name cannot be changed"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              disabled={true}
              helperText="Name cannot be changed"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!editing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!editing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={!editing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nationality"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              disabled={!editing}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Address
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street Address"
              value={formData.address.street}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value },
                })
              }
              disabled={!editing}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="City"
              value={formData.address.city}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value },
                })
              }
              disabled={!editing}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="State/Province"
              value={formData.address.state}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value },
                })
              }
              disabled={!editing}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Postal Code"
              value={formData.address.postalCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, postalCode: e.target.value },
                })
              }
              disabled={!editing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country"
              value={formData.address.country}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, country: e.target.value },
                })
              }
              disabled={!editing}
            />
          </Grid>
        </Grid>

        {editing && (
          <Box className="action-buttons">
            <CustomButton variant="primary" onClick={handleSave} loading={loading} startIcon={<Save />}>
              Save Changes
            </CustomButton>
            <Button variant="outlined" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};


