import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GatepassCard from '@/components/GatepassCard';
import { cn } from '@/lib/utils';

interface GatepassListProps {
  gatepasses: any[];
  onViewDetails: (gatepass: any) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  renderRowActions?: (gatepass: any) => React.ReactNode;
  showRequesterName?: boolean;
  title?: string;
  headerAction?: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

const GatepassList: React.FC<GatepassListProps> = ({
  gatepasses,
  onViewDetails,
  getStatusBadge,
  renderRowActions,
  showRequesterName = false,
  title,
  headerAction,
  emptyState,
  className,
}) => {
  const listBody =
    gatepasses.length === 0 ? (
      emptyState
    ) : (
      <div className="divide-y divide-gray-100">
        {gatepasses.map((gatepass) => (
          <GatepassCard
            key={gatepass.id}
            gatepass={gatepass}
            onViewDetails={onViewDetails}
            getStatusBadge={getStatusBadge}
            renderActions={renderRowActions}
            showRequesterName={showRequesterName}
          />
        ))}
      </div>
    );

  if (!title) {
    return (
      <Card className={cn('shadow-md border border-gray-100 overflow-hidden', className)}>
        <CardContent className="p-0">{listBody}</CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-md border-0 bg-gradient-to-br from-white to-gray-50 overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 pb-2 space-y-0">
        <CardTitle className="text-gray-800 text-base">{title}</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent className="p-0 pt-0">{listBody}</CardContent>
    </Card>
  );
};

export default GatepassList;
