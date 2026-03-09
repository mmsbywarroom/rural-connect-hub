-- Backfill app_users for nominated Mahila Sakhis (run once in SQL editor)
INSERT INTO app_users (mobile_number, name, role, registration_source)
SELECT DISTINCT
  ms.mobile_number,
  ms.sakhi_name,
  'mahila_sakhi' AS role,
  'mahila_samman_backfill' AS registration_source
FROM mahila_samman_submissions ms
LEFT JOIN app_users u ON u.mobile_number = ms.mobile_number
WHERE ms.mobile_number IS NOT NULL
  AND ms.sakhi_name IS NOT NULL
  AND u.id IS NULL;

