-- Add isActive field to integrations table
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT true;

-- Update existing Kixie integrations to be active
UPDATE integrations SET isActive = true WHERE provider = 'kixie';

-- Add a comment for documentation
COMMENT ON COLUMN integrations.isActive IS 'Whether the integration is active or disabled';
