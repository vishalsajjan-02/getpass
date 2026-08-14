import { Router } from 'express';
import * as UserInOutTimeController from './controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { punchUpload } from '../../utils/uploads';

const router = Router();

router.use(authenticate);

router.get('/me', UserInOutTimeController.getMyAttendance);

router.get(
  '/attendance',
  requireRole('admin'),
  UserInOutTimeController.getAttendanceReport,
);

// Admins and gatekeepers manage the full daily report. Managers use /me + own history only.
router.get(
  '/',
  requireRole('admin', 'gatekeeper'),
  UserInOutTimeController.getDailyReport,
);

router.post(
  '/check-in',
  requireRole('admin', 'gatekeeper', 'manager', 'employee'),
  punchUpload.single('photo'),
  UserInOutTimeController.checkIn,
);

router.post(
  '/check-out',
  requireRole('admin', 'gatekeeper', 'manager', 'employee'),
  punchUpload.single('photo'),
  UserInOutTimeController.checkOut,
);

router.post(
  '/punch',
  requireRole('admin', 'gatekeeper'),
  punchUpload.single('photo'),
  UserInOutTimeController.autoPunch,
);

router.put(
  '/day-status',
  requireRole('admin'),
  UserInOutTimeController.setDayAttendanceStatus,
);

router.get(
  '/users/:userId',
  requireRole('admin', 'manager', 'gatekeeper', 'employee'),
  UserInOutTimeController.getUserHistory,
);

export default router;
