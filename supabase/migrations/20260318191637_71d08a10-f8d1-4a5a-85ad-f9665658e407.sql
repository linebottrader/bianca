ALTER TABLE option_groups ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on current nome ordering
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY nome) - 1 AS rn
  FROM option_groups
)
UPDATE option_groups SET sort_order = ranked.rn FROM ranked WHERE option_groups.id = ranked.id;