/*
  # Create user measurements table

  1. New Tables
    - `user_measurements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `waist` (numeric, user's waist measurement in inches)
      - `inseam` (numeric, user's inseam measurement in inches)
      - `hips` (numeric, user's hips measurement in inches)
      - `created_at` (timestamptz, timestamp of when measurement was created)
      - `updated_at` (timestamptz, timestamp of when measurement was last updated)
  
  2. Security
    - Enable RLS on `user_measurements` table
    - Add policy for authenticated users to read their own measurements
    - Add policy for authenticated users to insert their own measurements
    - Add policy for authenticated users to update their own measurements
  
  3. Notes
    - Each user can only have one measurement record
    - Measurements are stored in inches
    - Users can update their measurements at any time
*/

CREATE TABLE IF NOT EXISTS user_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  waist numeric NOT NULL,
  inseam numeric NOT NULL,
  hips numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own measurements"
  ON user_measurements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements"
  ON user_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own measurements"
  ON user_measurements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
