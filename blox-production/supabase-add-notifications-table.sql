-- ============================================
-- Add Notifications Table
-- ============================================
-- Run this script in Supabase Dashboard -> SQL Editor
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('success', 'info', 'warning', 'error')) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies - Allow users to read their own notifications
CREATE POLICY "Users can read their own notifications" ON notifications 
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- Allow authenticated users to insert notifications (for admin/system)
CREATE POLICY "Allow authenticated insert" ON notifications 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications 
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE notifications IS 'Customer notifications for application updates, resubmissions, etc.';

