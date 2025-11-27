/*
  # Update user measurements table - remove hips column

  1. Changes
    - Drop hips column from user_measurements table
    - Hips measurement is no longer needed for size recommendations
  
  2. Notes
    - This change is backward compatible as we use IF EXISTS
    - Existing data in hips column will be removed
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_measurements' AND column_name = 'hips'
  ) THEN
    ALTER TABLE user_measurements DROP COLUMN hips;
  END IF;
END $$;
