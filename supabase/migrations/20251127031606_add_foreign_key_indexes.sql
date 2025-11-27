/*
  # Add indexes on foreign keys

  1. Performance Improvements
    - Add index on `cart_items.user_id` for faster foreign key lookups
    - Add index on `orders.user_id` for faster foreign key lookups
  
  2. Notes
    - These indexes improve query performance when joining or filtering by user_id
    - Essential for tables with foreign key relationships to avoid full table scans
*/

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
