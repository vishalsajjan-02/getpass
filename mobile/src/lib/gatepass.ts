import type { Gatepass, GatepassStatus } from '../types';

const STATUS_LABELS: Record<GatepassStatus, string> = {
  pending: 'Pending',
  pending_manager_approval: 'Pending Manager',
  pending_admin_approval: 'Pending Admin',
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

export const isPermanentOutGatepass = (
  gatepass: Pick<Gatepass, 'gatepass_type' | 'reason_name'>,
): boolean =>
  gatepass.gatepass_type === 'out' || gatepass.reason_name?.trim().toLowerCase() === 'out';

export const formatGatepassReason = (
  gatepass: Pick<Gatepass, 'display_reason' | 'reason_name' | 'reason_description'>,
): string => {
  if (gatepass.display_reason) return gatepass.display_reason;
  if (gatepass.reason_description?.trim()) {
    return `${gatepass.reason_name}: ${gatepass.reason_description.trim()}`;
  }
  return gatepass.reason_name;
};

export const formatTime = (value?: string): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const todayDateString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
