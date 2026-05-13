
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Eye, Clock, User, MapPin, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GatepassDetailsModalProps {
  gatepass: any;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  userRole: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
}

const GatepassDetailsModal: React.FC<GatepassDetailsModalProps> = ({
  gatepass,
  isOpen,
  onClose,
  onApprove,
  onReject,
  userRole
}) => {
  const [rejectionReason, setRejectionReason] = React.useState('');

  if (!gatepass) return null;

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Not set';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return 'Not set';
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Rejected</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleApprove = () => {
    if (onApprove) {
      onApprove(gatepass.id);
      toast({
        title: "Gatepass Approved",
        description: "The gatepass request has been approved successfully",
      });
      onClose();
    }
  };

  const handleReject = () => {
    if (onReject && rejectionReason.trim()) {
      onReject(gatepass.id, rejectionReason);
      toast({
        title: "Gatepass Rejected",
        description: "The gatepass request has been rejected",
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
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Gatepass Details</span>
            </span>
            {getStatusBadge(gatepass.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Gatepass ID */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg text-gray-800">{gatepass.gatepass_id || gatepass.id}</h3>
            <p className="text-sm text-gray-500">Gatepass ID</p>
          </div>

          {/* Employee Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">{gatepass.profiles?.name || gatepass.employee_name || 'Employee'}</p>
                <p className="text-sm text-gray-500">Employee</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">{new Date(gatepass.date).toLocaleDateString()}</p>
                <p className="text-sm text-gray-500">Date</p>
              </div>
            </div>
          </div>

          {/* Purpose and Destination */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Purpose</Label>
              <p className="mt-1 p-3 bg-gray-50 rounded-md">{gatepass.purpose}</p>
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
          </div>

          {/* Time Details based on status */}
          <div className="space-y-4">
            {/* For pending status - show expected out time */}
            {gatepass.status === 'pending' && gatepass.out_time && (
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <Label className="text-sm font-medium text-gray-700">Expected Out Time</Label>
                  <p className="mt-1">{formatTime(gatepass.out_time)}</p>
                </div>
              </div>
            )}

            {/* For active/completed status - show out time and return time */}
            {(gatepass.status === 'active' || gatepass.status === 'completed') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gatepass.out_time && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Out Time</Label>
                      <p className="mt-1">{formatTime(gatepass.out_time)}</p>
                    </div>
                  </div>
                )}
                
                {gatepass.actual_return_time && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Return Time</Label>
                      <p className="mt-1">{formatTime(gatepass.actual_return_time)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* For approved status - show expected out time */}
            {gatepass.status === 'approved' && gatepass.out_time && (
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <Label className="text-sm font-medium text-gray-700">Expected Out Time</Label>
                  <p className="mt-1">{formatTime(gatepass.out_time)}</p>
                </div>
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

          {/* Approval Actions for Admin */}
          {userRole === 'admin' && gatepass.status === 'pending' && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800">Admin Actions</h4>
              
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
                
                <div className="flex space-x-3">
                  <Button
                    onClick={handleApprove}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Gatekeeper Actions */}
          {userRole === 'gatekeeper' && gatepass.status === 'approved' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800">Gatekeeper Actions</h4>
              <p className="text-sm text-blue-600 mt-1">This gatepass is approved and ready for use</p>
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
