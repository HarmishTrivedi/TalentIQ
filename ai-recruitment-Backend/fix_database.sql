-- ============================================
-- FIX: Add Missing Columns to Interviews Table
-- ============================================
-- Run this SQL on your Render database

-- Add candidate_access_token column
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS candidate_access_token VARCHAR(100);

-- Add interview_types column
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS interview_types JSON;

-- Create unique index on candidate_access_token
CREATE UNIQUE INDEX IF NOT EXISTS ix_interviews_candidate_access_token 
ON interviews(candidate_access_token);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name IN ('candidate_access_token', 'interview_types');

-- Expected output:
--       column_name        |     data_type     | is_nullable
-- -------------------------+-------------------+-------------
--  candidate_access_token  | character varying | YES
--  interview_types         | json              | YES
