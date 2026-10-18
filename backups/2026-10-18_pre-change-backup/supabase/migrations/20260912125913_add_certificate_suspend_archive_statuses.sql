-- Add columns for suspend/archive tracking
ALTER TABLE mw_certificates 
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update the status check constraint to allow 'suspended' and 'archived'
ALTER TABLE mw_certificates DROP CONSTRAINT IF EXISTS mw_certificates_status_check;
ALTER TABLE mw_certificates ADD CONSTRAINT mw_certificates_status_check 
  CHECK (status IN ('active', 'expired', 'revoked', 'pending', 'suspended', 'archived'));

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_mw_certificates_status ON mw_certificates(status);
