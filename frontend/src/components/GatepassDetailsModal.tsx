
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Eye, Clock, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  formatGatepassDate,
  formatGatepassDateTime,
  formatGatepassReason,
  getGatepassStatusLabel,
  isPermanentOutGatepass,
} from '@/lib/gatepass';

interface GatepassDetailsModalProps {
  gatepass: any;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (id: string, approvalStep?: 1 | 2) => void;
  onReject?: (id: string, reason: string, approvalStep?: 1 | 2) => void;
  preferredApprovalStep?: 1 | 2 | null;
  userRole: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
}

const GatepassDetailsModal: React.FC<GatepassDetailsModalProps> = ({
  gatepass,
  isOpen,
  onClose,
  onApprove,
  onReject,
  preferredApprovalStep,
  userRole
}) => {
  const [rejectionReason, setRejectionReason] = React.useState('');

  if (!gatepass) return null;

  const getPendingApprovalByStep = (step: 1 | 2) =>
    gatepass.approval_requests?.find((approval: any) => approval.step === step && approval.status === 'pending');

  const getApprovalActionSteps = (): Array<1 | 2> => {
    if (userRole === 'manager') {
      return gatepass.status === 'pending_manager_approval' && getPendingApprovalByStep(1) ? [1] : [];
    }

    if (userRole === 'admin') {
      if (gatepass.status === 'pending_admin_approval' && getPendingApprovalByStep(2)) {
        return [2];
      }

      if (gatepass.status === 'pending_manager_approval' && gatepass.approval_flow === 'manager_then_admin') {
        const steps: Array<1 | 2> = [];
        if (getPendingApprovalByStep(1)) steps.push(1);
        if (getPendingApprovalByStep(2)) steps.push(2);
        return steps;
      }
    }

    return [];
  };

  const approvalActionSteps = getApprovalActionSteps();
  const orderedApprovalActionSteps =
    preferredApprovalStep && approvalActionSteps.includes(preferredApprovalStep)
      ? [preferredApprovalStep, ...approvalActionSteps.filter((step) => step !== preferredApprovalStep)]
      : approvalActionSteps;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Approved</Badge>;
      case 'pending_manager_approval':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Pending Manager Approval</Badge>;
      case 'pending_admin_approval':
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Rejected</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-300">Cancelled</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Out</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Completed</Badge>;
      default:
        return <Badge variant="secondary">{getGatepassStatusLabel(status as any)}</Badge>;
    }
  };

  const handleApprove = (approvalStep?: 1 | 2) => {
    if (onApprove) {
      onApprove(gatepass.id, approvalStep);
      toast({
        title: approvalStep === 1 ? "Manager Step Approved" : "Gatepass Approved",
        description: approvalStep === 1
          ? "The manager approval step has been approved successfully"
          : "The gatepass request has been approved successfully",
      });
      onClose();
    }
  };

  const handleReject = (approvalStep?: 1 | 2) => {
    if (onReject && rejectionReason.trim()) {
      onReject(gatepass.id, rejectionReason, approvalStep);
      toast({
        title: approvalStep === 1 ? "Manager Step Rejected" : "Gatepass Rejected",
        description: approvalStep === 1
          ? "The manager approval step has been rejected"
          : "The gatepass request has been rejected",
        variant: "destructive"
      });
      onClose();
      setRejectionReason('');
    } else {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-3 pr-8">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5 shrink-0" />
                <span>Gatepass Details</span>
              </span>
              <span className="text-sm font-medium tabular-nums text-gray-600">
                {formatGatepassDate(gatepass.date)}
              </span>
            </div>
            {getStatusBadge(gatepass.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purpose and Destination */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Reason</Label>
              <p className="mt-1 p-3 bg-gray-50 rounded-md">{formatGatepassReason(gatepass)}</p>
            </div>
            
            {gatepass.destination && (
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <Label className="text-sm font-medium text-gray-700">Destination</Label>
                  <p className="mt-1">{gatepass.destination}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Approval Flow</Label>
                <p className="mt-1 text-sm text-gray-600">
                  {gatepass.approval_flow === 'manager_then_admin' ? 'Manager then Admin' : 'Admin Only'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Current Status</Label>
                <p className="mt-1 text-sm text-gray-600">{getGatepassStatusLabel(gatepass.status)}</p>
              </div>
            </div>
          </div>

          {/* Time Details */}
          <div className="space-y-4">
            {(gatepass.checked_out_at || gatepass.checked_in_at) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gatepass.checked_out_at && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Out Time</Label>
                      <p className="mt-1">{formatGatepassDateTime(gatepass.checked_out_at)}</p>
                    </div>
                  </div>
                )}
                
                {gatepass.checked_in_at && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-700">In Time</Label>
                      <p className="mt-1">{formatGatepassDateTime(gatepass.checked_in_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {gatepass.total_minutes_outside > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label className="text-sm font-medium text-blue-700">Time Outside During Working Hours</Label>
                <p className="mt-1 text-blue-600">{gatepass.total_minutes_outside} minutes</p>
              </div>
            )}
          </div>

          {/* Emergency Request Indicator */}
          {gatepass.is_emergency && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <Label className="text-sm font-medium text-orange-700">Emergency Request</Label>
              </div>
              <p className="mt-1 text-orange-600 text-sm">This request was marked as urgent for immediate attention.</p>
            </div>
          )}

          {/* Rejection Reason */}
          {gatepass.status === 'rejected' && gatepass.rejection_reason && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <Label className="text-sm font-medium text-red-700">Rejection Reason</Label>
              <p className="mt-1 text-red-600">{gatepass.rejection_reason}</p>
            </div>
          )}

          {Array.isArray(gatepass.approval_requests) && gatepass.approval_requests.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Approval Requests</Label>
              <div className="space-y-2">
                {gatepass.approval_requests.map((approval: any) => (
                  <div key={approval.id} className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">
                        Step {approval.step} • {approval.approver_role}
                      </p>
                      {approval.remarks && <p className="text-gray-500">{approval.remarks}</p>}
                    </div>
                    <Badge variant="outline">{getGatepassStatusLabel(approval.status)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Actions */}
          {orderedApprovalActionSteps.length > 0 && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800">Approval Actions</h4>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide reason for rejection..."
                    className="mt-1"
                  />
                </div>
                
                {orderedApprovalActionSteps.map((step) => (
                  <div key={step} className="space-y-2 rounded-lg border bg-white p-3">
                    <p className="text-sm font-medium text-gray-700">
                      {step === 1 ? 'Manager Step Actions' : 'Admin Step Actions'}
                    </p>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleApprove(step)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(step)}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gatekeeper Actions */}
          {userRole === 'gatekeeper' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800">Gatekeeper Actions</h4>
              <p className="text-sm text-blue-600 mt-1">
                {gatepass.status === 'approved'
                  ? isPermanentOutGatepass(gatepass)
                    ? 'Out reason: permanent exit for the day. Mark Out once — no In action.'
                    : 'This gatepass is approved and ready for the Out action.'
                  : gatepass.status === 'active'
                    ? isPermanentOutGatepass(gatepass)
                      ? 'Permanent Out for the day — no check-in required.'
                      : 'Employee is currently outside. Use the In action on the dashboard when they return.'
                    : 'All request statuses are visible here for gatekeeper tracking.'}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GatepassDetailsModal;
