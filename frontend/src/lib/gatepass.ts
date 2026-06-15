import type { Gatepass, GatepassStatus } from '@/hooks/useGatepasses';

const STATUS_LABELS: Record<GatepassStatus, string> = {
  pending: 'Pending',
  pending_manager_approval: 'Pending for Manager',
  pending_admin_approval: 'Pending for Admin',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  active: 'Out',
  completed: 'Completed',
};

export const getGatepassStatusLabel = (status: GatepassStatus): string =>
  STATUS_LABELS[status] ?? status;

export const isPendingGatepassStatus = (status: GatepassStatus): boolean =>
  status === 'pending' ||
  status === 'pending_manager_approval' ||
  status === 'pending_admin_approval';

/** Out reason = permanent exit for the day; no return check-in. */
export const isPermanentOutGatepass = (
  gatepass: Pick<Gatepass, 'gatepass_type' | 'reason_name'>,
): boolean =>
  gatepass.gatepass_type === 'out' || gatepass.reason_name?.trim().toLowerCase() === 'out';

export const formatGatepassReason = (gatepass: Pick<Gatepass, 'display_reason' | 'reason_name' | 'reason_description'>): string => {
  if (gatepass.display_reason) return gatepass.display_reason;
  if (gatepass.reason_description?.trim()) {
    return `${gatepass.reason_name}: ${gatepass.reason_description.trim()}`;
  }
  return gatepass.reason_name;
};

/** Split reason label and optional detail for aligned list rows. */
export const getGatepassReasonParts = (
  gatepass: Pick<Gatepass, 'display_reason' | 'reason_name' | 'reason_description'>,
): { name: string; description?: string } => {
  const name = gatepass.reason_name?.trim() || 'Request';
  const description = gatepass.reason_description?.trim();
  if (description) return { name, description };
  if (gatepass.display_reason?.trim()) {
    const full = gatepass.display_reason.trim();
    const prefix = `${name}:`;
    if (full.toLowerCase().startsWith(prefix.toLowerCase())) {
      const rest = full.slice(prefix.length).trim();
      return rest ? { name, description: rest } : { name };
    }
    if (full !== name) return { name, description: full };
  }
  return { name };
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse API date values (YYYY-MM-DD, ISO timestamps, or Date objects). */
export const parseGatepassDate = (value: string | Date): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Local calendar date as YYYY-MM-DD (safe for comparisons and chart buckets). */
export const toDateOnlyKey = (value: string | Date): string | null => {
  const date = parseGatepassDate(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** e.g. 23-May-2026 */
export const formatGatepassDate = (value: string | Date): string => {
  const date = parseGatepassDate(value);
  if (!date) return typeof value === 'string' ? value : '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_LABELS[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/** e.g. 11:24 AM */
export const formatGatepassTime = (value: string | Date): string => {
  const date = parseGatepassDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/** e.g. 23-May-2026 11:24 AM */
export const formatGatepassDateTime = (value: string | Date): string =>
  `${formatGatepassDate(value)} ${formatGatepassTime(value)}`;

/** Fixed width so dates align in one column across all list rows (dd-Mmm-yyyy). */
export const GATEPASS_DATE_COLUMN_CLASS = 'w-[7.25rem] shrink-0';

/** Fixed width so employee names align before the date column. */
export const GATEPASS_NAME_COLUMN_CLASS = 'w-[6.5rem] sm:w-[7.5rem] shrink-0';

export type GatepassRowDisplay = {
  reason: { name: string; description?: string };
  date: string;
  outTime: string | null;
  inTime: string | null;
};

type GatepassRowInput = Pick<
  Gatepass,
  | 'display_reason'
  | 'reason_name'
  | 'reason_description'
  | 'date'
  | 'checked_out_at'
  | 'checked_in_at'
  | 'gatepass_type'
>;

/** Row 1 = reason; row 2 = date (fixed column) + out + in. */
export const getGatepassRowDisplay = (gatepass: GatepassRowInput): GatepassRowDisplay => {
  const { name, description } = getGatepassReasonParts(gatepass);
  const permanentOut = isPermanentOutGatepass(gatepass);

  return {
    reason: { name, description },
    date: formatGatepassDate(gatepass.date),
    outTime: gatepass.checked_out_at ? formatGatepassTime(gatepass.checked_out_at) : null,
    inTime:
      gatepass.checked_in_at && !permanentOut ? formatGatepassTime(gatepass.checked_in_at) : null,
  };
};

export const formatGatepassCardTitle = (gatepass: GatepassRowInput): string => {
  const row = getGatepassRowDisplay(gatepass);
  const reason = row.reason.description
    ? `${row.reason.name}: ${row.reason.description}`
    : row.reason.name;
  const parts = [row.date, reason];
  if (row.outTime) parts.push(`Out ${row.outTime}`);
  if (row.inTime) parts.push(`In ${row.inTime}`);
  return parts.join(' • ');
};
