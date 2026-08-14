export const schema: string[] = [
  // ── Extensions ─────────────────────────────────────────────────────────────

  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  // ── 1. roles ───────────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS roles (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL
                           CHECK(name IN ('admin', 'manager', 'gatekeeper', 'employee', 'guest')),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_active
    ON roles (name) WHERE deleted_at IS NULL`,

  // ── 2. departments ─────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS departments (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_name_active
    ON departments (name) WHERE deleted_at IS NULL`,

  // ── 3. gatepass_reasons ────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS gatepass_reasons (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_gatepass_reasons_name_active
    ON gatepass_reasons (name) WHERE deleted_at IS NULL`,

  // ── 4. leave_types ─────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS leave_types (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    is_paid     BOOLEAN     NOT NULL DEFAULT TRUE,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_types_name_active
    ON leave_types (name) WHERE deleted_at IS NULL`,

  `CREATE INDEX IF NOT EXISTS idx_leave_types_active_sort
    ON leave_types (is_active, sort_order)`,

  // ── 5. company_holidays ────────────────────────────────────────────────────

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
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_company_holidays_date_name_active
    ON company_holidays (holiday_date, name) WHERE deleted_at IS NULL`,

  `CREATE INDEX IF NOT EXISTS idx_company_holidays_date
    ON company_holidays (holiday_date)`,

  `CREATE INDEX IF NOT EXISTS idx_company_holidays_year
    ON company_holidays (year)`,

  `CREATE INDEX IF NOT EXISTS idx_company_holidays_active_date
    ON company_holidays (is_active, holiday_date)`,

  // ── 6. users ───────────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS users (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT          NOT NULL,
    email                 TEXT          NOT NULL,
    password              TEXT          NOT NULL,
    role_id               UUID          NOT NULL REFERENCES roles(id)       ON DELETE RESTRICT,
    department_id         UUID                   REFERENCES departments(id) ON DELETE SET NULL,
    manager_id            UUID                   REFERENCES users(id)       ON DELETE SET NULL,
    employee_id           TEXT,
    leave_balance         NUMERIC(10,2) NOT NULL DEFAULT 0,
    leave_accrued_through TEXT,
    can_self_punch        BOOLEAN       NOT NULL DEFAULT FALSE,
    face_image_path       TEXT,
    face_embedding        TEXT,
    face_registered_at    TIMESTAMPTZ,
    meta                  JSONB         NOT NULL DEFAULT '{}'::jsonb,
    is_deleted            BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  )`,

  `DROP INDEX IF EXISTS idx_users_email_active`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
    ON users (LOWER(email)) WHERE deleted_at IS NULL`,

  `DROP INDEX IF EXISTS idx_users_employee_id`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_id
    ON users (LOWER(employee_id)) WHERE employee_id IS NOT NULL AND deleted_at IS NULL`,

  `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users (is_deleted)`,

  // ── 7. user_day_leaves ─────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS user_day_leaves (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date           DATE        NOT NULL,
    leave_type_id  UUID        NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    deleted_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, date)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_user_day_leaves_user_date
    ON user_day_leaves (user_id, date DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_user_day_leaves_date
    ON user_day_leaves (date)`,

  `CREATE INDEX IF NOT EXISTS idx_user_day_leaves_deleted_at
    ON user_day_leaves (deleted_at)`,

  // ── 8. gatepasses ──────────────────────────────────────────────────────────
  //
  //  approval_flow:
  //    'admin_only'         → all reasons except "Out" from an employee
  //    'manager_then_admin' → reason is "Out" AND requester role is employee

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
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gatepasses_user_id ON gatepasses (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_status ON gatepasses (status)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_date ON gatepasses (date)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_approval_flow ON gatepasses (approval_flow)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_date_status ON gatepasses (date DESC, status)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_deleted_at ON gatepasses (deleted_at)`,

  // ── 9. gatepass_approval_requests ──────────────────────────────────────────
  //
  //  step = 1 → manager (only when approval_flow = 'manager_then_admin')
  //  step = 2 → admin   (always present)

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
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (gatepass_id, approver_user_id),
    UNIQUE (gatepass_id, step)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_gatepass_id
    ON gatepass_approval_requests (gatepass_id)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_approver_user_id
    ON gatepass_approval_requests (approver_user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_status
    ON gatepass_approval_requests (status)`,

  `CREATE INDEX IF NOT EXISTS idx_approval_requests_gatepass_step
    ON gatepass_approval_requests (gatepass_id, step)`,

  // ── 10. user_in_out_time ───────────────────────────────────────────────────
  //
  //  One row per user per date.

  `CREATE TABLE IF NOT EXISTS user_in_out_time (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date             DATE             NOT NULL,
    in_time          TIMESTAMPTZ,
    out_time         TIMESTAMPTZ,
    in_photo_path    TEXT,
    out_photo_path   TEXT,
    in_location      TEXT,
    out_location     TEXT,
    in_latitude      DOUBLE PRECISION,
    in_longitude     DOUBLE PRECISION,
    out_latitude     DOUBLE PRECISION,
    out_longitude    DOUBLE PRECISION,
    in_via           TEXT             CHECK (in_via IS NULL OR in_via IN ('self', 'gatekeeper')),
    out_via          TEXT             CHECK (out_via IS NULL OR out_via IN ('self', 'gatekeeper')),
    in_marked_by     UUID             REFERENCES users(id) ON DELETE SET NULL,
    out_marked_by    UUID             REFERENCES users(id) ON DELETE SET NULL,
    total_working_hr NUMERIC(10,2)    NOT NULL DEFAULT 0,
    ot               NUMERIC(10,2)    NOT NULL DEFAULT 0,
    meta             JSONB            NOT NULL DEFAULT '{}'::jsonb,
    is_deleted       BOOLEAN          NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, date),
    CHECK (out_time IS NULL OR in_time IS NULL OR out_time >= in_time)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_user_id
    ON user_in_out_time (user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_date
    ON user_in_out_time (date)`,

  `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_user_date
    ON user_in_out_time (user_id, date DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_deleted_at
    ON user_in_out_time (deleted_at)`,

  `CREATE INDEX IF NOT EXISTS idx_user_in_out_time_is_deleted
    ON user_in_out_time (is_deleted)`,
];
