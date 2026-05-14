export const schema: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  `CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE CHECK(name IN ('admin', 'manager', 'gatekeeper', 'employee', 'guest')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS gatepass_reasons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS departments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password      TEXT NOT NULL,
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS gatepasses (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gatepass_id          TEXT UNIQUE NOT NULL,
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose              UUID NOT NULL REFERENCES gatepass_reasons(id) ON DELETE RESTRICT,
    destination          TEXT,
    date                 DATE NOT NULL,
    out_time             TIMETZ,
    expected_return_time TIMETZ,
    actual_return_time   TIMETZ,
    status               TEXT NOT NULL DEFAULT 'pending'
                           CHECK(status IN ('pending', 'approved', 'rejected', 'active', 'completed')),
    approved_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at          TIMESTAMPTZ,
    rejection_reason     TEXT,
    is_emergency         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gatepasses_user_id ON gatepasses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_status  ON gatepasses(status)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_date    ON gatepasses(date)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role_id      ON users(role_id)`,
];