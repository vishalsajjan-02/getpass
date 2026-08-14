import * as XLSX from 'xlsx';
import type { AttendanceReportRow } from '@/hooks/useUserInOutTime';
import {
  buildAttendanceGrid,
  formatAttendanceStatus,
  formatGridTime,
  formatHours,
  formatShortDateHeading,
  listMonthDatesUpToToday,
} from '@/lib/attendance-grid';

const filterGridUsers = (rows: AttendanceReportRow[], searchTerm: string) => {
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
};

export const buildAttendanceGridWorkbook = (
  rows: AttendanceReportRow[],
  month: string,
  searchTerm = '',
): XLSX.WorkBook => {
  const dates = listMonthDatesUpToToday(month);
  const users = filterGridUsers(rows, searchTerm);

  if (users.length === 0 || dates.length === 0) {
    throw new Error('No attendance records to export for this month.');
  }

  const header1: string[] = ['User'];
  for (const date of dates) {
    header1.push(formatShortDateHeading(date), '', '', '', '');
  }

  const header2: string[] = [''];
  for (const _date of dates) {
    header2.push('In', 'Out', 'Hrs', 'OT', 'Status');
  }

  const dataRows = users.map((user) => {
    const row: string[] = [user.user_name];
    if (user.department) {
      row[0] = `${user.user_name} (${user.department})`;
    }
    for (const date of dates) {
      const cell = user.byDate.get(date);
      row.push(
        formatGridTime(cell?.in_time),
        formatGridTime(cell?.out_time),
        formatHours(cell?.total_working_hr),
        formatHours(cell?.ot),
        formatAttendanceStatus(cell),
      );
    }
    return row;
  });

  const worksheet = XLSX.utils.aoa_to_sheet([header1, header2, ...dataRows]);

  worksheet['!merges'] = dates.map((_date, index) => ({
    s: { r: 0, c: 1 + index * 5 },
    e: { r: 0, c: 5 + index * 5 },
  }));

  worksheet['!cols'] = [
    { wch: 28 },
    ...dates.flatMap(() => [{ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 14 }]),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  return workbook;
};

export const exportAttendanceGridExcel = (
  rows: AttendanceReportRow[],
  month: string,
  searchTerm = '',
): void => {
  const workbook = buildAttendanceGridWorkbook(rows, month, searchTerm);
  XLSX.writeFile(workbook, `attendance-grid-${month}.xlsx`);
};
