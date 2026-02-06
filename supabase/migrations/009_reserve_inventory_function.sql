-- Create the reserve_inventory RPC function
-- This function updates the reserved_quantity for an inventory item
-- Used by exchanges (lending) and as a fallback for direct inventory reservation

CREATE OR REPLACE FUNCTION public.reserve_inventory(
  p_inventory_id UUID,
  p_quantity INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.inventory
  SET reserved_quantity = reserved_quantity + p_quantity
  WHERE id = p_inventory_id;

  -- Verify the update didn't result in negative available_quantity
  IF EXISTS (
    SELECT 1 FROM public.inventory
    WHERE id = p_inventory_id
    AND (quantity - reserved_quantity) < 0
  ) THEN
    RAISE EXCEPTION 'Insufficient inventory: available quantity would be negative';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.reserve_inventory(UUID, INTEGER) TO authenticated;
