import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { getLeaveTypesHandler } from './controller/get-leave-types.controller';
import { createLeaveTypeHandler } from './controller/create-leave-type.controller';
import { updateLeaveTypeHandler } from './controller/update-leave-type.controller';
import { deleteLeaveTypeHandler } from './controller/delete-leave-type.controller';
import { upsertUserDayLeaveHandler } from './controller/upsert-user-day-leave.controller';
import { setUserLeaveBalanceHandler } from './controller/set-user-leave-balance.controller';

const router = Router();

router.use(authenticate);

router.get('/types', requireRole('admin', 'manager', 'gatekeeper'), getLeaveTypesHandler);
router.post('/types', requireRole('admin'), createLeaveTypeHandler);
router.put('/types/:id', requireRole('admin'), updateLeaveTypeHandler);
router.delete('/types/:id', requireRole('admin'), deleteLeaveTypeHandler);
router.put('/day', requireRole('admin', 'manager'), upsertUserDayLeaveHandler);
router.put('/balance', requireRole('admin', 'manager'), setUserLeaveBalanceHandler);

export default router;
