"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.schema = [
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
    // ── Leave types ────────────────────────────────────────────────────────────
    //
    //  Master list of company leave categories (CL, SL, PL, etc.).
    `CREATE TABLE IF NOT EXISTS leave_types (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    is_paid     BOOLEAN     NOT NULL DEFAULT TRUE,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
    // Drop legacy leave_types columns if upgrading an older schema.
    `ALTER TABLE leave_types DROP COLUMN IF EXISTS code CASCADE`,
    `ALTER TABLE leave_types DROP COLUMN IF EXISTS purpose CASCADE`,
    `DROP INDEX IF EXISTS idx_leave_types_code`,
    // ── Company paid holidays ──────────────────────────────────────────────────
    //
    //  Annual company holiday calendar (fixed dates + year-specific festival dates).
    `CREATE TABLE IF NOT EXISTS company_holidays (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT        NOT NULL,
    description   TEXT        NOT NULL,
    holiday_date  DATE        NOT NULL,
    year          INTEGER     NOT NULL,
    is_fixed      BOOLEAN     NOT NULL DEFAULT FALSE,
    is_paid       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order    INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (holiday_date, name)
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
    leave_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    leave_accrued_through TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
    // Existing DBs: add leave balance columns if missing.
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS leave_balance NUMERIC(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS leave_accrued_through TEXT`,
    // Employees/managers may self punch only when admin grants this.
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS can_self_punch BOOLEAN NOT NULL DEFAULT FALSE`,
    // Registered face image (relative path under uploads/) + ArcFace embedding JSON.
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS face_image_path TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS face_embedding TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS face_registered_at TIMESTAMPTZ`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_id
    ON users (employee_id) WHERE employee_id IS NOT NULL AND deleted_at IS NULL`,
    // ── Per-user day leave marking ─────────────────────────────────────────────
    //
    //  Admin/manager can mark a leave type for a user on a specific date.
    `CREATE TABLE IF NOT EXISTS user_day_leaves (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date           DATE        NOT NULL,
    leave_type_id  UUID        NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, date)
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
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS in_photo_path TEXT`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS out_photo_path TEXT`,
    // Punch location (GPS) captured with face punch.
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS in_location TEXT`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS out_location TEXT`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS in_latitude DOUBLE PRECISION`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS in_longitude DOUBLE PRECISION`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS out_latitude DOUBLE PRECISION`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS out_longitude DOUBLE PRECISION`,
    // Who performed Punch In / Out: employee's own login vs gatekeeper (desk) login.
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS in_via TEXT`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS out_via TEXT`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS in_marked_by UUID REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS out_marked_by UUID REFERENCES users(id) ON DELETE SET NULL`,
    `DO $$ BEGIN
     ALTER TABLE user_in_out_time
       ADD CONSTRAINT user_in_out_time_in_via_check
       CHECK (in_via IS NULL OR in_via IN ('self', 'gatekeeper'));
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,
    `DO $$ BEGIN
     ALTER TABLE user_in_out_time
       ADD CONSTRAINT user_in_out_time_out_via_check
       CHECK (out_via IS NULL OR out_via IN ('self', 'gatekeeper'));
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,
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
    `CREATE INDEX IF NOT EXISTS idx_leave_types_active_sort
    ON leave_types(is_active, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_company_holidays_date
    ON company_holidays(holiday_date)`,
    `CREATE INDEX IF NOT EXISTS idx_company_holidays_year
    ON company_holidays(year)`,
    `CREATE INDEX IF NOT EXISTS idx_company_holidays_active_date
    ON company_holidays(is_active, holiday_date)`,
    `CREATE INDEX IF NOT EXISTS idx_user_day_leaves_user_date
    ON user_day_leaves(user_id, date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_user_day_leaves_date
    ON user_day_leaves(date)`,
    // Soft delete: deleted_at on every table
    `ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE gatepass_reasons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE company_holidays ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE user_day_leaves ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE gatepass_approval_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE user_in_out_time ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
    ON users (email) WHERE deleted_at IS NULL`,
    `ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_active
    ON roles (name) WHERE deleted_at IS NULL`,
    `ALTER TABLE gatepass_reasons DROP CONSTRAINT IF EXISTS gatepass_reasons_name_key`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_gatepass_reasons_name_active
    ON gatepass_reasons (name) WHERE deleted_at IS NULL`,
    `ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_name_active
    ON departments (name) WHERE deleted_at IS NULL`,
    `ALTER TABLE leave_types DROP CONSTRAINT IF EXISTS leave_types_name_key`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_types_name_active
    ON leave_types (name) WHERE deleted_at IS NULL`,
    `ALTER TABLE company_holidays DROP CONSTRAINT IF EXISTS company_holidays_holiday_date_name_key`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_company_holidays_date_name_active
    ON company_holidays (holiday_date, name) WHERE deleted_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at)`,
    `CREATE INDEX IF NOT EXISTS idx_gatepasses_deleted_at ON gatepasses (deleted_at)`,
    `CREATE INDEX IF NOT EXISTS idx_user_day_leaves_deleted_at ON user_day_leaves (deleted_at)`,
    `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_deleted_at ON user_in_out_time (deleted_at)`,
];
//# sourceMappingURL=schema.js.map