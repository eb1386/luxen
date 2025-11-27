/*
  # Optimize RLS policies for performance

  1. Performance Improvements
    - Replace all `auth.uid()` calls with `(select auth.uid())` in RLS policies
    - This prevents re-evaluation of auth.uid() for each row, significantly improving query performance at scale
  
  2. Changes
    - Drop existing policies on cart_items, orders, and user_measurements
    - Recreate policies with optimized auth function calls
  
  3. Security
    - No changes to security model, only performance optimization
    - All policies maintain the same access control rules
*/

-- Drop existing cart_items policies
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;

-- Recreate cart_items policies with optimized auth calls
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop existing orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;

-- Recreate orders policies with optimized auth calls
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Drop existing user_measurements policies
DROP POLICY IF EXISTS "Users can read own measurements" ON user_measurements;
DROP POLICY IF EXISTS "Users can insert own measurements" ON user_measurements;
DROP POLICY IF EXISTS "Users can update own measurements" ON user_measurements;

-- Recreate user_measurements policies with optimized auth calls
CREATE POLICY "Users can read own measurements"
  ON user_measurements
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own measurements"
  ON user_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own measurements"
  ON user_measurements
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
