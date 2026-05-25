-- =============================================================================
-- ONE-SHOT: 100 gatepass rows (all reasons + statuses, dates 2024–2026)
-- Run in pgAdmin Query Tool OR: npm run seed:gatepasses:100
-- =============================================================================
-- Uses seeded emails (employee@company.com, manager@, admin@, gatekeeper@)
-- Removes previous [BULK100] rows first.
-- =============================================================================

BEGIN;

DELETE FROM gatepass_approval_requests
WHERE gatepass_id IN (SELECT id FROM gatepasses WHERE reason_description LIKE '[BULK100]%');
DELETE FROM gatepasses WHERE reason_description LIKE '[BULK100]%';

WITH lookup AS (
  SELECT
    (SELECT id FROM users WHERE email = 'employee@company.com') AS emp_id,
    (SELECT id FROM users WHERE email = 'manager@company.com') AS mgr_id,
    (SELECT id FROM users WHERE email = 'admin@company.com') AS admin_id,
    (SELECT id FROM users WHERE email = 'gatekeeper@company.com') AS gate_id,
    (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'lunch') AS lunch_id,
    (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'out') AS out_id,
    (SELECT id FROM gatepass_reasons WHERE LOWER(name) = 'other') AS other_id
),
nums AS (
  SELECT generate_series(1, 100) AS n
),
planned AS (
  SELECT
    n,
    MAKE_DATE(2024 + ((n - 1) / 36)::int % 3, ((n - 1) % 12) + 1, ((n - 1) % 28) + 1) AS pass_date,
    (n - 1) % 11 AS scenario
  FROM nums
),
rows AS (
  SELECT
    p.n,
    p.pass_date,
    CASE p.scenario
      WHEN 0 THEN l.lunch_id WHEN 1 THEN l.out_id WHEN 2 THEN l.out_id
      WHEN 3 THEN l.other_id WHEN 4 THEN l.lunch_id WHEN 5 THEN l.other_id
      WHEN 6 THEN l.lunch_id WHEN 7 THEN l.lunch_id WHEN 8 THEN l.lunch_id
      WHEN 9 THEN l.out_id ELSE l.other_id
    END AS reason_id,
    CASE p.scenario
      WHEN 0 THEN 'Lunch' WHEN 1 THEN 'Out' WHEN 2 THEN 'Out' WHEN 3 THEN 'Other'
      WHEN 4 THEN 'Lunch' WHEN 5 THEN 'Other' WHEN 6 THEN 'Lunch' WHEN 7 THEN 'Lunch'
      WHEN 8 THEN 'Lunch' WHEN 9 THEN 'Out' ELSE 'Other'
    END AS reason_name,
    CASE p.scenario
      WHEN 0 THEN 'pending_admin_approval' WHEN 1 THEN 'pending_manager_approval'
      WHEN 2 THEN 'pending_admin_approval' WHEN 3 THEN 'approved' WHEN 4 THEN 'rejected'
      WHEN 5 THEN 'cancelled' WHEN 6 THEN 'active' WHEN 7 THEN 'completed'
      WHEN 8 THEN 'completed' WHEN 9 THEN 'completed' ELSE 'completed'
    END AS status,
    CASE WHEN p.scenario IN (1, 2, 9) THEN 'out' ELSE 'out-in' END AS gatepass_type,
    CASE WHEN p.scenario IN (1, 2, 9) THEN 'manager_then_admin' ELSE 'admin_only' END AS approval_flow,
    CASE p.scenario
      WHEN 4 THEN 'Not approved' ELSE NULL
    END AS rejection_reason,
    CASE
      WHEN p.scenario = 6 THEN NOW() - ((15 + (p.n % 20)) * INTERVAL '1 minute')
      WHEN p.scenario IN (7, 8, 10) THEN p.pass_date + TIME '12:00'
      WHEN p.scenario = 9 THEN p.pass_date + TIME '16:00'
      ELSE NULL
    END AS checked_out_at,
    CASE
      WHEN p.scenario = 7 THEN p.pass_date + TIME '12:25'
      WHEN p.scenario = 8 THEN p.pass_date + TIME '12:50'
      WHEN p.scenario = 10 THEN p.pass_date + TIME '10:45'
      ELSE NULL
    END AS checked_in_at,
    CASE
      WHEN p.scenario = 7 THEN 25 WHEN p.scenario = 8 THEN 50 WHEN p.scenario = 10 THEN 45 ELSE 0
    END AS total_minutes_outside,
    l.emp_id, l.mgr_id, l.admin_id, l.gate_id
  FROM planned p
  CROSS JOIN lookup l
)
INSERT INTO gatepasses (
  id, user_id, reason_id, reason_description, destination, date,
  status, approval_flow, gatepass_type, is_emergency,
  rejection_reason, checked_out_at, checked_out_by, checked_in_at, checked_in_by, total_minutes_outside
)
SELECT
  ('b1000000-0001-4001-8001-' || LPAD(r.n::text, 12, '0'))::uuid,
  r.emp_id,
  r.reason_id,
  '[BULK100] #' || r.n || ' ' || r.reason_name || ' ' || r.status,
  CASE WHEN r.n % 2 = 0 THEN 'Main gate' ELSE 'Cafeteria' END,
  r.pass_date,
  r.status,
  r.approval_flow,
  r.gatepass_type,
  (r.n % 17 = 0),
  r.rejection_reason,
  r.checked_out_at,
  CASE WHEN r.checked_out_at IS NOT NULL THEN r.gate_id END,
  r.checked_in_at,
  CASE WHEN r.checked_in_at IS NOT NULL THEN r.gate_id END,
  r.total_minutes_outside
