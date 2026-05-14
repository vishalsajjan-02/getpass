
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, AlertTriangle } from 'lucide-react';
import { formatGatepassReason, getGatepassStatusLabel } from '@/lib/gatepass';

interface GatepassCardProps {
  gatepass: any;
  onViewDetails: (gatepass: any) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

const GatepassCard: React.FC<GatepassCardProps> = ({ gatepass, onViewDetails, getStatusBadge }) => {
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

  const accentClass = gatepass.status === 'approved' ? 'border-l-green-400' : 'border-l-red-400';

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 ${accentClass}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-lg">{formatGatepassReason(gatepass)}</h3>
                  {gatepass.is_emergency && (
                    <Badge variant="destructive" className="flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Emergency</span>
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 font-medium break-all">{gatepass.id}</p>
                <p className="text-sm text-gray-500 mb-2">{gatepass.destination || 'No destination specified'}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Date:</span>
                    <p className="text-gray-600">{new Date(gatepass.date).toLocaleDateString()}</p>
                  </div>
                  
                  {gatepass.checked_out_at && (
                    <div>
                      <span className="font-medium text-gray-700">Out:</span>
                      <p className="text-gray-600">{formatDateTime(gatepass.checked_out_at)}</p>
                    </div>
                  )}
                  
                  {gatepass.checked_in_at && (
                    <div>
                      <span className="font-medium text-gray-700">In:</span>
                      <p className="text-gray-600">{formatDateTime(gatepass.checked_in_at)}</p>
                    </div>
                  )}
                  
                  {gatepass.total_minutes_outside > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Working Hours Outside:</span>
                      <p className="text-gray-600">{gatepass.total_minutes_outside} min</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {getStatusBadge(gatepass.status)}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onViewDetails(gatepass)}
              className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">{getGatepassStatusLabel(gatepass.status)}</p>
      </CardContent>
    </Card>
  );
};

export default GatepassCard;
