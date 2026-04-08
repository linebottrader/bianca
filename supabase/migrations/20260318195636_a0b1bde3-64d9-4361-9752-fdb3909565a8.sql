
CREATE OR REPLACE FUNCTION public.batch_update_sort_order(
  p_table text,
  p_ids uuid[],
  p_orders int[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  i int;
BEGIN
  IF array_length(p_ids, 1) IS DISTINCT FROM array_length(p_orders, 1) THEN
    RAISE EXCEPTION 'ids and orders arrays must have the same length';
  END IF;

  IF p_table NOT IN ('categories', 'menu_items', 'option_groups', 'option_items') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table;
  END IF;

  FOR i IN 1..array_length(p_ids, 1) LOOP
    EXECUTE format('UPDATE %I SET sort_order = $1 WHERE id = $2', p_table)
    USING p_orders[i], p_ids[i];
  END LOOP;
END;
$$;
