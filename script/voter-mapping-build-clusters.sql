-- Build voter mapping clusters (100 voters per cluster) into `voter_mapping_clusters`
-- Uses `voter_mapping_master.sl_no` as the voter serial number for each booth.

CREATE TABLE IF NOT EXISTS voter_mapping_clusters (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id text NOT NULL,
  cluster_no integer NOT NULL,
  serial_start integer NOT NULL,
  serial_end integer NOT NULL,
  created_at timestamp DEFAULT NOW(),
  CONSTRAINT voter_mapping_clusters_unique UNIQUE (booth_id, cluster_no)
);

WITH maxs AS (
  SELECT
    booth_id,
    MAX(sl_no) AS max_sl_no
  FROM voter_mapping_master
  WHERE booth_id IS NOT NULL
    AND booth_id <> ''
    AND sl_no IS NOT NULL
  GROUP BY booth_id
)
INSERT INTO voter_mapping_clusters (booth_id, cluster_no, serial_start, serial_end)
SELECT
  m.booth_id,
  gs AS cluster_no,
  (gs - 1) * 100 + 1 AS serial_start,
  LEAST(gs * 100, m.max_sl_no) AS serial_end
FROM maxs m
CROSS JOIN LATERAL generate_series(1, CEIL(m.max_sl_no::numeric / 100)::int) gs
ON CONFLICT (booth_id, cluster_no) DO NOTHING;

