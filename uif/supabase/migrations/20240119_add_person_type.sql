-- Add person_type column to clients table
ALTER TABLE "clients" 
ADD COLUMN "person_type" text NOT NULL DEFAULT 'PF' CHECK (person_type IN ('PF', 'PJ'));

-- Update existing clients to have distinct values if needed, though they default to PF
-- Since we are wiping data, this is mostly for future reference/safety
