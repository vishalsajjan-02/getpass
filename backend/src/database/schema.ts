export const schema: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  // ── Lookup tables ──────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS roles (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL UNIQUE
                           CHECK(name IN ('admin', 'manager', 'gatekeeper', 'employee', 'guest')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS gatepass_reasons (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS departments (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ── Core user table ────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT        NOT NULL,
    email         TEXT        NOT NULL UNIQUE,
    password      TEXT        NOT NULL,
    role_id       UUID        NOT NULL REFERENCES roles(id)       ON DELETE RESTRICT,
    department_id UUID                 REFERENCES departments(id) ON DELETE SET NULL,
    manager_id    UUID                 REFERENCES users(id)       ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ── Gate pass requests ─────────────────────────────────────────────────────
  //
  //  approval_flow derives from reason + requester role (set on insert):
  //    'admin_only'         → all reasons except "Out" from an employee
  //    'manager_then_admin' → reason is "Out" AND requester role is employee
  //
  //  status flow:
  //    employee + Out  : pending → pending_manager_approval
  //                             → pending_admin_approval → approved / rejected
  //    everyone else   : pending → pending_admin_approval → approved / rejected
  //    after approved  : active (gatekeeper clicks Out) → completed (gatekeeper clicks In)
  //    at any point    : cancelled (requester withdraws)

  `CREATE TABLE IF NOT EXISTS gatepasses (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gatepass_id           TEXT        NOT NULL UNIQUE,

    user_id               UUID        NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
    reason_id             UUID        NOT NULL REFERENCES gatepass_reasons(id) ON DELETE RESTRICT,
    reason_description    TEXT,
    destination           TEXT,
    date                  DATE        NOT NULL,

    status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK(status IN (
                            'pending',
                            'pending_manager_approval',
                            'pending_admin_approval',
                            'approved',
                            'rejected',
                            'cancelled',
                            'active',
                            'completed'
                          )),

    approval_flow         TEXT        NOT NULL DEFAULT 'admin_only'
                          CHECK(approval_flow IN ('admin_only', 'manager_then_admin')),

    rejection_reason      TEXT,
    is_emergency          BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Gatekeeper actions
    checked_out_at        TIMESTAMPTZ,
    checked_out_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
    checked_in_at         TIMESTAMPTZ,
    checked_in_by         UUID        REFERENCES users(id) ON DELETE SET NULL,

    -- Computed on check-in: time outside during working hours in minutes
    total_minutes_outside INTEGER     NOT NULL DEFAULT 0 CHECK(total_minutes_outside >= 0),

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'gatepasses'
         AND column_name = 'purpose'
     ) AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'gatepasses'
         AND column_name = 'legacy_purpose'
     ) THEN
       ALTER TABLE gatepasses RENAME COLUMN purpose TO legacy_purpose;
     END IF;
   END $$`,

  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS reason_id UUID REFERENCES gatepass_reasons(id) ON DELETE RESTRICT`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS reason_description TEXT`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS approval_flow TEXT NOT NULL DEFAULT 'admin_only'`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE gatepasses
     ADD COLUMN IF NOT EXISTS total_minutes_outside INTEGER NOT NULL DEFAULT 0`,

  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'gatepasses'
         AND column_name = 'legacy_purpose'
         AND udt_name = 'uuid'
     ) THEN
       EXECUTE '
         UPDATE gatepasses
         SET reason_id = COALESCE(reason_id, legacy_purpose)
         WHERE legacy_purpose IS NOT NULL
           AND reason_id IS NULL
       ';
     END IF;
   END $$`,

  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'gatepasses'
         AND column_name = 'legacy_purpose'
         AND data_type = 'text'
     ) THEN
       EXECUTE '
         UPDATE gatepasses g
         SET reason_id = COALESCE(
               g.reason_id,
               (
                 SELECT r.id
                 FROM gatepass_reasons r
                WHERE LOWER(r.name) = LOWER(TRIM(SPLIT_PART(g.legacy_purpose, '':'', 1)))
                 LIMIT 1
               )
             ),
             reason_description = COALESCE(
               g.reason_description,
               NULLIF(TRIM(SUBSTRING(g.legacy_purpose FROM ''^[^:]+:(.*)$'')), '''')
             )
         WHERE g.legacy_purpose IS NOT NULL
       ';
     END IF;
   END $$`,

  `ALTER TABLE gatepasses DROP CONSTRAINT IF EXISTS gatepasses_status_check`,
  `ALTER TABLE gatepasses ADD CONSTRAINT gatepasses_status_check CHECK(status IN (
    'pending',
    'pending_manager_approval',
    'pending_admin_approval',
    'approved',
    'rejected',
    'cancelled',
    'active',
    'completed'
  ))`,
  `ALTER TABLE gatepasses DROP CONSTRAINT IF EXISTS gatepasses_approval_flow_check`,
  `UPDATE gatepasses
   SET approval_flow = 'manager_then_admin'
   WHERE approval_flow = 'admin_and_manager'`,
  `ALTER TABLE gatepasses ADD CONSTRAINT gatepasses_approval_flow_check CHECK(approval_flow IN ('admin_only', 'manager_then_admin'))`,
  `ALTER TABLE gatepasses DROP CONSTRAINT IF EXISTS gatepasses_total_minutes_outside_check`,
  `ALTER TABLE gatepasses ADD CONSTRAINT gatepasses_total_minutes_outside_check CHECK(total_minutes_outside >= 0)`,

  // ── Per-approver approval records ─────────────────────────────────────────
  //
  //  One row per approver per gatepass.
  //  step = 1 → manager (only when approval_flow = 'manager_then_admin')
  //  step = 2 → admin   (always present)
  //
  //  The app processes step 1 first; admin (step 2) is unlocked only after
  //  step 1 is approved. If step 1 is rejected the whole gatepass is rejected.

  `CREATE TABLE IF NOT EXISTS gatepass_approval_requests (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gatepass_id      UUID        NOT NULL REFERENCES gatepasses(id) ON DELETE CASCADE,
    approver_user_id UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    approver_role    TEXT        NOT NULL CHECK(approver_role IN ('admin', 'manager')),
    step             SMALLINT    NOT NULL CHECK(step IN (1, 2)),
    status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
    remarks          TEXT,
    acted_at         TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(gatepass_id, approver_user_id),
    UNIQUE(gatepass_id, step)
  )`,

  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'gatepass_approval_requests'
         AND column_name = 'approver_type'
     ) AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'gatepass_approval_requests'
         AND column_name = 'approver_role'
     ) THEN
       ALTER TABLE gatepass_approval_requests RENAME COLUMN approver_type TO approver_role;
     END IF;
   END $$`,
  `ALTER TABLE gatepass_approval_requests
     ADD COLUMN IF NOT EXISTS approver_role TEXT`,
  `ALTER TABLE gatepass_approval_requests
     ADD COLUMN IF NOT EXISTS step SMALLINT`,
  `ALTER TABLE gatepass_approval_requests
     ADD COLUMN IF NOT EXISTS remarks TEXT`,
  `ALTER TABLE gatepass_approval_requests
     ADD COLUMN IF NOT EXISTS acted_at TIMESTAMPTZ`,
  `ALTER TABLE gatepass_approval_requests
     ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE gatepass_approval_requests
     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `UPDATE gatepass_approval_requests
   SET step = CASE approver_role
     WHEN 'manager' THEN 1
     ELSE 2
   END
   WHERE step IS NULL`,
  `ALTER TABLE gatepass_approval_requests DROP CONSTRAINT IF EXISTS gatepass_approval_requests_approver_role_check`,
  `ALTER TABLE gatepass_approval_requests ADD CONSTRAINT gatepass_approval_requests_approver_role_check CHECK(approver_role IN ('admin', 'manager'))`,
  `ALTER TABLE gatepass_approval_requests DROP CONSTRAINT IF EXISTS gatepass_approval_requests_step_check`,
  `ALTER TABLE gatepass_approval_requests ADD CONSTRAINT gatepass_approval_requests_step_check CHECK(step IN (1, 2))`,
  `ALTER TABLE gatepass_approval_requests DROP CONSTRAINT IF EXISTS gatepass_approval_requests_status_check`,
  `ALTER TABLE gatepass_approval_requests ADD CONSTRAINT gatepass_approval_requests_status_check CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled'))`,

  // ── Indexes ────────────────────────────────────────────────────────────────

  `CREATE INDEX IF NOT EXISTS idx_gatepasses_user_id
    ON gatepasses(user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_gatepasses_status
    ON gatepasses(status)`,

  `CREATE INDEX IF NOT EXISTS idx_gatepasses_date
    ON gatepasses(date)`,

  `CREATE INDEX IF NOT EXISTS idx_gatepasses_approval_flow
    ON gatepasses(approval_flow)`,

  `CREATE INDEX IF NOT EXISTS idx_gatepasses_date_status
    ON gatepasses(date DESC, status)`,

  `CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email)`,

  `CREATE INDEX IF NOT EXISTS idx_users_role_id
    ON users(role_id)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_gatepass_id
    ON gatepass_approval_requests(gatepass_id)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_approver_user_id
    ON gatepass_approval_requests(approver_user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_status
    ON gatepass_approval_requests(status)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_gatepass_step
    ON gatepass_approval_requests(gatepass_id, step)`,
];