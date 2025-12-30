import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Send, Email, Phone, LocationOn } from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import { toast } from 'react-toastify';
import './ContactSupportPage.scss';

const SUPPORT_TOPICS = [
  { value: 'application', label: 'Application Inquiry' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'contract', label: 'Contract Related' },
  { value: 'other', label: 'Other' },
];

export const ContactSupportPage: React.FC = () => {
  const [formData, setFormData] = useState({
    topic: '',
    subject: '',
    message: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.topic) {
      newErrors.topic = 'Please select a topic';
    }
    if (!formData.subject || formData.subject.length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
    }
    if (!formData.message || formData.message.length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      // TODO: Replace with actual API call
      // await apiService.post('/customer/support/contact', formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Your message has been sent. We will get back to you soon!');
      setFormData({
        topic: '',
        subject: '',
        message: '',
        email: '',
        phone: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box className="contact-support-page">
      <Typography variant="h4" className="page-title">
        Contact Support
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper className="contact-form-card">
            <Typography variant="h6" className="section-title">
              Send us a Message
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Our support team typically responds within 24 hours. For urgent matters, please call us directly.
            </Alert>

            <form onSubmit={handleSubmit}>
              <FormControl fullWidth error={!!errors.topic} sx={{ mb: 3 }}>
                <InputLabel>Topic</InputLabel>
                <Select
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  label="Topic"
                >
                  {SUPPORT_TOPICS.map((topic) => (
                    <MenuItem key={topic.value} value={topic.value}>
                      {topic.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.topic && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {errors.topic}
                  </Typography>
                )}
              </FormControl>

              <TextField
                fullWidth
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                error={!!errors.subject}
                helperText={errors.subject}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!errors.email}
                helperText={errors.email}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Phone (Optional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Message"
                multiline
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                error={!!errors.message}
                helperText={errors.message}
                sx={{ mb: 3 }}
              />

              <CustomButton
                variant="primary"
                type="submit"
                loading={submitting}
                startIcon={<Send />}
              >
                Send Message
              </CustomButton>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className="contact-info-card">
            <Typography variant="h6" className="section-title">
              Get in Touch
            </Typography>

            <Box className="contact-item">
              <Phone sx={{ color: '#DAFF01', mr: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  +974 1234 5678
                </Typography>
              </Box>
            </Box>

            <Box className="contact-item">
              <Email sx={{ color: '#DAFF01', mr: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  support@blox.com
                </Typography>
              </Box>
            </Box>

            <Box className="contact-item">
              <LocationOn sx={{ color: '#DAFF01', mr: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  Doha, Qatar
                </Typography>
              </Box>
            </Box>

            <Box className="business-hours">
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Business Hours
              </Typography>
              <Typography variant="body2">Sunday - Thursday: 8:00 AM - 6:00 PM</Typography>
              <Typography variant="body2">Friday: Closed</Typography>
              <Typography variant="body2">Saturday: 9:00 AM - 1:00 PM</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};


