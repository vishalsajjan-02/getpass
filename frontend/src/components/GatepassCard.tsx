
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, AlertTriangle } from 'lucide-react';
import {
  formatGatepassCardTitle,
  GATEPASS_DATE_COLUMN_CLASS,
  GATEPASS_NAME_COLUMN_CLASS,
  getGatepassRowDisplay,
} from '@/lib/gatepass';
import { cn } from '@/lib/utils';

interface GatepassCardProps {
  gatepass: any;
  onViewDetails: (gatepass: any) => void;
  getStatusBadge: (gatepass: any) => React.ReactNode;
  /** Extra actions (e.g. approve / reject) shown before the view button. */
  renderActions?: (gatepass: any) => React.ReactNode;
  /** Show requester name before the date (manager / admin lists). */
  showRequesterName?: boolean;
  className?: string;
}

const infoBoxClass =
  'rounded-md border border-gray-200 bg-white px-2.5 py-1 shadow-sm';

const GatepassCard: React.FC<GatepassCardProps> = ({
  gatepass,
  onViewDetails,
  getStatusBadge,
  renderActions,
  showRequesterName = false,
  className,
}) => {
  const row = getGatepassRowDisplay(gatepass);
  const hasDescription = !!row.reason.description;
  const reasonTitle = hasDescription
    ? `${row.reason.name}: ${row.reason.description}`
    : row.reason.name;

  const accentClass =
    gatepass.status === 'approved' || gatepass.status === 'completed'
      ? 'border-l-emerald-500'
      : gatepass.status === 'active'
        ? 'border-l-blue-500'
        : 'border-l-amber-400';

  return (
    <div
      className={cn(
        'flex w-full items-start gap-2 sm:gap-3 border-l-4 py-2.5 px-3 sm:px-4 hover:bg-gray-50/80 transition-colors',
        accentClass,
        className,
      )}
      title={formatGatepassCardTitle(gatepass)}
    >
      {showRequesterName && (
        <div
          className={cn(infoBoxClass, 'shrink-0 text-sm self-start', GATEPASS_NAME_COLUMN_CLASS)}
          title={gatepass.profiles?.name || 'Unknown'}
        >
          <p className="truncate font-semibold text-gray-900">
            {gatepass.profiles?.name || 'Unknown'}
          </p>
        </div>
      )}

      <span
        className={cn(
          'pt-0.5 text-sm font-medium tabular-nums text-gray-600 shrink-0',
          GATEPASS_DATE_COLUMN_CLASS,
        )}
      >
        {row.date}
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div
          className={cn(
            infoBoxClass,
            'text-sm',
            hasDescription
              ? 'min-w-0 w-full max-w-full sm:max-w-xs md:max-w-sm'
              : 'w-fit shrink-0',
          )}
          title={reasonTitle}
        >
          <p
            className={cn(
              hasDescription
                ? 'break-words whitespace-normal leading-relaxed'
                : 'whitespace-nowrap',
            )}
          >
            <span className="font-bold text-orange-700">{row.reason.name}</span>
            {row.reason.description ? (
              <span className="text-gray-700">
                <span className="font-bold text-orange-700">:</span> {row.reason.description}
              </span>
            ) : null}
          </p>
        </div>

        {(row.outTime || row.inTime) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {row.outTime && (
              <div className={cn(infoBoxClass, 'w-fit shrink-0 text-xs')} title={`Out ${row.outTime}`}>
                <p className="whitespace-nowrap">
                  <span className="font-bold text-orange-700">Out</span>{' '}
                  <span className="font-semibold text-gray-800">{row.outTime}</span>
                </p>
              </div>
            )}
            {row.inTime && (
              <div className={cn(infoBoxClass, 'w-fit shrink-0 text-xs')} title={`In ${row.inTime}`}>
                <p className="whitespace-nowrap">
                  <span className="font-bold text-emerald-700">In</span>{' '}
                  <span className="font-semibold text-gray-800">{row.inTime}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {gatepass.is_emergency && (
          <Badge variant="destructive" className="shrink-0 h-5 px-1.5 text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-0.5" />
            Emergency
          </Badge>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 self-center">
        {getStatusBadge(gatepass)}
        {renderActions?.(gatepass)}
        <Button
          size="icon"
          variant="outline"
          onClick={() => onViewDetails(gatepass)}
          className="h-7 w-7 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
          aria-label="View details"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default GatepassCard;
