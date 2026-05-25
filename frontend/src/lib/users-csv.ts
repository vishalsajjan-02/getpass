import type { Profile } from '@/hooks/useProfiles';

export type BulkImportUserRow = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
  department?: string;
  manager_email?: string;
};

const CSV_HEADERS = ['name', 'email', 'password', 'role', 'department', 'manager_email'] as const;

const escapeCsv = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeRole = (value: string): BulkImportUserRow['role'] | null => {
  const role = value.trim().toLowerCase();
  if (['admin', 'manager', 'gatekeeper', 'employee', 'guest'].includes(role)) {
    return role as BulkImportUserRow['role'];
  }
  return null;
};

export const parseUsersCsv = (text: string): BulkImportUserRow[] => {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one user row.');
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const missing = CSV_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  const indexFor = (header: typeof CSV_HEADERS[number]) => headers.indexOf(header);

  return lines.slice(1).map((line, lineIndex) => {
    const cells = parseCsvLine(line);
    const role = normalizeRole(cells[indexFor('role')] ?? '');
    if (!role) {
      throw new Error(`Invalid role on row ${lineIndex + 2}`);
    }

    return {
      name: cells[indexFor('name')] ?? '',
      email: cells[indexFor('email')] ?? '',
      password: cells[indexFor('password')] ?? '',
      role,
      department: cells[indexFor('department')] || undefined,
      manager_email: cells[indexFor('manager_email')] || undefined,
    };
  });
};

export const exportUsersCsv = (
  users: Profile[],
  resolveManagerName: (managerId?: string) => string,
): void => {
  const rows = users.map((user) => ({
    Name: user.name,
    Email: user.email,
    Role: user.role,
    Department: user.department || 'N/A',
    Manager: user.role === 'employee' ? resolveManagerName(user.manager_id) : '—',
  }));

  if (rows.length === 0) return;

  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map((row) => Object.values(row).map((value) => escapeCsv(String(value))).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const downloadUsersImportTemplate = (): void => {
  const csv = [
    CSV_HEADERS.join(','),
    'Ram Kumar,ram.kumar@company.com,Emp@123,employee,Software R&D,manager.software@company.com',
    'Priya Deshmukh,priya.deshmukh@company.com,Manager@123,manager,QA,',
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'users-import-template.csv';
  anchor.click();
  window.URL.revokeObjectURL(url);
};
