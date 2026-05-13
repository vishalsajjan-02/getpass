
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, AlertTriangle } from 'lucide-react';

interface GatepassCardProps {
  gatepass: any;
  onViewDetails: (gatepass: any) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

const GatepassCard: React.FC<GatepassCardProps> = ({ gatepass, onViewDetails, getStatusBadge }) => {
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

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-400">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-lg">{gatepass.purpose}</h3>
                  {gatepass.is_emergency && (
                    <Badge variant="destructive" className="flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Emergency</span>
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 font-medium">{gatepass.gatepass_id}</p>
                <p className="text-sm text-gray-500 mb-2">{gatepass.destination || 'No destination specified'}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Date:</span>
                    <p className="text-gray-600">{new Date(gatepass.date).toLocaleDateString()}</p>
                  </div>
                  
                  {gatepass.out_time && (
                    <div>
                      <span className="font-medium text-gray-700">Out Time:</span>
                      <p className="text-gray-600">{formatTime(gatepass.out_time)}</p>
                    </div>
                  )}
                  
                  {gatepass.approved_at && (
                    <div>
                      <span className="font-medium text-gray-700">Approved At:</span>
                      <p className="text-gray-600">{formatDateTime(gatepass.approved_at)}</p>
                    </div>
                  )}
                  
                  {gatepass.actual_return_time && (
                    <div>
                      <span className="font-medium text-gray-700">Return Time:</span>
                      <p className="text-gray-600">{formatTime(gatepass.actual_return_time)}</p>
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
      </CardContent>
    </Card>
  );
};

export default GatepassCard;