FROM rows r;

-- Approval rows for all 100 gatepasses
WITH lookup AS (
  SELECT
    (SELECT id FROM users WHERE email = 'manager@company.com') AS mgr_id,
    (SELECT id FROM users WHERE email = 'admin@company.com') AS admin_id
),
gp AS (
  SELECT id, approval_flow, status
  FROM gatepasses
  WHERE reason_description LIKE '[BULK100]%'
)
INSERT INTO gatepass_approval_requests (gatepass_id, approver_user_id, approver_role, step, status, remarks, acted_at)
SELECT
  g.id,
  l.mgr_id,
  'manager',
  1,
  CASE
    WHEN g.status = 'pending_manager_approval' THEN 'pending'
    WHEN g.status IN ('rejected', 'cancelled') THEN 'cancelled'
    ELSE 'approved'
  END,
  NULL,
  CASE WHEN g.status = 'pending_manager_approval' THEN NULL ELSE NOW() END
FROM gp g
CROSS JOIN lookup l
WHERE g.approval_flow = 'manager_then_admin'
ON CONFLICT (gatepass_id, step) DO NOTHING;

WITH lookup AS (
  SELECT (SELECT id FROM users WHERE email = 'admin@company.com') AS admin_id
),
gp AS (
  SELECT id, status, rejection_reason
  FROM gatepasses
  WHERE reason_description LIKE '[BULK100]%'
)
INSERT INTO gatepass_approval_requests (gatepass_id, approver_user_id, approver_role, step, status, remarks, acted_at)
SELECT
  g.id,
  l.admin_id,
  'admin',
  2,
  CASE
    WHEN g.status IN ('pending_admin_approval', 'pending_manager_approval') THEN 'pending'
    WHEN g.status = 'rejected' THEN 'rejected'
    WHEN g.status = 'cancelled' THEN 'cancelled'
    ELSE 'approved'
  END,
  g.rejection_reason,
  CASE
    WHEN g.status IN ('pending_admin_approval', 'pending_manager_approval') THEN NULL
    ELSE NOW()
  END
FROM gp g
CROSS JOIN lookup l
ON CONFLICT (gatepass_id, step) DO NOTHING;

COMMIT;

SELECT status, COUNT(*) FROM gatepasses WHERE reason_description LIKE '[BULK100]%' GROUP BY status ORDER BY status;
SELECT gr.name AS reason, COUNT(*)
FROM gatepasses g JOIN gatepass_reasons gr ON gr.id = g.reason_id
WHERE g.reason_description LIKE '[BULK100]%'
GROUP BY gr.name;
