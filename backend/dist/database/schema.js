"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.schema = [
    `CREATE TABLE IF NOT EXISTS roles (
    name        TEXT PRIMARY KEY CHECK(name IN ('admin', 'manager', 'gatekeeper', 'employee', 'guest')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
    `CREATE TABLE IF NOT EXISTS gatepass_reasons (
    name        TEXT PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
    `CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL REFERENCES roles(name),
    department  TEXT,
    employee_id TEXT,
    phone       TEXT,
    address     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
    `CREATE TABLE IF NOT EXISTS gatepasses (
    id                   TEXT PRIMARY KEY,
    gatepass_id          TEXT UNIQUE NOT NULL,
    user_id              TEXT NOT NULL,
    purpose              TEXT NOT NULL,
    destination          TEXT,
    date                 TEXT NOT NULL,
    out_time             TEXT,
    expected_return_time TEXT,
    actual_return_time   TEXT,
    status               TEXT NOT NULL DEFAULT 'pending'
                           CHECK(status IN ('pending', 'approved', 'rejected', 'active', 'completed')),
    approved_by          TEXT,
    approved_at          TIMESTAMPTZ,
    rejection_reason     TEXT,
    is_emergency         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
    `ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check`,
    `ALTER TABLE roles ADD CONSTRAINT roles_name_check CHECK(name IN ('admin', 'manager', 'gatekeeper', 'employee', 'guest'))`,
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
    `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'users'
         AND c.contype = 'f'
         AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (role) REFERENCES roles(name)%'
     ) THEN
       ALTER TABLE users
       ADD CONSTRAINT users_role_lookup_fkey FOREIGN KEY (role) REFERENCES roles(name);
     END IF;
   END
   $$`,
    `CREATE INDEX IF NOT EXISTS idx_gatepasses_user_id ON gatepasses(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gatepasses_status  ON gatepasses(status)`,
    `CREATE INDEX IF NOT EXISTS idx_gatepasses_date    ON gatepasses(date)`,
    `CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role)`,
];
//# sourceMappingURL=schema.js.map