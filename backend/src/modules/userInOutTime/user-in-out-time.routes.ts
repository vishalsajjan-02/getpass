import { Router } from 'express';
import * as UserInOutTimeController from './controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.use(authenticate);

// Gatekeepers, admins, and managers can view + update the daily report.
router.get(
  '/',
  requireRole('admin', 'manager', 'gatekeeper'),
  UserInOutTimeController.getDailyReport,
);

router.post(
  '/check-in',
  requireRole('admin', 'manager', 'gatekeeper'),
  UserInOutTimeController.checkIn,
);

router.post(
  '/check-out',
  requireRole('admin', 'manager', 'gatekeeper'),
  UserInOutTimeController.checkOut,
);

router.get(
  '/users/:userId',
  requireRole('admin', 'manager', 'gatekeeper'),
  UserInOutTimeController.getUserHistory,
);

export default router;
