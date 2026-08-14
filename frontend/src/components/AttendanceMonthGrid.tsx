import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import type { AttendanceReportRow } from '@/hooks/useUserInOutTime';
import {
  attendanceStatusClass,
  buildAttendanceGrid,
  formatAttendanceStatus,
  formatGridTime,
  formatHours,
  formatShortDateHeading,
  getDayColumnPalette,
  listMonthDatesUpToToday,
} from '@/lib/attendance-grid';

export type AttendanceGridUser = {
  user_id: string;
  user_name: string;
  email?: string;
  department?: string;
};

type Props = {
  rows: AttendanceReportRow[];
  month: string;
  searchTerm: string;
  loading?: boolean;
  onUserClick?: (user: AttendanceGridUser) => void;
};

const SUB_COLS = ['In', 'Out', 'Hrs', 'OT', 'Status'] as const;
const DATE_COL_WIDTH = 320;
const USER_COL_WIDTH = 220;
const CELL_MIN = 64;

export const AttendanceMonthGrid: React.FC<Props> = ({
  rows,
  month,
  searchTerm,
  loading = false,
  onUserClick,
}) => {
  const dates = useMemo(() => listMonthDatesUpToToday(month), [month]);

  const gridUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const users = buildAttendanceGrid(rows);
    if (!search) return users;
    return users.filter((user) =>
      [user.user_name, user.email, user.department]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [rows, searchTerm]);

  if (loading) {
    return (
      <div className="py-10 text-center text-gray-500">
        <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-b-2 border-orange-600" />
        <p className="text-sm">Loading attendance...</p>
      </div>
    );
  }

  if (gridUsers.length === 0 || dates.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500">
        <Users className="mx-auto mb-2 h-10 w-10 text-gray-300" />
        <p className="text-sm">No attendance records for this month.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[62vh] border-t border-orange-100">
      <table className="w-max min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-orange-50">
          <tr className="border-b border-orange-100">
            <th
              rowSpan={2}
              className="sticky left-0 z-30 border-r border-orange-100 bg-orange-50 px-3 py-2 text-left text-orange-800"
              style={{ minWidth: USER_COL_WIDTH, width: USER_COL_WIDTH }}
            >
              User ({gridUsers.length})
            </th>
            {dates.map((date, dayIndex) => {
              const palette = getDayColumnPalette(dayIndex);
              return (
              <th
                key={date}
                colSpan={SUB_COLS.length}
                className={`border-r px-2 py-2 text-center text-xs font-bold uppercase tracking-wide ${palette.header} ${palette.headerText} ${palette.border}`}
                style={{ minWidth: DATE_COL_WIDTH, width: DATE_COL_WIDTH }}
              >
                {formatShortDateHeading(date)}
              </th>
              );
            })}
          </tr>
          <tr className="border-b border-orange-100">
            {dates.map((date, dayIndex) => {
              const palette = getDayColumnPalette(dayIndex);
              return SUB_COLS.map((label) => (
                <th
                  key={`${date}-${label}`}
                  className={`border-r px-1 py-1.5 text-center text-[11px] font-semibold ${palette.sub} ${palette.subText} ${palette.border}`}
                  style={{ minWidth: CELL_MIN }}
                >
                  {label}
                </th>
              ));
            })}
          </tr>
        </thead>
        <tbody>
          {gridUsers.map((user) => {
            const initials =
              user.user_name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'U';

            return (
              <tr key={user.user_id} className="border-b border-orange-50 hover:bg-orange-50/50">
                <td
                  className={`sticky left-0 z-10 border-r border-orange-100 bg-white px-3 py-2 ${
                    onUserClick ? 'cursor-pointer hover:bg-orange-50' : ''
                  }`}
                  style={{ minWidth: USER_COL_WIDTH, width: USER_COL_WIDTH }}
                  onClick={
                    onUserClick
                      ? () =>
                          onUserClick({
                            user_id: user.user_id,
                            user_name: user.user_name,
                            email: user.email,
                            department: user.department,
                          })
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-xs font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`truncate font-semibold text-gray-800 ${
                          onUserClick ? 'text-orange-700 underline-offset-2 hover:underline' : ''
                        }`}
                      >
                        {user.user_name}
                      </p>
                      {user.department ? (
                        <p className="truncate text-xs text-gray-500">{user.department}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                {dates.map((date, dayIndex) => {
                  const cell = user.byDate.get(date);
                  const palette = getDayColumnPalette(dayIndex);
                  return (
                    <React.Fragment key={`${user.user_id}-${date}`}>
                      <td
                        className={`border-r px-1 py-2 text-center text-xs font-medium text-green-700 ${palette.cell} ${palette.border}`}
                        style={{ minWidth: CELL_MIN }}
                      >
                        {formatGridTime(cell?.in_time)}
                      </td>
                      <td
                        className={`border-r px-1 py-2 text-center text-xs font-medium text-orange-700 ${palette.cell} ${palette.border}`}
                        style={{ minWidth: CELL_MIN }}
                      >
                        {formatGridTime(cell?.out_time)}
                      </td>
                      <td
                        className={`border-r px-1 py-2 text-center text-xs font-semibold text-gray-800 ${palette.cell} ${palette.border}`}
                        style={{ minWidth: CELL_MIN }}
                      >
                        {formatHours(cell?.total_working_hr)}
                      </td>
                      <td
                        className={`border-r px-1 py-2 text-center text-xs font-semibold text-amber-700 ${palette.cell} ${palette.border}`}
                        style={{ minWidth: CELL_MIN }}
                      >
                        {formatHours(cell?.ot)}
                      </td>
                      <td
                        className={`border-r px-1 py-2 text-center text-[11px] font-semibold ${palette.cell} ${palette.border} ${attendanceStatusClass(cell)}`}
                        style={{ minWidth: CELL_MIN }}
                      >
                        {formatAttendanceStatus(cell)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceMonthGrid;
