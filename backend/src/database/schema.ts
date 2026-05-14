export const schema: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  `CREATE TABLE IF NOT EXISTS roles (
    name        TEXT PRIMARY KEY CHECK(name IN ('admin', 'manager', 'gatekeeper', 'employee', 'guest')),
    role_id     UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS gatepass_reasons (
    name        TEXT PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS departments (
    name          TEXT PRIMARY KEY,
    department_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password      TEXT NOT NULL,
    role          TEXT NOT NULL REFERENCES roles(name),
    role_id       UUID REFERENCES roles(role_id),
    department_id UUID REFERENCES departments(department_id),
    manager_id    UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS gatepasses (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gatepass_id          TEXT UNIQUE NOT NULL,
    user_id              UUID NOT NULL,
    purpose              TEXT NOT NULL,
    destination          TEXT,
    date                 TEXT NOT NULL,
    out_time             TEXT,
    expected_return_time TEXT,
    actual_return_time   TEXT,
    status               TEXT NOT NULL DEFAULT 'pending'
                           CHECK(status IN ('pending', 'approved', 'rejected', 'active', 'completed')),
    approved_by          UUID,
    approved_at          TIMESTAMPTZ,
    rejection_reason     TEXT,
    is_emergency         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gatepasses_user_id ON gatepasses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_status  ON gatepasses(status)`,
  `CREATE INDEX IF NOT EXISTS idx_gatepasses_date    ON gatepasses(date)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role)`,
];
