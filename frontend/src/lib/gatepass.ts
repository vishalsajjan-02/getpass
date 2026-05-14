import type { Gatepass, GatepassStatus } from '@/hooks/useGatepasses';

const STATUS_LABELS: Record<GatepassStatus, string> = {
  pending: 'Pending',
  pending_manager_approval: 'Pending Manager Approval',
  pending_admin_approval: 'Pending Admin Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  active: 'Out',
  completed: 'In',
};

export const getGatepassStatusLabel = (status: GatepassStatus): string =>
  STATUS_LABELS[status] ?? status;

export const isPendingGatepassStatus = (status: GatepassStatus): boolean =>
  status === 'pending' ||
  status === 'pending_manager_approval' ||
  status === 'pending_admin_approval';

export const formatGatepassReason = (gatepass: Pick<Gatepass, 'display_reason' | 'reason_name' | 'reason_description'>): string => {
  if (gatepass.display_reason) return gatepass.display_reason;
  if (gatepass.reason_description?.trim()) {
    return `${gatepass.reason_name}: ${gatepass.reason_description.trim()}`;
  }
  return gatepass.reason_name;
};
