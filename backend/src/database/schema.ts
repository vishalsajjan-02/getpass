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

  // ── Users ──────────────────────────────────────────────────────────────────

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

  // ── Gate passes ────────────────────────────────────────────────────────────
  //
  //  approval_flow is set on insert based on reason + requester role:
  //    'admin_only'         → all reasons except "Out" from an employee
  //    'manager_then_admin' → reason is "Out" AND requester role is employee
  //
  //  status transitions:
  //    employee + Out  : pending → pending_manager_approval → pending_admin_approval → approved / rejected
  //    everyone else   : pending → pending_admin_approval → approved / rejected
  //    after approved  : active (gatekeeper Out) → completed (gatekeeper In)
  //    any time        : cancelled (requester withdraws)

  `CREATE TABLE IF NOT EXISTS gatepasses (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
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
    gatepass_type         VARCHAR(10) NOT NULL DEFAULT 'out-in'
                          CHECK(gatepass_type IN ('out-in', 'out')),
    is_emergency          BOOLEAN     NOT NULL DEFAULT FALSE,
    checked_out_at        TIMESTAMPTZ,
    checked_out_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
    checked_in_at         TIMESTAMPTZ,
    checked_in_by         UUID        REFERENCES users(id) ON DELETE SET NULL,
    total_minutes_outside INTEGER     NOT NULL DEFAULT 0 CHECK(total_minutes_outside >= 0),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ── Approval requests ──────────────────────────────────────────────────────
  //
  //  One row per approver per gatepass:
  //    step = 1 → manager (only when approval_flow = 'manager_then_admin')
  //    step = 2 → admin   (always present)
  //
  //  Step 1 must be approved before step 2 is unlocked.
  //  If step 1 is rejected the whole gatepass is rejected.

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

  // ── User in / out times ────────────────────────────────────────────────────
  //
  //  Tracks each user's daily office check-in and check-out timestamps.
  //  One row per user per date (enforced by the UNIQUE constraint).

  `CREATE TABLE IF NOT EXISTS user_in_out_time (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       DATE        NOT NULL,
    in_time    TIMESTAMPTZ,
    out_time   TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date),
    CHECK (out_time IS NULL OR in_time IS NULL OR out_time >= in_time)
  )`,

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

  `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_user_id
    ON user_in_out_time(user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_date
    ON user_in_out_time(date)`,

  `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_user_date
    ON user_in_out_time(user_id, date DESC)`,
];